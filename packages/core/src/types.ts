export interface CommonsPolicy {
  max_parallel_touching_commons: number;
  require_claim_before_edit: boolean;
}

export interface CommonsConfig {
  version: 1;
  paths: string[];
  policy: CommonsPolicy;
  hints?: Record<string, string[]>;
}

export interface LaneSpec {
  id: string;
  title: string;
  branch: string;
  worktreePath: string;
  port: number;
  touchesCommons: boolean;
  allowedPaths: string[];
  forbiddenPaths: string[];
  dependsOn: string[];
  acceptance: string[];
  requirementIds?: string[];
  rationale?: string;
}

export interface PlanDocument {
  version: 1;
  confirmed: boolean;
  confirmedAt?: string;
  baseBranch: string;
  createdAt: string;
  mode: "rule" | "llm";
  lanes: LaneSpec[];
  serialGroups: string[][];
  risks: string[];
  warnings: string[];
  summary: string;
}

export type LaneRuntimeStatus =
  | "planned"
  | "active"
  | "blocked"
  | "done"
  | "removed";

export interface LaneRuntimeState {
  id: string;
  status: LaneRuntimeStatus;
  worktreePath?: string;
  port?: number;
  branch?: string;
  behindBase?: boolean;
  notes?: string;
}

export interface StateDocument {
  version: 1;
  baseBranch: string;
  planConfirmedAt?: string;
  lanes: LaneRuntimeState[];
  commonsClaim?: {
    holder: string;
    laneId: string;
    expiresAt: string;
  } | null;
}

export interface RequirementItem {
  id: string;
  title: string;
  body: string;
  hintedPaths: string[];
  raw: string;
}
