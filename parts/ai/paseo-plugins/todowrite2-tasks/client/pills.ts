import type {
  PluginButton,
  PluginButtonContentProps,
  PluginButtonRegistration,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import type { ComponentType } from "react";
import { followTodos } from "./follow.ts";
import { clearAgentTodos, setAgentTodos } from "./store.ts";
import { todoProgress, type Todo } from "./todos.ts";

interface AgentSummary {
  id: string;
  provider: string;
  workspaceId?: string | null;
  archivedAt?: string | null;
}

interface TrackedAgent {
  workspaceId: string;
  pill: PluginButtonRegistration;
  stop(): void;
}

export function pillPresentation(
  todos: readonly Todo[],
): Partial<PluginButton> {
  if (todos.length === 0) return { visible: false };
  const { completed, total } = todoProgress(todos);
  return { visible: true, label: `${completed}/${total} tasks` };
}

// One hidden pill per open OpenCode agent; it shows once the agent saves a list.
export function trackTaskPills(
  client: PluginClientContext,
  Content: ComponentType<PluginButtonContentProps>,
): () => void {
  const tracked = new Map<string, TrackedAgent>();
  const lifetime = new AbortController();
  let stopped = false;

  function untrack(agentId: string) {
    const agent = tracked.get(agentId);
    if (!agent) return;
    agent.stop();
    agent.pill.remove();
    tracked.delete(agentId);
    clearAgentTodos(agentId);
  }

  function track(agent: AgentSummary) {
    if (stopped) return;
    const workspaceId = agent.workspaceId;
    if (agent.provider !== "opencode" || agent.archivedAt || !workspaceId) {
      untrack(agent.id);
      return;
    }
    if (tracked.get(agent.id)?.workspaceId === workspaceId) return;
    untrack(agent.id);
    const pill = client.addComposerPill({
      id: "tasks",
      workspaceId,
      agentId: agent.id,
      button: {
        title: "Tasks",
        icon: "ListChecks",
        label: "Tasks",
        visible: false,
        behavior: { kind: "popover", Content },
      },
    });
    const stop = followTodos(
      client.paseo.agents.ref(agent.id).timeline,
      (todos) => {
        setAgentTodos(agent.id, todos);
        pill.update(pillPresentation(todos));
      },
      (error) =>
        console.warn(
          `[todowrite2-tasks] cannot follow agent ${agent.id}`,
          error,
        ),
    );
    tracked.set(agent.id, { workspaceId, pill, stop });
  }

  client.paseo.agents
    .list({
      filter: { includeArchived: false },
      subscribe: {},
      signal: lifetime.signal,
    })
    .then(({ subscription }) => {
      subscription.subscribe({
        snapshot({ entries }) {
          const present = new Set(entries.map(({ agent }) => agent.id));
          for (const agentId of [...tracked.keys()])
            if (!present.has(agentId)) untrack(agentId);
          for (const { agent } of entries) track(agent);
        },
        update(message) {
          if (message.type !== "agent_update") return;
          const update = message.payload;
          if (update.kind === "remove") untrack(update.agentId);
          else track(update.agent);
        },
      });
      return undefined;
    })
    .catch((error: unknown) => {
      if (!stopped)
        console.error("[todowrite2-tasks] agent observation failed", error);
    });

  return () => {
    stopped = true;
    lifetime.abort();
    for (const agentId of [...tracked.keys()]) untrack(agentId);
  };
}
