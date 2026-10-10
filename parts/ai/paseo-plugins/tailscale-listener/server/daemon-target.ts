import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const DEFAULT_DAEMON_PORT = 6767;

export type DaemonTarget =
  | { kind: "tcp"; host: string; port: number }
  | { kind: "socket"; path: string };

export interface DaemonSettings {
  listen: string;
  hasPassword: boolean;
}

export type ForwardingPlan =
  | { kind: "forward"; port: number; upstream: DaemonTarget }
  | { kind: "skip"; reason: string };

interface PersistedConfig {
  daemon?: {
    listen?: unknown;
    auth?: { password?: unknown };
  };
}

function expandHome(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return path.join(homedir(), value.slice(2));
  return value;
}

export function resolvePaseoHome(env: NodeJS.ProcessEnv): string {
  const home = env.PASEO_HOME?.trim();
  return home ? expandHome(home) : path.join(homedir(), ".paseo");
}

// Mirrors the daemon's precedence: PASEO_LISTEN, then config.json, then the default.
export function readDaemonSettings(
  env: NodeJS.ProcessEnv,
  readConfig: (file: string) => string = (file) => readFileSync(file, "utf8"),
): DaemonSettings {
  const configPath = path.join(resolvePaseoHome(env), "config.json");
  let config: PersistedConfig = {};
  try {
    config = JSON.parse(readConfig(configPath)) as PersistedConfig;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.warn(
        `Could not read ${configPath}; assuming defaults: ${String(error)}`,
      );
    }
  }

  const persistedListen = config.daemon?.listen;
  const listen =
    env.PASEO_LISTEN?.trim() ||
    (typeof persistedListen === "string" && persistedListen.trim()) ||
    `127.0.0.1:${env.PORT ?? DEFAULT_DAEMON_PORT}`;

  const persistedPassword = config.daemon?.auth?.password;
  const hasPassword =
    Boolean(env.PASEO_PASSWORD?.trim()) ||
    (typeof persistedPassword === "string" && persistedPassword.length > 0);

  return { listen, hasPassword };
}

export function parseListen(listen: string): DaemonTarget | null {
  const value = listen.trim();
  if (value.startsWith("pipe://") || value.startsWith("\\\\.\\pipe\\"))
    return null;
  if (value.startsWith("unix://"))
    return { kind: "socket", path: expandHome(value.slice(7)) };
  if (value.startsWith("/") || value.startsWith("~")) {
    return { kind: "socket", path: expandHome(value) };
  }
  if (/^\d+$/.test(value))
    return { kind: "tcp", host: "127.0.0.1", port: Number(value) };

  const colon = value.lastIndexOf(":");
  if (colon === -1) return null;
  const rawHost = value.slice(0, colon);
  const port = Number(value.slice(colon + 1));
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;
  const host =
    rawHost.startsWith("[") && rawHost.endsWith("]")
      ? rawHost.slice(1, -1)
      : rawHost;
  return { kind: "tcp", host: host || "127.0.0.1", port };
}

export function isLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "::ffff:127.0.0.1" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

export function planForwarding(settings: DaemonSettings): ForwardingPlan {
  const upstream = parseListen(settings.listen);
  if (!upstream) {
    return {
      kind: "skip",
      reason: `Unsupported daemon listen address "${settings.listen}".`,
    };
  }
  if (upstream.kind === "tcp" && !isLoopbackHost(upstream.host)) {
    return {
      kind: "skip",
      reason: `Daemon already listens on ${settings.listen}; nothing to forward.`,
    };
  }
  const port = upstream.kind === "tcp" ? upstream.port : DEFAULT_DAEMON_PORT;
  return { kind: "forward", port, upstream };
}

export function describeTarget(target: DaemonTarget): string {
  return target.kind === "tcp"
    ? `${target.host}:${target.port}`
    : `unix://${target.path}`;
}
