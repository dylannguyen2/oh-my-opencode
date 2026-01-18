import { createSignal, createMemo, Show, For, onMount, onCleanup } from "solid-js"
import { useLocal, type LocalFile } from "@/context/local"
import { useSync } from "@/context/sync"
import { useFile } from "@/context/file"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { TextField } from "@opencode-ai/ui/text-field"
import FileTree from "./file-tree"

type ExplorerTab = "files" | "changes"

export function ExplorerPanel(props: { onFileSelect?: (path: string) => void; class?: string }) {
  const local = useLocal()
  const sync = useSync()
  const file = useFile()

  const [activeTab, setActiveTab] = createSignal<ExplorerTab>("files")
  const [searchQuery, setSearchQuery] = createSignal("")
  const [searchResults, setSearchResults] = createSignal<string[]>([])
  const [isSearching, setIsSearching] = createSignal(false)
  const [explorerExpanded, setExplorerExpanded] = createSignal(true)
  const [changesExpanded, setChangesExpanded] = createSignal(true)

  let searchInputRef: HTMLInputElement | undefined
  let explorerRef: HTMLDivElement | undefined

  const sessionId = createMemo(() => {
    const path = window.location.pathname
    const match = path.match(/\/session\/([^/]+)/)
    return match?.[1]
  })

  const changes = createMemo(() => {
    const id = sessionId()
    if (!id) return []
    return sync.data.session_diff[id] ?? []
  })

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await file.searchFiles(query)
      setSearchResults(results.slice(0, 50))
    } catch (e) {
      console.error("Search failed:", e)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleFileClick = (node: LocalFile) => {
    props.onFileSelect?.(node.path)
  }

  const handleChangeClick = (filePath: string) => {
    props.onFileSelect?.(filePath)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "/" && !searchQuery()) {
      e.preventDefault()
      searchInputRef?.focus()
    }
    if (e.key === "Escape") {
      setSearchQuery("")
      setSearchResults([])
      searchInputRef?.blur()
    }
  }

  onMount(() => {
    explorerRef?.addEventListener("keydown", handleKeyDown)
    local.file.expand("")
  })

  onCleanup(() => {
    explorerRef?.removeEventListener("keydown", handleKeyDown)
  })

  const collapseAll = () => {
    Object.keys(local.file.children("")).forEach((path) => {
      local.file.collapse(path)
    })
  }

  return (
    <div ref={explorerRef} class={`flex flex-col h-full bg-background-stronger ${props.class ?? ""}`} tabIndex={0}>
      <div class="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-weak-base">
        <div class="flex items-center gap-1">
          <button
            classList={{
              "px-2 py-1 text-12-medium rounded transition-colors": true,
              "bg-surface-base-active text-text-strong": activeTab() === "files",
              "text-text-weak hover:text-text-base": activeTab() !== "files",
            }}
            onClick={() => setActiveTab("files")}
          >
            Explorer
          </button>
          <button
            classList={{
              "px-2 py-1 text-12-medium rounded transition-colors": true,
              "bg-surface-base-active text-text-strong": activeTab() === "changes",
              "text-text-weak hover:text-text-base": activeTab() !== "changes",
            }}
            onClick={() => setActiveTab("changes")}
          >
            Changes
            <Show when={changes().length > 0}>
              <span class="ml-1 px-1.5 py-0.5 text-10-medium bg-surface-info-base rounded-full">
                {changes().length}
              </span>
            </Show>
          </button>
        </div>
        <div class="flex items-center gap-1">
          <Tooltip value="Collapse All" placement="bottom">
            <IconButton icon="collapse" variant="ghost" size="normal" onClick={collapseAll} />
          </Tooltip>
        </div>
      </div>

      <div class="shrink-0 px-2 py-2">
        <TextField
          ref={searchInputRef}
          placeholder="Search files... (press /)"
          value={searchQuery()}
          onInput={(e) => handleSearch(e.currentTarget.value)}
          class="w-full"
          size="small"
        />
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto">
        <Show when={searchQuery()}>
          <div class="px-2 py-1">
            <Show when={isSearching()}>
              <div class="text-12-regular text-text-weak px-2 py-4">Searching...</div>
            </Show>
            <Show when={!isSearching() && searchResults().length === 0}>
              <div class="text-12-regular text-text-weak px-2 py-4">No files found</div>
            </Show>
            <Show when={!isSearching() && searchResults().length > 0}>
              <div class="text-10-medium text-text-weak px-2 py-1 uppercase">{searchResults().length} results</div>
              <For each={searchResults()}>
                {(path) => (
                  <button
                    class="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-surface-raised-base-hover rounded text-12-regular text-text-base truncate"
                    onClick={() => props.onFileSelect?.(path)}
                  >
                    <Icon name="code" size="small" class="shrink-0 text-icon-weak" />
                    <span class="truncate">{path}</span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </Show>

        <Show when={!searchQuery()}>
          <Show when={activeTab() === "files"}>
            <Collapsible open={explorerExpanded()} onOpenChange={setExplorerExpanded} class="w-full">
              <Collapsible.Trigger class="flex items-center gap-1 w-full px-2 py-1.5 text-11-medium text-text-weak uppercase hover:bg-surface-raised-base-hover">
                <Collapsible.Arrow class="text-icon-weak" />
                <span>Files</span>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <FileTree path="" onFileClick={handleFileClick} class="px-1" />
              </Collapsible.Content>
            </Collapsible>
          </Show>

          <Show when={activeTab() === "changes"}>
            <Collapsible open={changesExpanded()} onOpenChange={setChangesExpanded} class="w-full">
              <Collapsible.Trigger class="flex items-center gap-1 w-full px-2 py-1.5 text-11-medium text-text-weak uppercase hover:bg-surface-raised-base-hover">
                <Collapsible.Arrow class="text-icon-weak" />
                <span>Changed Files ({changes().length})</span>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Show when={changes().length === 0}>
                  <div class="px-4 py-4 text-12-regular text-text-weak">No changes in this session</div>
                </Show>
                <div class="flex flex-col gap-0.5 px-1">
                  <For each={changes()}>
                    {(change) => {
                      const isNew = change.additions > 0 && change.deletions === 0
                      const isDeleted = change.deletions > 0 && change.additions === 0
                      return (
                        <button
                          class="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-surface-raised-base-hover rounded group"
                          onClick={() => handleChangeClick(change.file)}
                        >
                          <Icon
                            name={isNew ? "plus" : isDeleted ? "dash" : "edit"}
                            size="small"
                            classList={{
                              "shrink-0": true,
                              "text-text-diff-insert-base": isNew,
                              "text-text-diff-delete-base": isDeleted,
                              "text-text-warning-base": !isNew && !isDeleted,
                            }}
                          />
                          <span class="text-12-regular text-text-base truncate flex-1">{change.file}</span>
                          <span class="text-10-regular text-text-weak opacity-0 group-hover:opacity-100">
                            <Show when={change.additions > 0}>
                              <span class="text-text-diff-insert-base">+{change.additions}</span>
                            </Show>
                            <Show when={change.deletions > 0}>
                              <span class="text-text-diff-delete-base ml-1">-{change.deletions}</span>
                            </Show>
                          </span>
                        </button>
                      )
                    }}
                  </For>
                </div>
              </Collapsible.Content>
            </Collapsible>
          </Show>
        </Show>
      </div>

      <div class="shrink-0 px-3 py-2 border-t border-border-weak-base">
        <div class="flex items-center gap-3 text-10-regular text-text-weak">
          <span>
            <kbd class="px-1 py-0.5 bg-surface-base rounded">/</kbd> Search
          </span>
          <span>
            <kbd class="px-1 py-0.5 bg-surface-base rounded">Esc</kbd> Clear
          </span>
        </div>
      </div>
    </div>
  )
}

export default ExplorerPanel
