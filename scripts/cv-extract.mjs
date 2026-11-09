// CV extraction: markdown → structured CV via Claude. Shared by sync-cv.mjs and
// any test harness, so both exercise exactly the same schema and prompt.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-5";

const METRIC_ITEM = {
  type: "object",
  properties: {
    value: { type: "string" },
    label: { type: "string" },
  },
  required: ["value", "label"],
};

export const CV_TOOL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    role: { type: "string" },
    tagline: { type: "string" },
    location: { type: "string" },
    relocation: { type: "string" },
    availability: { type: "string" },
    targetRoles: { type: "array", items: { type: "string" } },
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
          featured: { type: "boolean" },
          metrics: { type: "array", items: METRIC_ITEM, maxItems: 4 },
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
    "targetRoles", "relocation", "availability",
  ],
};

export const SYSTEM_PROMPT = `You extract a CV from markdown into a strict JSON shape and call the return_cv tool with the result.

Rules:
- Use the markdown as the only source of truth — do not invent or embellish.
- If a field is missing in the source, use a sensible empty value (empty string or empty array). Never omit required fields.
- Preserve original wording for prose fields (summary, highlights, descriptions).
- "tagline" is a one-sentence professional headline. If not explicitly present, derive a concise one from the summary.
- "highlights" are bullet points under each role. Split paragraphs into separate bullets if appropriate.
- "stack" lists tools/technologies used in a project. Extract from inline mentions if no explicit list exists.
- For projects with multi-sentence descriptions (or explicit bullet points in the source), keep "description" to a single overview sentence and put the remaining details as separate "highlights" bullets. Omit "highlights" for short one/two-sentence projects.
- "skills" are grouped by heading. Preserve the user's groupings if present.
- For dates, preserve the format used in the source (e.g., "August 2024 – December 2024", "Expected May 2026").
- Email href should be "mailto:<email>"; LinkedIn href should be a full URL; Location href should be a Google Maps query URL.
- All URLs (href, project url) must be absolute, including the "https://" scheme.
- Use standard capitalization for "name" and other fields even if the source renders them in ALL CAPS for styling (e.g. "Andrés Duarte Ornelas", not "ANDRÉS DUARTE ORNELAS").

Site fields (used for the website's headline elements; they summarise what the source already says — never add facts):
- "targetRoles": the job titles/areas the person says they are seeking or open to, as short title-case phrases (e.g. ["SOC Analyst", "Network Security", "IT Support"]). Empty array if the source states no target roles. Do not infer roles from past job titles.
- "relocation": where the person says they are open to relocating, as a short place name (e.g. "Monterrey", "Anywhere in the EU"). Empty string if not stated.
- "availability": a terse label (at most 4 words) for when/how the person can start, only if the source states it. Use a start time and/or work type, joined with " · ", e.g. "Immediately · full-time", "From June 2026", "Part-time". Do not repeat the word "available" (the site already prints "STATUS: AVAILABLE"). Empty string if not stated. Never infer availability from graduation dates alone.
- Project "featured": true for at most ONE project — the one the source most clearly presents as the person's main, flagship or research work (e.g. listed first under research, explicitly called a thesis/publication, or by far the most detailed). Omit or false for the rest. If nothing stands out, mark none.
- Project "metrics": up to 4 headline quantitative results for that project, each {value, label}.
  - "value" is a number copied exactly as written in the source, keeping its qualifiers and units ("~97%", "$0.81", "50", "3x", "<200 ms"). Never compute, round, convert or combine numbers.
  - "label" is a short noun phrase (2–5 words, sentence case) saying what the number measures, taken from the source wording ("Effective fault resolution rate", "Mean cost per session", "Sessions run").
  - Only outcomes or scale of the work count. Do NOT use years, dates, version numbers, standard/course identifiers (e.g. "CCNA 11.6.3", "NIST SP 800-86", "ISO 27037"), or counts of tools.
  - Omit "metrics" (or use an empty array) when the project states no clear quantitative results.`;

/**
 * Parse CV markdown with Claude.
 * @param {string} markdown
 * @param {{ apiKey?: string, model?: string }} [opts]
 * @returns {Promise<{ cv: any, usage: any }>}
 */
export async function parseCvMarkdown(markdown, opts = {}) {
  const client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
  const response = await client.messages.create({
    model: opts.model ?? MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [{ name: "return_cv", description: "Return the structured CV.", input_schema: CV_TOOL_SCHEMA }],
    tool_choice: { type: "tool", name: "return_cv" },
    messages: [{ role: "user", content: markdown }],
  });

  if (response.stop_reason === "max_tokens") throw new Error("Claude hit max_tokens before finishing the CV");
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error(`Claude did not return a tool_use block (stop_reason=${response.stop_reason})`);
  const cv = normalizeSiteFields(toolUse.input);
  const removedPhones = stripPhoneContacts(cv);
  return { cv, usage: response.usage, removedPhones };
}

// ---- Privacy: phone numbers never leave the Google Doc --------------------------------
const PHONE_LABEL = /phone|tel[eé]fono|^tel$|mobile|m[oó]vil|cell|celular|whats\s*app/i;
// Digit runs that look like a phone number: optional +, 10–15 digits with spaces, dots,
// dashes or parentheses in between. Date ranges ("2025–2026") use en dashes and stay out.
const PHONE_LIKE = /(?:\+\s?)?\(?\d[\d\s().-]{7,}\d/g;

/** Phone-number-like strings found in free text (e.g. the Doc's markdown). */
export function findPhoneNumbers(text) {
  return [...String(text).matchAll(PHONE_LIKE)]
    .map((m) => m[0].trim())
    .filter((s) => {
      const digits = s.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    });
}

/** Removes phone contacts from the CV in place; returns what was removed. */
export function stripPhoneContacts(cv) {
  const removed = [];
  cv.contact = (cv.contact ?? []).filter((c) => {
    const isPhone = /^tel:/i.test(c.href ?? "") || PHONE_LABEL.test(c.label ?? "") || findPhoneNumbers(c.value ?? "").length > 0;
    if (isPhone) removed.push(c.value);
    return !isPhone;
  });
  return removed;
}

/**
 * Light post-processing so the site can trust the new fields:
 * - at most one featured project
 * - metrics capped at 4, and each value must appear verbatim in that project's text
 *   (guards against computed/invented numbers)
 */
export function normalizeSiteFields(cv) {
  let featuredSeen = false;
  for (const p of cv.projects ?? []) {
    if (p.featured) {
      if (featuredSeen) delete p.featured;
      featuredSeen = true;
    } else if ("featured" in p) {
      delete p.featured;
    }
    if (Array.isArray(p.metrics)) {
      const haystack = [p.name, p.description, ...(p.highlights ?? [])].join(" ");
      p.metrics = p.metrics
        .filter((m) => m && typeof m.value === "string" && typeof m.label === "string")
        .map((m) => ({ value: m.value.trim(), label: m.label.trim() }))
        .filter((m) => m.value && m.label && haystack.includes(m.value))
        .slice(0, 4);
      if (!p.metrics.length) delete p.metrics;
    }
  }
  cv.targetRoles = (cv.targetRoles ?? []).map((r) => String(r).trim()).filter(Boolean);
  cv.relocation = (cv.relocation ?? "").trim();
  cv.availability = (cv.availability ?? "").trim();
  return cv;
}
