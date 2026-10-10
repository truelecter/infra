import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AGENTS_GROUP,
  appBundle,
  buildSnapshot,
  processName,
  type AgentInfo,
  type ProcessInfo,
  type SnapshotInput,
} from "./model.ts";
import type { TopUsage } from "./parse.ts";

const MB = 1024 ** 2;
const DAY = 86400;
const OMP = "/nix/store/abc-omp-18.6.1/lib/omp/omp";
const OLD_OMP = "/nix/store/def-omp-18.3.2/lib/omp/omp";
const SESSION_A = "01a106ff-c0cf-7305-bb0d-1deaa77444ff";
const SESSION_B = "01a10def-1503-70b6-8508-b64d478aa319";
const CURSOR = "/Applications/Cursor.app";

function proc(
  pid: number,
  ppid: number,
  exe: string,
  options: Partial<ProcessInfo> = {},
): ProcessInfo {
  return {
    pid,
    ppid,
    uid: 501,
    ageSeconds: 60,
    comm: exe,
    args: exe,
    exe,
    ...options,
  };
}

function input(
  processes: ProcessInfo[],
  usage: Record<number, Partial<TopUsage>>,
  overrides: Partial<SnapshotInput> = {},
): SnapshotInput {
  const counters = (values: Record<string, number>) => ({
    pageSize: 16384,
    counters: new Map(Object.entries(values)),
  });
  return {
    now: new Date("2026-10-06T00:00:00Z"),
    sampleSeconds: 2,
    processes,
    top: {
      cpu: { userPercent: 20, sysPercent: 30, idlePercent: 50 },
      processes: new Map(
        Object.entries(usage).map(([pid, value]) => [
          Number(pid),
          { memBytes: 0, compressedBytes: 0, cpuPercent: 0, ...value },
        ]),
      ),
    },
    vmBefore: counters({ Swapins: 1000, Pageins: 50 }),
    vmAfter: counters({
      Swapins: 1620,
      Pageins: 50,
      "Pages free": 100,
      "Anonymous pages": 1000,
    }),
    vmSeconds: 2,
    sysctl: new Map([
      ["hw.memsize", String(16 * 1024 * MB)],
      ["hw.ncpu", "10"],
      [
        "vm.swapusage",
        "total = 9216.00M  used = 8670.62M  free = 545.38M  (encrypted)",
      ],
      ["vm.loadavg", "{ 19.08 19.09 16.08 }"],
      ["kern.memorystatus_vm_pressure_level", "2"],
      ["kern.memorystatus_level", "34"],
    ]),
    openFiles: new Map(),
    agents: [],
    agentsError: null,
    installedOmpVersion: "18.6.1",
    uid: 501,
    ...overrides,
  };
}

test("the outermost bundle names the app, so helpers fold into it", () => {
  assert.deepEqual(
    appBundle(
      `${CURSOR}/Contents/Frameworks/Cursor Helper (Renderer).app/Contents/MacOS/Cursor Helper (Renderer)`,
    ),
    {
      name: "Cursor",
      bundlePath: CURSOR,
    },
  );
  assert.equal(appBundle("/usr/bin/top"), null);
});

test("interpreters are named after their script, flags are not a script", () => {
  assert.equal(
    processName(
      "/usr/local/bin/node",
      "/usr/local/bin/node /srv/server.js --port 1",
    ),
    "node server.js",
  );
  assert.equal(
    processName(OMP, `${OMP} __omp_worker_daemon_broker`),
    "omp __omp_worker_daemon_broker",
  );
  assert.equal(
    processName(OMP, `${OMP} --mode rpc-ui --session x.jsonl`),
    "omp",
  );
  assert.equal(processName("Paseo Daemon", "Paseo Daemon"), "Paseo Daemon");
});

