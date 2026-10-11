import { runTool } from "./exec.ts";

/** Leaves room in Paseo's 20-second usage fetch deadline for reading the database. */
const SYNC_TIMEOUT_MS = 12_000;
/** The card and open screens fetch independently; one sync serves them all for this long. */
const FRESH_MS = 30_000;

let inFlight: Promise<string | null> | null = null;
let last: { at: number; problem: string | null } | null = null;

/**
 * Runs `omp stats --summary`, which first reads new session-file entries into `stats.db`
 * (OMP has no sync-only command). Returns a short problem text, or null on success.
 */
export function syncStats(): Promise<string | null> {
  if (last && Date.now() - last.at < FRESH_MS)
    return Promise.resolve(last.problem);
  inFlight ??= runTool("omp", "OMP_BIN", ["stats", "--summary"], {
    timeoutMs: SYNC_TIMEOUT_MS,
  })
    .then((result) => {
      const problem = result.ok ? null : result.problem;
      if (problem) console.warn(problem);
      last = { at: Date.now(), problem };
      return problem;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
