import { chmod, mkdir, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ChallengeBroker } from "./challenge.ts";

const MAX_BODY_BYTES = 64 * 1024;
/** Tunnelblick kills the challenge script after 50 seconds; never hold it longer than this. */
export const MAX_WAIT_SECONDS = 45;

/**
 * Folder for the socket. The challenge script hard-codes the default, because
 * Tunnelblick runs it with a fixed environment; PASEO_VPN_DIR is for tests.
 */
export function vpnDir(): string {
  return process.env.PASEO_VPN_DIR ?? join(homedir(), ".local", "share", "paseo-vpn");
}

async function readForm(request: IncomingMessage): Promise<URLSearchParams | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk as Buffer);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

/**
 * `POST /challenge?wait=<seconds>` with a form body of `config` and `challenge`.
 * Answers `200` with the code as plain text, or `204` when nobody typed one in time.
 */
export function createChallengeServer(broker: ChallengeBroker): Server {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://paseo-vpn");
    if (url.pathname !== "/challenge" || request.method !== "POST") {
      response.writeHead(404, { "content-type": "text/plain" }).end("Use POST /challenge\n");
      return;
    }
    const form = await readForm(request);
    const wait = Number(url.searchParams.get("wait") ?? MAX_WAIT_SECONDS);
    if (!form || !Number.isFinite(wait)) {
      response.writeHead(400, { "content-type": "text/plain" }).end("Bad request\n");
      return;
    }

    // The script is killed, or curl times out: stop waiting for it.
    const gone = new AbortController();
    response.on("close", () => gone.abort());
    const code = await broker.request(
      form.get("config") ?? "",
      form.get("challenge") ?? "",
      Math.min(Math.max(wait, 0), MAX_WAIT_SECONDS) * 1000,
      gone.signal,
    );
    if (code === null) response.writeHead(204).end();
    else response.writeHead(200, { "content-type": "text/plain" }).end(code);
  });
}

/** Listens on `socketPath`, readable only by this user, replacing a socket left behind by an earlier run. */
export async function listen(server: Server, socketPath: string): Promise<() => Promise<void>> {
  await mkdir(dirname(socketPath), { recursive: true, mode: 0o700 });
  await rm(socketPath, { force: true });
  const listening = Promise.withResolvers<void>();
  server.once("error", listening.reject);
  server.listen(socketPath, () => listening.resolve());
  await listening.promise;
  server.off("error", listening.reject);
  await chmod(socketPath, 0o600);
  return async () => {
    const closed = Promise.withResolvers<void>();
    server.close(() => closed.resolve());
    server.closeAllConnections();
    await closed.promise;
    await rm(socketPath, { force: true });
  };
}
