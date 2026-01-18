import { Show, createMemo, For, createSignal } from "solid-js"
import { useTheme } from "../../context/theme"
import { useExplorer } from "../../context/explorer"
import { usePromptRef } from "../../context/prompt"
import { useKeyboard } from "@opentui/solid"
import { structuredPatch } from "diff"

export function FilePreview() {
  const { theme } = useTheme()
  const explorer = useExplorer()
  const promptRef = usePromptRef()
  const [resizing, setResizing] = createSignal(false)

  const selected = createMemo(() => explorer.selected())
  const content = createMemo(() => explorer.previewContent())
  const loading = createMemo(() => explorer.previewLoading())

  const sessionDiff = createMemo(() => {
    const sel = selected()
    if (!sel) return undefined
    return explorer.sessionChanges().find((d) => d.file === sel.path)
  })

  const diffPatch = createMemo(() => {
    const diff = sessionDiff()
    if (!diff) return undefined
    return structuredPatch(diff.file, diff.file, diff.before, diff.after, "", "", { context: 3 })
  })

  useKeyboard((evt) => {
    if (!selected()) return
    if (!explorer.visible()) return
    if (!explorer.focused()) return

    if (evt.name === "escape") {
      evt.preventDefault?.()
      explorer.setSelected(undefined)
    } else if (evt.name === "{") {
      evt.preventDefault?.()
      explorer.adjustPreviewWidth(5)
    } else if (evt.name === "}") {
      evt.preventDefault?.()
      explorer.adjustPreviewWidth(-5)
    }
  })

  const filename = createMemo(() => {
    const sel = selected()
    if (!sel) return ""
    return sel.path.split("/").pop() ?? sel.path
  })

  const extension = createMemo(() => {
    const name = filename()
    const parts = name.split(".")
    if (parts.length > 1) return parts.pop() ?? ""
    return ""
  })

  const filetype = createMemo(() => {
    const ext = extension()
    const map: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      json: "json",
      md: "markdown",
      css: "css",
      html: "html",
      py: "python",
      rs: "rust",
      go: "go",
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      sh: "bash",
      bash: "bash",
      zsh: "bash",
    }
    return map[ext] ?? "text"
  })

  const hasDiff = createMemo(() => {
    const patch = diffPatch()
    return patch && patch.hunks.length > 0
  })

  const handleClose = () => {
    explorer.setSelected(undefined)
  }

  const handleResizeStart = () => {
    setResizing(true)
  }

  const handleResizeEnd = () => {
    setResizing(false)
  }

  return (
    <Show when={selected()?.type === "file"}>
      <box
        width={1}
        flexShrink={0}
        backgroundColor={resizing() ? theme.primary : theme.border}
        onMouseDown={handleResizeStart}
        onMouseUp={handleResizeEnd}
        onMouseMove={(evt) => {
          if (resizing()) {
            explorer.adjustPreviewWidth(evt.x < 0 ? 1 : -1)
          }
        }}
      >
        <text fg={theme.textMuted}>│</text>
      </box>
      <box width={explorer.previewWidth()} flexShrink={0} flexDirection="column" backgroundColor={theme.background}>
        <box
          flexDirection="row"
          justifyContent="space-between"
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          flexShrink={0}
          height={2}
          backgroundColor={theme.backgroundPanel}
        >
          <box flexGrow={1} flexShrink={1} overflow="hidden">
            <text fg={theme.text} wrapMode="none">
              {filename()}
            </text>
          </box>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <Show when={hasDiff()}>
              <text fg={theme.warning}>M</text>
            </Show>
            <box
              paddingLeft={1}
              onMouseDown={(e) => {
                e.stopPropagation?.()
                e.preventDefault?.()
                handleClose()
              }}
              onMouseUp={(e) => {
                e.stopPropagation?.()
              }}
            >
              <text fg={theme.textMuted}>✕ esc</text>
            </box>
          </box>
        </box>
        <Show when={loading() && !sessionDiff()}>
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg={theme.textMuted}>Loading...</text>
          </box>
        </Show>
        <Show when={!loading() || sessionDiff()}>
          <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1}>
            <Show
              when={hasDiff()}
              fallback={
                <code
                  filetype={filetype()}
                  syntaxStyle={useTheme().syntax()}
                  content={content()?.content ?? sessionDiff()?.after ?? ""}
                  fg={theme.text}
                />
              }
            >
              <DiffView patch={diffPatch()!} />
            </Show>
          </scrollbox>
        </Show>
        <box paddingLeft={1} paddingRight={1} paddingBottom={1}>
          <text fg={theme.textMuted}>{"enter @ref · {/} resize · esc close"}</text>
        </box>
      </box>
    </Show>
  )
}

function DiffView(props: { patch: ReturnType<typeof structuredPatch> }) {
  const { theme } = useTheme()

  return (
    <box flexDirection="column">
      <For each={props.patch.hunks}>
        {(hunk) => (
          <box flexDirection="column" marginBottom={1}>
            <box backgroundColor={theme.backgroundElement}>
              <text fg={theme.textMuted}>
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </text>
            </box>
            <For each={hunk.lines}>
              {(line) => {
                const prefix = line.charAt(0)
                const isAdded = prefix === "+"
                const isRemoved = prefix === "-"
                return (
                  <box
                    backgroundColor={isAdded ? theme.diffAddedBg : isRemoved ? theme.diffRemovedBg : undefined}
                    width="100%"
                  >
                    <text fg={isAdded ? theme.diffAdded : isRemoved ? theme.diffRemoved : theme.text} wrapMode="none">
                      {line}
                    </text>
                  </box>
                )
              }}
            </For>
          </box>
        )}
      </For>
    </box>
  )
}
