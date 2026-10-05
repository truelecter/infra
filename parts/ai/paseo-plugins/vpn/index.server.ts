import type { PluginServerContext } from "@getpaseo/plugin/server";
import { join } from "node:path";
import {
  appConnect,
  appDisconnect,
  appEnableRemote,
  connect,
  disconnect,
  getStatus,
  launchTunnelblick,
  sendCode,
  type VpnStatus,
} from "./shared/vpn.ts";
import { ChallengeBroker } from "./server/challenge.ts";
import { createChallengeServer, listen, vpnDir } from "./server/http.ts";
import * as openvpnConnect from "./server/openvpn-connect.ts";
import * as tunnelblick from "./server/tunnelblick.ts";

export default function contribute(server: PluginServerContext) {
  const broker = new ChallengeBroker();

  async function readTunnelblick() {
    try {
      return await tunnelblick.readStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { tunnelblick: "running" as const, configs: [], error: message };
    }
  }

  /** OpenVPN Connect's status; a code typed ahead answers its dialog as soon as it opens. */
  async function readOpenvpnConnect() {
    const app = await openvpnConnect.readStatus();
    if (!app.challenge) return app;
    const queued = broker.takeQueued();
    if (queued === null) return app;
    try {
      await openvpnConnect.answer(queued);
    } catch (error) {
      return { ...app, error: error instanceof Error ? error.message : String(error) };
    }
    return openvpnConnect.readStatus();
  }

  async function status(): Promise<VpnStatus> {
    const [tunnelblickStatus, app] = await Promise.all([readTunnelblick(), readOpenvpnConnect()]);
    const { challenge, queuedCode } = broker.snapshot();
    return {
      ...tunnelblickStatus,
      challenge: challenge && {
        config: challenge.config,
        prompt: challenge.prompt,
        since: new Date(challenge.since).toISOString(),
        deadline: new Date(challenge.deadline).toISOString(),
      },
      queuedCode: queuedCode && { expiresAt: new Date(queuedCode.expiresAt).toISOString() },
      openvpnConnect: app,
    };
  }

  server.handle(getStatus, status);
  server.handle(connect, async ({ config, code }) => {
    if (code) broker.answer(code);
    await tunnelblick.connect(config);
    return status();
  });
  server.handle(disconnect, async ({ config }) => {
    await tunnelblick.disconnect(config);
    return status();
  });
  server.handle(sendCode, async ({ code }) => {
    // Tunnelblick's script waits in the broker; OpenVPN Connect waits in its own dialog.
    if (!broker.snapshot().challenge && (await openvpnConnect.readStatus()).challenge) {
      await openvpnConnect.answer(code);
    } else {
      broker.answer(code);
    }
    return status();
  });
  server.handle(launchTunnelblick, async () => {
    await tunnelblick.launch();
    return status();
  });
  server.handle(appConnect, async ({ profileId, code }) => {
    if (code) broker.answer(code);
    await openvpnConnect.connect(profileId);
    return status();
  });
  server.handle(appDisconnect, async () => {
    await openvpnConnect.disconnect();
    return status();
  });
  server.handle(appEnableRemote, async () => {
    await openvpnConnect.restartWithRemoteControl();
    return status();
  });

  const socketPath = join(vpnDir(), "vpn.sock");
  const started = listen(createChallengeServer(broker), socketPath).then(
    (stop) => {
      console.log(`[vpn] Listening for Tunnelblick challenges on ${socketPath}`);
      return stop;
    },
    (error: unknown) => {
      console.error(`[vpn] Could not listen on ${socketPath}`, error);
      return null;
    },
  );

  return async () => {
    broker.close();
    await (await started)?.();
  };
}
