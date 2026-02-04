/**
 * Lab Data Ingestion Service
 * Parses lab data and maps to section registry fields
 */

export interface LabData {
  name: string
  value: number | string
  unit?: string
  date?: string
  reference_range?: string
  is_abnormal?: boolean
}

/**
 * Maps lab names to section.field_id format
 * Based on section-registry.json field definitions
 */
export const LAB_FIELD_MAP: Record<string, string> = {
  // Kidney Function (Section 1)
  "eGFR": "kidney_function.egfr_current",
  "GFR": "kidney_function.egfr_current",
  "Creatinine": "kidney_function.creatinine",
  "Cr": "kidney_function.creatinine",
  "BUN": "kidney_function.bun",
  "Blood Urea Nitrogen": "kidney_function.bun",
  "UACR": "kidney_function.uacr_current",
  "Urine Albumin/Creatinine Ratio": "kidney_function.uacr_current",
  "UPCr": "kidney_function.upcr_current",
  "Urine Protein/Creatinine Ratio": "kidney_function.upcr_current",

  // Hematuria (Section 2)
  "UA RBC": "hematuria.ua_rbc",
  "Urine RBC": "hematuria.ua_rbc",

  // BP & Fluid (Section 5)
  "Systolic BP": "bp_fluid.systolic_bp",
  "SBP": "bp_fluid.systolic_bp",
  "Diastolic BP": "bp_fluid.diastolic_bp",
  "DBP": "bp_fluid.diastolic_bp",
  "Heart Rate": "bp_fluid.heart_rate",
  "HR": "bp_fluid.heart_rate",
  "O2 Saturation": "bp_fluid.o2_saturation",
  "SpO2": "bp_fluid.o2_saturation",

  // Heart Failure (Section 6)
  "LVEF": "heart_failure.lvef",
  "Ejection Fraction": "heart_failure.lvef",
  "BNP": "heart_failure.bnp",
  "NT-proBNP": "heart_failure.nt_probnp",

  // Lipid Therapy (Section 7)
  "LDL": "lipid_therapy.ldl",
  "LDL Cholesterol": "lipid_therapy.ldl",
  "Total Cholesterol": "lipid_therapy.total_cholesterol",
  "HDL": "lipid_therapy.hdl",
  "Triglycerides": "lipid_therapy.triglycerides",

  // RAAS (Section 8)
  "Potassium on RAAS": "raas.k_on_therapy",

  // Diabetes (Section 12)
  "HbA1c": "diabetes.hba1c",
  "A1c": "diabetes.hba1c",
  "Hemoglobin A1c": "diabetes.hba1c",
  "Fasting Glucose": "electrolytes.glucose",
  "Glucose": "electrolytes.glucose",

  // Gout (Section 13)
  "Uric Acid": "gout.uric_acid",

  // Anemia (Section 15)
  "Hemoglobin": "anemia.hemoglobin",
  "Hgb": "anemia.hemoglobin",
  "Hematocrit": "anemia.hematocrit",
  "Hct": "anemia.hematocrit",
  "MCV": "anemia.mcv",
  "WBC": "anemia.wbc",
  "Platelets": "anemia.platelets",
  "Ferritin": "anemia.ferritin",
  "TSAT": "anemia.tsat",
  "Transferrin Saturation": "anemia.tsat",
  "Iron Saturation": "anemia.tsat",

  // MBD (Section 16)
  "PTH": "mbd.pth",
  "Parathyroid Hormone": "mbd.pth",
  "Vitamin D": "mbd.vitamin_d25",
  "25-OH Vitamin D": "mbd.vitamin_d25",
  "Vitamin D 25-OH": "mbd.vitamin_d25",
  "Calcium": "mbd.calcium",
  "Ca": "mbd.calcium",
  "Phosphorus": "mbd.phosphorus",
  "Phos": "mbd.phosphorus",
  "Albumin": "mbd.albumin",

  // Electrolytes (Section 17)
  "Sodium": "electrolytes.sodium",
  "Na": "electrolytes.sodium",
  "Potassium": "electrolytes.potassium",
  "K": "electrolytes.potassium",
  "Chloride": "electrolytes.chloride",
  "Cl": "electrolytes.chloride",
  "Bicarbonate": "electrolytes.bicarbonate",
  "CO2": "electrolytes.bicarbonate",
  "Bicarb": "electrolytes.bicarbonate",
  "Magnesium": "electrolytes.magnesium",
  "Mg": "electrolytes.magnesium",
}

