/**
 * Ensures InteractiveConcept section anchors exist in generated chapter HTML
 * and that return URLs stay on-site.
 */
import fs from "node:fs";
import path from "node:path";
import { INTERACTIVE_CONCEPTS, withReturnToReading, parseReturnPath } from "../src/lib/learning/interactive-concepts";

const CHAPTER_DIR = path.join(process.cwd(), "src/generated/book");
let failed = 0;

for (const concept of INTERACTIVE_CONCEPTS) {
  const file = path.join(CHAPTER_DIR, `${concept.chapterSlug}.json`);
  if (!fs.existsSync(file)) {
    console.error(`Missing chapter JSON for ${concept.id}: ${file}`);
    failed += 1;
    continue;
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { html: string };
  const needle = `id="${concept.afterSectionId}"`;
  if (!data.html.includes(needle)) {
    console.error(`Section id missing for ${concept.id}: ${concept.afterSectionId}`);
    failed += 1;
  }
  for (const target of concept.targets) {
    const href = withReturnToReading(target.href, concept.chapterSlug, concept.afterSectionId);
    if (!href.includes("from=book") || !href.includes("return=")) {
      console.error(`Return params missing for ${concept.id} → ${target.href}`);
      failed += 1;
    }
  }
}

const ok = parseReturnPath("/system-design/chapter-1#summary");
const bad = parseReturnPath("https://evil.example/");
if (ok !== "/system-design/chapter-1#summary" || bad !== null) {
  console.error("parseReturnPath failed open-redirect guard");
  failed += 1;
}

if (failed) {
  console.error(`verify-interactive-concepts: ${failed} failure(s)`);
  process.exit(1);
}
console.log(`verify-interactive-concepts: ${INTERACTIVE_CONCEPTS.length} concepts ok`);
