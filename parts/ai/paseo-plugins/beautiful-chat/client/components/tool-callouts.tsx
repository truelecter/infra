import React, { useState, useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { Glyph } from "./glyph";
import { frosted } from "./frosted";
import { surfaceProps } from "./view-props";
import { glowing } from "./glow";
import { Rotate } from "./motion";
import { Breathe } from "./breathe";
import { PulseDot } from "./pulse-dot";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { HubCallout } from "./hub-callout";
import { PaseoToolCallout } from "./paseo-tool-callouts";
import { SyntaxHighlightBlock, renderTerminalOutput } from "./syntax-highlight";
import { FileTypeLogo } from "./file-type-logo";
import { ImagePreview } from "./image-preview";
import { GitHubBody } from "./github-body";
import { isImagePath } from "../image-file";
import type { ImageFile } from "../image-file";
import { selectableSurface, unselectable } from "./selection";
import { selectionCodeText, selectionSurface } from "./selection-actions";
import type { ToolCalloutData } from "../../shared/contracts";

function getToolIconName(tool: string): string {
  if (tool === "git") return "Git";
  if (tool === "paseo") return "Paseo";
  if (tool === "github") return "GitHub";
  if (tool === "bash" || tool === "shell") return "Terminal";
  if (tool === "read") return "Book";
  if (tool === "edit" || tool === "write") return "Pencil";
  if (tool === "thinking") return "Brain";
  if (tool === "eval") return "Play";
  if (tool === "ask") return "HelpCircle";
  if (tool === "mcp") return "Plug";
  if (tool === "task") return "Bot";
  if (tool === "hub") return "Radio";
  return "Wrench";
}

interface ToolCalloutProps {
  data: ToolCalloutData;
  tokens: ExtendedThemeTokens;
  defaultExpanded?: boolean;
  /** Shows a path in the machine's own file manager. */
  onRevealPath?: (path: string) => void;
  /**
   * The image this call read, when it read one. `undefined` keeps the code
   * block, so a harness with no daemon still renders the card; `null` means
   * the read is in flight.
   */
  imageFile?: ImageFile | null;
}

export function ToolCallout({
  data,
  tokens,
  defaultExpanded = true,
  onRevealPath,
  imageFile,
}: ToolCalloutProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // `defaultExpanded` is not a mount-time seed. A call is rendered first while
  // it is still running, so the collapse that belongs to its completion arrives
  // as a prop change that `useState` would drop, leaving every watched call
  // open. Follow the transitions only, so a manual toggle in between survives.
  const previousDefaultExpanded = useRef(defaultExpanded);
  if (previousDefaultExpanded.current !== defaultExpanded) {
    previousDefaultExpanded.current = defaultExpanded;
    setExpanded(defaultExpanded);
  }

  // Every branch below needs a payload. A tool that carries none — a hub op
  // with no parsed record, an unmapped kind — would otherwise draw an empty
  // panel, so the raw output takes over.
  const hasTypedBody =
    data.tool === "bash" ||
    data.tool === "shell" ||
    data.tool === "git" ||
    data.tool === "github" ||
    data.tool === "thinking" ||
    data.tool === "read" ||
    data.tool === "write" ||
    data.tool === "edit" ||
    data.tool === "eval" ||
    (data.tool === "mcp" && Boolean(data.mcp)) ||
    (data.tool === "ask" && Boolean(data.askOptions || data.askAnswer)) ||
    (data.tool === "task" && Boolean(data.subagent)) ||
    (data.tool === "hub" && Boolean(data.hub)) ||
    (data.tool === "paseo" && Boolean(data.paseo));

  const filePath = data.filePath;
  // A tool without a path, or a host that cannot reveal one, leaves the file
  // name as a plain label rather than a link that does nothing.
  const revealFile = useMemo(
    () => (onRevealPath && filePath ? () => onRevealPath(filePath) : undefined),
    [onRevealPath, filePath],
  );

  const isSuccess = data.status === "completed";
  const isRunning = data.status === "running";
  const isFailed = data.status === "failed";

  // Only a real shell call can "complete without output". A git op or an
  // unmapped tool that prints nothing is not a silent command, so neither
  // inherits the shell sentence.
  const isShellCall = data.tool === "bash" || data.tool === "shell";

  const statusColor = isSuccess ? tokens.success : isRunning ? tokens.accent : tokens.danger;

  const statusBg = isSuccess ? tokens.successBg : isRunning ? tokens.accentBg : tokens.dangerBg;

  const iconColor =
    data.tool === "git" ? "#F05032" : data.tool === "github" ? tokens.foreground : tokens.accent;

  // A reply that matches no offered label is free text the user typed, so it
  // is labelled as such rather than pretending an option was picked. Without
  // the offered options (Paseo 0.11 drops them) there is nothing to tell apart.
  const answered = data.askAnswer ?? [];
  const offered = data.askOptions ?? [];
  const typedReply =
    answered.length > 0 &&
    offered.length > 0 &&
    !answered.some((answer) =>
      offered.some((option) => option.label.trim().toLowerCase() === answer.trim().toLowerCase()),
    );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginVertical: 4,
          borderRadius: radius.card,
          backgroundColor: tokens.surfaceGlass,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          ...tokens.boxShadow,
          overflow: "hidden",
          ...selectableSurface,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: tokens.surface1,
        },
        headerLeft: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flex: 1,
        },
        toolPill: {
          fontSize: 11,
          fontFamily: tokens.fontUi,
          fontWeight: "600",
          color: tokens.foregroundSubtle,
          textTransform: "lowercase",
        },
        titleText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.foreground,
          flexShrink: 1,
        },
        // Commands and file paths are code, so they stay on the mono face to
        // match the tool pill sitting beside them.
        headerRight: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        durationBadge: {
          fontSize: 11,
          fontFamily: tokens.fontUi,
          color: tokens.foregroundSubtle,
        },
        statusBadge: {
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
          backgroundColor: statusBg,
        },
        statusText: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          color: statusColor,
        },
        chevron: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.foregroundMuted,
          marginLeft: 2,
        },
        body: {
          padding: 12,
          backgroundColor: tokens.surface0,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
        },
        // Bash terminal style
        // Terminal style
        terminalWindow: {
          borderRadius: radius.block,
          backgroundColor: tokens.surfaceCode,
          padding: 10,
          gap: 6,
          ...tokens.boxShadow,
        },
        terminalPrompt: {
          fontSize: 12,
          fontFamily: tokens.fontMono,
          color: tokens.foreground,
        },
        evalOutput: {
          padding: 8,
          borderRadius: radius.block,
          backgroundColor: tokens.surfaceCode,
          borderLeftWidth: 2,
          borderLeftColor: tokens.borderSubtle,
          gap: 3,
          ...tokens.boxShadow,
        },
        evalOutputLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.foregroundSubtle,
          textTransform: "lowercase",
        },
        evalOutputText: {
          fontFamily: tokens.fontMono,
          fontSize: 11.5,
          lineHeight: 17,
          color: tokens.foregroundMuted,
        },
        terminalOutput: {
          fontFamily: tokens.fontMono,
          fontSize: 11.5,
          lineHeight: 17,
          color: tokens.foregroundMuted,
        },
        silentCommandText: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.foregroundSubtle,
          fontStyle: "italic",
        },
        // Ask tool options
        askContainer: {
          gap: 8,
        },
        askPrompt: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.foregroundSubtle,
          marginBottom: 4,
        },
        askOptionLabelChosen: {
          color: tokens.foreground,
          fontWeight: "600",
        },
        askAnswerRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
        },
        askAnswerKey: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.foregroundSubtle,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        },
        askAnswerValue: {
          flex: 1,
          fontFamily: tokens.fontUi,
          fontSize: 12.5,
          fontWeight: "600",
          color: tokens.success,
        },
        askOptionCard: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 10,
          borderRadius: radius.block,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          backgroundColor: tokens.surface1,
          ...tokens.boxShadow,
        },
        askOptionCardSelected: {
          borderColor: tokens.accent,
          backgroundColor: tokens.accentBg,
        },
        askOptionLeft: {
          flexDirection: "column",
          gap: 2,
          flex: 1,
        },
        askOptionLabelRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        askOptionLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 13,
          fontWeight: "600",
          color: tokens.foreground,
        },
        recommendedBadge: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "600",
          color: tokens.success,
          backgroundColor: tokens.successBg,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
        },
        askOptionDesc: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.foregroundMuted,
        },
        // Thinking container
        thinkingContainer: {
          padding: 10,
          borderRadius: radius.block,
          backgroundColor: tokens.surfaceCode,
          borderLeftWidth: 2,
          borderLeftColor: tokens.accent,
          gap: 6,
          ...tokens.boxShadow,
        },
        thinkingHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        thinkingTitle: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.foreground,
        },
        thinkingTokenBadge: {
          fontSize: 10,
          fontFamily: tokens.fontUi,
          color: tokens.foregroundSubtle,
          backgroundColor: tokens.surface2,
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderRadius: radius.chip,
        },
        thinkingText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 18,
          color: tokens.foregroundMuted,
        },
        thinkingStepsList: {
          marginTop: 4,
          gap: 4,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
        },
        thinkingStepRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 6,
        },
        thinkingStepText: {
          fontFamily: tokens.fontUi,
          flex: 1,
          fontSize: 12,
          lineHeight: 16,
          color: tokens.foregroundMuted,
        },
        // MCP container
        mcpContainer: {
          padding: 12,
          borderRadius: radius.block,
          backgroundColor: tokens.surface1,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          gap: 8,
          ...tokens.boxShadow,
        },
        mcpHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        mcpServerBadge: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          fontWeight: "700",
          color: tokens.accent,
          backgroundColor: tokens.accentBg,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
        },
        mcpToolName: {
          fontSize: 13,
          fontWeight: "700",
          color: tokens.foreground,
          fontFamily: tokens.fontUi,
        },
        mcpTransportBadge: {
          fontSize: 10,
          fontFamily: tokens.fontUi,
          color: tokens.foregroundSubtle,
          backgroundColor: tokens.surface2,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
        },
        mcpSectionTitle: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: tokens.foregroundSubtle,
        },
        mcpErrorBox: {
          padding: 8,
          borderRadius: radius.block,
          backgroundColor: tokens.dangerBg,
          borderWidth: 1,
          borderColor: tokens.dangerBorder,
          ...tokens.boxShadow,
        },
        mcpErrorText: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.danger,
        },
      }),
    [tokens, statusBg, statusColor],
  );

  return (
    <View
      {...surfaceProps(frosted, glowing(tokens.isDark), selectionSurface)}
      style={styles.container}
    >
      <Pressable onPress={() => setExpanded((p) => !p)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Breathe depth={1.08} durationMs={1800}>
            <Glyph name={getToolIconName(data.tool)} size={13} color={iconColor} />
          </Breathe>
          <Text selectable style={styles.toolPill}>
            {data.toolLabel ?? data.tool}
          </Text>
          {data.filePath ? (
            <Breathe depth={1.08} durationMs={1800}>
              {isImagePath(data.filePath) ? (
                // An image has no language logo to show, and the generic page
                // mark says less than the picture mark does.
                <Glyph name="Image" size={13} color={tokens.foreground} />
              ) : (
                <FileTypeLogo filename={data.filePath} language={data.language} size="sm" />
              )}
            </Breathe>
          ) : null}
          <Text selectable style={styles.titleText} numberOfLines={1}>
            {data.title}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {data.durationMs ? (
            <Text selectable style={styles.durationBadge}>
              {data.durationMs}ms
            </Text>
          ) : null}

          {data.exitCode !== undefined && data.exitCode !== 0 && (
            <Text selectable style={[styles.durationBadge, { color: tokens.danger }]}>
              exit {data.exitCode}
            </Text>
          )}

          {isFailed && (
            <Text selectable style={{ fontSize: 11, fontWeight: "600", color: tokens.danger }}>
              failed
            </Text>
          )}

          {isRunning && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <PulseDot color={tokens.accent} size={5} />
              <Text
                selectable
                style={{
                  fontSize: 11,
                  color: tokens.accent,
                  fontWeight: "500",
                }}
              >
                running
              </Text>
            </View>
          )}

          <Rotate active={expanded}>
            <Breathe depth={1.08} durationMs={1800}>
              <Glyph name="ChevronDown" size={16} color={tokens.foregroundMuted} />
            </Breathe>
          </Rotate>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {(data.tool === "bash" || data.tool === "shell" || data.tool === "git") && (
            <View style={styles.terminalWindow}>
              {(data.shell?.command || data.command) && (
                <SyntaxHighlightBlock
                  code={`$ ${data.shell?.command || data.command}`}
                  language="bash"
                  tokens={tokens}
                  compact
                />
              )}

              {data.shell?.stdout && (
                <Text selectable {...selectionCodeText} style={styles.terminalOutput}>
                  {renderTerminalOutput(data.shell.stdout, tokens)}
                </Text>
              )}
              {data.shell?.stderr && (
                <Text selectable style={[styles.terminalOutput, { color: tokens.danger }]}>
                  {data.shell.stderr}
                </Text>
              )}
              {data.output && !data.shell?.stdout && (
                <Text selectable {...selectionCodeText} style={styles.terminalOutput}>
                  {renderTerminalOutput(data.output, tokens)}
                </Text>
              )}
              {!data.shell?.stdout && !data.shell?.stderr && !data.output && (
                <Text selectable style={styles.silentCommandText}>
                  {isRunning
                    ? "Waiting for command output…"
                    : isShellCall
                      ? "Command completed without output."
                      : "The call returned no output."}
                </Text>
              )}
            </View>
          )}

          {data.tool === "github" && (
            <GitHubBody data={data.github} tokens={tokens} running={isRunning} />
          )}

          {data.tool === "thinking" && (
            <View style={styles.thinkingContainer}>
              <View style={styles.thinkingHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Glyph name="Brain" size={13} color={tokens.accent} />
                  <Text selectable style={styles.thinkingTitle}>
                    {data.thinking?.status === "thinking"
                      ? "Live Reasoning Stream…"
                      : "Reasoning Completed"}
                  </Text>
                </View>
                {data.thinking?.tokenCount ? (
                  <Text selectable style={styles.thinkingTokenBadge}>
                    {data.thinking.tokenCount} tokens
                  </Text>
                ) : null}
              </View>

              <Text selectable style={styles.thinkingText}>
                {data.thinking?.text ||
                  data.code ||
                  data.output ||
                  "Analyzing constraints and formulating steps..."}
              </Text>
              {data.thinking?.steps && data.thinking.steps.length > 0 && (
                <View style={styles.thinkingStepsList}>
                  {data.thinking.steps.map((step, idx) => (
                    <View key={idx} style={styles.thinkingStepRow}>
                      <Text
                        selectable
                        style={{
                          fontSize: 11,
                          color: tokens.foregroundSubtle,
                          fontFamily: tokens.fontMono,
                        }}
                      >
                        {idx + 1}.
                      </Text>
                      <Text
                        selectable
                        style={[styles.thinkingStepText, { color: tokens.foreground }]}
                      >
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {data.tool === "mcp" && data.mcp && (
            <View style={styles.mcpContainer}>
              <View style={styles.mcpHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text selectable style={styles.mcpServerBadge}>
                    {data.mcp.server}
                  </Text>
                  <Text selectable style={styles.mcpToolName}>
                    {data.mcp.tool}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {data.mcp.transport && (
                    <Text selectable style={styles.mcpTransportBadge}>
                      {data.mcp.transport}
                    </Text>
                  )}
                  {data.durationMs ? (
                    <Text selectable style={styles.durationBadge}>
                      {data.durationMs}ms
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Text selectable style={styles.mcpSectionTitle}>
                  Input Parameters
                </Text>
                <SyntaxHighlightBlock
                  code={JSON.stringify(data.mcp.arguments, null, 2)}
                  language="json"
                  tokens={tokens}
                  compact
                />
              </View>

              {data.mcp.result !== undefined && (
                <View style={{ gap: 4, marginTop: 4 }}>
                  <Text selectable style={styles.mcpSectionTitle}>
                    Response Payload
                  </Text>
                  <SyntaxHighlightBlock
                    code={
                      typeof data.mcp.result === "string"
                        ? data.mcp.result
                        : JSON.stringify(data.mcp.result, null, 2)
                    }
                    language={typeof data.mcp.result === "string" ? "typescript" : "json"}
                    tokens={tokens}
                    compact
                  />
                </View>
              )}

              {data.mcp.error && (
                <View style={styles.mcpErrorBox}>
                  <Text selectable style={styles.mcpErrorText}>
                    Error: {data.mcp.error}
                  </Text>
                </View>
              )}
            </View>
          )}

          {(data.tool === "read" || data.tool === "write") &&
            (imageFile !== undefined && isImagePath(data.filePath) ? (
              <ImagePreview
                path={data.filePath ?? ""}
                file={imageFile}
                tokens={tokens}
                onReveal={revealFile}
              />
            ) : (
              <SyntaxHighlightBlock
                code={data.code || "// [Empty content or pending stream]"}
                language={data.language ?? "text"}
                filename={data.filePath ? `${data.filePath} ${data.lineRange || ""}` : undefined}
                tokens={tokens}
                showLineNumbers={Boolean(data.code)}
                onRevealFile={revealFile}
                compact
              />
            ))}

          {data.tool === "edit" && (
            <SyntaxHighlightBlock
              code={data.diff || data.code || "// [Edit: diff applied]"}
              language="diff"
              filename={data.filePath}
              tokens={tokens}
              showLineNumbers
              onRevealFile={revealFile}
              compact
            />
          )}

          {data.tool === "eval" && (
            <View style={{ gap: 10 }}>
              {(
                data.cells ?? [
                  {
                    code: data.code || "",
                    language: data.language || "typescript",
                    output: data.output,
                  },
                ]
              ).map((cell, idx) => (
                <View key={idx} style={{ gap: 4 }}>
                  {cell.code ? (
                    <SyntaxHighlightBlock
                      code={cell.code}
                      language={cell.language}
                      filename={cell.title || "Persistent Kernel Cell"}
                      tokens={tokens}
                      showLineNumbers
                      compact
                    />
                  ) : null}
                  {cell.output ? (
                    <View style={styles.evalOutput}>
                      <Text selectable style={styles.evalOutputLabel}>
                        stdout
                      </Text>
                      <Text selectable {...selectionCodeText} style={styles.evalOutputText}>
                        {renderTerminalOutput(cell.output, tokens)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {data.tool === "ask" && (data.askOptions || data.askAnswer) && (
            <View style={styles.askContainer}>
              {data.askOptions ? (
                <Text selectable style={styles.askPrompt}>
                  {answered.length > 0 ? "Options offered:" : "Waiting for a decision:"}
                </Text>
              ) : null}
              {(data.askOptions ?? []).map((opt) => {
                // The answer is whatever the tool reported, so a label match
                // marks the chosen row. A typed reply matches nothing and is
                // shown on its own line below.
                const isChosen = (data.askAnswer ?? []).some(
                  (answer) => answer.trim().toLowerCase() === opt.label.trim().toLowerCase(),
                );
                return (
                  <View
                    key={opt.id}
                    style={[styles.askOptionCard, isChosen && styles.askOptionCardSelected]}
                  >
                    <View style={styles.askOptionLeft}>
                      <View style={styles.askOptionLabelRow}>
                        <Text
                          selectable
                          style={[styles.askOptionLabel, isChosen && styles.askOptionLabelChosen]}
                        >
                          {opt.label}
                        </Text>
                        {opt.recommended ? (
                          <Text selectable style={styles.recommendedBadge}>
                            Recommended
                          </Text>
                        ) : null}
                      </View>
                      {opt.description ? (
                        <Text selectable style={styles.askOptionDesc}>
                          {opt.description}
                        </Text>
                      ) : null}
                    </View>
                    {isChosen ? (
                      <Glyph name="CheckCircle" size={16} color={tokens.success} />
                    ) : (
                      <Glyph name="Circle" size={14} color={tokens.foregroundSubtle} />
                    )}
                  </View>
                );
              })}
              {answered.length > 0 ? (
                <View style={styles.askAnswerRow}>
                  <Text selectable style={styles.askAnswerKey}>
                    {typedReply ? "typed" : "answered"}
                  </Text>
                  <Text selectable style={styles.askAnswerValue}>
                    {answered.join(", ")}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {data.tool === "task" && data.subagent && (
            <SubagentBatch batch={data.subagent} running={isRunning} tokens={tokens} />
          )}
          {data.tool === "hub" && data.hub && <HubCallout data={data.hub} tokens={tokens} />}
          {data.tool === "paseo" && data.paseo && (
            <PaseoToolCallout data={data.paseo} tokens={tokens} />
          )}

          {!hasTypedBody && (
            <View style={styles.terminalWindow}>
              {data.output ? (
                <Text selectable {...selectionCodeText} style={styles.terminalOutput}>
                  {renderTerminalOutput(data.output, tokens)}
                </Text>
              ) : (
                <Text selectable style={styles.silentCommandText}>
                  {isRunning ? "Waiting for output…" : "The call returned no output."}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * A brief's status belongs to the spawned agent, not to the spawn call, so it
 * reads on the same three colours the card header uses and stays muted for
 * anything else the hub may report later.
 */
function subagentTone(status: string, tokens: ExtendedThemeTokens): { fg: string; bg: string } {
  if (status === "running") return { fg: tokens.accent, bg: tokens.accentBg };
  if (status === "completed") return { fg: tokens.success, bg: tokens.successBg };
  if (status === "failed") return { fg: tokens.danger, bg: tokens.dangerBg };
  return { fg: tokens.foregroundMuted, bg: tokens.surface2 };
}

/** The agent type always shows; the status only once the batch reports one. */
function SubagentChips({
  agent,
  tokens,
  styles,
}: {
  agent: { agentType: string; status?: string };
  tokens: ExtendedThemeTokens;
  styles: SubagentStyles;
}) {
  const status = agent.status;
  const tone = status ? subagentTone(status, tokens) : undefined;

  return (
    <>
      <Text selectable style={[styles.chip, styles.typeChip]}>
        {agent.agentType}
      </Text>
      {status && tone ? (
        <Text selectable style={[styles.chip, { color: tone.fg, backgroundColor: tone.bg }]}>
          {status}
        </Text>
      ) : null}
    </>
  );
}

/**
 * One `task` call spawns a batch, so the card reads as a roster: one row per
 * brief, every brief clamped to two lines, and the shared preamble folded away
 * until it is asked for. A brief runs to hundreds of words, and six of them
 * printed whole would bury the rest of the transcript.
 */
function SubagentBatch({
  batch,
  running,
  tokens,
}: {
  batch: NonNullable<ToolCalloutData["subagent"]>;
  running: boolean;
  tokens: ExtendedThemeTokens;
}) {
  const [contextOpen, setContextOpen] = useState(false);
  const styles = useSubagentStyles(tokens);

  const agents = batch.agents;
  const count = agents.length;
  // A batch of one is a single delegation rather than a list, so its name
  // leads the header and the row below carries the brief on its own.
  const only = count === 1 ? agents[0] : undefined;
  const headline = only ? only.name : count === 0 ? "subagents" : `${count} subagents`;
  const pending =
    count === 0
      ? "spawning subagents…"
      : count === 1
        ? "spawning 1 subagent…"
        : `spawning ${count} subagents…`;

  return (
    <View style={styles.batch}>
      <View style={styles.head}>
        <Glyph name="Bot" size={13} color={tokens.accent} />
        <Text selectable style={styles.headline} numberOfLines={1}>
          {headline}
        </Text>
        {only ? <SubagentChips agent={only} tokens={tokens} styles={styles} /> : null}
      </View>

      {batch.context ? (
        <View style={styles.contextBox}>
          <Pressable
            onPress={() => setContextOpen((previous) => !previous)}
            accessibilityRole="button"
            style={styles.contextToggle}
          >
            <Rotate active={contextOpen}>
              <Glyph name="ChevronDown" size={12} color={tokens.foregroundMuted} />
            </Rotate>
            <Text style={styles.contextLabel}>shared context</Text>
          </Pressable>
          <Text selectable style={styles.contextBody} numberOfLines={contextOpen ? undefined : 2}>
            {batch.context}
          </Text>
        </View>
      ) : null}

      {agents.map((agent, index) => (
        <View key={`${agent.name}-${index}`} style={styles.row}>
          {only ? null : (
            <View style={styles.rowHead}>
              <Text selectable style={styles.name} numberOfLines={1}>
                {agent.name}
              </Text>
              <SubagentChips agent={agent} tokens={tokens} styles={styles} />
            </View>
          )}
          <Text selectable style={styles.brief} numberOfLines={2}>
            {agent.task}
          </Text>
        </View>
      ))}

      {running ? (
        <View style={styles.pending}>
          <PulseDot color={tokens.accent} size={5} />
          <Text style={styles.pendingText}>{pending}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------- styles */

interface SubagentStyles {
  batch: ViewStyle;
  head: ViewStyle;
  contextBox: ViewStyle;
  contextToggle: ViewStyle;
  row: ViewStyle;
  rowHead: ViewStyle;
  pending: ViewStyle;
  headline: TextStyle;
  chip: TextStyle;
  typeChip: TextStyle;
  contextLabel: TextStyle;
  contextBody: TextStyle;
  name: TextStyle;
  brief: TextStyle;
  pendingText: TextStyle;
}

function useSubagentStyles(tokens: ExtendedThemeTokens): SubagentStyles {
  return useMemo(
    () =>
      StyleSheet.create({
        batch: {
          padding: 10,
          borderRadius: radius.block,
          backgroundColor: tokens.surface1,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          gap: 8,
          ...tokens.boxShadow,
        },
        head: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        headline: {
          fontFamily: tokens.fontUi,
          fontSize: 13,
          fontWeight: "700",
          color: tokens.foreground,
          flexShrink: 1,
        },
        chip: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "lowercase",
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
        },
        typeChip: {
          color: tokens.foregroundSubtle,
          backgroundColor: tokens.surface2,
        },
        contextBox: {
          gap: 4,
          padding: 8,
          borderRadius: radius.block,
          backgroundColor: tokens.surface0,
        },
        contextToggle: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        contextLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.4,
          textTransform: "lowercase",
          color: tokens.foregroundSubtle,
          ...unselectable,
        },
        contextBody: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 17,
          color: tokens.foregroundSubtle,
        },
        row: {
          gap: 3,
        },
        rowHead: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        name: {
          fontFamily: tokens.fontUi,
          fontSize: 12.5,
          fontWeight: "600",
          color: tokens.foreground,
          flexShrink: 1,
        },
        brief: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 16,
          color: tokens.foregroundMuted,
        },
        pending: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        pendingText: {
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
