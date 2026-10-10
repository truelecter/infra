import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import {
  createCliHostnamesConfig,
  HostnameSync,
  type HostnamesValue,
  isCoveredBy,
  mergeHostnames,
} from "./hostname-sync.ts";
import { lookupHostnames, magicDnsNames } from "./magicdns.ts";

describe("magicDnsNames", () => {
  it("normalizes PTR records into FQDN and short name", () => {
    assert.deepEqual(magicDnsNames(["SquadBook.saga-monitor.ts.net."]), [
      "squadbook",
      "squadbook.saga-monitor.ts.net",
    ]);
  });

  it("drops invalid records and duplicates", () => {
    assert.deepEqual(
      magicDnsNames(["bad name.ts.net", "", "a.ts.net", "a.ts.net."]),
      ["a", "a.ts.net"],
    );
  });
});

describe("lookupHostnames", () => {
  const lookup = async (address: string) => [`looked-up-${address}`];

  it("uses PASEO_TAILSCALE_HOSTNAMES instead of the lookup when set", async () => {
    assert.deepEqual(
      await lookupHostnames(
        "::1",
        { PASEO_TAILSCALE_HOSTNAMES: "E2E.tailnet.ts.net, other.ts.net" },
        lookup,
      ),
      ["e2e", "e2e.tailnet.ts.net", "other", "other.ts.net"],
    );
  });

  it("falls back to the lookup", async () => {
    assert.deepEqual(
      await lookupHostnames(
        "100.64.0.1",
        { PASEO_TAILSCALE_HOSTNAMES: " " },
        lookup,
      ),
      ["looked-up-100.64.0.1"],
    );
  });
});

describe("mergeHostnames", () => {
  const names = ["squadbook", "squadbook.saga-monitor.ts.net"];

  it("adds missing names after existing entries", () => {
    assert.deepEqual(mergeHostnames(["example.com"], names), {
      hostnames: ["example.com", ...names],
      added: names,
    });
    assert.deepEqual(mergeHostnames(undefined, names)?.hostnames, names);
  });

  it("respects wildcard patterns and allow-all", () => {
    assert.equal(isCoveredBy("squadbook.saga-monitor.ts.net", ".ts.net"), true);
    assert.equal(isCoveredBy("squadbook", ".ts.net"), false);
    assert.deepEqual(mergeHostnames([".saga-monitor.ts.net"], names)?.added, [
      "squadbook",
    ]);
    assert.equal(mergeHostnames(true, names), null);
    assert.equal(mergeHostnames(["SQUADBOOK", ...names.slice(1)], names), null);
  });
});

function fakeConfig(initial: HostnamesValue) {
  // `ready` stands for the daemon: while false, a save is not applied (like a daemon still starting).
  const state = {
    value: initial,
    gets: 0,
    sets: [] as string[][],
    failSet: false,
    ready: true,
  };
  return {
    state,
    access: {
      async get() {
        state.gets += 1;
        return state.value;
      },
      async set(hostnames: string[]) {
        if (state.failSet) throw new Error("reload failed");
        state.sets.push(hostnames);
        state.value = hostnames;
        return state.ready;
      },
    },
  };
}

