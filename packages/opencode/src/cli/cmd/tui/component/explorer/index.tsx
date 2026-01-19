import { Show, Switch, Match, createSignal, createMemo } from "solid-js"
import { useTheme } from "../../context/theme"
import { FileTree } from "./file-tree"
import { GitChanges } from "./git-changes"
import { useExplorer } from "../../context/explorer"
import { useKeyboard } from "@opentui/solid"
import { usePromptRef } from "../../context/prompt"
import { useSync } from "../../context/sync"

export type ExplorerTab = "explorer" | "changes"

export function ExplorerSidebar() {
  const { theme } = useTheme()
  const explorer = useExplorer()
  const promptRef = usePromptRef()
  const sync = useSync()
  const [resizing, setResizing] = createSignal(false)
  const branch = createMemo(() => sync.data.vcs?.branch)

  useKeyboard((evt) => {
    const ctrl = evt.ctrl && !evt.meta && !evt.shift

    if (ctrl && evt.name === "e") {
      evt.preventDefault?.()
      if (explorer.visible()) {
        explorer.setVisible(false)
        explorer.setSelected(undefined)
        explorer.setFocused(false)
      } else {
        explorer.setVisible(true)
        explorer.setFocused(true)
        promptRef.current?.blur()
      }
      return
    }

    if (ctrl && evt.name === "b") {
      evt.preventDefault?.()
      if (!explorer.visible()) {
        explorer.setVisible(true)
      }
      explorer.setFocused(true)
      promptRef.current?.blur()
      return
    }

    if (!explorer.visible() || !explorer.focused()) return

    if (evt.name === "escape") {
      evt.preventDefault?.()
      if (explorer.selected()) {
        explorer.setSelected(undefined)
      } else {
        explorer.setFocused(false)
        promptRef.current?.focus()
      }
      return
    }

    if (evt.name === "i") {
      evt.preventDefault?.()
      explorer.setFocused(false)
      promptRef.current?.focus()
      return
    }

    if (evt.name === "1") {
      evt.preventDefault?.()
      explorer.setTab("explorer")
      explorer.setFocusIndex(0)
    } else if (evt.name === "2") {
      evt.preventDefault?.()
      explorer.setTab("changes")
      explorer.setFocusIndex(0)
    } else if (evt.name === "tab") {
      evt.preventDefault?.()
      explorer.setTab(explorer.tab() === "explorer" ? "changes" : "explorer")
      explorer.setFocusIndex(0)
    } else if (evt.name === "[") {
      evt.preventDefault?.()
      explorer.adjustSidebarWidth(-5)
    } else if (evt.name === "]") {
      evt.preventDefault?.()
      explorer.adjustSidebarWidth(5)
    }
  })

  const handleClose = () => {
    explorer.setVisible(false)
    explorer.setSelected(undefined)
  }

  const handleFocus = () => {
    explorer.setFocused(true)
    promptRef.current?.blur()
  }

  const handleOpen = () => {
    explorer.setVisible(true)
    explorer.setFocused(true)
    promptRef.current?.blur()
  }

  return (
    <>
      <Show when={!explorer.visible()}>
        <box
          width={2}
          flexShrink={0}
          flexDirection="column"
          justifyContent="center"
          backgroundColor={theme.backgroundPanel}
          onMouseDown={handleOpen}
        >
          <text fg={theme.textMuted}>▶</text>
        </box>
      </Show>
      <Show when={explorer.visible()}>
        <box flexDirection="row" flexShrink={0}>
          <box
            backgroundColor={explorer.focused() ? theme.backgroundPanel : theme.background}
            width={explorer.sidebarWidth()}
            flexShrink={0}
            flexDirection="column"
            onMouseDown={handleFocus}
            border={explorer.focused() ? ["left"] : []}
            borderColor={explorer.focused() ? theme.primary : undefined}
          >
            <box flexDirection="row" paddingLeft={1} paddingRight={1} paddingTop={1} gap={1}>
              <box onMouseDown={handleClose}>
                <text fg={theme.textMuted}>✕</text>
              </box>
              <Show when={branch()}>
                <text fg={theme.primary}>{branch()}</text>
              </Show>
              <box flexGrow={1} />
              <box flexDirection="row" gap={1}>
                <box
                  onMouseDown={() => {
                    explorer.setTab("explorer")
                    explorer.setFocusIndex(0)
                  }}
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={explorer.tab() === "explorer" ? theme.primary : undefined}
                >
                  <text fg={explorer.tab() === "explorer" ? theme.background : theme.text}>
                    <span style={{ fg: explorer.tab() === "explorer" ? theme.background : theme.textMuted }}>1</span>{" "}
                    Explorer
                  </text>
                </box>
                <box
                  onMouseDown={() => {
                    explorer.setTab("changes")
                    explorer.setFocusIndex(0)
                  }}
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={explorer.tab() === "changes" ? theme.primary : undefined}
                >
                  <text fg={explorer.tab() === "changes" ? theme.background : theme.text}>
                    <span style={{ fg: explorer.tab() === "changes" ? theme.background : theme.textMuted }}>2</span>{" "}
                    Changes
                  </text>
                </box>
              </box>
            </box>
            <box height={1} />
            <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1}>
              <Switch>
                <Match when={explorer.tab() === "explorer"}>
                  <FileTree />
                </Match>
                <Match when={explorer.tab() === "changes"}>
                  <GitChanges />
                </Match>
              </Switch>
            </scrollbox>
            <box paddingLeft={1} paddingRight={1} paddingBottom={1}>
              <text fg={theme.textMuted}>
                {explorer.focused() ? "↑↓ nav · i input · [/] resize · ctrl+e close" : "ctrl+b focus"}
              </text>
            </box>
          </box>
          <box
            width={1}
            flexShrink={0}
            backgroundColor={resizing() ? theme.primary : theme.border}
            onMouseDown={() => setResizing(true)}
            onMouseUp={() => setResizing(false)}
            onMouseMove={(evt) => {
              if (resizing()) {
                explorer.adjustSidebarWidth(evt.x > 0 ? 1 : -1)
              }
            }}
          >
            <text fg={theme.textMuted}>│</text>
          </box>
        </box>
      </Show>
    </>
  )
}
