import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["src", "public"];
const EXTS = new Set([".astro", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".html", ".md"]);
const PATTERN = /(?:href|src)\s*=\s*"\/[A-Za-z0-9._-]/g;

const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full);
    } else if (EXTS.has(extname(entry))) {
      const text = readFileSync(full, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (PATTERN.test(line)) offenders.push(`${full}:${i + 1}: ${line.trim()}`);
        PATTERN.lastIndex = 0;
      });
    }
  }
}

for (const root of ROOTS) {
  try { walk(root); } catch {}
}

if (offenders.length) {
  console.error("Hardcoded root-relative asset paths found (use ${import.meta.env.BASE_URL} instead):");
  for (const o of offenders) console.error("  " + o);
  process.exit(1);
}
