import type { PluginTimelineTransformerContribution } from "@getpaseo/plugin/client";
import { readTodoToolCall } from "./todos.ts";

type ToolCallTransform = PluginTimelineTransformerContribution<"tool_call">["transform"];

export const TASK_LIST_KIND = "todowrite2-task-list";

// A failed or cancelled call keeps Paseo's own row, so its error stays visible.
// A running call whose input is not a complete list yet is hidden until it is.
export const transformTodoToolCall: ToolCallTransform = ({ item }) => {
  const call = readTodoToolCall(item);
  if (!call || call.status === "failed" || call.status === "canceled") return undefined;
  if (!call.todos) return call.status === "running" ? { items: [] } : undefined;
  return {
    items: [{ type: "plugin", kind: TASK_LIST_KIND, version: 1, data: { todos: call.todos } }],
  };
};
