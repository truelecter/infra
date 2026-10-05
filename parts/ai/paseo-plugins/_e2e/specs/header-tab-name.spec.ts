import { expect, openAgent, test } from "../support/fixtures";
import { createMockAgent, finishTurn } from "../support/paseo";

// The plugin appends `› <tab name>` to the workspace header's title row (`.htn-label`, a node of
// its own next to `workspace-header-title`).
test("the workspace header shows the name of the open agent tab", async ({ page, seed }) => {
  const workspace = await seed("header-tab-name");
  const first = await createMockAgent(workspace, { title: "First agent with a long descriptive title", initialPrompt: "hi" });
  const second = await createMockAgent(workspace, { title: "Second agent in the same workspace", initialPrompt: "hi" });
  await finishTurn(workspace.client, first);
  await finishTurn(workspace.client, second);

  await openAgent(page, workspace.workspaceId, first);
  const titleRow = page.getByTestId("workspace-header-title").locator("..");
  const label = titleRow.locator(".htn-label");
  await expect(label).toHaveText("First agent with a long descriptive title");
  await expect(label).toHaveAttribute("title", "First agent with a long descriptive title");

  await page.getByTestId(`workspace-tab-agent_${second}`).click();
  await expect(label).toHaveText("Second agent in the same workspace");
});
