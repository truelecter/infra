import {
  FILE_EXTENSION_ICONS,
  FILE_NAME_ICONS,
  LANGUAGE_ICONS,
  type FileIconName,
} from "./components/file-icon-data";

/**
 * The material-icon-theme icon for a file, resolved the way VS Code does: the exact file name,
 * then the longest matching extension (`app.test.ts` tries `test.ts` before `ts`), then the
 * language id. A path ending in a separator is a folder. Null means nothing specific matched,
 * so the caller shows the plain file icon and names the language some other way.
 */
export function resolveFileIcon(filename?: string, language?: string): FileIconName | null {
  const path = filename?.trim().toLowerCase() ?? "";
  if (path === "." || path === ".." || path.endsWith("/") || path.endsWith("\\")) return "folder";

  // A read carries its selector on the path (`main.ts:55-85`), and a code block header appends
  // the line range (`main.ts 55-85`). Either suffix would swallow the extension.
  const base = (path.split(/[/\\]/).pop() ?? "").split(/[\s:?#]/)[0] ?? "";
  if (base) {
    const byName = FILE_NAME_ICONS[base];
    if (byName) return byName;
    for (let dot = base.indexOf("."); dot !== -1; dot = base.indexOf(".", dot + 1)) {
      const byExtension = FILE_EXTENSION_ICONS[base.slice(dot + 1)];
      if (byExtension) return byExtension;
    }
  }

  const lang = language?.trim().toLowerCase();
  if (lang) return LANGUAGE_ICONS[lang] ?? FILE_EXTENSION_ICONS[lang] ?? null;
  return null;
}
