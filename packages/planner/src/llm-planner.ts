import {
  PlanDocumentSchema,
  type CommonsConfig,
  type PlanDocument,
  type RequirementItem,
} from "@lane/core";
import { planWithRules } from "./rule-planner.js";

export interface LlmPlanOptions {
  requirements: RequirementItem[];
  commons: CommonsConfig | null;
  baseBranch: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  startPort?: number;
  worktreeParent?: string;
}

function buildPrompt(opts: LlmPlanOptions): string {
  return `你是软件工程编排助手。根据需求与公共路径清单，输出【仅 JSON】的并行开发计划，不要 Markdown。

规则：
1. 多条需求都可能改 commons.paths 时，必须拆出 touchesCommons=true 的前置泳道，其它业务 lane dependsOn 它。
2. serialGroups：同组可并行，组间串行。
3. lane.id 必须 kebab-case；branch=feat/<id>；worktreePath=../feat-<id>；port 从 ${opts.startPort ?? 5173} 递增。
4. 无把握时偏保守（更串行），并写入 risks/warnings。
5. summary 用中文。
6. confirmed 必须为 false；version 必须为 1；mode 必须为 "llm"。

commons.yml:
${JSON.stringify(opts.commons, null, 2)}

requirements:
${JSON.stringify(
  opts.requirements.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    hintedPaths: r.hintedPaths,
  })),
  null,
  2,
)}

baseBranch: ${opts.baseBranch}

JSON shape:
{
  "version": 1,
  "confirmed": false,
  "baseBranch": string,
  "createdAt": ISO string,
  "mode": "llm",
  "lanes": [ { "id","title","branch","worktreePath","port","touchesCommons","allowedPaths","forbiddenPaths","dependsOn","acceptance","requirementIds","rationale" } ],
  "serialGroups": string[][],
  "risks": string[],
  "warnings": string[],
  "summary": string
}`;
}

async function callOpenAiCompatible(
  prompt: string,
  opts: LlmPlanOptions,
): Promise<string> {
  const apiKey = opts.apiKey || process.env.LANE_LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LLM 模式需要 LANE_LLM_API_KEY 或 OPENAI_API_KEY，或改用 --mode rule",
    );
  }
  const baseUrl = (
    opts.baseUrl ||
    process.env.LANE_LLM_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = opts.model || process.env.LANE_LLM_MODEL || "gpt-4o-mini";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM 返回空内容");
  return content;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("无法从 LLM 输出中解析 JSON");
    return JSON.parse(m[0]);
  }
}

export async function planWithLlm(opts: LlmPlanOptions): Promise<PlanDocument> {
  const prompt = buildPrompt(opts);
  let rawText: string;
  try {
    rawText = await callOpenAiCompatible(prompt, opts);
  } catch (err) {
    const fallback = planWithRules({
      requirements: opts.requirements,
      commons: opts.commons,
      baseBranch: opts.baseBranch,
      startPort: opts.startPort,
      worktreeParent: opts.worktreeParent,
    });
    fallback.warnings.push(
      `LLM 调用失败，已回退规则模式：${err instanceof Error ? err.message : String(err)}`,
    );
    return fallback;
  }

  try {
    const parsed = PlanDocumentSchema.parse(extractJson(rawText));
    return {
      ...parsed,
      confirmed: false,
      mode: "llm",
      createdAt: parsed.createdAt || new Date().toISOString(),
      baseBranch: opts.baseBranch,
    };
  } catch (firstErr) {
    // one retry via rule merge note
    try {
      rawText = await callOpenAiCompatible(
        prompt + "\n\n上次 JSON 校验失败，请严格按 schema 重输出。",
        opts,
      );
      const parsed = PlanDocumentSchema.parse(extractJson(rawText));
      return {
        ...parsed,
        confirmed: false,
        mode: "llm",
        baseBranch: opts.baseBranch,
      };
    } catch {
      const fallback = planWithRules({
        requirements: opts.requirements,
        commons: opts.commons,
        baseBranch: opts.baseBranch,
        startPort: opts.startPort,
        worktreeParent: opts.worktreeParent,
      });
      fallback.warnings.push(
        `LLM JSON 校验失败，已回退规则模式：${firstErr instanceof Error ? firstErr.message : String(firstErr)}`,
      );
      return fallback;
    }
  }
}
