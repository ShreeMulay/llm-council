import { useEncounterStore } from "@/stores/encounter"
import { ROLE_CONFIGS } from "@/lib/role-permissions"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/schema"

const ROLES: UserRole[] = ["provider", "scribe", "ma"]

export function RoleSwitcher() {
  const userRole = useEncounterStore((s) => s.userRole)
  const setUserRole = useEncounterStore((s) => s.setUserRole)
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="User role">
      {ROLES.map((role) => {
        const config = ROLE_CONFIGS[role]
        const isActive = role === userRole
        return (
          <button
            key={role}
            role="radio"
            aria-checked={isActive}
            className={cn(
              "px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors",
              isActive
                ? `${config.bgColor} ${config.color}`
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
            onClick={() => setUserRole(role)}
            title={`Switch to ${config.label} role`}
          >
            {config.label}
          </button>
        )
      })}
    </div>
  )
}
