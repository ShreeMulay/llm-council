/**
 * OCR Service
 * Handles image-to-text conversion and OMR checkbox detection for physical cards
 */

import type {
  OCRResult,
  OCRCard,
  OCROptions,
  ExtractedField,
  Rectangle,
  CardFieldMapping,
} from "./types"

/**
 * Card field mappings for TKE physical cards
 * Maps card codes to their field regions
 */
const CARD_FIELD_MAPS: Record<string, CardFieldMapping> = {
  "TKE-RAAS": {
    cardCode: "TKE-RAAS",
    sectionId: "raas",
    fieldMappings: {
      "status_acei": "raas.raas_status",
      "status_arb": "raas.raas_status",
      "status_arni": "raas.raas_status",
      "drug_dose": "raas.raas_drug_dose",
      "at_max_dose": "raas.at_max_dose",
      "not_on_reason": "raas.not_on_reason",
    },
    checkboxRegions: [
      { id: "status_acei", x: 50, y: 100, width: 20, height: 20 },
      { id: "status_arb", x: 50, y: 130, width: 20, height: 20 },
      { id: "status_arni", x: 50, y: 160, width: 20, height: 20 },
      { id: "at_max_dose", x: 50, y: 200, width: 20, height: 20 },
    ],
    textRegions: [
      { id: "drug_dose", x: 100, y: 250, width: 200, height: 30 },
      { id: "not_on_reason", x: 100, y: 300, width: 200, height: 30 },
    ],
    numberRegions: [],
  },
  "TKE-SGLT": {
    cardCode: "TKE-SGLT",
    sectionId: "sglt2i",
    fieldMappings: {
      "status_on": "sglt2i.sglt2i_status",
      "drug_dose": "sglt2i.sglt2i_drug_dose",
      "not_on_reason": "sglt2i.not_on_reason",
      "sick_day_reviewed": "sglt2i.sick_day_rules_reviewed",
    },
    checkboxRegions: [
      { id: "status_on", x: 50, y: 100, width: 20, height: 20 },
      { id: "sick_day_reviewed", x: 50, y: 200, width: 20, height: 20 },
    ],
    textRegions: [
      { id: "drug_dose", x: 100, y: 130, width: 200, height: 30 },
      { id: "not_on_reason", x: 100, y: 250, width: 200, height: 30 },
    ],
    numberRegions: [],
  },
  "TKE-FINE": {
    cardCode: "TKE-FINE",
    sectionId: "mra",
    fieldMappings: {
      "status_on": "mra.mra_status",
      "drug_dose": "mra.mra_drug_dose",
      "not_on_reason": "mra.not_on_reason",
      "k_monitoring": "mra.k_monitoring_schedule",
    },
    checkboxRegions: [
      { id: "status_on", x: 50, y: 100, width: 20, height: 20 },
    ],
    textRegions: [
      { id: "drug_dose", x: 100, y: 130, width: 200, height: 30 },
      { id: "not_on_reason", x: 100, y: 200, width: 200, height: 30 },
      { id: "k_monitoring", x: 100, y: 270, width: 200, height: 30 },
    ],
    numberRegions: [],
  },
  "TKE-BPFL": {
    cardCode: "TKE-BPFL",
    sectionId: "bp_fluid",
    fieldMappings: {
      "systolic": "bp_fluid.systolic_bp",
      "diastolic": "bp_fluid.diastolic_bp",
      "edema_none": "bp_fluid.edema",
      "edema_trace": "bp_fluid.edema",
      "edema_1plus": "bp_fluid.edema",
      "edema_2plus": "bp_fluid.edema",
      "edema_3plus": "bp_fluid.edema",
    },
    checkboxRegions: [
      { id: "edema_none", x: 50, y: 150, width: 20, height: 20 },
      { id: "edema_trace", x: 100, y: 150, width: 20, height: 20 },
      { id: "edema_1plus", x: 150, y: 150, width: 20, height: 20 },
      { id: "edema_2plus", x: 200, y: 150, width: 20, height: 20 },
      { id: "edema_3plus", x: 250, y: 150, width: 20, height: 20 },
    ],
    textRegions: [],
    numberRegions: [
      { id: "systolic", x: 100, y: 50, width: 60, height: 30 },
      { id: "diastolic", x: 180, y: 50, width: 60, height: 30 },
    ],
  },
}