describe("HostnameSync", () => {
  it("writes once, then only re-reads config when names change", async () => {
    const { state, access } = fakeConfig(["localhost"]);
    let names = ["a", "a.ts.net"];
    const logs: string[] = [];
    const sync = new HostnameSync({
      config: access,
      lookup: async () => names,
      getAddress: () => "100.64.0.1",
      log: (message) => logs.push(message),
    });

    await sync.sync();
    await sync.sync();
    assert.deepEqual(state.sets, [["localhost", "a", "a.ts.net"]]);
    assert.equal(state.gets, 1);

    names = ["b", "b.ts.net"];
    await sync.sync();
    assert.deepEqual(state.sets.at(-1), [
      "localhost",
      "a",
      "a.ts.net",
      "b",
      "b.ts.net",
    ]);
    assert.ok(logs.includes("Added b, b.ts.net to daemon.hostnames."));
    await sync.stop();
  });

  it("does nothing without an address and reports missing MagicDNS once", async () => {
    const { state, access } = fakeConfig(undefined);
    let address: string | null = null;
    const logs: string[] = [];
    const sync = new HostnameSync({
      config: access,
      lookup: async () => [],
      getAddress: () => address,
      log: (message) => logs.push(message),
    });
    await sync.sync();
    address = "100.64.0.1";
    await sync.sync();
    await sync.sync();
    assert.equal(state.gets, 0);
    assert.equal(logs.length, 1);
    assert.match(logs[0] ?? "", /No MagicDNS name/);
  });

  it("retries after a failed write", async () => {
    const { state, access } = fakeConfig(undefined);
    state.failSet = true;
    const logs: string[] = [];
    const sync = new HostnameSync({
      config: access,
      lookup: async () => ["a"],
      getAddress: () => "100.64.0.1",
      log: (message) => logs.push(message),
    });
    await sync.sync();
    assert.deepEqual(logs, ["Hostname sync failed: reload failed"]);
    state.failSet = false;
    await sync.sync();
    assert.deepEqual(state.sets, [["a"]]);
  });

  it("saves again until a daemon that was still starting applies the names", async () => {
    const { state, access } = fakeConfig(["localhost"]);
    // The daemon becomes ready by the third save.
    const set = access.set;
    access.set = async (hostnames) => {
      state.ready = state.sets.length >= 2;
      return set(hostnames);
    };
    const logs: string[] = [];
    const { promise: applied, resolve } = Promise.withResolvers<void>();
    const sync = new HostnameSync({
      config: access,
      lookup: async () => ["a"],
      getAddress: () => "100.64.0.1",
      retryMs: 0,
      log: (message) => {
        logs.push(message);
        if (message === "Applied daemon.hostnames to the running daemon.")
          resolve();
      },
    });

    await sync.sync();
    await applied;
    assert.deepEqual(state.sets, [
      ["localhost", "a"],
      ["localhost", "a"],
      ["localhost", "a"],
    ]);
    assert.equal(logs.filter((message) => /not ready/.test(message)).length, 1);
    // Applied: nothing to save until the names change.
    await sync.sync();
    assert.equal(state.sets.length, 3);
    await sync.stop();
  });

  it("doesn't save names the daemon already had at start", async () => {
    const { state, access } = fakeConfig(["a"]);
    const logs: string[] = [];
    const sync = new HostnameSync({
      config: access,
      lookup: async () => ["a"],
      getAddress: () => "100.64.0.1",
      log: (message) => logs.push(message),
    });
    await sync.sync();
    assert.deepEqual(state.sets, []);
    assert.deepEqual(logs, ["daemon.hostnames already allows a."]);
  });
});

describe("createCliHostnamesConfig", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "tailscale-listener-cli-"));
  const cli = path.join(dir, "paseo");
  const argsLog = path.join(dir, "args.log");
  after(() => rmSync(dir, { recursive: true, force: true }));

  function writeCli(getOutput: string, setOutput: string, setExit = 0) {
    writeFileSync(
      cli,
      [
        "#!/bin/sh",
        `printf '%s\\n' "$*" >> '${argsLog}'`,
        `if [ "$3" = get ]; then printf '%s' '${getOutput}'; exit 0; fi`,
        `printf '%s' '${setOutput}'; exit ${setExit}`,
        "",
      ].join("\n"),
    );
    chmodSync(cli, 0o755);
  }

  it("reads and writes daemon.hostnames through the CLI", async () => {
    writeCli(
      '{"set":true,"value":["squadbook"]}',
      '{"action":"saved","appliedPaths":["daemon.hostnames"]}',
    );
    const config = createCliHostnamesConfig(cli, "/home/paseo");
    assert.deepEqual(await config.get(), ["squadbook"]);
    assert.equal(await config.set(["squadbook", "squadbook.ts.net"]), true);
    const lines = readFileSync(argsLog, "utf8").trim().split("\n");
    assert.equal(
      lines[0],
      "daemon config get daemon.hostnames --home /home/paseo --json",
    );
    assert.equal(
      lines[1],
      'daemon config set daemon.hostnames ["squadbook","squadbook.ts.net"] --home /home/paseo --json',
    );
  });

  it("reports a save the daemon did not apply", async () => {
    writeCli(
      '{"set":true,"value":[]}',
      '{"action":"saved","applied":false,"message":"Saved; not applied to a running daemon"}',
    );
    assert.equal(
      await createCliHostnamesConfig(cli, "/home/paseo").set(["a"]),
      false,
    );
  });

  it("treats an unset value as undefined and surfaces CLI errors", async () => {
    writeCli(
      '{"set":false}',
      '{"error":{"message":"saved; reload failed"}}',
      1,
    );
    const config = createCliHostnamesConfig(cli, "/home/paseo");
    assert.equal(await config.get(), undefined);
    await assert.rejects(config.set(["a"]), {
      message: "saved; reload failed",
    });
  });
});
