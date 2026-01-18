import { createSignal, createContext, useContext, type ParentProps, createResource, createMemo } from "solid-js"
import { useSDK } from "./sdk"
import { useSync } from "./sync"
import { useRoute } from "./route"
import { useKV } from "./kv"
import type { ExplorerTab } from "../component/explorer"
import type { File } from "@/file"
import type { Snapshot } from "@/snapshot"

type SelectedFile = {
  path: string
  type: "file" | "directory"
}

type ExplorerContextValue = {
  visible: () => boolean
  setVisible: (visible: boolean) => void
  focused: () => boolean
  setFocused: (focused: boolean) => void
  tab: () => ExplorerTab
  setTab: (tab: ExplorerTab) => void
  selected: () => SelectedFile | undefined
  setSelected: (file: SelectedFile | undefined) => void
  expanded: () => Set<string>
  toggleExpanded: (path: string) => void
  previewContent: () => File.Content | undefined
  previewLoading: () => boolean
  sessionChanges: () => Snapshot.FileDiff[]
  focusIndex: () => number
  setFocusIndex: (index: number) => void
  sidebarWidth: () => number
  setSidebarWidth: (width: number) => void
  previewWidth: () => number
  setPreviewWidth: (width: number) => void
  adjustSidebarWidth: (delta: number) => void
  adjustPreviewWidth: (delta: number) => void
}

const ExplorerContext = createContext<ExplorerContextValue>()

const MIN_WIDTH = 20
const MAX_WIDTH = 80
const DEFAULT_SIDEBAR_WIDTH = 35
const DEFAULT_PREVIEW_WIDTH = 50

export function ExplorerProvider(props: ParentProps) {
  const sdk = useSDK()
  const sync = useSync()
  const route = useRoute()
  const kv = useKV()

  const [visible, setVisible] = createSignal(false)
  const [focused, setFocused] = createSignal(false)
  const [tab, setTab] = createSignal<ExplorerTab>("explorer")
  const [selected, setSelected] = createSignal<SelectedFile | undefined>()
  const [expanded, setExpanded] = createSignal<Set<string>>(new Set())
  const [focusIndex, setFocusIndex] = createSignal(0)

  const sidebarWidth = () => kv.get("explorer_sidebar_width", DEFAULT_SIDEBAR_WIDTH) as number
  const previewWidth = () => kv.get("explorer_preview_width", DEFAULT_PREVIEW_WIDTH) as number

  const setSidebarWidth = (width: number) => {
    kv.set("explorer_sidebar_width", Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)))
  }

  const setPreviewWidth = (width: number) => {
    kv.set("explorer_preview_width", Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)))
  }

  const adjustSidebarWidth = (delta: number) => {
    setSidebarWidth(sidebarWidth() + delta)
  }

  const adjustPreviewWidth = (delta: number) => {
    setPreviewWidth(previewWidth() + delta)
  }

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const sessionID = createMemo(() => {
    if (route.data.type === "session") return route.data.sessionID
    return undefined
  })

  const sessionChanges = createMemo(() => {
    const id = sessionID()
    if (!id) return []
    return sync.data.session_diff[id] ?? []
  })

  const [preview] = createResource(
    () => {
      const sel = selected()
      if (!sel || sel.type !== "file") return undefined
      return sel.path
    },
    async (path) => {
      if (!path) return undefined
      const result = await sdk.client.file.read({ path })
      return result.data
    },
  )

  const value: ExplorerContextValue = {
    visible,
    setVisible: (v) => {
      setVisible(v)
      if (v) setFocused(true)
      else setFocused(false)
    },
    focused,
    setFocused,
    tab,
    setTab,
    selected,
    setSelected,
    expanded,
    toggleExpanded,
    previewContent: () => preview(),
    previewLoading: () => preview.loading,
    sessionChanges,
    focusIndex,
    setFocusIndex,
    sidebarWidth,
    setSidebarWidth,
    previewWidth,
    setPreviewWidth,
    adjustSidebarWidth,
    adjustPreviewWidth,
  }

  return <ExplorerContext.Provider value={value}>{props.children}</ExplorerContext.Provider>
}

export function useExplorer() {
  const ctx = useContext(ExplorerContext)
  if (!ctx) throw new Error("useExplorer must be used within ExplorerProvider")
  return ctx
}
