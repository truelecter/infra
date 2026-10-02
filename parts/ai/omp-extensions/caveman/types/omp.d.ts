// Minimal ambient types for the parts of the OMP extension API this extension
// uses. OMP provides these modules at runtime; they are not installed here.
// Source (omp 18.4.6): packages/coding-agent/src/extensibility/extensions/types.ts
// in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-utils" {
  export function getAgentDir(): string;
}

declare module "@oh-my-pi/pi-coding-agent" {
  export interface ExtensionUIContext {
    notify(message: string, type?: "info" | "warning" | "error"): void;
  }

  export interface SessionEntry {
    type: string;
    customType?: string;
    data?: unknown;
  }

  export interface ExtensionContext {
    hasUI: boolean;
    ui: ExtensionUIContext;
    sessionManager: { getBranch(): SessionEntry[] };
    getSystemPrompt(): string[];
  }

  export interface AgentMessage {
    role: string;
    content: unknown;
    customType?: string;
    display?: boolean;
    attribution?: "user" | "agent";
    timestamp?: number;
  }

  export interface ContextEvent {
    type: "context";
    messages: AgentMessage[];
  }

  export interface ContextEventResult {
    messages?: AgentMessage[];
  }

  export type ExtensionCommandContext = ExtensionContext;

  export interface InputEvent {
    type: "input";
    text: string;
    source: "interactive" | "rpc" | "extension";
  }

  export interface BeforeAgentStartEvent {
    type: "before_agent_start";
    prompt: string;
    systemPrompt: string[];
  }

  export interface BeforeAgentStartEventResult {
    systemPrompt?: string[];
  }

  export interface AutocompleteItem {
    value: string;
    label: string;
    description?: string;
  }

  type Handler<E, R = void> = (event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;

  export interface ExtensionAPI {
    on(event: "session_start" | "session_switch" | "session_branch" | "session_tree", handler: Handler<unknown>): void;
    on(event: "input", handler: Handler<InputEvent>): void;
    on(
      event: "before_agent_start",
      handler: Handler<BeforeAgentStartEvent, BeforeAgentStartEventResult>,
    ): void;
    on(event: "context", handler: Handler<ContextEvent, ContextEventResult>): void;
    registerCommand(
      name: string,
      options: {
        description?: string;
        getArgumentCompletions?: (argumentPrefix: string) => AutocompleteItem[] | null;
        handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
      },
    ): void;
    appendEntry<T = unknown>(customType: string, data?: T): void;
  }
}