test("apps group helpers and the bundle-less children they start; agent sessions are their own group", () => {
  const processes = [
    proc(10, 1, `${CURSOR}/Contents/MacOS/Cursor`),
    proc(
      11,
      10,
      `${CURSOR}/Contents/Frameworks/Cursor Helper (Renderer).app/Contents/MacOS/Cursor Helper (Renderer)`,
    ),
    proc(12, 11, "/usr/local/bin/node", {
      args: "/usr/local/bin/node /x/tsserver.js",
    }),
    proc(20, 1, "/Applications/Paseo.app/Contents/MacOS/Paseo"),
    proc(
      21,
      20,
      "/Applications/Paseo.app/Contents/Frameworks/Paseo Helper.app/Contents/MacOS/Paseo Helper",
      { comm: "Paseo Daemon", args: "Paseo Daemon" },
    ),
    proc(30, 21, OMP, {
      args: `${OMP} --mode rpc-ui --session /h/.omp/agent/sessions/-p/2026_${SESSION_A}.jsonl`,
    }),
    proc(31, 30, "/h/.local/bin/rbks-mcp-server"),
    proc(32, 31, "/bin/sh"),
    proc(40, 1, "/usr/sbin/cfprefsd"),
  ];
  const snapshot = buildSnapshot(
    input(processes, {
      10: { memBytes: 100 * MB },
      11: { memBytes: 300 * MB, compressedBytes: 200 * MB, cpuPercent: 5 },
      12: { memBytes: 50 * MB, cpuPercent: 1.5 },
      20: { memBytes: 200 * MB },
      21: { memBytes: 100 * MB },
      30: { memBytes: 150 * MB, cpuPercent: 2 },
      31: { memBytes: 40 * MB },
      32: { memBytes: 1 * MB },
      40: { memBytes: 5 * MB },
    }),
  );
  const byName = new Map(snapshot.apps.map((app) => [app.name, app]));
  assert.deepEqual(
    snapshot.apps.map((app) => app.name),
    ["Cursor", "Paseo", AGENTS_GROUP, "cfprefsd"],
  );
  assert.equal(byName.get("Cursor")?.memBytes, 450 * MB);
  assert.equal(byName.get("Cursor")?.compressedBytes, 200 * MB);
  assert.equal(byName.get("Cursor")?.cpuPercent, 6.5);
  assert.equal(byName.get("Cursor")?.processCount, 3);
  assert.equal(byName.get("Cursor")?.bundlePath, CURSOR);
  // The daemon renamed itself; its real executable still places it in Paseo, but its agent session doesn't.
  assert.equal(byName.get("Paseo")?.memBytes, 300 * MB);
  assert.equal(byName.get(AGENTS_GROUP)?.memBytes, 191 * MB);
  assert.equal(byName.get(AGENTS_GROUP)?.kind, "agents");
  assert.equal(byName.get("cfprefsd")?.kind, "process");
});

test("sessions match Paseo agents by session id, from --session or the open session file", () => {
  const agents: AgentInfo[] = [
    {
      id: "agent-a",
      title: "Fix login",
      status: "idle",
      archived: false,
      cwd: "/p",
      sessionId: SESSION_A,
      lastActivityAt: "2026-10-05T23:00:00Z",
    },
    {
      id: "agent-b",
      title: "Old chat",
      status: "closed",
      archived: true,
      cwd: "/q",
      sessionId: SESSION_B,
      lastActivityAt: null,
    },
    {
      id: "agent-c",
      title: "Not running",
      status: "idle",
      archived: false,
      cwd: "/r",
      sessionId: "other",
      lastActivityAt: null,
    },
  ];
  const processes = [
    proc(30, 21, OMP, {
      args: `${OMP} --mode rpc-ui --session /h/.omp/agent/sessions/-p/2026-10-04T12-59-46-767Z_${SESSION_A}.jsonl`,
    }),
    proc(31, 30, "/h/.local/bin/rbks-mcp-server"),
    proc(50, 21, OLD_OMP, {
      args: `${OLD_OMP} --mode rpc-ui --approval-mode yolo`,
      ageSeconds: 3 * DAY,
    }),
    proc(60, 21, OMP, { args: `${OMP} --mode rpc-ui` }),
  ];
  const snapshot = buildSnapshot(
    input(
      processes,
      {
        30: { memBytes: 150 * MB },
        31: { memBytes: 40 * MB, compressedBytes: 30 * MB },
        50: { memBytes: 600 * MB },
        60: { memBytes: 10 * MB },
      },
      {
        agents,
        openFiles: new Map([
          [
            50,
            [
              {
                fd: "12w",
                name: `/h/.omp/agent/sessions/-q/2026-10-05T21-18-54-723Z_${SESSION_B}.jsonl`,
              },
            ],
          ],
          [
            60,
            [
              {
                fd: "12w",
                name: `/h/.omp/agent/sessions/-r/2026_${SESSION_B}/Subagent.jsonl`,
              },
            ],
          ],
        ]),
      },
    ),
  );
  const [old, live, unknown] = snapshot.agents.sessions;
  assert.equal(old?.agentId, "agent-b");
  assert.equal(old?.archived, true);
  assert.equal(old?.ompVersion, "18.3.2");
  assert.equal(old?.outdated, true);
  assert.equal(live?.agentId, "agent-a");
  assert.equal(live?.title, "Fix login");
  assert.equal(live?.outdated, false);
  assert.equal(live?.memBytes, 190 * MB);
  assert.equal(live?.compressedBytes, 30 * MB);
  assert.deepEqual(
    live?.children.map((child) => child.pid),
    [31],
  );
  // A subagent's file under a session folder is not the session's own file.
  assert.equal(unknown?.agentId, null);
  assert.equal(snapshot.agents.liveAgents, 2);
  assert.equal(snapshot.agents.archivedAgents, 1);
});

