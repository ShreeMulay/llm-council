/**
 * Medication List Ingestion Service
 * Parses medication data and maps to section registry fields
 */

export interface Medication {
  name: string
  dose?: string
  frequency?: string
  route?: string
  start_date?: string
  prescriber?: string
  is_active?: boolean
}

/**
 * Drug class patterns for categorization
 */
const DRUG_PATTERNS = {
  // RAAS Inhibitors (Section 8)
  acei: [
    /lisinopril/i, /enalapril/i, /ramipril/i, /benazepril/i,
    /captopril/i, /fosinopril/i, /quinapril/i, /perindopril/i,
    /trandolapril/i, /moexipril/i
  ],
  arb: [
    /losartan/i, /valsartan/i, /irbesartan/i, /olmesartan/i,
    /candesartan/i, /telmisartan/i, /azilsartan/i, /eprosartan/i
  ],
  arni: [/sacubitril.*valsartan/i, /entresto/i],

  // SGLT2 Inhibitors (Section 9)
  sglt2i: [
    /empagliflozin/i, /jardiance/i,
    /dapagliflozin/i, /farxiga/i,
    /canagliflozin/i, /invokana/i,
    /ertugliflozin/i, /steglatro/i
  ],

  // MRA (Section 10)
  mra: [
    /finerenone/i, /kerendia/i,
    /spironolactone/i, /aldactone/i,
    /eplerenone/i, /inspra/i
  ],

  // GLP-1 RA (Section 11)
  glp1: [
    /semaglutide/i, /ozempic/i, /wegovy/i, /rybelsus/i,
    /liraglutide/i, /victoza/i, /saxenda/i,
    /dulaglutide/i, /trulicity/i,
    /tirzepatide/i, /mounjaro/i, /zepbound/i,
    /exenatide/i, /byetta/i, /bydureon/i
  ],

  // Statins (Section 7)
  statin_high: [
    /atorvastatin\s*(40|80)/i, /lipitor\s*(40|80)/i,
    /rosuvastatin\s*(20|40)/i, /crestor\s*(20|40)/i
  ],
  statin_moderate: [
    /atorvastatin\s*(10|20)/i, /lipitor\s*(10|20)/i,
    /rosuvastatin\s*(5|10)/i, /crestor\s*(5|10)/i,
    /simvastatin\s*(20|40)/i, /zocor\s*(20|40)/i,
    /pravastatin\s*(40|80)/i, /pravachol\s*(40|80)/i
  ],
  statin_low: [
    /simvastatin\s*10/i, /zocor\s*10/i,
    /pravastatin\s*(10|20)/i, /pravachol\s*(10|20)/i,
    /lovastatin/i, /fluvastatin/i, /pitavastatin/i
  ],
  pcsk9i: [
    /evolocumab/i, /repatha/i,
    /alirocumab/i, /praluent/i,
    /inclisiran/i, /leqvio/i
  ],

  // Diuretics
  loop_diuretic: [
    /furosemide/i, /lasix/i,
    /bumetanide/i, /bumex/i,
    /torsemide/i, /demadex/i
  ],
  thiazide: [
    /hydrochlorothiazide/i, /hctz/i,
    /chlorthalidone/i,
    /indapamide/i,
    /metolazone/i, /zaroxolyn/i
  ],

  // Beta Blockers (HF GDMT)
  beta_blocker_hf: [
    /carvedilol/i, /coreg/i,
    /metoprolol\s*succinate/i, /toprol/i,
    /bisoprolol/i
  ],

  // Insulin
  insulin: [
    /insulin/i, /lantus/i, /levemir/i, /tresiba/i,
    /humalog/i, /novolog/i, /apidra/i,
    /humulin/i, /novolin/i
  ],

  // ESA (Anemia)
  esa: [
    /epoetin/i, /procrit/i, /epogen/i,
    /darbepoetin/i, /aranesp/i
  ],

  // IV Iron
  iv_iron: [
    /iron\s*sucrose/i, /venofer/i,
    /ferric\s*carboxymaltose/i, /injectafer/i,
    /ferumoxytol/i, /feraheme/i,
    /iron\s*dextran/i, /infed/i
  ],

  // Vitamin D
  vitamin_d: [
    /cholecalciferol/i, /ergocalciferol/i,
    /calcitriol/i, /rocaltrol/i,
    /paricalcitol/i, /zemplar/i,
    /doxercalciferol/i
  ],

  // Phosphate Binders
  phosphate_binder: [
    /sevelamer/i, /renvela/i, /renagel/i,
    /lanthanum/i, /fosrenol/i,
    /calcium\s*acetate/i, /phoslo/i,
    /sucroferric/i, /velphoro/i
  ],

  // Potassium Binders
  potassium_binder: [
    /patiromer/i, /veltassa/i,
    /sodium\s*zirconium/i, /lokelma/i,
    /kayexalate/i, /sodium\s*polystyrene/i
  ],

  // Bicarbonate
  bicarb_supplement: [
    /sodium\s*bicarbonate/i, /bicarb/i
  ],

  // Gout
  gout_therapy: [
    /allopurinol/i, /zyloprim/i,
    /febuxostat/i, /uloric/i,
    /pegloticase/i, /krystexxa/i
  ],

  // NSAIDs (to flag)
  nsaid: [
    /ibuprofen/i, /advil/i, /motrin/i,
    /naproxen/i, /aleve/i, /naprosyn/i,
    /diclofenac/i, /voltaren/i,
    /meloxicam/i, /mobic/i,
    /celecoxib/i, /celebrex/i,
    /indomethacin/i, /ketorolac/i
  ],

  // PPIs (to flag)
  ppi: [
    /omeprazole/i, /prilosec/i,
    /esomeprazole/i, /nexium/i,
    /pantoprazole/i, /protonix/i,
    /lansoprazole/i, /prevacid/i,
    /rabeprazole/i, /aciphex/i,
    /dexlansoprazole/i, /dexilant/i
  ],

  // BPH
  bph_medication: [
    /tamsulosin/i, /flomax/i,
    /alfuzosin/i, /uroxatral/i,
    /silodosin/i, /rapaflo/i,
    /finasteride/i, /proscar/i,
    /dutasteride/i, /avodart/i
  ]
}

