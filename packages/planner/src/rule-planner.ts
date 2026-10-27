import type {
  CommonsConfig,
  LaneSpec,
  PlanDocument,
  RequirementItem,
} from "@lane/core";
import { pathMatchesAny, slugify } from "@lane/core";

export interface RulePlanInput {
  requirements: RequirementItem[];
  commons: CommonsConfig | null;
  baseBranch: string;
  startPort?: number;
  worktreeParent?: string;
}

interface AnnotatedReq {
  req: RequirementItem;
  paths: string[];
  touchesCommons: boolean;
  hintMatchedCommons: string[];
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

function collectHintPaths(
  text: string,
  commons: CommonsConfig | null,
): string[] {
  if (!commons?.hints) return [];
  const hit: string[] = [];
  const lower = text.toLowerCase();
  for (const [keyword, paths] of Object.entries(commons.hints)) {
    if (lower.includes(keyword.toLowerCase()) || text.includes(keyword)) {
      hit.push(...paths);
    }
  }
  return uniquePaths(hit);
}

function annotate(
  requirements: RequirementItem[],
  commons: CommonsConfig | null,
): AnnotatedReq[] {
  const commonsPaths = commons?.paths ?? [];
  return requirements.map((req) => {
    const hintPaths = collectHintPaths(`${req.title}\n${req.body}`, commons);
    const paths = uniquePaths([...req.hintedPaths, ...hintPaths]);
    const hintMatchedCommons = paths.filter((p) =>
      commonsPaths.some(
        (c) => pathMatchesAny(p.replace(/\*\*/g, "x"), [c]) || p.includes(c.replace(/\/\*\*$/, "")) || pathMatchesAny(c.replace(/\*\*/g, "file"), [p]),
      ),
    );

    // Simpler commons touch: any hinted path matches commons glob, or hint keyword maps into commons
    let touchesCommons = false;
    const matched: string[] = [];
    for (const p of paths) {
      for (const c of commonsPaths) {
        const probe = p.endsWith("/**") ? p.slice(0, -3) + "/x.ts" : p;
        if (pathMatchesAny(probe, [c]) || pathMatchesAny(p, [c])) {
          touchesCommons = true;
          matched.push(c);
        }
      }
    }
    // Keyword-level: 路由/组件/依赖/公共/文案 in text when commons exists
    if (commons && /路由|组件|公共|依赖|lockfile|文案|i18n|菜单/.test(`${req.title}${req.body}`)) {
      // only force touch if also has path hint into commons OR explicit 公共/组件/路由 wording with no private-only path
      if (
        /公共组件|组件库|路由聚合|菜单配置|pnpm-lock|package\.json|公共层/.test(
          `${req.title}${req.body}`,
        ) ||
        matched.length > 0 ||
        hintPaths.some((h) =>
          commonsPaths.some((c) => {
            const probe = h.endsWith("/**") ? h.slice(0, -3) + "/x.ts" : h;
            return pathMatchesAny(probe, [c]);
          }),
        )
      ) {
        touchesCommons = true;
      }
    }

    return {
      req,
      paths: paths.length ? paths : [],
      touchesCommons,
      hintMatchedCommons: uniquePaths([...matched, ...hintMatchedCommons]),
    };
  });
}

function makeLaneId(title: string, used: Set<string>, prefix = ""): string {
  let base = slugify(title);
  if (prefix) base = `${prefix}${base}`;
  if (!base) base = `${prefix}lane`;
  let id = base;
  let i = 2;
  while (used.has(id)) {
    id = `${base}-${i++}`;
  }
  used.add(id);
  return id;
}

function buildLane(
  id: string,
  title: string,
  opts: {
    touchesCommons: boolean;
    allowedPaths: string[];
    dependsOn?: string[];
    acceptance?: string[];
    requirementIds?: string[];
    rationale?: string;
    port: number;
    worktreeParent: string;
  },
): LaneSpec {
  return {
    id,
    title,
    branch: `feat/${id}`,
    worktreePath: `${opts.worktreeParent}/feat-${id}`,
    port: opts.port,
    touchesCommons: opts.touchesCommons,
    allowedPaths: opts.allowedPaths.length
      ? opts.allowedPaths
      : opts.touchesCommons
        ? ["$commons"]
        : ["**"],
    forbiddenPaths: opts.touchesCommons ? [] : ["$commons"],
    dependsOn: opts.dependsOn ?? [],
    acceptance: opts.acceptance ?? [],
    requirementIds: opts.requirementIds,
    rationale: opts.rationale,
  };
}

export function planWithRules(input: RulePlanInput): PlanDocument {
  const warnings: string[] = [];
  const risks: string[] = [];
  const startPort = input.startPort ?? 5173;
  const worktreeParent = input.worktreeParent ?? "..";

  if (!input.commons) {
    warnings.push(
      "未找到 .lane/commons.yml：规划将偏保守，建议先运行 lane init 并维护公共路径清单。",
    );
  }
  if (input.requirements.length === 0) {
    throw new Error("没有解析到任何需求，请检查 Markdown 是否包含 ## 标题章节。");
  }

  const annotated = annotate(input.requirements, input.commons);
  const touching = annotated.filter((a) => a.touchesCommons);
  const usedIds = new Set<string>();
  const lanes: LaneSpec[] = [];
  let port = startPort;

  let commonsLaneId: string | undefined;

  // If 2+ requirements touch commons → extract a shared commons lane + serialize
  if (touching.length >= 2 && input.commons) {
    commonsLaneId = makeLaneId("commons-shared", usedIds, "");
    // Prefer a clearer id
    usedIds.delete(commonsLaneId);
    commonsLaneId = makeLaneId("commons-prep", usedIds);
    const sharedPaths = uniquePaths(
      touching.flatMap((t) => t.hintMatchedCommons.length
        ? t.hintMatchedCommons
        : input.commons!.paths.slice(0, 4)),
    );
    lanes.push(
      buildLane(commonsLaneId, "公共层前置改动", {
        touchesCommons: true,
        allowedPaths: sharedPaths.length ? sharedPaths : ["$commons"],
        acceptance: ["公共层改动单独合入版本分支"],
        requirementIds: touching.map((t) => t.req.id),
        rationale:
          "多条需求都可能改动公共路径，抽成前置泳道，避免并行冲突。",
        port: port++,
        worktreeParent,
      }),
    );
    risks.push(
      `有 ${touching.length} 条需求触碰公共层，已拆出前置泳道 ${commonsLaneId}；业务泳道需等其合入后再 sync。`,
    );
  } else if (touching.length === 1) {
    risks.push(
      `需求「${touching[0].req.title}」可能改动公共层；并行时请避免其他泳道同时改 commons。`,
    );
  } else if (!input.commons) {
    risks.push("无 commons 清单，无法可靠判断公共层冲突；建议串行或先补清单再规划。");
  }

  for (const a of annotated) {
    const id = makeLaneId(a.req.id || a.req.title, usedIds);
    const dependsOn =
      commonsLaneId && a.touchesCommons ? [commonsLaneId] : [];
    // If we extracted shared commons lane, mark business lanes as not owning commons edits
    const touches =
      commonsLaneId && a.touchesCommons ? false : a.touchesCommons;
    const allowed =
      a.paths.length > 0
        ? a.paths
        : touches
          ? ["$commons"]
          : [`src/**`];

    lanes.push(
      buildLane(id, a.req.title, {
        touchesCommons: touches,
        allowedPaths: allowed,
        dependsOn,
        acceptance: [`完成：${a.req.title}`],
        requirementIds: [a.req.id],
        rationale: a.touchesCommons
          ? commonsLaneId
            ? "业务实现；公共层改动已上收到前置泳道。"
            : "检测到可能触碰公共路径。"
          : "未检测到公共路径触碰，可与其它非公共泳道并行。",
        port: port++,
        worktreeParent,
      }),
    );
  }

  // serialGroups: wave0 = commons prep (if any); wave1 = non-dependent / remaining
  const serialGroups: string[][] = [];
  if (commonsLaneId) {
    serialGroups.push([commonsLaneId]);
    const rest = lanes.filter((l) => l.id !== commonsLaneId).map((l) => l.id);
    // If no commons file, put all touching in separate waves
    serialGroups.push(rest);
  } else if (!input.commons) {
    // Conservative: each lane its own wave
    for (const l of lanes) serialGroups.push([l.id]);
    warnings.push("因缺少 commons.yml，已将全部泳道串行排布（可人工改 plan.json 后再 confirm）。");
  } else if (touching.length === 1) {
    const touchId = lanes.find(
      (l) => l.requirementIds?.includes(touching[0].req.id) && l.touchesCommons,
    )?.id;
    const others = lanes.filter((l) => l.id !== touchId).map((l) => l.id);
    if (touchId) {
      // commons-touching lane alone in first or last wave — put others parallel, touching can parallel if only one
      serialGroups.push([touchId, ...others]);
    } else {
      serialGroups.push(lanes.map((l) => l.id));
    }
  } else {
    serialGroups.push(lanes.map((l) => l.id));
  }

  const summaryParts = [
    `共 ${lanes.length} 条泳道，${serialGroups.length} 个执行波次。`,
    commonsLaneId
      ? `已抽取公共前置「${commonsLaneId}」，请先完成并合入 base，再开业务泳道。`
      : touching.length
        ? `有 ${touching.length} 条需求可能触碰公共层，请人工复核 serialGroups。`
        : "未检测到多需求公共层冲突，可考虑并行。",
    "请审阅后执行 lane confirm；未确认前不要 start。",
  ];

  return {
    version: 1,
    confirmed: false,
    baseBranch: input.baseBranch,
    createdAt: new Date().toISOString(),
    mode: "rule",
    lanes,
    serialGroups,
    risks,
    warnings,
    summary: summaryParts.join(""),
  };
}
