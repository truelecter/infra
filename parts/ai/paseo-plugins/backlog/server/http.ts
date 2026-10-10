import { chmod, mkdir, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { dirname } from "node:path";
import { z } from "zod";
import {
  changesSchema,
  createInputSchema,
  statusSchema,
} from "../shared/backlog.ts";
import type { FileStore } from "./file-store.ts";
import {
  BacklogError,
  createItem,
  deleteItem,
  findItem,
  listItems,
  updateItem,
} from "./store.ts";

const MAX_BODY_BYTES = 1024 * 1024;

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES)
      throw new BacklogError("Request body is too large", "invalid");
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new BacklogError("Request body is not JSON", "invalid");
  }
}

async function route(
  store: FileStore,
  request: IncomingMessage,
): Promise<{ status: number; body: unknown }> {
  const url = new URL(request.url ?? "/", "http://backlog");
  const match = /^\/items(?:\/(\d+))?\/?$/.exec(url.pathname);
  if (!match)
    throw new BacklogError(`Unknown path ${url.pathname}`, "not_found");

  if (match[1] === undefined) {
    if (request.method === "GET") {
      const statuses = z
        .array(statusSchema)
        .parse(
          url.searchParams.get("status")?.split(",").filter(Boolean) ?? [],
        );
      return {
        status: 200,
        body: { items: listItems(await store.read(), statuses) },
      };
    }
    if (request.method === "POST") {
      const input = createInputSchema.parse(await readJson(request));
      return {
        status: 201,
        body: await store.mutate((data, now) => createItem(data, input, now)),
      };
    }
  } else {
    const id = Number(match[1]);
    if (request.method === "GET")
      return { status: 200, body: findItem(await store.read(), id) };
    if (request.method === "PATCH") {
      const changes = changesSchema.parse(await readJson(request));
      return {
        status: 200,
        body: await store.mutate((data, now) =>
          updateItem(data, id, changes, now),
        ),
      };
    }
    if (request.method === "DELETE") {
      return {
        status: 200,
        body: await store.mutate((data) => deleteItem(data, id)),
      };
    }
  }
  throw new BacklogError(
    `${request.method} is not supported on ${url.pathname}`,
    "invalid",
  );
}

function errorResponse(error: unknown): {
  status: number;
  body: { error: string };
} {
  if (error instanceof BacklogError) {
    return {
      status: error.code === "not_found" ? 404 : 400,
      body: { error: error.message },
    };
  }
  if (error instanceof z.ZodError)
    return { status: 400, body: { error: z.prettifyError(error) } };
  console.error("[backlog] Request failed", error);
  return {
    status: 500,
    body: { error: error instanceof Error ? error.message : String(error) },
  };
}

/** JSON API over a Unix socket for the `backlog` CLI. */
export function createBacklogServer(store: FileStore): Server {
  return createServer((request, response) => {
    void route(store, request)
      .catch(errorResponse)
      .then(({ status, body }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(`${JSON.stringify(body)}\n`);
      });
  });
}

/** Listens on `socketPath`, replacing a socket file left behind by an earlier run. */
export async function listen(
  server: Server,
  socketPath: string,
): Promise<() => Promise<void>> {
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
