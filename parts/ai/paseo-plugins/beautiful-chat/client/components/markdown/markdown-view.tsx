import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import { Glyph } from "../glyph";
import { radius, withAlpha, type ExtendedThemeTokens } from "../theme-tokens";
import { selectableSurface, unselectable } from "../selection";
import { selectionSurface } from "../selection-actions";
import { SyntaxHighlightBlock } from "../syntax-highlight";
import { openLink } from "../open-link";
import { parseMarkdown, type MdAlign, type MdBlock, type MdInline, type MdListItem } from "./parse";

/**
 * The assistant's own prose, drawn by the plugin instead of the host. Three
 * variants exist because one rhythm cannot serve both a one-line answer and a
 * ten-section report; the user picks the one that matches their thread.
 */
export type MarkdownVariant = "document" | "compact" | "terminal";

export const MARKDOWN_VARIANTS: readonly MarkdownVariant[] = ["document", "compact", "terminal"];

export interface MarkdownViewProps {
  text: string;
  tokens: ExtendedThemeTokens;
  variant: MarkdownVariant;
}

type MdTableBlock = Extract<MdBlock, { kind: "table" }>;

interface VariantMetrics {
  bodySize: number;
  bodyLineHeight: number;
  /** Body text on the mono family, which also drives table column estimates. */
  mono: boolean;
  blockGap: number;
  headingSizes: readonly [number, number, number, number];
  headingGap: number;
  /** Draws a rule under h1 and h2. */
  headingRule: boolean;
  /** Prefixes headings with their own `#` run instead of relying on size. */
  headingHash: boolean;
  markerWidth: number;
  itemGap: number;
  indentStep: number;
  tableGap: number;
  columnMin: number;
  columnMax: number;
  glyphSize: number;
  codeCompact: boolean;
  codeLineNumbers: boolean;
}

const VARIANT_METRICS: Record<MarkdownVariant, VariantMetrics> = {
  // document: for a long answer read top to bottom. Wide leading and big ruled
  // headings buy scanability with vertical space, so a section can be found
  // without reading it.
  document: {
    bodySize: 13.5,
    bodyLineHeight: 22.5,
    mono: false,
    blockGap: 13,
    headingSizes: [23, 18.5, 15.5, 13],
    headingGap: 9,
    headingRule: true,
    headingHash: false,
    markerWidth: 20,
    itemGap: 6,
    indentStep: 18,
    tableGap: 18,
    columnMin: 60,
    columnMax: 320,
    glyphSize: 13,
    codeCompact: false,
    codeLineNumbers: false,
  },
  // compact: for a short reply in a crowded thread. Spacing is tight and
  // headings stay near body size, so a three-line answer reads as one bubble
  // rather than a document.
  compact: {
    bodySize: 13,
    bodyLineHeight: 19,
    mono: false,
    blockGap: 7,
    headingSizes: [16.5, 14.5, 13.5, 12],
    headingGap: 4,
    headingRule: false,
    headingHash: false,
    markerWidth: 15,
    itemGap: 2,
    indentStep: 13,
    tableGap: 12,
    columnMin: 48,
    columnMax: 240,
    glyphSize: 11,
    codeCompact: true,
    codeLineNumbers: false,
  },
  // terminal: for an answer that is mostly code. Body text joins the code on
  // the mono family at a tight line height, headings keep their literal `##`
  // marker, and fences carry line numbers so prose and code read as one log.
  terminal: {
    bodySize: 12.5,
    bodyLineHeight: 17.5,
    mono: true,
    blockGap: 9,
    headingSizes: [14.5, 13.5, 12.5, 12],
    headingGap: 7,
    headingRule: false,
    headingHash: true,
    markerWidth: 18,
    itemGap: 1,
    indentStep: 16,
    tableGap: 14,
    columnMin: 52,
    columnMax: 280,
    glyphSize: 11,
    codeCompact: false,
    codeLineNumbers: true,
  },
};

// One marker per level, so a nested item is distinguishable from its parent
// even when the indent is clipped by a narrow card.
const BULLETS = ["\u2022", "\u25e6", "\u2023"] as const;
const HASH_LABELS = ["# ", "## ", "### ", "#### "] as const;
const HEADING_KEYS = ["h1", "h2", "h3", "h4"] as const;
const INDENT_KEYS = ["indent0", "indent1", "indent2", "indent3"] as const;
const ALIGN_KEYS: Record<MdAlign, "cellLeft" | "cellCenter" | "cellRight"> = {
  left: "cellLeft",
  center: "cellCenter",
  right: "cellRight",
};

