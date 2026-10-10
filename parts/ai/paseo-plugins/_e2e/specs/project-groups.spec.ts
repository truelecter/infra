import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { env } from "../support/env";
import { expect, openApp, test } from "../support/fixtures";

// The plugin adds group header rows (`.pg-header[data-pg-group]`) to the sidebar's project list,
// nests grouped projects under them (`data-pg-depth` on the project's sortable item), and adds a
// "Move to group" button (`.pg-assign`) to each project row.
test("a project moved to a group with the folder button is nested under the group header", async ({
  page,
  seed,
}) => {
  const workspace = await seed("project-groups");
  await openApp(page);

  const row = page.getByTestId(`sidebar-project-row-${workspace.projectKey}`);
  await row.hover();
  await row.locator(".pg-assign").click();
  const input = page.locator(".pg-popover .pg-pop-input");
  await input.fill("E2E group");
  await input.press("Enter");

  const header = page.locator('.pg-header[data-pg-group="E2E group"]');
  await expect(header.locator(".pg-name")).toHaveText("E2E group");
  await expect(header).toHaveAttribute("aria-label", "E2E group, 1 project");
  await expect(
    page.locator('[data-pg-depth="1"]').filter({ has: row }),
  ).toHaveCount(1);

  // Assignments are host settings on the daemon, so they survive a reload.
  const file = path.join(
    env.home,
    "plugin-settings",
    "project-groups",
    "groups.json",
  );
  const stored = () => (existsSync(file) ? readFileSync(file, "utf8") : "");
  await expect.poll(stored).toContain(JSON.stringify(workspace.projectKey));
  expect(stored()).toContain('"E2E group"');
  await page.reload();
  await expect(header).toHaveAttribute("aria-expanded", "true");

  await header.click();
  await expect(header).toHaveAttribute("aria-expanded", "false");
  await expect(row).toBeHidden();
  await header.click();
  await expect(row).toBeVisible();
});

test("a project named `group/name` is grouped by its name", async ({
  page,
  seed,
  client,
}) => {
  const workspace = await seed("project-groups-named");
  await client.renameProject(workspace.projectId, "Named group/app");
  await openApp(page);

  const row = page.getByTestId(`sidebar-project-row-${workspace.projectKey}`);
  await expect(
    page.locator('.pg-header[data-pg-group="Named group"] .pg-name'),
  ).toHaveText("Named group");
  await expect(row.locator("[data-pg-label]")).toHaveText("app");
});
