import type {
  HubAgentRow,
  HubCancelRow,
  HubData,
  HubDaemonRow,
  HubJobRow,
  HubMessage,
  HubPeer,
  HubPeerCounts,
  HubProcessData,
  HubProcessSpec,
  HubReceipt,
} from "../shared/contracts";

/**
 * Turns one `hub` tool result into the record its callout draws.
 *
 * The prose an op returns is optional — a `wait` that answers with a job
 * snapshot returns an empty text block and puts everything in `details` — so
 * this reads `details` and treats the text as a caption. Nothing here ever
 * serialises a value into a string field: a JSON dump on screen is the defect
 * this module exists to remove.
 */

/** Ops the launch broker owns. Their results carry daemons, never peers. */
const PROCESS_OPS: Record<string, true> = {
  start: true,
  ps: true,
  logs: true,
  stop: true,
  restart: true,
  describe: true,
};

/** Ops a process card can label, which adds the two the broker shares with peers. */
const PROCESS_DATA_OPS: Record<string, true> = { ...PROCESS_OPS, wait: true, send: true };

const JOB_DATA_OPS: Record<string, true> = { wait: true, jobs: true, cancel: true };

/** Keys that mark an older result whose payload sits at the envelope's top level. */
const PAYLOAD_KEYS = [
  "op",
  "jobs",
  "receipts",
  "waited",
  "inbox",
  "peers",
  "daemon",
  "daemons",
  "cancelled",
  "agents",
];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asStringList(value: unknown): string[] | undefined {
  const rows = asArray(value);
  if (!rows) return undefined;
  const parsed = rows.flatMap((entry) => (typeof entry === "string" ? [entry] : []));
  return parsed.length > 0 ? parsed : undefined;
}

function readDetails(output: unknown): Record<string, unknown> | undefined {
  const envelope = asRecord(output);
  if (!envelope) return undefined;
  const details = asRecord(envelope.details);
  if (details) return details;
  // An older build answered with the payload itself rather than an envelope.
  return PAYLOAD_KEYS.some((key) => key in envelope) ? envelope : undefined;
}

/** The caption: the tool's own text, a bare string result, or the text blocks. */
function readProse(outputText: string | undefined, output: unknown): string | undefined {
  const direct = typeof outputText === "string" ? outputText.trim() : "";
  if (direct.length > 0) return direct;

  if (typeof output === "string") {
    const bare = output.trim();
    return bare.length > 0 ? bare : undefined;
  }

  const blocks = asArray(asRecord(output)?.content);
  if (!blocks) return undefined;
  const joined = blocks
    .flatMap((entry) => {
      const text = asRecord(entry)?.text;
      return typeof text === "string" ? [text] : [];
    })
    .join("\n")
    .trim();
  return joined.length > 0 ? joined : undefined;
}

function toMessage(value: unknown): HubMessage | undefined {
  const row = asRecord(value);
  if (!row) return undefined;
  const from = asString(row.from);
  const body = typeof row.body === "string" ? row.body : undefined;
  if (!from && body === undefined) return undefined;
  return {
    id: asString(row.id),
    from: from ?? "unknown",
    to: asString(row.to),
    body: body ?? "",
    replyTo: asString(row.replyTo),
    ts: asNumber(row.ts),
  };
}

function toReceipts(value: unknown): HubReceipt[] {
  return (asArray(value) ?? []).flatMap((entry): HubReceipt[] => {
    const row = asRecord(entry);
    if (!row) return [];
    return [
      {
        to: asString(row.to) ?? "unknown",
        outcome: asString(row.outcome) ?? "unknown",
        error: asString(row.error),
      },
    ];
  });
}

function toJobs(value: unknown): HubJobRow[] {
  return (asArray(value) ?? []).flatMap((entry): HubJobRow[] => {
    const row = asRecord(entry);
    if (!row) return [];
    const structured = asRecord(row.structured);
    const agentUrlId = asString(row.agentUrlId);
    return [
      {
        id: asString(row.id) ?? "unknown",
        type: asString(row.type) ?? "job",
        status: asString(row.status) ?? "unknown",
        label: asString(row.label),
        durationMs: asNumber(row.durationMs),
        resolvedModel: asString(row.resolvedModel),
        advisor: asBoolean(row.advisor),
        resultText: asString(row.resultText),
        errorText: asString(row.errorText),
        schema: structured
          ? {
              status: asString(structured.status) ?? "unknown",
              error: asString(structured.error),
              // Keep the flag, not the payload: a card states that data arrived.
              hasData: Object.hasOwn(structured, "data"),
              agentUrl: agentUrlId ? `agent://${agentUrlId}` : undefined,
            }
          : undefined,
      },
    ];
  });
}

