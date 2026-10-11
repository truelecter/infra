import { DatabaseSync } from "node:sqlite";
import type { StatsView, Totals } from "../shared/stats.ts";

/** OMP's provider id for Bedrock in `messages.provider`. */
const PROVIDER = "amazon-bedrock";
const TOP_TOOLS = 12;

/** OMP's Bedrock requests summed per local day, model, folder, and agent kind. */
export interface UsageRow {
  date: string;
  /** Raw OMP model id, `global.anthropic.claude-opus-5-5`. */
  model: string;
  /** Raw OMP session folder, `-Projects-agentic-stuff`. */
  folder: string;
  agentType: string;
  requests: number;
  failed: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** OMP's API-equivalent estimate, USD. */
  cost: number;
}

export interface DbRange {
  totals: Totals;
  usage: UsageRow[];
  /** Distinct sessions per raw folder. */
  folderSessions: Record<string, number>;
  tools: StatsView["tools"];
  /** Newest Bedrock request in the database (ms), any range. */
  lastEntryAt: number | null;
}

/** What a machine without `~/.omp/stats.db` (OMP never ran `omp stats`) has. */
export const EMPTY_RANGE: DbRange = {
  totals: {
    requests: 0,
    failed: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    cost: 0,
    avgTtftMs: null,
    avgTokensPerSecond: null,
  },
  usage: [],
  folderSessions: {},
  tools: [],
  lastEntryAt: null,
};

const TOTALS_SQL = `
  SELECT count(*) AS requests,
         coalesce(sum(stop_reason = 'error'), 0) AS failed,
         coalesce(sum(input_tokens), 0) AS inputTokens,
         coalesce(sum(output_tokens), 0) AS outputTokens,
         coalesce(sum(cache_read_tokens), 0) AS cacheReadTokens,
         coalesce(sum(cache_write_tokens), 0) AS cacheWriteTokens,
         coalesce(sum(cost_total), 0) AS cost,
         avg(ttft) AS avgTtftMs,
         avg(CASE WHEN duration > 0 THEN output_tokens * 1000.0 / duration END) AS avgTokensPerSecond
    FROM messages
   WHERE provider = ? AND timestamp >= ?`;

/** Reads `~/.omp/stats.db` (the `omp stats` database) read-only: everything since `since` (ms). */
export function readRange(dbPath: string, since: number): DbRange {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const all = <Row>(sql: string) =>
      db.prepare(sql).all(PROVIDER, since) as unknown as Row[];
    const last = db
      .prepare("SELECT max(timestamp) AS at FROM messages WHERE provider = ?")
      .get(PROVIDER) as { at: number | null } | undefined;
    const sessions = all<{ folder: string; sessions: number }>(`
      SELECT folder, count(DISTINCT session_file) AS sessions
        FROM messages WHERE provider = ? AND timestamp >= ?
       GROUP BY folder`);
    return {
      totals: db.prepare(TOTALS_SQL).get(PROVIDER, since) as unknown as Totals,
      usage: all<UsageRow>(`
        SELECT date(timestamp / 1000, 'unixepoch', 'localtime') AS date, model, folder,
               agent_type AS agentType, count(*) AS requests, sum(stop_reason = 'error') AS failed,
               sum(input_tokens) AS input, sum(output_tokens) AS output,
               sum(cache_read_tokens) AS cacheRead, sum(cache_write_tokens) AS cacheWrite,
               sum(cost_total) AS cost
          FROM messages WHERE provider = ? AND timestamp >= ?
         GROUP BY date, model, folder, agent_type`),
      folderSessions: Object.fromEntries(
        sessions.map((row) => [row.folder, row.sessions]),
      ),
      tools: all<StatsView["tools"][number]>(`
        SELECT tool_name AS tool, count(*) AS calls, coalesce(sum(is_error = 1), 0) AS errors
          FROM tool_calls WHERE provider = ? AND timestamp >= ?
         GROUP BY tool_name ORDER BY calls DESC`).slice(0, TOP_TOOLS),
      lastEntryAt: last?.at ?? null,
    };
  } finally {
    db.close();
  }
}
