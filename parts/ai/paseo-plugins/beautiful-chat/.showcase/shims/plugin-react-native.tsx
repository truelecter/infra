/**
 * The published SDK ships an empty runtime for `@getpaseo/plugin/client/react-native`
 * because the host injects the real implementations. The screenshot harness runs
 * outside the host, so it supplies the small surface the components touch.
 */
import React from "react";
import {
  FlatList as RnFlatList,
  ScrollView as RnScrollView,
  Text,
  TextInput as RnTextInput,
} from "react-native";

// The host renders Lucide icons through lucide-react-native. That package pulls
// in react-native-svg, which does not bundle for this web-only harness, so the
// capture resolves the identical icon set from lucide-react instead.
import * as lucide from "lucide-react";

export function Icon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const Resolved = (lucide as Record<string, unknown>)[name] as
    | React.ComponentType<{ size?: number; color?: string }>
    | undefined;
  if (!Resolved) return <Text style={{ fontSize: size, color }}>{name.slice(0, 1)}</Text>;
  return <Resolved size={size} color={color} />;
}

export const Modal = Object.assign(
  ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  { Content: ({ children }: { children?: React.ReactNode }) => <>{children}</> },
);

export function useToast() {
  return { show: () => {}, error: () => {} };
}

export function useRevealedText(text: string): string {
  return text;
}

export const ScrollView = RnScrollView;
export const FlatList = RnFlatList;
export const TextInput = RnTextInput;

export async function copyText(): Promise<void> {}
