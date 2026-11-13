import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";

// The repo's top-level templates/ directory is the single source of truth.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

/** Read the Mutual NDA templates once and cache them. */
export async function getMndaTemplates() {
  "use cache";
  cacheLife("max");

  const [coverPage, standardTerms] = await Promise.all([
    readFile(path.join(TEMPLATES_DIR, "Mutual-NDA-coverpage.md"), "utf8"),
    readFile(path.join(TEMPLATES_DIR, "Mutual-NDA.md"), "utf8"),
  ]);
  return { coverPage, standardTerms };
}
