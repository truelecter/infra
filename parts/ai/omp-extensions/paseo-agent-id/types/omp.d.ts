// Minimal ambient types for the parts of the OMP extension API this extension
// uses. OMP provides these modules at runtime; they are not installed here.
// Source: packages/coding-agent/src/extensibility/extensions/types.ts in
// can1357/oh-my-pi.

declare module "@oh-my-pi/pi-coding-agent" {
  export interface BeforeAgentStartEvent {
    type: "before_agent_start";
    prompt: string;
    systemPrompt: string[];
  }

  export interface BeforeAgentStartEventResult {
    systemPrompt?: string[];
  }

  type Handler<E, R = void> = (event: E) => Promise<R | void> | R | void;

  export interface ExtensionAPI {
    on(
      event: "before_agent_start",
      handler: Handler<BeforeAgentStartEvent, BeforeAgentStartEventResult>,
    ): void;
  }
}
