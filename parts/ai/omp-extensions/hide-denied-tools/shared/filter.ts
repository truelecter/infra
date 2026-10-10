export type ApprovalPolicy = Record<string, unknown>;

/**
 * Returns the active tool list without tools whose user approval policy is `deny`, or null
 * when nothing needs to change (so callers can skip resetting the tool list).
 */
export function withoutDenied(
  active: readonly string[],
  approval: ApprovalPolicy,
): string[] | null {
  const kept = active.filter((name) => approval[name] !== "deny");
  return kept.length === active.length ? null : kept;
}
