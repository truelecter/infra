// Minimal ambient types for the parts of the OMP extension API this extension
// uses. OMP provides these modules at runtime; they are not installed here.
// Source (omp 18.6.1, unchanged in 18.8.4): packages/coding-agent/src/extensibility/extensions/types.ts
// and packages/agent/src/types.ts (AgentToolResult) in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-coding-agent" {
  /** The agent a session runs; OMP rebinds extensions to every subagent session. */
  export interface ExtensionAgentIdentity {
    kind: "main" | "sub";
  }

  /** Session entries, as `ReadonlySessionManager.getBranch()` returns them (root to leaf). */
  export interface SessionEntry {
    type: string;
    customType?: string;
    data?: unknown;
  }

  export interface ExtensionContext {
    agent: ExtensionAgentIdentity;
    sessionManager: { getBranch(): SessionEntry[] };
    ui: { notify(message: string, type?: "info" | "warning" | "error"): void };
  }

  export interface ToolInfo {
    name: string;
  }

  export interface AutocompleteItem {
    value: string;
    label: string;
  }

  export interface AgentToolResult {
    content: { type: "text"; text: string }[];
    isError?: boolean;
  }

  /** Opaque omptype schema built with `pi.zod`. */
  export interface Schema<T> {
    readonly __infer?: T;
  }

  export interface ToolDefinition<T> {
    name: string;
    label: string;
    description: string;
    parameters: Schema<T>;
    loadMode?: "essential" | "discoverable";
    approval?: "read" | "write" | "exec";
    execute(
      toolCallId: string,
      params: T,
      signal: AbortSignal | undefined,
      onUpdate: unknown,
      ctx: ExtensionContext,
    ): Promise<AgentToolResult>;
  }

  export interface Zod {
    object<T extends Record<string, Schema<unknown>>>(
      shape: T,
    ): Schema<{ [K in keyof T]: T[K] extends Schema<infer V> ? V : never }>;
    string(): Schema<string> & { describe(description: string): Schema<string> };
    boolean(): Schema<boolean> & { describe(description: string): Schema<boolean> };
  }

  type Handler<E, R = void> = (event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;

  export interface ExtensionAPI {
    zod: Zod;
    on(event: "session_start", handler: Handler<{ type: "session_start" }>): void;
    on(event: "session_switch", handler: Handler<{ type: "session_switch" }>): void;
    on(event: "session_branch", handler: Handler<{ type: "session_branch" }>): void;
    on(event: "session_tree", handler: Handler<{ type: "session_tree" }>): void;
    on(event: "input", handler: Handler<{ type: "input"; text: string }>): void;
    /** Handlers here must not return a result: a `systemPrompt` would replace the base prompt for the turn. */
    on(event: "before_agent_start", handler: Handler<{ type: "before_agent_start" }>): void;
    registerTool<T>(tool: ToolDefinition<T>): void;
    registerCommand(
      name: string,
      options: {
        description?: string;
        getArgumentCompletions?: (argumentPrefix: string) => AutocompleteItem[] | null;
        handler(args: string, ctx: ExtensionContext): Promise<void>;
      },
    ): void;
    getActiveTools(): string[];
    getAllTools(): ToolInfo[];
    setActiveTools(toolNames: string[]): Promise<void>;
    appendEntry<T = unknown>(customType: string, data?: T): void;
    setSessionName(name: string): Promise<void>;
  }
}
