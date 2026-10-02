export const LEVELS = [
  "lite",
  "full",
  "ultra",
  "wenyan-lite",
  "wenyan-full",
  "wenyan-ultra",
] as const;

export type Level = (typeof LEVELS)[number];
export type Mode = Level | "off";

export const DEFAULT_LEVEL: Level = "full";

const ALIASES: Record<string, Mode> = {
  wenyan: "wenyan-full",
  stop: "off",
  disable: "off",
  normal: "off",
};

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function isMode(value: unknown): value is Mode {
  return value === "off" || isLevel(value);
}

/** Parses a `/caveman` argument. Returns null for anything unrecognised. */
export function parseModeArg(arg: string): Mode | null {
  const value = arg.trim().toLowerCase();
  if (isMode(value)) return value;
  return ALIASES[value] ?? null;
}

/**
 * Natural-language toggles, matching the caveman skill: "stop caveman" or
 * "normal mode" turns it off, "talk like caveman" or "caveman mode" turns it
 * on at `level`. Deactivation is checked first so "stop talking like caveman"
 * does not activate. Slash commands are left to the registered command.
 */
export function detectToggle(text: string, level: Level): Mode | null {
  const prompt = text.trim().toLowerCase();
  if (!prompt || prompt.startsWith("/")) return null;
  if (
    /\b(stop|disable|deactivate|turn off)\b.*\bcaveman\b/.test(prompt) ||
    /\bcaveman\b.*\b(stop|disable|deactivate|turn off)\b/.test(prompt) ||
    /\bnormal mode\b/.test(prompt)
  ) {
    return "off";
  }
  if (
    /\b(activate|enable|turn on|start|talk like)\b.*\bcaveman\b/.test(prompt) ||
    /\bcaveman\b.*\b(mode|activate|enable|turn on|start)\b/.test(prompt)
  ) {
    return level;
  }
  return null;
}

const INTENSITY: Record<Level, string> = {
  lite: "No filler or hedging. Keep articles and full sentences. Professional but tight.",
  full: "Drop articles, fragments OK, short synonyms. Classic caveman.",
  ultra:
    "Abbreviate prose words (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y), one word when one word enough. Never abbreviate code symbols, function names, API names, or error strings.",
  "wenyan-lite":
    "Semi-classical Chinese. Drop filler and hedging but keep grammar structure, classical register.",
  "wenyan-full":
    "Maximum classical terseness. Fully 文言文. Classical sentence patterns, verbs precede objects, subjects often omitted, classical particles (之/乃/為/其).",
  "wenyan-ultra":
    "Extreme abbreviation while keeping classical Chinese feel. Maximum compression.",
};

const HEADING = "# Caveman mode";

export function buildPrompt(level: Level): string {
  return `${HEADING} (${level})

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, hedging.
- Fragments OK. Short synonyms. Technical terms exact. Code blocks unchanged. Errors quoted exact.
- Pattern: [thing] [action] [reason]. [next step].
- Intensity ${level}: ${INTENSITY[level]}

Active every response, even when unsure. No drift back to verbose prose.

Auto-Clarity: write normal for security warnings, irreversible action confirmations, multi-step sequences where terse order could be misread, and when the user is confused or repeats a question. Resume caveman after.

Boundaries: code, commits, and PRs written normal. User switches level with \`/caveman <level>\` and turns it off with \`/caveman off\`, "stop caveman", or "normal mode".`;
}

/** Custom message type of the section when it has to travel as a message. */
export const SECTION_MESSAGE_TYPE = "caveman-mode";

/** The fields of an OMP agent message read here. */
export interface ContextMessage {
  role: string;
  customType?: string;
}

/**
 * Whether a model request lacks the caveman section. OMP runs a turn that an
 * extension starts (for example a GSD `/gsd-*` command) without
 * `before_agent_start`, so a session opened that way has none in its system
 * prompt. A section for another level counts: the next prompted turn swaps it.
 */
export function needsSection(
  mode: Mode,
  messages: readonly ContextMessage[],
  systemPrompt: readonly string[],
): boolean {
  if (mode === "off") return false;
  if (systemPrompt.some((part) => part.startsWith(HEADING))) return false;
  return !messages.some((m) => m.role === "custom" && m.customType === SECTION_MESSAGE_TYPE);
}
