// A workspace takes its agent's title when the agent is the workspace's only
// top-level agent, so a single-agent workspace reads like its conversation.
//
// Paseo has no "agent renamed" event, and the title in lifecycle hook events is
// the one the agent was created with (setTitle only updates the stored record).
// So titles come from the agent directory, compared across turn boundaries.

/** The fields of a Paseo agent snapshot used here. */
export interface AgentInfo {
  id: string;
  workspaceId?: string;
  title: string | null;
  labels: Record<string, string>;
  archivedAt?: string | null;
}

/** Paseo marks subagents with this label (`@getpaseo/protocol/agent-labels`). */
export const PARENT_AGENT_ID_LABEL = "paseo.parent-agent-id";

/**
 * The workspace whose only top-level agent is `agentId`, or null. Subagents and
 * archived agents don't count; terminals are not agents, so they never do.
 */
export function soleAgentWorkspace(
  agents: readonly AgentInfo[],
  agentId: string,
): string | null {
  const workspaceId = agents.find((agent) => agent.id === agentId)?.workspaceId;
  if (!workspaceId) return null;
  const topLevel = agents.filter(
    (agent) =>
      agent.workspaceId === workspaceId &&
      !agent.archivedAt &&
      !agent.labels[PARENT_AGENT_ID_LABEL],
  );
  return topLevel.length > 0 && topLevel.every((agent) => agent.id === agentId)
    ? workspaceId
    : null;
}

/**
 * Last seen title per agent. A change counts only against a title seen earlier,
 * so the plugin never overwrites a workspace title the user set, unless the
 * agent's own title changed afterwards.
 */
export class TitleTracker {
  #titles = new Map<string, string | null>();

  /** Turn start: remembers the title as a baseline if none is known yet. */
  started(agentId: string, title: string | null): void {
    if (!this.#titles.has(agentId)) this.#titles.set(agentId, title);
  }

  /** Turn end: the new title if it differs from the last one seen, else null. */
  ended(agentId: string, title: string | null): string | null {
    const known = this.#titles.has(agentId);
    const previous = this.#titles.get(agentId);
    this.#titles.set(agentId, title);
    return known && title && title !== previous ? title : null;
  }

  forget(agentId: string): void {
    this.#titles.delete(agentId);
  }
}
