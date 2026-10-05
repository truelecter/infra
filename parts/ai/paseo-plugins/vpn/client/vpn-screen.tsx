import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { ScrollView, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  appConnect,
  appDisconnect,
  appEnableRemote,
  codeSchema,
  connect,
  disconnect,
  getStatus,
  launchTunnelblick,
  sendCode,
  type VpnStatus,
} from "../shared/vpn.ts";
import { describeState, formatBytes } from "./format.ts";

const STATUS_KEY = ["vpn-status"];

/** Seconds from now until `iso`, ticking once a second while `iso` is set. */
function useSecondsLeft(iso: string | undefined): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!iso) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [iso]);
  return iso ? Math.max(0, Math.round((Date.parse(iso) - now) / 1000)) : 0;
}

export function VpnScreen({ theme, layout }: PluginSurfaceProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const readStatus = useRpc(getStatus);
  const connectRpc = useRpc(connect);
  const disconnectRpc = useRpc(disconnect);
  const sendCodeRpc = useRpc(sendCode);
  const launchRpc = useRpc(launchTunnelblick);
  const appConnectRpc = useRpc(appConnect);
  const appDisconnectRpc = useRpc(appDisconnect);
  const appEnableRemoteRpc = useRpc(appEnableRemote);
  const [code, setCode] = useState("");

  // Tunnelblick, its challenge script, and OpenVPN Connect change state on their own; poll, faster while a code is wanted.
  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => readStatus({}),
    refetchInterval: (query) =>
      query.state.data?.challenge || query.state.data?.openvpnConnect.challenge ? 1000 : 3000,
  });
  const app = status.data?.openvpnConnect;
  // Tunnelblick's script gives up at its deadline; OpenVPN Connect keeps its dialog open.
  const challenge: { config: string; prompt: string; deadline?: string } | null =
    status.data?.challenge ?? (app?.challenge ? { config: "OpenVPN Connect", prompt: app.challenge } : null);
  const challengeSecondsLeft = useSecondsLeft(challenge?.deadline);
  const queuedSecondsLeft = useSecondsLeft(status.data?.queuedCode?.expiresAt);

  const action = useMutation({
    mutationFn: (run: () => Promise<VpnStatus>) => run(),
    onSuccess: (next) => {
      queryClient.setQueryData(STATUS_KEY, next);
      setCode("");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : String(error)),
  });
  const parsedCode = codeSchema.safeParse(code);
  const codeError = code.trim() && !parsedCode.success ? parsedCode.error.issues[0]?.message : undefined;

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      content: {
        padding: layout.compact ? 16 : 24,
        gap: 16,
        maxWidth: 720,
        width: "100%" as const,
        alignSelf: "center" as const,
      },
      card: {
        gap: 10,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      },
      row: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, alignItems: "center" as const },
      title: { color: theme.colors.foreground, fontSize: 16, fontWeight: "600" as const },
      text: { color: theme.colors.foreground, fontSize: 14 },
      muted: { color: theme.colors.foregroundMuted, fontSize: 13 },
      input: {
        width: 140,
        color: theme.colors.foreground,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 16,
        letterSpacing: 2,
        backgroundColor: theme.colors.surface0,
      },
      button: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    }),
    [theme, layout.compact],
  );

  const button = (label: string, onPress: () => void, options: { primary?: boolean; disabled?: boolean } = {}) => {
    const disabled = options.disabled || action.isPending;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.button,
          { backgroundColor: options.primary ? theme.colors.accent : theme.colors.surface2, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        <Text style={{ color: options.primary ? theme.colors.accentForeground : theme.colors.foreground }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const codeInput = (label: string, onSubmit: () => void, autoFocus = false) => (
    <TextInput
      style={styles.input}
      value={code}
      onChangeText={(text) => setCode(text.replace(/\D/g, ""))}
      onSubmitEditing={onSubmit}
      placeholder="123456"
      placeholderTextColor={theme.colors.foregroundMuted}
      keyboardType="number-pad"
      inputMode="numeric"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={10}
      autoFocus={autoFocus}
      accessibilityLabel={label}
    />
  );

  const submitCode = () => {
    if (parsedCode.success) action.mutate(() => sendCodeRpc({ code: parsedCode.data }));
  };

  /** Code field, Connect button, and hint for a disconnected VPN. */
  const connectControls = (name: string, onConnect: (code: string | undefined) => void) => {
    const start = () => {
      if (code.trim() && !parsedCode.success) return;
      onConnect(parsedCode.success ? parsedCode.data : undefined);
    };
    return (
      <>
        <View style={styles.row}>
          {challenge ? null : codeInput(`Code for ${name}, if the server asks`, start)}
          {button("Connect", start, { primary: true, disabled: Boolean(codeError) })}
        </View>
        {challenge ? null : (
          <Text style={styles.muted}>
            {codeError ?? "Type the current code first if the server will ask for one. It is kept for a minute."}
          </Text>
        )}
      </>
    );
  };

  const data = status.data;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {status.isPending ? <Text style={styles.muted}>Asking Tunnelblick</Text> : null}
      {status.isError ? (
        <Text style={[styles.text, { color: theme.colors.statusDanger }]}>
          {status.error instanceof Error ? status.error.message : String(status.error)}
        </Text>
      ) : null}
      {data?.error ? (
        <Text style={[styles.text, { color: theme.colors.statusDanger }]}>
          Could not ask Tunnelblick: {data.error}
        </Text>
      ) : null}

      {challenge ? (
        <View style={[styles.card, { borderColor: theme.colors.statusWarning }]}>
          <Text style={styles.title}>Code needed for {challenge.config}</Text>
          {challenge.prompt ? <Text style={styles.muted}>{challenge.prompt}</Text> : null}
          <View style={styles.row}>
            {codeInput("Code for the VPN server", submitCode, true)}
            {button("Send", submitCode, { primary: true, disabled: !parsedCode.success })}
            {challenge.deadline ? <Text style={styles.muted}>{challengeSecondsLeft} s left</Text> : null}
          </View>
          {codeError ? <Text style={[styles.muted, { color: theme.colors.statusDanger }]}>{codeError}</Text> : null}
        </View>
      ) : null}

      {data?.tunnelblick === "missing" ? (
        <Text style={styles.text}>
          Tunnelblick is not installed in /Applications. The plugin README describes the setup.
        </Text>
      ) : null}
      {data?.tunnelblick === "stopped" ? (
        <View style={styles.card}>
          <Text style={styles.text}>Tunnelblick is not running.</Text>
          <View style={styles.row}>{button("Start Tunnelblick", () => action.mutate(() => launchRpc({})))}</View>
        </View>
      ) : null}
      {data?.tunnelblick === "running" && !data.error && data.configs.length === 0 ? (
        <Text style={styles.text}>
          Tunnelblick has no VPN configurations yet. The plugin README describes how to add one.
        </Text>
      ) : null}

      {data?.configs.map((config) => {
        const { label, color } = describeState(config.state, theme);
        return (
          <View key={config.name} style={styles.card}>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text style={styles.title}>{config.name}</Text>
              <Text style={[styles.text, { color }]}>{label}</Text>
            </View>
            {config.state === "CONNECTED" ? (
              <Text style={styles.muted}>
                In {formatBytes(config.bytesIn)}, out {formatBytes(config.bytesOut)}
              </Text>
            ) : null}
            {config.state === "EXITING" ? (
              connectControls(config.name, (withCode) =>
                action.mutate(() => connectRpc({ config: config.name, ...(withCode ? { code: withCode } : {}) })),
              )
            ) : (
              <View style={styles.row}>
                {button("Disconnect", () => action.mutate(() => disconnectRpc({ config: config.name })))}
              </View>
            )}
          </View>
        );
      })}

      {app && app.app !== "missing" ? (
        <View style={styles.card}>
          <Text style={styles.title}>OpenVPN Connect (fallback)</Text>
          {app.app === "running" ? null : (
            <>
              <Text style={styles.muted}>
                {app.app === "stopped"
                  ? "Not running. Paseo can start it with remote control, which lets this screen connect it and send the code."
                  : "Running without remote control. Restarting it with remote control lets this screen connect it and send the code; an open connection drops."}
              </Text>
              <View style={styles.row}>
                {button(app.app === "stopped" ? "Start with remote control" : "Restart with remote control", () =>
                  action.mutate(() => appEnableRemoteRpc({})),
                )}
              </View>
            </>
          )}
          {app.error ? <Text style={[styles.muted, { color: theme.colors.statusDanger }]}>{app.error}</Text> : null}
          {app.profiles.map((profile) => {
            // The app runs one connection at a time and only names its profile once connected.
            const busy = app.state !== "" && app.state !== "DISCONNECTED";
            const active = busy && (!app.connectedProfileId || app.connectedProfileId === profile.id);
            const { label, color } = describeState(active ? app.state : "DISCONNECTED", theme);
            return (
              <View key={profile.id} style={{ gap: 10 }}>
                <View style={[styles.row, { justifyContent: "space-between" }]}>
                  <Text style={[styles.text, { flexShrink: 1 }]}>{profile.name}</Text>
                  <Text style={[styles.text, { color }]}>{label}</Text>
                </View>
                {active ? (
                  <View style={styles.row}>
                    {button("Disconnect", () => action.mutate(() => appDisconnectRpc({})))}
                  </View>
                ) : (
                  connectControls(profile.name, (withCode) =>
                    action.mutate(() =>
                      appConnectRpc({ profileId: profile.id, ...(withCode ? { code: withCode } : {}) }),
                    ),
                  )
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {data?.queuedCode && !challenge ? (
        <Text style={styles.muted}>
          A code is ready for the next request from the server ({queuedSecondsLeft} s left).
        </Text>
      ) : null}
    </ScrollView>
  );
}
