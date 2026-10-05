import { useEffect, useState } from "react";
import { useRpc } from "@getpaseo/plugin/client";
import { imageRpc } from "../shared/image-rpc";

/** What the daemon side could tell the client about one image file. */
export interface ImageFile {
  dataUri: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  error: string | null;
}

/**
 * File extensions worth previewing.
 *
 * The client decides whether to ask at all, so a read of a `.ts` file never
 * costs an RPC. The daemon holds the same list and refuses anything outside
 * it, because that side is the one handing bytes to an `<img>`.
 */
const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "bmp",
  "ico",
  "svg",
]);

/** Strips the selector a tool appends to a path, such as `shot.png:1-20`. */
function stripSelector(path: string): string {
  const trimmed = path.trim();
  const drive = /^[a-zA-Z]:[\\/]/.test(trimmed);
  const head = drive ? trimmed.slice(0, 3) : "";
  const tail = drive ? trimmed.slice(3) : trimmed;
  const cut = tail.search(/[\s:?#]/);
  return cut === -1 ? trimmed : head + tail.slice(0, cut);
}

/** True when this path names a file the chat can draw rather than tokenise. */
export function isImagePath(path: string | undefined): boolean {
  if (!path) return false;
  const clean = stripSelector(path);
  const dot = clean.lastIndexOf(".");
  if (dot <= 0) return false;
  return IMAGE_EXTENSIONS.has(clean.slice(dot + 1).toLowerCase());
}

/**
 * Reads an image through the plugin's own daemon-side RPC.
 *
 * Null while the read is in flight. A failure resolves to a record carrying
 * the reason rather than throwing, so a missing file shows its message in the
 * card instead of taking the timeline down.
 */
export function useImageFile(path: string | undefined, cwd: string | null): ImageFile | null {
  const load = useRpc(imageRpc);
  const [file, setFile] = useState<ImageFile | null>(null);
  const wanted = path !== undefined && isImagePath(path);

  useEffect(() => {
    if (!wanted || path === undefined) {
      setFile(null);
      return;
    }
    let cancelled = false;
    setFile(null);
    load({ cwd: cwd ?? "", path })
      .then((result) => {
        if (cancelled) return;
        setFile({
          dataUri: result.dataUri,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          error: result.error,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFile({
          dataUri: null,
          width: null,
          height: null,
          bytes: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [load, path, cwd, wanted]);

  return wanted ? file : null;
}
