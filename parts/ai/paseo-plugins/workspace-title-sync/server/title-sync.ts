// A workspace takes its agent's title when the agent is the workspace's only
// top-level agent, so a single-agent workspace reads like its conversation.
//
// The plugin follows Paseo's agent directory (a subscribed `agents.list`): a
// snapshot, then an `agent_update` upsert with the full agent for every change.
// `TitleSync` keeps that directory and reports which title changes rename a
// workspace.

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

export interface Rename {
  agentId: string;
  workspaceId: string;
  title: string;
}

/**
 * The workspace whose only top-level agent is `agentId`, or null. Subagents and
 * archived agents don't count; terminals are not agents, so they never do.
 */
export function soleAgentWorkspace(
  agents: Iterable<AgentInfo>,
  agentId: string,
): string | null {
  const all = [...agents];
  const workspaceId = all.find((agent) => agent.id === agentId)?.workspaceId;
  if (!workspaceId) return null;
  const topLevel = all.filter(
    (agent) =>
      agent.workspaceId === workspaceId &&
      !agent.archivedAt &&
      !agent.labels[PARENT_AGENT_ID_LABEL],
  );
  return topLevel.length > 0 && topLevel.every((agent) => agent.id === agentId)
    ? workspaceId
    : null;
}

/** A title change: against a title seen earlier, to a non-empty one. */
function retitled(before: AgentInfo | undefined, after: AgentInfo): boolean {
  return before !== undefined && !!after.title && after.title !== before.title;
}

/**
 * The agent directory as last seen. A change counts only against a title seen
 * earlier, so the first snapshot (plugin start or reload) renames nothing and a
 * workspace title the user set survives until the agent's own title changes.
 * A later snapshot (after a reconnect) is compared with the directory before
 * it, so a rename missed while disconnected still applies.
 *
 * A snapshot can span several pages: `beginSnapshot`, `addSnapshot` per page,
 * then `endSnapshot`. Renames found meanwhile wait for the whole directory, so
 * a sibling on a later page still blocks them.
 */
export class TitleSync {
  #agents = new Map<string, AgentInfo>();
  #previous: Map<string, AgentInfo> | null = null;
  #seeded = false;
  #loading = false;
  #pending = new Set<string>();

  beginSnapshot(): void {
    this.#previous = this.#seeded ? this.#agents : null;
    this.#agents = new Map();
    this.#loading = true;
    this.#pending.clear();
  }

  addSnapshot(agents: readonly AgentInfo[]): void {
    for (const agent of agents) {
      // An update that arrived while later pages loaded is newer than the page.
      if (this.#agents.has(agent.id)) continue;
      this.#agents.set(agent.id, agent);
      if (retitled(this.#previous?.get(agent.id), agent))
        this.#pending.add(agent.id);
    }
  }

  endSnapshot(): Rename[] {
    this.#loading = false;
    this.#seeded = true;
    this.#previous = null;
    const renames = [...this.#pending].flatMap((id) => this.#rename(id) ?? []);
    this.#pending.clear();
    return renames;
  }

  upsert(agent: AgentInfo): Rename | null {
    const before = this.#agents.get(agent.id) ?? this.#previous?.get(agent.id);
    this.#agents.set(agent.id, agent);
    if (!retitled(before, agent)) return null;
    if (this.#loading) {
      this.#pending.add(agent.id);
      return null;
    }
    return this.#rename(agent.id);
  }

  remove(agentId: string): void {
    this.#agents.delete(agentId);
    this.#pending.delete(agentId);
  }

  #rename(agentId: string): Rename | null {
    const title = this.#agents.get(agentId)?.title;
    const workspaceId = soleAgentWorkspace(this.#agents.values(), agentId);
    return title && workspaceId ? { agentId, workspaceId, title } : null;
  }
}
