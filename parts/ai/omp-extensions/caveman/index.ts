import { readFileSync } from "node:fs";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

import {
  type ActiveMode,
  MODE_ENTRY,
  MODES,
  modeChanges,
  modesByTurn,
  parseMode,
  REMINDERS,
  withModeTexts,
  withSubagentRules,
} from "./shared/modes.ts";

const MODES_DIR = new URL("./shared/modes/", import.meta.url);
const EXCEPTIONS = readFileSync(
  new URL("exceptions.md", MODES_DIR),
  "utf8",
).trim();

function rulesFor(mode: ActiveMode): string {
  const body = readFileSync(new URL(`${mode}.md`, MODES_DIR), "utf8").trim();
  return `<system-reminder>\n${body}\n\n${EXCEPTIONS}\n</system-reminder>`;
}

const RULES: Record<ActiveMode, string> = {
  full: rulesFor("full"),
  high: rulesFor("high"),
  ultracave: rulesFor("ultracave"),
};

const USAGE = `/caveman ${MODES.filter((mode) => mode !== "off").join("|")}|off`;

// The rules travel with the user turns (OMP's `context` event, model-only, never saved to the
// session) rather than in the system prompt: a rule there loses to everything after it on
// Claude Opus 5.5, and a mode switch would have to rewrite the cached prompt.
export default function caveman(pi: ExtensionAPI): void {
  const configured = process.env.OMP_CAVEMAN_MODE;
  const initial = parseMode(configured) ?? "full";
  if (configured && !parseMode(configured)) {
    console.error(
      `[caveman] unknown OMP_CAVEMAN_MODE "${configured}"; using "full"`,
    );
  }

  pi.on("context", (event, ctx) => {
    if (ctx.agent.kind === "sub") {
      if (initial === "off") return;
      const messages = withSubagentRules(
        event.messages,
        `${RULES[initial]}\n\n${REMINDERS[initial]}`,
      );
      return messages && { messages };
    }
    const { modes } = modesByTurn(
      event.messages,
      initial,
      modeChanges(ctx.sessionManager.getBranch()),
    );
    const messages = withModeTexts(event.messages, modes, RULES);
    return messages && { messages };
  });

  pi.registerCommand("caveman", {
    description: `Caveman reply mode for this session: ${MODES.join(", ")}`,
    getArgumentCompletions: (prefix) =>
      MODES.filter((mode) => mode.startsWith(prefix.trim())).map((mode) => ({
        value: mode,
        label: mode,
      })),
    async handler(args, ctx) {
      const branch = ctx.sessionManager.getBranch();
      const history = branch.flatMap((entry) =>
        entry.type === "message" && entry.message ? [entry.message] : [],
      );
      const { current } = modesByTurn(history, initial, modeChanges(branch));
      if (!args.trim()) {
        ctx.ui.notify(
          `Caveman mode: ${current}. Switch with ${USAGE}.`,
          "info",
        );
        return;
      }
      const mode = parseMode(args);
      if (!mode) {
        ctx.ui.notify(
          `Unknown caveman mode "${args.trim()}". Use ${USAGE}.`,
          "error",
        );
        return;
      }
      if (mode !== current)
        pi.appendEntry(MODE_ENTRY, { mode, at: Date.now() });
      ctx.ui.notify(`Caveman mode: ${mode}, from the next message on.`, "info");
    },
  });
}
