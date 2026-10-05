import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/** One Tunnelblick VPN configuration, as Tunnelblick's AppleScript dictionary reports it. */
export const configSchema = z.object({
  name: z.string(),
  /** OpenVPN or Tunnelblick state: CONNECTED, EXITING (disconnected), RECONNECTING, AUTH, ... */
  state: z.string(),
  bytesIn: z.number(),
  bytesOut: z.number(),
});
export type VpnConfig = z.infer<typeof configSchema>;

/** A challenge from the server that is waiting for a code typed in Paseo. */
export const challengeSchema = z.object({
  config: z.string(),
  prompt: z.string(),
  since: z.string(),
  /** After this, the script tells Tunnelblick nobody answered. */
  deadline: z.string(),
});
export type Challenge = z.infer<typeof challengeSchema>;

/** The OpenVPN Connect app, driven over its debugging port as a fallback to Tunnelblick. */
export const appStatusSchema = z.object({
  /** `no-remote`: running, but without the debugging port, so it can't be controlled. */
  app: z.enum(["missing", "stopped", "no-remote", "running"]),
  /** The app's connection state: CONNECTED, DISCONNECTED, CONNECTING, ... */
  state: z.string(),
  profiles: z.array(z.object({ id: z.string(), name: z.string() })),
  connectedProfileId: z.string().nullable(),
  /** The server's prompt while the app's code dialog is open. */
  challenge: z.string().nullable(),
  error: z.string().optional(),
});
export type AppStatus = z.infer<typeof appStatusSchema>;

export const statusSchema = z.object({
  tunnelblick: z.enum(["missing", "stopped", "running"]),
  configs: z.array(configSchema),
  /** Set when Tunnelblick could not be asked, for example without the Automation permission. */
  error: z.string().optional(),
  challenge: challengeSchema.nullable(),
  /** A code typed before the server asked for it, kept for the next challenge until it expires. */
  queuedCode: z.object({ expiresAt: z.string() }).nullable(),
  openvpnConnect: appStatusSchema,
});
export type VpnStatus = z.infer<typeof statusSchema>;

export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{4,10}$/, "Enter the digits from the authenticator app");

const configName = z.string().trim().min(1);

export const getStatus = defineRpc({
  name: "vpn.status",
  input: z.object({}),
  output: statusSchema,
});

export const connect = defineRpc({
  name: "vpn.connect",
  input: z.object({ config: configName, code: codeSchema.optional() }),
  output: statusSchema,
});

export const disconnect = defineRpc({
  name: "vpn.disconnect",
  input: z.object({ config: configName }),
  output: statusSchema,
});

/** Answers the pending challenge, or keeps the code for the next one. */
export const sendCode = defineRpc({
  name: "vpn.send-code",
  input: z.object({ code: codeSchema }),
  output: statusSchema,
});

export const launchTunnelblick = defineRpc({
  name: "vpn.launch",
  input: z.object({}),
  output: statusSchema,
});

export const appConnect = defineRpc({
  name: "vpn.app.connect",
  input: z.object({ profileId: configName, code: codeSchema.optional() }),
  output: statusSchema,
});

export const appDisconnect = defineRpc({
  name: "vpn.app.disconnect",
  input: z.object({}),
  output: statusSchema,
});

/** Restarts OpenVPN Connect with its debugging port, so the plugin can control it. */
export const appEnableRemote = defineRpc({
  name: "vpn.app.enable-remote",
  input: z.object({}),
  output: statusSchema,
});
