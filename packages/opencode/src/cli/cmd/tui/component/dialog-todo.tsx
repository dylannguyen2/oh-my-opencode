import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useSync } from "@tui/context/sync"
import { For, Show, createMemo } from "solid-js"
import { TodoItem } from "./todo-item"

export interface DialogTodoProps {
  sessionID: string
}

export function DialogTodo(props: DialogTodoProps) {
  const sync = useSync()
  const { theme } = useTheme()

  const todos = createMemo(() => sync.data.todo[props.sessionID] ?? [])
  const pending = createMemo(() => todos().filter((t) => t.status === "pending"))
  const inProgress = createMemo(() => todos().filter((t) => t.status === "in_progress"))
  const completed = createMemo(() => todos().filter((t) => t.status === "completed"))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Todo List
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <Show when={todos().length === 0}>
        <text fg={theme.textMuted}>No tasks in this session</text>
      </Show>
      <Show when={todos().length > 0}>
        <text fg={theme.textMuted}>
          {completed().length}/{todos().length} completed
        </text>
        <Show when={inProgress().length > 0}>
          <box>
            <text fg={theme.warning} attributes={TextAttributes.BOLD}>
              In Progress
            </text>
            <For each={inProgress()}>{(todo) => <TodoItem status={todo.status} content={todo.content} />}</For>
          </box>
        </Show>
        <Show when={pending().length > 0}>
          <box>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>
              Pending
            </text>
            <For each={pending()}>{(todo) => <TodoItem status={todo.status} content={todo.content} />}</For>
          </box>
        </Show>
        <Show when={completed().length > 0}>
          <box>
            <text fg={theme.success} attributes={TextAttributes.BOLD}>
              Completed
            </text>
            <For each={completed()}>{(todo) => <TodoItem status={todo.status} content={todo.content} />}</For>
          </box>
        </Show>
      </Show>
    </box>
  )
}
