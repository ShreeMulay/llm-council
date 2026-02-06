import { useState } from "react"
import { useEncounterStore } from "@/stores/encounter"
import { VoiceConsentDialog } from "./VoiceConsentDialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Mic, MicOff, Pause, Play, Trash2, X } from "lucide-react"

/**
 * LiveFilter controls - shown as a floating bar when voice is active.
 * Includes consent dialog, recording indicator, mute/pause, transcript preview.
 */
export function LiveFilter() {
  const store = useEncounterStore()
  const [consentDialogOpen, setConsentDialogOpen] = useState(false)
  const [paused, setPaused] = useState(false)

  // If not consented and not active, just render the activation trigger
  if (!store.liveFilterConsented) {
    return (
      <>
        <VoiceConsentDialog
          open={consentDialogOpen}
          onOpenChange={setConsentDialogOpen}
        />
      </>
    )
  }

  // Active Live Filter bar
  if (!store.liveFilterActive) {
    return null
  }

  return (
    <div className="live-filter-bar fixed bottom-14 left-1/2 -translate-x-1/2 z-20 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2">
      {/* Recording indicator */}
      <span
        className={cn(
          "w-2.5 h-2.5 rounded-full",
          store.liveFilterMuted || paused
            ? "bg-[var(--text-muted)]"
            : "bg-[var(--color-error)] animate-pulse"
        )}
        aria-label={
          store.liveFilterMuted ? "Muted" : paused ? "Paused" : "Recording"
        }
      />

      <span className="text-xs text-[var(--text-secondary)] font-medium">Live Filter</span>

      {/* Mute toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => store.setLiveFilterMuted(!store.liveFilterMuted)}
        title={store.liveFilterMuted ? "Unmute" : "Mute"}
      >
        {store.liveFilterMuted ? (
          <MicOff className="h-3.5 w-3.5 text-[var(--color-error)]" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-[var(--color-success)]" />
        )}
      </Button>

      {/* Pause toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setPaused(!paused)}
        title={paused ? "Resume" : "Pause"}
      >
        {paused ? (
          <Play className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
        ) : (
          <Pause className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
        )}
      </Button>

      {/* Transcript count */}
      {store.voiceTranscript.length > 0 && (
        <span className="text-[10px] bg-[var(--color-info-light)] text-[var(--accent-primary)] px-1.5 py-0.5 rounded-full font-medium">
          {store.voiceTranscript.length} items
        </span>
      )}

      {/* Clear transcript */}
      {store.voiceTranscript.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={store.clearVoiceTranscript}
          title="Clear transcript"
        >
          <Trash2 className="h-3 w-3 text-[var(--text-muted)]" />
        </Button>
      )}

      {/* Stop recording */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => store.setLiveFilterActive(false)}
        title="Stop Live Filter"
      >
        <X className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </Button>
    </div>
  )
}

/** Expose consent dialog trigger for ClinicalRibbon mic button */
export function useLiveFilterTrigger() {
  const store = useEncounterStore()
  const [consentOpen, setConsentOpen] = useState(false)

  const trigger = () => {
    if (store.liveFilterConsented) {
      // Already consented - toggle active
      store.setLiveFilterActive(!store.liveFilterActive)
    } else {
      // Need consent first
      setConsentOpen(true)
    }
  }

  return { trigger, consentOpen, setConsentOpen }
}