function toCancelled(value: unknown): HubCancelRow[] | undefined {
  const rows = asArray(value);
  if (!rows) return undefined;
  const parsed = rows.flatMap((entry): HubCancelRow[] => {
    const row = asRecord(entry);
    if (!row) return [];
    return [
      {
        id: asString(row.id) ?? "unknown",
        status: asString(row.status) ?? "unknown",
        message: asString(row.message),
      },
    ];
  });
  return parsed.length > 0 ? parsed : undefined;
}

function toAgents(value: unknown): HubAgentRow[] | undefined {
  const rows = asArray(value);
  if (!rows) return undefined;
  const parsed = rows.flatMap((entry): HubAgentRow[] => {
    const row = asRecord(entry);
    const id = row ? asString(row.id) : undefined;
    if (!row || !id) return [];
    return [
      {
        id,
        parentId: asString(row.parentId),
        activity: asString(row.activity),
        ageMs: asNumber(row.ageMs),
        live: asBoolean(row.live),
      },
    ];
  });
  return parsed.length > 0 ? parsed : undefined;
}

function toPeers(value: unknown): HubPeer[] {
  return (asArray(value) ?? []).flatMap((entry): HubPeer[] => {
    const row = asRecord(entry);
    const id = row ? asString(row.id) : undefined;
    if (!row || !id) return [];
    return [
      {
        id,
        displayName: asString(row.displayName),
        kind: asString(row.kind),
        status: asString(row.status) ?? "unknown",
        parentId: asString(row.parentId),
        unread: asNumber(row.unread),
        lastActivity: asNumber(row.lastActivity),
        activity: asString(row.activity),
      },
    ];
  });
}

function toCounts(value: unknown): HubPeerCounts | undefined {
  const row = asRecord(value);
  if (!row) return undefined;
  return {
    running: asNumber(row.running) ?? 0,
    idle: asNumber(row.idle) ?? 0,
    parked: asNumber(row.parked) ?? 0,
    shown: asNumber(row.shown),
    truncated: asNumber(row.truncated),
  };
}

function toDaemon(value: unknown): HubDaemonRow | undefined {
  const row = asRecord(value);
  if (!row) return undefined;
  const name = asString(row.name);
  if (!name) return undefined;
  return {
    name,
    id: asString(row.id),
    state: asString(row.state) ?? "unknown",
    pid: asNumber(row.pid),
    // The broker counts restarts; the card labels them.
    restarts: asNumber(row.restartCount),
    readyMatch: asString(row.readyMatch),
    exitCode: asNumber(row.exitCode),
    exitReason: asString(row.exitReason),
    startedAt: asNumber(row.startedAt),
    readyAt: asNumber(row.readyAt),
    exitedAt: asNumber(row.exitedAt),
    outputBytes: asNumber(row.outputBytes),
    persist: asBoolean(row.persist),
    detached: asBoolean(row.detached),
  };
}

function toDaemons(value: unknown): HubDaemonRow[] | undefined {
  const rows = asArray(value);
  if (!rows) return undefined;
  const parsed = rows.flatMap((entry) => {
    const daemon = toDaemon(entry);
    return daemon ? [daemon] : [];
  });
  return parsed.length > 0 ? parsed : undefined;
}

/**
 * Reads the launch arguments off a broker spec. A `start` result carries the
 * daemon alone, and the call's own arguments have this same shape, so pass the
 * call input here to fill the card for a start.
 */
function toSpec(value: unknown): HubProcessSpec | undefined {
  const row = asRecord(value);
  if (!row) return undefined;
  const ready = asRecord(row.ready);
  const spec: HubProcessSpec = {
    application: asString(row.application),
    args: asStringList(row.args),
    cwd: asString(row.cwd),
    pty: asBoolean(row.pty),
    restart: asString(row.restart),
    readyLog: asString(ready?.log) ?? asString(row.readyLog),
    readyPort: asNumber(ready?.port) ?? asNumber(row.readyPort),
  };
  const filled =
    spec.application !== undefined ||
    spec.args !== undefined ||
    spec.cwd !== undefined ||
    spec.pty !== undefined ||
    spec.restart !== undefined ||
    spec.readyLog !== undefined ||
    spec.readyPort !== undefined;
  return filled ? spec : undefined;
}

function resolveProcessOp(
  requestedOp: string,
  details: Record<string, unknown>,
): HubProcessData["op"] {
  if (PROCESS_DATA_OPS[requestedOp]) return requestedOp as HubProcessData["op"];
  if (asArray(details.daemons)) return "ps";
  if (typeof details.text === "string") return "logs";
  if ("spec" in details) return "describe";
  return "start";
}

