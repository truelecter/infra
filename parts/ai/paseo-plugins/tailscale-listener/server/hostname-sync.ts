import { execFile } from "node:child_process";

export type HostnamesValue = true | string[] | undefined;

export interface HostnamesConfigAccess {
  get(): Promise<HostnamesValue>;
  /** Saves the list; resolves to whether the running daemon applied it too. */
  set(hostnames: string[]): Promise<boolean>;
}

export interface HostnameSyncOptions {
  config: HostnamesConfigAccess;
  lookup: (address: string) => Promise<string[]>;
  getAddress: () => string | null;
  intervalMs?: number;
  /** Delay before saving again when the daemon did not apply a change (not ready yet). */
  retryMs?: number;
  log?: (message: string) => void;
}

const DEFAULT_INTERVAL_MS = 5 * 60_000;
const DEFAULT_RETRY_MS = 10_000;

// Same matching rules as the daemon's hostname allowlist.
export function isCoveredBy(hostname: string, pattern: string): boolean {
  const normalized = pattern.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith(".")) {
    const base = normalized.slice(1);
    return (
      base.length > 0 && (hostname === base || hostname.endsWith(`.${base}`))
    );
  }
  return hostname === normalized;
}

// Returns the list to write and the names it adds, or null when every name is already allowed.
export function mergeHostnames(
  current: HostnamesValue,
  names: readonly string[],
): { hostnames: string[]; added: string[] } | null {
  if (current === true) return null;
  const existing = current ?? [];
  const added = names.filter(
    (name) => !existing.some((pattern) => isCoveredBy(name, pattern)),
  );
  return added.length ? { hostnames: [...existing, ...added], added } : null;
}

function runCli(cli: string, args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    execFile(
      cli,
      args,
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        let parsed: unknown;
        try {
          parsed = stdout.trim() ? JSON.parse(stdout) : undefined;
        } catch {
          parsed = undefined;
        }
        const message = (parsed as { error?: { message?: string } } | undefined)
          ?.error?.message;
        if (error || message) {
          reject(new Error(message ?? error?.message ?? "paseo CLI failed"));
          return;
        }
        resolve(parsed);
      },
    );
  });
}

export function createCliHostnamesConfig(
  cli: string,
  home: string,
): HostnamesConfigAccess {
  const common = ["--home", home, "--json"];
  return {
    async get() {
      const result = (await runCli(cli, [
        "daemon",
        "config",
        "get",
        "daemon.hostnames",
        ...common,
      ])) as { set?: boolean; value?: unknown } | undefined;
      if (!result?.set) return undefined;
      const { value } = result;
      if (value === true) return true;
      if (
        Array.isArray(value) &&
        value.every((item) => typeof item === "string")
      )
        return value;
      throw new Error(
        `Unexpected daemon.hostnames value: ${JSON.stringify(value)}`,
      );
    },
    async set(hostnames) {
      const result = (await runCli(cli, [
        "daemon",
        "config",
        "set",
        "daemon.hostnames",
        JSON.stringify(hostnames),
        ...common,
      ])) as { applied?: boolean } | undefined;
      // "Saved; not applied to a running daemon" carries `applied: false`; a reload result doesn't.
      return result?.applied !== false;
    },
  };
}

export class HostnameSync {
  private readonly options: HostnameSyncOptions;
  private readonly log: (message: string) => void;
  private timer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  private syncedKey: string | null = null;
  // Saved to config.json but not applied to the daemon yet.
  private unapplied = false;
  private lastProblem: string | null = null;
  private stopped = false;

  constructor(options: HostnameSyncOptions) {
    this.options = options;
    this.log = options.log ?? ((message) => console.log(message));
  }

  start(): void {
    this.timer = setInterval(
      () => void this.sync(),
      this.options.intervalMs ?? DEFAULT_INTERVAL_MS,
    );
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearInterval(this.timer ?? undefined);
    clearTimeout(this.retryTimer ?? undefined);
    this.timer = null;
    this.retryTimer = null;
    await this.running;
  }

  sync(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.syncOnce()
      .catch((error: unknown) => {
        this.problem(
          `Hostname sync failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  private async syncOnce(): Promise<void> {
    const address = this.options.getAddress();
    if (!address) return;

    const names = await this.options.lookup(address);
    if (!names.length) {
      this.problem(
        `No MagicDNS name found for ${address}; is MagicDNS enabled?`,
      );
      return;
    }
    const key = names.join(",");
    if (key === this.syncedKey) return;

    const current = await this.options.config.get();
    const merge = mergeHostnames(current, names);
    let applied = true;
    if (merge) {
      applied = await this.options.config.set(merge.hostnames);
      this.log(`Added ${merge.added.join(", ")} to daemon.hostnames.`);
    } else if (this.unapplied && Array.isArray(current)) {
      // Saving the same list again is what applies it to the daemon now that it may be ready.
      applied = await this.options.config.set(current);
    } else {
      this.log(`daemon.hostnames already allows ${names.join(", ")}.`);
    }

    if (!applied) {
      // A daemon that is still starting (loading plugins, which is when this first runs) read
      // config.json before the change and isn't reachable for a reload yet.
      this.unapplied = true;
      this.problem(
        "daemon.hostnames is saved but the daemon is not ready to apply it; retrying.",
      );
      this.scheduleRetry();
      return;
    }
    if (this.unapplied)
      this.log("Applied daemon.hostnames to the running daemon.");
    this.unapplied = false;
    this.syncedKey = key;
    this.lastProblem = null;
  }

  private scheduleRetry(): void {
    if (this.retryTimer || this.stopped) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.sync();
    }, this.options.retryMs ?? DEFAULT_RETRY_MS);
  }

  private problem(message: string): void {
    if (message === this.lastProblem) return;
    this.lastProblem = message;
    this.log(message);
  }
}
