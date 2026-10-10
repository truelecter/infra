/** Parsers for the macOS tools the plugin samples: top, vm_stat, sysctl, ps, and lsof. */

const UNITS: Record<string, number> = {
  B: 1,
  K: 1024,
  M: 1024 ** 2,
  G: 1024 ** 3,
  T: 1024 ** 4,
};

/** A size as top prints it, such as `2929M`, `560K+`, or `0B`. */
export function parseSize(text: string): number {
  const match = /^(\d+(?:\.\d+)?)([BKMGT])[+-]?$/.exec(text.trim());
  if (!match) throw new Error(`Unexpected size: ${text}`);
  return Math.round(Number(match[1]) * UNITS[match[2]!]!);
}

export interface TopUsage {
  memBytes: number;
  compressedBytes: number;
  cpuPercent: number;
}

export interface TopSample {
  cpu: { userPercent: number; sysPercent: number; idlePercent: number };
  processes: Map<number, TopUsage>;
}

/**
 * Output of `top -l 2 -s <n> -stats pid,mem,cmprs,cpu`. Only the last sample counts: top's first
 * sample has no CPU deltas yet.
 */
export function parseTop(output: string): TopSample {
  const samples = output
    .split(/^(?=Processes: )/m)
    .filter((part) => part.startsWith("Processes: "));
  const last = samples.at(-1);
  if (!last) throw new Error("top printed no sample");
  const cpuLine =
    /^CPU usage: ([\d.]+)% user, ([\d.]+)% sys, ([\d.]+)% idle/m.exec(last);
  if (!cpuLine) throw new Error("top printed no CPU usage line");
  const processes = new Map<number, TopUsage>();
  const lines = last.split("\n");
  const header = lines.findIndex((line) =>
    /^PID\s+MEM\s+CMPRS\s+%CPU/.test(line),
  );
  if (header < 0) throw new Error("top printed no process table");
  for (const line of lines.slice(header + 1)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 4) continue;
    const pid = Number(fields[0]);
    if (!Number.isInteger(pid)) continue;
    processes.set(pid, {
      memBytes: parseSize(fields[1]!),
      compressedBytes: parseSize(fields[2]!),
      cpuPercent: Number(fields[3]),
    });
  }
  return {
    cpu: {
      userPercent: Number(cpuLine[1]),
      sysPercent: Number(cpuLine[2]),
      idlePercent: Number(cpuLine[3]),
    },
    processes,
  };
}

export interface VmStat {
  pageSize: number;
  /** Counters by label, such as `Pages free` or `Swapins`. */
  counters: Map<string, number>;
}

export function parseVmStat(output: string): VmStat {
  const pageSize = /page size of (\d+) bytes/.exec(output);
  if (!pageSize) throw new Error("vm_stat printed no page size");
  const counters = new Map<string, number>();
  for (const line of output.split("\n")) {
    const match = /^"?([^":]+)"?:\s+(\d+)\.?$/.exec(line.trim());
    if (match) counters.set(match[1]!, Number(match[2]));
  }
  return { pageSize: Number(pageSize[1]), counters };
}

/** `sysctl name ...` output, one `name: value` per line. */
export function parseSysctl(output: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of output.split("\n")) {
    const colon = line.indexOf(": ");
    if (colon > 0)
      values.set(line.slice(0, colon), line.slice(colon + 2).trim());
  }
  return values;
}

/** `vm.swapusage`: `total = 9216.00M  used = 8670.62M  free = 545.38M  (encrypted)`. */
export function parseSwap(value: string): {
  usedBytes: number;
  totalBytes: number;
} {
  const total = /total = ([\d.]+[BKMGT])/.exec(value);
  const used = /used = ([\d.]+[BKMGT])/.exec(value);
  if (!total || !used) throw new Error(`Unexpected vm.swapusage: ${value}`);
  return { usedBytes: parseSize(used[1]!), totalBytes: parseSize(total[1]!) };
}

/** `vm.loadavg`: `{ 9.41 14.95 14.96 }`. */
export function parseLoad(value: string): [number, number, number] {
  const numbers = value.replace(/[{}]/g, " ").trim().split(/\s+/).map(Number);
  if (numbers.length < 3 || numbers.some((n) => !Number.isFinite(n)))
    throw new Error(`Unexpected vm.loadavg: ${value}`);
  return [numbers[0]!, numbers[1]!, numbers[2]!];
}

/** ps's elapsed time, `[[dd-]hh:]mm:ss`, in seconds. */
export function parseEtime(text: string): number {
  const match = /^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/.exec(text.trim());
  if (!match) throw new Error(`Unexpected elapsed time: ${text}`);
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86400 +
    Number(hours ?? 0) * 3600 +
    Number(minutes) * 60 +
    Number(seconds)
  );
}

export interface PsEntry {
  pid: number;
  ppid: number;
  uid: number;
  ageSeconds: number;
  /** The executable path, or the title a process gave itself (`Paseo Daemon`). */
  comm: string;
}

/** `ps -axww -o pid=,ppid=,uid=,etime=,comm=`. */
export function parsePs(output: string): PsEntry[] {
  const entries: PsEntry[] = [];
  for (const line of output.split("\n")) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s(.*)$/.exec(line);
    if (!match) continue;
    entries.push({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      uid: Number(match[3]),
      ageSeconds: parseEtime(match[4]!),
      comm: match[5]!.trim(),
    });
  }
  return entries;
}

/** `ps -axww -o pid=,args=`: the full command line by pid. */
export function parseArgs(output: string): Map<number, string> {
  const args = new Map<number, string>();
  for (const line of output.split("\n")) {
    const match = /^\s*(\d+)\s(.*)$/.exec(line);
    if (match) args.set(Number(match[1]), match[2]!.trim());
  }
  return args;
}

export interface OpenFile {
  fd: string;
  name: string;
}

/** `lsof -Fpfn`: open files by pid, in lsof's order (the executable is the first `txt`). */
export function parseLsof(output: string): Map<number, OpenFile[]> {
  const files = new Map<number, OpenFile[]>();
  let current: OpenFile[] | undefined;
  let fd = "";
  for (const line of output.split("\n")) {
    const tag = line[0];
    const value = line.slice(1);
    if (tag === "p") {
      current = [];
      files.set(Number(value), current);
    } else if (tag === "f") {
      fd = value;
    } else if (tag === "n" && current) {
      current.push({ fd, name: value });
    }
  }
  return files;
}