/**
 * Check if medication matches any pattern in a list
 */
function matchesDrugClass(medName: string, patterns: RegExp[]): boolean {
  const fullName = medName.toLowerCase()
  return patterns.some(pattern => pattern.test(fullName))
}

/**
 * Get drug and dose string
 */
function getDrugDose(med: Medication): string {
  if (med.dose) {
    return `${med.name} ${med.dose}${med.frequency ? ` ${med.frequency}` : ""}`
  }
  return med.name
}

/**
 * Parse medication list and map to field keys
 */
export function parseMedList(meds: Medication[]): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  const activeMeds = meds.filter(m => m.is_active !== false)

  // RAAS Status (Section 8)
  const aceiMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.acei))
  const arbMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.arb))
  const arniMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.arni))

  if (arniMed) {
    fields["raas.raas_status"] = "on_arni"
    fields["raas.raas_drug_dose"] = getDrugDose(arniMed)
  } else if (aceiMed) {
    fields["raas.raas_status"] = "on_acei"
    fields["raas.raas_drug_dose"] = getDrugDose(aceiMed)
  } else if (arbMed) {
    fields["raas.raas_status"] = "on_arb"
    fields["raas.raas_drug_dose"] = getDrugDose(arbMed)
  } else {
    fields["raas.raas_status"] = "not_on"
  }

  // SGLT2i Status (Section 9)
  const sglt2iMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.sglt2i))
  if (sglt2iMed) {
    fields["sglt2i.sglt2i_status"] = "on"
    fields["sglt2i.sglt2i_drug_dose"] = getDrugDose(sglt2iMed)
  } else {
    fields["sglt2i.sglt2i_status"] = "not_on"
  }

  // MRA Status (Section 10)
  const mraMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.mra))
  if (mraMed) {
    fields["mra.mra_status"] = "on"
    fields["mra.mra_drug_dose"] = getDrugDose(mraMed)
  } else {
    fields["mra.mra_status"] = "not_indicated"
  }

  // GLP-1 Status (Section 11)
  const glp1Med = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.glp1))
  if (glp1Med) {
    fields["glp1.glp1_status"] = "on"
    fields["glp1.glp1_drug_dose"] = getDrugDose(glp1Med)
  } else {
    fields["glp1.glp1_status"] = "not_indicated"
  }

  // Statin Status (Section 7)
  const highStatin = activeMeds.find(m => matchesDrugClass(`${m.name} ${m.dose || ""}`, DRUG_PATTERNS.statin_high))
  const modStatin = activeMeds.find(m => matchesDrugClass(`${m.name} ${m.dose || ""}`, DRUG_PATTERNS.statin_moderate))
  const lowStatin = activeMeds.find(m => matchesDrugClass(`${m.name} ${m.dose || ""}`, DRUG_PATTERNS.statin_low))

  if (highStatin) {
    fields["lipid_therapy.statin_status"] = "on_high_intensity"
    fields["lipid_therapy.statin_drug_dose"] = getDrugDose(highStatin)
  } else if (modStatin) {
    fields["lipid_therapy.statin_status"] = "on_moderate_intensity"
    fields["lipid_therapy.statin_drug_dose"] = getDrugDose(modStatin)
  } else if (lowStatin) {
    fields["lipid_therapy.statin_status"] = "on_low_intensity"
    fields["lipid_therapy.statin_drug_dose"] = getDrugDose(lowStatin)
  } else {
    fields["lipid_therapy.statin_status"] = "not_indicated"
  }

  // PCSK9i Status
  const pcsk9iMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.pcsk9i))
  if (pcsk9iMed) {
    fields["lipid_therapy.pcsk9i_status"] = "on"
    if (/repatha|evolocumab/i.test(pcsk9iMed.name)) {
      fields["lipid_therapy.pcsk9i_drug"] = "Repatha"
    } else if (/praluent|alirocumab/i.test(pcsk9iMed.name)) {
      fields["lipid_therapy.pcsk9i_drug"] = "Praluent"
    } else if (/leqvio|inclisiran/i.test(pcsk9iMed.name)) {
      fields["lipid_therapy.pcsk9i_drug"] = "Leqvio"
    }
  }

  // Heart Failure GDMT (Section 6)
  const bbMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.beta_blocker_hf))
  fields["heart_failure.gdmt_bb"] = !!bbMed
  fields["heart_failure.gdmt_arni"] = !!arniMed
  fields["heart_failure.gdmt_sglt2i_hf"] = !!sglt2iMed
  fields["heart_failure.gdmt_mra_hf"] = !!mraMed

  // Insulin Status (Section 12)
  const insulinMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.insulin))
  if (insulinMed) {
    fields["diabetes.insulin_status"] = "on"
  }

  // ESA Status (Section 15)
  const esaMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.esa))
  if (esaMed) {
    fields["anemia.esa_status"] = getDrugDose(esaMed)
  }

  // IV Iron Status
  const ivIronMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.iv_iron))
  if (ivIronMed) {
    fields["anemia.iv_iron_status"] = getDrugDose(ivIronMed)
  }

  // Vitamin D Supplement (Section 16)
  const vitDMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.vitamin_d))
  if (vitDMed) {
    fields["mbd.vitamin_d_supplement"] = getDrugDose(vitDMed)
  }

  // Phosphate Binder
  const phosBinder = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.phosphate_binder))
  if (phosBinder) {
    fields["mbd.phosphate_binder"] = getDrugDose(phosBinder)
  }

  // Potassium Binder (Section 10)
  const kBinder = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.potassium_binder))
  if (kBinder) {
    fields["mra.potassium_binder"] = getDrugDose(kBinder)
  }

  // Bicarbonate Supplement (Section 17)
  const bicarbMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.bicarb_supplement))
  if (bicarbMed) {
    fields["electrolytes.bicarb_supplement"] = getDrugDose(bicarbMed)
  }

  // Gout Therapy (Section 13)
  const goutMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.gout_therapy))
  if (goutMed) {
    fields["gout.current_therapy"] = getDrugDose(goutMed)
    if (/krystexxa|pegloticase/i.test(goutMed.name)) {
      fields["gout.krystexxa_status"] = "on"
    }
  }

  // NSAID Status (Section 19) - Flag if using
  const nsaidMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.nsaid))
  if (nsaidMed) {
    fields["nsaid.nsaid_status"] = "using_prescribed"
    fields["nsaid.specific_nsaid"] = getDrugDose(nsaidMed)
  } else {
    fields["nsaid.nsaid_status"] = "not_using"
  }

  // PPI Status (Section 20)
  const ppiMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.ppi))
  if (ppiMed) {
    fields["ppi.ppi_status"] = "on_indicated" // Default to indicated; provider can change
    fields["ppi.ppi_drug_dose"] = getDrugDose(ppiMed)
  } else {
    fields["ppi.ppi_status"] = "not_on"
  }

  // BPH Medication (Section 4)
  const bphMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.bph_medication))
  if (bphMed) {
    fields["gu_history.bph"] = true
    fields["gu_history.bph_medication"] = getDrugDose(bphMed)
  }

  // Loop Diuretic (for sick day rules)
  const loopMed = activeMeds.find(m => matchesDrugClass(m.name, DRUG_PATTERNS.loop_diuretic))
  if (loopMed) {
    fields["_meta.on_loop_diuretic"] = true
  }

  return fields
}

/**
 * Check if patient is on medications requiring sick day rules
 */
export function needsSickDayRules(fields: Record<string, unknown>): boolean {
  return (
    fields["raas.raas_status"] !== "not_on" ||
    fields["sglt2i.sglt2i_status"] === "on" ||
    fields["mra.mra_status"] === "on" ||
    fields["_meta.on_loop_diuretic"] === true
  )
}

/**
 * Calculate GDMT compliance score (out of 4 pillars)
 */
export function calculateGDMTCompliance(fields: Record<string, unknown>): {
  score: number
  total: number
  pillars: string[]
} {
  const pillars: string[] = []
  
  if (fields["raas.raas_status"] !== "not_on") {
    pillars.push("RAAS")
  }
  if (fields["sglt2i.sglt2i_status"] === "on") {
    pillars.push("SGLT2i")
  }
  if (fields["mra.mra_status"] === "on") {
    pillars.push("MRA")
  }
  if (fields["glp1.glp1_status"] === "on") {
    pillars.push("GLP-1")
  }
  
  return {
    score: pillars.length,
    total: 4,
    pillars
  }
}
