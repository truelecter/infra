import { EMBEDDED_FONTS } from "./font-data";

const STYLE_ELEMENT_ID = "beautiful-chat-fonts";

/**
 * Host faces to try if the embedded bytes ever fail to decode. These belong in
 * the `src` chain rather than in `fontFamily`, because a comma-separated
 * family list is not a valid React Native style value.
 */
const LOCAL_FALLBACKS: Record<string, readonly string[]> = {
  "OMP Iosevka": ["Iosevka", "Cascadia Code", "Consolas", "Menlo"],
  "OMP Iosevka Code": ["Iosevka", "Cascadia Code", "Fira Code", "Consolas"],
  "OMP Inter": ["Inter", "Segoe UI", "Roboto", "Helvetica Neue"],
};
/**
 * Installs the bundled Inter and Iosevka faces.
 *
 * The plugin sandbox exposes no font loader, so on web and Electron the faces
 * are declared with `@font-face` against embedded woff2 data and the browser
 * takes it from there. React Native has no `document`, so on iOS and Android
 * this is a no-op and the font stacks fall through to the platform default —
 * embedding native assets needs a build step a directory plugin does not have.
 *
 * Injection is idempotent: a second client mounting reuses the existing style
 * element rather than parsing 75 KB of font data again.
 */
export function embedFonts(): () => void {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ELEMENT_ID)) return () => {};

  const rules = EMBEDDED_FONTS.map(({ family, weight, woff2Base64 }) => {
    const sources = [
      `url(data:font/woff2;base64,${woff2Base64}) format("woff2")`,
      ...(LOCAL_FALLBACKS[family] ?? []).map((name) => `local("${name}")`),
    ].join(",\n    ");
    return `@font-face {
  font-family: "${family}";
  font-style: normal;
  font-weight: ${weight};
  font-display: block;
  src: ${sources};
}`;
  }).join("\n");

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = rules;
  document.head.appendChild(style);

  return () => {
    style.remove();
  };
}
