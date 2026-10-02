// Paseo starts each agent process with PASEO_AGENT_ID set to that agent's id,
// but nothing puts the id in front of the model. Paseo tools that act on the
// caller (update_agent, get_agent_status, ...) need it as `agentId`.

const AGENT_ID = /^[A-Za-z0-9-]{1,128}$/;

/** The system prompt section naming the agent's own id, or null outside Paseo. */
export function buildPrompt(agentId: string | undefined): string | null {
  const id = agentId?.trim();
  if (!id || !AGENT_ID.test(id)) return null;
  return [
    "# Paseo agent id",
    `You run as Paseo agent \`${id}\`. When a Paseo tool acts on yourself (for example \`update_agent\` to retitle, or \`get_agent_status\`), pass this value as \`agentId\`. It is not \`self\`.`,
    "At the start of each user turn, before other work, check whether the request moves the conversation's focus away from your current title; if it does, call `update_agent` on yourself with the new title first.",
    "Paseo names a new agent after the first line of its first prompt, cut to 60 characters. For a slash command that is the bare command, such as `/gsd-execute-phase 8`, even though you see the instructions it expands to instead. Such a title names no work, and the focus check above never replaces it, because the work keeps matching the command. So on your first turn, unless the first prompt opened with a plain description of the work, call `update_agent` on yourself in your first batch of tool calls, with a title from what you know so far, such as `GSD execute phase 8 (billing-api)` with the project folder's name. Once your reads show what the work is about (for example the phase name in the roadmap), retitle once more to name it, such as `GSD execute phase 8: auth token refresh`.",
  ].join("\n");
}

/** Custom message type of the section when it has to travel as a message. */
export const SECTION_MESSAGE_TYPE = "paseo-agent-id";

/** The fields of an OMP agent message read here. */
export interface ContextMessage {
  role: string;
  customType?: string;
}

/**
 * Whether a model request lacks the section. OMP runs a turn that an extension
 * starts (for example a GSD `/gsd-*` command) without `before_agent_start`, so
 * a session opened that way has no section in its system prompt.
 */
export function needsSection(
  messages: readonly ContextMessage[],
  systemPrompt: readonly string[],
  section: string,
): boolean {
  if (systemPrompt.includes(section)) return false;
  return !messages.some((m) => m.role === "custom" && m.customType === SECTION_MESSAGE_TYPE);
}
