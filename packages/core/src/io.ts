import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import {
  CommonsConfigSchema,
  PlanDocumentSchema,
  StateDocumentSchema,
} from "./schema.js";
import type { CommonsConfig, PlanDocument, StateDocument } from "./types.js";
import {
  COMMONS_FILE,
  LANE_DIR,
  PLAN_CONFIRMED_FILE,
  PLAN_FILE,
  STATE_FILE,
} from "./paths.js";

export function laneDir(repoRoot: string): string {
  return path.join(repoRoot, LANE_DIR);
}

export function ensureLaneDir(repoRoot: string): string {
  const dir = laneDir(repoRoot);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function loadCommons(repoRoot: string): CommonsConfig | null {
  const file = path.join(laneDir(repoRoot), COMMONS_FILE);
  if (!fs.existsSync(file)) return null;
  const raw = YAML.parse(fs.readFileSync(file, "utf8"));
  return CommonsConfigSchema.parse(raw);
}

export function writeCommons(repoRoot: string, config: CommonsConfig): string {
  ensureLaneDir(repoRoot);
  const file = path.join(laneDir(repoRoot), COMMONS_FILE);
  fs.writeFileSync(file, YAML.stringify(config), "utf8");
  return file;
}

export function loadPlan(repoRoot: string): PlanDocument | null {
  const file = path.join(laneDir(repoRoot), PLAN_FILE);
  if (!fs.existsSync(file)) return null;
  return PlanDocumentSchema.parse(
    JSON.parse(fs.readFileSync(file, "utf8")),
  );
}

export function loadConfirmedPlan(repoRoot: string): PlanDocument | null {
  const file = path.join(laneDir(repoRoot), PLAN_CONFIRMED_FILE);
  if (!fs.existsSync(file)) return null;
  return PlanDocumentSchema.parse(
    JSON.parse(fs.readFileSync(file, "utf8")),
  );
}

export function writePlan(repoRoot: string, plan: PlanDocument): string {
  ensureLaneDir(repoRoot);
  const parsed = PlanDocumentSchema.parse(plan);
  const file = path.join(laneDir(repoRoot), PLAN_FILE);
  fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  return file;
}

export function writeConfirmedPlan(
  repoRoot: string,
  plan: PlanDocument,
): string {
  ensureLaneDir(repoRoot);
  const parsed = PlanDocumentSchema.parse({
    ...plan,
    confirmed: true,
    confirmedAt: plan.confirmedAt ?? new Date().toISOString(),
  });
  const draft = path.join(laneDir(repoRoot), PLAN_FILE);
  const confirmed = path.join(laneDir(repoRoot), PLAN_CONFIRMED_FILE);
  const text = JSON.stringify(parsed, null, 2) + "\n";
  fs.writeFileSync(draft, text, "utf8");
  fs.writeFileSync(confirmed, text, "utf8");
  return confirmed;
}

export function loadState(repoRoot: string): StateDocument | null {
  const file = path.join(laneDir(repoRoot), STATE_FILE);
  if (!fs.existsSync(file)) return null;
  return StateDocumentSchema.parse(
    JSON.parse(fs.readFileSync(file, "utf8")),
  );
}

export function writeState(repoRoot: string, state: StateDocument): string {
  ensureLaneDir(repoRoot);
  const parsed = StateDocumentSchema.parse(state);
  const file = path.join(laneDir(repoRoot), STATE_FILE);
  fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  return file;
}

export function resolveRepoRoot(cwd = process.cwd()): string {
  let dir = path.resolve(cwd);
  while (true) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Not inside a git repository (started from ${cwd}). Run inside a repo or pass --cwd.`,
      );
    }
    dir = parent;
  }
}
