// Reads a GSD `.planning/` folder into the panel's model. Every reader is best effort: a missing or
// malformed file leaves its fields empty instead of failing the whole read.
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import {
  BADGES,
  type Badge,
  type Milestone,
  type Phase,
  type Plan,
  type Project,
  type QuickTask,
  type Status,
} from "../shared/gsd.ts";

const NUMBER = String.raw`\d+(?:\.\d+)*`;
const PHASE_DIR = new RegExp(`^(${NUMBER})-(.+)$`);
const PLAN_FILE = new RegExp(`^(${NUMBER})-(\\d+)-PLAN\\.md$`);
const SUMMARY_FILE = new RegExp(`^(${NUMBER})-(\\d+)-SUMMARY\\.md$`);
const QUICK_DIR = /^(\d{2})(\d{2})(\d{2})-(\w+)-(.+)$/;
const MILESTONE_DIR = /^(v\d+(?:\.\d+)*)-phases$/;

/** Lifecycle badges found by file name suffix; `planned` and `executed` come from the plans. */
const BADGE_FILES: [Badge, RegExp][] = [
  ["discussed", /-CONTEXT\.md$/],
  ["researched", /-RESEARCH\.md$/],
  ["ui_spec", /-UI-SPEC\.md$/],
  ["verified", /-VERIFICATION\.md$/],
  ["uat", /-(HUMAN-)?UAT\.md$/],
];

/** `01` -> `1`, `02.1` -> `2.1`, so folder, ROADMAP.md, and STATE.md numbers compare equal. */
export function normalizeNumber(value: string): string {
  return value
    .split(".")
    .map((part) => String(Number.parseInt(part, 10)))
    .join(".");
}

export function compareNumbers(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? -1) - (right[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    (trimmed[0] === '"' || trimmed[0] === "'") &&
    trimmed.at(-1) === trimmed[0]
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Top-level scalar keys of a `---` YAML front matter block, and the text after it. */
export function splitFrontmatter(content: string): {
  fields: Record<string, string>;
  body: string;
} {
  const text = content.replace(/^\uFEFF/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) return { fields: {}, body: text };
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    if (field && field[2].trim() !== "" && !(field[1] in fields))
      fields[field[1]] = unquote(field[2]);
  }
  return { fields, body: text.slice(match[0].length) };
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface StateInfo {
  status: string | null;
  stoppedAt: string | null;
  lastActivity: string | null;
  milestone: string | null;
  activePhase: string | null;
  activePlan: number | null;
}

export function parseState(content: string): StateInfo {
  const { fields, body } = splitFrontmatter(content);
  const phase =
    new RegExp(`^Phase:\\s+(${NUMBER})`, "m").exec(body)?.[1] ??
    nonEmpty(fields.current_phase);
  const plan = /^Plan:\s+(\d+)/m.exec(body)?.[1];
  return {
    status: nonEmpty(fields.status),
    stoppedAt: nonEmpty(fields.stopped_at),
    lastActivity:
      nonEmpty(fields.last_activity_desc) ?? nonEmpty(fields.last_activity),
    milestone: nonEmpty(fields.milestone_name) ?? nonEmpty(fields.milestone),
    activePhase: phase && /^\d/.test(phase) ? normalizeNumber(phase) : null,
    activePlan: plan ? Number.parseInt(plan, 10) : null,
  };
}

export interface RoadmapInfo {
  /** Phase number -> name, from `## Phase N: Name` headings. */
  names: Map<string, string>;
  /** Phases ticked in the roadmap's checklist (`- [x] **Phase N: ...`). */
  completedPhases: Set<string>;
  /** `1-4` -> title and tick, from `- [x] 01-04-PLAN.md — Title` lines. */
  plans: Map<string, { title: string; done: boolean }>;
}

export function planKey(phase: string, plan: number): string {
  return `${normalizeNumber(phase)}-${plan}`;
}

export function parseRoadmap(content: string): RoadmapInfo {
  const names = new Map<string, string>();
  const completedPhases = new Set<string>();
  const plans = new Map<string, { title: string; done: boolean }>();
  for (const line of content.split(/\r?\n/)) {
    const heading = new RegExp(
      `^#{2,4}\\s+Phase\\s+(${NUMBER}):\\s*(.+?)\\s*$`,
    ).exec(line);
    if (heading) {
      const number = normalizeNumber(heading[1]);
      if (!names.has(number)) names.set(number, cleanMarkdown(heading[2]));
      continue;
    }
    const phaseItem = new RegExp(
      `^\\s*[-*]\\s+\\[([ xX])\\]\\s+\\**Phase\\s+(${NUMBER})\\b`,
    ).exec(line);
    if (phaseItem) {
      if (phaseItem[1] !== " ")
        completedPhases.add(normalizeNumber(phaseItem[2]));
      continue;
    }
    const planItem = new RegExp(
      `^\\s*[-*]\\s+\\[([ xX])\\]\\s+\\**(${NUMBER})-(\\d+)-PLAN\\.md\\**\\s*(?:[-:\u2013\u2014]+\\s*(.*))?$`,
    ).exec(line);
    if (planItem) {
      // The roadmap appends the wave in parentheses; the panel shows the wave on its own.
      const title = cleanMarkdown(
        (planItem[4] ?? "").replace(/\s*\(wave\b[^)]*\)\s*$/i, ""),
      );
      plans.set(planKey(planItem[2], Number.parseInt(planItem[3], 10)), {
        title,
        done: planItem[1] !== " ",
      });
    }
  }
  return { names, completedPhases, plans };
}

/** First prose line inside `<objective>`, skipping headings and blank lines. */
export function objectiveLine(content: string): string | null {
  const match = /<objective>([\s\S]*?)(?:<\/objective>|$)/.exec(content);
  if (!match) return null;
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    return firstSentence(trimmed.replace(/^[-*]\s+/, ""));
  }
  return null;
}

