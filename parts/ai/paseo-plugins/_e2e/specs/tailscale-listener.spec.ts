import { readFileSync } from "node:fs";
import { request } from "node:http";
import path from "node:path";
import { env } from "../support/env";
import { expect, test } from "../support/fixtures";

// The harness gives the plugin a stand-in for Tailscale: PASEO_TAILSCALE_ADDRESS=::1 (the daemon
// listens on 127.0.0.1, so the port is free there) and PASEO_TAILSCALE_HOSTNAMES with this name.
const NAME = "e2e-host.e2e-tailnet.ts.net";
const FORWARDED = `http://[::1]:${env.port}/`;

function hostnames(): unknown {
  const config = JSON.parse(readFileSync(path.join(env.home, "config.json"), "utf8")) as {
    daemon?: { hostnames?: unknown };
  };
  return config.daemon?.hostnames ?? null;
}

/** Status of GET / on the daemon itself with `host` as the Host header; 0 when the request fails. */
function statusForHost(host: string): Promise<number> {
  const { promise, resolve } = Promise.withResolvers<number>();
  const req = request({ host: "127.0.0.1", port: env.port, path: "/", headers: { host: `${host}:${env.port}` } }, (res) => {
    res.resume();
    resolve(res.statusCode ?? 0);
  });
  req.on("error", () => resolve(0));
  req.end();
  return promise;
}

test("the daemon's web UI answers through the plugin's forward", async ({ page }) => {
  await expect
    .poll(async () => {
      try {
        return (await fetch(FORWARDED, { signal: AbortSignal.timeout(2_000) })).status;
      } catch {
        return 0;
      }
    })
    .toBe(200);

  await page.goto(FORWARDED);
  await expect(page.getByTestId("sidebar-project-workspace-list-scroll")).toBeVisible({ timeout: 60_000 });
});

test("the plugin adds the machine's names to daemon.hostnames, and the running daemon accepts them", async ({
  client,
}) => {
  // Written with `paseo daemon config set daemon.hostnames ... --home <daemon home>` (PASEO_CLI).
  await expect.poll(hostnames).toEqual(["e2e-host", NAME]);
  const logs = JSON.stringify(await client.getPluginLogs("tailscale-listener"));
  expect(logs).toContain(`Added e2e-host, ${NAME} to daemon.hostnames.`);
  // The plugin saves the names while the daemon is still loading plugins, so the daemon applies them
  // only when the plugin saves again once it is ready (10 s retries). Until then a non-IP Host
  // header that only daemon.hostnames would allow gets 403.
  await expect.poll(() => statusForHost(NAME), { timeout: 30_000 }).toBe(200);
  expect(await statusForHost("not-listed.e2e-tailnet.ts.net")).toBe(403);
});
