#!/usr/bin/env node
import { Command } from "commander";
import { resolveRepoRoot } from "@lane/core";
import { runInit } from "./init.js";
import { runPlan } from "./plan.js";
import { runConfirm } from "./confirm.js";

const program = new Command();

program
  .name("lane")
  .description(
    "Multi-requirement parallel orchestrator (L1 planner ready; L2/L3 upcoming)",
  )
  .version("0.1.0")
  .option("--cwd <path>", "目标仓库路径（默认从当前目录向上找 .git）");

program
  .command("init")
  .description("写入 .lane/commons.yml 模板，并建议 gitignore")
  .option("--force", "覆盖已有 commons.yml", false)
  .action((opts, cmd) => {
    const root = resolveRepoRoot(cmd.parent?.opts().cwd);
    runInit(root, Boolean(opts.force));
  });

program
  .command("plan")
  .description("L1：从需求 Markdown 生成 .lane/plan.json（未确认）")
  .requiredOption("--from <file>", "需求 Markdown 文件")
  .option("--mode <mode>", "rule | llm", "rule")
  .option("--force", "覆盖已有 plan.json", false)
  .option("--base <branch>", "覆盖需求文件中的 base 分支")
  .option("--start-port <port>", "起始端口", "5173")
  .action(async (opts, cmd) => {
    const root = resolveRepoRoot(cmd.parent?.opts().cwd);
    const mode = opts.mode === "llm" ? "llm" : "rule";
    await runPlan({
      repoRoot: root,
      from: opts.from,
      mode,
      force: Boolean(opts.force),
      baseBranch: opts.base,
      startPort: Number(opts.startPort) || 5173,
    });
  });

program
  .command("confirm")
  .description("确认并冻结计划 → plan.confirmed.json + state.json")
  .action((_opts, cmd) => {
    const root = resolveRepoRoot(cmd.parent?.opts().cwd);
    runConfirm(root);
  });

program
  .command("status")
  .description("（占位）查看泳道状态 — L2 实现后可用")
  .action(() => {
    console.log("status 将在 L2 实现。当前请查看 .lane/plan.json 与 .lane/state.json。");
  });

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
