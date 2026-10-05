import { Resolver } from "node:dns/promises";

// Tailscale's in-process resolver answers PTR queries for tailnet addresses when MagicDNS is on.
const TAILSCALE_DNS = "100.100.100.100";
const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

// Returns each FQDN plus its first label, e.g. "host.tailnet.ts.net" and "host".
export function magicDnsNames(ptrRecords: readonly string[]): string[] {
  const names = new Set<string>();
  for (const record of ptrRecords) {
    const fqdn = record.trim().toLowerCase().replace(/\.$/, "");
    if (!HOSTNAME_PATTERN.test(fqdn)) continue;
    names.add(fqdn);
    const short = fqdn.split(".")[0];
    if (short && short !== fqdn) names.add(short);
  }
  return [...names].sort();
}

export async function lookupMagicDnsNames(address: string, timeoutMs = 2_000): Promise<string[]> {
  const resolver = new Resolver({ timeout: timeoutMs, tries: 1 });
  resolver.setServers([TAILSCALE_DNS]);
  try {
    return magicDnsNames(await resolver.reverse(address));
  } catch {
    return [];
  } finally {
    resolver.cancel();
  }
}

/**
 * The names to allow for `address`: `PASEO_TAILSCALE_HOSTNAMES` (comma-separated FQDNs) when set,
 * as the end-to-end suite does with no Tailscale, else a MagicDNS reverse lookup.
 */
export function lookupHostnames(
  address: string,
  env: NodeJS.ProcessEnv,
  lookup: (address: string) => Promise<string[]> = lookupMagicDnsNames,
): Promise<string[]> {
  const names = env.PASEO_TAILSCALE_HOSTNAMES?.trim();
  return names ? Promise.resolve(magicDnsNames(names.split(","))) : lookup(address);
}
