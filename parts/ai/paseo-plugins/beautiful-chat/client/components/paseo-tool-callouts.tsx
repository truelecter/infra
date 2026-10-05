import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Glyph } from "./glyph";
import { frosted } from "./frosted";
import { surfaceProps } from "./view-props";
import { glowing } from "./glow";
import { Rotate } from "./motion";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { ProviderLogo } from "./provider-logo";
import { SyntaxHighlightBlock } from "./syntax-highlight";
import { selectableSurface } from "./selection";
import { selectionSurface } from "./selection-actions";
import type {
  PaseoToolKind,
  PaseoCreateAgentData,
  PaseoGetActivityData,
  PaseoListProvidersData,
  PaseoListModelsData,
  PaseoToolData,
} from "../../shared/contracts";

interface PaseoToolCalloutProps {
  data: PaseoToolData;
  tokens: ExtendedThemeTokens;
  defaultExpanded?: boolean;
}

export function PaseoToolCallout({ data, tokens, defaultExpanded = true }: PaseoToolCalloutProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginVertical: 8,
          borderRadius: radius.card,
          backgroundColor: tokens.surfaceGlass,
          borderWidth: 1,
          borderColor: tokens.border,
          overflow: "hidden",
          ...tokens.boxShadow,
          ...selectableSurface,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: tokens.surface2,
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
          fontWeight: "700",
          color: tokens.accent,
          backgroundColor: tokens.accentBg,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
        },
        titleText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.foreground,
          flexShrink: 1,
        },
        headerRight: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        durationBadge: {
          fontSize: 11,
          fontFamily: tokens.fontUi,
          color: tokens.foregroundSubtle,
        },
        body: {
          padding: 12,
          backgroundColor: tokens.surface0,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
          gap: 10,
        },
      }),
    [tokens],
  );

  return (
    <View
      {...surfaceProps(frosted, glowing(tokens.isDark), selectionSurface)}
      style={styles.container}
    >
      <Pressable onPress={() => setExpanded((p) => !p)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Glyph name="Paseo" size={13} color={tokens.accent} />
          <Text selectable style={styles.toolPill}>
            {data.tool}
          </Text>
          {data.createAgent && <ProviderLogo provider={data.createAgent.provider} size={14} />}
          {data.models && <ProviderLogo provider={data.models.provider} size={14} />}
          {data.activity && <ProviderLogo provider={data.activity.provider} size={14} />}
          <Text selectable style={styles.titleText} numberOfLines={1}>
            {data.createAgent?.title ||
              (data.models && `Models for ${data.models.provider}`) ||
              (data.activity && `Activity for ${data.activity.agentId}`) ||
              (data.providers && `Discovered Providers (${data.providers.providers.length})`)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {data.durationMs ? (
            <Text selectable style={styles.durationBadge}>
              {data.durationMs}ms
            </Text>
          ) : null}
          <Rotate active={expanded}>
            <Glyph name="ChevronDown" size={16} color={tokens.foregroundMuted} />
          </Rotate>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {data.tool === "create_agent" && data.createAgent && (
            <CreateAgentView data={data.createAgent} tokens={tokens} />
          )}
          {data.tool === "list_providers" && data.providers && (
            <ListProvidersView data={data.providers} tokens={tokens} />
          )}
          {data.tool === "list_models" && data.models && (
            <ListModelsView data={data.models} tokens={tokens} />
          )}
          {data.tool === "get_agent_activity" && data.activity && (
            <GetActivityView data={data.activity} tokens={tokens} />
          )}
        </View>
      )}
    </View>
  );
}

function CreateAgentView({
  data,
  tokens,
}: {
  data: PaseoCreateAgentData;
  tokens: ExtendedThemeTokens;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ProviderLogo provider={data.provider} size={16} showLabel />
          {data.model && (
            <Text
              selectable
              style={{
                fontSize: 11,
                fontFamily: tokens.fontUi,
                color: tokens.foregroundMuted,
                backgroundColor: tokens.surface2,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.block,
              }}
            >
              {data.model}
            </Text>
          )}
          {data.modeId && (
            <Text
              selectable
              style={{
                fontSize: 10,
                fontWeight: "600",
                textTransform: "uppercase",
                color: tokens.accent,
                backgroundColor: tokens.accentBg,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.block,
              }}
            >
              {data.modeId} mode
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: radius.block,
            backgroundColor: tokens.successBg,
          }}
        >
          <Glyph name="CheckCircle" size={11} color={tokens.success} />
          <Text
            selectable
            style={{
              fontSize: 11,
              fontFamily: tokens.fontUi,
              color: tokens.success,
              fontWeight: "600",
            }}
          >
            {data.agentId ? `${data.agentId.slice(0, 12)}…` : "running"}
          </Text>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text
          selectable
          style={{
            fontSize: 10,
            fontWeight: "700",
            textTransform: "uppercase",
            color: tokens.foregroundSubtle,
          }}
        >
          Initial Task Prompt
        </Text>
        <SyntaxHighlightBlock
          code={data.initialPrompt}
          language="markdown"
          tokens={tokens}
          compact
        />
      </View>
    </View>
  );
}

