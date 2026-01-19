import { Show, createMemo, For, createSignal, createEffect } from "solid-js"
import { useTheme } from "../../context/theme"
import { useExplorer } from "../../context/explorer"
import { usePromptRef } from "../../context/prompt"
import { useKeyboard } from "@opentui/solid"
import { structuredPatch, applyPatch } from "diff"
import { useSDK } from "../../context/sdk"

export function FilePreview() {
  const { theme } = useTheme()
  const explorer = useExplorer()
  const promptRef = usePromptRef()
  const sdk = useSDK()
  const [resizing, setResizing] = createSignal(false)
  const [hunkIndex, setHunkIndex] = createSignal(0)

  const selected = createMemo(() => explorer.selected())
  const content = createMemo(() => explorer.previewContent())
  const loading = createMemo(() => explorer.previewLoading())

  const sessionDiff = createMemo(() => {
    const sel = selected()
    if (!sel) return undefined
    return explorer.sessionChanges().find((d) => d.file === sel.path)
  })

  const gitPatch = createMemo(() => {
    const c = content()
    if (!c?.patch || c.patch.hunks.length === 0) return undefined
    return {
      ...c.patch,
      oldHeader: c.patch.oldHeader ?? "",
      newHeader: c.patch.newHeader ?? "",
    }
  })

  const rawDiff = createMemo(() => content()?.diff)

  const diffPatch = createMemo(() => {
    const git = gitPatch()
    if (git) return git

    const diff = sessionDiff()
    if (!diff) return undefined
    return structuredPatch(diff.file, diff.file, diff.before, diff.after, "", "", { context: 3 })
  })

  const revertHunk = async (idx: number) => {
    const patch = diffPatch()
    const sel = selected()
    if (!patch || !sel) return

    const hunk = patch.hunks[idx]
    if (!hunk) return

    const currentContent = content()?.content ?? sessionDiff()?.after
    if (currentContent === undefined) return

    const reversed = {
      ...patch,
      hunks: [
        {
          ...hunk,
          oldStart: hunk.newStart,
          oldLines: hunk.newLines,
          newStart: hunk.oldStart,
          newLines: hunk.oldLines,
          lines: hunk.lines.map((line) => {
            if (line.startsWith("+")) return "-" + line.slice(1)
            if (line.startsWith("-")) return "+" + line.slice(1)
            return line
          }),
        },
      ],
    }

    const result = applyPatch(currentContent, reversed)
    if (result === false) return

    await sdk.client.file.write({ path: sel.path, content: result })
    explorer.setSelected(undefined)
    setTimeout(() => explorer.setSelected(sel), 50)
  }

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
    } else if (hasDiff()) {
      if (evt.name === "j" || evt.name === "down") {
        evt.preventDefault?.()
        setHunkIndex((i) => Math.min(i + 1, hunkCount() - 1))
      } else if (evt.name === "k" || evt.name === "up") {
        evt.preventDefault?.()
        setHunkIndex((i) => Math.max(i - 1, 0))
      } else if (evt.name === "r") {
        evt.preventDefault?.()
        revertHunk(hunkIndex())
      }
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

  const hunkCount = createMemo(() => diffPatch()?.hunks.length ?? 0)

  createEffect(() => {
    const count = hunkCount()
    if (hunkIndex() >= count) setHunkIndex(Math.max(0, count - 1))
  })

  createEffect(() => {
    selected()
    setHunkIndex(0)
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
        <Show when={loading() && !sessionDiff() && !gitPatch()}>
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg={theme.textMuted}>Loading...</text>
          </box>
        </Show>
        <Show when={!loading() || sessionDiff() || gitPatch() || rawDiff()}>
          <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1}>
            <Show
              when={hasDiff()}
              fallback={
                <Show
                  when={rawDiff()}
                  fallback={
                    <Show
                      when={content()?.content !== undefined || sessionDiff()?.after !== undefined}
                      fallback={<text fg={theme.textMuted}>No content to display</text>}
                    >
                      <code
                        filetype={filetype()}
                        syntaxStyle={useTheme().syntax()}
                        content={content()?.content ?? sessionDiff()?.after ?? ""}
                        fg={theme.text}
                      />
                    </Show>
                  }
                >
                  <RawDiffView diff={rawDiff()!} />
                </Show>
              }
            >
              <DiffView patch={diffPatch()!} selectedHunk={hunkIndex()} />
            </Show>
          </scrollbox>
        </Show>
        <box paddingLeft={1} paddingRight={1} paddingBottom={1}>
          <text fg={theme.textMuted}>
            {hasDiff() ? "j/k hunks · r revert · {/} resize · esc close" : "enter @ref · {/} resize · esc close"}
          </text>
        </box>
      </box>
    </Show>
  )
}

function DiffView(props: { patch: ReturnType<typeof structuredPatch>; selectedHunk?: number }) {
  const { theme } = useTheme()

  return (
    <box flexDirection="column">
      <For each={props.patch.hunks}>
        {(hunk, index) => {
          const isSelected = () => props.selectedHunk === index()
          return (
            <box flexDirection="column" marginBottom={1}>
              <box
                backgroundColor={isSelected() ? theme.primary : theme.backgroundElement}
                flexDirection="row"
                justifyContent="space-between"
              >
                <text fg={isSelected() ? theme.background : theme.textMuted}>
                  @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                </text>
                <Show when={isSelected()}>
                  <text fg={theme.background}> r revert</text>
                </Show>
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
          )
        }}
      </For>
    </box>
  )
}

function RawDiffView(props: { diff: string }) {
  const { theme } = useTheme()
  const lines = createMemo(() => props.diff.split("\n"))

  return (
    <box flexDirection="column">
      <For each={lines()}>
        {(line) => {
          const isAdded = line.startsWith("+") && !line.startsWith("+++")
          const isRemoved = line.startsWith("-") && !line.startsWith("---")
          const isHeader =
            line.startsWith("@@") ||
            line.startsWith("diff ") ||
            line.startsWith("index ") ||
            line.startsWith("---") ||
            line.startsWith("+++")
          return (
            <box
              backgroundColor={isAdded ? theme.diffAddedBg : isRemoved ? theme.diffRemovedBg : undefined}
              width="100%"
            >
              <text
                fg={isHeader ? theme.textMuted : isAdded ? theme.diffAdded : isRemoved ? theme.diffRemoved : theme.text}
                wrapMode="none"
              >
                {line}
              </text>
            </box>
          )
        }}
      </For>
    </box>
  )
}
