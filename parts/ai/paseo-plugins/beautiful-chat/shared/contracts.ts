/**
 * Data contracts for the reasoning and todo cards.
 */

export type StepStatus = "completed" | "active" | "pending" | "failed";

export interface ReasoningStep {
  id: string;
  number: number;
  /** Omitted when the source is a plain reasoning stream: the body is the step. */
  title?: string;
  summary?: string;
  durationMs?: number;
  tokenCount?: number;
  status: StepStatus;
  content: string;
  codeSnippet?: {
    language: string;
    code: string;
    filename?: string;
  };
}

export interface ReasoningTraceData {
  id: string;
  agentModel: string;
  durationMs: number;
  totalTokens: number;
  isStreaming?: boolean;
  status: "thinking" | "completed" | "interrupted";
  steps: ReasoningStep[];
}

export type TaskStatus = "completed" | "in_progress" | "pending" | "blocked";

export interface TaskItemData {
  id: string;
  title: string;
  phase: string;
  status: TaskStatus;
  duration?: string;
  blockerReason?: string;
}

export interface TaskListData {
  id: string;
  phaseName: string;
  tasks: TaskItemData[];
}
