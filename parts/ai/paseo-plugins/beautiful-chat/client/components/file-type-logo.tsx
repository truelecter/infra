import React from "react";
import { Image } from "react-native";
import { FILE_ICON_BITMAPS } from "./file-icon-data";
import { resolveFileIcon } from "../file-icon";

interface FileTypeLogoProps {
  filename?: string;
  language?: string;
  size?: "sm" | "md" | "lg";
}

const DIMENSIONS = {
  sm: { box: 15 },
  md: { box: 17 },
  lg: { box: 21 },
} as const;

/**
 * The file's material-icon-theme icon, as VS Code and Cursor show it. Unknown types use the
 * theme's plain file icon. Every icon is a PNG: React Native cannot decode an SVG data URI, so
 * an inlined SVG renders on web only.
 */
export function FileTypeLogo({ filename, language, size = "md" }: FileTypeLogoProps) {
  const icon = resolveFileIcon(filename, language) ?? "file";
  const { box } = DIMENSIONS[size];
  return (
    <Image
      source={{ uri: FILE_ICON_BITMAPS[icon] }}
      style={{ width: box, height: box }}
      resizeMode="contain"
      accessibilityLabel={icon === "folder" ? "Folder" : `${icon} file`}
    />
  );
}
