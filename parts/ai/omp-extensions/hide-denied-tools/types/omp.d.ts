// Minimal ambient types for the parts of the OMP extension API this extension uses. OMP
// provides these modules at runtime; they are not installed here.
// Source: packages/coding-agent/src/extensibility/extensions/types.ts and
// packages/coding-agent/src/config/registry.ts in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-coding-agent" {
  export interface ExtensionAPI {
    /** Package exports; `settings` is the scope that registry handles read from. */
    pi: { settings: unknown };
    on(event: "session_start" | "before_agent_start" | "turn_start", handler: () => Promise<void> | void): void;
    getActiveTools(): string[];
    setActiveTools(toolNames: string[]): Promise<void>;
  }
}

declare module "@oh-my-pi/pi-coding-agent/config/registry" {
  export interface SettingHandle {
    get(scope: unknown): unknown;
  }
  export function lookup(id: string): SettingHandle | undefined;
}
