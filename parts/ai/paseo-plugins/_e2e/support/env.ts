import { readFileSync } from "node:fs";
import path from "node:path";

// Set by the harness (run.sh) for the isolated daemon it started.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: run the suite through \`nix run .#paseo-plugins-e2e\``);
  return value;
}

export const env = {
  /** Temp root: daemon home, fake HOME, backlog folder, Playwright output. */
  root: required("PASEO_E2E_ROOT"),
  /** The daemon's PASEO_HOME (config.json, plugin-settings/). */
  home: required("PASEO_E2E_HOME"),
  /** The HOME the daemon and its plugins run with. */
  fakeHome: required("PASEO_E2E_FAKE_HOME"),
  port: Number(required("PASEO_E2E_PORT")),
  serverId: required("PASEO_E2E_SERVER_ID"),
  backlogDir: required("PASEO_E2E_BACKLOG_DIR"),
  cli: required("PASEO_E2E_CLI"),
};

/** The folder the daemon loads a plugin from, per the generated config.json. */
export function pluginPath(id: string): string {
  const config = JSON.parse(readFileSync(path.join(env.home, "config.json"), "utf8")) as {
    plugins?: Record<string, { path?: string }>;
  };
  const folder = config.plugins?.[id]?.path;
  if (!folder) throw new Error(`plugin ${id} is not in ${env.home}/config.json`);
  return folder;
}
