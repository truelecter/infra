/** Names the AWS profile OMP's Bedrock provider must use (set in `~/.omp/agent/.env`). */
export const TARGET_VAR = "OMP_BEDROCK_AWS_PROFILE";
/**
 * `AWS_PROFILE` as it was when the first OMP process started, "" for unset.
 * Subagent processes inherit it, so they restore the original value rather
 * than the Bedrock profile their parent already swapped in.
 */
export const LAUNCH_VAR = "OMP_AWS_PROFILE_LAUNCH";

export type Env = Record<string, string | undefined>;

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/**
 * Shell text OMP runs before every agent command (`PI_SHELL_PREFIX`). It undoes
 * the swap only while `AWS_PROFILE` still holds the Bedrock profile, so a value
 * set by a project's `.envrc` through OMP's direnv support stays untouched.
 */
export function guardPrefix(target: string, launch: string | undefined): string {
  const restore = launch ? `export AWS_PROFILE=${shellQuote(launch)}` : "unset -v AWS_PROFILE";
  return `[ "\${AWS_PROFILE-}" = ${shellQuote(target)} ] && ${restore};`;
}

/**
 * Points `AWS_PROFILE` at the Bedrock profile for OMP itself and installs the
 * shell guard. Idempotent, so nested OMP processes can run it again.
 */
export function applyBedrockProfile(env: Env): { target: string; launch: string } | null {
  const target = env[TARGET_VAR]?.trim();
  if (!target) return null;

  const launch = env[LAUNCH_VAR] ?? env.AWS_PROFILE ?? "";
  env[LAUNCH_VAR] = launch;
  env.AWS_PROFILE = target;
  if (launch === target) return { target, launch };

  // OMP reads PI_SHELL_PREFIX, falling back to the Claude Code name.
  const guard = guardPrefix(target, launch || undefined);
  const existing = env.PI_SHELL_PREFIX || env.CLAUDE_CODE_SHELL_PREFIX;
  if (!existing?.startsWith(guard)) {
    env.PI_SHELL_PREFIX = existing ? `${guard} ${existing}` : guard;
  }
  return { target, launch };
}
