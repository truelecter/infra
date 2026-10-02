import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentMessage, ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { getAgentDir } from "@oh-my-pi/pi-utils";
import {
  DEFAULT_LEVEL,
  LEVELS,
  type Level,
  type Mode,
  buildPrompt,
  detectToggle,
  isLevel,
  isMode,
  needsSection,
  parseModeArg,
  SECTION_MESSAGE_TYPE,
} from "./shared/modes.ts";

// Session entries record every mode change, so resuming, branching, or
// navigating the tree restores the mode that was active at that point.
const ENTRY_TYPE = "agentic-stuff.caveman";

export default function caveman(pi: ExtensionAPI): void {
  const configPath = join(getAgentDir(), "caveman.json");

  let defaultMode: Mode = DEFAULT_LEVEL;
  let lastLevel: Level = DEFAULT_LEVEL;
  let mode: Mode = DEFAULT_LEVEL;
  let loaded: Promise<void> | null = null;
  let saving: Promise<void> = Promise.resolve();

  // The last mode chosen anywhere becomes the default for new sessions.
  function load(): Promise<void> {
    loaded ??= (async () => {
      let raw: string;
      try {
        raw = await readFile(configPath, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error(`[caveman] cannot read ${configPath}, using defaults:`, error);
        }
        return;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        const stored = (parsed as { mode?: unknown } | null)?.mode;
        if (isMode(stored)) defaultMode = stored;
        const level = (parsed as { level?: unknown } | null)?.level;
        if (isLevel(level)) lastLevel = level;
        else if (isLevel(stored)) lastLevel = stored;
      } catch (error) {
        console.error(`[caveman] ${configPath} is not valid JSON, using defaults:`, error);
      }
    })();
    return loaded;
  }

  function save(): Promise<void> {
    const snapshot = `${JSON.stringify({ mode: defaultMode, level: lastLevel }, null, 2)}\n`;
    const write = async () => {
      await mkdir(getAgentDir(), { recursive: true });
      await writeFile(configPath, snapshot, "utf8");
    };
    saving = saving.then(write, write);
    return saving;
  }

  async function apply(next: Mode, ctx: ExtensionContext): Promise<void> {
    if (isLevel(next)) lastLevel = next;
    if (next !== mode) {
      mode = next;
      pi.appendEntry(ENTRY_TYPE, { mode: next });
    }
    if (next !== defaultMode) {
      defaultMode = next;
      try {
        await save();
      } catch (error) {
        ctx.ui.notify(`Caveman default not saved: ${error}`, "error");
      }
    }
    ctx.ui.notify(next === "off" ? "Caveman off." : `Caveman ${next}.`, "info");
  }

  async function restore(ctx: ExtensionContext): Promise<boolean> {
    await load();
    let restored: Mode | null = null;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "custom" || entry.customType !== ENTRY_TYPE) continue;
      const value = (entry.data as { mode?: unknown } | null)?.mode;
      if (isMode(value)) restored = value;
    }
    mode = restored ?? defaultMode;
    if (isLevel(mode)) lastLevel = mode;
    return restored !== null;
  }

  async function start(ctx: ExtensionContext): Promise<void> {
    if (!(await restore(ctx))) pi.appendEntry(ENTRY_TYPE, { mode });
  }

  pi.on("session_start", async (_event, ctx) => start(ctx));
  pi.on("session_switch", async (_event, ctx) => start(ctx));
  pi.on("session_branch", async (_event, ctx) => {
    await restore(ctx);
  });
  pi.on("session_tree", async (_event, ctx) => {
    await restore(ctx);
  });

  pi.registerCommand("caveman", {
    description: "Toggle caveman mode, or set a level: lite, full, ultra, wenyan-*, off",
    getArgumentCompletions: (prefix: string) => {
      const typed = prefix.trim().toLowerCase();
      const items = [...LEVELS, "off"]
        .filter((value) => value.startsWith(typed))
        .map((value) => ({ value, label: value }));
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      await load();
      const arg = args?.trim() ?? "";
      if (!arg) {
        await apply(mode === "off" ? lastLevel : "off", ctx);
        return;
      }
      const next = parseModeArg(arg);
      if (!next) {
        ctx.ui.notify(`Unknown caveman level "${arg}". Use: ${LEVELS.join(", ")}, off`, "error");
        return;
      }
      await apply(next, ctx);
    },
  });

  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") return;
    await load();
    const next = detectToggle(event.text, lastLevel);
    if (next && next !== mode) await apply(next, ctx);
  });

  pi.on("before_agent_start", async (event) => {
    await load();
    if (mode === "off") return;
    return { systemPrompt: [...event.systemPrompt, buildPrompt(mode)] };
  });

  // Turns an extension starts skip before_agent_start; give those requests the
  // section as a hidden message in front, where it keeps the cached prefix stable.
  // A fresh object per request: OMP tags context messages with history indexes.
  pi.on("context", async (event, ctx) => {
    await load();
    if (mode === "off" || !needsSection(mode, event.messages, ctx.getSystemPrompt())) return;
    const message: AgentMessage = {
      role: "custom",
      customType: SECTION_MESSAGE_TYPE,
      content: buildPrompt(mode),
      display: false,
      attribution: "agent",
      timestamp: 0,
    };
    return { messages: [message, ...event.messages] };
  });
}
