import { execFile, spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";
import type { AppStatus } from "../shared/vpn.ts";

/**
 * Fallback for the OpenVPN Connect app. It has no way to take the second-factor code
 * from outside, so this drives its window over the Chrome DevTools protocol: the app
 * has to run with `--remote-debugging-port`, which `restartWithRemoteControl` arranges.
 * Connect and disconnect use the app's own (undocumented) `--connect-shortcut` flags.
 *
 * Everything here depends on the app's internals (Redux store shape, dialog test IDs)
 * as of OpenVPN Connect 3.6; an update can break it.
 */

const run = promisify(execFile);

const APP = "/Applications/OpenVPN Connect/OpenVPN Connect.app";
const BINARY = `${APP}/Contents/MacOS/OpenVPN Connect`;
export const DEBUG_PORT = 9223;
const DEVTOOLS = `http://127.0.0.1:${DEBUG_PORT}`;
const TIMEOUT_MS = 15_000;

// Finds the app's Redux store through React's fiber tree once, then reuses it.
const FIND_STORE = `
const findStore = () => {
  if (window.__paseoVpnStore) return window.__paseoVpnStore;
  const root = document.getElementById("root");
  const key = root && Object.keys(root).find((k) => k.startsWith("__reactContainer$"));
  const stack = key ? [root[key]] : [];
  while (stack.length) {
    const fiber = stack.pop();
    if (!fiber) continue;
    const store = fiber.memoizedProps && fiber.memoizedProps.store;
    if (store && typeof store.getState === "function") return (window.__paseoVpnStore = store);
    stack.push(fiber.child, fiber.sibling);
  }
  throw new Error("OpenVPN Connect's state store was not found");
};`;

const STATUS_SCRIPT = `(() => {
  ${FIND_STORE}
  const { status, connection } = findStore().getState();
  const dialog = document.querySelector('[role="dialog"] [data-testid="OK_btn"]');
  return {
    state: connection.connStatus,
    connectedProfileId: connection.profileId || null,
    profiles: Object.values(status.profiles || {}).map((p) => ({ id: String(p.id), name: String(p.profileDisplayName || p.id) })),
    challenge: status.dynamicChallenge && dialog ? String(status.dynamicChallenge) : null,
  };
})()`;

// Types the code into the app's challenge dialog and presses its Send button, the
// same path as typing it by hand.
const answerScript = (code: string) => `(() => {
  const dialog = [...document.querySelectorAll('[role="dialog"]')].find((d) => d.querySelector('[data-testid="OK_btn"]'));
  const input = dialog && dialog.querySelector('input[type="text"], input[type="password"], input:not([type])');
  if (!input) return false;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setValue.call(input, ${JSON.stringify(code)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
  dialog.querySelector('[data-testid="OK_btn"]').click();
  return true;
})()`;

async function isRunning(): Promise<boolean> {
  return run("/usr/bin/pgrep", ["-f", BINARY], { timeout: TIMEOUT_MS }).then(
    () => true,
    () => false,
  );
}

/** `AbortSignal.timeout`, which this project's type definitions don't declare. */
function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref();
  return controller.signal;
}

async function pageSocketUrl(): Promise<string | null> {
  const targets = await fetch(`${DEVTOOLS}/json/list`, {
    signal: timeoutSignal(2_000),
  })
    .then(
      (response) =>
        response.json() as Promise<
          { type: string; webSocketDebuggerUrl: string }[]
        >,
    )
    .catch(() => null);
  return (
    targets?.find((target) => target.type === "page")?.webSocketDebuggerUrl ??
    null
  );
}

/** Evaluates `expression` in the app's window and returns its JSON value. */
async function evaluate(
  socketUrl: string,
  expression: string,
): Promise<unknown> {
  const socket = new WebSocket(socketUrl);
  const { promise, resolve, reject } = Promise.withResolvers<unknown>();
  const timer = setTimeout(
    () => reject(new Error("OpenVPN Connect did not answer")),
    TIMEOUT_MS,
  );
  socket.addEventListener("open", () =>
    socket.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: { expression, returnByValue: true },
      }),
    ),
  );
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id !== 1) return;
    const failure =
      message.error?.message ??
      message.result?.exceptionDetails?.exception?.description;
    if (failure) reject(new Error(String(failure).split("\n")[0]));
    else resolve(message.result?.result?.value);
  });
  socket.addEventListener("error", () =>
    reject(new Error("Could not talk to OpenVPN Connect")),
  );
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
    socket.close();
  }
}

export async function readStatus(): Promise<AppStatus> {
  const idle = {
    state: "",
    profiles: [],
    connectedProfileId: null,
    challenge: null,
  };
  const installed = await access(BINARY).then(
    () => true,
    () => false,
  );
  if (!installed) return { app: "missing", ...idle };
  const socketUrl = await pageSocketUrl();
  if (!socketUrl)
    return { app: (await isRunning()) ? "no-remote" : "stopped", ...idle };
  try {
    return {
      app: "running",
      ...((await evaluate(socketUrl, STATUS_SCRIPT)) as Omit<AppStatus, "app">),
    };
  } catch (error) {
    return {
      app: "running",
      ...idle,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Sends the code to the app's challenge dialog; fails when no dialog is open. */
export async function answer(code: string): Promise<void> {
  const socketUrl = await pageSocketUrl();
  if (!socketUrl || !(await evaluate(socketUrl, answerScript(code)))) {
    throw new Error("OpenVPN Connect is not asking for a code");
  }
}

/** Starts connecting the profile; the app's code dialog follows if the server asks. */
export async function connect(profileId: string): Promise<void> {
  await run(BINARY, [`--connect-shortcut=${profileId}`], {
    timeout: TIMEOUT_MS,
  });
}

export async function disconnect(): Promise<void> {
  await run(BINARY, ["--disconnect-shortcut"], { timeout: TIMEOUT_MS });
}

async function waitFor(
  check: () => Promise<boolean>,
  what: string,
): Promise<void> {
  for (let elapsed = 0; elapsed < TIMEOUT_MS; elapsed += 250) {
    if (await check()) return;
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 250);
    await promise;
  }
  throw new Error(`Timed out waiting for OpenVPN Connect to ${what}`);
}

/**
 * Quits the app and starts it again with the debugging port. The app normally
 * relaunches itself without extra flags, so this starts the relaunched instance
 * directly (`--relaunch`), then opens the window the way a second launch does;
 * without that the instance quits after 5 seconds.
 */
export async function restartWithRemoteControl(): Promise<void> {
  if (await isRunning()) {
    await run("/usr/bin/osascript", ["-e", 'quit app "OpenVPN Connect"'], {
      timeout: TIMEOUT_MS,
    });
    await waitFor(async () => !(await isRunning()), "quit");
  }
  spawn(BINARY, ["--relaunch", `--remote-debugging-port=${DEBUG_PORT}`], {
    detached: true,
    stdio: "ignore",
  }).unref();
  const devtoolsUp = () =>
    fetch(`${DEVTOOLS}/json/version`, { signal: timeoutSignal(1_000) }).then(
      (response) => response.ok,
      () => false,
    );
  await waitFor(devtoolsUp, "start");
  await run(BINARY, [], { timeout: TIMEOUT_MS });
}
