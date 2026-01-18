import { For, Show, createMemo, createEffect } from "solid-js"
import { useTheme } from "../../context/theme"
import { useExplorer } from "../../context/explorer"
import { useKeyboard } from "@opentui/solid"
import { usePromptRef } from "../../context/prompt"

const NAV_KEYS = new Set(["up", "down", "return", "p", "n"])

export function GitChanges() {
  const { theme } = useTheme()
  const explorer = useExplorer()
  const promptRef = usePromptRef()

  const changes = createMemo(() => explorer.sessionChanges())

  useKeyboard((evt) => {
    if (!explorer.visible() || !explorer.focused() || explorer.tab() !== "changes") return
    if (!evt.name || !NAV_KEYS.has(evt.name)) return

    const list = changes()
    const idx = explorer.focusIndex()

    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      evt.preventDefault?.()
      explorer.setFocusIndex(Math.max(0, idx - 1))
    } else if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      evt.preventDefault?.()
      explorer.setFocusIndex(Math.min(list.length - 1, idx + 1))
    } else if (evt.name === "return") {
      evt.preventDefault?.()
      const file = list[idx]
      if (file) {
        explorer.setSelected({ path: file.file, type: "file" })
      }
    }
  })

  createEffect(() => {
    const list = changes()
    if (explorer.focusIndex() >= list.length) {
      explorer.setFocusIndex(Math.max(0, list.length - 1))
    }
  })

  return (
    <box flexDirection="column">
      <Show when={changes().length === 0}>
        <text fg={theme.textMuted}>No changes this session</text>
      </Show>
      <For each={changes()}>
        {(file, index) => {
          const isFocused = createMemo(
            () => explorer.focusIndex() === index() && explorer.tab() === "changes" && explorer.focused(),
          )
          const isSelected = createMemo(() => explorer.selected()?.path === file.file)

          const handleClick = () => {
            explorer.setFocused(true)
            promptRef.current?.blur()
            explorer.setFocusIndex(index())
            explorer.setSelected({ path: file.file, type: "file" })
          }

          return (
            <box
              flexDirection="row"
              gap={1}
              onMouseDown={handleClick}
              backgroundColor={isFocused() ? theme.backgroundElement : isSelected() ? theme.backgroundPanel : undefined}
            >
              <text fg={theme.warning} flexShrink={0}>
                M
              </text>
              <text fg={theme.text} wrapMode="none" flexGrow={1}>
                {file.file}
              </text>
              <box flexDirection="row" gap={1} flexShrink={0}>
                <Show when={file.additions > 0}>
                  <text fg={theme.success}>+{file.additions}</text>
                </Show>
                <Show when={file.deletions > 0}>
                  <text fg={theme.error}>-{file.deletions}</text>
                </Show>
              </box>
            </box>
          )
        }}
      </For>
    </box>
  )
}
