import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Loads a versioned system prompt from backend/prompts/. Read once at
 * startup (composition root) and fail fast if the file is missing --
 * exactly like a missing env var. The version string is what gets baked
 * into answers' provenance: prompts are append-only (v1.md, v2.md, ...),
 * never edited in place.
 */
export function loadSystemPrompt(version: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // infrastructure/ai/ -> up three levels to backend/, then prompts/.
  const promptPath = join(here, "..", "..", "..", "prompts", `${version}.md`);
  const raw = readFileSync(promptPath, "utf8");
  // The HTML comment block is maintainer documentation, not model input.
  return raw.replace(/<!--[\s\S]*?-->/g, "").trim();
}
