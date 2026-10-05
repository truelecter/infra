import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";
import type { VpnConfig } from "../shared/vpn.ts";

const run = promisify(execFile);

export const TUNNELBLICK_APP = "/Applications/Tunnelblick.app";
const OSASCRIPT = "/usr/bin/osascript";
const TIMEOUT_MS = 15_000;

export type TunnelblickState =
  | { tunnelblick: "missing"; configs: [] }
  | { tunnelblick: "stopped"; configs: [] }
  | { tunnelblick: "running"; configs: VpnConfig[] };

// `is running` does not launch Tunnelblick; the `tell` block only runs when it is up.
// Tunnelblick can't iterate `configurations` directly, so read each property as a list.
const STATUS_SCRIPT = `
if application "Tunnelblick" is not running then return "STOPPED"
tell application "Tunnelblick"
  set names to name of configurations
  set states to state of configurations
  set ins to bytesIn of configurations
  set outs to bytesOut of configurations
end tell
set out to "RUNNING" & linefeed
repeat with i from 1 to count of names
  set out to out & (item i of names) & tab & (item i of states) & tab & (item i of ins) & tab & (item i of outs) & linefeed
end repeat
return out`;

/** Parses the output of STATUS_SCRIPT: a RUNNING or STOPPED line, then one tab-separated line per configuration. */
export function parseStatus(output: string): TunnelblickState {
  const [head, ...lines] = output.trim().split("\n");
  if (head === "STOPPED") return { tunnelblick: "stopped", configs: [] };
  if (head !== "RUNNING") throw new Error(`Unexpected Tunnelblick status output: ${output.slice(0, 200)}`);
  const configs = lines
    .filter((line) => line.trim())
    .map((line) => {
      const [name = "", state = "", bytesIn = "0", bytesOut = "0"] = line.split("\t");
      return { name, state, bytesIn: Number(bytesIn) || 0, bytesOut: Number(bytesOut) || 0 };
    });
  return { tunnelblick: "running", configs };
}

async function osascript(lines: string[], args: string[] = []): Promise<string> {
  const { stdout } = await run(OSASCRIPT, [...lines.flatMap((line) => ["-e", line]), ...args], {
    timeout: TIMEOUT_MS,
  });
  return stdout;
}

export async function readStatus(): Promise<TunnelblickState> {
  const installed = await access(TUNNELBLICK_APP).then(
    () => true,
    () => false,
  );
  if (!installed) return { tunnelblick: "missing", configs: [] };
  return parseStatus(await osascript([STATUS_SCRIPT]));
}

/** Runs Tunnelblick's `connect` or `disconnect` verb; the name is passed as an argument, not spliced into the script. */
async function verb(verbName: "connect" | "disconnect", config: string): Promise<void> {
  const result = await osascript(
    ["on run argv", `tell application "Tunnelblick" to ${verbName} (item 1 of argv)`, "end run"],
    [config],
  );
  if (result.trim() !== "true") throw new Error(`Tunnelblick could not ${verbName} "${config}"`);
}

/** Starts connecting; Tunnelblick launches if needed. Returns before the connection is up. */
export const connect = (config: string) => verb("connect", config);
export const disconnect = (config: string) => verb("disconnect", config);

export async function launch(): Promise<void> {
  await run("/usr/bin/open", ["-g", TUNNELBLICK_APP], { timeout: TIMEOUT_MS });
}
