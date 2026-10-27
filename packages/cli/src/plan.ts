import fs from "node:fs";
import path from "node:path";
import {
  loadCommons,
  loadPlan,
  writePlan,
} from "@lane/core";
import { createPlan, type PlanMode } from "@lane/planner";

export interface PlanCommandOptions {
  repoRoot: string;
  from: string;
  mode: PlanMode;
  force?: boolean;
  baseBranch?: string;
  startPort?: number;
}

export async function runPlan(opts: PlanCommandOptions): Promise<void> {
  const existing = loadPlan(opts.repoRoot);
  if (existing && !opts.force) {
    throw new Error(
      "已存在 .lane/plan.json。若要覆盖请加 --force（未 confirm 的草稿会被替换）。",
    );
  }

  const fromPath = path.resolve(opts.from);
  if (!fs.existsSync(fromPath)) {
    throw new Error(`找不到需求文件: ${fromPath}`);
  }
  const markdown = fs.readFileSync(fromPath, "utf8");
  const commons = loadCommons(opts.repoRoot);

  const { plan, requirements, summaryText } = await createPlan({
    markdown,
    commons,
    baseBranch: opts.baseBranch,
    mode: opts.mode,
    startPort: opts.startPort,
  });

  const out = writePlan(opts.repoRoot, plan);
  console.log(summaryText);
  console.log("");
  console.log(`已解析需求 ${requirements.length} 条`);
  console.log(`已写入 ${path.relative(opts.repoRoot, out) || out}`);
  console.log("审阅后执行: lane confirm");
}
