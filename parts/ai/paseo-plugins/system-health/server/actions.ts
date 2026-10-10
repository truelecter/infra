import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import { listProcesses } from "./collect.ts";
import { appBundle, processName } from "./model.ts";

const exec = promisify(execFile);
const OSASCRIPT = "/usr/bin/osascript";

/**
 * Sends SIGTERM to `pid` if it still is the process the screen showed (same name), runs as this
 * user, and is not Paseo itself.
 */
export async function killProcess(pid: number, name: string): Promise<void> {
  const processes = await listProcesses();
  const target = processes.find((entry) => entry.pid === pid);
  if (!target || processName(target.comm, target.args) !== name) {
    throw new Error(`Process ${pid} (${name}) is no longer running`);
  }
  if (target.uid !== process.getuid?.())
    throw new Error(`${name} runs as another user`);
  const byPid = new Map(processes.map((entry) => [entry.pid, entry]));
  for (
    let current = byPid.get(process.pid);
    current && current.pid > 1;
    current = byPid.get(current.ppid)
  ) {
    if (current.pid === pid) throw new Error(`${name} runs Paseo itself`);
  }
  process.kill(pid, "SIGTERM");
}

/** Asks an app to quit, the same as Quit in its menu; it may ask to save first. */
export async function quitApp(bundlePath: string): Promise<void> {
  if (appBundle(bundlePath)?.bundlePath !== bundlePath)
    throw new Error(`${bundlePath} is not an app bundle`);
  if (appBundle(process.execPath)?.bundlePath === bundlePath) {
    throw new Error(
      "Quitting Paseo here would stop every agent; quit it from its menu",
    );
  }
  if (!(await stat(bundlePath)).isDirectory())
    throw new Error(`${bundlePath} is not an app bundle`);
  await exec(
    OSASCRIPT,
    [
      "-e",
      "on run argv",
      "-e",
      "tell application (item 1 of argv) to quit",
      "-e",
      "end run",
      bundlePath,
    ],
    {
      timeout: 30_000,
    },
  );
}
