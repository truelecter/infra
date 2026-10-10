import { execFile } from "node:child_process";

/** How long a Paseo CLI call may take; a rename normally answers in under a second. */
export const CLI_TIMEOUT_MS = 15_000;

export type CliResult =
  | { ok: true; stdout: string }
  | { ok: false; error: string };

/** Runs a Paseo CLI command without a shell. Never rejects: failures come back as `{ ok: false }`. */
export function runPaseoCli(
  cli: string,
  args: readonly string[],
  signal?: AbortSignal,
  timeoutMs: number = CLI_TIMEOUT_MS,
): Promise<CliResult> {
  const { promise, resolve } = Promise.withResolvers<CliResult>();
  execFile(
    cli,
    [...args],
    { timeout: timeoutMs, signal, encoding: "utf8" },
    (error, stdout, stderr) => {
      if (!error) {
        resolve({ ok: true, stdout });
        return;
      }
      if (signal?.aborted) {
        resolve({ ok: false, error: "cancelled" });
        return;
      }
      const detail = stderr.trim() || stdout.trim() || error.message;
      const reason = error.killed
        ? `timed out after ${timeoutMs / 1000} s`
        : "failed";
      resolve({
        ok: false,
        error: `\`paseo ${args.slice(0, 2).join(" ")}\` ${reason}: ${detail}`,
      });
    },
  );
  return promise;
}
