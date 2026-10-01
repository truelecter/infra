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
  ].join("\n");
}
