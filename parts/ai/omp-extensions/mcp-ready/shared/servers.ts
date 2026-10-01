/** Server names from an MCP config object (`mcp.json`), skipping disabled servers. */
export function enabledServers(config: unknown): string[] {
  const servers = (config as { mcpServers?: unknown } | null)?.mcpServers;
  if (!servers || typeof servers !== "object") return [];
  return Object.entries(servers as Record<string, unknown>)
    .filter(([, server]) => (server as { enabled?: unknown } | null)?.enabled !== false)
    .map(([name]) => name);
}

/**
 * Tool-name prefix OMP gives a server's tools: `mcp__<sanitized_server>_`. OMP sanitizes names
 * to the characters allowed in tool names; this mirrors it closely enough for plain names such
 * as `tracker` or `my-server`.
 */
export function toolPrefix(server: string): string {
  return `mcp__${server.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase()}_`;
}

/** Servers none of whose tools are enabled yet. */
export function missingServers(servers: readonly string[], enabledTools: readonly string[]): string[] {
  return servers.filter((server) => {
    const prefix = toolPrefix(server);
    return !enabledTools.some((tool) => tool.toLowerCase().startsWith(prefix));
  });
}