/**
 * Normalize lab name for matching
 */
function normalizeLabName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Find the field key for a lab name (case-insensitive)
 */
function findFieldKey(labName: string): string | undefined {
  const normalized = normalizeLabName(labName)
  
  for (const [key, value] of Object.entries(LAB_FIELD_MAP)) {
    if (normalizeLabName(key) === normalized) {
      return value
    }
  }
  
  return undefined
}

/**
 * Parse lab data array and map to field keys
 */
export function parseLabData(labs: LabData[]): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  const labDates: Record<string, string> = {}
  
  for (const lab of labs) {
    const fieldKey = findFieldKey(lab.name)
    
    if (fieldKey) {
      // Store the value
      fields[fieldKey] = lab.value
      
      // Track lab date if available
      if (lab.date) {
        const sectionId = fieldKey.split(".")[0]
        // Keep the most recent date for each section
        if (!labDates[sectionId] || lab.date > labDates[sectionId]) {
          labDates[sectionId] = lab.date
        }
      }
      
      // Store abnormal flag if present
      if (lab.is_abnormal !== undefined) {
        fields[`${fieldKey}_abnormal`] = lab.is_abnormal
      }
    }
  }
  
  // Add lab dates to fields
  for (const [sectionId, date] of Object.entries(labDates)) {
    fields[`${sectionId}.lab_date`] = date
  }
  
  return fields
}

/**
 * Calculate derived values from lab data
 */
export function calculateDerivedLabValues(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const derived: Record<string, unknown> = {}
  
  // BUN:Cr ratio
  const bun = fields["kidney_function.bun"] as number | undefined
  const cr = fields["kidney_function.creatinine"] as number | undefined
  if (bun !== undefined && cr !== undefined && cr > 0) {
    derived["kidney_function.bun_cr_ratio"] = Math.round((bun / cr) * 10) / 10
  }
  
  // Corrected calcium (if albumin available)
  const calcium = fields["mbd.calcium"] as number | undefined
  const albumin = fields["mbd.albumin"] as number | undefined
  if (calcium !== undefined && albumin !== undefined) {
    // Corrected Ca = Measured Ca + 0.8 * (4.0 - Albumin)
    const corrected = calcium + 0.8 * (4.0 - albumin)
    derived["mbd.corrected_calcium"] = Math.round(corrected * 10) / 10
  }
  
  // eGFR trend (requires previous value)
  const egfrCurrent = fields["kidney_function.egfr_current"] as number | undefined
  const egfrPrevious = fields["kidney_function.egfr_previous"] as number | undefined
  if (egfrCurrent !== undefined && egfrPrevious !== undefined) {
    const diff = egfrCurrent - egfrPrevious
    if (Math.abs(diff) < 3) {
      derived["kidney_function.egfr_trend"] = "stable"
    } else if (diff > 0) {
      derived["kidney_function.egfr_trend"] = "improving"
    } else {
      derived["kidney_function.egfr_trend"] = "declining"
    }
  }
  
  return derived
}

/**
 * Get lab date from fields
 */
export function getLabDate(fields: Record<string, unknown>): string | undefined {
  // Check header lab date first
  const headerDate = fields["header.lab_date"] as string | undefined
  if (headerDate) return headerDate
  
  // Fall back to kidney function lab date
  return fields["kidney_function.lab_date"] as string | undefined
}
