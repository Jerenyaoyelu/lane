import type { RequirementItem } from "@lane/core";
import { slugify } from "@lane/core";

const PATH_RE =
  /`([^`]+)`|(?:主要改动|可能改动|改动目录|路径)[：:]\s*([^\n]+)/gi;

function extractPaths(text: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(PATH_RE);
  while ((m = re.exec(text)) !== null) {
    const chunk = (m[1] || m[2] || "").trim();
    for (const part of chunk.split(/[,，、\s]+/)) {
      const p = part.replace(/[。；;]+$/, "").trim();
      if (p.includes("/") || p.includes("*") || p.endsWith(".ts") || p.endsWith(".tsx")) {
        found.add(p);
      }
    }
  }
  // backtick paths anywhere
  for (const bm of text.matchAll(/`([^`]+)`/g)) {
    const p = bm[1].trim();
    if (p.includes("/") || p.includes("*")) found.add(p);
  }
  return [...found];
}

function extractBaseBranch(markdown: string): string | undefined {
  const m =
    markdown.match(/^\s*base\s*[：:]\s*(\S+)/im) ||
    markdown.match(/^\s*baseBranch\s*[：:]\s*(\S+)/im);
  return m?.[1];
}

/**
 * Parse markdown requirements into items.
 * Supports `## 需求 N：标题` / `## 标题` sections.
 */
export function parseRequirements(markdown: string): {
  items: RequirementItem[];
  baseBranch?: string;
} {
  const baseBranch = extractBaseBranch(markdown);
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: { title: string; body: string; preferredId?: string }[] = [];
  let current: {
    title: string;
    body: string[];
    preferredId?: string;
  } | null = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current) {
        sections.push({
          title: current.title,
          body: current.body.join("\n").trim(),
          preferredId: current.preferredId,
        });
      }
      const rawTitle = heading[1].trim();
      const numbered = rawTitle.match(/^需求\s*(\d+)\s*[：:]\s*(.+)$/);
      const title = numbered ? numbered[2].trim() : rawTitle;
      const preferredId = numbered ? `req-${numbered[1]}` : undefined;
      current = { title, body: [], preferredId };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) {
    sections.push({
      title: current.title,
      body: current.body.join("\n").trim(),
      preferredId: current.preferredId,
    });
  }

  // Fallback: whole doc as one requirement
  if (sections.length === 0) {
    const title =
      markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || "requirement";
    sections.push({ title, body: markdown.trim() });
  }

  const used = new Set<string>();
  const items: RequirementItem[] = sections.map((s, index) => {
    let id = s.preferredId || slugify(s.title);
    if (!id || id.startsWith("lane-")) id = s.preferredId || `req-${index + 1}`;
    if (used.has(id)) id = `${id}-${index + 1}`;
    used.add(id);
    return {
      id,
      title: s.title,
      body: s.body,
      hintedPaths: extractPaths(`${s.title}\n${s.body}`),
      raw: `## ${s.title}\n${s.body}`,
    };
  });

  return { items, baseBranch };
}
