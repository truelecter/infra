import { request } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { env } from "../support/env";
import { expect, openApp, test } from "../support/fixtures";

interface Item {
  id: number;
  title: string;
  status: "open" | "waiting" | "done";
}

// The plugin serves its JSON API on <PASEO_BACKLOG_DIR>/backlog.sock; the harness points that
// folder into the temp root. Every route used here answers with one item (backlog/README.md).
function api(method: string, route: string, body?: object): Promise<{ status: number; item: Item }> {
  const { promise, resolve, reject } = Promise.withResolvers<{ status: number; item: Item }>();
  const req = request(
    {
      socketPath: path.join(env.backlogDir, "backlog.sock"),
      path: route,
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, item: JSON.parse(data) as Item }));
    },
  );
  req.on("error", reject);
  if (body !== undefined) req.write(JSON.stringify(body));
  req.end();
  return promise;
}

test("items written over the socket show on the Backlog screen, and a status change there reaches the API", async ({
  page,
}) => {
  const title = `E2E backlog item ${randomUUID().slice(0, 8)}`;
  const created = await api("POST", "/items", { title, description: "Created by the **e2e** suite." });
  expect(created.status).toBe(201);
  const id = created.item.id;

  try {
    await openApp(page);
    await page.getByTestId("plugin-sidebar-backlog-backlog").click();
    const card = page.getByText(title, { exact: true });
    await expect(card).toBeVisible();

    // The status chips are labelled "Mark <status>"; pick the one inside this item's card.
    const item = page.locator("div").filter({ has: card }).filter({ has: page.getByLabel("Mark Waiting") }).last();
    await item.getByLabel("Mark Waiting").click();
    await expect.poll(async () => (await api("GET", `/items/${id}`)).item.status).toBe("waiting");

    // The `backlog` CLI changes items with PATCH; the screen picks changes up by polling (5 s).
    const renamed = `${title} (renamed)`;
    const patched = await api("PATCH", `/items/${id}`, { title: renamed, log: "Checked by the e2e suite" });
    expect(patched.item.title).toBe(renamed);
    await expect(page.getByText(renamed, { exact: true })).toBeVisible();
  } finally {
    await api("DELETE", `/items/${id}`);
  }
});