test("without an installed omp, the newest running version is the reference", () => {
  const processes = [
    proc(50, 21, OLD_OMP, { args: `${OLD_OMP} --mode rpc-ui` }),
    proc(60, 21, OMP, { args: `${OMP} --mode rpc-ui` }),
  ];
  const snapshot = buildSnapshot(
    input(processes, {}, { installedOmpVersion: null }),
  );
  assert.equal(snapshot.agents.installedOmpVersion, "18.6.1");
  assert.deepEqual(
    snapshot.agents.sessions
      .map((session) => [session.pid, session.outdated])
      .sort(),
    [
      [50, true],
      [60, false],
    ],
  );
});

test("outliers: a day old and big, or a day old, detached, and smaller", () => {
  const processes = [
    proc(10, 1, `${CURSOR}/Contents/MacOS/Cursor`, { ageSeconds: 2 * DAY }),
    proc(70, 1, "/h/.opencode/bin/opencode", {
      args: "/h/.opencode/bin/opencode serve",
      ageSeconds: 8 * DAY,
    }),
    proc(71, 1, "/usr/libexec/logd", { ageSeconds: 36 * DAY, uid: 0 }),
    proc(72, 1, "/h/.local/bin/young", { ageSeconds: DAY - 1 }),
    proc(73, 1, "/System/Library/WindowServer", {
      ageSeconds: 36 * DAY,
      uid: 88,
    }),
  ];
  const snapshot = buildSnapshot(
    input(processes, {
      10: { memBytes: 400 * MB },
      70: { memBytes: 80 * MB },
      71: { memBytes: 80 * MB },
      72: { memBytes: 2000 * MB },
      73: { memBytes: 1500 * MB },
    }),
  );
  assert.deepEqual(
    snapshot.outliers.map((outlier) => [
      outlier.pid,
      outlier.detached,
      outlier.killable,
    ]),
    [
      [73, false, false],
      [70, true, true],
    ],
  );
});

test("memory pressure, swap, and rates over the sample window", () => {
  const snapshot = buildSnapshot(input([], {}));
  assert.equal(snapshot.memory.pressure, "warning");
  assert.equal(snapshot.memory.availablePercent, 34);
  assert.equal(snapshot.memory.rates.swapinsPerSec, 310);
  assert.equal(snapshot.memory.rates.pageinsPerSec, 0);
  assert.equal(snapshot.memory.freeBytes, 100 * 16384);
  assert.equal(snapshot.memory.appBytes, 1000 * 16384);
  assert.equal(snapshot.memory.swapTotalBytes, 9216 * MB);
  assert.deepEqual(snapshot.cpu.load, [19.08, 19.09, 16.08]);
  assert.equal(snapshot.cpu.cores, 10);
});
