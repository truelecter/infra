import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStatus } from "./tunnelblick.ts";

test("parses one line per configuration, names with spaces included", () => {
  assert.deepEqual(
    parseStatus(
      "RUNNING\nvpn-london\tCONNECTED\t2048\t512\nHome VPN\tEXITING\t0\t0\n",
    ),
    {
      tunnelblick: "running",
      configs: [
        {
          name: "vpn-london",
          state: "CONNECTED",
          bytesIn: 2048,
          bytesOut: 512,
        },
        { name: "Home VPN", state: "EXITING", bytesIn: 0, bytesOut: 0 },
      ],
    },
  );
});

test("reports a stopped Tunnelblick and rejects unexpected output", () => {
  assert.deepEqual(parseStatus("STOPPED\n"), {
    tunnelblick: "stopped",
    configs: [],
  });
  assert.deepEqual(parseStatus("RUNNING\n"), {
    tunnelblick: "running",
    configs: [],
  });
  assert.throws(
    () => parseStatus("execution error"),
    /Unexpected Tunnelblick status output/,
  );
});
