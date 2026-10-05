import type { PluginServerContext } from "@getpaseo/plugin/server";
import { planForwarding, readDaemonSettings, resolvePaseoHome } from "./server/daemon-target.ts";
import { TailscaleForwarder } from "./server/forwarder.ts";
import { createCliHostnamesConfig, HostnameSync } from "./server/hostname-sync.ts";
import { lookupHostnames } from "./server/magicdns.ts";
import { tailscaleAddress } from "./server/tailscale.ts";

export default function contribute(_server: PluginServerContext) {
  const settings = readDaemonSettings(process.env);
  const plan = planForwarding(settings);
  if (plan.kind === "skip") {
    console.log(plan.reason);
    return () => {};
  }

  if (!settings.hasPassword) {
    console.warn(
      "Daemon has no password: every device on your tailnet gets full access. Run `paseo daemon set-password`.",
    );
  }

  // The daemon rejects non-IP Host headers unless they are listed in daemon.hostnames.
  const hostnameSync = new HostnameSync({
    config: createCliHostnamesConfig(
      process.env.PASEO_CLI?.trim() || "paseo",
      resolvePaseoHome(process.env),
    ),
    lookup: (address) => lookupHostnames(address, process.env),
    getAddress: () => forwarder.address,
  });

  const forwarder = new TailscaleForwarder({
    port: plan.port,
    upstream: plan.upstream,
    detectAddress: () => tailscaleAddress(process.env),
    onListening: () => void hostnameSync.sync(),
  });

  hostnameSync.start();
  void forwarder.start();

  return async () => {
    await hostnameSync.stop();
    await forwarder.stop();
  };
}
