import type { ViewProps } from "react-native";

/**
 * Combines surface markers that each carry a `dataSet`.
 *
 * React Native Web turns `dataSet` into `data-*` attributes, and JSX spreading
 * replaces whole props: `{...frosted} {...selectionSurface}` keeps only the
 * last `dataSet`, so the earlier marker silently never reaches the DOM. Every
 * marker therefore goes through here, where the maps are merged rather than
 * overwritten.
 */
export function surfaceProps(...parts: ViewProps[]): ViewProps {
  const merged: Record<string, unknown> = {};
  const dataSet: Record<string, unknown> = {};

  for (const part of parts) {
    for (const [key, value] of Object.entries(part as Record<string, unknown>)) {
      if (key === "dataSet") {
        Object.assign(dataSet, value as Record<string, unknown>);
        continue;
      }
      merged[key] = value;
    }
  }

  if (Object.keys(dataSet).length > 0) merged.dataSet = dataSet;
  return merged as ViewProps;
}
