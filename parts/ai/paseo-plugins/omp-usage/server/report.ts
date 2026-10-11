import type { UsageDetail, UsageReport } from "@getpaseo/plugin/server/usage";
import {
  compactNumber,
  dayLabel,
  dollars,
  folderName,
  modelName,
} from "../shared/format.ts";
import type { AwsCost, Range, StatsView } from "../shared/stats.ts";
import type { CostState } from "./cost-explorer.ts";
import { localDate, type PeriodStarts } from "./periods.ts";
import {
  accountRates,
  priceAtRates,
  priceKey,
  summarizeAccount,
  type Rates,
} from "./pricing.ts";
import type { DbRange, UsageRow } from "./stats.ts";

const CARD_TOP = 4;

interface Group {
  requests: number;
  failed: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  /** OMP at account prices; null without rates. */
  ompCost: number | null;
  /** Models in the group the account has no full price for. */
  unpriced: string[];
}

/** Sums usage rows by `key`, pricing each row at the account rates when there are any. */
export function groupUsage(
  rows: UsageRow[],
  key: (row: UsageRow) => string,
  rates: Rates | null,
): Record<string, Group> {
  const groups: Record<string, Group> = {};
  for (const row of rows) {
    const group = (groups[key(row)] ??= {
      requests: 0,
      failed: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      cost: 0,
      ompCost: rates ? 0 : null,
      unpriced: [],
    });
    group.requests += row.requests;
    group.failed += row.failed;
    group.output += row.output;
    group.cacheRead += row.cacheRead;
    group.cacheWrite += row.cacheWrite;
    group.cost += row.cost;
    if (!rates) continue;
    const priced = priceAtRates(
      row.model,
      {
        input: row.input,
        output: row.output,
        cacheRead: row.cacheRead,
        cacheWrite: row.cacheWrite,
      },
      row.cost,
      rates,
    );
    group.ompCost! += priced.cost;
    const name = modelName(row.model);
    if (!priced.priced && !group.unpriced.includes(name))
      group.unpriced.push(name);
  }
  return groups;
}

/** Most expensive first, by OMP at account prices when there is one, else API-equivalent. */
function byCost<T extends { cost: number; ompCost: number | null }>(
  rows: T[],
): T[] {
  return rows.sort((a, b) => (b.ompCost ?? b.cost) - (a.ompCost ?? a.cost));
}

export function buildView(input: {
  now: Date;
  range: Range;
  since: number;
  db: DbRange;
  cost: CostState;
  syncProblem: string | null;
}): StatsView {
  const { db, cost } = input;
  const ok = cost.status === "ok" ? cost.data : null;
  const rates = ok ? accountRates(ok.rows) : null;
  const account = ok ? summarizeAccount(ok.rows, localDate(input.since)) : null;
  const all = groupUsage(db.usage, () => "all", rates).all;
  const awsView: AwsCost = ok
    ? {
        status: "ok",
        profile: ok.profile,
        accountTotal: account!.total,
        through: account!.through,
        ratesFrom: ok.rows.reduce<string | null>(
          (first, row) =>
            first === null || row.date < first ? row.date : first,
          null,
        ),
        fetchedAt: ok.fetchedAt,
      }
    : (cost as Exclude<CostState, { status: "ok" }>);

  const models: StatsView["models"] = Object.entries(
    groupUsage(db.usage, (row) => row.model, rates),
  ).map(([model, group]) => ({
    model: modelName(model),
    requests: group.requests,
    outputTokens: group.output,
    cacheReadTokens: group.cacheRead,
    cost: group.cost,
    ompCost: group.ompCost,
    priced: group.unpriced.length === 0,
    accountCost: account ? (account.byModel[priceKey(model)] ?? 0) : null,
  }));
  // Account-wide Bedrock spend on models OMP didn't use in this range.
  for (const [key, accountCost] of Object.entries(account?.byModel ?? {})) {
    if (db.usage.some((row) => priceKey(row.model) === key)) continue;
    models.push({
      model: key,
      requests: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cost: 0,
      ompCost: 0,
      priced: true,
      accountCost,
    });
  }

  // Every day of the range, also the ones without requests.
  const byDate = groupUsage(db.usage, (row) => row.date, rates);
  const tokensByDate: Record<string, number> = {};
  for (const row of db.usage) {
    tokensByDate[row.date] =
      (tokensByDate[row.date] ?? 0) +
      row.input +
      row.output +
      row.cacheRead +
      row.cacheWrite;
  }
  const days: StatsView["days"] = [];
  const today = localDate(input.now.getTime());
  for (
    let at = new Date(input.since);
    localDate(at.getTime()) <= today;
    at.setDate(at.getDate() + 1)
  ) {
    const date = localDate(at.getTime());
    const day = byDate[date];
    days.push({
      date,
      requests: day?.requests ?? 0,
      tokens: tokensByDate[date] ?? 0,
      cost: day?.cost ?? 0,
      ompCost: rates ? (day?.ompCost ?? 0) : null,
      accountCost: account ? (account.byDay[date] ?? 0) : null,
    });
  }

  return {
    range: input.range,
    since: input.since,
    totals: db.totals,
    aws: awsView,
    ompCost: rates ? (all?.ompCost ?? 0) : null,
    unpricedModels: all?.unpriced ?? [],
    days,
    // Leave out models that round to $0.00 in every column (retired models with a stray request).
    models: byCost(
      models.filter(
        (row) =>
          Math.max(row.cost, row.ompCost ?? 0, row.accountCost ?? 0) >= 0.005,
      ),
    ),
    folders: byCost(
      Object.entries(groupUsage(db.usage, (row) => row.folder, rates)).map(
        ([folder, group]) => ({
          folder: folderName(folder),
          sessions: db.folderSessions[folder] ?? 0,
          requests: group.requests,
          cost: group.cost,
          ompCost: group.ompCost,
        }),
      ),
    ),
    agentTypes: byCost(
      Object.entries(groupUsage(db.usage, (row) => row.agentType, rates)).map(
        ([agentType, group]) => ({
          agentType,
          requests: group.requests,
          cost: group.cost,
          ompCost: group.ompCost,
        }),
      ),
    ),
    tools: db.tools,
    lastEntryAt: db.lastEntryAt,
    syncProblem: input.syncProblem,
  };
}

