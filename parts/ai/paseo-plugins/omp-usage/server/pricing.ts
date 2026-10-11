import { modelName } from "../shared/format.ts";
import type { CostRow } from "./cost-explorer.ts";

export const TOKEN_KINDS = [
  "input",
  "output",
  "cacheRead",
  "cacheWrite",
] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number];
export type TokenCounts = Record<TokenKind, number>;

/** USD per token, by price key (`priceKey()`) and token kind. */
export type Rates = Record<string, Partial<Record<TokenKind, number>>>;

/**
 * One name for a model on both sides: OMP's id after `modelName()` without a date or version
 * suffix (`claude-haiku-4-5-20251001-v1:0` -> `claude-haiku-4-5`), and the model in a Bedrock
 * usage type (`USE1-anthropic.claude-opus-5-5-mantle-output-tokens-global-standard` ->
 * `claude-opus-5-5`; the older `USE1-Claude4.5Haiku-output-tokens-...` -> `claude-haiku-4-5`).
 */
export function priceKey(model: string): string {
  const mantle = /\.([a-z0-9.-]+?)-mantle-/.exec(model);
  if (mantle) return mantle[1]!;
  const legacy = /-Claude(\d+)\.(\d+)([A-Za-z]+)-/.exec(model);
  if (legacy)
    return `claude-${legacy[3]!.toLowerCase()}-${legacy[1]}-${legacy[2]}`;
  return modelName(model)
    .replace(/-\d{8}(-v\d+(:\d+)?)?$/, "")
    .replace(/-v\d+:\d+$/, "");
}

/** The token kind a usage type bills, or null for anything else (provisioned throughput, images). */
export function tokenKind(usageType: string): TokenKind | null {
  if (/cache-read/i.test(usageType)) return "cacheRead";
  if (/cache-write/i.test(usageType)) return "cacheWrite";
  if (/output-token/i.test(usageType)) return "output";
  if (/input-token/i.test(usageType)) return "input";
  return null;
}

/**
 * What this account paid per token, averaged over every Cost Explorer row: one price per model
 * and token kind. Cache writes of 5 minutes and 1 hour share one price, because OMP doesn't
 * record which kind a write was.
 */
export function accountRates(rows: CostRow[]): Rates {
  const sums: Record<
    string,
    Partial<Record<TokenKind, { cost: number; tokens: number }>>
  > = {};
  for (const row of rows) {
    const kind = tokenKind(row.usageType);
    if (!kind || !row.tokens) continue;
    const model = (sums[priceKey(row.usageType)] ??= {});
    const sum = (model[kind] ??= { cost: 0, tokens: 0 });
    sum.cost += row.cost;
    sum.tokens += row.tokens;
  }
  const rates: Rates = {};
  for (const [model, kinds] of Object.entries(sums)) {
    rates[model] = Object.fromEntries(
      Object.entries(kinds).map(([kind, sum]) => [
        kind,
        sum!.cost / sum!.tokens,
      ]),
    );
  }
  return rates;
}

export interface Priced {
  cost: number;
  /** False when the account has no price for some token kind the model used; that part is OMP's API-equivalent estimate. */
  priced: boolean;
}

/**
 * OMP's tokens for one model at the account's prices. A token kind without an account price
 * (a model the account never billed) falls back to OMP's API-equivalent cost for the share of
 * tokens it covers.
 */
export function priceAtRates(
  model: string,
  tokens: TokenCounts,
  apiCost: number,
  rates: Rates,
): Priced {
  const modelRates = rates[priceKey(model)] ?? {};
  const all = TOKEN_KINDS.reduce((sum, kind) => sum + tokens[kind], 0);
  let cost = 0;
  let unpricedTokens = 0;
  for (const kind of TOKEN_KINDS) {
    const rate = modelRates[kind];
    if (rate === undefined) unpricedTokens += tokens[kind];
    else cost += tokens[kind] * rate;
  }
  if (unpricedTokens > 0) cost += apiCost * (unpricedTokens / all);
  return { cost, priced: unpricedTokens === 0 };
}

export interface AccountSummary {
  total: number;
  /** Newest day with any cost, or null. */
  through: string | null;
  byDay: Record<string, number>;
  /** By price key. */
  byModel: Record<string, number>;
}

/** All Bedrock cost in the account on or after `sinceDate` (YYYY-MM-DD). */
export function summarizeAccount(
  rows: CostRow[],
  sinceDate: string,
): AccountSummary {
  const summary: AccountSummary = {
    total: 0,
    through: null,
    byDay: {},
    byModel: {},
  };
  for (const row of rows) {
    if (row.date < sinceDate) continue;
    const model = priceKey(row.usageType);
    summary.total += row.cost;
    summary.byDay[row.date] = (summary.byDay[row.date] ?? 0) + row.cost;
    summary.byModel[model] = (summary.byModel[model] ?? 0) + row.cost;
    if (
      row.cost > 0 &&
      (summary.through === null || row.date > summary.through)
    )
      summary.through = row.date;
  }
  return summary;
}
