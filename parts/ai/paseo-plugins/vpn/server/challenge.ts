/**
 * Hands a TOTP code typed in Paseo to the Tunnelblick challenge script.
 *
 * The script asks with `request` and waits. A code typed while it waits answers it.
 * A code typed before any challenge (with Connect) is kept for a short time, so the
 * next challenge gets it at once; TOTP codes go stale, so it expires.
 */

export interface PendingChallenge {
  config: string;
  prompt: string;
  since: number;
  deadline: number;
}

interface Waiter extends PendingChallenge {
  resolve(code: string | null): void;
  timer: NodeJS.Timeout;
}

export interface BrokerSnapshot {
  challenge: PendingChallenge | null;
  queuedCode: { expiresAt: number } | null;
}

/** Long enough to type a code and press Connect; short enough that the code is still valid. */
export const QUEUED_CODE_TTL_MS = 60_000;

export class ChallengeBroker {
  #waiter: Waiter | null = null;
  #queued: { code: string; expiresAt: number } | null = null;
  readonly #now: () => number;
  readonly #queueTtlMs: number;

  constructor(options: { now?: () => number; queueTtlMs?: number } = {}) {
    this.#now = options.now ?? Date.now;
    this.#queueTtlMs = options.queueTtlMs ?? QUEUED_CODE_TTL_MS;
  }

  /**
   * Resolves with the code for a challenge, or with null when no code arrives within
   * `waitMs` or `signal` aborts (the script gave up). A newer challenge replaces an
   * older one that is still waiting.
   */
  request(
    config: string,
    prompt: string,
    waitMs: number,
    signal?: AbortSignal,
  ): Promise<string | null> {
    const queued = this.takeQueued();
    if (queued !== null) return Promise.resolve(queued);
    this.#finish(null);
    if (signal?.aborted || waitMs <= 0) return Promise.resolve(null);

    const { promise, resolve } = Promise.withResolvers<string | null>();
    const since = this.#now();
    const waiter: Waiter = {
      config,
      prompt,
      since,
      deadline: since + waitMs,
      resolve,
      timer: setTimeout(() => this.#finish(null, waiter), waitMs),
    };
    this.#waiter = waiter;
    signal?.addEventListener("abort", () => this.#finish(null, waiter), {
      once: true,
    });
    return promise;
  }

  /** Gives the code to the waiting challenge, or keeps it for the next one. */
  answer(code: string): "answered" | "queued" {
    if (this.#waiter) {
      this.#finish(code);
      return "answered";
    }
    this.#queued = { code, expiresAt: this.#now() + this.#queueTtlMs };
    return "queued";
  }

  snapshot(): BrokerSnapshot {
    const waiter = this.#waiter;
    const queued = this.#liveQueued();
    return {
      challenge: waiter
        ? {
            config: waiter.config,
            prompt: waiter.prompt,
            since: waiter.since,
            deadline: waiter.deadline,
          }
        : null,
      queuedCode: queued ? { expiresAt: queued.expiresAt } : null,
    };
  }

  /** Releases a waiting script with no code. */
  close(): void {
    this.#finish(null);
    this.#queued = null;
  }

  #liveQueued() {
    if (this.#queued && this.#queued.expiresAt <= this.#now())
      this.#queued = null;
    return this.#queued;
  }

  /** Removes and returns the queued code, for a challenge that doesn't go through `request`. */
  takeQueued(): string | null {
    const queued = this.#liveQueued();
    this.#queued = null;
    return queued?.code ?? null;
  }

  /** Resolves the current waiter, or only `expected` if given and still current. */
  #finish(code: string | null, expected?: Waiter): void {
    const waiter = this.#waiter;
    if (!waiter || (expected && waiter !== expected)) return;
    this.#waiter = null;
    clearTimeout(waiter.timer);
    waiter.resolve(code);
  }
}
