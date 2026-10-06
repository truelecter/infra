import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const statusSchema = z.enum(["complete", "in_progress", "pending"]);
export type Status = z.infer<typeof statusSchema>;

/** Phase lifecycle stages, in GSD's order; each one is a file in the phase folder. */
export const BADGES = ["discussed", "researched", "ui_spec", "planned", "executed", "verified", "uat"] as const;
export const badgeSchema = z.enum(BADGES);
export type Badge = z.infer<typeof badgeSchema>;

export const planSchema = z.object({
  /** `01-04` for `01-04-PLAN.md`. */
  id: z.string(),
  title: z.string(),
  status: statusSchema,
  wave: z.number().nullable(),
  /** The plan STATE.md names as the current one. */
  active: z.boolean(),
});
export type Plan = z.infer<typeof planSchema>;

export const phaseSchema = z.object({
  /** Normalized phase number: `1`, `2.1`. */
  number: z.string(),
  name: z.string(),
  /** Folder under `.planning/phases/`; null for a ROADMAP.md phase that has no folder yet. */
  directory: z.string().nullable(),
  status: statusSchema,
  /** The phase STATE.md names as the current one. */
  active: z.boolean(),
  badges: z.array(badgeSchema),
  plans: z.array(planSchema),
});
export type Phase = z.infer<typeof phaseSchema>;

export const quickTaskSchema = z.object({
  /** Folder name under `.planning/quick/`. */
  id: z.string(),
  title: z.string(),
  /** `2026-03-25`, from the folder's `YYMMDD` prefix. */
  date: z.string(),
  status: statusSchema,
});
export type QuickTask = z.infer<typeof quickTaskSchema>;

export const milestoneSchema = z.object({
  version: z.string(),
  phaseCount: z.number(),
  /** Shipped date from MILESTONES.md. */
  shipped: z.string().nullable(),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const projectSchema = z.object({
  name: z.string(),
  milestone: z.string().nullable(),
  /** STATE.md `status`, for example `executing`. */
  status: z.string().nullable(),
  stoppedAt: z.string().nullable(),
  lastActivity: z.string().nullable(),
  /** The next step GSD suggests in `state.json`. */
  next: z.object({ command: z.string(), label: z.string().nullable(), reason: z.string().nullable() }).nullable(),
  modelProfile: z.string().nullable(),
  phases: z.array(phaseSchema),
  quickTasks: z.array(quickTaskSchema),
  milestones: z.array(milestoneSchema),
});
export type Project = z.infer<typeof projectSchema>;

export const getProject = defineRpc({
  name: "gsd-watch.project",
  input: z.object({ directory: z.string().min(1) }),
  output: z.discriminatedUnion("found", [
    z.object({ found: z.literal(false), planningDirectory: z.string() }),
    z.object({ found: z.literal(true), planningDirectory: z.string(), project: projectSchema }),
  ]),
});
export type ProjectResult = z.infer<typeof getProject.output>;
