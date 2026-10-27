import type { PlanDocument } from "@lane/core";

export function formatPlanSummary(plan: PlanDocument): string {
  const lines: string[] = [];
  lines.push(`# lane 计划摘要（${plan.mode} / confirmed=${plan.confirmed}）`);
  lines.push("");
  lines.push(`- baseBranch: \`${plan.baseBranch}\``);
  lines.push(`- 泳道数: ${plan.lanes.length}`);
  lines.push(`- 波次: ${plan.serialGroups.length}`);
  lines.push("");

  lines.push("## 执行波次（同组可并行，组间串行）");
  plan.serialGroups.forEach((group, i) => {
    lines.push(`${i + 1}. ${group.join(", ")}`);
  });
  lines.push("");

  lines.push("## 泳道");
  for (const lane of plan.lanes) {
    lines.push(
      `- **${lane.id}** — ${lane.title}` +
        (lane.touchesCommons ? " 〔触碰公共层〕" : ""),
    );
    lines.push(`  - branch: \`${lane.branch}\``);
    lines.push(`  - worktree: \`${lane.worktreePath}\``);
    lines.push(`  - port: ${lane.port}`);
    if (lane.dependsOn.length) {
      lines.push(`  - dependsOn: ${lane.dependsOn.join(", ")}`);
    }
    if (lane.rationale) lines.push(`  - 理由: ${lane.rationale}`);
  }

  if (plan.risks.length) {
    lines.push("");
    lines.push("## 风险");
    for (const r of plan.risks) lines.push(`- ${r}`);
  }
  if (plan.warnings.length) {
    lines.push("");
    lines.push("## 警告");
    for (const w of plan.warnings) lines.push(`- ${w}`);
  }

  lines.push("");
  lines.push(plan.summary);
  return lines.join("\n");
}
