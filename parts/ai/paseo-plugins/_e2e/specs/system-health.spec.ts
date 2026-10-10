import { expect, openApp, test } from "../support/fixtures";
import { createMockAgent } from "../support/paseo";

// The plugin samples macOS tools (top, vm_stat, lsof); its package exists only on Darwin, so the
// harness loads it only there.
test.skip(process.platform !== "darwin", "system-health is macOS only");

test("the System health screen samples this Mac, counts the daemon's agents, and keeps the refresh interval", async ({
  page,
  seed,
}) => {
  const workspace = await seed("system-health");
  await createMockAgent(workspace, {
    title: "Health check agent",
    initialPrompt: "hello",
  });

  await openApp(page);
  await page.getByTestId("plugin-sidebar-system-health-system-health").click();
  const memory = page.getByTestId("system-health-memory");
  await expect(memory).toContainText(/Pressure: (normal|warning|critical)/);
  await expect(memory).toContainText(/Swap/);
  // A real sample: app rows with footprints, and the agent list read through the plugin API.
  await expect(page.getByTestId("system-health-apps")).toContainText(
    /\d+(\.\d)? (MB|GB)/,
  );
  await expect(page.getByTestId("system-health-agents")).toContainText(
    /Paseo has [1-9]\d* agents/,
  );

  const tenSeconds = page.getByLabel("Refresh every 10 seconds");
  const off = page.getByLabel("No automatic refresh");
  await expect(off).toHaveAttribute("aria-selected", "true");
  await tenSeconds.click();
  await expect(tenSeconds).toHaveAttribute("aria-selected", "true");
  try {
    // The interval is a host setting, so it survives a reload (which reopens the screen).
    await page.reload();
    await expect(page.getByLabel("Refresh every 10 seconds")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  } finally {
    await page.getByLabel("No automatic refresh").click();
    await expect(page.getByLabel("No automatic refresh")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
});
