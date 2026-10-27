# lane 架构与契约

## 分层

| 包 | 职责 |
|----|------|
| `@lane/core` | Schema、读写 `.lane/*`、路径匹配 |
| `@lane/planner` | L1：需求 → `plan.json` + 中文摘要 |
| `@lane/cli` | 用户入口；后续 L2/L3 也走这里 |
| 扩展（未做） | 只调 CLI，不内嵌 Git |

## 目录约定（目标业务仓库内）

```text
.lane/
  commons.yml          # 公共路径清单（人工维护）
  plan.json            # L1 草稿（未确认）
  plan.confirmed.json  # 人确认后的冻结计划
  state.json           # L2/L3 运行时（未实现）
  locks/               # L3 文件锁（未实现）
```

## commons.yml

```yaml
version: 1
paths:
  - src/components/**
  - src/utils/**
  - pnpm-lock.yaml
policy:
  max_parallel_touching_commons: 1
  require_claim_before_edit: true
hints:
  # 关键词 → 可能碰到的路径（规则规划器用）
  路由: ["src/routes/**"]
  组件: ["src/components/**"]
  文案: ["**/i18n/**", "**/locales/**"]
  依赖: ["package.json", "pnpm-lock.yaml", "package-lock.json"]
```

## plan.json（关键字段）

- `confirmed: boolean` — 未 `confirm` 前为 `false`；L2 `start` 必须要求 `true`
- `lanes[]` — 每条泳道：`id/title/branch/worktreePath/port/touchesCommons/allowedPaths/forbiddenPaths/dependsOn/acceptance`
- `serialGroups` — 执行波次；同组可并行，组与组串行
- `risks[]` / `warnings[]` — 给人看的风险
- `summary` — 中文摘要

## 身份边界

- **Planner**：只产出计划，不改业务代码、不开 worktree
- **Orchestrator（L2）**：确定性执行 Git / 写规则
- **Worker**：Cursor 编码 Agent，遵守 lane 注入的规则