/**
 * Default OCR options
 */
const DEFAULT_OCR_OPTIONS: OCROptions = {
  detectCheckboxes: true,
  handwritingMode: true,
  preprocessing: {
    autoRotate: true,
    enhanceContrast: true,
    denoise: true,
  },
}

/**
 * Get field mapping for a card code
 *
 * @param cardCode - Card code (e.g., "TKE-RAAS")
 * @returns Field mapping or undefined
 */
export function getFieldMapForCard(
  cardCode: string
): CardFieldMapping | undefined {
  return CARD_FIELD_MAPS[cardCode]
}

/**
 * Process a card image and extract fields
 *
 * In production: Calls OCR API (Tesseract, Google Vision, Azure, etc.)
 * Currently: Returns mock structure for development
 *
 * @param imageBlob - Image file as Blob
 * @param cardCode - Expected card code
 * @param options - OCR options
 * @returns OCR card result
 *
 * @example
 * ```typescript
 * const image = await fetch("/card-scan.jpg").then(r => r.blob())
 * const result = await processCardImage(image, "TKE-RAAS")
 * console.log(result.fields)
 * ```
 */
export async function processCardImage(
  _imageBlob: Blob,
  cardCode: string,
  options?: OCROptions
): Promise<OCRCard> {
  // Merge options with defaults (used in production implementation)
  void { ...DEFAULT_OCR_OPTIONS, ...options }
  // Get field mapping for this card (used in production implementation)
  void getFieldMapForCard(cardCode)

  // In production: Call OCR API
  //
  // 1. Preprocess image
  // const processedImage = await preprocessImage(imageBlob, opts.preprocessing)
  //
  // 2. Run OCR
  // const ocrResult = await callOCRAPI(processedImage)
  //
  // 3. Detect checkboxes if enabled
  // let checkboxResults = {}
  // if (opts.detectCheckboxes && fieldMap) {
  //   checkboxResults = await detectOMRCheckboxes(processedImage, fieldMap.checkboxRegions)
  // }
  //
  // 4. Extract text from regions
  // const textResults = await extractTextFromRegions(ocrResult, fieldMap?.textRegions ?? [])
  //
  // 5. Map to fields
  // const fields = mapOCRResultsToFields(checkboxResults, textResults, fieldMap)

  return {
    cardCode,
    fields: {},
    imageRegions: [],
  }
}

/**
 * Process multiple card images
 *
 * @param images - Array of image blobs with card codes
 * @param options - OCR options
 * @returns OCR result with all cards
 */
export async function processMultipleCards(
  images: Array<{ blob: Blob; cardCode: string }>,
  options?: OCROptions
): Promise<OCRResult> {
  const cards = await Promise.all(
    images.map(({ blob, cardCode }) => processCardImage(blob, cardCode, options))
  )

  const overallConfidence =
    cards.length > 0
      ? cards.reduce((sum, card) => {
          const fieldValues = Object.values(card.fields)
          const cardConfidence =
            fieldValues.length > 0
              ? fieldValues.reduce((s, f) => s + f.confidence, 0) / fieldValues.length
              : 0
          return sum + cardConfidence
        }, 0) / cards.length
      : 0

  return {
    cards,
    overallConfidence,
  }
}

/**
 * Detect OMR (Optical Mark Recognition) checkboxes
 *
 * Analyzes image regions to determine if checkboxes are filled
 *
 * @param imageData - Image data (from canvas)
 * @param checkboxRegions - Regions to check
 * @returns Map of region ID to checked state
 */
export function detectOMRCheckboxes(
  imageData: ImageData,
  checkboxRegions: Rectangle[]
): Record<string, boolean> {
  const results: Record<string, boolean> = {}

  for (const region of checkboxRegions) {
    const pixels = getRegionPixels(imageData, region)
    const darkPixels = pixels.filter((p) => p < 128).length
    const fillPercentage = darkPixels / pixels.length

    // >30% filled = checked
    results[region.id] = fillPercentage > 0.3
  }

  return results
}

/**
 * Get pixel values from a region of an image
 *
 * @param imageData - Image data
 * @param region - Region to extract
 * @returns Array of grayscale pixel values (0-255)
 */
