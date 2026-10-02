// Minimal ambient types for the parts of the OMP extension API this extension
// uses. OMP provides these modules at runtime; they are not installed here.
// Source (omp 18.4.6): packages/coding-agent/src/extensibility/extensions/types.ts
// in can1357/oh-my-pi.

declare module "@oh-my-pi/pi-coding-agent" {
  export interface AgentMessage {
    role: string;
    content: unknown;
    customType?: string;
    display?: boolean;
    attribution?: "user" | "agent";
    timestamp?: number;
  }

  export interface ExtensionContext {
    getSystemPrompt(): string[];
  }

  export interface BeforeAgentStartEvent {
    type: "before_agent_start";
    prompt: string;
    systemPrompt: string[];
  }

  export interface BeforeAgentStartEventResult {
    systemPrompt?: string[];
  }

  export interface ContextEvent {
    type: "context";
    messages: AgentMessage[];
  }

  export interface ContextEventResult {
    messages?: AgentMessage[];
  }

  type Handler<E, R = void> = (event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;

  export interface ExtensionAPI {
    on(
      event: "before_agent_start",
      handler: Handler<BeforeAgentStartEvent, BeforeAgentStartEventResult>,
    ): void;
    on(event: "context", handler: Handler<ContextEvent, ContextEventResult>): void;
  }
}
