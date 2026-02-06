import { useEncounterStore } from "@/stores/encounter"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Mic, ShieldCheck } from "lucide-react"

interface VoiceConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VoiceConsentDialog({ open, onOpenChange }: VoiceConsentDialogProps) {
  const store = useEncounterStore()

  const handleConsent = () => {
    store.setLiveFilterConsented(true)
    store.setLiveFilterActive(true)
    onOpenChange(false)
  }

  const handleDecline = () => {
    store.setLiveFilterConsented(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            Live Filter - Voice Recording
          </DialogTitle>
          <DialogDescription>
            Per-encounter consent is required before activating ambient voice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                What Live Filter Does
              </span>
            </div>
            <ul className="text-sm text-blue-700 space-y-1 ml-6 list-disc">
              <li>Listens to the conversation during this encounter only</li>
              <li>Extracts relevant clinical data (labs, meds, plans)</li>
              <li>Auto-populates note sections in real-time</li>
              <li>All data stays within this encounter session</li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 space-y-2">
            <span className="text-sm font-medium text-amber-800">
              Privacy Notice
            </span>
            <ul className="text-sm text-amber-700 space-y-1 ml-6 list-disc">
              <li>Recording is for this encounter only</li>
              <li>Audio is processed locally and not stored</li>
              <li>You can mute or stop at any time</li>
              <li>Patient consent should be obtained verbally</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleDecline}>
              Decline
            </Button>
            <Button onClick={handleConsent} className="gap-1">
              <Mic className="h-4 w-4" />
              Enable Live Filter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
