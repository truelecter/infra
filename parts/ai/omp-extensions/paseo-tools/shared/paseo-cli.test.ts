import { test } from "node:test";
import assert from "node:assert/strict";
import { runPaseoCli } from "./paseo-cli.ts";

// The running JavaScript runtime stands in for the CLI: `<runtime> -e <script>`.
const runtime = process.execPath;

test("returns stdout on success, passing arguments without a shell", async () => {
  const result = await runPaseoCli(runtime, [
    "-e",
    "console.log(process.argv.at(-1))",
    "a b; echo hi",
  ]);
  assert.deepEqual(result, { ok: true, stdout: "a b; echo hi\n" });
});

test("reports stderr on failure", async () => {
  const result = await runPaseoCli(runtime, [
    "-e",
    "console.error('Agent not found'); process.exit(3)",
  ]);
  assert.deepEqual(result.ok, false);
  assert.match(!result.ok ? result.error : "", /failed: Agent not found/);
});

test("honours the abort signal", async () => {
  const controller = new AbortController();
  const pending = runPaseoCli(
    runtime,
    ["-e", "setTimeout(() => {}, 10000)"],
    controller.signal,
  );
  controller.abort();
  assert.deepEqual(await pending, { ok: false, error: "cancelled" });
});

// The timeout kills a real child process, which fake timers in this process cannot drive.
test("times out", async () => {
  const result = await runPaseoCli(
    runtime,
    ["-e", "setTimeout(() => {}, 10000)"],
    undefined,
    200,
  );
  assert.match(!result.ok ? result.error : "", /timed out/);
});
