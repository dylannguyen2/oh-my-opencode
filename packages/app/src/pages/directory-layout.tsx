import { createMemo, Show, type ParentProps } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { SDKProvider, useSDK } from "@/context/sdk"
import { SyncProvider, useSync } from "@/context/sync"
import { LocalProvider } from "@/context/local"
import { useLayout } from "@/context/layout"

import { base64Decode } from "@opencode-ai/util/encode"
import { DataProvider } from "@opencode-ai/ui/context"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { iife } from "@opencode-ai/util/iife"
import type { QuestionAnswer } from "@opencode-ai/sdk/v2"
import { ExplorerPanel } from "@/components/explorer-panel"

export default function Layout(props: ParentProps) {
  const params = useParams()
  const navigate = useNavigate()
  const layout = useLayout()
  const directory = createMemo(() => {
    return base64Decode(params.dir!)
  })
  return (
    <Show when={params.dir} keyed>
      <SDKProvider directory={directory()}>
        <SyncProvider>
          {iife(() => {
            const sync = useSync()
            const sdk = useSDK()
            const respond = (input: {
              sessionID: string
              permissionID: string
              response: "once" | "always" | "reject"
            }) => sdk.client.permission.respond(input)

            const replyToQuestion = (input: { requestID: string; answers: QuestionAnswer[] }) =>
              sdk.client.question.reply(input)

            const rejectQuestion = (input: { requestID: string }) => sdk.client.question.reject(input)

            const navigateToSession = (sessionID: string) => {
              navigate(`/${params.dir}/session/${sessionID}`)
            }

            return (
              <DataProvider
                data={sync.data}
                directory={directory()}
                onPermissionRespond={respond}
                onQuestionReply={replyToQuestion}
                onQuestionReject={rejectQuestion}
                onNavigateToSession={navigateToSession}
              >
                <LocalProvider>
                  <div class="flex h-full w-full">
                    <div class="flex-1 min-w-0 h-full overflow-hidden">
                      {props.children}
                    </div>
                    <Show when={layout.explorer.opened()}>
                      <div
                        class="hidden xl:flex relative shrink-0 border-l border-border-weak-base h-full"
                        style={{ width: `${Math.max(layout.explorer.width(), 200)}px` }}
                      >
                        <ExplorerPanel
                          class="flex-1"
                          onFileSelect={(path) => {
                            layout.tabs(`${directory()}:${params.id ?? ""}`).open(`file://${path}`)
                          }}
                        />
                        <ResizeHandle
                          direction="horizontal"
                          size={layout.explorer.width()}
                          min={200}
                          max={window.innerWidth * 0.3}
                          collapseThreshold={200}
                          onResize={layout.explorer.resize}
                          onCollapse={layout.explorer.close}
                          class="left-0 right-auto"
                        />
                      </div>
                    </Show>
                  </div>
                </LocalProvider>
              </DataProvider>
            )
          })}
        </SyncProvider>
      </SDKProvider>
    </Show>
  )
}
