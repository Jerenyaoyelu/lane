import path from "node:path";
import {
  loadPlan,
  writeConfirmedPlan,
  writeState,
  type StateDocument,
} from "@lane/core";
import { formatPlanSummary } from "@lane/planner";

export function runConfirm(repoRoot: string): void {
  const plan = loadPlan(repoRoot);
  if (!plan) {
    throw new Error("没有 .lane/plan.json，请先运行 lane plan --from <file>");
  }
  if (plan.confirmed) {
    console.log("计划已是 confirmed 状态。仍将刷新 plan.confirmed.json。");
  }

  const confirmed = writeConfirmedPlan(repoRoot, {
    ...plan,
    confirmed: true,
    confirmedAt: new Date().toISOString(),
  });

  const state: StateDocument = {
    version: 1,
    baseBranch: plan.baseBranch,
    planConfirmedAt: new Date().toISOString(),
    lanes: plan.lanes.map((l) => ({
      id: l.id,
      status: "planned",
      worktreePath: l.worktreePath,
      port: l.port,
      branch: l.branch,
    })),
    commonsClaim: null,
  };
  writeState(repoRoot, state);

  console.log(formatPlanSummary({ ...plan, confirmed: true }));
  console.log("");
  console.log(`已冻结: ${path.relative(repoRoot, confirmed) || confirmed}`);
  console.log("已初始化 .lane/state.json（L2 start 将基于此状态）。");
  console.log("注意：L2 start/sync/done 尚未实现；下一步可按 docs/walkthrough.md 第三遍手搓模拟。");
}
