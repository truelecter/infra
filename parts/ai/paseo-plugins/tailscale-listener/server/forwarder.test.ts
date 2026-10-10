import assert from "node:assert/strict";
import net from "node:net";
import { after, describe, it } from "node:test";
import {
  parseListen,
  planForwarding,
  readDaemonSettings,
} from "./daemon-target.ts";
import { TailscaleForwarder } from "./forwarder.ts";
import {
  findTailscaleIPv4,
  isTailscaleIPv4,
  tailscaleAddress,
} from "./tailscale.ts";

describe("parseListen", () => {
  it("parses TCP, port-only, IPv6, and socket forms", () => {
    assert.deepEqual(parseListen("127.0.0.1:6767"), {
      kind: "tcp",
      host: "127.0.0.1",
      port: 6767,
    });
    assert.deepEqual(parseListen("7777"), {
      kind: "tcp",
      host: "127.0.0.1",
      port: 7777,
    });
    assert.deepEqual(parseListen("[::1]:6767"), {
      kind: "tcp",
      host: "::1",
      port: 6767,
    });
    assert.deepEqual(parseListen("unix:///tmp/paseo.sock"), {
      kind: "socket",
      path: "/tmp/paseo.sock",
    });
    assert.deepEqual(parseListen("/tmp/paseo.sock"), {
      kind: "socket",
      path: "/tmp/paseo.sock",
    });
  });

  it("rejects pipes and invalid ports", () => {
    assert.equal(parseListen("pipe://paseo"), null);
    assert.equal(parseListen("127.0.0.1:abc"), null);
    assert.equal(parseListen("127.0.0.1:70000"), null);
  });
});

describe("readDaemonSettings", () => {
  const config = (value: unknown) => () => JSON.stringify(value);

  it("prefers PASEO_LISTEN over config.json", () => {
    const settings = readDaemonSettings(
      { PASEO_HOME: "/x", PASEO_LISTEN: "127.0.0.1:9000" },
      config({ daemon: { listen: "127.0.0.1:6767" } }),
    );
    assert.equal(settings.listen, "127.0.0.1:9000");
  });

  it("falls back to the default when config.json is missing", () => {
    const missing = () => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    };
    assert.deepEqual(readDaemonSettings({ PASEO_HOME: "/x" }, missing), {
      listen: "127.0.0.1:6767",
      hasPassword: false,
    });
  });

  it("detects a configured password", () => {
    const settings = readDaemonSettings(
      { PASEO_HOME: "/x" },
      config({ daemon: { auth: { password: "$2b$12$hash" } } }),
    );
    assert.equal(settings.hasPassword, true);
  });
});

describe("planForwarding", () => {
  it("forwards a loopback TCP daemon on the same port", () => {
    assert.deepEqual(
      planForwarding({ listen: "127.0.0.1:6767", hasPassword: false }),
      {
        kind: "forward",
        port: 6767,
        upstream: { kind: "tcp", host: "127.0.0.1", port: 6767 },
      },
    );
  });

  it("skips daemons that already listen on a non-loopback address", () => {
    assert.equal(
      planForwarding({ listen: "0.0.0.0:6767", hasPassword: false }).kind,
      "skip",
    );
    assert.equal(
      planForwarding({ listen: "100.101.102.103:6767", hasPassword: false })
        .kind,
      "skip",
    );
  });

  it("forwards a socket daemon on the default port", () => {
    const plan = planForwarding({
      listen: "unix:///tmp/paseo.sock",
      hasPassword: false,
    });
    assert.equal(plan.kind === "forward" && plan.port, 6767);
  });
});

