import type { PluginTheme } from "@getpaseo/plugin";
import { openExternalUrl } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo, type ReactNode } from "react";
import { Platform, ScrollView, Text, View, type TextStyle } from "react-native";
import { parseMarkdown, type Block, type Inline } from "./markdown.ts";

export const MONOSPACE = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "ui-monospace, SFMono-Regular, Menlo, monospace",
});
const HEADING_SIZE = [20, 18, 16, 15, 14, 14];

function renderInline(nodes: Inline[], theme: PluginTheme, key = "i"): ReactNode[] {
  return nodes.map((node, index) => {
    const id = `${key}-${index}`;
    switch (node.type) {
      case "text":
        return node.text;
      case "code":
        return (
          <Text
            key={id}
            style={{ fontFamily: MONOSPACE, fontSize: 13, backgroundColor: theme.colors.surface2 }}
          >
            {node.text}
          </Text>
        );
      case "strong":
        return (
          <Text key={id} style={{ fontWeight: "700" }}>
            {renderInline(node.children, theme, id)}
          </Text>
        );
      case "em":
        return (
          <Text key={id} style={{ fontStyle: "italic" }}>
            {renderInline(node.children, theme, id)}
          </Text>
        );
      case "del":
        return (
          <Text key={id} style={{ textDecorationLine: "line-through" }}>
            {renderInline(node.children, theme, id)}
          </Text>
        );
      case "link":
        return (
          <Text
            key={id}
            accessibilityRole="link"
            style={{ color: theme.colors.accent, textDecorationLine: "underline" }}
            onPress={() => void openExternalUrl(node.href)}
          >
            {renderInline(node.children, theme, id)}
          </Text>
        );
    }
  });
}

function BlockView({ block, theme, text }: { block: Block; theme: PluginTheme; text: TextStyle }) {
  switch (block.type) {
    case "paragraph":
      return (
        <Text style={text} selectable>
          {renderInline(block.children, theme)}
        </Text>
      );
    case "heading":
      return (
        <Text
          style={[text, { fontSize: HEADING_SIZE[block.level - 1], fontWeight: "600" }]}
          selectable
        >
          {renderInline(block.children, theme)}
        </Text>
      );
    case "code":
      return (
        <ScrollView
          horizontal
          style={{ borderRadius: 6, backgroundColor: theme.colors.surface2 }}
          contentContainerStyle={{ padding: 8 }}
        >
          <Text style={[text, { fontFamily: MONOSPACE, fontSize: 13 }]} selectable>
            {block.text}
          </Text>
        </ScrollView>
      );
    case "quote":
      return (
        <View
          style={{ borderLeftWidth: 3, borderLeftColor: theme.colors.border, paddingLeft: 10 }}
        >
          <Blocks blocks={block.children} theme={theme} text={{ ...text, color: theme.colors.foregroundMuted }} />
        </View>
      );
    case "rule":
      return <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />;
    case "list":
      return (
        <View style={{ gap: 4 }}>
          {block.items.map((item, index) => (
            <View key={index} style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ minWidth: 16, alignItems: "flex-end" }}>
                {item.checked !== undefined ? (
                  <View style={{ paddingTop: 2 }}>
                    <Icon
                      name={item.checked ? "SquareCheck" : "Square"}
                      size={15}
                      color={item.checked ? theme.colors.statusSuccess : theme.colors.foregroundMuted}
                    />
                  </View>
                ) : block.ordered ? (
                  <Text style={[text, { color: theme.colors.foregroundMuted }]}>{block.start + index}.</Text>
                ) : (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      marginTop: 6,
                      backgroundColor: theme.colors.foregroundMuted,
                    }}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Blocks blocks={item.children} theme={theme} text={text} />
              </View>
            </View>
          ))}
        </View>
      );
  }
}

function Blocks({
  blocks,
  theme,
  text,
}: {
  blocks: Block[];
  theme: PluginTheme;
  text: TextStyle;
}) {
  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} theme={theme} text={text} />
      ))}
    </View>
  );
}

export function Markdown({ source, theme }: { source: string; theme: PluginTheme }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <Blocks blocks={blocks} theme={theme} text={{ color: theme.colors.foreground, fontSize: 14, lineHeight: 20 }} />
  );
}