// React Native offers no synchronous text measurement, so a column's width is
// estimated from its longest cell. These ratios are the average advance width
// of Inter and Iosevka as a fraction of the font size.
const CHAR_RATIO_UI = 0.55;
const CHAR_RATIO_MONO = 0.62;

// A marker sits in a fixed column, so its width has to carry the gutter the
// style adds; an estimate that forgets it wraps `2.` onto a second line.
const MARKER_GAP = 6;
// The inline-code chip's own horizontal padding, counted twice per chip when a
// table column is measured, and matched by the cell's padding so a chip never
// sits against the column edge.
const CODE_CHIP_PADDING = 4;
const TABLE_CELL_PADDING = 6;

/** Every style the renderer draws with, so callers never infer it from the builder. */
interface MarkdownStyles {
  root: ViewStyle;
  headingBlock: ViewStyle;
  headingBlockFirst: ViewStyle;
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  headingHash: TextStyle;
  headingRule: ViewStyle;
  paragraph: TextStyle;
  plain: TextStyle;
  listBlock: ViewStyle;
  listRow: ViewStyle;
  indent0: ViewStyle;
  indent1: ViewStyle;
  indent2: ViewStyle;
  indent3: ViewStyle;
  markerBullet: TextStyle;
  markerOrdered: TextStyle;
  checkboxCell: ViewStyle;
  itemText: TextStyle;
  itemTextDone: TextStyle;
  quote: ViewStyle;
  quoteText: TextStyle;
  codeBlock: ViewStyle;
  rule: ViewStyle;
  tableScroll: ViewStyle;
  tableContent: ViewStyle;
  tableHeaderRow: ViewStyle;
  tableRow: ViewStyle;
  tableHeaderCell: TextStyle;
  tableCell: TextStyle;
  cellLeft: TextStyle;
  cellCenter: TextStyle;
  cellRight: TextStyle;
  strong: TextStyle;
  emphasis: TextStyle;
  strike: TextStyle;
  codeSpan: TextStyle;
  link: TextStyle;
}

interface RenderContext {
  styles: MarkdownStyles;
  tokens: ExtendedThemeTokens;
  metrics: VariantMetrics;
}

export function MarkdownView({ text, tokens, variant }: MarkdownViewProps) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  const styles = useMemo(() => buildStyles(tokens, variant), [tokens, variant]);
  const context = useMemo<RenderContext>(
    () => ({ styles, tokens, metrics: VARIANT_METRICS[variant] }),
    [styles, tokens, variant],
  );

  return (
    <View {...selectionSurface} style={styles.root}>
      {blocks.map((block, index) => renderBlock(block, `b${index}`, index === 0, context))}
    </View>
  );
}

function renderBlock(
  block: MdBlock,
  key: string,
  first: boolean,
  context: RenderContext,
): React.ReactNode {
  const { styles, tokens, metrics } = context;

  switch (block.kind) {
    case "heading": {
      const headingStyle = styles[HEADING_KEYS[block.level - 1] ?? "h4"];
      return (
        <View key={key} style={first ? styles.headingBlockFirst : styles.headingBlock}>
          <Text selectable style={headingStyle}>
            {metrics.headingHash ? (
              <Text style={styles.headingHash}>{HASH_LABELS[block.level - 1] ?? "# "}</Text>
            ) : null}
            {renderInline(block.spans, styles, key)}
          </Text>
          {metrics.headingRule && block.level <= 2 ? <View style={styles.headingRule} /> : null}
        </View>
      );
    }

    case "paragraph":
      return (
        <Text key={key} selectable style={styles.paragraph}>
          {renderInline(block.spans, styles, key)}
        </Text>
      );

    case "list": {
      const numberWidth = orderedColumnWidth(block.items, metrics);
      return (
        <View key={key} style={styles.listBlock}>
          {block.items.map((item, index) =>
            renderItem(item, `${key}l${index}`, numberWidth, context),
          )}
        </View>
      );
    }

    case "quote":
      return (
        <View key={key} style={styles.quote}>
          {block.paragraphs.map((spans, index) => (
            <Text key={`${key}q${index}`} selectable style={styles.quoteText}>
              {renderInline(spans, styles, `${key}q${index}`)}
            </Text>
          ))}
        </View>
      );

    case "code":
      return (
        <View key={key} style={styles.codeBlock}>
          <SyntaxHighlightBlock
            code={block.code}
            // An empty info string is the author asking for no grammar, which
            // the daemon answers as plain text instead of guessing a language.
            language={block.language === "" ? "plaintext" : block.language}
            tokens={tokens}
            compact={metrics.codeCompact}
            showLineNumbers={metrics.codeLineNumbers}
          />
        </View>
      );

    case "rule":
      return <View key={key} style={styles.rule} />;

    case "table":
      return renderTable(block, key, context);

    case "plain":
      return (
        <Text key={key} selectable style={styles.plain}>
          {block.text}
        </Text>
      );
  }
}

