// Builds client/components/file-icon-data.ts from the material-icon-theme package: a PNG raster
// of each icon in ICONS, plus the theme's own file-name, extension, and language-id tables cut
// down to those icons. Run with `bun run icons` after changing ICONS or bumping the package.
//
// React Native's <Image> cannot decode SVG and the plugin sandbox has no react-native-svg, so
// the icons ship as PNG data URIs, like the brand marks in mark-bitmaps.ts.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

/** 64 px covers the largest 21 px slot on a three-times display. */
const RASTER_SIZE = 64;

/**
 * The icons the chat can show. Every one costs a few kilobytes of PNG in the client bundle, so
 * the list stays to languages and project files an agent actually touches. `file` and `folder`
 * are the fallbacks.
 */
const ICONS = [
  "file",
  "folder",
  // Languages and data formats
  "astro",
  "c",
  "clojure",
  "console",
  "cpp",
  "csharp",
  "css",
  "dart",
  "database",
  "diff",
  "document",
  "elixir",
  "erlang",
  "go",
  "go-mod",
  "gradle",
  "graphql",
  "groovy",
  "h",
  "haskell",
  "hcl",
  "hpp",
  "html",
  "java",
  "javascript",
  "json",
  "jupyter",
  "kotlin",
  "less",
  "lua",
  "markdown",
  "mermaid",
  "nix",
  "ocaml",
  "php",
  "powershell",
  "proto",
  "python",
  "r",
  "react",
  "react_ts",
  "ruby",
  "rust",
  "sass",
  "scala",
  "svelte",
  "svg",
  "swift",
  "table",
  "terraform",
  "toml",
  "typescript",
  "typescript-def",
  "vue",
  "webassembly",
  "xml",
  "yaml",
  "zig",
  // Project and tooling files
  "biome",
  "bun",
  "certificate",
  "changelog",
  "deno",
  "docker",
  "editorconfig",
  "eslint",
  "git",
  "gitlab",
  "helm",
  "jest",
  "jsconfig",
  "key",
  "kubernetes",
  "license",
  "lock",
  "log",
  "makefile",
  "nodejs",
  "npm",
  "pnpm",
  "prettier",
  "readme",
  "settings",
  "tailwindcss",
  "test-js",
  "test-jsx",
  "test-ts",
  "tsconfig",
  "tune",
  "vite",
  "vitest",
  "yarn",
  // Binary files a read may still point at
  "audio",
  "font",
  "image",
  "pdf",
  "video",
  "word",
  "zip",
] as const;

/**
 * Language ids the highlighter and `languageFromPath` produce that VS Code spells differently.
 * The theme's own `languageIds` win on a clash.
 */
const EXTRA_LANGUAGE_IDS: Record<string, string> = {
  bash: "console",
  docker: "docker",
  golang: "go",
  jsx: "react",
  shell: "console",
  sh: "console",
  tsx: "react_ts",
  zsh: "console",
};

interface Manifest {
  file: string;
  folder: string;
  iconDefinitions: Record<string, { iconPath: string }>;
  fileNames: Record<string, string>;
  fileExtensions: Record<string, string>;
  languageIds: Record<string, string>;
}

const root = resolve(import.meta.dir, "../..");
const themeDir = join(root, "node_modules/material-icon-theme");
const manifestPath = join(themeDir, "dist/material-icons.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
const version = (JSON.parse(readFileSync(join(themeDir, "package.json"), "utf8")) as { version: string })
  .version;
const wanted = new Set<string>(ICONS);

for (const fallback of [manifest.file, manifest.folder]) {
  if (!wanted.has(fallback)) throw new Error(`ICONS must include the theme fallback "${fallback}"`);
}

const bitmaps = ICONS.map((name) => {
  const definition = manifest.iconDefinitions[name];
  if (!definition) throw new Error(`material-icon-theme ${version} has no icon "${name}"`);
  const svg = readFileSync(resolve(dirname(manifestPath), definition.iconPath), "utf8");
  // No icon draws text, and scanning the system fonts costs seconds per icon.
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: RASTER_SIZE },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  return [name, `data:image/png;base64,${Buffer.from(png).toString("base64")}`] as const;
});

function pick(table: Record<string, string>): Array<[string, string]> {
  return Object.entries(table)
    .filter(([, icon]) => wanted.has(icon))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function record(name: string, entries: ReadonlyArray<readonly [string, string]>): string {
  const body = entries.map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  return `export const ${name}: Readonly<Record<string, FileIconName>> = {\n${body.join("\n")}\n};\n`;
}

const languages = pick({ ...EXTRA_LANGUAGE_IDS, ...manifest.languageIds });

const output = `// GENERATED, do not hand-edit. Rebuild with \`bun run icons\` (.showcase/tools/file-icons.ts).
//
// Icons and lookup tables from material-icon-theme ${version} (MIT,
// https://github.com/material-extensions/vscode-material-icon-theme), the theme VS Code and
// Cursor use. Each SVG is rasterised to a ${RASTER_SIZE} px PNG because React Native's <Image> does
// not decode SVG. The tables keep only the entries that point at an icon shipped here.

export type FileIconName =
${ICONS.map((name) => `  | ${JSON.stringify(name)}`).join("\n")};

export const FILE_ICON_BITMAPS: Readonly<Record<FileIconName, string>> = {
${bitmaps.map(([name, uri]) => `  ${JSON.stringify(name)}:\n    ${JSON.stringify(uri)},`).join("\n")}
};

/** Exact lower-cased base names, checked before any extension. */
${record("FILE_NAME_ICONS", pick(manifest.fileNames))}
/** Lower-cased extensions without the leading dot; compound ones such as \`d.ts\` included. */
${record("FILE_EXTENSION_ICONS", pick(manifest.fileExtensions))}
/** VS Code language ids, plus the ids this plugin's highlighter uses. */
${record("LANGUAGE_ICONS", languages)}`;

const target = join(root, "client/components/file-icon-data.ts");
writeFileSync(target, output);
console.log(`${target}: ${ICONS.length} icons, ${output.length} bytes`);
