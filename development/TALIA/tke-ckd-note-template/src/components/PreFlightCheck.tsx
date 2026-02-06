import { useState, useMemo, useCallback } from "react"
import { useEncounterStore } from "@/stores/encounter"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, DOMAIN_DISPLAY_NAMES } from "@/lib/utils"
import type {
  SectionRegistry,
  SectionState,
  DomainGroup,
  Section,
} from "@/types/schema"
import { getPermissions, ROLE_CONFIGS } from "@/lib/role-permissions"
import {
  ShieldCheck,
  AlertTriangle,
  Check,
  Pencil,
  Flag,
  Copy,
  CheckCircle2,
  XCircle,
  Bot,
  FileText,
  ClipboardCheck,
} from "lucide-react"

interface PreFlightCheckProps {
  sectionRegistry: SectionRegistry
}

/** Section state → icon/color config */
const STATE_CONFIG: Record<
  SectionState,
  { icon: typeof Check; color: string; bg: string; label: string }
> = {
  accepted: {
    icon: CheckCircle2,
    color: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success-light)]",
    label: "Accepted",
  },
  edited: {
    icon: Pencil,
    color: "text-[color:var(--color-domain-pharmacotherapy)]",
    bg: "bg-[color:var(--color-domain-pharmacotherapy)]/10",
    label: "Edited",
  },
  ai_ready: {
    icon: Bot,
    color: "text-[var(--accent-primary)]",
    bg: "bg-[var(--color-info-light)]",
    label: "AI Ready",
  },
  needs_review: {
    icon: Flag,
    color: "text-[var(--color-warning)]",
    bg: "bg-[var(--color-warning-light)]",
    label: "Needs Review",
  },
  critical: {
    icon: XCircle,
    color: "text-[var(--color-error)]",
    bg: "bg-[var(--color-error-light)]",
    label: "Critical",
  },
  conflict: {
    icon: AlertTriangle,
    color: "text-[var(--color-warning)]",
    bg: "bg-[var(--color-warning-light)]",
    label: "Conflict",
  },
}

const DOMAIN_ORDER: DomainGroup[] = [
  "kidney_core",
  "cardiovascular",
  "pharmacotherapy",
  "metabolic",
  "ckd_complications",
  "risk_mitigation",
  "planning",
  "screening",
  "care_coordination",
]

