import type { UserRole } from "@/types/schema"

/**
 * Role permission matrix for the TKE CKD Note Template.
 *
 * Provider (blue): Full access - view, edit, accept, attest, flag
 * Scribe (purple): Edit + flag, cannot accept or attest
 * MA (teal): Pre-visit data only, cannot edit clinical content
 */

export interface RolePermissions {
  canAcceptSections: boolean
  canEditSections: boolean
  canEditFields: boolean
  canFlagSections: boolean
  canAttest: boolean
  canOpenPreFlight: boolean
  canSwitchView: boolean
  canUseCommandPalette: boolean
  canExportNote: boolean
}

const PERMISSIONS: Record<UserRole, RolePermissions> = {
  provider: {
    canAcceptSections: true,
    canEditSections: true,
    canEditFields: true,
    canFlagSections: true,
    canAttest: true,
    canOpenPreFlight: true,
    canSwitchView: true,
    canUseCommandPalette: true,
    canExportNote: true,
  },
  scribe: {
    canAcceptSections: false,
    canEditSections: true,
    canEditFields: true,
    canFlagSections: true,
    canAttest: false,
    canOpenPreFlight: true, // Can view but not attest
    canSwitchView: true,
    canUseCommandPalette: true,
    canExportNote: false,
  },
  ma: {
    canAcceptSections: false,
    canEditSections: false,
    canEditFields: false, // MA fills pre-visit checklist only
    canFlagSections: true,
    canAttest: false,
    canOpenPreFlight: false,
    canSwitchView: false,
    canUseCommandPalette: true,
    canExportNote: false,
  },
}

export function getPermissions(role: UserRole): RolePermissions {
  return PERMISSIONS[role]
}

/** Role display config */
export interface RoleConfig {
  label: string
  color: string        // Tailwind text color
  bgColor: string      // Tailwind bg color
  accentColor: string   // CSS custom property value
  borderClass: string  // Top border class for app container
  icon: string         // Emoji or short text
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  provider: {
    label: "Provider",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    accentColor: "#3B82F6",
    borderClass: "role-provider",
    icon: "Dr",
  },
  scribe: {
    label: "Scribe",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    accentColor: "#8B5CF6",
    borderClass: "role-scribe",
    icon: "Sc",
  },
  ma: {
    label: "MA",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    accentColor: "#14B8A6",
    borderClass: "role-ma",
    icon: "MA",
  },
}
