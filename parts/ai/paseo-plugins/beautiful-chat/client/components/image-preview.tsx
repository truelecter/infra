import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Glyph } from "./glyph";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { unselectable } from "./selection";
import type { ImageFile } from "../image-file";

interface ImagePreviewProps {
  /** The path as the tool reported it, selector and all. */
  path: string;
  /** Null while the daemon is still reading the file. */
  file: ImageFile | null;
  tokens: ExtendedThemeTokens;
  /** Shows the file in the machine's own file manager. */
  onReveal?: () => void;
}

/** The tallest a thumbnail grows. Past this the image scales down to fit. */
const MAX_HEIGHT = 280;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A read of an image, drawn as the image.
 *
 * The reader hands the timeline a placeholder line rather than bytes, so
 * without this an image file renders as an empty code block with a language
 * badge — text chrome around nothing. The bytes come from the plugin's own
 * daemon-side RPC, which is the only side that can reach the file.
 *
 * The thumbnail keeps the file's aspect ratio when the header gave one, and
 * falls back to a fixed box when the header could not be read: an image that
 * loads but reports no size still has to occupy an honest amount of room.
 */
export function ImagePreview({ path, file, tokens, onReveal }: ImagePreviewProps) {
  const [shown, setShown] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderRadius: radius.block,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          backgroundColor: tokens.surfaceCode,
          overflow: "hidden",
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 7,
          backgroundColor: tokens.surface2,
        },
        path: {
          fontFamily: tokens.fontMono,
          fontSize: 11.5,
          color: tokens.accent,
          textDecorationLine: "underline",
          flexShrink: 1,
          minWidth: 0,
        },
        plainPath: {
          fontFamily: tokens.fontMono,
          fontSize: 11.5,
          color: tokens.foregroundMuted,
          flexShrink: 1,
          minWidth: 0,
        },
        chips: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
        chip: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.foregroundSubtle,
          backgroundColor: tokens.surface1,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
          ...unselectable,
        },
        eye: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: radius.block,
          backgroundColor: tokens.surface1,
        },
        eyeLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "500",
          color: tokens.foregroundMuted,
          ...unselectable,
        },
        spacer: { flex: 1, minWidth: 8 },
        // The checker tint is a flat wash rather than a pattern: a transparent
        // PNG needs something behind it, and a repeating background is not a
        // React Native style.
        canvas: {
          padding: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tokens.surface0,
        },
        image: { width: "100%", height: MAX_HEIGHT },
        message: {
          fontFamily: tokens.fontUi,
          fontSize: 11.5,
          color: tokens.foregroundMuted,
          padding: 10,
        },
      }),
    [tokens],
  );

  const chips: string[] = [];
  if (file?.width && file.height) chips.push(`${file.width} × ${file.height}`);
  if (file?.bytes) chips.push(formatBytes(file.bytes));

  // Size from the image's own pixels: a box sized by width alone letterboxes a
  // tall image inside empty sides, and a fixed height blows a 32 px icon up to
  // eight times its size. Height leads, width follows the ratio, and the
  // container clamps anything too wide.
  const ratio = file?.width && file.height ? file.width / file.height : null;
  const frame =
    ratio !== null && file?.height
      ? {
          height: Math.min(MAX_HEIGHT, file.height),
          aspectRatio: ratio,
          maxWidth: "100%" as const,
        }
      : styles.image;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Glyph name="Image" size={13} color={tokens.foregroundMuted} />
        {onReveal ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Show ${path} in the file manager`}
            onPress={onReveal}
          >
            <Text style={styles.path} numberOfLines={1}>
              {path}
            </Text>
          </Pressable>
        ) : (
          <Text selectable style={styles.plainPath} numberOfLines={1}>
            {path}
          </Text>
        )}
        <View style={styles.spacer} />
        <View style={styles.chips}>
          {chips.map((chip) => (
            <Text key={chip} style={styles.chip}>
              {chip}
            </Text>
          ))}
        </View>
        {file?.dataUri ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? "Hide the image" : "Show the image"}
            onPress={() => setShown((previous) => !previous)}
            style={styles.eye}
          >
            <Glyph name={shown ? "Eye" : "EyeOff"} size={12} color={tokens.foregroundMuted} />
            <Text style={styles.eyeLabel}>{shown ? "Hide" : "Show"}</Text>
          </Pressable>
        ) : null}
      </View>

      {file === null ? (
        <Text style={styles.message}>Reading the file…</Text>
      ) : file.dataUri === null ? (
        <Text style={styles.message}>{file.error ?? "The image could not be read."}</Text>
      ) : shown ? (
        <View style={styles.canvas}>
          <Image
            source={{ uri: file.dataUri }}
            style={frame}
            resizeMode="contain"
            accessibilityLabel={path}
          />
        </View>
      ) : null}
    </View>
  );
}
