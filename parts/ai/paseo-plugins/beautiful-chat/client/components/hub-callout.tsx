import React, { useMemo, useState } from "react";
import { Image, View, Text, Pressable, StyleSheet } from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { Glyph } from "./glyph";
import { radius, withAlpha } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { selectableSurface, unselectable } from "./selection";
import { selectionSurface, selectionCodeText } from "./selection-actions";
import { renderTerminalOutput } from "./syntax-highlight";
import { Breathe } from "./breathe";
import { shimmering } from "./shimmer";
import { normalizeProvider } from "./provider-logo";
import { MARK_BITMAPS } from "./mark-bitmaps";
import type {
  HubAgentRow,
  HubData,
  HubDaemonRow,
  HubInboxData,
  HubJobRow,
  HubJobsData,
  HubPeersData,
  HubProcessData,
  HubSendData,
  HubWaitedData,
} from "../../shared/contracts";

interface HubCalloutProps {
  data: HubData;
  tokens: ExtendedThemeTokens;
}

/**
 * Every hub view draws from the tool's own `details` record. The prose in
 * `text` is a fallback for a record that carries no rows, never a second copy
 * of what the rows already say, and no branch here ever prints an object.
 */
export function HubCallout({ data, tokens }: HubCalloutProps) {
  const styles = useHubStyles(tokens);

  return (
    <View {...selectionSurface} style={styles.container}>
      <HubBody data={data} tokens={tokens} styles={styles} />
    </View>
  );
}

function HubBody({
  data,
  tokens,
  styles,
}: {
  data: HubData;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
}): React.ReactNode {
  switch (data.kind) {
    case "send":
      return <SendView data={data.data} text={data.text} tokens={tokens} styles={styles} />;
    case "waited":
      return <WaitedView data={data.data} text={data.text} tokens={tokens} styles={styles} />;
    case "inbox":
      return <InboxView data={data.data} text={data.text} tokens={tokens} styles={styles} />;
    case "peers":
      return <PeersView data={data.data} text={data.text} tokens={tokens} styles={styles} />;
    case "jobs":
      return <JobsView data={data.data} text={data.text} tokens={tokens} styles={styles} />;
    case "process":
      return <ProcessView data={data.data} text={data.text} tokens={tokens} styles={styles} />;
    case "note":
      return <NoteView data={data.data} text={data.text} tokens={tokens} styles={styles} />;
    default: {
      // A kind outside the union cannot reach here; the compiler proves it.
      const exhaustive: never = data;
      return exhaustive;
    }
  }
}

interface HubViewProps<T> {
  data: T;
  text: string | undefined;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
}

/* ---------------------------------------------------------------- formatting */

