import assert from "node:assert/strict";
import { test } from "node:test";
import type { CommonsConfig } from "@lane/core";
import { parseRequirements } from "./parse-requirements.js";
import { planWithRules } from "./rule-planner.js";

const commons: CommonsConfig = {
  version: 1,
  paths: ["src/components/**", "src/routes/**", "pnpm-lock.yaml"],
  policy: {
    max_parallel_touching_commons: 1,
    require_claim_before_edit: true,
  },
  hints: {
    路由: ["src/routes/**"],
    组件: ["src/components/**"],
  },
};

const sample = `# 包
base: release/3.15

## 需求 1：直播排期面板
主要改动目录：\`src/routes/LiveControl/**\`

## 需求 2：商品角标
主要改动：\`src/routes/Goods/**\`，并需要在公共组件库增加 Badge。
可能改动：\`src/components/**\`

## 需求 3：注册排期与商品相关路由
两个业务都要挂路由，预计都会改路由聚合文件与菜单配置。
可能改动：\`src/routes/**\`、\`src/components/**\`
`;

test("parses three requirements and base branch", () => {
  const { items, baseBranch } = parseRequirements(sample);
  assert.equal(items.length, 3);
  assert.equal(baseBranch, "release/3.15");
});

test("extracts commons prep when multiple touch commons", () => {
  const { items, baseBranch } = parseRequirements(sample);
  const plan = planWithRules({
    requirements: items,
    commons,
    baseBranch: baseBranch || "main",
  });
  assert.equal(plan.confirmed, false);
  assert.ok(plan.lanes.some((l) => l.id.includes("commons")));
  assert.ok(plan.serialGroups.length >= 2);
  assert.ok(plan.risks.length >= 1);
});

test("without commons becomes conservative serial", () => {
  const { items } = parseRequirements(sample);
  const plan = planWithRules({
    requirements: items,
    commons: null,
    baseBranch: "main",
  });
  assert.ok(plan.warnings.some((w) => w.includes("commons.yml")));
  assert.equal(plan.serialGroups.length, plan.lanes.length);
});
