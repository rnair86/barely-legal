import { readFile } from "node:fs/promises";
import path from "node:path";

// The repo's top-level templates/ directory is the single source of truth.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

/** Read the Mutual NDA templates (at build time, for the static export). */
export async function getMndaTemplates() {
  const [coverPage, standardTerms] = await Promise.all([
    readFile(path.join(TEMPLATES_DIR, "Mutual-NDA-coverpage.md"), "utf8"),
    readFile(path.join(TEMPLATES_DIR, "Mutual-NDA.md"), "utf8"),
  ]);
  return { coverPage, standardTerms };
}
