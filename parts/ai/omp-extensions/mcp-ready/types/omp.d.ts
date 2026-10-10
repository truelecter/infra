// Minimal ambient types for the parts of the OMP extension API this extension uses. OMP
// provides these modules at runtime; they are not installed here.
// Source: packages/coding-agent/src/extensibility/extensions/types.ts in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-utils" {
  export function getAgentDir(): string;
}

declare module "@oh-my-pi/pi-coding-agent" {
  export interface ExtensionContext {
    cwd: string;
  }

  export interface ExtensionAPI {
    on(
      event: "before_agent_start",
      handler: (event: unknown, ctx: ExtensionContext) => Promise<void>,
    ): void;
    /** Enabled tool names: top-level tools and xd:// mounts. */
    getActiveTools(): string[];
  }
}
