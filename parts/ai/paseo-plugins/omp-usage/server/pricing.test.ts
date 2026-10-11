import assert from "node:assert/strict";
import { test } from "node:test";
import type { CostRow } from "./cost-explorer.ts";
import {
  accountRates,
  priceAtRates,
  priceKey,
  summarizeAccount,
  tokenKind,
} from "./pricing.ts";

test("priceKey gives OMP ids and Bedrock usage types the same name", () => {
  assert.equal(priceKey("global.anthropic.claude-opus-5-5"), "claude-opus-5-5");
  assert.equal(
    priceKey(
      "USE1-anthropic.claude-opus-5-5-mantle-cache-write-tokens-1h-global-standard",
    ),
    "claude-opus-5-5",
  );
  assert.equal(
    priceKey("global.anthropic.claude-haiku-4-5-20251001-v1:0"),
    "claude-haiku-4-5",
  );
  assert.equal(
    priceKey(
      "USE1-Claude4.5Haiku-cache-read-input-token-count-cross-region-global",
    ),
    "claude-haiku-4-5",
  );
});

test("tokenKind reads both usage-type styles", () => {
  assert.equal(
    tokenKind(
      "USE1-anthropic.claude-opus-5-5-mantle-cache-write-tokens-1h-global-standard",
    ),
    "cacheWrite",
  );
  assert.equal(
    tokenKind(
      "USE1-Claude4.5Haiku-cache-read-input-token-count-cross-region-global",
    ),
    "cacheRead",
  );
  assert.equal(
    tokenKind("USE1-Claude4.5Haiku-input-tokens-cross-region-global"),
    "input",
  );
  assert.equal(
    tokenKind(
      "USE1-anthropic.claude-opus-5-5-mantle-output-tokens-global-standard",
    ),
    "output",
  );
  assert.equal(tokenKind("USE1-ProvisionedThroughput-hours"), null);
});

const opus = "USE1-anthropic.claude-opus-5-5-mantle";
const rows: CostRow[] = [
  {
    date: "2026-10-05",
    usageType: `${opus}-output-tokens-global-standard`,
    cost: 4,
    tokens: 1_000_000,
  },
  {
    date: "2026-10-06",
    usageType: `${opus}-output-tokens-global-standard`,
    cost: 6,
    tokens: 1_000_000,
  },
  // 5-minute and 1-hour writes share one price.
  {
    date: "2026-10-06",
    usageType: `${opus}-cache-write-tokens-global-standard`,
    cost: 1,
    tokens: 1_000_000,
  },
  {
    date: "2026-10-06",
    usageType: `${opus}-cache-write-tokens-1h-global-standard`,
    cost: 3,
    tokens: 1_000_000,
  },
  {
    date: "2026-10-07",
    usageType: "USE1-openai.gpt-6-astra-mantle-output-tokens-global-standard",
    cost: 0,
    tokens: 5_000_000,
  },
];

test("accountRates averages cost per token over every day", () => {
  const rates = accountRates(rows);
  assert.equal(rates["claude-opus-5-5"]?.output, 10 / 2_000_000);
  assert.equal(rates["claude-opus-5-5"]?.cacheWrite, 4 / 2_000_000);
  // Billed at no cost is a price too.
  assert.equal(rates["gpt-6-astra"]?.output, 0);
});

test("priceAtRates uses the API-equivalent share only for token kinds without a price", () => {
  const rates = accountRates(rows);
  const tokens = { input: 0, output: 1_000_000, cacheRead: 0, cacheWrite: 0 };
  assert.deepEqual(
    priceAtRates("global.anthropic.claude-opus-5-5", tokens, 99, rates),
    { cost: 5, priced: true },
  );
  // Output priced at 5 per million, cache read has no price: half the tokens take half the API cost.
  assert.deepEqual(
    priceAtRates(
      "global.anthropic.claude-opus-5-5",
      { ...tokens, cacheRead: 1_000_000 },
      40,
      rates,
    ),
    { cost: 25, priced: false },
  );
  assert.deepEqual(
    priceAtRates("global.anthropic.unknown-model", tokens, 7, rates),
    { cost: 7, priced: false },
  );
});

test("summarizeAccount counts every service from the start date", () => {
  const summary = summarizeAccount(rows, "2026-10-06");
  assert.equal(summary.total, 10);
  assert.equal(summary.through, "2026-10-06");
  assert.deepEqual(summary.byModel, {
    "claude-opus-5-5": 10,
    "gpt-6-astra": 0,
  });
});
