import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import mammoth from "mammoth";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SERVICE_ACCOUNT_PATH = resolve(projectRoot, "secrets/gdrive-service-account.json");
const CV_JSON_PATH = resolve(projectRoot, "src/data/cv.json");
const RESUME_PDF_PATH = resolve(projectRoot, "public/resume.pdf");

const FILE_ID = process.env.GDRIVE_FILE_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!FILE_ID) throw new Error("GDRIVE_FILE_ID is not set in .env");
if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set in .env");

const CV_TOOL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    role: { type: "string" },
    tagline: { type: "string" },
    location: { type: "string" },
    contact: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          href: { type: "string" },
        },
        required: ["label", "value", "href"],
      },
    },
    summary: { type: "string" },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          company: { type: "string" },
          location: { type: "string" },
          period: { type: "string" },
          summary: { type: "string" },
          highlights: { type: "array", items: { type: "string" } },
        },
        required: ["role", "company", "location", "period", "summary", "highlights"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          year: { type: "string" },
          description: { type: "string" },
          highlights: { type: "array", items: { type: "string" } },
          stack: { type: "array", items: { type: "string" } },
          url: { type: "string" },
        },
        required: ["name", "year", "description", "stack"],
      },
    },
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "items"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          degree: { type: "string" },
          institution: { type: "string" },
          period: { type: "string" },
          detail: { type: "string" },
        },
        required: ["degree", "institution", "period"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          date: { type: "string" },
          detail: { type: "string" },
        },
        required: ["name", "issuer", "date"],
      },
    },
  },
  required: [
    "name", "role", "tagline", "location", "contact", "summary",
    "experience", "projects", "skills", "education", "certifications",
  ],
};

const SYSTEM_PROMPT = `You extract a CV from markdown into a strict JSON shape and call the return_cv tool with the result.

Rules:
- Use the markdown as the only source of truth — do not invent or embellish.
- If a field is missing in the source, use a sensible empty value (empty string or empty array). Never omit required fields.
- Preserve original wording for prose fields (summary, highlights, descriptions).
- "tagline" is a one-sentence professional headline. If not explicitly present, derive a concise one from the summary.
- "highlights" are bullet points under each role. Split paragraphs into separate bullets if appropriate.
- "stack" lists tools/technologies used in a project. Extract from inline mentions if no explicit list exists.
- For projects with multi-sentence descriptions (or explicit bullet points in the source), keep "description" to a single overview sentence and put the remaining details as separate "highlights" bullets. Omit "highlights" for short one/two-sentence projects.
- "skills" are grouped by heading. Preserve the user's groupings if present.
- For dates, preserve the format used in the source (e.g., "August 2024 — December 2024", "Expected May 2026").
- Email href should be "mailto:<email>"; LinkedIn href should be a full URL; Location href should be a Google Maps query URL.
- All URLs (href, project url) must be absolute, including the "https://" scheme.
- Use standard capitalization for "name" and other fields even if the source renders them in ALL CAPS for styling (e.g. "Andrés Duarte Ornelas", not "ANDRÉS DUARTE ORNELAS").`;

async function downloadDoc() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });

  console.log("Exporting Google Doc as DOCX and PDF in parallel...");
  const [docxRes, pdfRes] = await Promise.all([
    drive.files.export(
      {
        fileId: FILE_ID,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      { responseType: "arraybuffer" },
    ),
    drive.files.export(
      { fileId: FILE_ID, mimeType: "application/pdf" },
      { responseType: "arraybuffer" },
    ),
  ]);

  return {
    docxBuffer: Buffer.from(docxRes.data),
    pdfBuffer: Buffer.from(pdfRes.data),
  };
}

async function docxToMarkdown(docxBuffer) {
  console.log("Converting DOCX to markdown...");
  const { value } = await mammoth.convertToMarkdown({ buffer: docxBuffer });
  return value;
}

async function parseWithClaude(markdown) {
  console.log("Parsing CV with Claude...");
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: "return_cv",
        description: "Return the structured CV.",
        input_schema: CV_TOOL_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "return_cv" },
    messages: [{ role: "user", content: markdown }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error("Claude did not return a tool_use block");

  const usage = response.usage;
  console.log(
    `  tokens: input=${usage.input_tokens} output=${usage.output_tokens}` +
      (usage.cache_read_input_tokens
        ? ` (cache read=${usage.cache_read_input_tokens})`
        : "") +
      (usage.cache_creation_input_tokens
        ? ` (cache create=${usage.cache_creation_input_tokens})`
        : ""),
  );

  return toolUse.input;
}

// Badge fields (badgeId/badgeImage) are site-local enrichment that doesn't
// exist in the Google Doc — carry them over from the previous cv.json so a
// sync doesn't wipe them.
async function mergeBadgeFields(cv) {
  let existing;
  try {
    existing = JSON.parse(await readFile(CV_JSON_PATH, "utf8"));
  } catch {
    return cv;
  }
  const byName = new Map(
    (existing.certifications ?? []).map((c) => [c.name, c]),
  );
  for (const cert of cv.certifications ?? []) {
    const prev = byName.get(cert.name);
    if (!prev) continue;
    if (prev.badgeId && cert.badgeId === undefined) cert.badgeId = prev.badgeId;
    if (prev.badgeImage && cert.badgeImage === undefined) cert.badgeImage = prev.badgeImage;
  }
  return cv;
}

function validate(cv) {
  const required = [
    "name", "role", "tagline", "location", "contact", "summary",
    "experience", "projects", "skills", "education", "certifications",
  ];
  const missing = required.filter((k) => cv[k] === undefined);
  if (missing.length) throw new Error(`CV missing required fields: ${missing.join(", ")}`);
  if (!Array.isArray(cv.experience)) throw new Error("experience must be an array");
  if (!Array.isArray(cv.skills)) throw new Error("skills must be an array");
}

async function main() {
  const { docxBuffer, pdfBuffer } = await downloadDoc();
  const markdown = await docxToMarkdown(docxBuffer);
  const cv = await mergeBadgeFields(await parseWithClaude(markdown));
  validate(cv);

  await mkdir(dirname(CV_JSON_PATH), { recursive: true });
  await mkdir(dirname(RESUME_PDF_PATH), { recursive: true });
  await writeFile(CV_JSON_PATH, JSON.stringify(cv, null, 2) + "\n");
  await writeFile(RESUME_PDF_PATH, pdfBuffer);

  console.log(`\n✓ Wrote ${CV_JSON_PATH}`);
  console.log(`✓ Wrote ${RESUME_PDF_PATH}`);
}

main().catch((err) => {
  console.error("\nsync-cv failed:", err.message);
  process.exit(1);
});
