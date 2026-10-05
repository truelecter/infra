import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { HubCallout } from "./hub-callout";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { retireHubActivity, useHubActivity } from "../hub-activity";
import { noteTimelineItem, useIsTimelineTail } from "../timeline-tail";
import type { HubData } from "../../shared/contracts";

interface TimelineTailHubProps {
  agentId: string;
  tokens: ExtendedThemeTokens;
  /** The item drawing this, so only the newest one shows the card. */
  itemKey: string;
  /** That item's own timestamp: the tail is whichever arrived last. */
  at: number;
  /**
   * What the drawing item is. A reply means the turn moved on: the model was
   * waiting on those jobs and has now answered, so the snapshot is spent.
   */
  kind: "tool" | "reply";
}

/**
 * The running-jobs card, repeated under the newest item in the timeline.
 *
 * Every signal here is structural, not inferred. The card shows the newest
 * `hub` snapshot the timeline has carried — the same typed `details` record
 * the tool call itself renders — and it stops showing it when the timeline
 * says the snapshot is spent: a reply arriving after the snapshot means the
 * model stopped waiting.
 *
 * There is no job-status API to consult. omp's registry lives inside its own
 * process and reaches Paseo only through `hub` results, and the completion
 * notice loses its structured `details` on the way (the host flattens it to a
 * label in `providers/omp/system-notice.ts`). So this card never claims to
 * know more than the last hub call told it, and says how long ago that was.
 */
export function TimelineTailHub({ agentId, tokens, itemKey, at, kind }: TimelineTailHubProps) {
  useEffect(() => {
    noteTimelineItem(itemKey, at);
  }, [itemKey, at]);

  const isTail = useIsTimelineTail(itemKey);
  const activity = useHubActivity(agentId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { marginTop: 6 },
      }),
    [],
  );

  const data = useMemo((): HubData | null => {
    if (!activity || activity.running.length === 0) return null;
    return {
      kind: "jobs",
      data: { op: "wait", jobs: activity.running, agents: activity.agents },
    };
  }, [activity]);

  // A reply published after the snapshot proves the wait is over. Retiring it
  // rather than hiding it stops an older card republishing the same work when
  // the next turn re-renders the list.
  const spent = kind === "reply" && activity !== null && at > activity.at;
  useEffect(() => {
    if (spent) retireHubActivity(agentId, at);
  }, [spent, agentId, at]);

  if (!isTail || spent || !data) return null;

  return (
    <View style={styles.container}>
      <HubCallout data={data} tokens={tokens} />
    </View>
  );
}
