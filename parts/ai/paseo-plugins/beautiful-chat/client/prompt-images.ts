const IMAGE_URI = /^(?:data:image\/|blob:|file:\/\/)/i;
const IMAGE_URL = /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|avif|bmp|svg)(?:\?\S*)?$/i;

/** Keys that announce an attachment even when its payload is shaped oddly. */
const ATTACHMENT_KEYS = new Set(["images", "attachments", "content", "blocks", "parts"]);

export interface PromptImages {
  /** Everything renderable as an `<Image>` source. */
  readonly uris: string[];
  /**
   * True when the message clearly carries an attachment that could not be
   * turned into a URI. The caller must then leave the item to the host rather
   * than render a prompt with the attachment missing.
   */
  readonly hasUnrenderable: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Collects image sources from a user message.
 *
 * The timeline item's declared type carries only `text`, yet a pasted image
 * plainly reaches the host, so the payload is inspected structurally instead of
 * against a field list that would silently miss a rename. Anything that reads
 * as an image source is taken; anything that announces an attachment without
 * yielding one is reported, so interception can be declined and the host's own
 * bubble renders the message intact.
 */
export function extractPromptImages(item: unknown): PromptImages {
  const uris: string[] = [];
  let announced = false;

  const visit = (value: unknown, depth: number, underAttachment: boolean) => {
    if (depth > 4 || value === null || value === undefined) return;

    if (typeof value === "string") {
      if (IMAGE_URI.test(value) || IMAGE_URL.test(value)) uris.push(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1, underAttachment);
      return;
    }

    const record = asRecord(value);
    if (!record) return;

    // A base64 payload plus its mime type is an image even though neither
    // field is a URI on its own.
    const mime = record.mimeType ?? record.mediaType ?? record.type;
    const data = record.data ?? record.base64;
    if (
      typeof mime === "string" &&
      mime.startsWith("image/") &&
      typeof data === "string" &&
      data.length > 0
    ) {
      uris.push(data.startsWith("data:") ? data : `data:${mime};base64,${data}`);
      return;
    }
    if (record.type === "image") announced = true;

    for (const [key, nested] of Object.entries(record)) {
      if (key === "text") continue;
      const isAttachmentKey = ATTACHMENT_KEYS.has(key);
      if (isAttachmentKey && ((Array.isArray(nested) && nested.length > 0) || asRecord(nested))) {
        announced = true;
      }
      visit(nested, depth + 1, underAttachment || isAttachmentKey);
    }
  };

  visit(item, 0, false);

  const unique = [...new Set(uris)];
  return { uris: unique, hasUnrenderable: announced && unique.length === 0 };
}
