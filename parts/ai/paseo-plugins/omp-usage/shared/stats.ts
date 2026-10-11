import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const RANGES = ["today", "week", "month", "30d"] as const;
export type Range = (typeof RANGES)[number];

export const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  "30d": "30 days",
};

const totalsSchema = z.object({
  requests: z.number(),
  failed: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  /** OMP's API-equivalent estimate, USD. */
  cost: z.number(),
  avgTtftMs: z.number().nullable(),
  avgTokensPerSecond: z.number().nullable(),
});
export type Totals = z.infer<typeof totalsSchema>;

/** What AWS Cost Explorer says about Bedrock in the account the OMP profile signs in to. */
const awsSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    profile: z.string(),
    /** All Bedrock cost in the account in the range, OMP's and every other service's. */
    accountTotal: z.number(),
    /** Newest day (YYYY-MM-DD, UTC) with any Bedrock cost; Cost Explorer lags up to a day. */
    through: z.string().nullable(),
    /** First day (YYYY-MM-DD, UTC) of the Cost Explorer data the account prices are averaged over, through `through`. */
    ratesFrom: z.string().nullable(),
    fetchedAt: z.number(),
  }),
  z.object({ status: z.literal("loading") }),
  z.object({ status: z.literal("unavailable"), reason: z.string() }),
]);
export type AwsCost = z.infer<typeof awsSchema>;

/** OMP's tokens at the account's average prices; null without a Cost Explorer answer. */
const ompCost = z.number().nullable();

export const statsViewSchema = z.object({
  range: z.enum(RANGES),
  since: z.number(),
  totals: totalsSchema,
  aws: awsSchema,
  ompCost,
  /** Models the account has no price for; their share is the API-equivalent estimate. */
  unpricedModels: z.array(z.string()),
  days: z.array(
    z.object({
      date: z.string(),
      requests: z.number(),
      tokens: z.number(),
      cost: z.number(),
      ompCost,
      accountCost: z.number().nullable(),
    }),
  ),
  models: z.array(
    z.object({
      model: z.string(),
      requests: z.number(),
      outputTokens: z.number(),
      cacheReadTokens: z.number(),
      cost: z.number(),
      ompCost,
      priced: z.boolean(),
      accountCost: z.number().nullable(),
    }),
  ),
  folders: z.array(
    z.object({
      folder: z.string(),
      sessions: z.number(),
      requests: z.number(),
      cost: z.number(),
      ompCost,
    }),
  ),
  agentTypes: z.array(
    z.object({
      agentType: z.string(),
      requests: z.number(),
      cost: z.number(),
      ompCost,
    }),
  ),
  tools: z.array(
    z.object({ tool: z.string(), calls: z.number(), errors: z.number() }),
  ),
  lastEntryAt: z.number().nullable(),
  syncProblem: z.string().nullable(),
});
export type StatsView = z.infer<typeof statsViewSchema>;

export const getStats = defineRpc({
  name: "stats.get",
  input: z.object({ range: z.enum(RANGES), refresh: z.boolean().optional() }),
  output: statsViewSchema,
});
