// Minimal ambient types for the parts of the OMP extension API this extension uses. OMP
// provides these modules at runtime; they are not installed here.
// Source (checked at v18.6.1 and v18.8.4): packages/coding-agent/src/extensibility/extensions/types.ts,
// packages/coding-agent/src/config/registry.ts and packages/coding-agent/src/extensibility/skills.ts
// in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-coding-agent/config/registry" {
  /** A registered setting handle. `scope` is a `Settings` instance or a session. */
  export interface Setting<T> {
    get(scope: unknown): T;
    /** Runtime-only override: never persisted. */
    override(scope: unknown, value: T): void;
    clearOverride(scope: unknown): void;
  }
  export function lookup(id: string): Setting<unknown> | undefined;
}

declare module "@oh-my-pi/pi-coding-agent" {
  export interface ExtensionCommandContext {
    ui: { notify(message: string, type?: "info" | "warning" | "error"): void };
    /** The current effective system prompt. */
    getSystemPrompt(): string[];
  }

  /** Only the tool name is read here; GSD passes the full definition through. */
  export interface ToolDefinition {
    name: string;
  }

  export interface ExtensionAPI {
    /** Package exports: `settings` is the process-wide Settings instance. */
    pi: { settings: unknown; getActiveSkills(): readonly { name: string }[] };
    logger: { warn(message: string, context?: Record<string, unknown>): void };
    registerCommand(
      name: string,
      options: {
        handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
      },
    ): void;
    registerTool(tool: ToolDefinition): void;
  }
}

declare module "bun" {
  export class Glob {
    constructor(pattern: string);
    match(path: string): boolean;
  }
}