describe("tailscale address detection", () => {
  it("matches only the CGNAT range", () => {
    assert.equal(isTailscaleIPv4("100.64.0.1"), true);
    assert.equal(isTailscaleIPv4("100.127.255.255"), true);
    assert.equal(isTailscaleIPv4("100.63.0.1"), false);
    assert.equal(isTailscaleIPv4("100.128.0.1"), false);
    assert.equal(isTailscaleIPv4("192.168.1.10"), false);
  });

  it("prefers tailscale/utun interfaces and skips internal addresses", () => {
    const entry = (address: string, internal = false) => ({
      address,
      netmask: "255.255.255.255",
      family: "IPv4" as const,
      mac: "00:00:00:00:00:00",
      internal,
      cidr: `${address}/32`,
    });
    assert.equal(
      findTailscaleIPv4({
        en0: [entry("100.70.0.1")],
        lo0: [entry("100.80.0.1", true)],
        utun4: [entry("100.112.44.18")],
      }),
      "100.112.44.18",
    );
    assert.equal(findTailscaleIPv4({ en0: [entry("192.168.1.2")] }), null);
  });

  it("lets PASEO_TAILSCALE_ADDRESS replace detection", () => {
    const entry = {
      address: "100.112.44.18",
      netmask: "255.255.255.255",
      family: "IPv4" as const,
      mac: "00:00:00:00:00:00",
      internal: false,
      cidr: "100.112.44.18/32",
    };
    assert.equal(
      tailscaleAddress(
        { PASEO_TAILSCALE_ADDRESS: " ::1 " },
        { utun4: [entry] },
      ),
      "::1",
    );
    assert.equal(
      tailscaleAddress({ PASEO_TAILSCALE_ADDRESS: "" }, { utun4: [entry] }),
      "100.112.44.18",
    );
    assert.equal(tailscaleAddress({}, {}), null);
  });
});

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

function roundTrip(port: number, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    let received = "";
    socket.on("data", (chunk) => {
      received += chunk.toString();
    });
    socket.on("end", () => resolve(received));
    socket.on("error", reject);
    socket.end(payload);
  });
}

describe("TailscaleForwarder", () => {
  const upstream = net.createServer({ allowHalfOpen: true }, (socket) => {
    let body = "";
    socket.on("data", (chunk) => {
      body += chunk.toString();
    });
    // Reply only after the client half-closes, to prove half-open streams survive the proxy.
    socket.on("end", () => socket.end(`echo:${body}`));
  });
  after(() => new Promise<void>((resolve) => upstream.close(() => resolve())));

  it("forwards traffic and follows address changes", async () => {
    await new Promise<void>((resolve) =>
      upstream.listen(0, "127.0.0.1", resolve),
    );
    const upstreamPort = (upstream.address() as net.AddressInfo).port;
    const port = await freePort();
    let address: string | null = "127.0.0.1";
    const logs: string[] = [];
    const forwarder = new TailscaleForwarder({
      port,
      upstream: { kind: "tcp", host: "127.0.0.1", port: upstreamPort },
      detectAddress: () => address,
      pollIntervalMs: 60_000,
      log: (message) => logs.push(message),
    });

    await forwarder.start();
    assert.equal(forwarder.address, "127.0.0.1");
    assert.equal(await roundTrip(port, "hello"), "echo:hello");

    address = null;
    await forwarder.reconcile();
    assert.equal(forwarder.address, null);
    await assert.rejects(roundTrip(port, "gone"), { code: "ECONNREFUSED" });

    address = "127.0.0.1";
    await forwarder.reconcile();
    assert.equal(await roundTrip(port, "back"), "echo:back");

    await forwarder.stop();
    assert.equal(forwarder.address, null);
    assert.ok(logs.some((line) => line.includes("is gone")));
  });

  it("reports a bind failure once and keeps retrying", async () => {
    const logs: string[] = [];
    const forwarder = new TailscaleForwarder({
      port: await freePort(),
      upstream: { kind: "tcp", host: "127.0.0.1", port: 1 },
      detectAddress: () => "203.0.113.1",
      pollIntervalMs: 60_000,
      log: (message) => logs.push(message),
    });
    await forwarder.start();
    await forwarder.reconcile();
    await forwarder.stop();
    assert.equal(forwarder.address, null);
    assert.equal(
      logs.filter((line) => line.startsWith("Cannot listen")).length,
      1,
    );
  });
});
