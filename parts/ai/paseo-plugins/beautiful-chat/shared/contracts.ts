/**
 * Shared types and data contracts for OMP Chat Enhancer plugin.
 * Used across client components and server handlers.
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
    language: "typescript" | "bash" | "diff" | "json" | "python";
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

export type RiskLevel = "low" | "medium" | "high";

export interface ApprovalRequest {
  id: string;
  toolName: string;
  title: string;
  riskLevel: RiskLevel;
  rationale: string;
  command?: string;
  targetPath?: string;
  diff?: string;
  cwd?: string;
  timeoutSeconds?: number;
  status: "pending" | "approved" | "denied";
  timestamp: string;
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

export type ToolCallKind =
  | "bash"
  | "shell"
  | "git"
  | "github"
  | "thinking"
  | "mcp"
  | "read"
  | "edit"
  | "write"
  | "eval"
  | "task"
  | "ask"
  | "hub"
  | "paseo"
  | "ast_grep"
  | "lsp";

/**
 * The hub tool answers with a text block plus a typed `details` record, and the
 * shapes below mirror that record op by op, as of omp's current hub tool:
 * coordination ops return `{ op, from?, to?, receipts?, waited?, inbox?, peers?,
 * counts?, jobs?, cancelled?, agents? }` and process ops return
 * `{ op, daemon?, daemons?, text?, cursor?, timedOut?, matched?, state?, spec? }`.
 * Rendering from `details` rather than from the prose is what keeps a raw JSON
 * envelope off the screen when an op answers with an empty text block, which is
 * what a job-snapshot `wait` does.
 */

/** One peer message, as the bus stores it. */
export interface HubMessage {
  id?: string;
  from: string;
  to?: string;
  body: string;
  replyTo?: string;
  ts?: number;
}

/** Per-recipient delivery outcome from `send`. */
export interface HubReceipt {
  to: string;
  /** `injected`, `woken`, `revived`, `queued`, or `failed`; open for new outcomes. */
  outcome: string;
  error?: string;
}

/** One row of the `list` roster. */
export interface HubPeer {
  id: string;
  displayName?: string;
  kind?: string;
  status: string;
  parentId?: string;
  unread?: number;
  lastActivity?: number;
  activity?: string;
}

export interface HubPeerCounts {
  running: number;
  idle: number;
  parked: number;
  shown?: number;
  truncated?: number;
}

/** One background job in a `wait`, `jobs`, or `cancel` snapshot. */
export interface HubJobRow {
  id: string;
  type: string;
  /** `running`, `completed`, `failed`, or `cancelled`; open for new states. */
  status: string;
  label?: string;
  durationMs?: number;
  resolvedModel?: string;
  advisor?: boolean;
  resultText?: string;
  errorText?: string;
  schema?: { status: string; error?: string; hasData?: boolean; agentUrl?: string };
}

/** A running subagent with no job entry, which `wait` reports beside the jobs. */
export interface HubAgentRow {
  id: string;
  parentId?: string;
  activity?: string;
  ageMs?: number;
  live?: boolean;
}

export interface HubCancelRow {
  id: string;
  status: string;
  message?: string;
}

/** One supervised process, as the launch broker reports it. */
export interface HubDaemonRow {
  name: string;
  id?: string;
  state: string;
  pid?: number;
  restarts?: number;
  readyMatch?: string;
  exitCode?: number;
  exitReason?: string;
  startedAt?: number;
  readyAt?: number;
  exitedAt?: number;
  outputBytes?: number;
  persist?: boolean;
  detached?: boolean;
}

export interface HubProcessSpec {
  application?: string;
  args?: string[];
  cwd?: string;
  pty?: boolean;
  restart?: string;
  readyLog?: string;
  readyPort?: number;
}

export interface HubProcessData {
  op: "start" | "ps" | "logs" | "stop" | "restart" | "describe" | "wait" | "send";
  name?: string;
  spec?: HubProcessSpec;
  daemon?: HubDaemonRow;
  /** The roster a `ps` call returns, one row per supervised process. */
  daemons?: HubDaemonRow[];
  logs?: string[];
  cursor?: number;
  timedOut?: boolean;
  /** The output a `wait` with a pattern matched. */
  matched?: string;
  state?: string;
  /** Stdin text, keys, or signal sent to the process. */
  input?: string;
}

export interface HubSendData {
  from?: string;
  to?: string;
  message?: string;
  replyTo?: string;
  awaitReply: boolean;
  receipts: HubReceipt[];
  /** The awaited answer: a message, or null when the wait ended without one. */
  reply?: HubMessage | null;
}

export interface HubWaitedData {
  from?: string;
  message: HubMessage | null;
  timeoutMs?: number;
}

export interface HubInboxData {
  peek: boolean;
  messages: HubMessage[];
}

export interface HubPeersData {
  peers: HubPeer[];
  counts?: HubPeerCounts;
  statusFilter?: string;
}

export interface HubJobsData {
  op: "wait" | "jobs" | "cancel";
  jobs: HubJobRow[];
  cancelled?: HubCancelRow[];
  agents?: HubAgentRow[];
}

/**
 * Every variant keeps the op's prose in `text`. A view shows it when the record
 * is empty — an older omp build, or an op this plugin has not typed yet — so a
 * hub card always has something to draw and never falls back to a JSON dump.
 */
