import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureLaneDir,
  loadCommons,
  writeCommons,
  type CommonsConfig,
} from "@lane/core";
import YAML from "yaml";

function defaultCommons(): CommonsConfig {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../../templates/commons.yml"),
    path.resolve(here, "../../../../templates/commons.yml"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return YAML.parse(fs.readFileSync(c, "utf8")) as CommonsConfig;
    }
  }
  return {
    version: 1,
    paths: [
      "src/components/**",
      "src/utils/**",
      "package.json",
      "pnpm-lock.yaml",
    ],
    policy: {
      max_parallel_touching_commons: 1,
      require_claim_before_edit: true,
    },
    hints: {
      路由: ["src/routes/**"],
      组件: ["src/components/**"],
      依赖: ["package.json", "pnpm-lock.yaml"],
    },
  };
}

export function runInit(repoRoot: string, force = false): void {
  ensureLaneDir(repoRoot);
  const existing = loadCommons(repoRoot);
  if (existing && !force) {
    console.log(`已存在 .lane/commons.yml，跳过写入（可用 --force 覆盖）。`);
  } else {
    const file = writeCommons(repoRoot, defaultCommons());
    console.log(`已写入 ${path.relative(repoRoot, file) || file}`);
  }

  const gitignore = path.join(repoRoot, ".gitignore");
  const markers = [".lane/state.json", ".lane/locks/", ".lane/plan.json"];
  let content = fs.existsSync(gitignore)
    ? fs.readFileSync(gitignore, "utf8")
    : "";
  let changed = false;
  for (const m of markers) {
    if (!content.includes(m)) {
      content += (content.endsWith("\n") || content === "" ? "" : "\n") + m + "\n";
      changed = true;
    }
  }
  // Keep confirmed plan optionally tracked — suggest ignoring draft only
  if (changed) {
    fs.writeFileSync(gitignore, content, "utf8");
    console.log("已更新 .gitignore（忽略 plan 草稿与运行时状态）。");
  }

  console.log("");
  console.log("下一步：");
  console.log("  1. 按仓库实际情况编辑 .lane/commons.yml");
  console.log("  2. lane plan --from <requirements.md>");
  console.log("  3. 审阅后 lane confirm");
}
