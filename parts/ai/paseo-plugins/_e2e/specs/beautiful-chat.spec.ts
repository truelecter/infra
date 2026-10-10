import { expect, openAgent, openApp, test } from "../support/fixtures";
import { env } from "../support/env";
import { createMockAgent, finishTurn } from "../support/paseo";

// Paseo tags each timeline row with `data-history-row-id`; rows a plugin's renderer draws are
// prefixed with the plugin id.
const PLUGIN_ROW = '[data-history-row-id^="beautiful-chat/"]';

// The `ten-second-stream` mock turn streams reasoning and read, grep, edit, and bash tool calls.
// The plugin draws the reasoning as its Thinking card and the tools as its compact activity: a
// folded `... · Used N tools` summary for a run without thinking, or one compact row per tool in a
// run that has thinking. The prompt and reply stay with Paseo. Assertions target the bottom of the
// turn, which stays mounted; earlier rows virtualize out once the view scrolls to the latest.
test("a mock turn renders the plugin's compact tool activity, not Paseo's tool rows", async ({
  page,
  seed,
}) => {
  const workspace = await seed("beautiful-chat");
  const agentId = await createMockAgent(workspace, {
    title: "Beautiful chat agent",
    initialPrompt: "Walk through the scroll anchor",
    model: "ten-second-stream",
  });
  await finishTurn(workspace.client, agentId);
  await openAgent(page, workspace.workspaceId, agentId);

  const chat = page.getByTestId("agent-chat-scroll");

  // The plugin is drawing the turn.
  await expect(chat.locator(PLUGIN_ROW).first()).toBeVisible();

  // The tool calls become the plugin's compact activity: a folded summary counting them.
  await expect(
    chat
      .locator(PLUGIN_ROW)
      .filter({ hasText: /Used \d+ tools?/ })
      .first(),
  ).toBeVisible();

  // Because the plugin intercepts tool_call rows, Paseo's own tool badge is gone.
  await expect(chat.getByTestId("tool-call-badge")).toHaveCount(0);
});

// Turning Combine tool calls off in the plugin's settings draws every call of a folded run as its
// own compact row, so the turn has no summary line left.
test("the Combine tool calls setting draws each call as its own row when off", async ({
  page,
  seed,
}) => {
  const workspace = await seed("beautiful-chat-combine");
  const agentId = await createMockAgent(workspace, {
    title: "Beautiful chat rows agent",
    initialPrompt: "Walk through the scroll anchor",
    model: "ten-second-stream",
  });
  await finishTurn(workspace.client, agentId);

  await openApp(page, `/settings/hosts/${env.serverId}/plugins`);
  await page
    .getByRole("button", { name: "Actions for beautiful-chat", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Chat presentation", exact: true })
    .click();
  const toggle = page.getByRole("switch", { name: "Combine tool calls" });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();

  await openAgent(page, workspace.workspaceId, agentId);
  const chat = page.getByTestId("agent-chat-scroll");
  await expect(chat.locator(PLUGIN_ROW).first()).toBeVisible();
  await expect(
    chat.locator(PLUGIN_ROW).filter({ hasText: /Used \d+ tools?/ }),
  ).toHaveCount(0);
  await expect(
    chat
      .locator(PLUGIN_ROW)
      .filter({ hasText: /echo|Shell|Read|Edit|Search/ })
      .nth(1),
  ).toBeVisible();
});

// Cards show when their item arrived, worded like Paseo's message times (a same-day turn shows
// only the time), and the Show times setting hides it.
test("cards show their time, and the Show times setting hides it", async ({
  page,
  seed,
}) => {
  const workspace = await seed("beautiful-chat-times");
  const agentId = await createMockAgent(workspace, {
    title: "Beautiful chat times agent",
    initialPrompt: "Walk through the scroll anchor",
    model: "ten-second-stream",
  });
  await finishTurn(workspace.client, agentId);

  await openAgent(page, workspace.workspaceId, agentId);
  const chat = page.getByTestId("agent-chat-scroll");
  // Row text runs together (`list.tsx12:39 AM`), so no word boundary before the hour.
  const timedCards = chat
    .locator(PLUGIN_ROW)
    .filter({ hasText: /\d{1,2}:\d{2}/ });
  await expect(timedCards.first()).toBeVisible();

  await openApp(page, `/settings/hosts/${env.serverId}/plugins`);
  await page
    .getByRole("button", { name: "Actions for beautiful-chat", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Chat presentation", exact: true })
    .click();
  const toggle = page.getByRole("switch", { name: "Show times" });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();

  await openAgent(page, workspace.workspaceId, agentId);
  await expect(chat.locator(PLUGIN_ROW).first()).toBeVisible();
  await expect(timedCards).toHaveCount(0);
});