function renderItem(
  item: MdListItem,
  key: string,
  numberWidth: number,
  context: RenderContext,
): React.ReactNode {
  const { styles, tokens, metrics } = context;
  const depth = item.depth > 3 ? 3 : item.depth;
  const indentStyle = styles[INDENT_KEYS[depth] ?? "indent0"];
  // The body is the flexible column, so a wrapped second line starts under the
  // item's first character instead of under its marker.
  const body = (
    <Text selectable style={item.checked === true ? styles.itemTextDone : styles.itemText}>
      {renderInline(item.spans, styles, key)}
    </Text>
  );

  if (item.checked !== undefined) {
    return (
      <View key={key} style={[styles.listRow, indentStyle]}>
        <View style={styles.checkboxCell}>
          <Glyph
            name={item.checked ? "CheckCircle" : "Circle"}
            size={metrics.glyphSize}
            color={item.checked ? tokens.success : tokens.foregroundSubtle}
          />
        </View>
        {body}
      </View>
    );
  }

  if (item.ordered) {
    return (
      <View key={key} style={[styles.listRow, indentStyle]}>
        <Text
          numberOfLines={1}
          style={[styles.markerOrdered, { width: numberWidth }]}
        >{`${item.index}.`}</Text>
        {body}
      </View>
    );
  }

  return (
    <View key={key} style={[styles.listRow, indentStyle]}>
      <Text numberOfLines={1} style={styles.markerBullet}>
        {BULLETS[depth % BULLETS.length] ?? BULLETS[0]}
      </Text>
      {body}
    </View>
  );
}

/**
 * A table keeps its own columns and scrolls sideways when the widest row beats
 * the card: clipping would hide the cell that carries the answer.
 */
