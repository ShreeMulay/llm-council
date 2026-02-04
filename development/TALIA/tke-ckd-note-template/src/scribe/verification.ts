/**
 * Human Verification UI Logic
 * State management and actions for reviewing extracted fields
 */

import type {
  VerificationState,
  VerificationAction,
  ExtractedField,
  ExtractionResult,
} from "./types"

/**
 * Create a new verification session from extraction results
 *
 * @param extractionResult - Result from extraction
 * @returns Initial verification state
 *
 * @example
 * ```typescript
 * const extraction = await extractFromTranscription(transcription)
 * const session = createVerificationSession(extraction)
 * // Now use verificationReducer to handle user actions
 * ```
 */
export function createVerificationSession(
  extractionResult: ExtractionResult
): VerificationState {
  return {
    fields: extractionResult.fields,
    currentFieldIndex: 0,
    approvedFields: new Set(),
    rejectedFields: new Set(),
    editedFields: new Map(),
  }
}

/**
 * Approve a field (accept extracted value)
 *
 * @param state - Current state
 * @param fieldId - Field to approve
 * @returns Updated state
 */
export function approveField(
  state: VerificationState,
  fieldId: string
): VerificationState {
  const newApproved = new Set(state.approvedFields)
  newApproved.add(fieldId)

  // Remove from rejected if it was there
  const newRejected = new Set(state.rejectedFields)
  newRejected.delete(fieldId)

  return {
    ...state,
    approvedFields: newApproved,
    rejectedFields: newRejected,
  }
}

/**
 * Reject a field (discard extracted value)
 *
 * @param state - Current state
 * @param fieldId - Field to reject
 * @returns Updated state
 */
export function rejectField(
  state: VerificationState,
  fieldId: string
): VerificationState {
  const newRejected = new Set(state.rejectedFields)
  newRejected.add(fieldId)

  // Remove from approved if it was there
  const newApproved = new Set(state.approvedFields)
  newApproved.delete(fieldId)

  // Remove any edits
  const newEdited = new Map(state.editedFields)
  newEdited.delete(fieldId)

  return {
    ...state,
    approvedFields: newApproved,
    rejectedFields: newRejected,
    editedFields: newEdited,
  }
}

/**
 * Edit a field value
 *
 * @param state - Current state
 * @param fieldId - Field to edit
 * @param newValue - New value
 * @returns Updated state
 */
export function editField(
  state: VerificationState,
  fieldId: string,
  newValue: unknown
): VerificationState {
  const newEdited = new Map(state.editedFields)
  newEdited.set(fieldId, newValue)

  // Auto-approve edited fields
  const newApproved = new Set(state.approvedFields)
  newApproved.add(fieldId)

  // Remove from rejected
  const newRejected = new Set(state.rejectedFields)
  newRejected.delete(fieldId)

  return {
    ...state,
    approvedFields: newApproved,
    rejectedFields: newRejected,
    editedFields: newEdited,
  }
}

/**
 * Move to next field
 *
 * @param state - Current state
 * @returns Updated state
 */
export function nextField(state: VerificationState): VerificationState {
  const fieldIds = Object.keys(state.fields)
  const nextIndex = Math.min(state.currentFieldIndex + 1, fieldIds.length - 1)

  return {
    ...state,
    currentFieldIndex: nextIndex,
  }
}

/**
 * Move to previous field
 *
 * @param state - Current state
 * @returns Updated state
 */
export function previousField(state: VerificationState): VerificationState {
  const prevIndex = Math.max(state.currentFieldIndex - 1, 0)

  return {
    ...state,
    currentFieldIndex: prevIndex,
  }
}

/**
 * Jump to a specific field index
 *
 * @param state - Current state
 * @param index - Target index
 * @returns Updated state
 */
export function jumpToField(
  state: VerificationState,
  index: number
): VerificationState {
  const fieldIds = Object.keys(state.fields)
  const clampedIndex = Math.max(0, Math.min(index, fieldIds.length - 1))

  return {
    ...state,
    currentFieldIndex: clampedIndex,
  }
}

/**
 * Reducer for verification actions
 *
 * @param state - Current state
 * @param action - Action to apply
 * @returns Updated state
 *
 * @example
 * ```typescript
 * const [state, dispatch] = useReducer(verificationReducer, initialState)
 * dispatch({ type: "approve", fieldId: "kidney_function.egfr_current" })
 * ```
 */
export function verificationReducer(
  state: VerificationState,
  action: VerificationAction
): VerificationState {
  switch (action.type) {
    case "approve":
      return approveField(state, action.fieldId)
    case "reject":
      return rejectField(state, action.fieldId)
    case "edit":
      return editField(state, action.fieldId, action.value)
    case "next":
      return nextField(state)
    case "previous":
      return previousField(state)
    case "jumpTo":
      return jumpToField(state, action.index)
    default:
      return state
  }
}

/**
 * Get the final approved/edited field values
 *
 * @param state - Verification state
 * @returns Record of field ID to final value
 */
