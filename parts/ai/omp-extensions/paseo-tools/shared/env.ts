// Paseo starts each agent process with PASEO_AGENT_ID (that agent's id) and
// PASEO_CLI (the absolute path of its bundled `paseo` CLI). Outside Paseo
// neither is set, and the extension registers nothing.

const AGENT_ID = /^[A-Za-z0-9-]{1,128}$/;

export interface PaseoEnv {
  /** The Paseo agent this OMP process runs as. */
  agentId: string;
  /** Absolute path of the Paseo CLI. */
  cli: string;
}

/** The Paseo environment, or null when this process does not run under Paseo. */
export function readPaseoEnv(
  env: Record<string, string | undefined>,
): PaseoEnv | null {
  const agentId = env.PASEO_AGENT_ID?.trim();
  const cli = env.PASEO_CLI?.trim();
  // The id goes into a tool description and a CLI argument; accept plain ids only.
  if (!agentId || !AGENT_ID.test(agentId) || !cli) return null;
  return { agentId, cli };
}
