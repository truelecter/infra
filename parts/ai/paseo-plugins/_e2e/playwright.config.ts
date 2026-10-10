import { defineConfig, devices } from "@playwright/test";

// Run through `nix run .#paseo-plugins-e2e`, which starts the isolated daemon and sets the
// PASEO_E2E_* variables (support/env.ts). One worker: every spec shares that daemon.
const root = process.env.PASEO_E2E_ROOT;
if (!root)
  throw new Error(
    "PASEO_E2E_ROOT is not set: run the suite through `nix run .#paseo-plugins-e2e`",
  );

export default defineConfig({
  testDir: "./specs",
  outputDir: `${root}/test-results`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: `${root}/report`, open: "never" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${process.env.PASEO_E2E_PORT}`,
    viewport: { width: 1600, height: 1000 },
    trace: "retain-on-failure",
    // A missing plugin control should fail fast, not after the whole test timeout.
    actionTimeout: 20_000,
    screenshot: "only-on-failure",
  },
});