function clock(ms: number, now: Date): string {
  const at = new Date(ms);
  const time = at.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (at.toDateString() === now.toDateString()) return time;
  return `${at.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${time}`;
}

/**
 * The Usage card: OMP's cost today, this week, and this month at the account's prices when
 * Cost Explorer answers, else OMP's API-equivalent estimate; this week's account total, tokens,
 * and top models and folders.
 *
 * `db` covers at least the earlier of the week and month starts.
 */
export function buildReport(input: {
  now: Date;
  starts: PeriodStarts;
  db: DbRange;
  cost: CostState;
  syncProblem: string | null;
}): UsageReport {
  const { db, cost, starts } = input;
  const ok = cost.status === "ok" ? cost.data : null;
  const rates = ok ? accountRates(ok.rows) : null;
  const since = (start: number) =>
    db.usage.filter((row) => row.date >= localDate(start));
  const [today, week, month] = [starts.today, starts.week, starts.month].map(
    (start) => groupUsage(since(start), () => "all", rates).all,
  );
  const weekRows = since(starts.week);
  const account = ok ? summarizeAccount(ok.rows, localDate(starts.week)) : null;
  const shown = (group: Group | undefined) =>
    rates ? (group?.ompCost ?? 0) : (group?.cost ?? 0);

  const top = [
    ...byCost(
      Object.entries(groupUsage(weekRows, (row) => row.model, rates)).map(
        ([model, group]) => ({
          id: `model:${model}`,
          name: modelName(model),
          ...group,
        }),
      ),
    ).slice(0, CARD_TOP),
    ...byCost(
      Object.entries(groupUsage(weekRows, (row) => row.folder, rates)).map(
        ([folder, group]) => ({
          id: `folder:${folder}`,
          name: folderName(folder),
          ...group,
        }),
      ),
    ).slice(0, CARD_TOP),
  ];

  const details: UsageDetail[] = [
    account
      ? {
          id: "account-week",
          label: "All Bedrock in the account this week",
          value: `${dollars(account.total)}${account.through ? ` through ${dayLabel(account.through)}` : ""}`,
        }
      : {
          id: "aws",
          label: "AWS Cost Explorer",
          value: cost.status === "unavailable" ? cost.reason : "loading",
          tone: cost.status === "unavailable" ? "warning" : "default",
        },
    ...(rates
      ? [
          {
            id: "api-week",
            label: "API-equivalent this week",
            value: dollars(week?.cost ?? 0),
          },
        ]
      : []),
    {
      id: "week-requests",
      label: "Requests this week",
      value: `${(week?.requests ?? 0).toLocaleString("en-US")}${week?.failed ? ` (${week.failed} failed)` : ""}`,
    },
    {
      id: "week-output",
      label: "Output tokens",
      value: compactNumber(week?.output ?? 0),
    },
    {
      id: "week-cache",
      label: "Cache read / write",
      value: `${compactNumber(week?.cacheRead ?? 0)} / ${compactNumber(week?.cacheWrite ?? 0)}`,
    },
    ...top.map((group) => ({
      id: group.id,
      label: group.name,
      value:
        group.ompCost === null
          ? `${dollars(group.cost)} · ${compactNumber(group.requests)} req`
          : `${dollars(group.ompCost)} · ${dollars(group.cost)} API-eq`,
    })),
    {
      id: "synced",
      label: "Newest request",
      value:
        db.lastEntryAt === null ? "none" : clock(db.lastEntryAt, input.now),
    },
  ];
  if (week?.unpriced.length) {
    details.push({
      id: "unpriced",
      label: "No account price, API-equivalent used",
      value: week.unpriced.join(", "),
    });
  }
  if (input.syncProblem) {
    details.push({
      id: "sync-problem",
      label: "Sync",
      value: input.syncProblem,
      tone: "warning",
    });
  }

  return {
    status: "available",
    planLabel: rates
      ? "OMP at the account's Bedrock prices"
      : "API-equivalent cost",
    windows: [],
    balances: [
      { id: "today", label: "Today", used: shown(today), unit: "usd" },
      { id: "week", label: "This week", used: shown(week), unit: "usd" },
      { id: "month", label: "This month", used: shown(month), unit: "usd" },
    ],
    details,
  };
}
