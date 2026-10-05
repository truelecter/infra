import React, { useEffect, useRef, type ReactNode } from "react";
import { Animated, Platform } from "react-native";

interface BreatheProps {
  children: ReactNode;
  /** Stops the loop and rests at full size. */
  active?: boolean;
  /** Peak scale. Kept close to 1 so the icon never collides with its neighbours. */
  depth?: number;
  durationMs?: number;
}

/**
 * Scales its child in and out while work is in flight.
 *
 * The amplitude is deliberately small: an icon that visibly grows draws the eye
 * away from the text it labels, and a transform large enough to overlap
 * neighbouring content would force layout padding that only exists to absorb
 * the animation. `transform` is used rather than width or height so the child's
 * box never changes and nothing around it reflows.
 */
export function Breathe({ children, active = true, depth = 1.18, durationMs = 900 }: BreatheProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: depth,
          duration: durationMs / 2,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: durationMs / 2,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [active, depth, durationMs, scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}
