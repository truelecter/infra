// Minimal ambient types for the parts of the OMP extension API this extension uses. OMP
// provides these modules at runtime; they are not installed here.
// Source (omp 18.12.6): packages/coding-agent/src/extensibility/extensions/types.ts,
// packages/coding-agent/src/extensibility/shared-events.ts, and
// packages/coding-agent/src/session/session-entries.ts in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-coding-agent" {
  import type { Message } from "../shared/modes.ts";

  /** Session entries, as `ReadonlySessionManager.getBranch()` returns them (root to leaf). */
  export interface SessionEntry {
    type: string;
    customType?: string;
    data?: unknown;
    /** Set on `type: "message"` entries. */
    message?: Message;
  }

  export interface ExtensionContext {
    /** `"main"` for the top-level session, `"sub"` for any spawned one. */
    agent: { kind: "main" | "sub" };
    sessionManager: { getBranch(): SessionEntry[] };
    ui: { notify(message: string, type?: "info" | "warning" | "error"): void };
  }

  /** Fired before every provider request; `messages` is a deep copy, never persisted. */
  export interface ContextEvent {
    messages: Message[];
  }

  export interface AutocompleteItem {
    value: string;
    label: string;
  }

  export interface ExtensionAPI {
    on(
      event: "context",
      handler: (
        event: ContextEvent,
        ctx: ExtensionContext,
      ) => { messages?: Message[] } | undefined | void,
    ): void;
    registerCommand(
      name: string,
      options: {
        description?: string;
        getArgumentCompletions?: (
          argumentPrefix: string,
        ) => AutocompleteItem[] | null;
        handler(args: string, ctx: ExtensionContext): Promise<void>;
      },
    ): void;
    appendEntry<T = unknown>(customType: string, data?: T): void;
  }
}
