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

// The plugin compares the agent's title at turn boundaries: a rename between turns renames the
// workspace when the next turn ends, if the agent is the workspace's only top-level agent.
test("a workspace follows its only agent's new title after the agent's next turn", async ({
  page,
  seed,
  client,
}) => {
  const workspace = await seed("title-sync");
  const agentId = await createMockAgent(workspace, {
    title: "Original agent title",
    initialPrompt: "first turn",
  });
  await finishTurn(client, agentId);

  await client.updateAgent(agentId, { name: "Renamed by the e2e suite" });
  await client.sendAgentMessage(agentId, "second turn");
  await finishTurn(client, agentId);
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
  await client.sendAgentMessage(agentId, "second turn");
  await finishTurn(client, agentId);
  // The rename happens in the turn_ended hook, within a second in the test above. Give it longer.
  await sleep(3_000);
  expect(await workspaceName(client, workspace.workspaceId)).toBe(before);
});
