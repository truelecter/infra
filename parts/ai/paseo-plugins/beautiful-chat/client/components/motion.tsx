import React, { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Platform, View } from "react-native";

const useNativeDriver = Platform.OS !== "web";

interface RotateProps {
  children: ReactNode;
  /** Rotated to `degrees` when true, back to 0 when false. */
  active: boolean;
  degrees?: number;
  durationMs?: number;
}

/**
 * Turns its child between two angles.
 *
 * Built for disclosure arrows. Swapping a chevron-up glyph for a chevron-down
 * one tells the reader the state changed but not which way it went; rotating
 * the same mark shows the direction, which is the whole point of the control.
 */
export function Rotate({ children, active, degrees = 180, durationMs = 180 }: RotateProps) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [active, durationMs, progress]);

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${degrees}deg`],
  });

  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

interface PopProps {
  children: ReactNode;
  /** Each new truthy value fires one pop. */
  trigger: unknown;
  depth?: number;
  durationMs?: number;
}

/**
 * Scales its child up and back once, when `trigger` changes.
 *
 * Confirmation for an action whose result is invisible — copying to the
 * clipboard produces no change on screen, so the only feedback is the control
 * reacting. A single pop reads as acknowledgement; a loop would read as a
 * pending state.
 */
export function Pop({ children, trigger, depth = 1.35, durationMs = 260 }: PopProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(trigger);

  useEffect(() => {
    // Skip the first render: nothing has happened yet to acknowledge.
    if (previous.current === trigger) return;
    previous.current = trigger;
    if (!trigger) {
      scale.setValue(1);
      return;
    }
    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: depth,
        duration: durationMs * 0.35,
        easing: Easing.out(Easing.quad),
        useNativeDriver,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver,
      }),
    ]);
    animation.start();
    return () => {
      animation.stop();
    };
  }, [trigger, depth, durationMs, scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

interface GlowProps {
  children: ReactNode;
  color: string;
  /** Diameter of the halo. Sized past the child so the edge stays soft. */
  size: number;
  active?: boolean;
  durationMs?: number;
}

/**
 * Breathes a soft halo behind its child.
 *
 * Used on the step the model is writing now. The marker itself stays a plain
 * circle, so the state is carried by light around it rather than by a second
 * symbol competing with the finished steps' ticks. The halo is absolutely
 * positioned and therefore never affects the row's height.
 */
export function Glow({ children, color, size, active = true, durationMs = 1800 }: GlowProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: durationMs / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: durationMs / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [active, durationMs, pulse]);

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.34],
  });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.25],
  });

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {active ? (
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity,
            transform: [{ scale }],
          }}
        />
      ) : null}
      {children}
    </View>
  );
}
