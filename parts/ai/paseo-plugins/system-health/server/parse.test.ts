import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseEtime,
  parseLsof,
  parsePs,
  parseSize,
  parseSwap,
  parseTop,
  parseVmStat,
} from "./parse.ts";

const TOP = `Processes: 746 total, 7 running, 739 sleeping, 5638 threads 
2026/10/06 00:24:06
Load Avg: 19.08, 19.09, 16.08 
CPU usage: 26.19% user, 30.70% sys, 43.9% idle 
PhysMem: 15G used (4254M wired, 6181M compressor), 67M unused.

PID    MEM   CMPRS %CPU
47743  2929M 2161M 0.0
48433  1402M 1395M 0.0
Processes: 746 total, 10 running, 736 sleeping, 5648 threads 
2026/10/06 00:24:08
Load Avg: 19.08, 19.09, 16.08 
CPU usage: 29.18% user, 28.23% sys, 42.57% idle 
PhysMem: 15G used (4334M wired, 6241M compressor), 68M unused.

PID    MEM    CMPRS  %CPU
47743  2930M+ 2161M  12.5
48433  1402M  1395M- 0.3
0      48K    0B     101.2
`;

test("top: only the last sample counts, sizes keep their change markers out", () => {
  const sample = parseTop(TOP);
  assert.deepEqual(sample.cpu, {
    userPercent: 29.18,
    sysPercent: 28.23,
    idlePercent: 42.57,
  });
  assert.deepEqual(sample.processes.get(47743), {
    memBytes: 2930 * 1024 ** 2,
    compressedBytes: 2161 * 1024 ** 2,
    cpuPercent: 12.5,
  });
  assert.equal(sample.processes.get(48433)?.compressedBytes, 1395 * 1024 ** 2);
  assert.equal(sample.processes.get(0)?.memBytes, 48 * 1024);
  assert.equal(sample.processes.size, 3);
});

test("top: output without a process table is an error, not an empty sample", () => {
  assert.throws(
    () =>
      parseTop(
        "Processes: 1 total\nCPU usage: 1.0% user, 1.0% sys, 98.0% idle\n",
      ),
    /process table/,
  );
});

test("sizes in binary units, fractions included; unknown units rejected", () => {
  assert.equal(parseSize("0B"), 0);
  assert.equal(parseSize("12G"), 12 * 1024 ** 3);
  assert.equal(parseSize("1.5T"), 1.5 * 1024 ** 4);
  assert.throws(() => parseSize("12 MB"));
});

test("vm_stat: page size and counters, quoted labels included", () => {
  const vm =
    parseVmStat(`Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                    22619.
"Translation faults":                    61760332853.
Pages occupied by compressor:                 409932.
Swapins:                                   460066505.
`);
  assert.equal(vm.pageSize, 16384);
  assert.equal(vm.counters.get("Pages free"), 22619);
  assert.equal(vm.counters.get("Translation faults"), 61760332853);
  assert.equal(vm.counters.get("Pages occupied by compressor"), 409932);
  assert.equal(vm.counters.get("Swapins"), 460066505);
});

test("swap usage in MB", () => {
  assert.deepEqual(
    parseSwap("total = 9216.00M  used = 8670.62M  free = 545.38M  (encrypted)"),
    {
      totalBytes: 9216 * 1024 ** 2,
      usedBytes: Math.round(8670.62 * 1024 ** 2),
    },
  );
});

test("ps elapsed time with and without days and hours", () => {
  assert.equal(parseEtime("00:07"), 7);
  assert.equal(parseEtime("12:11"), 731);
  assert.equal(parseEtime("08:05:18"), 8 * 3600 + 5 * 60 + 18);
  assert.equal(parseEtime("36-05:15:32"), 36 * 86400 + 5 * 3600 + 15 * 60 + 32);
  assert.throws(() => parseEtime("yesterday"));
});

test("ps: executable paths and self-set titles keep their spaces", () => {
  const entries = parsePs(
    [
      "    1     0     0 36-05:15:32 /sbin/launchd",
      " 2362 48433   502    07:42:49 /Applications/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin).app/Contents/MacOS/Cursor Helper (Plugin)",
      "25417 21264   502    09:07:03 Paseo Daemon",
    ].join("\n"),
  );
  assert.deepEqual(entries[1], {
    pid: 2362,
    ppid: 48433,
    uid: 502,
    ageSeconds: 7 * 3600 + 42 * 60 + 49,
    comm: "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin).app/Contents/MacOS/Cursor Helper (Plugin)",
  });
  assert.equal(entries[2]?.comm, "Paseo Daemon");
});

test("lsof: files grouped by pid with their descriptor", () => {
  const files = parseLsof(
    "p25417\nfcwd\nn/Users/me\nftxt\nn/Applications/Paseo.app/Contents/MacOS/Paseo\np99\nftxt\nn/bin/zsh\n",
  );
  assert.deepEqual(files.get(25417), [
    { fd: "cwd", name: "/Users/me" },
    { fd: "txt", name: "/Applications/Paseo.app/Contents/MacOS/Paseo" },
  ]);
  assert.deepEqual(files.get(99), [{ fd: "txt", name: "/bin/zsh" }]);
});
