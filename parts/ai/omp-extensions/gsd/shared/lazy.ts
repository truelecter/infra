// Pure logic of the lazy GSD entry: project detection, GSD names from the package, the hidden
// setting values, and the "skills are back" check. File system access is passed in.
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

/** Skill glob added to `skills.ignoredSkills` while GSD is hidden. */
export const GSD_SKILL_GLOB = "gsd-*";

/** Tools GSD registers that stay unregistered while GSD is hidden. */
export const DEFERRED_TOOLS: Readonly<Record<string, true>> = { gsd_invoke: true };

export interface ProjectFs {
  isDirectory(path: string): boolean;
  exists(path: string): boolean;
}

/**
 * The nearest `.planning/` directory from `cwd` upwards, stopping at the git root (the first
 * directory holding `.git`, a directory or a worktree file) or the filesystem root.
 */
export function findPlanningDir(cwd: string, fs: ProjectFs): string | undefined {
  let dir = cwd;
  for (;;) {
    const planning = join(dir, ".planning");
    if (fs.isDirectory(planning)) return planning;
    if (fs.exists(join(dir, ".git"))) return undefined;
    const parent = join(dir, "..");
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** `name:` from a Markdown file's front matter, unquoted, or undefined. */
export function frontMatterName(markdown: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return undefined;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") return undefined;
    const match = /^name:\s*(.+?)\s*$/.exec(line);
    if (match) return match[1].replace(/^(["'])(.*)\1$/, "$2") || undefined;
  }
  return undefined;
}

/** Agent names of GSD's `agents/` files (`x.md` and `x.compact.md` both define `x`), sorted, unique. */
export function agentNames(files: readonly { file: string; content: string }[]): string[] {
  const names = new Set<string>();
  for (const { file, content } of files) {
    if (!file.endsWith(".md")) continue;
    names.add(frontMatterName(content) ?? file.replace(/(\.compact)?\.md$/, ""));
  }
  return [...names].sort();
}

/** `list` followed by the entries of `extra` it lacks. */
export function withAdded(list: readonly string[], extra: readonly string[]): string[] {
  const out = [...list];
  for (const entry of extra) if (!out.includes(entry)) out.push(entry);
  return out;
}

/** Skill names that the user's own `skills.ignoredSkills` patterns leave visible. */
export function visibleSkills(
  names: readonly string[],
  ignored: readonly string[],
  matches: (pattern: string, name: string) => boolean,
): string[] {
  return names.filter((name) => !ignored.some((pattern) => matches(pattern, name)));
}

/** How often any of `names` occurs in `text` as a whole name (not as a prefix of a longer one). */
export function countMentions(text: string, names: readonly string[]): number {
  let count = 0;
  for (const name of names) {
    if (!name) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    count += text.match(new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "g"))?.length ?? 0;
  }
  return count;
}

export interface ReloadBaseline {
  /** GSD skills expected back (package skills minus the user's own ignores). */
  expected: readonly string[];
  /** Mentions of `expected` in the system prompt before the overrides were cleared. */
  promptMentions: number;
  /** Whether the system prompt listed any active skill before (skills are rendered at all). */
  promptListsSkills: boolean;
}

/**
 * Whether OMP finished reloading skills after the overrides were cleared: the active skills hold
 * a GSD skill, and, when the prompt renders skills, the rebuilt prompt mentions GSD skills more
 * often than before.
 */
export function skillsReloaded(baseline: ReloadBaseline, activeSkills: readonly string[], prompt: string): boolean {
  if (baseline.expected.length === 0) return true;
  if (!baseline.expected.some((name) => activeSkills.includes(name))) return false;
  if (!baseline.promptListsSkills) return true;
  return countMentions(prompt, baseline.expected) > baseline.promptMentions;
}

/** Polls `done` every `intervalMs` until it holds (true) or `timeoutMs` passes (false). */
export async function waitFor(
  done: () => boolean,
  timeoutMs: number,
  intervalMs: number,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<unknown> = delay,
): Promise<boolean> {
  const deadline = now() + timeoutMs;
  for (;;) {
    if (done()) return true;
    if (now() >= deadline) return false;
    await sleep(intervalMs);
  }
}
