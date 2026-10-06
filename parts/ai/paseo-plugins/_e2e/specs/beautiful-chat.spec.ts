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

// The plugin replaces Paseo's prompt row, and with it Paseo's Rewind menu, so the prompt card
// carries its own Rewind. The mock provider supports every rewind mode and keeps only the first
// prompt of its history when it rewinds.
test("Rewind on a prompt card removes that prompt and the turns after it", async ({ page, seed }) => {
  const workspace = await seed("beautiful-chat-rewind");
  const agentId = await createMockAgent(workspace, { title: "Rewind agent", initialPrompt: "First prompt" });
  await finishTurn(workspace.client, agentId);
  await workspace.client.sendAgentMessage(agentId, "Second prompt");
  await finishTurn(workspace.client, agentId);
  await openAgent(page, workspace.workspaceId, agentId);

  const chat = page.getByTestId("agent-chat-scroll");
  const prompt = (text: string) =>
    chat.locator(PLUGIN_ROW).filter({ hasText: text, has: page.getByRole("button", { name: "Copy prompt" }) });
  await expect(prompt("First prompt")).toHaveCount(1);
  await expect(prompt("Second prompt")).toHaveCount(1);

  await prompt("Second prompt").getByRole("button", { name: "Rewind to this prompt" }).click();
  await prompt("Second prompt").getByRole("button", { name: "Rewind conversation", exact: true }).click();

  await expect(prompt("Second prompt")).toHaveCount(0);
  await expect(prompt("First prompt")).toHaveCount(1);
});

// The plugin's reply footer replaces Paseo's, Fork included. Its Fork opens the plugin's fork screen
// for the first message, starts the new agent with the source chat attached, and opens it.
test("Fork in the reply footer starts a new agent with the chat history and opens it", async ({ page, seed }) => {
  const workspace = await seed("beautiful-chat-fork");
  const sourceId = await createMockAgent(workspace, { title: "Fork source", initialPrompt: "Original prompt" });
  await finishTurn(workspace.client, sourceId);
  await openAgent(page, workspace.workspaceId, sourceId);

  await page.getByTestId("agent-chat-scroll").getByRole("button", { name: "Fork conversation" }).click();
  await expect(page.getByText("Fork conversation", { exact: true })).toBeVisible();
  await page.getByLabel("First message").fill("Continue in the fork");
  await page.getByRole("button", { name: "Start agent" }).click();

  // The open chat is the new agent's: its only prompt is the fork's message, which carries the
  // source chat as the attached history.
  const prompts = page
    .getByTestId("agent-chat-scroll")
    .locator(PLUGIN_ROW)
    .filter({ has: page.getByRole("button", { name: "Copy prompt" }) });
  await expect(prompts).toHaveCount(1);
  await expect(prompts).toContainText("Continue in the fork");
  await expect(prompts).toContainText("[User] Original prompt");
});

test("its settings screen opens from Settings > Plugins", async ({ page }) => {
  await openApp(page, `/settings/hosts/${env.serverId}/plugins`);
  await page.getByRole("button", { name: "Actions for beautiful-chat", exact: true }).click();
  await page.getByRole("menuitem", { name: "Chat presentation", exact: true }).click();
  await expect(page.getByText("beautiful-chat · Chat presentation", { exact: true })).toBeVisible();
  await expect(page.getByText("Enhanced prompt bubble", { exact: true })).toBeVisible();
});
