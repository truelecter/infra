// Minimal ambient types for the parts of the OMP extension API this extension uses. OMP
// provides these modules at runtime; they are not installed here.
// Source: packages/coding-agent/src/extensibility/extensions/types.ts,
// packages/coding-agent/src/config/settings.ts and packages/coding-agent/src/config/registry.ts
// in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-utils" {
  export function getAgentDir(): string;
}

declare module "@oh-my-pi/pi-coding-agent/config/registry" {
  export interface AnySetting {
    readonly id: string;
    readonly segments: readonly string[];
  }
  /** Every registered setting, in registration order. */
  export function all(): readonly AnySetting[];
}

declare module "@oh-my-pi/pi-coding-agent" {
  import type { AnySetting } from "@oh-my-pi/pi-coding-agent/config/registry";

  /** The parts of `Settings` (the `settings` export) used here. */
  export interface SettingsScope {
    /** Calls `listener` synchronously whenever the effective value of one of `sources` changes. */
    onEffectiveChange(
      sources: readonly AnySetting[],
      listener: (setting: AnySetting) => void,
    ): () => void;
    /** The in-memory global layer (config.yml plus unsaved writes), deep-cloned. */
    getGlobalSettings(): Record<string, unknown>;
  }

  export interface ExtensionContext {
    ui: { notify(message: string, type?: "info" | "warning" | "error"): void };
  }

  export interface ExtensionAPI {
    /** Package exports; `settings` is the process-wide Settings instance. */
    pi: { settings: unknown };
    on(
      event: "session_start",
      handler: (event: unknown, ctx: ExtensionContext) => Promise<void> | void,
    ): void;
  }
}

declare module "bun" {
  export const YAML: { parse(text: string): unknown };
}
