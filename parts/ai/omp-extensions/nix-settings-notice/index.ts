import { lstatSync, readFileSync, readlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { YAML } from "bun";
import type {
  ExtensionAPI,
  ExtensionContext,
  SettingsScope,
} from "@oh-my-pi/pi-coding-agent";
import { all } from "@oh-my-pi/pi-coding-agent/config/registry";
import { getAgentDir } from "@oh-my-pi/pi-utils";

import { buildNotice, diffLeaves } from "./shared/notice.ts";

// OMP writes a setting to its in-memory global layer, notifies listeners synchronously, then saves
// config.yml about 100 ms later. So when a listener sees the global layer differ from the file, the
// change came from inside this process (the settings UI, /model, another extension); reloads after
// an external edit leave both equal. When config.yml is a read-only Home Manager link the save fails
// with only a log line, so the change silently lasts until OMP exits. This tells the user, with the
// Home Manager line that would make the change stick.
export default function nixSettingsNotice(pi: ExtensionAPI): void {
  const settings = pi.pi.settings as SettingsScope;
  const configPath = join(getAgentDir(), "config.yml");
  const shown = new Set<string>();
  const pending: string[] = [];
  let ctx: ExtensionContext | undefined;

  function readOnly(): boolean {
    try {
      return (
        lstatSync(configPath).isSymbolicLink() &&
        readlinkSync(configPath).startsWith("/nix/store/")
      );
    } catch {
      return false;
    }
  }

  function saved(): unknown {
    try {
      return YAML.parse(readFileSync(configPath, "utf8"));
    } catch {
      return {};
    }
  }

  function show(message: string): void {
    if (ctx) ctx.ui.notify(message, "warning");
    else pending.push(message);
  }

  settings.onEffectiveChange(all(), (setting) => {
    if (!readOnly()) return;
    let live: unknown = settings.getGlobalSettings();
    let onDisk: unknown = saved();
    for (const key of setting.segments) {
      live = (live as Record<string, unknown> | undefined)?.[key];
      onDisk = (onDisk as Record<string, unknown> | undefined)?.[key];
    }
    const changes = diffLeaves(onDisk, live, [...setting.segments]);
    if (changes.length === 0) return;

    const key = `${setting.id}=${JSON.stringify(changes)}`;
    if (shown.has(key)) return;
    shown.add(key);
    show(buildNotice(setting.id, changes, configPath.replace(homedir(), "~")));
  });

  pi.on("session_start", (_event, context) => {
    ctx = context;
    for (const message of pending.splice(0)) show(message);
  });
}