function ListProvidersView({
  data,
  tokens,
}: {
  data: PaseoListProvidersData;
  tokens: ExtendedThemeTokens;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        selectable
        style={{
          fontSize: 11,
          color: tokens.foregroundMuted,
        }}
      >
        Configured agent backends discovered on local daemon:
      </Text>

      <View style={{ gap: 6 }}>
        {data.providers.map((p) => {
          const isAvail = p.status === "available";
          return (
            <View
              key={p.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: radius.block,
                backgroundColor: tokens.surface1,
                borderWidth: 1,
                borderColor: tokens.borderSubtle,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ProviderLogo provider={p.id} size={15} />
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: tokens.foreground,
                      }}
                    >
                      {p.label}
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 10,
                        fontFamily: tokens.fontUi,
                        color: tokens.foregroundSubtle,
                      }}
                    >
                      {p.id}
                    </Text>
                  </View>
                  <Text
                    selectable
                    style={{
                      fontSize: 11,
                      color: tokens.foregroundMuted,
                      marginTop: 1,
                    }}
                    numberOfLines={1}
                  >
                    {p.description}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 4,
                    backgroundColor: isAvail ? tokens.success : tokens.foregroundSubtle,
                  }}
                />
                <Text
                  selectable
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    color: isAvail ? tokens.success : tokens.foregroundSubtle,
                  }}
                >
                  {p.status}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ListModelsView({
  data,
  tokens,
}: {
  data: PaseoListModelsData;
  tokens: ExtendedThemeTokens;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ProviderLogo provider={data.provider} size={16} showLabel />
        <Text selectable style={{ fontSize: 11, color: tokens.foregroundSubtle }}>
          Supported models & reasoning modes:
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        {data.models.map((m) => (
          <View
            key={m.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.block,
              backgroundColor: tokens.surface1,
              borderWidth: 1,
              borderColor: tokens.borderSubtle,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                selectable
                style={{
                  fontSize: 12,
                  fontFamily: tokens.fontUi,
                  fontWeight: "700",
                  color: tokens.foreground,
                }}
              >
                {m.id}
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 11,
                  color: tokens.foregroundMuted,
                }}
              >
                {m.label}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {m.thinkingSupport && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: radius.chip,
                    backgroundColor: tokens.accentBg,
                  }}
                >
                  <Glyph name="Brain" size={10} color={tokens.accent} />
                  <Text
                    selectable
                    style={{
                      fontSize: 10,
                      color: tokens.accent,
                      fontWeight: "600",
                    }}
                  >
                    Reasoning
                  </Text>
                </View>
              )}
              <Text
                selectable
                style={{
                  fontSize: 10,
                  fontFamily: tokens.fontUi,
                  color: tokens.foregroundSubtle,
                  backgroundColor: tokens.surface2,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: radius.chip,
                }}
              >
                {m.contextTokens}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function GetActivityView({
  data,
  tokens,
}: {
  data: PaseoGetActivityData;
  tokens: ExtendedThemeTokens;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 6,
          borderBottomWidth: 1,
          borderBottomColor: tokens.borderSubtle,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ProviderLogo provider={data.provider} size={14} />
          <Text
            selectable
            style={{
              fontSize: 11,
              fontFamily: tokens.fontUi,
              color: tokens.foregroundMuted,
            }}
          >
            Target: {data.agentId}
          </Text>
        </View>
        <Text selectable style={{ fontSize: 10, color: tokens.foregroundSubtle }}>
          {data.activities.length} recent activities
        </Text>
      </View>

      {data.activities.map((act, idx) => (
        <View
          key={idx}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Glyph
              name={
                act.kind === "tool" ? "Wrench" : act.kind === "thinking" ? "Brain" : "MessageSquare"
              }
              size={11}
              color={act.kind === "thinking" ? tokens.accent : tokens.accent}
            />
            <Text
              selectable
              style={{
                fontSize: 12,
                color: tokens.foreground,
              }}
            >
              {act.title}
            </Text>
          </View>
          {act.elapsed && (
            <Text
              selectable
              style={{
                fontSize: 10,
                fontFamily: tokens.fontUi,
                color: tokens.foregroundSubtle,
              }}
            >
              {act.elapsed}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