export function PreFlightCheck({ sectionRegistry }: PreFlightCheckProps) {
  const store = useEncounterStore()
  const [copied, setCopied] = useState(false)
  const [attestChecked, setAttestChecked] = useState(false)

  const open = store.preFlightOpen
  const setOpen = store.setPreFlightOpen
  const permissions = getPermissions(store.userRole)
  const roleLabel = ROLE_CONFIGS[store.userRole].label

  // Non-header sections grouped by domain
  const sectionsByDomain = useMemo(() => {
    const map: Record<string, Section[]> = {}
    for (const section of sectionRegistry.sections) {
      if (section.domain_group === "header") continue
      const d = section.domain_group
      if (!map[d]) map[d] = []
      map[d].push(section)
    }
    return map
  }, [sectionRegistry])

  // Progress stats
  const stats = useMemo(() => {
    const sections = sectionRegistry.sections.filter(
      (s) => s.domain_group !== "header"
    )
    let accepted = 0
    let edited = 0
    let aiReady = 0
    let needsReview = 0
    let critical = 0
    let conflict = 0
    for (const s of sections) {
      const state = store.sectionStates[s.section_id] ?? "ai_ready"
      switch (state) {
        case "accepted": accepted++; break
        case "edited": edited++; break
        case "ai_ready": aiReady++; break
        case "needs_review": needsReview++; break
        case "critical": critical++; break
        case "conflict": conflict++; break
      }
    }
    return {
      total: sections.length,
      finalized: accepted + edited,
      accepted,
      edited,
      aiReady,
      needsReview,
      critical,
      conflict,
      blockers: critical + conflict,
    }
  }, [sectionRegistry, store.sectionStates])

  const canAttest = stats.blockers === 0 && attestChecked && !store.encounterAttested && permissions.canAttest

  // AI-generated note summary
  const noteSummary = useMemo(
    () => store.getNoteSummary(sectionRegistry.sections),
    [store.currentData, store.previousData, store.aiInterpretations, store.sectionStates, sectionRegistry]
  )

  const handleCopySummary = useCallback(async () => {
    await navigator.clipboard.writeText(noteSummary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [noteSummary])

  const handleAttest = useCallback(() => {
    store.attestEncounter()
    // Close after short delay so user sees success state
    setTimeout(() => setOpen(false), 1500)
  }, [store, setOpen])

  // Jump to section from pre-flight
  const jumpToSection = (sectionId: string) => {
    setOpen(false)
    store.expandSection(sectionId)
    requestAnimationFrame(() => {
      const el = document.getElementById(`section-${sectionId}`)
      el?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--accent-primary)]" />
            Pre-Flight Check
          </DialogTitle>
          <DialogDescription>
            Review all sections before finalizing the encounter note.
          </DialogDescription>
        </DialogHeader>

        {/* Attested success state */}
        {store.encounterAttested && (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-[var(--color-success)] mb-4" />
            <p className="text-lg font-semibold text-[var(--color-success-text)]">
              Note Attested
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Encounter note has been finalized and signed off.
            </p>
          </div>
        )}

        {!store.encounterAttested && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--color-success-light)] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[var(--color-success)]">
                  {stats.finalized}
                </div>
                <div className="text-[10px] text-[var(--color-success-text)] uppercase font-medium">
                  Finalized
                </div>
              </div>
              <div className="bg-[var(--color-info-light)] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[var(--accent-primary)]">
                  {stats.aiReady + stats.needsReview}
                </div>
                <div className="text-[10px] text-[var(--color-info-text)] uppercase font-medium">
                  Pending
                </div>
              </div>
              <div
                className={cn(
                  "rounded-lg p-3 text-center",
                  stats.blockers > 0 ? "bg-[var(--color-error-light)]" : "bg-[var(--bg-surface-sunken)]"
                )}
              >
                <div
                  className={cn(
                    "text-2xl font-bold",
                    stats.blockers > 0 ? "text-[var(--color-error)]" : "text-[var(--text-muted)]"
                  )}
                >
                  {stats.blockers}
                </div>
                <div
                  className={cn(
                    "text-[10px] uppercase font-medium",
                    stats.blockers > 0 ? "text-[var(--color-error-text)]" : "text-[var(--text-muted)]"
                  )}
                >
                  Blockers
                </div>
              </div>
            </div>

            {/* Blocker warning */}
            {stats.blockers > 0 && (
              <div className="flex items-center gap-2 p-3 bg-[var(--color-error-light)] border border-[var(--color-error)]/30 rounded-lg text-sm text-[var(--color-error-text)]">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>
                  {stats.critical > 0 &&
                    `${stats.critical} critical section${stats.critical > 1 ? "s" : ""}`}
                  {stats.critical > 0 && stats.conflict > 0 && " and "}
                  {stats.conflict > 0 &&
                    `${stats.conflict} conflict${stats.conflict > 1 ? "s" : ""}`}
                  {" "}must be resolved before attestation.
                </span>
              </div>
            )}

            {/* Section Grid by Domain */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Section Review
              </h3>
              {DOMAIN_ORDER.map((domain) => {
                const sections = sectionsByDomain[domain]
                if (!sections || sections.length === 0) return null
                return (
                  <div key={domain}>
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 px-1">
                      {DOMAIN_DISPLAY_NAMES[domain]}
                    </div>
                    <div className="space-y-1">
                      {sections.map((section) => {
                        const state: SectionState =
                          store.sectionStates[section.section_id] ?? "ai_ready"
                        const config = STATE_CONFIG[state]
                        const Icon = config.icon
                        const hasAI = !!store.aiInterpretations[section.section_id]
                        const isBlocker =
                          state === "critical" || state === "conflict"

                        return (
                          <button
                            key={section.section_id}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-md border text-left text-sm transition-colors hover:bg-[var(--bg-surface-sunken)]",
                              isBlocker && "border-[var(--color-error)]/30 bg-[var(--color-error-light)]"
                            )}
                            onClick={() => jumpToSection(section.section_id)}
                            title={`Jump to ${section.display_name}`}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 flex-shrink-0",
                                config.color
                              )}
                            />
                            <span className="flex-1 truncate text-[var(--text-secondary)]">
                              {section.section_number}. {section.display_name}
                            </span>
                            {hasAI && (
                              <Bot className="h-3 w-3 text-[var(--accent-primary)] flex-shrink-0" />
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5",
                                config.color
                              )}
                            >
                              {config.label}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Note Summary Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Note Summary
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={handleCopySummary}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-[var(--color-success)]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-sunken)] rounded-lg p-3 max-h-[200px] overflow-y-auto whitespace-pre-wrap font-mono border border-[var(--border-default)]">
                {noteSummary}
              </pre>
            </div>

            {/* Audit Trail: AI modifications */}
            {Object.keys(store.aiInterpretations).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  AI Audit Trail
                </h3>
                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  {Object.entries(store.aiInterpretations).map(
                    ([sectionId, interp]) => {
                      const section = sectionRegistry.sections.find(
                        (s) => s.section_id === sectionId
                      )
                      const state =
                        store.sectionStates[sectionId] ?? "ai_ready"
                      return (
                        <div
                          key={sectionId}
                          className="flex items-center gap-2"
                        >
                          <Bot className="h-3 w-3 text-[var(--accent-primary)]" />
                          <span className="text-[var(--text-secondary)]">
                            {section?.display_name ?? sectionId}
                          </span>
                          <span className="text-[var(--text-muted)]">-</span>
                          <span className="text-[var(--text-muted)]">
                            {interp.agentId}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            ({Math.round(interp.confidence * 100)}%)
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-1 rounded",
                              state === "accepted" && "bg-[var(--color-success-light)] text-[var(--color-success-text)]",
                              state === "edited" && "bg-[color:var(--color-domain-pharmacotherapy)]/15 text-[color:var(--color-domain-pharmacotherapy)]",
                              state === "ai_ready" && "bg-[var(--color-info-light)] text-[var(--color-info-text)]",
                              state === "critical" && "bg-[var(--color-error-light)] text-[var(--color-error-text)]"
                            )}
                          >
                            {state}
                          </span>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            )}

            {/* Attestation */}
            <div className="border-t border-[var(--border-default)] pt-4 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attestChecked}
                  onChange={(e) => setAttestChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--border-strong)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                  disabled={stats.blockers > 0 || !permissions.canAttest}
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  I have reviewed all sections and attest that this note
                  accurately represents the clinical encounter. AI-generated
                  content has been verified for accuracy.
                </span>
              </label>

              {!permissions.canAttest && (
                <p className="text-xs text-[var(--color-warning)] italic">
                  Only the Provider role can attest. Current role: {roleLabel}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Back to Note
                </Button>
                <Button
                  size="sm"
                  disabled={!canAttest}
                  onClick={handleAttest}
                  className="gap-1"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Attest &amp; Finalize
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
