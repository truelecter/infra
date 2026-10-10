import { test as base, expect, type Page } from "@playwright/test";
import {
  agentRoute,
  connectClient,
  seedWorkspace,
  type Client,
  type SeededWorkspace,
} from "./paseo";

export const test = base.extend<
  { guard: void; seed: (name: string) => Promise<SeededWorkspace> },
  { client: Client }
>({
  // Every page is kept off the user's own daemon (the default port 6767), as Paseo's suite does,
  // and a failing test gets the browser console attached.
  guard: [
    async ({ page }, provide, testInfo) => {
      await page.route(/:6767\b/, (route) => route.abort());
      await page.routeWebSocket(/:6767\b/, (ws) =>
        ws.close({ code: 1008, reason: "blocked in e2e" }),
      );
      const lines: string[] = [];
      page.on("console", (message) =>
        lines.push(`[${message.type()}] ${message.text()}`),
      );
      page.on("pageerror", (error) =>
        lines.push(`[pageerror] ${error.message}`),
      );
      await provide();
      if (testInfo.status !== testInfo.expectedStatus && lines.length > 0) {
        await testInfo.attach("browser-console", {
          body: lines.join("\n"),
          contentType: "text/plain",
        });
      }
    },
    { auto: true },
  ],
  client: [
    async ({}, provide) => {
      const client = await connectClient();
      await provide(client);
      await client.close().catch(() => undefined);
    },
    { scope: "worker" },
  ],
  // Projects a test creates are removed after it, so the sidebar only shows the test's own.
  seed: async ({ client }, provide) => {
    const seeded: SeededWorkspace[] = [];
    await provide(async (name) => {
      const workspace = await seedWorkspace(client, name);
      seeded.push(workspace);
      return workspace;
    });
    for (const workspace of seeded)
      await client.removeProject(workspace.projectId).catch(() => undefined);
  },
});

/**
 * Opens the app at `route` once it is connected to the isolated daemon. The daemon's web UI
 * connects to it on its own (`__PASEO_INITIAL_DAEMON_CONNECTION__`), but only from `/`; a deep link
 * opened first lands on the home screen. That first connection is a single probe with a 2.5 s
 * timeout (`DEFAULT_LOCALHOST_BOOTSTRAP_TIMEOUT_MS` in Paseo's host-runtime.ts); when a busy daemon
 * misses it, the app shows its onboarding screen instead, and a reload probes again.
 */
export async function openApp(page: Page, route = "/"): Promise<void> {
  const sidebar = page.getByTestId("sidebar-project-workspace-list-scroll");
  const onboarding = page.getByText("Connect your computer to get started", {
    exact: true,
  });
  for (let attempt = 1; ; attempt++) {
    await page.goto("/");
    await expect(sidebar.or(onboarding)).toBeVisible({ timeout: 60_000 });
    // Give a connection that is still settling a moment before reloading.
    if (
      await sidebar.waitFor({ timeout: 5_000 }).then(
        () => true,
        () => false,
      )
    )
      break;
    if (attempt === 3)
      throw new Error(
        "the web UI did not connect to the daemon in three attempts",
      );
  }
  if (route !== "/") await page.goto(route);
}

/** Opens an agent's tab and waits for its chat. */
export async function openAgent(
  page: Page,
  workspaceId: string,
  agentId: string,
): Promise<void> {
  await openApp(page, agentRoute(workspaceId, agentId));
  await expect(page.getByTestId(`workspace-tab-agent_${agentId}`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("agent-chat-scroll")).toBeVisible();
}

export { expect };
