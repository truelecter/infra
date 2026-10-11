import assert from "node:assert/strict";
import { test } from "node:test";
import type { Totals } from "../shared/stats.ts";
import type { CostRow, CostState } from "./cost-explorer.ts";
import { localDate, periodStarts } from "./periods.ts";
import { buildReport, buildView } from "./report.ts";
import type { DbRange, UsageRow } from "./stats.ts";

const now = new Date(2026, 9, 11, 12);
const starts = periodStarts(now);

const row = (
  date: string,
  model: string,
  cost: number,
  output: number,
): UsageRow => ({
  date,
  model,
  folder: "-Projects-agentic-stuff",
  agentType: "main",
  requests: 1,
  failed: 0,
  input: 0,
  output,
  cacheRead: 0,
  cacheWrite: 0,
  cost,
});

const totals: Totals = {
  requests: 3,
  failed: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  cost: 0,
  avgTtftMs: null,
  avgTokensPerSecond: null,
};

const db: DbRange = {
  totals,
  usage: [
    row("2026-10-02", "global.anthropic.claude-opus-5-5", 50, 1_000_000),
    row("2026-10-06", "global.anthropic.claude-opus-5-5", 100, 2_000_000),
    row("2026-10-11", "global.anthropic.claude-opus-5-5", 10, 1_000_000),
  ],
  folderSessions: { "-Projects-agentic-stuff": 2 },
  tools: [],
  lastEntryAt: null,
};

const costRows: CostRow[] = [
  // The account paid $1 per million output tokens, $20 in all, OMP's 3M included.
  {
    date: "2026-10-06",
    usageType:
      "USE1-anthropic.claude-opus-5-5-mantle-output-tokens-global-standard",
    cost: 20,
    tokens: 20_000_000,
  },
  {
    date: "2026-10-06",
    usageType: "USE1-Claude4.5Haiku-output-tokens-cross-region-global",
    cost: 5,
    tokens: 1_000_000,
  },
];
const ok: CostState = {
  status: "ok",
  data: { profile: "p", rows: costRows, fetchedAt: 0 },
};

test("the card shows OMP at the account's prices, also for days Cost Explorer has no data yet", () => {
  const report = buildReport({ now, starts, db, cost: ok, syncProblem: null });
  if (report.status !== "available")
    throw new Error("expected an available report");
  assert.deepEqual(
    report.balances?.map((balance) => balance.used),
    [1, 3, 4],
  );
  const details = Object.fromEntries(
    (report.details ?? []).map((detail) => [detail.id, detail.value]),
  );
  assert.equal(details["account-week"], "$25.00 through 6 Oct");
  assert.equal(details["api-week"], "$110.00");
});

test("the card falls back to the API-equivalent estimate without Cost Explorer", () => {
  const report = buildReport({
    now,
    starts,
    db,
    cost: { status: "unavailable", reason: "ExpiredToken" },
    syncProblem: "omp stats timed out",
  });
  if (report.status !== "available")
    throw new Error("expected an available report");
  assert.deepEqual(
    report.balances?.map((balance) => balance.used),
    [10, 110, 160],
  );
  const aws = report.details?.find((detail) => detail.id === "aws");
  assert.equal(aws?.value, "ExpiredToken");
  assert.equal(aws?.tone, "warning");
  assert.equal(
    report.details?.find((detail) => detail.id === "sync-problem")?.tone,
    "warning",
  );
});

test("the screen prices days, models, and folders, and lists account models OMP didn't use", () => {
  const since = new Date(2026, 9, 5).getTime();
  const view = buildView({
    now,
    range: "week",
    since,
    db: { ...db, usage: db.usage.slice(1) },
    cost: ok,
    syncProblem: null,
  });
  assert.equal(view.ompCost, 3);
  assert.equal(view.aws.status === "ok" && view.aws.accountTotal, 25);
  assert.equal(view.days[0]?.date, localDate(since));
  assert.equal(view.days.find((day) => day.date === "2026-10-06")?.ompCost, 2);
  assert.deepEqual(
    view.models.map((model) => [model.model, model.ompCost, model.accountCost]),
    [
      ["claude-opus-5-5", 3, 20],
      ["claude-haiku-4-5", 0, 5],
    ],
  );
  assert.deepEqual(view.folders, [
    {
      folder: "agentic-stuff",
      sessions: 2,
      requests: 2,
      cost: 110,
      ompCost: 3,
    },
  ]);
});
