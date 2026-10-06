import { expect, openAgent, test } from "../support/fixtures";
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
    chat.locator(PLUGIN_ROW).filter({ hasText: /Used \d+ tools?/ }).first(),
  ).toBeVisible();

  // Because the plugin intercepts tool_call rows, Paseo's own tool badge is gone.
  await expect(chat.getByTestId("tool-call-badge")).toHaveCount(0);
});
