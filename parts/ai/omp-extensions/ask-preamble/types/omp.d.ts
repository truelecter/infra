// Minimal ambient types for the parts of the OMP extension API this extension
// uses. OMP provides these modules at runtime; they are not installed here.
// Source: packages/coding-agent/src/extensibility/extensions/types.ts and
// packages/coding-agent/src/extensibility/shared-events.ts in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-coding-agent" {
  export interface AgentMessage {
    role: string;
    content: unknown;
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

  export interface CustomMessagePayload {
    customType?: string;
    content?: string;
    display?: boolean;
    attribution?: "user" | "agent";
  }

  type Handler<E, R = void> = (event: E) => Promise<R | void> | R | void;

  export interface ExtensionAPI {
    on(event: "agent_start", handler: Handler<{ type: "agent_start" }>): void;
    on(event: "agent_end", handler: Handler<AgentEndEvent>): void;
    on(event: "message_update", handler: Handler<MessageUpdateEvent>): void;
    on(event: "tool_call", handler: Handler<ToolCallEvent, ToolCallEventResult>): void;
    sendMessage(
      message: CustomMessagePayload,
      options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" | "aside" },
    ): void;
  }
}
