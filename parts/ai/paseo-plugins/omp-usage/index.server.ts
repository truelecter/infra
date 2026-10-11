import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { z } from "zod";
import { getStats } from "./shared/stats.ts";
import { createCostExplorer } from "./server/cost-explorer.ts";
import { periodStarts, rangeStart } from "./server/periods.ts";
import { buildReport, buildView } from "./server/report.ts";
import { EMPTY_RANGE, readRange } from "./server/stats.ts";
import { syncStats } from "./server/sync.ts";

const input = z.object({ db: z.string() }).strict();
const DB_PATH = join(homedir(), ".omp", "stats.db");
/** Paseo gives a usage fetch 20 seconds; the sync takes up to 12. */
const CARD_COST_WAIT_MS = 4_000;
/** Plugin RPCs time out after 30 seconds. */
const SCREEN_COST_WAIT_MS = 20_000;

export default function contribute(server: PluginServerContext) {
  const costs = createCostExplorer();
  // Warm the cache so the first card already has AWS numbers.
  void costs.fresh({ waitMs: 0 });

  server.registerUsageSource({
    id: "omp-bedrock",
    label: "Bedrock (OMP)",
    input,
    // One card for the whole machine; agent popovers get none (Bedrock has no per-login quota).
    discover: async (scope) => {
      if (scope.kind !== "global" || !existsSync(DB_PATH)) return [];
      return [
        {
          key: "omp-stats",
          label: "OMP sessions",
          harness: "OMP",
          input: { db: DB_PATH },
        },
      ];
    },
    fetch: async (value) => {
      const { db: dbPath } = input.parse(value);
      const [syncProblem, cost] = await Promise.all([
        syncStats(),
        costs.fresh({ waitMs: CARD_COST_WAIT_MS }),
      ]);
      const now = new Date();
      const starts = periodStarts(now);
      const db = readRange(dbPath, Math.min(starts.week, starts.month));
      return buildReport({ now, starts, db, cost, syncProblem });
    },
  });

  server.handle(getStats, async ({ range, refresh }) => {
    const [syncProblem, cost] = await Promise.all([
      syncStats(),
      costs.fresh({ force: refresh, waitMs: SCREEN_COST_WAIT_MS }),
    ]);
    const now = new Date();
    const since = rangeStart(range, now);
    // The sync above creates the database when OMP has sessions.
    const hasDb = existsSync(DB_PATH);
    return buildView({
      now,
      range,
      since,
      db: hasDb ? readRange(DB_PATH, since) : EMPTY_RANGE,
      cost,
      syncProblem: hasDb ? syncProblem : `no stats database at ${DB_PATH}`,
    });
  });

  return () => {};
}
