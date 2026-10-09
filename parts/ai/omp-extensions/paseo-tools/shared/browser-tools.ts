// Paseo's `browser_*` host tools drive tabs inside the Paseo app. They are
// rarely needed, so the main session keeps them out of its active tool set
// until the user (`/paseo-browser`) or the model (`enable_browser_tools`)
// switches them on. The state is a session entry, so a resumed session keeps it.

export const BROWSER_TOOL_PREFIX = "browser_";
export const ENABLE_BROWSER_TOOL = "enable_browser_tools";
export const BROWSER_COMMAND = "paseo-browser";
/** `customType` of the session entry that records the state. */
export const BROWSER_STATE_ENTRY = "paseo-browser-tools";

export const ENABLE_BROWSER_DESCRIPTION =
  "Paseo browser tools (browser_*, tabs inside the Paseo app) are off by default. Call with enabled=true before you need them, and with enabled=false once the browser work is done: while on they cost about 7k tokens per request.";

export const ENABLED_PARAMETER_DESCRIPTION = "true adds the browser_* tools, false removes them.";

export const BROWSER_COMMAND_DESCRIPTION = "Paseo browser_* tools for this session: on, off, or toggle";

export interface BrowserState {
  enabled: boolean;
}

export function isBrowserTool(name: string): boolean {
  return name.startsWith(BROWSER_TOOL_PREFIX);
}

/**
 * The active tool set for the given state, or null when it already matches.
 * Off drops every active `browser_*` tool; on adds every registered one that
 * is not active.
 */
export function reconcileBrowserTools(
  active: readonly string[],
  registered: readonly string[],
  enabled: boolean,
): string[] | null {
  if (!enabled) {
    return active.some(isBrowserTool) ? active.filter((name) => !isBrowserTool(name)) : null;
  }
  const activeSet = new Set(active);
  const missing = registered.filter((name) => isBrowserTool(name) && !activeSet.has(name));
  return missing.length > 0 ? [...active, ...missing] : null;
}

interface BranchEntry {
  type: string;
  customType?: string;
  data?: unknown;
}

/** The last recorded state on the branch; a session without one starts off. */
export function restoreBrowserState(branch: readonly BranchEntry[]): boolean {
  for (let index = branch.length - 1; index >= 0; index--) {
    const entry = branch[index]!;
    if (entry.type !== "custom" || entry.customType !== BROWSER_STATE_ENTRY) continue;
    const data = entry.data as Partial<BrowserState> | undefined;
    if (typeof data?.enabled === "boolean") return data.enabled;
  }
  return false;
}

export type CommandArgument = { ok: true; enabled: boolean } | { ok: false; error: string };

/** `on`/`off` set the state, no argument toggles it. */
export function parseBrowserCommand(args: string, current: boolean): CommandArgument {
  const arg = args.trim().toLowerCase();
  if (arg === "") return { ok: true, enabled: !current };
  if (arg === "on") return { ok: true, enabled: true };
  if (arg === "off") return { ok: true, enabled: false };
  return { ok: false, error: `Usage: /${BROWSER_COMMAND} [on|off]` };
}

/** What the command and the tool report after a change. */
export function browserStateMessage(enabled: boolean, active: readonly string[]): string {
  if (!enabled) return "Paseo browser tools off.";
  const count = active.filter(isBrowserTool).length;
  if (count === 0) return "Paseo browser tools on, but Paseo has registered none in this session.";
  return `Paseo browser tools on: ${count} browser_* tools available.`;
}
