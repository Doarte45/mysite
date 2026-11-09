// CV extraction: markdown → structured CV via Claude. Shared by sync-cv.mjs and
// any test harness, so both exercise exactly the same schema, prompt and clean-up.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-5-5";
// Extraction is well specified, so medium thinking is plenty (Sonnet 5.5 defaults to high).
const EFFORT = "medium";

// Structured outputs: every object needs additionalProperties:false, and array
// constraints such as maxItems aren't supported (limits are enforced below instead).
const obj = (properties, required) => ({ type: "object", properties, required, additionalProperties: false });
const str = { type: "string" };
const strArr = { type: "array", items: str };

export const CV_SCHEMA = obj(
  {
    name: str,
    role: str,
    tagline: str,
    location: str,
    relocation: str,
    availability: str,
    targetRoles: strArr,
    contact: { type: "array", items: obj({ label: str, value: str, href: str }, ["label", "value", "href"]) },
    summary: str,
    experience: {
      type: "array",
      items: obj(
        { role: str, company: str, location: str, period: str, summary: str, highlights: strArr },
        ["role", "company", "location", "period", "summary", "highlights"],
      ),
    },
    projects: {
      type: "array",
      items: obj(
        {
          name: str,
          year: str,
          description: str,
          highlights: strArr,
          stack: strArr,
          url: str,
          featured: { type: "boolean" },
          metrics: { type: "array", items: obj({ value: str, label: str }, ["value", "label"]) },
        },
        ["name", "year", "description", "stack"],
      ),
    },
    skills: { type: "array", items: obj({ heading: str, items: strArr }, ["heading", "items"]) },
    education: {
      type: "array",
      items: obj({ degree: str, institution: str, period: str, detail: str }, ["degree", "institution", "period"]),
    },
    certifications: {
      type: "array",
      items: obj({ name: str, issuer: str, date: str, detail: str }, ["name", "issuer", "date"]),
    },
  },
  [
    "name", "role", "tagline", "location", "contact", "summary",
    "experience", "projects", "skills", "education", "certifications",
    "targetRoles", "relocation", "availability",
  ],
);

export const SYSTEM_PROMPT = `You extract a CV from markdown into a strict JSON shape.

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
- Contact "value" is the text shown on the site, not the source's link text: for LinkedIn use the profile URL without the scheme (e.g. "linkedin.com/in/<handle>"); for the Location contact use only the place (e.g. "San Antonio, TX"). This applies only to the contact entry: the top-level "location" field keeps any relocation note from the source (e.g. "Chihuahua, MX (Open to relocation - Monterrey)").
- Do not include a phone number in "contact", even if the source lists one.
- Education "institution" is the institution name only — do not append its city or country.
- Education "degree" is the full degree line exactly as written, including concentrations and modality notes (e.g. "Master of Science in Information Technology, Cybersecurity Concentration – Full-time, in-person"). "detail" is only for descriptive text listed under the degree (coursework, program notes).
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
 * Parse CV markdown with Claude (structured outputs).
 * @param {string} markdown
 * @param {{ apiKey?: string, model?: string, effort?: string }} [opts]
 * @returns {Promise<{ cv: any, usage: any, removedPhones: string[], servedBy: string }>}
 */
export async function parseCvMarkdown(markdown, opts = {}) {
  const client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
  const response = await client.beta.messages.create({
    model: opts.model ?? MODEL,
    max_tokens: 16000,
    // If a safety classifier declines (a cybersecurity CV can look like "cyber" content),
    // the API retries the same request on a fallback model instead of failing the sync.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? EFFORT, format: { type: "json_schema", schema: CV_SCHEMA } },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: markdown }],
  });

  if (response.stop_reason === "refusal") {
    const d = response.stop_details;
    throw new Error(`Claude declined to extract the CV (${d?.category ?? "no category"}${d?.explanation ? `: ${d.explanation}` : ""})`);
  }
  if (response.stop_reason !== "end_turn") {
    throw new Error(`Claude stopped early (stop_reason=${response.stop_reason})`);
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const cv = normalizeSiteFields(JSON.parse(text));
  const removedPhones = stripPhoneContacts(cv);
  normalizeContacts(cv);
  return { cv, usage: response.usage, removedPhones, servedBy: response.model };
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

// LinkedIn display value comes from its href: the model tends to mangle percent-encoded
// characters (e.g. "andr%C3%A9s") when copying them by hand. Contacts are sorted into a
// fixed order since the model's ordering varies between runs.
const CONTACT_ORDER = ["location", "linkedin", "email"];

export function normalizeContacts(cv) {
  for (const c of cv.contact ?? []) {
    if (!/linkedin\.com/i.test(c.href ?? "")) continue;
    try {
      const url = new URL(c.href);
      c.value = decodeURIComponent(`${url.hostname.replace(/^www\./, "")}${url.pathname}`).replace(/\/$/, "");
    } catch {}
  }
  const rank = (c) => {
    const i = CONTACT_ORDER.indexOf(String(c.label).toLowerCase());
    return i === -1 ? CONTACT_ORDER.length : i;
  };
  cv.contact = [...(cv.contact ?? [])].sort((a, b) => rank(a) - rank(b));
  return cv;
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
