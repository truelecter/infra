import { execFile } from "node:child_process";
import { userInfo } from "node:os";

export type ExecResult =
  | { ok: true; stdout: string }
  | { ok: false; problem: string };

/**
 * Runs the binary named by the variable `envVar` when it is set, else `name` from `PATH`, then
 * from the Home Manager profile: the Paseo daemon's PATH often lacks user tools. Only a missing
 * binary moves on to the next candidate.
 */
export async function runTool(
  name: string,
  envVar: string,
  args: string[],
  options: { timeoutMs: number; env?: NodeJS.ProcessEnv },
): Promise<ExecResult> {
  const override = process.env[envVar];
  const candidates = override
    ? [override]
    : [name, `/etc/profiles/per-user/${userInfo().username}/bin/${name}`];
  for (const bin of candidates) {
    const result = await new Promise<ExecResult | null>((resolve) => {
      execFile(
        bin,
        args,
        {
          timeout: options.timeoutMs,
          env: options.env,
          maxBuffer: 64 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (!error) return resolve({ ok: true, stdout });
          if (error.code === "ENOENT") return resolve(null);
          const detail = stderr.trim().split("\n").at(-1) || error.message;
          resolve({
            ok: false,
            problem: error.killed
              ? `${name} timed out`
              : `${name} failed: ${detail}`,
          });
        },
      );
    });
    if (result) return result;
  }
  return { ok: false, problem: `${name} not found` };
}
