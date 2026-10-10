import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, openApp, test } from "../support/fixtures";
import {
  agentRoute,
  createMockAgent,
  finishTurn,
  workspaceRoute,
} from "../support/paseo";

/** Writes `files` (path relative to `.planning/` -> content) into the workspace's folder. */
function writePlanning(repoPath: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(repoPath, ".planning", relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}

test("the GSD panel shows the workspace's .planning folder and follows changes to it", async ({
  page,
  seed,
}, testInfo) => {
  const workspace = await seed("gsd-watch");
  writePlanning(workspace.repoPath, {
    "PROJECT.md": "# E2E Recorder\n",
    "STATE.md":
      "---\nstatus: executing\nstopped_at: 01-02 checkpoint\n---\nPhase: 01 (Foundation)\nPlan: 2 of 2\n",
    "ROADMAP.md":
      "## Phase 1: Foundation\n- [x] 01-01-PLAN.md \u2014 Walking skeleton (wave 1)\n- [ ] 01-02-PLAN.md \u2014 Gate run (wave 2)\n## Phase 2: Polish\n",
    "state.json": JSON.stringify({
      next: {
        command: "/gsd-execute-phase 1",
        label: "Execute",
        reason: "Phase 1 of 2",
      },
    }),
    "phases/01-foundation/01-CONTEXT.md": "",
    "phases/01-foundation/01-01-PLAN.md": "---\nwave: 1\n---\n",
    "phases/01-foundation/01-01-SUMMARY.md": "",
    "phases/01-foundation/01-02-PLAN.md": "---\nwave: 2\n---\n",
  });

  await openApp(page, workspaceRoute(workspace.workspaceId));
  // As in Paseo's own suite: the sidebar's search button opens the Command Center (⌘K) reliably.
  await page.getByTestId("sidebar-search").click();
  const commandCenter = page.getByTestId("command-center-panel");
  await expect(commandCenter).toBeVisible({ timeout: 30_000 });
  await commandCenter
    .getByTestId("command-center-input")
    .fill("Open GSD project status");
  await commandCenter
    .getByRole("button", { name: /^Open GSD project status/ })
    .click();

  const header = page.getByTestId("gsd-watch-header");
  await expect(header).toContainText("E2E Recorder", { timeout: 30_000 });
  await expect(header).toContainText("1/2 plans · 0/2 phases");
  await expect(header).toContainText("Stopped at: 01-02 checkpoint");
  await expect(page.getByTestId("gsd-watch-next")).toContainText(
    "/gsd-execute-phase 1",
  );

  // The current phase starts expanded with its plans; the roadmap-only phase has none.
  const phases = page.getByTestId("gsd-watch-phases");
  await expect(phases).toContainText("1. Foundation");
  await expect(phases).toContainText("Walking skeleton");
  await expect(page.getByLabel("Plan 01-02, Pending, current")).toBeVisible();
  await expect(page.getByLabel("Phase 2: Polish, Pending")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("gsd-panel.png") });

  // An agent finishing the plan writes its summary; the panel picks it up on its next poll.
  writePlanning(workspace.repoPath, {
    "phases/01-foundation/01-02-SUMMARY.md": "",
  });
  await expect(header).toContainText("2/2 plans · 1/2 phases", {
    timeout: 10_000,
  });
  await expect(page.getByLabel("Phase 1: Foundation, Complete")).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  // The compact Explorer has only Files, Changes, and PR, so `/gsd-watch` must open a tab there.
  test("/gsd-watch opens the panel as a workspace tab", async ({
    page,
    seed,
    client,
  }) => {
    const workspace = await seed("gsd-watch-phone");
    writePlanning(workspace.repoPath, {
      "ROADMAP.md": "## Phase 1: Foundation\n## Phase 2: Polish\n",
    });
    const agentId = await createMockAgent(workspace, {
      title: "Phone agent",
      initialPrompt: "hello",
    });
    await finishTurn(client, agentId);

    // openApp waits for the desktop sidebar, which a phone layout keeps in a drawer.
    await page.goto("/");
    await expect(page.getByText("Add a project", { exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await page.goto(agentRoute(workspace.workspaceId, agentId));
    const input = page.getByRole("textbox").last();
    await input.click();
    await input.fill("/gsd-watch");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByTestId("gsd-watch-phases")).toContainText(
      "2. Polish",
      { timeout: 30_000 },
    );
    await expect(page.getByTestId("gsd-watch-panel")).toBeInViewport();
  });
});
