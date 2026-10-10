import type { PluginServerContext } from "@getpaseo/plugin/server";
import { join } from "node:path";
import {
  createItem,
  deleteItem,
  listItems,
  setDescriptionOpen,
  updateItem,
} from "./shared/backlog.ts";
import { backlogDir, FileStore } from "./server/file-store.ts";
import { createBacklogServer, listen } from "./server/http.ts";
import * as store from "./server/store.ts";

export default function contribute(server: PluginServerContext) {
  const dir = backlogDir();
  const items = new FileStore(join(dir, "items.json"));

  server.handle(listItems, async ({ status }) => {
    const data = await items.read();
    return { items: store.listItems(data, status), openIds: data.openIds };
  });
  server.handle(createItem, (input) =>
    items.mutate((data, now) => store.createItem(data, input, now)),
  );
  server.handle(updateItem, ({ id, changes }) =>
    items.mutate((data, now) => store.updateItem(data, id, changes, now)),
  );
  server.handle(deleteItem, async ({ id }) => {
    await items.mutate((data) => store.deleteItem(data, id));
    return {};
  });
  server.handle(setDescriptionOpen, async ({ id, open }) => {
    await items.mutate((data) => store.setDescriptionOpen(data, id, open));
    return {};
  });

  const socketPath = join(dir, "backlog.sock");
  const started = listen(createBacklogServer(items), socketPath).then(
    (stop) => {
      console.log(
        `[backlog] Listening on ${socketPath}, items in ${items.path}`,
      );
      return stop;
    },
    (error: unknown) => {
      console.error(`[backlog] Could not listen on ${socketPath}`, error);
      return null;
    },
  );

  return async () => {
    await (
      await started
    )?.();
  };
}
