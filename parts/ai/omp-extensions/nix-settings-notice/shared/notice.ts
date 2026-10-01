// Pure logic: which setting values a runtime change touched, and how to tell the user.
import { isDeepStrictEqual } from "node:util";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** One changed leaf: `value` undefined means the setting was removed. */
export interface Change {
  path: string[];
  value: Json | undefined;
}

function isRecord(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Leaves that differ between `saved` (the config file) and `live` (OMP's in-memory global layer),
 * under `prefix`. Objects are compared key by key, so a `modelRoles` change names only the roles
 * that changed; arrays and scalars are compared whole.
 */
export function diffLeaves(saved: unknown, live: unknown, prefix: string[]): Change[] {
  if (isRecord(saved) && isRecord(live)) {
    const keys = new Set([...Object.keys(saved), ...Object.keys(live)]);
    return [...keys].sort().flatMap((key) => diffLeaves(saved[key], live[key], [...prefix, key]));
  }
  if (isDeepStrictEqual(saved, live)) return [];
  if (isRecord(live)) return diffLeaves({}, live, prefix);
  return [{ path: prefix, value: live as Json | undefined }];
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_'-]*$/;

function nixAttr(name: string): string {
  return IDENTIFIER.test(name) ? name : JSON.stringify(name).replaceAll("${", "\\${");
}

/** `value` as a Nix expression. */
export function toNix(value: Json): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value).replaceAll("${", "\\${");
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => ` ${toNix(item)}`).join("")} ]`;
  const entries = Object.entries(value).map(([key, item]) => ` ${nixAttr(key)} = ${toNix(item)};`);
  return `{${entries.join("")} }`;
}

/** The Home Manager line that makes `change` permanent. */
export function nixLine(change: Change): string {
  const attr = ["programs", "oh-my-pi", "settings", ...change.path].map(nixAttr).join(".");
  return change.value === undefined ? `remove ${attr}` : `${attr} = ${toNix(change.value)};`;
}

/** Notice for changes OMP made in memory but can't save to the read-only `configPath`. */
export function buildNotice(settingId: string, changes: Change[], configPath: string): string {
  const lines = changes.map((change) => `  ${nixLine(change)}`).join("\n");
  return `${settingId} changed for this session only: ${configPath} is managed by Home Manager, so OMP can't save it. To keep it, change your Home Manager config:\n${lines}`;
}
