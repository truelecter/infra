import { expect, openApp, test } from "../support/fixtures";

// Paseo's settings section headings paint with `foregroundMuted`, so a heading's color shows the
// palette reached Paseo's tokens (the same check as Paseo's own plugin-theme e2e spec).
const MOCHA_BASE = "rgb(30, 30, 46)"; // #1e1e2e
const MOCHA_SUBTEXT0 = "rgb(166, 173, 200)"; // #a6adc8

test("Catppuccin Mocha is offered under Settings > Appearance and paints the app", async ({ page }) => {
  await openApp(page, "/settings/appearance");
  await expect(page.getByTestId("settings-sidebar")).toBeVisible();

  await page.getByLabel(/^Theme: /).click();
  await page.getByText("Catppuccin Mocha", { exact: true }).click();
  await expect(page.getByLabel("Theme: Catppuccin Mocha", { exact: true })).toBeVisible();
  await expect(page.getByText("Theme", { exact: true }).first()).toHaveCSS("color", MOCHA_SUBTEXT0);

  // The choice is kept per client; the app shell then renders on the Mocha base color. Paseo
  // applies the saved plugin theme only after the plugin loads, after the shell is up.
  await openApp(page);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const value = getComputedStyle(document.documentElement).getPropertyValue("--colors-background").trim();
        const probe = document.createElement("div");
        probe.style.backgroundColor = value;
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      }),
    )
    .toBe(MOCHA_BASE);
});