function renderTable(block: MdTableBlock, key: string, context: RenderContext): React.ReactNode {
  const { styles, metrics } = context;
  const widths = columnWidths(block, metrics);

  return (
    <ScrollView
      key={key}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tableScroll}
      contentContainerStyle={styles.tableContent}
    >
      <View>
        <View style={styles.tableHeaderRow}>
          {block.header.map((cell, column) => {
            const cellKey = `${key}h${column}`;
            return (
              <Text
                key={cellKey}
                selectable
                style={[
                  styles.tableHeaderCell,
                  styles[ALIGN_KEYS[block.align[column] ?? "left"]],
                  { width: widths[column] ?? metrics.columnMin },
                ]}
              >
                {renderInline(cell, styles, cellKey)}
              </Text>
            );
          })}
        </View>
        {block.rows.map((row, rowIndex) => (
          <View key={`${key}r${rowIndex}`} style={styles.tableRow}>
            {row.map((cell, column) => {
              const cellKey = `${key}r${rowIndex}c${column}`;
              return (
                <Text
                  key={cellKey}
                  selectable
                  style={[
                    styles.tableCell,
                    styles[ALIGN_KEYS[block.align[column] ?? "left"]],
                    { width: widths[column] ?? metrics.columnMin },
                  ]}
                >
                  {renderInline(cell, styles, cellKey)}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function renderInline(
  spans: MdInline[],
  styles: MarkdownStyles,
  keyPrefix: string,
): React.ReactNode[] {
  return spans.map((span, index) => {
    const key = `${keyPrefix}i${index}`;
    switch (span.kind) {
      case "text":
        return span.text;
      case "codeSpan":
        return (
          <Text key={key} selectable style={styles.codeSpan}>
            {span.text}
          </Text>
        );
      case "strong":
        return (
          <Text key={key} selectable style={styles.strong}>
            {renderInline(span.spans, styles, key)}
          </Text>
        );
      case "emphasis":
        return (
          <Text key={key} selectable style={styles.emphasis}>
            {renderInline(span.spans, styles, key)}
          </Text>
        );
      case "strike":
        return (
          <Text key={key} selectable style={styles.strike}>
            {renderInline(span.spans, styles, key)}
          </Text>
        );
      case "link":
        // `onPress` on a Text, not a Pressable wrapper: a link sits mid
        // sentence, and a View there would break the line box and drop the
        // text out of the paragraph's selection range.
        return (
          <Text
            key={key}
            selectable
            accessibilityRole="link"
            // No `href`: React Native Web would render a real anchor and the
            // click would navigate the app window itself. The press handler
            // routes through the host's opener instead.
            onPress={() => openLink(span.href)}
            style={styles.link}
          >
            {renderInline(span.spans, styles, key)}
          </Text>
        );
    }
  });
}

/**
 * Numbers share one right edge, so `9.` and `10.` line up. The column holds the
 * whole marker — digits, dot and gutter — because a column sized to the digits
 * alone wraps the dot under the number and splits the item across two rows.
 */
function orderedColumnWidth(items: MdListItem[], metrics: VariantMetrics): number {
  let longest = 2;
  for (const item of items) {
    if (!item.ordered) continue;
    const length = `${item.index}.`.length;
    if (length > longest) longest = length;
  }
  const ratio = metrics.mono ? CHAR_RATIO_MONO : CHAR_RATIO_UI;
  // The ratio is an average advance, so a marker of wide digits needs the spare
  // point on top of it.
  const marker = Math.ceil(longest * metrics.bodySize * ratio) + 2;
  return Math.max(metrics.markerWidth, marker + MARKER_GAP);
}

/**
 * A chip is wider than the text it holds: the code face is wider than the UI
 * face and the chip carries padding of its own. Walking the runs keeps a cell
 * of inline code from being measured as though it were prose.
 */
function inlineWidth(spans: MdInline[], size: number, ratio: number): number {
  let width = 0;
  for (const span of spans) {
    switch (span.kind) {
      case "text":
        width += span.text.length * size * ratio;
        break;
      case "codeSpan":
        width += span.text.length * size * CHAR_RATIO_MONO + CODE_CHIP_PADDING * 2;
        break;
      default:
        width += inlineWidth(span.spans, size, ratio);
        break;
    }
  }
  return width;
}

function columnWidths(block: MdTableBlock, metrics: VariantMetrics): number[] {
  const ratio = metrics.mono ? CHAR_RATIO_MONO : CHAR_RATIO_UI;
  const cellSize = metrics.bodySize - 1;
  const widths: number[] = [];

  for (let column = 0; column < block.header.length; column++) {
    // The header is bold, which the average advance does not cover, so it is
    // measured a shade wider than a body cell of the same length.
    let longest = inlineWidth(block.header[column] ?? [], cellSize, ratio) * 1.06;
    for (const row of block.rows) {
      const cell = row[column];
      if (cell === undefined) continue;
      const width = inlineWidth(cell, cellSize, ratio);
      if (width > longest) longest = width;
    }
    const estimate = Math.ceil(longest) + TABLE_CELL_PADDING * 2 + 2;
    widths.push(Math.min(metrics.columnMax, Math.max(metrics.columnMin, estimate)));
  }

  return widths;
}

function buildStyles(tokens: ExtendedThemeTokens, variant: MarkdownVariant): MarkdownStyles {
  const metrics = VARIANT_METRICS[variant];
  const bodyFont = metrics.mono ? tokens.fontMono : tokens.fontUi;
  const [size1, size2, size3, size4] = metrics.headingSizes;
  // The terminal variant's headings sit within a point of body size, so the
  // accent on h1 and the hash run carry the hierarchy that size cannot.
  const topColor = variant === "terminal" ? tokens.accent : tokens.foreground;

  return StyleSheet.create({
    root: {
      ...selectableSurface,
      width: "100%",
      gap: metrics.blockGap,
    },
    headingBlock: {
      marginTop: metrics.headingGap,
      gap: 4,
    },
    headingBlockFirst: {
      gap: 4,
    },
    h1: {
      fontFamily: bodyFont,
      fontSize: size1,
      lineHeight: size1 * 1.28,
      fontWeight: "700",
      letterSpacing: -0.3,
      color: topColor,
    },
    h2: {
      fontFamily: bodyFont,
      fontSize: size2,
      lineHeight: size2 * 1.3,
      fontWeight: "700",
      letterSpacing: -0.15,
      color: tokens.foreground,
    },
    h3: {
      fontFamily: bodyFont,
      fontSize: size3,
      lineHeight: size3 * 1.35,
      fontWeight: "600",
      color: tokens.foreground,
    },
    h4: {
      fontFamily: bodyFont,
      fontSize: size4,
      lineHeight: size4 * 1.4,
      fontWeight: "600",
      letterSpacing: 0.7,
      textTransform: "uppercase",
      color: tokens.foregroundMuted,
    },
    headingHash: {
      color: tokens.accent,
      fontWeight: "400",
      ...unselectable,
    },
    headingRule: {
      height: 1,
      backgroundColor: tokens.borderSubtle,
    },
    paragraph: {
      fontFamily: bodyFont,
      fontSize: metrics.bodySize,
      lineHeight: metrics.bodyLineHeight,
      color: tokens.foreground,
    },
    plain: {
      fontFamily: tokens.fontMono,
      fontSize: metrics.bodySize - 0.5,
      lineHeight: metrics.bodyLineHeight,
      color: tokens.foregroundMuted,
    },
    listBlock: {
      gap: metrics.itemGap,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    indent0: { marginLeft: 0 },
    indent1: { marginLeft: metrics.indentStep },
    indent2: { marginLeft: metrics.indentStep * 2 },
    indent3: { marginLeft: metrics.indentStep * 3 },
    markerBullet: {
      width: metrics.markerWidth,
      flexShrink: 0,
      fontFamily: bodyFont,
      fontSize: metrics.bodySize,
      lineHeight: metrics.bodyLineHeight,
      color: tokens.foregroundMuted,
      ...unselectable,
    },
    markerOrdered: {
      flexShrink: 0,
      fontFamily: bodyFont,
      fontSize: metrics.bodySize,
      lineHeight: metrics.bodyLineHeight,
      textAlign: "right",
      paddingRight: MARKER_GAP,
      color: tokens.foregroundMuted,
      fontVariant: ["tabular-nums"],
      ...unselectable,
    },
    checkboxCell: {
      width: metrics.markerWidth,
      flexShrink: 0,
      // Centres the box on the first line of the item, not on the whole item.
      paddingTop: Math.max(0, (metrics.bodyLineHeight - metrics.glyphSize) / 2),
      ...unselectable,
    },
    itemText: {
      flex: 1,
      fontFamily: bodyFont,
      fontSize: metrics.bodySize,
      lineHeight: metrics.bodyLineHeight,
      color: tokens.foreground,
    },
    itemTextDone: {
      flex: 1,
      fontFamily: bodyFont,
      fontSize: metrics.bodySize,
      lineHeight: metrics.bodyLineHeight,
      color: tokens.foregroundMuted,
      textDecorationLine: "line-through",
    },
    quote: {
      borderLeftWidth: 2,
      borderLeftColor: withAlpha(tokens.foregroundMuted, 0.5),
      paddingLeft: 10,
      gap: 5,
    },
    quoteText: {
      fontFamily: bodyFont,
      fontSize: metrics.bodySize,
      lineHeight: metrics.bodyLineHeight,
      fontStyle: "italic",
      color: tokens.foregroundMuted,
    },
    codeBlock: {
      marginVertical: 1,
    },
    rule: {
      height: 1,
      backgroundColor: tokens.border,
      marginVertical: 2,
    },
    tableScroll: {
      alignSelf: "stretch",
    },
    tableContent: {
      paddingRight: 6,
    },
    tableHeaderRow: {
      flexDirection: "row",
      gap: metrics.tableGap,
      paddingBottom: 5,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    },
    tableRow: {
      flexDirection: "row",
      gap: metrics.tableGap,
      paddingVertical: 2,
    },
    tableHeaderCell: {
      fontFamily: bodyFont,
      fontSize: metrics.bodySize - 1,
      lineHeight: metrics.bodyLineHeight - 2,
      paddingHorizontal: TABLE_CELL_PADDING,
      fontWeight: "700",
      color: tokens.foreground,
    },
    tableCell: {
      fontFamily: bodyFont,
      fontSize: metrics.bodySize - 1,
      lineHeight: metrics.bodyLineHeight - 2,
      paddingHorizontal: TABLE_CELL_PADDING,
      color: tokens.foreground,
    },
    cellLeft: { textAlign: "left" },
    cellCenter: { textAlign: "center" },
    cellRight: { textAlign: "right" },
    strong: {
      fontWeight: "700",
      color: tokens.foreground,
    },
    emphasis: {
      fontStyle: "italic",
    },
    strike: {
      textDecorationLine: "line-through",
      color: tokens.foregroundMuted,
    },
    codeSpan: {
      fontFamily: tokens.fontMono,
      fontSize: metrics.bodySize - 1,
      // A neutral tint, not the accent: inline code is not a link and must not
      // borrow the one colour that means "action" everywhere else in the card.
      backgroundColor: withAlpha(tokens.foreground, tokens.isDark ? 0.12 : 0.07),
      borderRadius: radius.chip,
      paddingHorizontal: CODE_CHIP_PADDING,
      color: tokens.foreground,
    },
    link: {
      color: tokens.accent,
      textDecorationLine: "underline",
    },
  });
}