/**
 * A gap in human units — `820ms`, `1.4s`, `2m 5s`, `1h 3m`. A raw millisecond
 * count in a row forces the reader to divide, so nothing prints one.
 */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const minutes = Math.floor(seconds / 60);
  const restSeconds = Math.round(seconds - minutes * 60);
  if (minutes < 60) return restSeconds > 0 ? `${minutes}m ${restSeconds}s` : `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes - hours * 60;
  return restMinutes > 0 ? `${hours}h ${restMinutes}m` : `${hours}h`;
}

/** An epoch-millisecond stamp as an age. A wall clock says less than the gap. */
function formatAge(ts: number): string {
  const gap = formatDuration(Date.now() - ts);
  return gap ? `${gap} ago` : "just now";
}

/* -------------------------------------------------------------------- tones */

interface Tone {
  fg: string;
  bg: string;
}

function mutedTone(tokens: ExtendedThemeTokens): Tone {
  return { fg: tokens.foregroundMuted, bg: tokens.surface2 };
}

/** A running job is the normal state of a `wait`, so it reads as accent, not as risk. */
function jobTone(status: string, tokens: ExtendedThemeTokens): Tone {
  switch (status) {
    case "running":
      return { fg: tokens.accent, bg: tokens.accentBg };
    case "completed":
      return { fg: tokens.success, bg: tokens.successBg };
    case "failed":
      return { fg: tokens.danger, bg: tokens.dangerBg };
    case "cancelled":
      return { fg: tokens.warning, bg: tokens.warningBg };
    default:
      return mutedTone(tokens);
  }
}

function peerTone(status: string, tokens: ExtendedThemeTokens): Tone {
  switch (status) {
    case "running":
      return { fg: tokens.accent, bg: tokens.accentBg };
    case "parked":
      return { fg: tokens.warning, bg: tokens.warningBg };
    default:
      // `idle` and anything newer stay muted: neither is worth a colour.
      return mutedTone(tokens);
  }
}

/** The outcome set is open, so an unknown outcome stays muted instead of claiming success. */
function receiptTone(outcome: string, tokens: ExtendedThemeTokens): Tone {
  switch (outcome) {
    case "injected":
    case "woken":
    case "queued":
      return { fg: tokens.success, bg: tokens.successBg };
    case "revived":
      return { fg: tokens.warning, bg: tokens.warningBg };
    case "failed":
      return { fg: tokens.danger, bg: tokens.dangerBg };
    default:
      return mutedTone(tokens);
  }
}

function daemonTone(state: string, tokens: ExtendedThemeTokens): Tone {
  switch (state) {
    case "ready":
    case "running":
      return { fg: tokens.success, bg: tokens.successBg };
    case "starting":
      return { fg: tokens.accent, bg: tokens.accentBg };
    case "failed":
    case "crashed":
      return { fg: tokens.danger, bg: tokens.dangerBg };
    case "stopping":
      return { fg: tokens.warning, bg: tokens.warningBg };
    default:
      return mutedTone(tokens);
  }
}

/* --------------------------------------------------------------- primitives */

function HubHeader({
  icon,
  op,
  detail,
  trailing,
  tokens,
  styles,
}: {
  icon: string;
  op: string;
  detail?: string;
  trailing?: React.ReactNode;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Glyph name={icon} size={13} color={tokens.accent} />
        <Text selectable style={styles.opBadge}>
          hub {op}
        </Text>
        {detail ? (
          <Text selectable style={styles.headline} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing ?? null}
    </View>
  );
}

function Chip({
  label,
  tone,
  styles,
  plain,
}: {
  label: string;
  tone: Tone;
  styles: HubStyles;
  plain?: boolean;
}) {
  return (
    <Text
      selectable
      style={[plain ? styles.chipPlain : styles.chip, { color: tone.fg, backgroundColor: tone.bg }]}
    >
      {label}
    </Text>
  );
}

/** A peer message. Prose, so it keeps proportional text and no highlighting. */
function MessageBody({ body, styles }: { body: string; styles: HubStyles }) {
  return (
    <View style={styles.messageBox}>
      <Text selectable style={styles.messageText}>
        {body}
      </Text>
    </View>
  );
}

/** Job results and log lines are command output, so they go through the terminal colourer. */
function TerminalBlock({
  text,
  tokens,
  styles,
  footer,
}: {
  text: string;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
  footer?: React.ReactNode;
}) {
  return (
    <View style={styles.codeBlock}>
      <Text selectable {...selectionCodeText} style={styles.codeText}>
        {renderTerminalOutput(text, tokens)}
      </Text>
      {footer ?? null}
    </View>
  );
}

/** A `hub jobs` snapshot carries one result per job, and a bash result is a
 * whole terminal transcript. Unclipped, fourteen of those turn one card into a
 * page, so every long body opens on demand. */
const CLIP_LINES = 6;
const ROW_CAP = 8;

// An Image style, kept out of the themed sheet: `StyleSheet.create` widens an
// entry to a View style, and `overflow: "scroll"` is not an Image value. A
// logo has no text, so it needs no selection mark either.
const PROVIDER_LOGO: ImageStyle = { width: 11, height: 11 };

function MoreControl({
  label,
  onPress,
  styles,
}: {
  label: string;
  onPress: () => void;
  styles: HubStyles;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Text style={styles.moreLabel}>{label}</Text>
    </Pressable>
  );
}

/** Command output, clipped to its first lines until the reader asks for more. */
function ClippedTerminal({
  text,
  tokens,
  styles,
  footer,
}: {
  text: string;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const lines = text.split("\n");
  const hidden = Math.max(0, lines.length - CLIP_LINES);
  const shown = open || hidden === 0 ? text : lines.slice(0, CLIP_LINES).join("\n");

  return (
    <TerminalBlock
      text={shown}
      tokens={tokens}
      styles={styles}
      footer={
        <>
          {footer ?? null}
          {hidden > 0 ? (
            <MoreControl
              label={open ? "show less" : `show ${hidden} more ${hidden === 1 ? "line" : "lines"}`}
              onPress={() => setOpen((previous) => !previous)}
              styles={styles}
            />
          ) : null}
        </>
      }
    />
  );
}

/**
 * The op's own prose, clipped the same way. This is markdown a tool wrote for
 * the model, not a sentence, so it reads as output rather than body text.
 */
function Fallback({
  text,
  tokens,
  styles,
}: {
  text: string | undefined;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
}) {
  if (!text) return null;
  return <ClippedTerminal text={text} tokens={tokens} styles={styles} />;
}

/**
 * What a card shows when its record carries no rows. The op's own prose says
 * more than a generic line, so the line appears only when there is no prose.
 */
function EmptyState({
  text,
  placeholder,
  tokens,
  styles,
}: {
  text: string | undefined;
  placeholder: string;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
}) {
  if (text) return <ClippedTerminal text={text} tokens={tokens} styles={styles} />;
  return <Text style={styles.placeholder}>{placeholder}</Text>;
}

/* -------------------------------------------------------------------- views */

function SendView({ data, text, tokens, styles }: HubViewProps<HubSendData>) {
  const route = [data.from, data.to].filter(Boolean).join(" ➔ ");
  const empty = !data.message && data.receipts.length === 0;

  return (
    <>
      <HubHeader
        icon="Radio"
        op="send"
        detail={route}
        tokens={tokens}
        styles={styles}
        trailing={
          data.replyTo ? (
            <Text selectable style={styles.figure}>
              reply to {data.replyTo}
            </Text>
          ) : null
        }
      />

      {data.message ? <MessageBody body={data.message} styles={styles} /> : null}

      {data.receipts.map((receipt, index) => (
        <View key={`${receipt.to}-${index}`} style={styles.rowHead}>
          <Chip
            label={receipt.outcome}
            tone={receiptTone(receipt.outcome, tokens)}
            styles={styles}
          />
          <Text selectable style={styles.rowLabel} numberOfLines={1}>
            {receipt.to}
          </Text>
          {receipt.error ? (
            <Text selectable style={styles.errorText}>
              {receipt.error}
            </Text>
          ) : null}
        </View>
      ))}

      {data.awaitReply ? (
        data.reply ? (
          <View style={styles.replyBox}>
            <View style={styles.rowHead}>
              <Text selectable style={styles.sender}>
                {data.reply.from}
              </Text>
              {typeof data.reply.ts === "number" ? (
                <Text selectable style={styles.figure}>
                  {formatAge(data.reply.ts)}
                </Text>
              ) : null}
            </View>
            <Text selectable style={styles.replyText}>
              {data.reply.body}
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>No reply yet.</Text>
        )
      ) : null}

      {empty ? <Fallback text={text} tokens={tokens} styles={styles} /> : null}
    </>
  );
}

function WaitedView({ data, text, tokens, styles }: HubViewProps<HubWaitedData>) {
  const message = data.message;

  return (
    <>
      <HubHeader
        icon="MessageSquare"
        op="wait"
        detail={message ? `from ${message.from}` : data.from}
        tokens={tokens}
        styles={styles}
        trailing={
          typeof data.timeoutMs === "number" ? (
            <Text selectable style={styles.figure}>
              timeout {formatDuration(data.timeoutMs)}
            </Text>
          ) : null
        }
      />

      {message ? (
        <>
          <View style={styles.rowHead}>
            {message.replyTo ? (
              <Text selectable style={styles.figure}>
                reply to {message.replyTo}
              </Text>
            ) : null}
            {typeof message.ts === "number" ? (
              <Text selectable style={styles.figure}>
                {formatAge(message.ts)}
              </Text>
            ) : null}
          </View>
          <MessageBody body={message.body} styles={styles} />
        </>
      ) : (
        <EmptyState
          text={text}
          placeholder="The wait ended without a message."
          tokens={tokens}
          styles={styles}
        />
      )}
    </>
  );
}

function InboxView({ data, text, tokens, styles }: HubViewProps<HubInboxData>) {
  const count = data.messages.length;

  return (
    <>
      <HubHeader
        icon="Inbox"
        op="inbox"
        detail={`${count} ${count === 1 ? "message" : "messages"}`}
        tokens={tokens}
        styles={styles}
        trailing={
          data.peek ? (
            <Chip label="peek — still queued" tone={mutedTone(tokens)} styles={styles} plain />
          ) : null
        }
      />

      {data.messages.map((message, index) => (
        <View key={message.id ?? `inbox-${index}`} style={styles.stackRow}>
          <View style={styles.rowHead}>
            <Text selectable style={styles.sender}>
              {message.from}
            </Text>
            {message.replyTo ? (
              <Text selectable style={styles.figure}>
                reply to {message.replyTo}
              </Text>
            ) : null}
            {typeof message.ts === "number" ? (
              <Text selectable style={styles.figure}>
                {formatAge(message.ts)}
              </Text>
            ) : null}
          </View>
          <Text selectable style={styles.bodyText}>
            {message.body}
          </Text>
        </View>
      ))}

      {count === 0 ? (
        <EmptyState text={text} placeholder="The inbox is empty." tokens={tokens} styles={styles} />
      ) : null}
    </>
  );
}

function PeersView({ data, text, tokens, styles }: HubViewProps<HubPeersData>) {
  const counts = data.counts;
  const summary = counts
    ? [
        `${counts.running} running`,
        `${counts.idle} idle`,
        `${counts.parked} parked`,
        typeof counts.shown === "number" ? `${counts.shown} shown` : "",
        counts.truncated ? `${counts.truncated} hidden` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <>
      <HubHeader
        icon="Users"
        op="list"
        detail={summary || `${data.peers.length} peers`}
        tokens={tokens}
        styles={styles}
        trailing={
          data.statusFilter ? (
            <Chip
              label={data.statusFilter}
              tone={peerTone(data.statusFilter, tokens)}
              styles={styles}
            />
          ) : null
        }
      />

      {data.peers.map((peer) => (
        <View key={peer.id} style={styles.stackRow}>
          <View style={styles.rowHead}>
            <Chip label={peer.status} tone={peerTone(peer.status, tokens)} styles={styles} />
            <Text selectable style={styles.rowLabel} numberOfLines={1}>
              {peer.id}
            </Text>
            {peer.displayName && peer.displayName !== peer.id ? (
              <Text selectable style={styles.figure}>
                {peer.displayName}
              </Text>
            ) : null}
            {peer.kind ? (
              <Text selectable style={styles.figure}>
                {peer.kind}
              </Text>
            ) : null}
            {(peer.unread ?? 0) > 0 ? (
              <Chip
                label={`${peer.unread} unread`}
                tone={{ fg: tokens.warning, bg: tokens.warningBg }}
                styles={styles}
                plain
              />
            ) : null}
            {typeof peer.lastActivity === "number" ? (
              <Text selectable style={styles.figure}>
                {formatAge(peer.lastActivity)}
              </Text>
            ) : null}
          </View>
          {peer.activity ? (
            <Text selectable style={styles.subtleBody}>
              {peer.activity}
            </Text>
          ) : null}
        </View>
      ))}

      {data.peers.length === 0 ? (
        <EmptyState text={text} placeholder="No peers match." tokens={tokens} styles={styles} />
      ) : null}
    </>
  );
}

function JobsView({ data, text, tokens, styles }: HubViewProps<HubJobsData>) {
  const [allRows, setAllRows] = useState(false);
  const cancelled = data.cancelled ?? [];
  const agents = data.agents ?? [];
  const running = data.jobs.filter((job) => job.status === "running").length;
  const failed = data.jobs.filter((job) => job.status === "failed").length;
  const empty = data.jobs.length === 0 && cancelled.length === 0 && agents.length === 0;
  // A snapshot after a long turn lists every settled job. Past the cap the card
  // stops being a card, so the tail waits behind one control.
  const rows = allRows ? data.jobs : data.jobs.slice(0, ROW_CAP);
  const restRows = data.jobs.length - rows.length;

  // Every job still running is what a `wait` normally answers. That is waiting,
  // not failure, so the headline says so instead of leaning on a status count.
  const summary =
    data.jobs.length === 0
      ? "no jobs"
      : running === data.jobs.length
        ? `waiting on ${running} ${running === 1 ? "job" : "jobs"}`
        : [
            `${data.jobs.length} jobs`,
            running > 0 ? `${running} running` : "",
            failed > 0 ? `${failed} failed` : "",
          ]
            .filter(Boolean)
            .join(" · ");

  return (
    <>
      <HubHeader icon="Layers" op={data.op} detail={summary} tokens={tokens} styles={styles} />

      {rows.map((job) => (
        <JobRow key={job.id} job={job} tokens={tokens} styles={styles} />
      ))}

      {restRows > 0 || allRows ? (
        <MoreControl
          label={allRows ? `show only the first ${ROW_CAP}` : `show ${restRows} more jobs`}
          onPress={() => setAllRows((previous) => !previous)}
          styles={styles}
        />
      ) : null}

      {cancelled.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>cancelled</Text>
          {cancelled.map((row) => (
            <View key={row.id} style={styles.rowHead}>
              <Chip label={row.status} tone={jobTone(row.status, tokens)} styles={styles} />
              <Text selectable style={styles.rowLabel} numberOfLines={1}>
                {row.id}
              </Text>
              {row.message ? (
                <Text selectable style={styles.figure}>
                  {row.message}
                </Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}

      {agents.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>subagents without a job entry</Text>
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} tokens={tokens} styles={styles} />
          ))}
        </>
      ) : null}

      {empty ? (
        <EmptyState text={text} placeholder="Nothing is running." tokens={tokens} styles={styles} />
      ) : null}
    </>
  );
}

function RunningJobHead({
  running,
  styles,
  children,
}: {
  running: boolean;
  styles: HubStyles;
  children: React.ReactNode;
}) {
  // The sweep is a CSS gradient (see `./shimmer`): an Animated band is a
  // hard-edged rectangle, which reads as a grey box parked on the text.
  const sweep = running ? shimmering : undefined;

  return (
    <View {...sweep} style={styles.jobHead}>
      <View style={styles.rowHead}>
        <View style={styles.jobRailSlot} pointerEvents="none" accessible={false}>
          {running ? (
            <Breathe active={running} depth={1.06} durationMs={3200}>
              <View style={styles.jobRail} />
            </Breathe>
          ) : null}
        </View>
        {children}
      </View>
    </View>
  );
}

function JobModel({
  value,
  tokens,
  styles,
}: {
  value: string;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
}) {
  const [failedUri, setFailedUri] = useState<string>();
  // Provider ends at the first slash; an optional final colon introduces effort.
  const match = /^([^/:\s]+)\/([^:\s]+)(?::([^:\s]+))?$/.exec(value);
  const provider = match?.[1];
  const model = match?.[2];
  const effort = match?.[3];
  const normalized = provider ? normalizeProvider(provider) : "generic";
  const markNames = provider
    ? [provider.toLowerCase(), ...(normalized === "generic" ? [] : [normalized])]
    : [];
  const uri = markNames
    .flatMap((name) => [MARK_BITMAPS[`provider:${name}`], MARK_BITMAPS[`lobe:${name}`]])
    .find((candidate) => Boolean(candidate));

  if (!model || !uri || uri === failedUri) {
    return (
      <Text selectable style={styles.figure}>
        {value}
      </Text>
    );
  }

  return (
    <View style={styles.jobModel}>
      {/* ProviderLogo has fixed brand colours; reuse its raster marks with the figure tint. */}
      <Image
        key={uri}
        source={{ uri }}
        style={[PROVIDER_LOGO, { tintColor: tokens.foregroundSubtle }]}
        resizeMode="contain"
        accessibilityLabel={provider}
        onError={() => setFailedUri(uri)}
      />
      <Text selectable style={styles.figure}>
        {model}
      </Text>
      {effort ? (
        <Chip
          label={effort}
          tone={{ fg: tokens.foregroundSubtle, bg: tokens.surface2 }}
          styles={styles}
          plain
        />
      ) : null}
    </View>
  );
}

function JobRow({
  job,
  tokens,
  styles,
}: {
  job: HubJobRow;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
}) {
  const schema = job.schema;
  const running = job.status === "running";

  return (
    <View style={styles.stackRow}>
      <RunningJobHead running={running} styles={styles}>
        <Chip label={job.status} tone={jobTone(job.status, tokens)} styles={styles} />
        <Text selectable style={styles.rowLabel} numberOfLines={1}>
          {job.id}
        </Text>
        <Text selectable style={styles.figure}>
          {job.type}
        </Text>
        {typeof job.durationMs === "number" ? (
          <Text selectable style={styles.figure}>
            {formatDuration(job.durationMs)}
          </Text>
        ) : null}
      </RunningJobHead>

      {job.label ? (
        // A bash job's label is its whole command, sometimes an inline script.
        <Text selectable style={styles.subtleBody} numberOfLines={2}>
          {job.label}
        </Text>
      ) : null}

      {job.resolvedModel || job.advisor ? (
        <View style={styles.rowHead}>
          {job.resolvedModel ? (
            <JobModel value={job.resolvedModel} tokens={tokens} styles={styles} />
          ) : null}
          {job.advisor ? <Text style={styles.marker}>advisor</Text> : null}
        </View>
      ) : null}

      {job.errorText ? (
        <Text selectable style={styles.errorText}>
          {job.errorText}
        </Text>
      ) : null}

      {job.resultText ? (
        <ClippedTerminal text={job.resultText} tokens={tokens} styles={styles} />
      ) : null}

      {schema ? (
        <View style={styles.rowHead}>
          <Text selectable style={styles.figure}>
            schema {schema.status}
          </Text>
          {schema.error ? (
            <Text selectable style={styles.errorText}>
              {schema.error}
            </Text>
          ) : null}
          {schema.agentUrl ? (
            <Text selectable style={styles.figure} numberOfLines={1}>
              {schema.agentUrl}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function AgentRow({
  agent,
  tokens,
  styles,
}: {
  agent: HubAgentRow;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
}) {
  return (
    <View style={styles.stackRow}>
      <View style={styles.rowHead}>
        <Text selectable style={styles.rowLabel} numberOfLines={1}>
          {agent.id}
        </Text>
        {agent.parentId ? (
          <Text selectable style={styles.figure}>
            under {agent.parentId}
          </Text>
        ) : null}
        {typeof agent.ageMs === "number" ? (
          <Text selectable style={styles.figure}>
            {formatDuration(agent.ageMs)}
          </Text>
        ) : null}
        {agent.live === false ? (
          <Chip
            label="no longer live"
            tone={{ fg: tokens.warning, bg: tokens.warningBg }}
            styles={styles}
            plain
          />
        ) : null}
      </View>
      {agent.activity ? (
        <Text selectable style={styles.subtleBody}>
          {agent.activity}
        </Text>
      ) : null}
    </View>
  );
}

function ProcessView({ data, text, tokens, styles }: HubViewProps<HubProcessData>) {
  const daemons = data.daemons;
  const logs = data.logs ?? [];
  const spec = data.spec;
  const launch = spec ? [spec.application, ...(spec.args ?? [])].filter(Boolean).join(" ") : "";
  const empty = !daemons?.length && !data.daemon && logs.length === 0 && !spec && !data.input;

  // A roster addresses every process, so it carries a count, not a name.
  const detail = daemons
    ? `${daemons.length} ${daemons.length === 1 ? "process" : "processes"}`
    : data.name;

  return (
    <>
      <HubHeader
        icon="Server"
        op={data.op}
        detail={detail}
        tokens={tokens}
        styles={styles}
        trailing={
          <View style={styles.trailing}>
            {data.state ? (
              <Chip label={data.state} tone={daemonTone(data.state, tokens)} styles={styles} />
            ) : null}
            {data.timedOut ? (
              <Chip
                label="timed out"
                tone={{ fg: tokens.warning, bg: tokens.warningBg }}
                styles={styles}
              />
            ) : null}
          </View>
        }
      />

      {data.daemon ? (
        <DaemonRow row={data.daemon} detailed tokens={tokens} styles={styles} />
      ) : null}

      {daemons?.map((row) => (
        <DaemonRow key={row.name} row={row} tokens={tokens} styles={styles} />
      ))}

      {spec ? (
        <View style={styles.codeBlock}>
          {launch ? (
            <Text selectable {...selectionCodeText} style={styles.codeText}>
              {launch}
            </Text>
          ) : null}
          <View style={styles.rowHead}>
            {spec.cwd ? (
              <Text selectable style={styles.figure}>
                cwd {spec.cwd}
              </Text>
            ) : null}
            {spec.restart ? (
              <Text selectable style={styles.figure}>
                restart {spec.restart}
              </Text>
            ) : null}
            {spec.readyLog ? (
              <Text selectable style={styles.figure}>
                ready log {spec.readyLog}
              </Text>
            ) : null}
            {typeof spec.readyPort === "number" ? (
              <Text selectable style={styles.figure}>
                ready port {spec.readyPort}
              </Text>
            ) : null}
            {spec.pty ? <Text style={styles.marker}>pty</Text> : null}
          </View>
        </View>
      ) : null}

      {data.matched ? (
        <View style={styles.rowHead}>
          <Text style={styles.sectionLabel}>matched</Text>
          <Text selectable style={styles.rowLabel}>
            {data.matched}
          </Text>
        </View>
      ) : null}

      {data.input ? (
        <>
          <Text style={styles.sectionLabel}>sent to stdin</Text>
          <MessageBody body={data.input} styles={styles} />
        </>
      ) : null}

      {logs.length > 0 ? (
        <ClippedTerminal
          text={logs.join("\n")}
          tokens={tokens}
          styles={styles}
          footer={
            typeof data.cursor === "number" ? (
              <Text selectable style={styles.figure}>
                cursor {data.cursor}
              </Text>
            ) : null
          }
        />
      ) : null}

      {empty ? <Fallback text={text} tokens={tokens} styles={styles} /> : null}
    </>
  );
}

function DaemonRow({
  row,
  tokens,
  styles,
  detailed,
}: {
  row: HubDaemonRow;
  tokens: ExtendedThemeTokens;
  styles: HubStyles;
  detailed?: boolean;
}) {
  const exited = typeof row.exitCode === "number";

  return (
    <View style={styles.stackRow}>
      <View style={styles.rowHead}>
        <Chip label={row.state} tone={daemonTone(row.state, tokens)} styles={styles} />
        <Text selectable style={styles.rowLabel} numberOfLines={1}>
          {row.name}
        </Text>
        {typeof row.pid === "number" ? (
          <Text selectable style={styles.figure}>
            pid {row.pid}
          </Text>
        ) : null}
        {row.restarts ? (
          <Text selectable style={styles.figure}>
            {row.restarts} restarts
          </Text>
        ) : null}
        {exited ? (
          <Text selectable style={row.exitCode === 0 ? styles.figure : styles.errorText}>
            exit {row.exitCode}
          </Text>
        ) : null}
      </View>

      {detailed ? (
        <View style={styles.rowHead}>
          {row.exitReason ? (
            <Text selectable style={styles.figure}>
              {row.exitReason}
            </Text>
          ) : null}
          {row.readyMatch ? (
            <Text selectable style={styles.figure}>
              match {row.readyMatch}
            </Text>
          ) : null}
          {typeof row.startedAt === "number" ? (
            <Text selectable style={styles.figure}>
              started {formatAge(row.startedAt)}
            </Text>
          ) : null}
          {row.persist ? <Text style={styles.marker}>persist</Text> : null}
          {row.detached ? <Text style={styles.marker}>detached</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function NoteView({ data, text, tokens, styles }: HubViewProps<{ op: string }>) {
  return (
    <>
      <HubHeader icon="Radio" op={data.op} tokens={tokens} styles={styles} />
      <EmptyState
        text={text}
        placeholder="The call returned no detail."
        tokens={tokens}
        styles={styles}
      />
    </>
  );
}

/* ------------------------------------------------------------------- styles */

interface HubStyles {
  container: ViewStyle;
  header: ViewStyle;
  titleRow: ViewStyle;
  trailing: ViewStyle;
  rowHead: ViewStyle;
  stackRow: ViewStyle;
  jobHead: ViewStyle;
  jobRailSlot: ViewStyle;
  jobRail: ViewStyle;
  jobModel: ViewStyle;
  messageBox: ViewStyle;
  replyBox: ViewStyle;
  codeBlock: ViewStyle;
  opBadge: TextStyle;
  headline: TextStyle;
  chip: TextStyle;
  chipPlain: TextStyle;
  rowLabel: TextStyle;
  sender: TextStyle;
  figure: TextStyle;
  marker: TextStyle;
  sectionLabel: TextStyle;
  errorText: TextStyle;
  bodyText: TextStyle;
  subtleBody: TextStyle;
  placeholder: TextStyle;
  messageText: TextStyle;
  replyText: TextStyle;
  codeText: TextStyle;
  moreLabel: TextStyle;
}

function useHubStyles(tokens: ExtendedThemeTokens): HubStyles {
  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderRadius: radius.card,
          backgroundColor: tokens.surface1,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          overflow: "hidden",
          ...tokens.boxShadow,
          ...selectableSurface,
          gap: 8,
          padding: 12,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        },
        titleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexShrink: 1,
        },
        trailing: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        opBadge: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: tokens.accent,
          backgroundColor: tokens.accentBg,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
        },
        headline: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.foreground,
          flexShrink: 1,
        },
        // A row of chips and figures. `flexWrap` keeps a long id on screen.
        rowHead: {
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        },
        stackRow: {
          gap: 4,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
        },
        jobHead: {
          position: "relative",
          overflow: "hidden",
        },
        jobRailSlot: {
          width: 2,
          height: 14,
          alignItems: "center",
          justifyContent: "center",
          ...unselectable,
        },
        jobRail: {
          width: 2,
          height: 12,
          borderRadius: 1,
          backgroundColor: tokens.accent,
          opacity: 0.45,
          ...unselectable,
        },
        jobModel: {
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          flexShrink: 1,
          gap: 5,
        },

        chip: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
          overflow: "hidden",
        },
        chipPlain: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "600",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
          overflow: "hidden",
        },
        // An id takes the free width and wraps there, so it never pushes a
        // chip or a duration off the card.
        rowLabel: {
          fontFamily: tokens.fontMono,
          fontSize: 12,
          color: tokens.foreground,
          flex: 1,
          minWidth: 0,
        },
        sender: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "700",
          color: tokens.accent,
        },
        figure: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.foregroundSubtle,
          flexShrink: 1,
        },
        marker: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: tokens.warning,
          ...unselectable,
        },
        sectionLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: tokens.foregroundSubtle,
          ...unselectable,
        },
        errorText: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          lineHeight: 16,
          color: tokens.danger,
          flexShrink: 1,
        },
        bodyText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 18,
          color: tokens.foreground,
          flex: 1,
          minWidth: 0,
        },
        subtleBody: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          lineHeight: 16,
          color: tokens.foregroundMuted,
          flex: 1,
          minWidth: 0,
        },
        placeholder: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          fontStyle: "italic",
          color: tokens.foregroundSubtle,
          ...unselectable,
        },
        messageBox: {
          padding: 10,
          borderRadius: radius.block,
          backgroundColor: tokens.surfaceCode,
          borderLeftWidth: 3,
          borderLeftColor: tokens.accent,
        },
        messageText: {
          fontFamily: tokens.fontMono,
          fontSize: 12,
          lineHeight: 18,
          color: tokens.foreground,
        },
        replyBox: {
          padding: 10,
          borderRadius: radius.block,
          backgroundColor: tokens.surface0,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          gap: 4,
        },
        replyText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 18,
          color: tokens.foregroundMuted,
        },
        codeBlock: {
          padding: 10,
          borderRadius: radius.block,
          backgroundColor: tokens.surfaceCode,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          gap: 6,
        },
        codeText: {
          fontFamily: tokens.fontMono,
          fontSize: 11,
          lineHeight: 16,
          color: tokens.foregroundMuted,
        },
        moreLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          fontWeight: "500",
          color: tokens.accent,
          ...unselectable,
        },
      }),
    [tokens],
  );
}
