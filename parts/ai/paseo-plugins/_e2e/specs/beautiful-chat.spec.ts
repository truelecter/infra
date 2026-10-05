import { env } from "../support/env";
import { expect, openAgent, openApp, test } from "../support/fixtures";
import { createMockAgent, finishTurn } from "../support/paseo";

// Paseo tags each timeline row with `data-history-row-id`; rows a plugin's renderer draws are
// prefixed with the plugin id. Tool call ids from the mock provider end in `:<tool>:<cycle>`.
const PLUGIN_ROW = '[data-history-row-id^="beautiful-chat/"]';

test("a mock agent turn renders as beautiful-chat cards instead of Paseo's stock rows", async ({ page, seed }) => {
  const workspace = await seed("beautiful-chat");
  const agentId = await createMockAgent(workspace, {
    title: "Beautiful chat agent",
    initialPrompt: "Walk through the scroll anchor",
    model: "ten-second-stream",
  });
  await finishTurn(workspace.client, agentId);
  await openAgent(page, workspace.workspaceId, agentId);

  const chat = page.getByTestId("agent-chat-scroll");
  await expect(chat.locator(PLUGIN_ROW).filter({ hasText: "Walk through the scroll anchor" })).toHaveCount(1);
  const tool = (name: string) => chat.locator(`${PLUGIN_ROW}[data-history-row-id*="%3A${name}%3A1/"]`);
  await expect(tool("read")).toContainText("Read conversation-list.tsx");
  await expect(tool("grep")).toContainText("grep");
  await expect(tool("edit")).toContainText("Edit use-scroll-anchor.ts");
  await expect(tool("bash")).toContainText("$ node scripts/simulate-stream-burst.mjs");

  // None of Paseo's own message or tool rows are left.
  await expect(chat.getByTestId("user-message")).toHaveCount(0);
  await expect(chat.getByTestId("assistant-message")).toHaveCount(0);
  await expect(chat.getByTestId("tool-call-badge")).toHaveCount(0);
});

test("its settings screen opens from Settings > Plugins", async ({ page }) => {
  await openApp(page, `/settings/hosts/${env.serverId}/plugins`);
  await page.getByRole("button", { name: "Actions for beautiful-chat", exact: true }).click();
  await page.getByRole("menuitem", { name: "Chat presentation", exact: true }).click();
  await expect(page.getByText("beautiful-chat · Chat presentation", { exact: true })).toBeVisible();
  await expect(page.getByText("Enhanced prompt bubble", { exact: true })).toBeVisible();
});
