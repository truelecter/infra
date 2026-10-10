// Minimal ambient types for the parts of the OMP extension API this extension
// uses. OMP provides these modules at runtime; they are not installed here.
// Source (omp 18.3.2): packages/coding-agent/src/extensibility/extensions/types.ts
// and packages/coding-agent/src/extensibility/shared-events.ts in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-coding-agent" {
  export interface AgentMessage {
    role: string;
    content: unknown;
    customType?: string;
  }

  export interface AgentEndEvent {
    type: "agent_end";
    messages: AgentMessage[];
    willContinue?: boolean;
  }

  export interface MessageUpdateEvent {
    type: "message_update";
    message: AgentMessage;
  }

  export interface ToolCallEvent {
    type: "tool_call";
    toolName: string;
    toolCallId: string;
    input: Record<string, unknown>;
  }

  export interface ToolCallEventResult {
    block?: boolean;
    reason?: string;
  }

  export interface ToolExecutionEndEvent {
    type: "tool_execution_end";
    toolCallId: string;
    toolName: string;
    isError: boolean;
  }

  export interface ContextEvent {
    type: "context";
    messages: AgentMessage[];
  }

  export interface ContextEventResult {
    messages?: AgentMessage[];
  }

  export interface CustomMessagePayload {
    customType: string;
    content: string;
    display?: boolean;
    attribution?: "user" | "agent";
  }

  export interface AgentToolResult {
    content: { type: "text"; text: string }[];
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
    ): Promise<AgentToolResult>;
  }

  export interface Zod {
    object<T extends Record<string, Schema<unknown>>>(
      shape: T,
    ): Schema<{ [K in keyof T]: T[K] extends Schema<infer V> ? V : never }>;
    string(): Schema<string> & {
      describe(description: string): Schema<string>;
    };
  }

  type Handler<E, R = void> = (event: E) => Promise<R | void> | R | void;

  export interface ExtensionAPI {
    zod: Zod;
    on(
      event: "session_start",
      handler: Handler<{ type: "session_start" }>,
    ): void;
    on(event: "agent_start", handler: Handler<{ type: "agent_start" }>): void;
    on(event: "agent_end", handler: Handler<AgentEndEvent>): void;
    on(event: "turn_start", handler: Handler<{ type: "turn_start" }>): void;
    on(event: "message_update", handler: Handler<MessageUpdateEvent>): void;
    on(
      event: "tool_call",
      handler: Handler<ToolCallEvent, ToolCallEventResult>,
    ): void;
    on(
      event: "tool_execution_end",
      handler: Handler<ToolExecutionEndEvent>,
    ): void;
    on(
      event: "context",
      handler: Handler<ContextEvent, ContextEventResult>,
    ): void;
    registerTool<T>(tool: ToolDefinition<T>): void;
    getActiveTools(): string[];
    setActiveTools(toolNames: string[]): Promise<void>;
    sendMessage(
      message: CustomMessagePayload,
      options?: {
        triggerTurn?: boolean;
        deliverAs?: "steer" | "followUp" | "nextTurn" | "aside";
      },
    ): void;
  }
}
