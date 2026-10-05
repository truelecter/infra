import { Linking, Platform } from "react-native";

/**
 * Opens an http(s) link the way the host does.
 *
 * Three sinks, in the host's own order of preference
 * (`app/src/utils/open-external-url.ts`):
 *
 * 1. On Electron the desktop bridge (`window.paseoDesktop.opener.openUrl`,
 *    read in `desktop/electron/host.ts:7`) hands the URL to the OS browser.
 *    Without it a link opens inside the app window, which has no chrome to
 *    navigate back from.
 * 2. On plain web, `window.open` with `noopener,noreferrer`.
 * 3. On native, `Linking.openURL`.
 *
 * The scheme allowlist mirrors the host's: a link in a model's reply is
 * untrusted input, and `javascript:` or `file:` must never reach a sink.
 */
const ALLOWED = new Set(["http:", "https:", "mailto:"]);

interface DesktopOpener {
  opener?: { openUrl?: (url: string) => unknown };
}

function allowed(url: string): boolean {
  try {
    return ALLOWED.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function openLink(url: string): void {
  if (!allowed(url)) return;

  if (Platform.OS === "web") {
    const bridge = (globalThis as { paseoDesktop?: DesktopOpener }).paseoDesktop;
    const openUrl = bridge?.opener?.openUrl;
    if (typeof openUrl === "function") {
      void openUrl(url);
      return;
    }
    globalThis.open?.(url, "_blank", "noopener,noreferrer");
    return;
  }

  void Linking.openURL(url).catch(() => {
    // No handler for the scheme on this device; nothing useful to show.
  });
}
