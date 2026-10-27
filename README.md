# lane

多需求并行编排器（Planner + Workers）：把「多需求 / 多 worktree / 多 AI 会话」从口头约定，变成「规划 → 确认 → 启动 → 同步 → 收尾」的可重复流水线。

> 窄编排 Agent + 确定性执行器。Cursor 里的编码 Agent 仍是 Worker，不是替你写业务的超级 Agent。

## 当前进度

| 层 | 状态 |
|----|------|
| L1 Planner（`init` / `plan` / `confirm`） | 已实现（规则模式 + 可选 LLM） |
| L2 Orchestrator（worktree / 规则注入） | 待做 |
| L3 Runtime（commons claim 锁） | 待做 |
| Cursor 扩展 | 待做 |

## 快速开始（L1）

```bash
cd D:\personal\lane
npm install
npm run build
npm link -w @lane/cli   # 可选：全局 lane 命令

# 在任意 git 仓库里
lane init
lane plan --from path/to/requirements.md
# 阅读终端摘要与 .lane/plan.json
lane confirm
```

## 文档

- [产品计划](docs/product-plan.md)
- [人工走读（理解理念）](docs/walkthrough.md)
- [架构与契约](docs/architecture.md)

## 许可证

Apache-2.0
