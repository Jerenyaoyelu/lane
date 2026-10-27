import { z } from "zod";

export const CommonsConfigSchema = z.object({
  version: z.literal(1),
  paths: z.array(z.string()).default([]),
  policy: z
    .object({
      max_parallel_touching_commons: z.number().int().positive().default(1),
      require_claim_before_edit: z.boolean().default(true),
    })
    .default({
      max_parallel_touching_commons: 1,
      require_claim_before_edit: true,
    }),
  hints: z.record(z.array(z.string())).optional(),
});

export const LaneSpecSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "lane id must be kebab-case"),
  title: z.string().min(1),
  branch: z.string().min(1),
  worktreePath: z.string().min(1),
  port: z.number().int().min(1024).max(65535),
  touchesCommons: z.boolean(),
  allowedPaths: z.array(z.string()),
  forbiddenPaths: z.array(z.string()),
  dependsOn: z.array(z.string()).default([]),
  acceptance: z.array(z.string()).default([]),
  requirementIds: z.array(z.string()).optional(),
  rationale: z.string().optional(),
});

export const PlanDocumentSchema = z.object({
  version: z.literal(1),
  confirmed: z.boolean(),
  confirmedAt: z.string().optional(),
  baseBranch: z.string().min(1),
  createdAt: z.string(),
  mode: z.enum(["rule", "llm"]),
  lanes: z.array(LaneSpecSchema).min(1),
  serialGroups: z.array(z.array(z.string())),
  risks: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  summary: z.string(),
});

export const StateDocumentSchema = z.object({
  version: z.literal(1),
  baseBranch: z.string(),
  planConfirmedAt: z.string().optional(),
  lanes: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["planned", "active", "blocked", "done", "removed"]),
      worktreePath: z.string().optional(),
      port: z.number().optional(),
      branch: z.string().optional(),
      behindBase: z.boolean().optional(),
      notes: z.string().optional(),
    }),
  ),
  commonsClaim: z
    .object({
      holder: z.string(),
      laneId: z.string(),
      expiresAt: z.string(),
    })
    .nullable()
    .optional(),
});
