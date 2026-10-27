# 人工走读：理解 lane 的理念（建议走 3 遍）

本文不是 API 手册，而是让你**用身体走几遍流程**，把「为什么需要编排」刻进直觉。后续你自己加 L2/L3/插件时，会少走弯路。

---

## 核心理念（先背这 5 句）

1. **Worktree 只隔离目录，不隔离冲突** — 公共层照样会撞。
2. **并行的单位是「泳道 lane」**，不是「人」或「AI 会话」。
3. **规划（L1）可以聪明；执行（L2）必须死板** — LLM 出计划，Git/文件做动作。
4. **人确认是硬门禁** — `plan` ≠ 可以开工；`confirm` 之后才算冻结。
5. **约束要写进文件，不要写进嘴** — 会话开场文案 / Cursor rules，而不是每次口头说「别改公共层」。

---

## 准备（10 分钟）

在本仓库：

```bash
cd D:\personal\lane
npm install
npm run build
npx lane --help
```

另开一个**练习用 git 仓库**（不要直接拿公司主仓练手）。例如：

```bash
mkdir D:\personal\lane-playground
cd D:\personal\lane-playground
git init
git commit --allow-empty -m "init"
# 假装有点结构
mkdir src\routes\A, src\routes\B, src\components, src\utils
echo ok > src\routes\A\page.tsx
echo ok > src\routes\B\page.tsx
echo ok > src\components\Button.tsx
git add . && git commit -m "scaffold"
```

把本仓的 CLI 链过去（任选其一）：

```bash
# 方式 A：全局 link
cd D:\personal\lane
npm link -w @lane/cli

# 方式 B：直接用绝对路径
node D:\personal\lane\packages\cli\dist\index.js --help
```

---

## 第一遍：只做「规划」，感受输出长什么样

**目的**：理解 L1 产出的是「可讨论的计划」，不是自动开干。

1. 在 playground：

```bash
cd D:\personal\lane-playground
lane init
```

2. 打开 `.lane/commons.yml`，读一遍 `paths` 和 `hints`。问自己：  
   *如果公司前端仓，我会把哪些路径放进 commons？*

3. 复制样例需求：

```bash
copy D:\personal\lane\examples\sample-requirements.md .\requirements.md
lane plan --from .\requirements.md
```

4. **停下来读三样东西**（不要急着 confirm）：
   - 终端里的中文摘要
   - `.lane\plan.json` 里的 `lanes` / `serialGroups` / `risks`
   - `warnings`（例如有没有 commons 冲突被拆出来）

5. 用手改一版 `plan.json`（改某个 `allowedPaths` 或把两条 lane 改成串行），再执行：

```bash
lane confirm
```

6. 对比 `.lane\plan.json` 与 `.lane\plan.confirmed.json`。  
   **体会**：确认 = 冻结；之后 L2 只能读 confirmed。

**第一遍过关标准**：你能用自己的话解释 `serialGroups` 和 `touchesCommons` 的意思。

---

## 第二遍：故意制造「公共层冲突」

**目的**：体会为什么不能「几条需求直接并行」。

1. 编辑 `requirements.md`，让**两条需求都明确要改路由/公共组件**（样例里已有类似场景，可再加强措辞）。

2. 再跑：

```bash
lane plan --from .\requirements.md --force
```

3. 看计划是否：
   - 拆出了 `commons-*` 前置泳道，或
   - 把冲突需求放进不同的 `serialGroups` 波次

4. 再跑一次**无 commons 配置**的对照（临时改名）：

```bash
ren .lane\commons.yml commons.yml.bak
lane plan --from .\requirements.md --force
ren .lane\commons.yml.bak commons.yml
```

观察 `warnings`：没有 commons 清单时，规划器应**更保守**（警告、少瞎并行）。

**第二遍过关标准**：你认同「公共路径清单是人工资产，不是 AI 玄学」。

---

## 第三遍：用纸笔模拟 L2/L3（代码还没写时）

**目的**：在实现 L2 之前，先把编排步骤「演」一遍，避免把 CLI 做成大泥球。

假设 `confirm` 已完成。在纸上或 Markdown 写下每条 lane 的手搓步骤：

| 步骤 | 你会敲的命令 / 动作 | 对应未来 CLI |
|------|---------------------|--------------|
| 开目录 | `git worktree add ../feat-xxx -b feat/xxx main` | `lane start` |
| 端口 | 写 `.env.local` PORT=5174 | `lane start` |
| 约束 | 新建 `.cursor/rules/lane-xxx.mdc` 禁止 commons | 规则注入 |
| 开工 | Cursor 打开该目录，粘贴开场文案 | bootstrap |
| 同步 | `git fetch && git rebase origin/main` | `lane sync` |
| 收摊 | PR 合并后 `git worktree remove` | `lane done` |
| 公共锁 | 「谁改 commons 谁举手」 | `lane claim` |

然后问自己：

- 哪一步**最容易忘**？→ 那就是 L2 必须自动化的点。  
- 哪一步**需要人判断**？→ 那就是必须 Confirm / 交互提示的点。  
- 哪一步**两个 AI 可能同时踩**？→ 那就是 L3 锁。

**第三遍过关标准**：你能独立画出「需求 → plan → confirm → start → sync → done」序列，并标出人与机器的分界。

---

## 理念检查清单（开发本产品时随时翻）

做新功能前问：

- [ ] 这是 **Planner 智能** 还是 **Orchestrator 确定性**？别混在一个函数里。
- [ ] 失败时，用户能否只看 `plan.json` / `state.json` 就懂发生了什么？
- [ ] 有没有引入「必须每次口头叮嘱 AI」的步骤？有则设计失败。
- [ ] Windows 路径、已存在 worktree、未 confirm 就 start —— 错误信息是否可操作？
- [ ] 没有 LLM / 没有网时，规则模式是否仍能给出保守计划？

---

## 建议的后续自学顺序（回家继续做）

1. 读完 [architecture.md](./architecture.md) 契约  
2. 读 `packages/planner/src/rule-planner.ts`（L1 启发式）  
3. 实现 L2：`start/status/sync/done`（先手写 plan 也能跑）  
4. 再补 Cursor 扩展壳  
5. 最后做 L3 claim 锁  

产品计划全文见 [product-plan.md](./product-plan.md)。
