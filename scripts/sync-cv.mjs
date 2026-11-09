import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import mammoth from "mammoth";
import { parseCvMarkdown, findPhoneNumbers, MODEL } from "./cv-extract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SERVICE_ACCOUNT_PATH = resolve(projectRoot, "secrets/gdrive-service-account.json");
const CV_JSON_PATH = resolve(projectRoot, "src/data/cv.json");
const RESUME_PDF_PATH = resolve(projectRoot, "public/resume.pdf");

const FILE_ID = process.env.GDRIVE_FILE_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!FILE_ID) throw new Error("GDRIVE_FILE_ID is not set in .env");
if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set in .env");

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
  const { cv, usage, removedPhones, servedBy } = await parseCvMarkdown(markdown, { apiKey: ANTHROPIC_API_KEY });
  if (servedBy && servedBy !== MODEL) console.log(`  note: the request fell back to ${servedBy}`);
  if (removedPhones.length) console.log(`  removed ${removedPhones.length} phone contact(s) from cv.json`);
  console.log(
    `  tokens: input=${usage.input_tokens} output=${usage.output_tokens}` +
      (usage.cache_read_input_tokens ? ` (cache read=${usage.cache_read_input_tokens})` : "") +
      (usage.cache_creation_input_tokens ? ` (cache create=${usage.cache_creation_input_tokens})` : ""),
  );
  return cv;
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

  // resume.pdf is exported verbatim from the Doc, so a phone number in the Doc would be
  // published inside it. Refuse to overwrite the PDF unless explicitly allowed.
  const phonesInDoc = findPhoneNumbers(markdown);
  const writePdf = phonesInDoc.length === 0 || process.env.ALLOW_PHONE_IN_PDF === "1";

  const cv = await mergeBadgeFields(await parseWithClaude(markdown));
  validate(cv);

  await mkdir(dirname(CV_JSON_PATH), { recursive: true });
  await mkdir(dirname(RESUME_PDF_PATH), { recursive: true });
  await writeFile(CV_JSON_PATH, JSON.stringify(cv, null, 2) + "\n");
  if (writePdf) await writeFile(RESUME_PDF_PATH, pdfBuffer);

  console.log(`\n✓ Wrote ${CV_JSON_PATH}`);
  if (writePdf) {
    const note = phonesInDoc.length ? " (contains a phone number: ALLOW_PHONE_IN_PDF=1)" : "";
    console.log(`✓ Wrote ${RESUME_PDF_PATH}${note}`);
  } else {
    // Expected workflow: the Doc keeps the phone number and resume.pdf is exported by hand
    // without it, so this is a notice, not a failure (build:fresh keeps working).
    console.log(
      `ℹ Kept the existing ${RESUME_PDF_PATH}: the Google Doc contains a phone number, ` +
        "so its PDF export wasn't saved. Export a phone-free PDF by hand when the CV changes " +
        "(or set ALLOW_PHONE_IN_PDF=1 to save the Doc's export as-is).",
    );
  }
}

main().catch((err) => {
  console.error("\nsync-cv failed:", err.message);
  process.exit(1);
});