function firstSentence(value: string): string {
  const text = cleanMarkdown(value);
  const end = text.indexOf(". ");
  const sentence = end > 0 ? text.slice(0, end + 1) : text;
  return sentence.length > 200 ? `${sentence.slice(0, 199)}\u2026` : sentence;
}

/** `**One-liner:** text` in a SUMMARY.md. */
export function oneLiner(content: string): string | null {
  const match = /^\s*\*\*One-liner:?\*\*:?\s*(.+)$/m.exec(content);
  return match ? firstSentence(match[1]) : null;
}

export function planStatus(
  frontmatterStatus: string | undefined,
  hasSummary: boolean,
  roadmapDone: boolean,
): Status {
  if (hasSummary || roadmapDone) return "complete";
  const value = frontmatterStatus?.toLowerCase();
  if (value === "complete" || value === "completed" || value === "done")
    return "complete";
  if (
    value === "in_progress" ||
    value === "in-progress" ||
    value === "executing" ||
    value === "active"
  )
    return "in_progress";
  return "pending";
}

export function phaseStatus(
  plans: Plan[],
  roadmapDone: boolean,
  active: boolean,
): Status {
  if (
    roadmapDone ||
    (plans.length > 0 && plans.every((plan) => plan.status === "complete"))
  )
    return "complete";
  if (active || plans.some((plan) => plan.status !== "pending"))
    return "in_progress";
  return "pending";
}

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function listDir(
  path: string,
): Promise<{ name: string; directory: boolean }[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries
      .map((entry) => ({ name: entry.name, directory: entry.isDirectory() }))
      .sort((a, b) => (a.name < b.name ? -1 : 1));
  } catch {
    return [];
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function readPhase(
  phasesDir: string,
  directory: string,
  number: string,
  slug: string,
  roadmap: RoadmapInfo,
  state: StateInfo,
): Promise<Phase> {
  const files = (await listDir(join(phasesDir, directory)))
    .filter((entry) => !entry.directory)
    .map((entry) => entry.name);
  const summaries = new Set(
    files.flatMap((file) => {
      const match = SUMMARY_FILE.exec(file);
      return match ? [planKey(match[1], Number.parseInt(match[2], 10))] : [];
    }),
  );
  const active = state.activePhase === number;
  const plans: Plan[] = [];
  for (const file of files) {
    const match = PLAN_FILE.exec(file);
    if (!match) continue;
    const planNumber = Number.parseInt(match[2], 10);
    const key = planKey(match[1], planNumber);
    const content = (await readText(join(phasesDir, directory, file))) ?? "";
    const { fields } = splitFrontmatter(content);
    const fromRoadmap = roadmap.plans.get(key);
    const status = planStatus(
      fields.status,
      summaries.has(key),
      fromRoadmap?.done ?? false,
    );
    const wave = Number.parseInt(fields.wave ?? "", 10);
    plans.push({
      id: file.slice(0, -"-PLAN.md".length),
      title:
        nonEmpty(fromRoadmap?.title) ??
        objectiveLine(content) ??
        file.slice(0, -".md".length),
      status,
      wave: Number.isFinite(wave) ? wave : null,
      active:
        active && state.activePlan === planNumber && status !== "complete",
    });
  }
  const badges = new Set<Badge>();
  for (const file of files) {
    for (const [badge, pattern] of BADGE_FILES)
      if (pattern.test(file)) badges.add(badge);
  }
  if (plans.length > 0) badges.add("planned");
  if (summaries.size > 0) badges.add("executed");
  return {
    number,
    name: roadmap.names.get(number) ?? slug.replace(/-/g, " "),
    directory,
    status: phaseStatus(plans, roadmap.completedPhases.has(number), active),
    active,
    badges: BADGES.filter((badge) => badges.has(badge)),
    plans,
  };
}

async function readPhases(
  planning: string,
  roadmap: RoadmapInfo,
  state: StateInfo,
): Promise<Phase[]> {
  const phasesDir = join(planning, "phases");
  const phases = new Map<string, Phase>();
  for (const entry of await listDir(phasesDir)) {
    const match = entry.directory ? PHASE_DIR.exec(entry.name) : null;
    if (!match) continue;
    const number = normalizeNumber(match[1]);
    if (phases.has(number)) continue;
    phases.set(
      number,
      await readPhase(phasesDir, entry.name, number, match[2], roadmap, state),
    );
  }
  for (const [number, name] of roadmap.names) {
    if (phases.has(number)) continue;
    const active = state.activePhase === number;
    phases.set(number, {
      number,
      name,
      directory: null,
      status: phaseStatus([], roadmap.completedPhases.has(number), active),
      active,
      badges: [],
      plans: [],
    });
  }
  return [...phases.values()].sort((a, b) =>
    compareNumbers(a.number, b.number),
  );
}

async function readQuickTasks(planning: string): Promise<QuickTask[]> {
  const quickDir = join(planning, "quick");
  const tasks: QuickTask[] = [];
  for (const entry of await listDir(quickDir)) {
    const match = entry.directory ? QUICK_DIR.exec(entry.name) : null;
    if (!match) continue;
    const [, yy, mm, dd, id, slug] = match;
    const base = `${yy}${mm}${dd}-${id}`;
    const plan = await readText(join(quickDir, entry.name, `${base}-PLAN.md`));
    const summary = await readText(
      join(quickDir, entry.name, `${base}-SUMMARY.md`),
    );
    tasks.push({
      id: entry.name,
      title:
        (plan && objectiveLine(plan)) ??
        (summary && oneLiner(summary)) ??
        slug.replace(/-/g, " "),
      date: `20${yy}-${mm}-${dd}`,
      status:
        summary !== null
          ? "complete"
          : plan !== null
            ? "in_progress"
            : "pending",
    });
  }
  // Newest first; the folder name sorts by date, then by GSD's id within a day.
  return tasks.sort((a, b) => (a.id < b.id ? 1 : -1));
}

export function shippedDate(
  milestones: string,
  version: string,
): string | null {
  const escaped = version.replace(/\./g, "\\.");
  return (
    new RegExp(
      `^#{2,3}\\s+${escaped}\\b[^\\n]*\\(Shipped:?\\s*(\\d{4}-\\d{2}-\\d{2})\\)`,
      "m",
    ).exec(milestones)?.[1] ?? null
  );
}

async function readMilestones(planning: string): Promise<Milestone[]> {
  const milestonesDir = join(planning, "milestones");
  const shippedText = (await readText(join(planning, "MILESTONES.md"))) ?? "";
  const milestones: Milestone[] = [];
  for (const entry of await listDir(milestonesDir)) {
    const match = entry.directory ? MILESTONE_DIR.exec(entry.name) : null;
    if (!match) continue;
    const phaseCount = (await listDir(join(milestonesDir, entry.name))).filter(
      (child) => child.directory,
    ).length;
    milestones.push({
      version: match[1],
      phaseCount,
      shipped: shippedDate(shippedText, match[1]),
    });
  }
  return milestones.sort(
    (a, b) => -compareNumbers(a.version.slice(1), b.version.slice(1)),
  );
}

// Only the fields the panel shows; GSD writes many more, and older versions none of these.
const stateJsonSchema = z.object({
  next: z
    .object({
      command: z.string(),
      label: z.string().nullish(),
      reason: z.string().nullish(),
    })
    .nullish(),
});
const configJsonSchema = z.object({ model_profile: z.string().nullish() });

function parseJson<T>(content: string | null, schema: z.ZodType<T>): T | null {
  if (!content) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Reads `<projectDirectory>/.planning`; the caller checks that the folder exists. */
export async function readProject(projectDirectory: string): Promise<Project> {
  const planning = join(projectDirectory, ".planning");
  const [projectText, stateText, roadmapText, stateJson, configJson] =
    await Promise.all([
      readText(join(planning, "PROJECT.md")),
      readText(join(planning, "STATE.md")),
      readText(join(planning, "ROADMAP.md")),
      readText(join(planning, "state.json")),
      readText(join(planning, "config.json")),
    ]);
  const state = parseState(stateText ?? "");
  const roadmap = parseRoadmap(roadmapText ?? "");
  const heading = projectText
    ? /^#\s+(.+?)\s*$/m.exec(projectText)?.[1]
    : undefined;
  const next = parseJson(stateJson, stateJsonSchema)?.next;
  const [phases, quickTasks, milestones] = await Promise.all([
    readPhases(planning, roadmap, state),
    readQuickTasks(planning),
    readMilestones(planning),
  ]);
  return {
    name: heading ? cleanMarkdown(heading) : basename(projectDirectory),
    milestone: state.milestone,
    status: state.status,
    stoppedAt: state.stoppedAt,
    lastActivity: state.lastActivity,
    next:
      next && next.command.trim() !== ""
        ? {
            command: next.command.trim(),
            label: nonEmpty(next.label),
            reason: nonEmpty(next.reason),
          }
        : null,
    modelProfile: nonEmpty(
      parseJson(configJson, configJsonSchema)?.model_profile,
    ),
    phases,
    quickTasks,
    milestones,
  };
}
