import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChallengeBroker } from "./challenge.ts";
import { createChallengeServer, listen } from "./http.ts";

// Runs the real Tunnelblick challenge script against the socket server, with HOME
// pointing at a temporary folder so the script finds the test socket.
const SCRIPT = join(import.meta.dirname, "..", "tunnelblick", "challenge-response.user.sh");

let home: string;
let broker: ChallengeBroker;
let stop: () => Promise<void>;

before(async () => {
  home = await mkdtemp(join(tmpdir(), "vpn-"));
  broker = new ChallengeBroker();
  stop = await listen(createChallengeServer(broker), join(home, ".local", "share", "paseo-vpn", "vpn.sock"));
});

after(async () => {
  broker.close();
  await stop();
  await rm(home, { recursive: true, force: true });
});

function runScript(env: Record<string, string> = {}) {
  const { promise, resolve } = Promise.withResolvers<{ status: number; stdout: string; stderr: string }>();
  execFile(
    SCRIPT,
    ["Enter Authenticator Code: 6 digits", "vpn-london", "vpn-london", "echo"],
    { env: { PATH: "/usr/bin:/bin", HOME: home, ...env } },
    (error, stdout, stderr) => resolve({ status: error ? Number(error.code) : 0, stdout, stderr }),
  );
  return promise;
}

// The script is a separate process talking over a real socket, so fake timers can't
// reach it: poll the broker until its request has arrived (at most 2 s).
async function waitForChallenge() {
  for (let i = 0; i < 100 && !broker.snapshot().challenge; i++) {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 20);
    await promise;
  }
  return broker.snapshot().challenge;
}

test("the script prints the code typed in Paseo, without a newline", async () => {
  const run = runScript();
  const challenge = await waitForChallenge();
  assert.deepEqual(
    { config: challenge?.config, prompt: challenge?.prompt },
    { config: "vpn-london", prompt: "Enter Authenticator Code: 6 digits" },
  );
  broker.answer("123456");
  assert.deepEqual(await run, { status: 0, stdout: "123456", stderr: "" });
});

test("a code typed before the challenge is printed at once", async () => {
  broker.answer("654321");
  assert.deepEqual(await runScript(), { status: 0, stdout: "654321", stderr: "" });
});

// The script passes its wait in whole seconds to the server, so this takes 1 s of real time.
test("no code in time makes the script exit 3 with a message for Tunnelblick", async () => {
  const result = await runScript({ PASEO_VPN_WAIT: "1" });
  assert.equal(result.status, 3);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /No code was entered in Paseo within 1 seconds/);
  assert.equal(broker.snapshot().challenge, null);
});

test("without the plugin's socket the script exits 3", async () => {
  const result = await runScript({ HOME: join(home, "elsewhere") });
  assert.equal(result.status, 3);
  assert.match(result.stderr, /plugin is not running/);
});
