import net from "node:net";
import { type DaemonTarget, describeTarget } from "./daemon-target.ts";

export interface ForwarderOptions {
  port: number;
  upstream: DaemonTarget;
  detectAddress: () => string | null;
  onListening?: (address: string) => void;
  pollIntervalMs?: number;
  log?: (message: string) => void;
}

const DEFAULT_POLL_INTERVAL_MS = 15_000;

export class TailscaleForwarder {
  private readonly options: ForwarderOptions;
  private readonly log: (message: string) => void;
  private readonly sockets = new Set<net.Socket>();
  private server: net.Server | null = null;
  private boundAddress: string | null = null;
  private reconciling: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;
  private lastProblem: string | null = null;
  private stopped = false;

  constructor(options: ForwarderOptions) {
    this.options = options;
    this.log = options.log ?? ((message) => console.log(message));
  }

  get address(): string | null {
    return this.server?.listening ? this.boundAddress : null;
  }

  async start(): Promise<void> {
    this.timer = setInterval(
      () => void this.reconcile(),
      this.options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    );
    await this.reconcile();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.reconciling;
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    await this.closeServer();
  }

  reconcile(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.reconciling) return this.reconciling;
    this.reconciling = this.reconcileOnce().finally(() => {
      this.reconciling = null;
    });
    return this.reconciling;
  }

  private async reconcileOnce(): Promise<void> {
    const address = this.options.detectAddress();
    if (
      address !== null &&
      address === this.boundAddress &&
      this.server?.listening
    )
      return;

    if (this.server) {
      this.log(
        address
          ? `Tailscale address changed from ${this.boundAddress} to ${address}; rebinding.`
          : `Tailscale address ${this.boundAddress} is gone; listener closed.`,
      );
      // Do not wait for open connections: close() only resolves once they end.
      void this.closeServer();
    }

    if (!address) {
      this.problem(
        "No Tailscale IPv4 address found; waiting for Tailscale to connect.",
      );
      return;
    }
    await this.listen(address);
  }

  private listen(address: string): Promise<void> {
    const { port, upstream } = this.options;
    const server = net.createServer({ allowHalfOpen: true }, (client) =>
      this.forward(client),
    );

    return new Promise((resolve) => {
      const onStartupError = (error: NodeJS.ErrnoException) => {
        server.close();
        this.problem(
          `Cannot listen on ${address}:${port}: ${error.code ?? error.message}.`,
        );
        resolve();
      };
      server.once("error", onStartupError);
      server.listen({ host: address, port, exclusive: true }, () => {
        server.off("error", onStartupError);
        if (this.stopped) {
          server.close();
          resolve();
          return;
        }
        server.on("error", (error) =>
          this.log(`Listener error on ${address}:${port}: ${error.message}`),
        );
        this.server = server;
        this.boundAddress = address;
        this.lastProblem = null;
        this.log(
          `Forwarding ${address}:${port} -> ${describeTarget(upstream)}.`,
        );
        this.options.onListening?.(address);
        resolve();
      });
    });
  }

  private forward(client: net.Socket): void {
    const { upstream } = this.options;
    const target =
      upstream.kind === "tcp"
        ? net.connect({
            host: upstream.host,
            port: upstream.port,
            allowHalfOpen: true,
          })
        : net.connect({ path: upstream.path, allowHalfOpen: true });

    this.sockets.add(client);
    this.sockets.add(target);
    client.setNoDelay(true);
    if (upstream.kind === "tcp") target.setNoDelay(true);

    const teardown = () => {
      client.destroy();
      target.destroy();
    };
    client.on("error", teardown);
    target.on("error", teardown);
    client.on("close", () => {
      this.sockets.delete(client);
      target.destroy();
    });
    target.on("close", () => {
      this.sockets.delete(target);
      client.destroy();
    });

    client.pipe(target);
    target.pipe(client);
  }

  private closeServer(): Promise<void> {
    const server = this.server;
    this.server = null;
    this.boundAddress = null;
    if (!server) return Promise.resolve();
    return new Promise((resolve) => server.close(() => resolve()));
  }

  private problem(message: string): void {
    if (message === this.lastProblem) return;
    this.lastProblem = message;
    this.log(message);
  }
}
