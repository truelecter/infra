import React, { type ReactElement } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Icon as HostIcon } from "@getpaseo/plugin/client/react-native";
import { fontMono } from "./theme-tokens";
import { MARK_BITMAPS, MONO_MARKS } from "./mark-bitmaps";
import { unselectable } from "./selection";

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

/**
 * Vendor paths kept as the source the raster generator reads. They are no
 * longer drawn here: React Native's <Image> decodes PNG, JPEG, GIF, and WebP,
 * never SVG, so an inlined SVG rendered on web and stayed blank on iOS and
 * Android. Every mark below now arrives as a PNG raster instead.
 */
const BRAND_PATHS = {
  Git: {
    viewBox: "0 0 24 24",
    d: "M13.09 23.549a1.54 1.54 0 0 1-2.18 0L.451 13.089a1.54 1.54 0 0 1 0-2.179l7.191-7.19l2.733 2.733a1.85 1.85 0 0 0 .964 2.326v6.66a1.849 1.849 0 1 0 1.54 0V8.957l2.508 2.508a1.85 1.85 0 1 0 1.09-1.09l-2.634-2.634a1.85 1.85 0 0 0-2.378-2.377L8.73 2.63L10.91.451a1.54 1.54 0 0 1 2.179 0l10.459 10.46a1.54 1.54 0 0 1 0 2.179z",
  },
  GitHub: {
    viewBox: "0 0 24 24",
    d: "M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  // Paseo's own mark, taken from the app's PaseoLogo component.
  Paseo: {
    viewBox: "0 0 700 700",
    d: "M291.495 91.399C333.897 104.892 379.155 135.075 416.229 173.191C453.389 211.394 484.429 259.725 495.708 311.251C497.555 319.693 498.865 328.216 499.586 336.776C509.755 326.554 519.867 317.815 529.89 311.547C540.647 304.821 553.808 299.297 568.641 299.785C584.29 300.299 597.395 307.326 607.747 317.632C632.173 341.947 629.612 372.898 619.872 397.936C610.185 422.833 591.557 447.826 572.732 469.124C553.591 490.78 532.713 510.308 516.779 524.318C508.775 531.355 501.936 537.073 497.07 541.052C494.635 543.043 492.689 544.603 491.334 545.679C490.657 546.217 490.126 546.635 489.756 546.926C489.571 547.071 489.425 547.184 489.321 547.265C489.269 547.305 489.227 547.338 489.196 547.362C489.181 547.374 489.168 547.385 489.157 547.393C489.153 547.397 489.147 547.401 489.144 547.403C489.134 547.4 488.837 547.06 473.001 528.499L489.135 547.411C478.157 555.911 462.033 554.334 453.122 543.89C444.213 533.448 445.887 518.094 456.861 509.592C456.863 509.591 456.865 509.588 456.869 509.586C456.88 509.577 456.902 509.561 456.933 509.536C456.997 509.487 457.101 509.404 457.245 509.292C457.533 509.066 457.979 508.715 458.569 508.247C459.749 507.31 461.506 505.901 463.742 504.073C468.216 500.414 474.589 495.088 482.073 488.508C497.114 475.284 516.315 457.282 533.578 437.75C551.157 417.862 565.26 398.01 571.859 381.048C578.403 364.227 575.681 356.302 570.724 351.367C568.928 349.579 567.744 348.902 567.267 348.676C566.888 348.496 566.811 348.52 566.804 348.52C566.605 348.513 563.971 348.537 557.953 352.3C545.161 360.299 528.815 377.492 506.807 403.867C494.927 418.106 481.871 434.435 467.547 451.957C463.709 457.28 459.503 462.538 454.91 467.717L454.702 467.549C420.808 508.347 380.37 553.856 332.335 593.848C301.853 619.226 262.656 622.597 228.642 614.743C194.834 606.936 162.658 587.448 142.217 561.686C108.054 518.631 100.57 469.801 108.223 427.836C115.56 387.606 137.391 351.005 166.502 331.557C161.248 315.813 156.813 299.49 153.519 283.013C142.593 228.368 143.239 167.031 174.28 119.619C186.922 100.31 205.846 89.1535 227.387 85.2773C248.1 81.5504 270.278 84.648 291.495 91.399ZM378.642 206.356C345.773 172.563 307.463 147.917 275.208 137.654C259.096 132.527 246.171 131.514 236.828 133.195C228.314 134.727 222.227 138.497 217.721 145.38C196.712 177.468 193.858 224.004 203.82 273.827C206.532 287.394 210.127 300.834 214.345 313.817C236.45 310.276 260.156 311.463 281.22 317.11C319.621 327.403 357.501 355.419 357.501 405.654C357.501 435.255 339.111 465.136 307.278 473.815C273.211 483.103 238.854 464.822 213.105 427.541C203.716 413.947 194.443 397.766 185.947 379.89C174.028 392.223 163.08 411.953 158.673 436.118C153.128 466.518 158.514 501.286 183.085 532.253C195.993 548.522 217.742 562.031 240.771 567.349C263.594 572.619 284.147 569.24 298.664 557.154C349.383 514.927 390.709 466.547 426.366 422.952C448.879 390.86 453.195 356.06 445.578 321.265C436.703 280.718 411.425 240.06 378.642 206.356ZM306.296 405.722C306.296 384.769 292.223 370.736 267.284 364.051C256.012 361.03 244.156 360.087 233.095 360.771C240.361 375.935 248.168 389.513 255.897 400.704C275.647 429.298 289.989 427.822 293.247 426.934C298.737 425.437 306.296 418.161 306.296 405.722Z",
  },
} as const;

/** A brand mark Lucide does not carry, rasterised and tinted when monochrome. */
function BrandMark({ id, size, color }: { id: string; size: number; color: string }) {
  const uri = MARK_BITMAPS[id];
  if (!uri) return <View style={{ width: size, height: size }} />;
  return (
    <Image
      source={{ uri }}
      style={
        MONO_MARKS.has(id)
          ? { width: size, height: size, tintColor: color }
          : { width: size, height: size }
      }
      resizeMode="contain"
      accessibilityLabel={id}
    />
  );
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

    case "Git":
      return <BrandMark id="brand:git" size={size} color={color} />;
    case "GitHub":
      return <BrandMark id="brand:github" size={size} color={color} />;
    case "Paseo":
      return <BrandMark id="brand:paseo" size={size} color={color} />;
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
