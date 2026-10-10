import { test } from "node:test";
import assert from "node:assert/strict";
import { ChallengeBroker } from "./challenge.ts";

test("a code typed while a challenge waits answers it", async () => {
  const broker = new ChallengeBroker();
  const pending = broker.request(
    "vpn-london",
    "Enter Authenticator Code",
    5_000,
  );
  assert.equal(broker.snapshot().challenge?.prompt, "Enter Authenticator Code");
  assert.equal(broker.answer("123456"), "answered");
  assert.equal(await pending, "123456");
  assert.equal(broker.snapshot().challenge, null);
});

test("a code typed before the challenge is used once by the next one", async () => {
  const broker = new ChallengeBroker();
  assert.equal(broker.answer("654321"), "queued");
  assert.equal(await broker.request("vpn-london", "", 5_000), "654321");
  assert.equal(broker.snapshot().queuedCode, null);
  assert.equal(await broker.request("vpn-london", "", 10), null);
});

test("a queued code expires", async () => {
  let now = 1_000;
  const broker = new ChallengeBroker({ now: () => now, queueTtlMs: 60_000 });
  broker.answer("111111");
  now += 60_000;
  assert.equal(broker.snapshot().queuedCode, null);
  assert.equal(await broker.request("vpn-london", "", 10), null);
});

test("no answer in time, or the script giving up, resolves with null and clears the challenge", async () => {
  const broker = new ChallengeBroker();
  assert.equal(await broker.request("vpn-london", "", 10), null);
  assert.equal(broker.snapshot().challenge, null);

  const gone = new AbortController();
  const pending = broker.request("vpn-london", "", 5_000, gone.signal);
  gone.abort();
  assert.equal(await pending, null);
  assert.equal(broker.snapshot().challenge, null);
  assert.equal(broker.answer("222222"), "queued");
});

test("a newer challenge replaces an older one that still waits", async () => {
  const broker = new ChallengeBroker();
  const older = broker.request("vpn-london", "first", 5_000);
  const newer = broker.request("vpn-london", "second", 5_000);
  assert.equal(await older, null);
  broker.answer("333333");
  assert.equal(await newer, "333333");
});
