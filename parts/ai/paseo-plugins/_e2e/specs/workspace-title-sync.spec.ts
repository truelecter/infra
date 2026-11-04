import { setTimeout as sleep } from "node:timers/promises";
import { env } from "../support/env";
import { expect, openApp, test } from "../support/fixtures";
import { createMockAgent, finishTurn, type Client } from "../support/paseo";

async function workspaceName(
  client: Client,
  workspaceId: string,
): Promise<string | undefined> {
  const { entries } = await client.fetchWorkspaces();
  return entries.find((entry) => entry.id === workspaceId)?.name;
}

// The plugin follows the agent directory: a rename renames the workspace right away, without
// another turn, if the agent is the workspace's only top-level agent.
test("a workspace follows its only agent's new title without another turn", async ({
  page,
  seed,
  client,
}) => {
  const workspace = await seed("title-sync");
  const agentId = await createMockAgent(workspace, {
    title: "Original agent title",
    initialPrompt: "first turn",
  });
  // The agent's hooks start the plugin's directory subscription; once the turn is over it is live.
  await finishTurn(client, agentId);

  await client.updateAgent(agentId, { name: "Renamed by the e2e suite" });
  await expect
    .poll(() => workspaceName(client, workspace.workspaceId))
    .toBe("Renamed by the e2e suite");

  await openApp(page);
  await expect(
    page.getByTestId(
      `sidebar-workspace-row-${env.serverId}:${workspace.workspaceId}`,
    ),
  ).toContainText("Renamed by the e2e suite");
});

test("a workspace with a second top-level agent keeps its title", async ({
  seed,
  client,
}) => {
  const workspace = await seed("title-sync-two");
  const agentId = await createMockAgent(workspace, {
    title: "First of two agents",
    initialPrompt: "first turn",
  });
  const otherId = await createMockAgent(workspace, {
    title: "Second of two agents",
    initialPrompt: "first turn",
  });
  await finishTurn(client, agentId);
  await finishTurn(client, otherId);
  const before = await workspaceName(client, workspace.workspaceId);

  await client.updateAgent(agentId, { name: "Renamed with a sibling" });
  // The rename follows within a second in the test above. Give it longer.
  await sleep(3_000);
  expect(await workspaceName(client, workspace.workspaceId)).toBe(before);
});
