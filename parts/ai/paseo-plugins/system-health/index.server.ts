import type {
  PluginHandlerContext,
  PluginServerContext,
} from "@getpaseo/plugin/server";
import {
  archiveAgent,
  getSnapshot,
  killProcess,
  quitApp,
  screenSettings,
  type Snapshot,
} from "./shared/health.ts";
import * as actions from "./server/actions.ts";
import { collect } from "./server/collect.ts";
import { buildSnapshot, type AgentInfo } from "./server/model.ts";

async function listAgents({
  paseo,
}: PluginHandlerContext): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = [];
  let cursor: string | undefined;
  do {
    const page = await paseo.agents.list({
      filter: { includeArchived: true },
      page: { limit: 200, cursor },
    });
    for (const { agent } of page.entries) {
      agents.push({
        id: agent.id,
        title: agent.title,
        status: agent.status,
        archived: !!agent.archivedAt,
        cwd: agent.cwd,
        sessionId:
          agent.runtimeInfo?.sessionId ?? agent.persistence?.sessionId ?? null,
        lastActivityAt: agent.updatedAt,
      });
    }
    cursor = page.pageInfo.hasMore
      ? (page.pageInfo.nextCursor ?? undefined)
      : undefined;
  } while (cursor);
  return agents;
}

export default function contribute(server: PluginServerContext) {
  server.registerSettings(screenSettings);

  // Several open screens (desktop and phone) share one sample instead of running top side by side.
  let inFlight: Promise<Snapshot> | null = null;
  server.handle(getSnapshot, (_input, context) => {
    inFlight ??= collect(() => listAgents(context))
      .then(buildSnapshot)
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  });

  server.handle(archiveAgent, ({ agentId }, { paseo }) =>
    paseo.agents.ref(agentId).archive(),
  );
  server.handle(quitApp, async ({ bundlePath }) => {
    await actions.quitApp(bundlePath);
    return {};
  });
  server.handle(killProcess, async ({ pid, name }) => {
    await actions.killProcess(pid, name);
    return {};
  });

  return () => {};
}
