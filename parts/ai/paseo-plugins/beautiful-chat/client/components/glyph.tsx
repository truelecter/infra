import React, { type ReactElement } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Icon as HostIcon } from "@getpaseo/plugin/client/react-native";
import { fontMono } from "./theme-tokens";
import { unselectable } from "./selection";

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

/**
 * Universal zero-dependency stroke and geometric glyphs.
 * Runs in any Paseo plugin sandbox without requiring react-native-svg or external icon packages.
 */
export function Icon({ name, size = 13, color = "#94a3b8" }: IconProps): ReactElement {
  const safeColor = color === "currentColor" ? "#94a3b8" : color;
  const glyph = renderGlyph(name, size, safeColor);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {glyph}
    </View>
  );
}

export { Icon as Glyph };

function renderGlyph(name: string, size: number, color: string): ReactElement {
  const stroke = Math.max(1.2, size / 8.5);

  switch (name) {
    // A stroked chevron, not the `▾` character. A text triangle fills only a
    // fraction of its em box, so it reads far smaller than its nominal size;
    // two borders on a rotated box scale exactly with `size`.
    case "ChevronDown":
    case "ChevronUp":
    case "ChevronRight": {
      const side = size * 0.46;
      const rotation =
        name === "ChevronDown" ? "45deg" : name === "ChevronUp" ? "-135deg" : "-45deg";
      // The turned box sits off-centre on the axis it points along.
      const nudge = size * 0.11;
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: side,
              height: side,
              borderRightWidth: stroke,
              borderBottomWidth: stroke,
              borderColor: color,
              transform: [{ rotate: rotation }],
              marginTop: name === "ChevronDown" ? -nudge : 0,
              marginBottom: name === "ChevronUp" ? -nudge : 0,
              marginRight: name === "ChevronRight" ? -nudge : 0,
            }}
          />
        </View>
      );
    }

    case "Check":
      return (
        <Text
          style={[styles.symbol, { fontSize: size + 1, color, fontWeight: "700" }, unselectable]}
        >
          ✓
        </Text>
      );

    case "X":
      return (
        <Text style={[styles.symbol, { fontSize: size, color, fontWeight: "600" }, unselectable]}>
          ✕
        </Text>
      );

    case "Dot":
      return (
        <View
          style={{
            width: Math.max(4, size * 0.45),
            height: Math.max(4, size * 0.45),
            borderRadius: Math.round(size / 2),
            backgroundColor: color,
          }}
        />
      );

    case "Circle":
      return (
        <View
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      );

    case "CircleDot":
      return (
        <View
          style={{
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: size * 0.375,
            borderWidth: stroke,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case "Play":
      return (
        <Text style={[styles.arrow, { fontSize: size - 2, color, marginLeft: 1 }, unselectable]}>
          ▶
        </Text>
      );

    case "Terminal":
      return (
        <Text style={[styles.mono, { fontSize: Math.max(8.5, size - 2), color }, unselectable]}>
          &gt;_
        </Text>
      );

    // A completion marker: filled disc in the status colour with a white
    // tick on top. The tick is two borders on a rotated box, so it stays
    // crisp at any size without a font glyph or an SVG.
    case "CheckCircle": {
      const tickWidth = size * 0.44;
      const tickHeight = size * 0.24;
      const tickStroke = Math.max(1.25, size * 0.11);
      return (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: tickWidth,
              height: tickHeight,
              borderLeftWidth: tickStroke,
              borderBottomWidth: tickStroke,
              borderColor: "#FFFFFF",
              transform: [{ rotate: "-45deg" }],
              marginTop: -size * 0.08,
            }}
          />
        </View>
      );
    }

    // Reasoning is a bolt. The host draws it, so it renders on every platform.
    case "Zap":
      return <HostIcon name="Zap" size={size} color={color} />;

    case "Brain":
      return <HostIcon name="Brain" size={size} color={color} />;

    case "Sparkles":
      return <Text style={[styles.symbol, { fontSize: size - 1, color }, unselectable]}>✦</Text>;

    case "Shield":
    case "ShieldAlert":
      return <Text style={[styles.symbol, { fontSize: size - 1, color }, unselectable]}>⛨</Text>;

    case "ListChecks":
    case "ListTodo":
      return (
        <Text
          style={[styles.symbol, { fontSize: size - 1, color, fontWeight: "700" }, unselectable]}
        >
          ≡
        </Text>
      );

    case "AlertTriangle":
    case "AlertCircle":
      return <Text style={[styles.bold, { fontSize: size, color }, unselectable]}>!</Text>;

    case "HelpCircle":
      return (
        <View
          style={{
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: size * 0.425,
            borderWidth: stroke,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={[
              {
                fontSize: size * 0.65,
                fontWeight: "700",
                color,
                lineHeight: size * 0.7,
              },
              unselectable,
            ]}
          >
            ?
          </Text>
        </View>
      );

    case "Copy":
      return <HostIcon name="Copy" size={size} color={color} />;
    case "Bot":
      return (
        <Text style={[styles.mono, { fontSize: size - 2, color, fontWeight: "700" }, unselectable]}>
          [•]
        </Text>
      );

    case "Server":
    case "Layers":
      return <Text style={[styles.symbol, { fontSize: size - 1, color }, unselectable]}>☵</Text>;

    case "Radio":
      return (
        <View
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            borderWidth: stroke,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case "Plug":
      return (
        <View
          style={{
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: Math.max(2.5, size * 0.24),
              marginBottom: 0.5,
            }}
          >
            <View
              style={{
                width: 1.5,
                height: size * 0.28,
                backgroundColor: color,
                borderRadius: 0.5,
              }}
            />
            <View
              style={{
                width: 1.5,
                height: size * 0.28,
                backgroundColor: color,
                borderRadius: 0.5,
              }}
            />
          </View>
          <View
            style={{
              width: size * 0.65,
              height: size * 0.44,
              backgroundColor: color,
              borderRadius: 3,
            }}
          />
          <View
            style={{
              width: 1.5,
              height: size * 0.2,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case "Pencil":
    case "Edit":
      return (
        <Text
          style={[
            styles.symbol,
            {
              fontSize: size + 1,
              color,
              fontWeight: "600",
              lineHeight: size + 2,
            },
            unselectable,
          ]}
        >
          ✎
        </Text>
      );

    case "Book":
    case "BookOpen":
      return <HostIcon name="BookOpen" size={size} color={color} />;
    case "FileCode":
      return (
        <Text style={[styles.mono, { fontSize: size - 3, color, fontWeight: "700" }, unselectable]}>
          &lt;/&gt;
        </Text>
      );

    case "FileDiff":
      return (
        <Text style={[styles.mono, { fontSize: size - 1, color, fontWeight: "700" }, unselectable]}>
          ±
        </Text>
      );

    case "Wrench":
      return <Text style={[styles.symbol, { fontSize: size - 1, color }, unselectable]}>⚙</Text>;

    case "MessageSquare":
      return <Text style={[styles.symbol, { fontSize: size - 1, color }, unselectable]}>💬</Text>;

    default:
      // Anything this file does not draw comes from the host's Lucide set.
      return <HostIcon name={name} size={size} color={color} />;
  }
}

const styles = StyleSheet.create({
  arrow: {
    textAlign: "center",
    lineHeight: 14,
  },
  symbol: {
    textAlign: "center",
    lineHeight: 14,
  },
  mono: {
    fontFamily: fontMono,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 13,
  },
  bold: {
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 13,
  },
});
