import { expect, openAgent, openApp, test } from "../support/fixtures";
import { createMockAgent, finishTurn } from "../support/paseo";
import { env } from "../support/env";
import type { Page } from "@playwright/test";

// Paseo caps the chat column (timeline and composer) at 820 px; the plugin raises the cap to a
// share of the agent pane, 90% by default.
const STOCK_MAX = 820;

/** The composer's width; 0 while it is not rendered (the chat mounts it after a moment). */
async function composerWidth(page: Page): Promise<number> {
  const box = await page.getByTestId("message-input-root").boundingBox();
  return box?.width ?? 0;
}

async function setWidth(page: Page, current: string, next: string) {
  await openApp(page, `/settings/hosts/${env.serverId}/plugins`);
  await page
    .getByRole("button", { name: "Actions for wide-chat", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Chat width", exact: true }).click();
  await page
    .getByRole("button", { name: `Width: ${current}`, exact: true })
    .click();
  await page.getByText(next, { exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Width: ${next}`, exact: true }),
  ).toBeVisible();
}

test("the chat column uses most of a wide agent pane, and the width setting changes it", async ({
  page,
  seed,
}) => {
  const workspace = await seed("wide-chat");
  const agentId = await createMockAgent(workspace, {
    title: "Wide chat agent",
    initialPrompt: "hello",
  });
  await finishTurn(workspace.client, agentId);

  // 1600 px viewport: the agent pane is about 1290 px wide.
  await openAgent(page, workspace.workspaceId, agentId);
  let wide = 0;
  await expect
    .poll(async () => (wide = await composerWidth(page)))
    .toBeGreaterThan(STOCK_MAX + 200);

  await setWidth(page, "90% of the pane", "70% of the pane");
  try {
    await openAgent(page, workspace.workspaceId, agentId);
    // Narrower than before, never narrower than stock; polled as one check so a frame without the
    // composer can't satisfy it.
    await expect
      .poll(async () => {
        const width = await composerWidth(page);
        return width >= STOCK_MAX && width < wide - 150 ? "narrower" : width;
      })
      .toBe("narrower");
  } finally {
    await setWidth(page, "70% of the pane", "90% of the pane");
  }
});
