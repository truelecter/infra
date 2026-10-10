import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import { userInfo } from "node:os";
import { promisify } from "node:util";
import {
  ompVersion,
  type AgentInfo,
  type ProcessInfo,
  type SnapshotInput,
} from "./model.ts";
import {
  parseArgs,
  parseLsof,
  parsePs,
  parseSysctl,
  parseTop,
  parseVmStat,
  type OpenFile,
} from "./parse.ts";

const exec = promisify(execFile);

// Absolute paths: the daemon's PATH can put other tools first (a Rust `top` has different flags).
const TOP = "/usr/bin/top";
const VM_STAT = "/usr/bin/vm_stat";
const SYSCTL = "/usr/sbin/sysctl";
const PS = "/bin/ps";
const LSOF = "/usr/sbin/lsof";
const MAX_BUFFER = 32 * 1024 * 1024;

export const SAMPLE_SECONDS = 2;
const SYSCTL_NAMES = [
  "hw.memsize",
  "hw.ncpu",
  "vm.swapusage",
  "vm.loadavg",
  "kern.memorystatus_vm_pressure_level",
  "kern.memorystatus_level",
];

async function run(
  file: string,
  args: string[],
  { allowFailure = false } = {},
): Promise<string> {
  try {
    const { stdout } = await exec(file, args, {
      maxBuffer: MAX_BUFFER,
      timeout: 30_000,
    });
    return stdout;
  } catch (error) {
    // lsof exits 1 when one of the pids has gone away; what it printed is still right.
    if (
      allowFailure &&
      error &&
      typeof error === "object" &&
      "stdout" in error &&
      typeof error.stdout === "string"
    ) {
      return error.stdout;
    }
    throw error;
  }
}

/** The omp that a new agent session would start, from the per-user Nix profile. */
async function installedOmpVersion(): Promise<string | null> {
  try {
    return ompVersion(
      await realpath(`/etc/profiles/per-user/${userInfo().username}/bin/omp`),
    );
  } catch {
    return null;
  }
}

export async function listProcesses(): Promise<ProcessInfo[]> {
  const [ps, args] = await Promise.all([
    run(PS, ["-axww", "-o", "pid=,ppid=,uid=,etime=,comm="]),
    run(PS, ["-axww", "-o", "pid=,args="]),
  ]);
  const commandLines = parseArgs(args);
  return parsePs(ps).map((entry) => ({
    ...entry,
    args: commandLines.get(entry.pid) ?? entry.comm,
    exe: entry.comm,
  }));
}

/** Open files of the given pids, in one lsof call. */
async function openFiles(pids: number[]): Promise<Map<number, OpenFile[]>> {
  if (pids.length === 0) return new Map();
  return parseLsof(
    await run(LSOF, ["-w", "-Fpfn", "-p", pids.join(",")], {
      allowFailure: true,
    }),
  );
}

/**
 * Takes one sample: vm_stat before and after a two-reading `top` run (CPU and paging rates need a
 * time window), plus ps, sysctl, and lsof for the processes ps can't name.
 */
export async function collect(
  agents: () => Promise<AgentInfo[]>,
): Promise<SnapshotInput> {
  const vmBefore = parseVmStat(await run(VM_STAT, []));
  const started = performance.now();
  const [top, processes, sysctl, installed, agentList] = await Promise.all([
    run(TOP, [
      "-l",
      "2",
      "-s",
      String(SAMPLE_SECONDS),
      "-n",
      "100000",
      "-stats",
      "pid,mem,cmprs,cpu",
    ]),
    listProcesses(),
    run(SYSCTL, SYSCTL_NAMES),
    installedOmpVersion(),
    agents().then(
      (list) => ({ list, error: null }),
      (error: unknown) => ({
        list: null,
        error: error instanceof Error ? error.message : String(error),
      }),
    ),
  ]);
  const vmAfter = parseVmStat(await run(VM_STAT, []));
  const vmSeconds = (performance.now() - started) / 1000;

  // Processes that renamed themselves (`Paseo Daemon`, Cursor's extension hosts) need lsof for
  // their executable; agent sessions started without `--session` for their session file.
  const unnamed = processes
    .filter((entry) => !entry.comm.startsWith("/"))
    .map((entry) => entry.pid);
  const sessions = processes
    .filter(
      (entry) =>
        /\s--mode\s+rpc-ui(?:\s|$)/.test(entry.args) &&
        !/\s--session\s/.test(entry.args),
    )
    .map((entry) => entry.pid);
  const files = await openFiles([...new Set([...unnamed, ...sessions])]);
  for (const entry of processes) {
    const exe = files.get(entry.pid)?.find((file) => file.fd === "txt")?.name;
    if (exe && !entry.comm.startsWith("/")) entry.exe = exe;
  }

  return {
    now: new Date(),
    sampleSeconds: SAMPLE_SECONDS,
    processes,
    top: parseTop(top),
    vmBefore,
    vmAfter,
    vmSeconds,
    sysctl: parseSysctl(sysctl),
    openFiles: files,
    agents: agentList.list,
    agentsError: agentList.error,
    installedOmpVersion: installed,
    uid: process.getuid?.() ?? -1,
  };
}
