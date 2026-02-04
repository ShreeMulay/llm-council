/**
 * Care Gaps Detection Service
 * Identifies clinical care gaps based on auto-populated data
 */

export interface CareGap {
  type: "lab_due" | "screening_due" | "med_gap" | "referral_pending" | "education_due"
  description: string
  priority: "high" | "medium" | "low"
  section_id: string
  action?: string
}

/**
 * Lab due thresholds (days since last result)
 * Exported for use in date-based gap detection
 */
export const LAB_DUE_THRESHOLDS = {
  egfr: 90,           // 3 months
  uacr: 365,          // Annual
  hba1c: 90,          // 3 months for diabetics
  iron_panel: 90,     // 3 months if on ESA
  pth: 180,           // 6 months for CKD 4-5
  vitamin_d: 180,     // 6 months
  lipid_panel: 365    // Annual
}

/**
 * Detect care gaps from auto-populated data
 */
export function detectCareGaps(
  data: Record<string, unknown>,
  _patientId: string
): CareGap[] {
  const gaps: CareGap[] = []
  
  // === LAB GAPS ===
  
  // eGFR not available
  const egfr = data["kidney_function.egfr_current"] as number | undefined
  if (egfr === undefined) {
    gaps.push({
      type: "lab_due",
      description: "eGFR not available - order CMP",
      priority: "high",
      section_id: "kidney_function",
      action: "Order comprehensive metabolic panel"
    })
  }
  
  // UACR not available or outdated
  const uacr = data["kidney_function.uacr_current"] as number | undefined
  if (uacr === undefined) {
    gaps.push({
      type: "lab_due",
      description: "UACR not available - order urine albumin/creatinine ratio",
      priority: "high",
      section_id: "kidney_function",
      action: "Order spot urine albumin/creatinine ratio"
    })
  }
  
  // HbA1c for diabetics
  const diabeticStatus = data["diabetes.diabetic_status"] as string | undefined
  const hba1c = data["diabetes.hba1c"] as number | undefined
  if (diabeticStatus && diabeticStatus !== "not_diabetic" && hba1c === undefined) {
    gaps.push({
      type: "lab_due",
      description: "HbA1c not available for diabetic patient",
      priority: "high",
      section_id: "diabetes",
      action: "Order HbA1c"
    })
  }
  
  // Iron panel for anemia
  const hemoglobin = data["anemia.hemoglobin"] as number | undefined
  const ferritin = data["anemia.ferritin"] as number | undefined
  if (hemoglobin !== undefined && hemoglobin < 12 && ferritin === undefined) {
    gaps.push({
      type: "lab_due",
      description: "Iron studies needed for anemia workup",
      priority: "medium",
      section_id: "anemia",
      action: "Order iron panel (ferritin, TSAT)"
    })
  }
  
  // PTH for CKD 4-5
  const ckdStage = data["header.ckd_stage"] as string | undefined
  const pth = data["mbd.pth"] as number | undefined
  if (ckdStage && (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D") && pth === undefined) {
    gaps.push({
      type: "lab_due",
      description: "PTH not available for advanced CKD",
      priority: "medium",
      section_id: "mbd",
      action: "Order intact PTH"
    })
  }
  
  // === SCREENING GAPS ===
  
  // PHQ-2 screening
  const phq2 = data["depression.phq2_score"] as number | undefined
  if (phq2 === undefined) {
    gaps.push({
      type: "screening_due",
      description: "PHQ-2 depression screening due",
      priority: "medium",
      section_id: "depression",
      action: "Administer PHQ-2 screening"
    })
  }
  
  // Fall risk screening for elderly or advanced CKD
  const fallRisk = data["fall_risk.fall_risk"] as string | undefined
  if (fallRisk === undefined && (ckdStage === "G4" || ckdStage === "G5")) {
    gaps.push({
      type: "screening_due",
      description: "Fall risk assessment due for advanced CKD",
      priority: "low",
      section_id: "fall_risk",
      action: "Complete fall risk assessment"
    })
  }
  
  // Annual eye exam for diabetics
  const eyeExam = data["diabetes.annual_eye_exam"] as string | undefined
  if (diabeticStatus && diabeticStatus !== "not_diabetic" && eyeExam !== "done") {
    gaps.push({
      type: "screening_due",
      description: "Annual diabetic eye exam due",
      priority: "medium",
      section_id: "diabetes",
      action: "Refer for dilated eye exam"
    })
  }
  
  // Annual foot exam for diabetics
  const footExam = data["diabetes.annual_foot_exam"] as string | undefined
  if (diabeticStatus && diabeticStatus !== "not_diabetic" && footExam !== "done") {
    gaps.push({
      type: "screening_due",
      description: "Annual diabetic foot exam due",
      priority: "medium",
      section_id: "diabetes",
      action: "Perform monofilament foot exam"
    })
  }
  
  // === MEDICATION GAPS (GDMT) ===
  
  const egfrValue = egfr as number | undefined
  
  // RAAS inhibitor gap
  const raasStatus = data["raas.raas_status"] as string | undefined
  if (egfrValue !== undefined && egfrValue > 20 && raasStatus === "not_on") {
    gaps.push({
      type: "med_gap",
      description: "Not on RAAS inhibitor - evaluate for initiation",
      priority: "high",
      section_id: "raas",
      action: "Consider ACEi/ARB if no contraindication"
    })
  }
  
  // SGLT2i gap
  const sglt2iStatus = data["sglt2i.sglt2i_status"] as string | undefined
  if (egfrValue !== undefined && egfrValue >= 20 && sglt2iStatus === "not_on") {
    gaps.push({
      type: "med_gap",
      description: "Not on SGLT2i - evaluate for initiation (eGFR >= 20)",
      priority: "high",
      section_id: "sglt2i",
      action: "Consider SGLT2i (empagliflozin or dapagliflozin)"
    })
  }
  
  // MRA/Finerenone gap for diabetic CKD
  const mraStatus = data["mra.mra_status"] as string | undefined
  const uacrValue = uacr as number | undefined
  if (
    diabeticStatus === "type2" &&
    egfrValue !== undefined && egfrValue >= 25 &&
    uacrValue !== undefined && uacrValue >= 30 &&
    mraStatus !== "on"
  ) {
    gaps.push({
      type: "med_gap",
      description: "Finerenone candidate - diabetic CKD with albuminuria",
      priority: "medium",
      section_id: "mra",
      action: "Consider finerenone per FIDELIO/FIGARO criteria"
    })
  }
  
  // GLP-1 RA gap for diabetic CKD
  const glp1Status = data["glp1.glp1_status"] as string | undefined
  if (diabeticStatus === "type2" && glp1Status !== "on") {
    gaps.push({
      type: "med_gap",
      description: "GLP-1 RA candidate - diabetic CKD (FLOW trial evidence)",
      priority: "medium",
      section_id: "glp1",
      action: "Consider semaglutide for kidney protection"
    })
  }
  
  // Statin gap
  const statinStatus = data["lipid_therapy.statin_status"] as string | undefined
  if (statinStatus === "not_indicated" && ckdStage && ckdStage !== "G1") {
    gaps.push({
      type: "med_gap",
      description: "Not on statin - CKD patients benefit from lipid therapy",
      priority: "medium",
      section_id: "lipid_therapy",
      action: "Consider moderate-high intensity statin"
    })
  }
  
  // Bicarbonate supplementation
  const bicarb = data["electrolytes.bicarbonate"] as number | undefined
  const bicarbSupplement = data["electrolytes.bicarb_supplement"] as string | undefined
  if (bicarb !== undefined && bicarb < 22 && !bicarbSupplement) {
    gaps.push({
      type: "med_gap",
      description: "Low bicarbonate without supplementation",
      priority: "medium",
      section_id: "electrolytes",
      action: "Consider sodium bicarbonate supplementation"
    })
  }
  
  // === REFERRAL GAPS ===
  
  // Transplant referral for CKD 4-5
  const txCandidate = data["transplant.transplant_candidate"] as string | undefined
  const txStatus = data["transplant.current_status"] as string | undefined
  if (
    (ckdStage === "G4" || ckdStage === "G5") &&
    txCandidate !== "no" &&
    txStatus === "not_referred"
  ) {
    gaps.push({
      type: "referral_pending",
      description: "Transplant referral needed for advanced CKD",
      priority: "high",
      section_id: "transplant",
      action: "Refer to transplant center"
    })
  }
  
  // Vascular access planning
  const kfre2yr = data["kidney_function.kfre_2yr"] as number | undefined
  const accessStatus = data["dialysis.vascular_access_status"] as string | undefined
  if (
    (kfre2yr !== undefined && kfre2yr > 20) ||
    ckdStage === "G5"
  ) {
    if (accessStatus === "none" || accessStatus === undefined) {
      gaps.push({
        type: "referral_pending",
        description: "Vascular access planning needed (KFRE > 20% or CKD G5)",
        priority: "high",
        section_id: "dialysis",
        action: "Refer to vascular surgery for access planning"
      })
    }
  }
  
  // Dietitian referral
  const dietAdherence = data["sodium.diet_adherence"] as string | undefined
  const dietitianReferral = data["sodium.dietitian_referral"] as boolean | undefined
  if (dietAdherence === "poor" && !dietitianReferral) {
    gaps.push({
      type: "referral_pending",
      description: "Poor dietary adherence - dietitian referral recommended",
      priority: "low",
      section_id: "sodium",
      action: "Refer to renal dietitian"
    })
  }
  
  // === EDUCATION GAPS ===
  
  // Sick day rules
  const sickDayReviewed = data["sick_day.sick_day_rules_reviewed"] as boolean | undefined
  const onHighRiskMeds = 
    raasStatus !== "not_on" ||
    sglt2iStatus === "on" ||
    mraStatus === "on"
  
  if (onHighRiskMeds && !sickDayReviewed) {
    gaps.push({
      type: "education_due",
      description: "Sick day rules not reviewed - patient on nephrotoxin-risk meds",
      priority: "high",
      section_id: "sick_day",
      action: "Review sick day medication hold rules"
    })
  }
  
  // Dialysis education for CKD 4-5
  const dialysisEducation = data["dialysis.dialysis_education"] as boolean | undefined
  if ((ckdStage === "G4" || ckdStage === "G5") && !dialysisEducation) {
    gaps.push({
      type: "education_due",
      description: "Dialysis education not completed for advanced CKD",
      priority: "medium",
      section_id: "dialysis",
      action: "Schedule dialysis modality education"
    })
  }
  
  // NSAID avoidance counseling
  const nsaidStatus = data["nsaid.nsaid_status"] as string | undefined
  const nsaidCounseled = data["nsaid.counseled_on_avoidance"] as boolean | undefined
  if (nsaidStatus && nsaidStatus !== "not_using" && !nsaidCounseled) {
    gaps.push({
      type: "education_due",
      description: "Patient using NSAIDs - avoidance counseling needed",
      priority: "high",
      section_id: "nsaid",
      action: "Counsel on NSAID avoidance and alternatives"
    })
  }
  
  return gaps
}

/**
 * Prioritize care gaps for display
 */
export function prioritizeCareGaps(gaps: CareGap[]): CareGap[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  
  return [...gaps].sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    
    // Then by type (med_gap > lab_due > screening_due > referral_pending > education_due)
    const typeOrder = { med_gap: 0, lab_due: 1, screening_due: 2, referral_pending: 3, education_due: 4 }
    return typeOrder[a.type] - typeOrder[b.type]
  })
}

/**
 * Group care gaps by section
 */
export function groupCareGapsBySection(gaps: CareGap[]): Record<string, CareGap[]> {
  const grouped: Record<string, CareGap[]> = {}
  
  for (const gap of gaps) {
    if (!grouped[gap.section_id]) {
      grouped[gap.section_id] = []
    }
    grouped[gap.section_id].push(gap)
  }
  
  return grouped
}

/**
 * Get care gap summary statistics
 */
export function getCareGapStats(gaps: CareGap[]): {
  total: number
  byPriority: Record<string, number>
  byType: Record<string, number>
} {
  const byPriority: Record<string, number> = { high: 0, medium: 0, low: 0 }
  const byType: Record<string, number> = {}
  
  for (const gap of gaps) {
    byPriority[gap.priority]++
    byType[gap.type] = (byType[gap.type] || 0) + 1
  }
  
  return {
    total: gaps.length,
    byPriority,
    byType
  }
}
