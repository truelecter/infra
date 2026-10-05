import type { PluginClientContext } from "@getpaseo/plugin/client";
import { trackTaskPills } from "./client/pills.ts";
import { TaskListItem, TasksPopover } from "./client/tasks.tsx";
import { todoListSchema } from "./client/todos.ts";
import { TASK_LIST_KIND, transformTodoToolCall } from "./client/transform.ts";

export default function contribute(client: PluginClientContext) {
  const removeTransformer = client.addTimelineTransformer({
    id: "todowrite2-task-list",
    query: { itemType: "tool_call" },
    transform: transformTodoToolCall,
  });
  const removeRenderer = client.addTimelineRenderer({
    kind: TASK_LIST_KIND,
    version: 1,
    schema: todoListSchema,
    Component: TaskListItem,
  });
  const stopPills = trackTaskPills(client, TasksPopover);
  return () => {
    stopPills();
    removeRenderer();
    removeTransformer();
  };
}
