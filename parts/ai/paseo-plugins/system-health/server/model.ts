import type { AppGroup, Memory, Outlier, ProcessRow, Session, Snapshot } from "../shared/health.ts";
import { parseLoad, parseSwap, type OpenFile, type PsEntry, type TopSample, type VmStat } from "./parse.ts";

export const APP_LIMIT = 15;
export const PROCESSES_PER_APP = 10;
export const OUTLIER_LIMIT = 15;
const DAY = 86400;
const MB = 1024 ** 2;
/** A process running for a day or longer with at least this footprint is an outlier. */
export const OUTLIER_MIN_BYTES = 500 * MB;
/** A detached process (see `isDetached`) running for a day counts from this footprint. */
export const DETACHED_MIN_BYTES = 50 * MB;

export const AGENTS_GROUP = "Paseo agents";
const INTERPRETER = /^(?:node|bun|deno|python[\d.]*|ruby|sh|bash|zsh|omp)$/;
const SYSTEM_PREFIXES = ["/System/", "/usr/", "/sbin/", "/bin/", "/Library/", "/private/", "/opt/homebrew/"];
const SESSION_FILE = /\/sessions\/[^/]+\/[^/]+_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/;
const SESSION_ARG = /--session\s+\S*?_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl(?:\s|$)/;

/** One process as ps sees it, with its command line and resolved executable. */
export interface ProcessInfo extends PsEntry {
  args: string;
  /** Real executable path; the title for processes that renamed themselves and lsof could not resolve. */
  exe: string;
}

/** A Paseo agent, as far as the snapshot needs it. */
export interface AgentInfo {
  id: string;
  title: string | null;
  status: string;
  archived: boolean;
  cwd: string;
  sessionId: string | null;
  lastActivityAt: string | null;
}

export interface SnapshotInput {
  now: Date;
  sampleSeconds: number;
  processes: ProcessInfo[];
  top: TopSample;
  vmBefore: VmStat;
  vmAfter: VmStat;
  /** Seconds between the two vm_stat readings. */
  vmSeconds: number;
  sysctl: Map<string, string>;
  /** Open files of agent sessions started without `--session`, to find their session file. */
  openFiles: Map<number, OpenFile[]>;
  /** null when Paseo's agent list could not be read; `agentsError` says why. */
  agents: AgentInfo[] | null;
  agentsError: string | null;
  installedOmpVersion: string | null;
  uid: number;
}