export type HubData =
  | { kind: "send"; text?: string; data: HubSendData }
  | { kind: "waited"; text?: string; data: HubWaitedData }
  | { kind: "inbox"; text?: string; data: HubInboxData }
  | { kind: "peers"; text?: string; data: HubPeersData }
  | { kind: "jobs"; text?: string; data: HubJobsData }
  | { kind: "process"; text?: string; data: HubProcessData }
  | { kind: "note"; text?: string; data: { op: string } };

export interface McpToolData {
  server: string;
  tool: string;
  transport?: "stdio" | "sse" | "websocket";
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface ShellToolData {
  command: string;
  cwd?: string;
  pty?: boolean;
  timeoutSeconds?: number;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
}

export interface ThinkingToolData {
  text: string;
  model?: string;
  durationMs?: number;
  tokenCount?: number;
  status: "thinking" | "completed";
  steps?: string[];
}

export type PaseoToolKind =
  | "create_agent"
  | "get_agent_activity"
  | "list_providers"
  | "list_models"
  | "send_agent_prompt"
  | "get_agent_status";

export interface PaseoCreateAgentData {
  title: string;
  provider: string;
  model?: string;
  modeId?: string;
  initialPrompt: string;
  agentId?: string;
  status: "created" | "running" | "failed";
}

export interface PaseoGetActivityData {
  agentId: string;
  provider: string;
  activities: Array<{
    kind: "tool" | "message" | "turn" | "thinking";
    title: string;
    elapsed?: string;
    timestamp?: string;
  }>;
}

export interface PaseoListProvidersData {
  providers: Array<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    status: "available" | "unavailable";
    modes: string[];
  }>;
}

export interface PaseoListModelsData {
  provider: string;
  models: Array<{
    id: string;
    label: string;
    contextTokens: string;
    thinkingSupport: boolean;
  }>;
}

export interface PaseoToolData {
  id: string;
  tool: PaseoToolKind;
  durationMs?: number;
  createAgent?: PaseoCreateAgentData;
  activity?: PaseoGetActivityData;
  providers?: PaseoListProvidersData;
  models?: PaseoListModelsData;
}
/**
 * One cell of an eval run. The kernel is persistent, so a call carries the
 * source it ran and the text that source printed, and both belong on screen.
 */
export interface EvalCell {
  title?: string;
  code: string;
  language: string;
  output?: string;
}

/**
 * A `github` device call: one op, the arguments it was given, and whatever the
 * op answered with.
 *
 * The card reads this instead of printing the request JSON twice. `rows` are
 * the typed facts an op reports — a pull request number, a check result, a
 * file and its match count — so each op draws as a list rather than as prose.
 * `file` is set only by an op that answers with file content, and `text` holds
 * the reply for an op this plugin has no typed shape for yet.
 */
export interface GitHubToolData {
  op: string;
  repo?: string;
  /** The path, query, pull request or run the op names. */
  subject?: string;
  /** The request as sent, kept verbatim for the disclosure. */
  request?: string;
  rows?: Array<{
    label: string;
    value: string;
    /** Colours the value: a passing check reads green, a failure red. */
    tone?: "ok" | "bad";
  }>;
  file?: { name: string; language?: string; code: string };
  /** The first http(s) URL in the reply, when the op answered with one. */
  link?: string;
  text?: string;
}

export interface ToolCalloutData {
  id: string;
  tool: ToolCallKind;
  /**
   * The header pill's text when it should not read `tool`: the call's own
   * name for a tool no card maps, which otherwise falls back to the `bash`
   * kind and would pose as a shell.
   */
  toolLabel?: string;
  title: string;
  status: "running" | "completed" | "failed";
  durationMs?: number;
  exitCode?: number;
  filePath?: string;
  lineRange?: string;
  command?: string;
  code?: string;
  language?: string;
  diff?: string;
  output?: string;
  cells?: EvalCell[];
  askOptions?: Array<{
    id: string;
    label: string;
    description?: string;
    recommended?: boolean;
  }>;
  /** Selected option labels, or the typed reply. Empty until answered. */
  askAnswer?: string[];
  /**
   * One `task` call spawns a batch: the tool takes a shared `context` plus a
   * list of briefs, so the card carries the list. `model` is absent here on
   * purpose — the call names an agent type, and which model that resolves to
   * is the spawned agent's business, reported later by `hub`.
   */
  subagent?: {
    context?: string;
    agents: Array<{
      name: string;
      agentType: string;
      task: string;
      status?: string;
    }>;
  };
  hub?: HubData;
  mcp?: McpToolData;
  shell?: ShellToolData;
  thinking?: ThinkingToolData;
  paseo?: PaseoToolData;
  github?: GitHubToolData;
}

/**
 * A host `notification` or `error` timeline item. Both carry a level and one
 * message string and nothing else — no title, no duration — so the callout
 * that draws them stays a single row wherever the message allows it.
 */
export interface NoticeCalloutData {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
  /** Present when the item came from the host's `error` type rather than `notification`. */
  fatal?: boolean;
}

export interface MockChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text?: string;
  reasoningTrace?: ReasoningTraceData;
  taskList?: TaskListData;
  toolCallouts?: ToolCalloutData[];
  approvalRequest?: ApprovalRequest;
}
