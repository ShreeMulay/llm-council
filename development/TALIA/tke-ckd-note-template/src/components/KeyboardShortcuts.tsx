import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"

const SHORTCUTS = [
  { keys: ["Cmd/Ctrl", "K"], description: "Open command palette" },
  { keys: ["Shift", "?"], description: "Show keyboard shortcuts" },
  { keys: ["Escape"], description: "Close dialog / command palette" },
  { keys: ["Tab"], description: "Navigate between sections" },
  { keys: ["Enter"], description: "Expand/collapse selected section" },
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate the note builder efficiently with keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {SHORTCUTS.map((shortcut, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0"
            >
              <span className="text-sm text-[var(--text-secondary)]">
                {shortcut.description}
              </span>
              <div className="flex gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--bg-surface-sunken)] border border-[var(--border-default)] rounded text-[var(--text-secondary)]"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
