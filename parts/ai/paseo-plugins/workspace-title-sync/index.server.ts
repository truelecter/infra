import type {
  PluginHookContext,
  PluginServerContext,
} from "@getpaseo/plugin/server";
import {
  soleAgentWorkspace,
  TitleTracker,
  type AgentInfo,
} from "./server/title-sync.ts";

async function listAgents({
  paseo,
  signal,
}: PluginHookContext): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = [];
  let cursor: string | undefined;
  do {
    const page = await paseo.agents.list({
      page: { limit: 200, cursor },
      signal,
    });
    agents.push(...page.entries.map((entry) => entry.agent));
    cursor = page.pageInfo.hasMore
      ? (page.pageInfo.nextCursor ?? undefined)
      : undefined;
  } while (cursor);
  return agents;
}

export default function contribute(server: PluginServerContext) {
  const titles = new TitleTracker();

  server.on("agent.turn_started", async ({ agent }, context) => {
    if (agent.parentAgentId || !agent.workspaceId) return;
    const current = (await listAgents(context)).find(
      (entry) => entry.id === agent.id,
    );
    if (current) titles.started(agent.id, current.title);
  });

  server.on("agent.turn_ended", async ({ agent }, context) => {
    if (agent.parentAgentId || !agent.workspaceId) return;
    const agents = await listAgents(context);
    const current = agents.find((entry) => entry.id === agent.id);
    if (!current) return;
    const title = titles.ended(agent.id, current.title);
    if (!title) return;
    const workspaceId = soleAgentWorkspace(agents, agent.id);
    if (!workspaceId) return;
    await context.paseo.workspaces.ref(workspaceId).setTitle(title);
    console.log(
      `Workspace ${workspaceId} renamed after agent ${agent.id}: ${title}`,
    );
  });

  server.on("agent.archived", ({ agent }) => titles.forget(agent.id));

  return () => {};
}