export function getFinalFields(
  state: VerificationState
): Record<string, unknown> {
  const final: Record<string, unknown> = {}

  for (const [fieldId, field] of Object.entries(state.fields)) {
    // Skip rejected fields
    if (state.rejectedFields.has(fieldId)) continue

    // Use edited value if available
    if (state.editedFields.has(fieldId)) {
      final[fieldId] = state.editedFields.get(fieldId)
    } else if (state.approvedFields.has(fieldId)) {
      // Use original value if approved
      final[fieldId] = field.value
    }
  }

  return final
}

/**
 * Get current field being reviewed
 *
 * @param state - Verification state
 * @returns Current field or undefined
 */
export function getCurrentField(
  state: VerificationState
): ExtractedField | undefined {
  const fieldIds = Object.keys(state.fields)
  const currentId = fieldIds[state.currentFieldIndex]
  return currentId ? state.fields[currentId] : undefined
}

/**
 * Get current field ID
 *
 * @param state - Verification state
 * @returns Current field ID or undefined
 */
export function getCurrentFieldId(
  state: VerificationState
): string | undefined {
  const fieldIds = Object.keys(state.fields)
  return fieldIds[state.currentFieldIndex]
}

/**
 * Get verification progress
 *
 * @param state - Verification state
 * @returns Progress info
 */
export function getVerificationProgress(state: VerificationState): {
  total: number
  reviewed: number
  approved: number
  rejected: number
  edited: number
  remaining: number
  percentComplete: number
} {
  const total = Object.keys(state.fields).length
  const approved = state.approvedFields.size
  const rejected = state.rejectedFields.size
  const edited = state.editedFields.size
  const reviewed = approved + rejected
  const remaining = total - reviewed

  return {
    total,
    reviewed,
    approved,
    rejected,
    edited,
    remaining,
    percentComplete: total > 0 ? (reviewed / total) * 100 : 100,
  }
}

/**
 * Check if verification is complete
 *
 * @param state - Verification state
 * @returns True if all fields have been reviewed
 */
export function isVerificationComplete(state: VerificationState): boolean {
  const { remaining } = getVerificationProgress(state)
  return remaining === 0
}

/**
 * Get fields that still need review
 *
 * @param state - Verification state
 * @returns Array of field IDs needing review
 */
export function getUnreviewedFields(state: VerificationState): string[] {
  return Object.keys(state.fields).filter(
    (fieldId) =>
      !state.approvedFields.has(fieldId) && !state.rejectedFields.has(fieldId)
  )
}

/**
 * Get fields sorted by confidence (lowest first for review)
 *
 * @param state - Verification state
 * @returns Sorted array of [fieldId, field] pairs
 */
export function getFieldsSortedByConfidence(
  state: VerificationState
): Array<[string, ExtractedField]> {
  return Object.entries(state.fields).sort(
    ([, a], [, b]) => a.confidence - b.confidence
  )
}

/**
 * Auto-approve high-confidence fields
 *
 * @param state - Verification state
 * @param threshold - Confidence threshold (default: 0.95)
 * @returns Updated state with high-confidence fields approved
 */
export function autoApproveHighConfidence(
  state: VerificationState,
  threshold = 0.95
): VerificationState {
  let newState = state

  for (const [fieldId, field] of Object.entries(state.fields)) {
    if (field.confidence >= threshold && !field.needsReview) {
      newState = approveField(newState, fieldId)
    }
  }

  return newState
}

/**
 * Get summary of verification session
 *
 * @param state - Verification state
 * @returns Summary object
 */
export function getVerificationSummary(state: VerificationState): {
  progress: ReturnType<typeof getVerificationProgress>
  finalFields: Record<string, unknown>
  isComplete: boolean
  highConfidenceCount: number
  lowConfidenceCount: number
} {
  const progress = getVerificationProgress(state)
  const finalFields = getFinalFields(state)
  const isComplete = isVerificationComplete(state)

  const fieldValues = Object.values(state.fields)
  const highConfidenceCount = fieldValues.filter((f) => f.confidence >= 0.9).length
  const lowConfidenceCount = fieldValues.filter((f) => f.confidence < 0.6).length

  return {
    progress,
    finalFields,
    isComplete,
    highConfidenceCount,
    lowConfidenceCount,
  }
}

/**
 * Reset verification session
 *
 * @param state - Current state
 * @returns Reset state
 */
export function resetVerification(state: VerificationState): VerificationState {
  return {
    ...state,
    currentFieldIndex: 0,
    approvedFields: new Set(),
    rejectedFields: new Set(),
    editedFields: new Map(),
  }
}

/**
 * Approve all remaining fields
 *
 * @param state - Current state
 * @returns State with all fields approved
 */
export function approveAllRemaining(state: VerificationState): VerificationState {
  let newState = state

  for (const fieldId of getUnreviewedFields(state)) {
    newState = approveField(newState, fieldId)
  }

  return newState
}

/**
 * Reject all remaining fields
 *
 * @param state - Current state
 * @returns State with all remaining fields rejected
 */
export function rejectAllRemaining(state: VerificationState): VerificationState {
  let newState = state

  for (const fieldId of getUnreviewedFields(state)) {
    newState = rejectField(newState, fieldId)
  }

  return newState
}
