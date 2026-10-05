import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Glyph } from "./glyph";
import { frosted } from "./frosted";
import { surfaceProps } from "./view-props";
import { glowing } from "./glow";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import type { ApprovalRequest } from "../../shared/contracts";
import { SyntaxHighlightBlock } from "./syntax-highlight";
import { selectableSurface, unselectable } from "./selection";
import { selectionSurface } from "./selection-actions";

interface ApprovalCardProps {
  request: ApprovalRequest;
  tokens: ExtendedThemeTokens;
  onApprove?: (id: string, scope: "once" | "always") => void;
  onDeny?: (id: string) => void;
}

export function ApprovalCard({ request, tokens, onApprove, onDeny }: ApprovalCardProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "denied">(request.status);
  const [allowScope, setAllowScope] = useState<"once" | "always">("once");

  const isHighRisk = request.riskLevel === "high";
  const isMediumRisk = request.riskLevel === "medium";

  const riskBadgeColor = isHighRisk
    ? tokens.danger
    : isMediumRisk
      ? tokens.warning
      : tokens.foregroundMuted;

  const riskBadgeBg = isHighRisk
    ? tokens.dangerBg
    : isMediumRisk
      ? tokens.warningBg
      : tokens.surface2;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginVertical: 10,
          borderRadius: radius.card,
          backgroundColor: tokens.surfaceGlass,
          borderWidth: 1,
          borderColor: isHighRisk ? tokens.dangerBorder : tokens.borderSubtle,
          overflow: "hidden",
          ...selectableSurface,
          ...tokens.boxShadow,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: tokens.surface2,
          borderBottomWidth: 1,
          borderBottomColor: tokens.borderSubtle,
        },
        headerLeft: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        iconShield: {
          fontFamily: tokens.fontUi,
          fontSize: 16,
        },
        headerTitle: {
          fontFamily: tokens.fontUi,
          fontSize: 13,
          fontWeight: "700",
          color: tokens.foreground,
        },
        toolChip: {
          fontSize: 11,
          fontFamily: tokens.fontUi,
          fontWeight: "600",
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
          backgroundColor: tokens.surface0,
          color: tokens.accent,
        },
        riskPill: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: riskBadgeBg,
          borderWidth: 1,
          borderColor: riskBadgeColor,
        },
        riskText: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: riskBadgeColor,
        },
        body: {
          padding: 14,
          gap: 10,
        },
        rationaleText: {
          fontFamily: tokens.fontUi,
          fontSize: 13,
          lineHeight: 18,
          color: tokens.foreground,
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        },
        metaItem: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        metaLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.foregroundSubtle,
        },
        metaValue: {
          fontSize: 11,
          fontFamily: tokens.fontMono,
          color: tokens.foregroundMuted,
        },
        warningBox: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
          padding: 10,
          borderRadius: radius.block,
          backgroundColor: tokens.warningBg,
          borderWidth: 1,
          borderColor: tokens.warningBorder,
        },
        warningIcon: {
          fontFamily: tokens.fontUi,
          fontSize: 14,
          marginTop: 1,
        },
        warningText: {
          fontFamily: tokens.fontUi,
          flex: 1,
          fontSize: 12,
          lineHeight: 16,
          color: tokens.warning,
        },
        resolvedBanner: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 12,
          backgroundColor: status === "approved" ? tokens.successBg : tokens.dangerBg,
          borderTopWidth: 1,
          borderTopColor: status === "approved" ? tokens.successBorder : tokens.dangerBorder,
        },
        resolvedText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: status === "approved" ? tokens.success : tokens.danger,
        },
        actionsFooter: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: tokens.surface1,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
        },
        denyButton: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.block,
          borderWidth: 1,
          borderColor: tokens.dangerBorder,
          backgroundColor: tokens.surface0,
        },
        denyText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.danger,
          ...unselectable,
        },
        alwaysButton: {
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: radius.block,
          backgroundColor: tokens.surface2,
        },
        alwaysText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "500",
          color: tokens.foregroundMuted,
          ...unselectable,
        },
        approveButton: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: radius.block,
          backgroundColor: tokens.accent,
        },
        approveText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.accentForeground,
          ...unselectable,
        },
        shortcutBadge: {
          fontSize: 10,
          fontFamily: tokens.fontUi,
          paddingHorizontal: 4,
          paddingVertical: 1,
          borderRadius: radius.chip,
          backgroundColor: "rgba(0,0,0,0.18)",
          color: tokens.accentForeground,
          ...unselectable,
        },
        denyShortcutBadge: {
          fontSize: 10,
          fontFamily: tokens.fontUi,
          paddingHorizontal: 4,
          paddingVertical: 1,
          borderRadius: radius.chip,
          backgroundColor: tokens.dangerBg,
          color: tokens.danger,
          ...unselectable,
        },
        undoText: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.foregroundMuted,
          textDecorationLine: "underline",
          ...unselectable,
        },
      }),
    [tokens, isHighRisk, isMediumRisk, riskBadgeBg, riskBadgeColor, status],
  );

  const handleDeny = () => {
    setStatus("denied");
    onDeny?.(request.id);
  };

  const handleApprove = (scope: "once" | "always") => {
    setStatus("approved");
    setAllowScope(scope);
    onApprove?.(request.id, scope);
  };

  return (
    <View {...surfaceProps(frosted, glowing(tokens.isDark), selectionSurface)} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Glyph name="ShieldAlert" size={15} color={riskBadgeColor} />
          <Text selectable style={styles.headerTitle}>
            {request.title}
          </Text>
          <Text selectable style={styles.toolChip}>
            {request.toolName}
          </Text>
        </View>
        <View style={styles.riskPill}>
          <Text selectable style={styles.riskText}>
            {request.riskLevel} Risk
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text selectable style={styles.rationaleText}>
          {request.rationale}
        </Text>

        {request.command && (
          <SyntaxHighlightBlock
            code={`$ ${request.command}`}
            language="bash"
            tokens={tokens}
            compact
          />
        )}

        {request.diff && (
          <SyntaxHighlightBlock
            code={request.diff}
            language="diff"
            filename={request.targetPath}
            tokens={tokens}
            compact
            showLineNumbers
          />
        )}

        <View style={styles.metaRow}>
          {request.cwd ? (
            <View style={styles.metaItem}>
              <Text selectable style={styles.metaLabel}>
                Directory:
              </Text>
              <Text selectable style={styles.metaValue}>
                {request.cwd}
              </Text>
            </View>
          ) : null}
          {request.timeoutSeconds ? (
            <View style={styles.metaItem}>
              <Text selectable style={styles.metaLabel}>
                Timeout:
              </Text>
              <Text selectable style={styles.metaValue}>
                {request.timeoutSeconds}s
              </Text>
            </View>
          ) : null}
        </View>

        {isHighRisk && (
          <View style={styles.warningBox}>
            <Glyph name="AlertTriangle" size={14} color={tokens.warning} />
            <Text selectable style={styles.warningText}>
              Destructive action: Verify command parameters and targets carefully before allowing
              execution.
            </Text>
          </View>
        )}
      </View>

      {status !== "pending" ? (
        <View style={styles.resolvedBanner}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Glyph
              name={status === "approved" ? "CheckCircle" : "X"}
              size={13}
              color={status === "approved" ? tokens.success : tokens.danger}
            />
            <Text selectable style={styles.resolvedText}>
              {status === "approved"
                ? `Permission Granted (${allowScope === "always" ? "Session" : "Once"})`
                : "Permission Denied by User"}
            </Text>
          </View>
          <Pressable onPress={() => setStatus("pending")}>
            <Text style={styles.undoText}>Undo Decision</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionsFooter}>
          <Pressable onPress={handleDeny} style={styles.denyButton}>
            <Glyph name="X" size={11} color={tokens.danger} />
            <Text style={styles.denyText}>Deny</Text>
            <Text style={styles.denyShortcutBadge}>Esc</Text>
          </Pressable>

          <Pressable onPress={() => handleApprove("always")} style={styles.alwaysButton}>
            <Text style={styles.alwaysText}>Allow for Session</Text>
          </Pressable>

          <Pressable onPress={() => handleApprove("once")} style={styles.approveButton}>
            <Glyph name="Check" size={12} color={tokens.accentForeground} />
            <Text style={styles.approveText}>Approve Once</Text>
            <Text style={styles.shortcutBadge}>⏎</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
