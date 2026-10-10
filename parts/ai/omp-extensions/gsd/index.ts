import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Glob } from "bun";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ToolDefinition,
} from "@oh-my-pi/pi-coding-agent";
import {
  lookup,
  type Setting,
} from "@oh-my-pi/pi-coding-agent/config/registry";

import {
  agentNames,
  countMentions,
  DEFERRED_TOOLS,
  findPlanningDir,
  frontMatterName,
  GSD_SKILL_GLOB,
  skillsReloaded,
  visibleSkills,
  waitFor,
  withAdded,
} from "./shared/lazy.ts";

// Lazy entry for gsd-omp. Outside a GSD project (no `.planning/` up to the git root) it hides
// GSD's skills, agents, and `gsd_invoke` through runtime-only setting overrides, and brings them
// back on the first `/gsd-*` command. See README.md.

const RELOAD_TIMEOUT_MS = 15_000;
const RELOAD_POLL_MS = 25;

// Written by the Nix build: the gsd-omp `extension.cjs` and GSD's runtime root (this package).
const packageRoot = dirname(fileURLToPath(import.meta.url));
const runtime = JSON.parse(
  readFileSync(join(packageRoot, "gsd-runtime.json"), "utf8"),
) as {
  extension: string;
  runtimeRoot: string;
};
const gsdExtension = createRequire(import.meta.url)(runtime.extension) as (
  pi: ExtensionAPI,
  options: { runtime: "omp"; runtimeRoot: string },
) => void;

// Module state is process-wide: OMP imports an extension module once and binds its factory to the
// CLI's main session first, then again to every subagent session. The first binding decides.
let mode: "undecided" | "hidden" | "shown" = "undecided";
let overridden: Setting<string[]>[] = [];
let baseIgnoredSkills: string[] = [];
let showing: Promise<void> | undefined;
const deferredTools: { pi: ExtensionAPI; tool: ToolDefinition }[] = [];

function readNames(
  dir: string,
  read: (entry: string) => string | undefined,
): string[] {
  try {
    return readdirSync(dir).flatMap((entry) => read(entry) ?? []);
  } catch {
    return [];
  }
}

function gsdAgentNames(): string[] {
  const dir = join(runtime.runtimeRoot, "agents");
  const files = readNames(dir, (file) => file).map((file) => ({
    file,
    content: readFileSync(join(dir, file), "utf8"),
  }));
  return agentNames(files);
}

function gsdSkillNames(): string[] {
  const dir = join(runtime.runtimeRoot, "skills");
  return readNames(dir, (entry) => {
    const skill = join(dir, entry, "SKILL.md");
    return existsSync(skill)
      ? (frontMatterName(readFileSync(skill, "utf8")) ?? entry)
      : undefined;
  });
}

function hide(pi: ExtensionAPI): void {
  const ignoredSkills = lookup("skills.ignoredSkills") as
    | Setting<string[]>
    | undefined;
  const disabledAgents = lookup("task.disabledAgents") as
    | Setting<string[]>
    | undefined;
  if (!ignoredSkills || !disabledAgents) {
    pi.logger.warn(
      "gsd: skills.ignoredSkills or task.disabledAgents is unknown, GSD stays loaded",
    );
    mode = "shown";
    return;
  }
  const settings = pi.pi.settings;
  baseIgnoredSkills = ignoredSkills.get(settings);
  ignoredSkills.override(
    settings,
    withAdded(baseIgnoredSkills, [GSD_SKILL_GLOB]),
  );
  disabledAgents.override(
    settings,
    withAdded(disabledAgents.get(settings), gsdAgentNames()),
  );
  overridden = [ignoredSkills, disabledAgents];
  mode = "hidden";
}

async function show(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const expected = visibleSkills(
    gsdSkillNames(),
    baseIgnoredSkills,
    (pattern, name) => new Glob(pattern).match(name),
  );
  const promptBefore = ctx.getSystemPrompt().join("\n");
  const activeBefore = pi.pi.getActiveSkills().map((skill) => skill.name);
  const baseline = {
    expected,
    promptMentions: countMentions(promptBefore, expected),
    promptListsSkills: countMentions(promptBefore, activeBefore) > 0,
  };

  for (const setting of overridden) setting.clearOverride(pi.pi.settings);
  overridden = [];
  mode = "shown";
  for (const { pi: api, tool } of deferredTools.splice(0))
    api.registerTool(tool);

  // Clearing the overrides makes OMP rediscover skills and rebuild the prompt in the background
  // (sdk.ts `refreshSkillsAndCommands`); the command's turn must not start before that lands.
  const reloaded = await waitFor(
    () =>
      skillsReloaded(
        baseline,
        pi.pi.getActiveSkills().map((skill) => skill.name),
        ctx.getSystemPrompt().join("\n"),
      ),
    RELOAD_TIMEOUT_MS,
    RELOAD_POLL_MS,
  );
  if (!reloaded)
    ctx.ui.notify(
      "GSD: skills did not reload in time; the first turn may not list them.",
      "warning",
    );
}

export default function gsd(pi: ExtensionAPI): void {
  if (mode === "undecided") {
    const fs = {
      isDirectory: (path: string) =>
        statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false,
      exists: existsSync,
    };
    if (findPlanningDir(process.cwd(), fs)) mode = "shown";
    else hide(pi);
  }

  const lazyPi = new Proxy(pi, {
    get(target, prop, receiver) {
      if (prop === "registerCommand") {
        return (
          name: string,
          options: Parameters<ExtensionAPI["registerCommand"]>[1],
        ) =>
          target.registerCommand(name, {
            ...options,
            handler: async (args, ctx) => {
              if (mode === "hidden") await (showing ??= show(target, ctx));
              return options.handler(args, ctx);
            },
          });
      }
      if (prop === "registerTool") {
        return (tool: ToolDefinition) => {
          if (mode === "hidden" && Object.hasOwn(DEFERRED_TOOLS, tool.name))
            deferredTools.push({ pi: target, tool });
          else target.registerTool(tool);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

  gsdExtension(lazyPi, { runtime: "omp", runtimeRoot: runtime.runtimeRoot });
}
