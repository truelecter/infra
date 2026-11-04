import type {
  PluginHookContext,
  PluginServerContext,
} from "@getpaseo/plugin/server";
import { TitleSync, type AgentInfo, type Rename } from "./server/title-sync.ts";

// `@getpaseo/client` can't be imported, not even its types (Paseo's compiler
// resolves them too), so the shapes used here are spelled out.
type PaseoApi = PluginHookContext["paseo"];
interface DirectoryPage {
  entries: readonly { agent: AgentInfo }[];
  pageInfo: { hasMore: boolean; nextCursor?: string | null };
}
interface Subscription {
  release(): Promise<void>;
}

export default function contribute(server: PluginServerContext) {
  const sync = new TitleSync();
  let subscription: Promise<Subscription | null> | null = null;
  let snapshots = 0;
  let stopped = false;

  async function rename(
    paseo: PaseoApi,
    { agentId, workspaceId, title }: Rename,
  ) {
    try {
      await paseo.workspaces.ref(workspaceId).setTitle(title);
      console.log(
        `Workspace ${workspaceId} renamed after agent ${agentId}: ${title}`,
      );
    } catch (error) {
      console.error(`Renaming workspace ${workspaceId} failed`, error);
    }
  }

  // A snapshot holds one page; the rest of the directory is read before any
  // rename. A newer snapshot (after a reconnect) abandons this one.
  async function load(paseo: PaseoApi, first: DirectoryPage) {
    const generation = ++snapshots;
    sync.beginSnapshot();
    sync.addSnapshot(first.entries.map((entry) => entry.agent));
    let cursor = first.pageInfo.hasMore ? first.pageInfo.nextCursor : null;
    while (cursor) {
      const page = await paseo.agents.list({ page: { limit: 200, cursor } });
      if (generation !== snapshots) return;
      sync.addSnapshot(page.entries.map((entry) => entry.agent));
      cursor = page.pageInfo.hasMore ? page.pageInfo.nextCursor : null;
    }
    if (generation !== snapshots) return;
    for (const change of sync.endSnapshot()) await rename(paseo, change);
  }

  async function follow(paseo: PaseoApi): Promise<Subscription | null> {
    const { subscription: directory } = await paseo.agents.list({
      page: { limit: 200 },
      subscribe: {},
    });
    if (stopped) {
      await directory.release();
      return null;
    }
    // Delivers the current snapshot right away, and a new one after every reconnect.
    directory.subscribe({
      snapshot: (snapshot) => {
        load(paseo, snapshot).catch((error) =>
          console.error("Reading the agent directory failed", error),
        );
      },
      update: (message) => {
        if (message.type !== "agent_update") return;
        const update = message.payload;
        if (update.kind === "remove") return sync.remove(update.agentId);
        const change = sync.upsert(update.agent);
        if (change) void rename(paseo, change);
      },
      error: (error) =>
        console.error("Agent directory subscription failed", error),
    });
    console.log("Following agent titles");
    return directory;
  }

  // Server setup gets no Paseo client; a hook's context carries the plugin's
  // one client, so the first agent hook after a start or reload starts following.
  async function start(_payload: unknown, { paseo }: PluginHookContext) {
    if (subscription || stopped) return;
    subscription = follow(paseo).catch((error) => {
      console.error("Following agent titles failed", error);
      subscription = null;
      return null;
    });
  }

  server.addHook("agent.create.after", start);
  server.addHook("agent.turn.before", start);
  server.addHook("agent.turn.after", start);

  return async () => {
    stopped = true;
    await (await subscription)?.release();
  };
}
