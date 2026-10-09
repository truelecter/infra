// `set_title`: renames the Paseo agent this OMP process runs as, and the OMP
// session with it. The retitle guidance lives in the tool description, so it
// reaches every request (including turns an extension starts) without any
// system prompt or message injection.

import type { CliResult } from "./paseo-cli.ts";

export const SET_TITLE_TOOL = "set_title";

/** Paseo cuts generated titles to this length; longer titles are rejected, not cut. */
export const MAX_TITLE_LENGTH = 60;

export function setTitleDescription(agentId: string): string {
  return [
    `Rename yourself: sets your Paseo agent title and this session's name. At most ${MAX_TITLE_LENGTH} characters, naming the current work.`,
    "At the start of each user turn, before other work, call it when the request moves the conversation's focus away from your current title. Not for small detours.",
    `Paseo names a new agent after the first line of its first prompt, cut to ${MAX_TITLE_LENGTH} characters; for a slash command that is the bare command, such as \`/gsd-execute-phase 8\`, though you see its expanded instructions. Such a title names no work, and the focus check never replaces it. So on your first turn, unless the first prompt opened with a plain description of the work, call it in your first batch of tool calls with a title from what you know so far, such as \`GSD execute phase 8 (billing-api)\` with the project folder's name, and once more when your reads show what the work is about, such as \`GSD execute phase 8: auth token refresh\`.`,
    `Your Paseo agent id is \`${agentId}\` (not \`self\`): pass it as \`agentId\` to other Paseo tools that act on yourself, such as \`get_agent_status\`.`,
  ].join("\n");
}

export const TITLE_PARAMETER_DESCRIPTION = `New title, at most ${MAX_TITLE_LENGTH} characters.`;

export type TitleCheck = { ok: true; title: string } | { ok: false; error: string };

/** Trims the title and collapses whitespace runs (newlines included) to single spaces. */
export function normalizeTitle(raw: string): TitleCheck {
  const title = raw.replace(/\s+/g, " ").trim();
  if (!title) return { ok: false, error: "Title is empty. Pass a short title naming the current work." };
  // Count code points, as Paseo's own cut does, not UTF-16 units.
  const length = [...title].length;
  if (length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Title is ${length} characters, the limit is ${MAX_TITLE_LENGTH}. Shorten it and call ${SET_TITLE_TOOL} again.`,
    };
  }
  return { ok: true, title };
}

/**
 * OMP binds every extension to each subagent session too, with the same
 * environment, so a subagent would rename its parent's Paseo agent. Subagents
 * never get the main-only tools (`set_title`, and the browser switch, which has
 * nothing to switch there: subagents get no Paseo host tools).
 */
export function toolsForAgent(
  kind: "main" | "sub",
  active: readonly string[],
  mainOnly: readonly string[],
): string[] | null {
  if (kind === "main" || !active.some((name) => mainOnly.includes(name))) return null;
  return active.filter((name) => !mainOnly.includes(name));
}

export interface SetTitleDeps {
  agentId: string;
  agentKind: "main" | "sub";
  runCli(args: string[]): Promise<CliResult>;
  setSessionName(title: string): Promise<void>;
}

export interface SetTitleResult {
  text: string;
  isError: boolean;
}

export async function setTitle(rawTitle: unknown, deps: SetTitleDeps): Promise<SetTitleResult> {
  if (deps.agentKind !== "main") {
    return { text: `${SET_TITLE_TOOL} is for the top-level agent only; a subagent must not rename it.`, isError: true };
  }
  const check = normalizeTitle(typeof rawTitle === "string" ? rawTitle : "");
  if (!check.ok) return { text: check.error, isError: true };
  const { title } = check;

  const result = await deps.runCli(["agent", "update", deps.agentId, "--name", title, "--json"]);
  if (!result.ok) return { text: `Paseo rename failed: ${result.error}`, isError: true };

  try {
    await deps.setSessionName(title);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { text: `Renamed to "${title}" in Paseo; the session name was not updated: ${reason}`, isError: false };
  }
  return { text: `Renamed to "${title}"`, isError: false };
}
