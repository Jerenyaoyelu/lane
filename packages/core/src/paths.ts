/** Minimal glob: `**`, `*`, and exact prefix. Good enough for commons matching. */
export function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/\\\\]*")
    .replace(/{{GLOBSTAR}}/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

export function pathMatchesGlob(filePath: string, glob: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const normalizedGlob = glob.replace(/\\/g, "/");
  return globToRegExp(normalizedGlob).test(normalized);
}

export function pathMatchesAny(filePath: string, globs: string[]): boolean {
  return globs.some((g) => pathMatchesGlob(filePath, g));
}

export function slugify(input: string): string {
  const ascii = input
    .trim()
    .toLowerCase()
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (ascii.length >= 2) return ascii.slice(0, 48);

  // Fallback for CJK-only titles
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `lane-${hash.toString(36)}`;
}

export const LANE_DIR = ".lane";
export const COMMONS_FILE = "commons.yml";
export const PLAN_FILE = "plan.json";
export const PLAN_CONFIRMED_FILE = "plan.confirmed.json";
export const STATE_FILE = "state.json";
