import { expect, openApp, test } from "../support/fixtures";

// The harness's HOME has no ~/.omp: no stats database and no Bedrock profile, so the screen
// shows its empty state with Cost Explorer unavailable, without asking AWS.
test("the OMP usage screen opens from the sidebar footer and reports what it lacks", async ({
  page,
}) => {
  await openApp(page);
  await page.getByTestId("plugin-sidebar-footer-omp-usage-stats").click();

  const cost = page.getByTestId("omp-usage-cost");
  await expect(cost).toContainText(
    "Cost Explorer unavailable: no OMP_BEDROCK_AWS_PROFILE",
  );
  await expect(cost).toContainText("API-equivalent$0.00");
  await expect(page.getByTestId("omp-usage-footer")).toContainText(
    /OMP stats: no stats database at .*\.omp\/stats\.db/,
  );

  const month = page.getByLabel("This month");
  await month.click();
  await expect(month).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("This week")).toHaveAttribute(
    "aria-selected",
    "false",
  );
  await expect(cost).toContainText("API-equivalent$0.00");
});
