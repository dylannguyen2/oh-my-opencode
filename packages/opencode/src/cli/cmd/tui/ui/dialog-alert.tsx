import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog, type DialogContext } from "./dialog"
import { useKeyboard } from "@opentui/solid"

export type DialogAlertProps = {
  title: string
  message: string
  onConfirm?: () => void
  onCancel?: () => void
  showCancel?: boolean
}

export function DialogAlert(props: DialogAlertProps) {
  const dialog = useDialog()
  const { theme } = useTheme()

  const handleCancel = () => {
    props.onCancel?.()
    dialog.clear()
  }

  const handleConfirm = () => {
    props.onConfirm?.()
    dialog.clear()
  }

  useKeyboard((evt) => {
    if (evt.name === "return") {
      evt.preventDefault?.()
      handleConfirm()
    } else if (evt.name === "escape") {
      evt.preventDefault?.()
      handleCancel()
    }
  })
  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted}>esc cancel</text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>{props.message}</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" gap={1} paddingBottom={1}>
        {props.showCancel !== false && (
          <box
            paddingLeft={2}
            paddingRight={2}
            backgroundColor={theme.backgroundElement}
            onMouseDown={(e) => {
              e.stopPropagation?.()
              e.preventDefault?.()
              handleCancel()
            }}
          >
            <text fg={theme.text}>cancel</text>
          </box>
        )}
        <box
          paddingLeft={3}
          paddingRight={3}
          backgroundColor={theme.primary}
          onMouseDown={(e) => {
            e.stopPropagation?.()
            e.preventDefault?.()
            handleConfirm()
          }}
        >
          <text fg={theme.selectedListItemText}>ok</text>
        </box>
      </box>
    </box>
  )
}

DialogAlert.show = (dialog: DialogContext, title: string, message: string) => {
  return new Promise<void>((resolve) => {
    dialog.replace(
      () => <DialogAlert title={title} message={message} onConfirm={() => resolve()} />,
      () => resolve(),
    )
  })
}