/** The outermost .app bundle in a path, so helpers fold into their app. */
export function appBundle(path: string): { name: string; bundlePath: string } | null {
  const match = /^(.*?\/([^/]+)\.app)(?:\/|$)/.exec(path);
  return match ? { name: match[2]!, bundlePath: match[1]! } : null;
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/**
 * A short, stable name for a process: its executable name, or the title it set itself, plus the
 * first argument for interpreters when it is not a flag (`node server.js`, `omp __omp_worker_daemon_broker`).
 */
export function processName(comm: string, args: string): string {
  const base = comm.startsWith("/") ? basename(comm) : comm;
  if (!INTERPRETER.test(base)) return base;
  const rest = args.startsWith(comm) ? args.slice(comm.length) : args.split(/\s+/).slice(1).join(" ");
  const first = rest.trim().split(/\s+/)[0];
  return (first && !first.startsWith("-") ? `${base} ${basename(first)}` : base).slice(0, 80);
}

export function isAgentSession(process: ProcessInfo): boolean {
  return basename(process.exe) === "omp" && /\s--mode\s+rpc-ui(?:\s|$)/.test(process.args);
}

/** Version from an omp store path, such as `/nix/store/...-omp-18.6.1/lib/omp/omp`. */
export function ompVersion(exe: string): string | null {
  return /-omp-(\d+\.\d+\.\d+[\w.-]*)\//.exec(exe)?.[1] ?? null;
}

export function sessionIdOf(process: ProcessInfo, openFiles: OpenFile[] | undefined): string | null {
  const fromArgs = SESSION_ARG.exec(process.args)?.[1];
  if (fromArgs) return fromArgs;
  for (const file of openFiles ?? []) {
    const match = SESSION_FILE.exec(file.name);
    if (match) return match[1]!;
  }
  return null;
}

/** Started by launchd, outside any app bundle and the system folders: often left behind by a tool. */
export function isDetached(process: ProcessInfo): boolean {
  return (
    process.ppid === 1 &&
    process.exe.startsWith("/") &&
    !appBundle(process.exe) &&
    !SYSTEM_PREFIXES.some((prefix) => process.exe.startsWith(prefix))
  );
}

function compareVersions(a: string, b: string): number {
  const left = a.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

function memory(input: SnapshotInput): Memory {
  const { vmBefore, vmAfter, vmSeconds, sysctl } = input;
  const pages = (name: string) => (vmAfter.counters.get(name) ?? 0) * vmAfter.pageSize;
  const rate = (name: string) => {
    const delta = (vmAfter.counters.get(name) ?? 0) - (vmBefore.counters.get(name) ?? 0);
    return vmSeconds > 0 ? Math.max(0, delta) / vmSeconds : 0;
  };
  const totalBytes = Number(sysctl.get("hw.memsize") ?? 0);
  const freeBytes = pages("Pages free") + pages("Pages speculative");
  const wiredBytes = pages("Pages wired down");
  const compressorBytes = pages("Pages occupied by compressor");
  const appBytes = pages("Anonymous pages");
  const cachedBytes = pages("File-backed pages");
  const swapUsage = sysctl.get("vm.swapusage");
  const swap = swapUsage ? parseSwap(swapUsage) : { usedBytes: 0, totalBytes: 0 };
  const level = sysctl.get("kern.memorystatus_vm_pressure_level");
  const available = sysctl.get("kern.memorystatus_level");
  return {
    totalBytes,
    freeBytes,
    wiredBytes,
    compressorBytes,
    compressedBytes: pages("Pages stored in compressor"),
    appBytes,
    cachedBytes,
    otherBytes: Math.max(0, totalBytes - freeBytes - wiredBytes - compressorBytes - appBytes - cachedBytes),
    swapUsedBytes: swap.usedBytes,
    swapTotalBytes: swap.totalBytes,
    pressure: level === "1" ? "normal" : level === "2" ? "warning" : level === "4" ? "critical" : "unknown",
    availablePercent: available === undefined ? null : Number(available),
    rates: {
      pageinsPerSec: rate("Pageins"),
      swapinsPerSec: rate("Swapins"),
      swapoutsPerSec: rate("Swapouts"),
      compressionsPerSec: rate("Compressions"),
      decompressionsPerSec: rate("Decompressions"),
    },
  };
}

export function buildSnapshot(input: SnapshotInput): Snapshot {
  const byPid = new Map(input.processes.map((process) => [process.pid, process]));
  const children = new Map<number, ProcessInfo[]>();
  for (const process of input.processes) {
    if (process.pid === process.ppid) continue;
    const list = children.get(process.ppid) ?? [];
    list.push(process);
    children.set(process.ppid, list);
  }
  const usage = (pid: number) => input.top.processes.get(pid) ?? { memBytes: 0, compressedBytes: 0, cpuPercent: 0 };
  const row = (process: ProcessInfo): ProcessRow => ({
    pid: process.pid,
    name: processName(process.comm, process.args),
    ...usage(process.pid),
    ageSeconds: process.ageSeconds,
  });
  const bySize = (a: ProcessRow, b: ProcessRow) => b.memBytes - a.memBytes;

  // Agent sessions own everything they started (MCP servers, workers, shell commands).
  const sessionOf = new Map<number, number>();
  const roots = input.processes.filter(isAgentSession);
  for (const root of roots) {
    const stack = [root];
    while (stack.length) {
      const next = stack.pop()!;
      if (sessionOf.has(next.pid)) continue;
      sessionOf.set(next.pid, root.pid);
      stack.push(...(children.get(next.pid) ?? []));
    }
  }

  // Everything else goes to its app bundle, the nearest ancestor's bundle, or its own name.
  const groupOf = (process: ProcessInfo): { name: string; kind: AppGroup["kind"]; bundlePath: string | null } => {
    if (sessionOf.has(process.pid)) return { name: AGENTS_GROUP, kind: "agents", bundlePath: null };
    const seen = new Set<number>();
    for (let current: ProcessInfo | undefined = process; current && current.pid > 1 && !seen.has(current.pid); ) {
      seen.add(current.pid);
      const bundle = appBundle(current.exe);
      if (bundle) return { ...bundle, kind: "app" };
      current = byPid.get(current.ppid);
    }
    return { name: processName(process.comm, process.args), kind: "process", bundlePath: null };
  };

  const groups = new Map<string, AppGroup>();
  const groupNames = new Map<number, string>();
  for (const process of input.processes) {
    const group = groupOf(process);
    const key = `${group.kind}:${group.bundlePath ?? group.name}`;
    groupNames.set(process.pid, group.name);
    const entry = groups.get(key) ?? { ...group, memBytes: 0, compressedBytes: 0, cpuPercent: 0, processCount: 0, processes: [] };
    const processRow = row(process);
    entry.memBytes += processRow.memBytes;
    entry.compressedBytes += processRow.compressedBytes;
    entry.cpuPercent += processRow.cpuPercent;
    entry.processCount += 1;
    entry.processes.push(processRow);
    groups.set(key, entry);
  }
  const sortedGroups = [...groups.values()].sort((a, b) => b.memBytes - a.memBytes);
  for (const group of sortedGroups) group.processes = group.processes.sort(bySize).slice(0, PROCESSES_PER_APP);
  const apps = sortedGroups.slice(0, APP_LIMIT);
  const rest = sortedGroups.slice(APP_LIMIT);

  const agentsBySession = new Map<string, AgentInfo>();
  for (const agent of input.agents ?? []) if (agent.sessionId) agentsBySession.set(agent.sessionId, agent);
  const runningVersions = roots.map((root) => ompVersion(root.exe)).filter((version): version is string => !!version);
  const installed = input.installedOmpVersion ?? runningVersions.sort(compareVersions).at(-1) ?? null;
  const sessions: Session[] = roots.map((root) => {
    const owned = input.processes.filter((process) => sessionOf.get(process.pid) === root.pid);
    const ownRows = owned.map(row);
    const sessionId = sessionIdOf(root, input.openFiles.get(root.pid));
    const agent = sessionId ? agentsBySession.get(sessionId) : undefined;
    const version = ompVersion(root.exe);
    return {
      pid: root.pid,
      agentId: agent?.id ?? null,
      title: agent?.title ?? null,
      status: agent?.status ?? null,
      archived: agent?.archived ?? false,
      cwd: agent?.cwd ?? null,
      lastActivityAt: agent?.lastActivityAt ?? null,
      ompVersion: version,
      outdated: !!version && !!installed && version !== installed,
      ageSeconds: root.ageSeconds,
      memBytes: ownRows.reduce((sum, item) => sum + item.memBytes, 0),
      compressedBytes: ownRows.reduce((sum, item) => sum + item.compressedBytes, 0),
      cpuPercent: ownRows.reduce((sum, item) => sum + item.cpuPercent, 0),
      children: ownRows.filter((item) => item.pid !== root.pid).sort(bySize),
    };
  });
  sessions.sort((a, b) => b.memBytes - a.memBytes);

  const outliers: Outlier[] = input.processes
    .filter((process) => process.pid > 0 && process.ageSeconds >= DAY)
    .map((process) => ({ process, processRow: row(process), detached: isDetached(process) }))
    .filter(({ processRow, detached }) => processRow.memBytes >= (detached ? DETACHED_MIN_BYTES : OUTLIER_MIN_BYTES))
    .map(({ process, processRow, detached }) => ({
      ...processRow,
      app: groupNames.get(process.pid) ?? processRow.name,
      detached,
      killable: process.uid === input.uid,
    }))
    .sort(bySize)
    .slice(0, OUTLIER_LIMIT);

  const agents = input.agents ?? [];
  return {
    sampledAt: input.now.toISOString(),
    sampleSeconds: input.sampleSeconds,
    memory: memory(input),
    cpu: {
      ...input.top.cpu,
      load: parseLoad(input.sysctl.get("vm.loadavg") ?? "{ 0 0 0 }"),
      cores: Number(input.sysctl.get("hw.ncpu") ?? 0),
    },
    apps,
    otherAppsBytes: rest.reduce((sum, group) => sum + group.memBytes, 0),
    otherAppsCount: rest.length,
    agents: {
      sessions,
      installedOmpVersion: installed,
      liveAgents: agents.filter((agent) => !agent.archived).length,
      archivedAgents: agents.filter((agent) => agent.archived).length,
      error: input.agentsError,
    },
    outliers,
  };
}
