import { networkInterfaces } from "node:os";

type Interfaces = ReturnType<typeof networkInterfaces>;

// Tailscale assigns IPv4 addresses from the CGNAT range 100.64.0.0/10.
export function isTailscaleIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)
  ) {
    return false;
  }
  return octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127;
}

export function findTailscaleIPv4(
  interfaces: Interfaces = networkInterfaces(),
): string | null {
  const candidates: { name: string; address: string }[] = [];
  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const entry of addresses ?? []) {
      if (
        entry.family === "IPv4" &&
        !entry.internal &&
        isTailscaleIPv4(entry.address)
      ) {
        candidates.push({ name, address: entry.address });
      }
    }
  }
  const rank = (name: string) =>
    /^tailscale/i.test(name) ? 0 : /^utun/i.test(name) ? 1 : 2;
  candidates.sort(
    (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name),
  );
  return candidates[0]?.address ?? null;
}

/**
 * The address to listen on: `PASEO_TAILSCALE_ADDRESS` when set (the end-to-end suite points it at
 * a loopback address), else this machine's Tailscale IPv4 address.
 */
export function tailscaleAddress(
  env: NodeJS.ProcessEnv,
  interfaces: Interfaces = networkInterfaces(),
): string | null {
  return env.PASEO_TAILSCALE_ADDRESS?.trim() || findTailscaleIPv4(interfaces);
}
