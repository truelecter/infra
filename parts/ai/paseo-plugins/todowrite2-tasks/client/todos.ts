import { z } from "zod";

export const TODO_TOOL = "todowrite2";

const todoStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);

const todoSchema = z.object({
  content: z.string(),
  status: todoStatusSchema,
});

export const todoListSchema = z.object({ todos: z.array(todoSchema) });

export type Todo = z.output<typeof todoSchema>;
export type TodoStatus = z.output<typeof todoStatusSchema>;

const toolCallSchema = z.object({
  type: z.literal("tool_call"),
  name: z.literal(TODO_TOOL),
  status: z.enum(["running", "completed", "failed", "canceled"]),
  detail: z.object({ type: z.literal("unknown"), input: z.unknown() }),
});

export interface TodoToolCall {
  status: z.output<typeof toolCallSchema>["status"];
  todos: Todo[] | null;
}

// While the call streams, OpenCode sends the input as raw JSON text.
export function readTodos(input: unknown): Todo[] | null {
  const parsed = todoListSchema.safeParse(typeof input === "string" ? parseJson(input) : input);
  return parsed.success ? parsed.data.todos : null;
}

export function readTodoToolCall(item: unknown): TodoToolCall | null {
  const parsed = toolCallSchema.safeParse(item);
  if (!parsed.success) return null;
  return { status: parsed.data.status, todos: readTodos(parsed.data.detail.input) };
}

// The list the agent last saved: only a completed call reached the tool.
export function completedTodos(item: unknown): Todo[] | null {
  const call = readTodoToolCall(item);
  return call?.status === "completed" ? call.todos : null;
}

export function latestTodos(items: readonly unknown[]): Todo[] | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const todos = completedTodos(items[index]);
    if (todos) return todos;
  }
  return null;
}

export interface TodoProgress {
  completed: number;
  total: number;
}

// Cancelled tasks are no longer part of the work, so they count toward neither side.
export function todoProgress(todos: readonly Todo[]): TodoProgress {
  const active = todos.filter((todo) => todo.status !== "cancelled");
  return {
    completed: active.filter((todo) => todo.status === "completed").length,
    total: active.length,
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
