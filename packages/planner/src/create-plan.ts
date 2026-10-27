import type { CommonsConfig, PlanDocument, RequirementItem } from "@lane/core";
import { planWithLlm } from "./llm-planner.js";
import { parseRequirements } from "./parse-requirements.js";
import { planWithRules } from "./rule-planner.js";
import { formatPlanSummary } from "./summary.js";

export type PlanMode = "rule" | "llm";

export interface CreatePlanOptions {
  markdown: string;
  commons: CommonsConfig | null;
  baseBranch?: string;
  mode?: PlanMode;
  startPort?: number;
  worktreeParent?: string;
  llm?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
}

export interface CreatePlanResult {
  plan: PlanDocument;
  requirements: RequirementItem[];
  summaryText: string;
}

export async function createPlan(
  opts: CreatePlanOptions,
): Promise<CreatePlanResult> {
  const { items, baseBranch: parsedBase } = parseRequirements(opts.markdown);
  const baseBranch = opts.baseBranch || parsedBase || "main";
  const mode = opts.mode ?? "rule";

  const plan =
    mode === "llm"
      ? await planWithLlm({
          requirements: items,
          commons: opts.commons,
          baseBranch,
          startPort: opts.startPort,
          worktreeParent: opts.worktreeParent,
          ...opts.llm,
        })
      : planWithRules({
          requirements: items,
          commons: opts.commons,
          baseBranch,
          startPort: opts.startPort,
          worktreeParent: opts.worktreeParent,
        });

  return {
    plan,
    requirements: items,
    summaryText: formatPlanSummary(plan),
  };
}

export { parseRequirements, planWithRules, planWithLlm, formatPlanSummary };