export function getRegionPixels(
  imageData: ImageData,
  region: Rectangle
): number[] {
  const pixels: number[] = []
  const { data, width } = imageData

  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const idx = (y * width + x) * 4
      // Convert to grayscale using luminance formula
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      pixels.push(gray)
    }
  }

  return pixels
}

/**
 * Preprocess image for better OCR results
 *
 * @param imageBlob - Original image
 * @param options - Preprocessing options
 * @returns Processed image blob
 */
export async function preprocessImage(
  imageBlob: Blob,
  _options?: OCROptions["preprocessing"]
): Promise<Blob> {
  // In production: Use canvas or image processing library
  //
  // const canvas = document.createElement("canvas")
  // const ctx = canvas.getContext("2d")
  // const img = await createImageBitmap(imageBlob)
  //
  // canvas.width = img.width
  // canvas.height = img.height
  // ctx.drawImage(img, 0, 0)
  //
  // if (options?.autoRotate) {
  //   // Detect and correct rotation
  // }
  //
  // if (options?.enhanceContrast) {
  //   // Apply contrast enhancement
  // }
  //
  // if (options?.denoise) {
  //   // Apply noise reduction
  // }
  //
  // return new Promise(resolve => canvas.toBlob(resolve, "image/png"))

  return imageBlob
}

/**
 * Detect card code from image
 *
 * Looks for TKE-XXXX pattern in the image
 *
 * @param imageBlob - Image to analyze
 * @returns Detected card code or undefined
 */
export async function detectCardCode(_imageBlob: Blob): Promise<string | undefined> {
  // In production: Run OCR and look for card code pattern
  //
  // const ocrResult = await callOCRAPI(imageBlob)
  // const cardCodeMatch = ocrResult.text.match(/TKE-[A-Z]{4}/i)
  // return cardCodeMatch?.[0]?.toUpperCase()

  return undefined
}

/**
 * Validate extracted fields against expected types
 *
 * @param card - OCR card result
 * @param fieldMap - Field mapping
 * @returns Validated card with corrected types
 */
export function validateExtractedFields(
  card: OCRCard,
  fieldMap: CardFieldMapping
): OCRCard {
  const validatedFields: Record<string, ExtractedField> = {}

  for (const [regionId, fieldId] of Object.entries(fieldMap.fieldMappings)) {
    const field = card.fields[regionId]
    if (!field) continue

    // Validate and potentially correct the value
    const validated = { ...field }

    // Check if this is a number field
    const isNumberField = fieldMap.numberRegions.some((r) => r.id === regionId)
    if (isNumberField && typeof validated.value === "string") {
      const parsed = parseFloat(validated.value)
      if (!isNaN(parsed)) {
        validated.value = parsed
      } else {
        validated.needsReview = true
        validated.confidence *= 0.5
      }
    }

    validatedFields[fieldId] = validated
  }

  return {
    ...card,
    fields: validatedFields,
  }
}

/**
 * Merge OCR results with existing encounter data
 *
 * @param ocrResult - OCR result
 * @param existingData - Existing encounter data
 * @returns Merged data with OCR values
 */
export function mergeOCRWithEncounterData(
  ocrResult: OCRResult,
  existingData: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...existingData }

  for (const card of ocrResult.cards) {
    for (const [fieldId, field] of Object.entries(card.fields)) {
      // Only override if OCR has higher confidence or field is empty
      const existingValue = merged[fieldId]
      if (existingValue === undefined || existingValue === null) {
        merged[fieldId] = field.value
      }
    }
  }

  return merged
}

/**
 * Get all supported card codes
 *
 * @returns Array of supported card codes
 */
export function getSupportedCardCodes(): string[] {
  return Object.keys(CARD_FIELD_MAPS)
}

/**
 * Check if a card code is supported
 *
 * @param cardCode - Card code to check
 * @returns True if supported
 */
export function isCardCodeSupported(cardCode: string): boolean {
  return cardCode in CARD_FIELD_MAPS
}

/**
 * Register a new card field mapping
 *
 * @param mapping - Card field mapping to register
 */
export function registerCardFieldMapping(mapping: CardFieldMapping): void {
  CARD_FIELD_MAPS[mapping.cardCode] = mapping
}