function resolveJobOp(
  requestedOp: string,
  details: Record<string, unknown>,
): "wait" | "jobs" | "cancel" {
  if (JOB_DATA_OPS[requestedOp]) return requestedOp as "wait" | "jobs" | "cancel";
  const detailsOp = asString(details.op) ?? "";
  if (JOB_DATA_OPS[detailsOp]) return detailsOp as "wait" | "jobs" | "cancel";
  return "cancelled" in details ? "cancel" : "jobs";
}

export function buildHubData(
  input: Record<string, unknown>,
  outputText: string | undefined,
  output: unknown,
): HubData {
  const requestedOp = (asString(input.op) ?? "").toLowerCase();
  const details = readDetails(output) ?? {};
  const detailsOp = (asString(details.op) ?? "").toLowerCase();
  const text = readProse(outputText, output);
  const name = asString(input.name);

  // A job snapshot wins over the op's name: `wait` answers with either jobs or
  // a peer message, and only the payload says which.
  if (asArray(details.jobs)) {
    return {
      kind: "jobs",
      text,
      data: {
        op: resolveJobOp(requestedOp, details),
        jobs: toJobs(details.jobs),
        cancelled: toCancelled(details.cancelled),
        agents: toAgents(details.agents),
      },
    };
  }

  if (asArray(details.receipts)) {
    return {
      kind: "send",
      text,
      data: {
        from: asString(details.from),
        to: asString(details.to) ?? asString(input.to),
        message: asString(input.message),
        replyTo: asString(input.replyTo),
        awaitReply: input.await === true,
        receipts: toReceipts(details.receipts),
        // A present `waited` that holds no message means the wait ended empty.
        reply: "waited" in details ? (toMessage(details.waited) ?? null) : undefined,
      },
    };
  }

  if ("waited" in details && (requestedOp === "wait" || detailsOp === "wait")) {
    return {
      kind: "waited",
      text,
      data: {
        from: asString(details.from),
        message: toMessage(details.waited) ?? null,
        timeoutMs: asNumber(input.timeoutMs),
      },
    };
  }

  if (asArray(details.inbox)) {
    const messages = (asArray(details.inbox) ?? []).flatMap((entry) => {
      const message = toMessage(entry);
      return message ? [message] : [];
    });
    return { kind: "inbox", text, data: { peek: input.peek === true, messages } };
  }

  // `list` names both rosters. Peers carry `peers`, the broker carries `daemons`.
  if (asArray(details.peers)) {
    return {
      kind: "peers",
      text,
      data: {
        peers: toPeers(details.peers),
        counts: toCounts(details.counts),
        statusFilter: asString(input.status),
      },
    };
  }

  const isProcess =
    asRecord(details.daemon) !== undefined ||
    asArray(details.daemons) !== undefined ||
    PROCESS_OPS[requestedOp] === true ||
    ((requestedOp === "wait" || requestedOp === "send") && name !== undefined);

  if (isProcess) {
    const op = resolveProcessOp(requestedOp, details);
    const daemon = toDaemon(details.daemon);
    const logText =
      typeof details.text === "string" ? details.text : asString(details.terminalText);
    const lines = logText
      ?.split("\n")
      .filter((line) => line.trim().length > 0)
      // Keep the tail: a card shows the newest lines, and a long run is unbounded.
      .slice(-200);
    const matchedPattern = details.matched === true ? asString(input.pattern) : undefined;
    // A `send` writes stdin text, terminal keys, or a signal. Report whichever it wrote.
    const sent =
      asString(input.text) ?? asStringList(input.keys)?.join(" ") ?? asString(input.signal);
    return {
      kind: "process",
      text,
      data: {
        op,
        name: asString(details.name) ?? daemon?.name ?? name,
        spec: toSpec(details.spec) ?? (op === "start" ? toSpec(input) : undefined),
        daemon,
        daemons: toDaemons(details.daemons),
        logs: lines !== undefined && lines.length > 0 ? lines : undefined,
        cursor: asNumber(details.cursor),
        timedOut: asBoolean(details.timedOut),
        matched: asString(details.matched) ?? matchedPattern,
        state: asString(details.state),
        input: op === "send" ? sent : undefined,
      },
    };
  }

  // An op this plugin has not typed yet, or a build that answered with prose
  // alone. The caption carries the result; the op names the call.
  return { kind: "note", text, data: { op: requestedOp || detailsOp || "hub" } };
}
