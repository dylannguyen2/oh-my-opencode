import { createResource, For, Show, createMemo, createEffect, createSignal } from "solid-js"
import { useTheme } from "../../context/theme"
import { useSDK } from "../../context/sdk"
import { useExplorer } from "../../context/explorer"
import { useKeyboard } from "@opentui/solid"
import { usePromptRef } from "../../context/prompt"
import type { File } from "@/file"

type FlatNode = {
  path: string
  name: string
  type: "file" | "directory"
  depth: number
  ignored: boolean
}

const NAV_KEYS = new Set(["up", "down", "left", "right", "return", "p", "n"])

const DOUBLE_CLICK_MS = 200

export function FileTree() {
  const { theme } = useTheme()
  const sdk = useSDK()
  const explorer = useExplorer()
  const promptRef = usePromptRef()
  const [lastClick, setLastClick] = createSignal<{ path: string; time: number } | undefined>()
  let pendingSelection: ReturnType<typeof setTimeout> | undefined

  const [root] = createResource(async () => {
    const result = await sdk.client.file.list({ path: "" })
    return result.data ?? []
  })

  const [expandedDirs] = createResource(
    () => Array.from(explorer.expanded()),
    async (paths) => {
      const results: Record<string, File.Node[]> = {}
      for (const p of paths) {
        const result = await sdk.client.file.list({ path: p })
        results[p] = result.data ?? []
      }
      return results
    },
  )

  const flatList = createMemo((): FlatNode[] => {
    const nodes: FlatNode[] = []
    const expandedSet = explorer.expanded()
    const dirContents = expandedDirs() ?? {}

    const addNodes = (items: File.Node[], depth: number) => {
      for (const item of items) {
        nodes.push({
          path: item.path,
          name: item.name,
          type: item.type,
          depth,
          ignored: item.ignored,
        })
        if (item.type === "directory" && expandedSet.has(item.path)) {
          const children = dirContents[item.path]
          if (children) {
            addNodes(children, depth + 1)
          }
        }
      }
    }

    if (root()) {
      addNodes(root()!, 0)
    }
    return nodes
  })

  useKeyboard((evt) => {
    if (!explorer.visible() || !explorer.focused() || explorer.tab() !== "explorer") return
    if (!evt.name || !NAV_KEYS.has(evt.name)) return

    const list = flatList()
    const idx = explorer.focusIndex()

    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      evt.preventDefault?.()
      explorer.setFocusIndex(Math.max(0, idx - 1))
    } else if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      evt.preventDefault?.()
      explorer.setFocusIndex(Math.min(list.length - 1, idx + 1))
    } else if (evt.name === "return") {
      evt.preventDefault?.()
      const node = list[idx]
      if (node) {
        if (node.type === "directory") {
          explorer.toggleExpanded(node.path)
          explorer.setSelected({ path: node.path, type: node.type })
        } else {
          const currentSelected = explorer.selected()
          if (currentSelected?.path === node.path) {
            promptRef.current?.addFile(node.path, { focus: false })
          } else {
            explorer.setSelected({ path: node.path, type: node.type })
          }
        }
      }
    } else if (evt.name === "right") {
      evt.preventDefault?.()
      const node = list[idx]
      if (node?.type === "directory" && !explorer.expanded().has(node.path)) {
        explorer.toggleExpanded(node.path)
      }
    } else if (evt.name === "left") {
      evt.preventDefault?.()
      const node = list[idx]
      if (node?.type === "directory" && explorer.expanded().has(node.path)) {
        explorer.toggleExpanded(node.path)
      }
    }
  })

  createEffect(() => {
    const list = flatList()
    if (explorer.focusIndex() >= list.length) {
      explorer.setFocusIndex(Math.max(0, list.length - 1))
    }
  })

  return (
    <box flexDirection="column">
      <Show when={root.loading}>
        <text fg={theme.textMuted}>Loading...</text>
      </Show>
      <Show when={root.error}>
        <text fg={theme.error}>Error loading files</text>
      </Show>
      <For each={flatList()}>
        {(node, index) => {
          const isFocused = createMemo(
            () => explorer.focusIndex() === index() && explorer.tab() === "explorer" && explorer.focused(),
          )
          const isSelected = createMemo(() => explorer.selected()?.path === node.path)
          const isExpanded = createMemo(() => node.type === "directory" && explorer.expanded().has(node.path))

          const icon = createMemo(() => {
            if (node.type === "directory") {
              return isExpanded() ? "▼" : "▶"
            }
            return " "
          })

          const handleClick = () => {
            const now = Date.now()
            const last = lastClick()

            if (last && last.path === node.path && now - last.time < DOUBLE_CLICK_MS) {
              if (pendingSelection) {
                clearTimeout(pendingSelection)
                pendingSelection = undefined
              }
              if (node.type === "file") {
                promptRef.current?.addFile(node.path)
              }
              setLastClick(undefined)
            } else {
              setLastClick({ path: node.path, time: now })
              explorer.setFocused(true)
              promptRef.current?.blur()
              explorer.setFocusIndex(index())
              if (node.type === "directory") {
                explorer.toggleExpanded(node.path)
              } else {
                if (pendingSelection) clearTimeout(pendingSelection)
                pendingSelection = setTimeout(() => {
                  explorer.setSelected({ path: node.path, type: node.type })
                  pendingSelection = undefined
                }, DOUBLE_CLICK_MS)
              }
            }
          }

          const indent = "  ".repeat(node.depth)

          return (
            <box
              flexDirection="row"
              onMouseDown={handleClick}
              backgroundColor={isFocused() ? theme.backgroundElement : isSelected() ? theme.backgroundPanel : undefined}
            >
              <text fg={node.ignored ? theme.textMuted : theme.text} wrapMode="none">
                {indent}
                <span style={{ fg: theme.textMuted }}>{icon()}</span>{" "}
                {node.type === "directory" ? <span style={{ fg: theme.primary }}>{node.name}</span> : node.name}
              </text>
            </box>
          )
        }}
      </For>
    </box>
  )
}
