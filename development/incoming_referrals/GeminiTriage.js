/**
 * ============================================================================
 * GEMINITRIAGE.JS - AI-Powered Referral Triage
 * ============================================================================
 * 
 * @fileoverview Uses Google Gemini 2.5 Pro to evaluate nephrology referrals
 *               and assign clinical priority levels with enhanced reasoning
 * @author The Kidney Experts, PLLC
 * @version 2.3.2
 * @lastModified 2025-12-04
 * 
 * DESCRIPTION:
 * This module integrates with Google's Gemini 2.5 Pro API to provide
 * AI-powered triage assessment for incoming nephrology referrals.
 * It analyzes clinical data (creatinine, GFR, reason for referral),
 * patient age bracket, sex, referring provider/clinic context, and
 * assigns priority levels to help schedule patients appropriately.
 * 
 * NEW IN v2.3.0: Calculates fresh eGFR using CKD-EPI 2021 formula
 * from creatinine, age, and sex. Compares with reported GFR and
 * uses the LOWER value when discrepancy >10 mL/min exists.
 * 
 * NEW IN v2.3.2: Age and lab date calculations are now relative to
 * the referral submission timestamp (Column A), not today's date.
 * This ensures accurate age for eGFR and correct lab freshness.
 * 
 * PRIORITY LEVELS:
 *   1-EMERGENT  : GFR <15, Creat >5, needs dialysis, ESRD
 *   2-URGENT    : GFR 15-29 (Stage 4), Creat 3-5, acute kidney injury
 *   3-SOON      : GFR 30-44 (Stage 3b), Creat 2-3, significant impairment
 *   4-ROUTINE   : GFR 45-59 (Stage 3a), Creat 1.5-2, stable CKD
 *   5-LOW       : GFR >60, normal labs, cysts, hematuria, transfers
 * 
 * SETUP REQUIREMENTS:
 *   1. Enable Generative Language API in Google Cloud Console
 *   2. Create API key restricted to Generative Language API
 *   3. Add Script Property: GEMINI_API_KEY = [your key]
 * 
 * COLUMN REFERENCE (Output):
 *   AH (34) = AI Priority (e.g., "2-URGENT")
 *   AI (35) = AI Reasoning (brief clinical rationale)
 *   AJ (36) = AI Timestamp (when triage was performed)
 * 
 * COLUMN REFERENCE (Input):
 *   B  (2)  = Self-Referral (Yes/No)
 *   D  (4)  = Clinic Name
 *   E  (5)  = Referring Provider
 *   K  (11) = Patient Date of Birth
 *   L  (12) = Patient Sex (Male/Female) - used for eGFR calculation
 *   Y  (25) = Date of Last Lab Work
 *   AA (27) = Reason for Referral
 *   AB (28) = Last Creatinine - used for eGFR calculation
 *   AC (29) = Last GFR (reported)
 * 
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration for AI Triage
 * @const {Object}
 */
const TRIAGE_CONFIG = {
  // API Configuration - Upgraded to Gemini 2.5 Pro for enhanced reasoning
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
  MODEL_NAME: 'gemini-2.5-pro',
  
  // Column indices (1-based)
  COLUMNS: {
    TIMESTAMP: 1,         // Column A - Form submission timestamp (for age/lab date calculations)
    SELF_REFERRAL: 2,     // Column B - Is this a self referral? (Yes/No)
    CLINIC: 4,            // Column D - Clinic Name
    PROVIDER: 5,          // Column E - Referring Provider
    DOB: 11,              // Column K - Patient Date of Birth
    SEX: 12,              // Column L - Patient Sex (Male/Female)
    LAB_DATE: 25,         // Column Y - Date of Last Lab Work
    REASON: 27,           // Column AA - Reason for Referral
    CREATININE: 28,       // Column AB - Last Creatinine
    GFR: 29,              // Column AC - Last GFR
    AI_PRIORITY: 34,      // Column AH - AI Priority (output)
    AI_REASONING: 35,     // Column AI - AI Reasoning (output)
    AI_TIMESTAMP: 36      // Column AJ - AI Timestamp (output)
  },
  
  // Age bracket definitions
  AGE_BRACKETS: {
    PEDIATRIC: { max: 17, label: 'Pediatric (<18)' },
    YOUNG_ADULT: { min: 18, max: 39, label: 'Young Adult (18-39)' },
    MIDDLE_AGED: { min: 40, max: 64, label: 'Middle-Aged (40-64)' },
    SENIOR: { min: 65, max: 79, label: 'Senior (65-79)' },
    ELDERLY: { min: 80, label: 'Elderly (80+)' }
  },
  
  // Priority colors for visual indication
  COLORS: {
    EMERGENT: '#FF0000',  // Red
    URGENT: '#FF6B00',    // Orange
    SOON: '#FFD700',      // Gold
    ROUTINE: '#90EE90',   // Light Green
    LOW: '#E0E0E0',       // Light Gray
    ERROR: '#FFB6C1'      // Light Pink
  },
  
  // Timeout for API calls (milliseconds)
  API_TIMEOUT: 30000
};

// ============================================================================
// MAIN TRIAGE FUNCTIONS
// ============================================================================

/**
 * Triage a single referral row using Gemini AI
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 * @returns {Object} Triage result with priority, label, and reasoning
 */
function triageReferralRow(sheet, row) {
  try {
    // Get input values - including timestamp for relative date calculations
    const timestamp = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.TIMESTAMP).getValue();
    const selfReferral = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.SELF_REFERRAL).getValue();
    const clinic = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.CLINIC).getValue();
    const provider = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.PROVIDER).getValue();
    const dob = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.DOB).getValue();
    const sex = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.SEX).getValue();
    const labDate = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.LAB_DATE).getValue();
    const reason = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.REASON).getValue();
    const creatinine = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.CREATININE).getValue();
    const gfr = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.GFR).getValue();
    
    // Use timestamp as reference date for age/lab calculations (not today's date)
    // This ensures accurate calculations relative to when the referral was submitted
    const referenceDate = (timestamp && timestamp instanceof Date) ? timestamp : new Date();
    
    // Track if clinical data is missing (will be passed to AI for acknowledgment)
    const hasClinicalData = !!(reason || creatinine || gfr);
    
    // Calculate age relative to referral timestamp (not today)
    let age = 'Unknown';
    if (dob && dob instanceof Date) {
      age = Math.floor((referenceDate - dob) / (365.25 * 24 * 60 * 60 * 1000));
    }
    
    // Calculate age bracket for clinical context
    let ageBracket = 'Unknown';
    if (age !== 'Unknown' && typeof age === 'number') {
      if (age < 18) {
        ageBracket = TRIAGE_CONFIG.AGE_BRACKETS.PEDIATRIC.label;
      } else if (age >= 18 && age <= 39) {
        ageBracket = TRIAGE_CONFIG.AGE_BRACKETS.YOUNG_ADULT.label;
      } else if (age >= 40 && age <= 64) {
        ageBracket = TRIAGE_CONFIG.AGE_BRACKETS.MIDDLE_AGED.label;
      } else if (age >= 65 && age <= 79) {
        ageBracket = TRIAGE_CONFIG.AGE_BRACKETS.SENIOR.label;
      } else if (age >= 80) {
        ageBracket = TRIAGE_CONFIG.AGE_BRACKETS.ELDERLY.label;
      }
    }
    
    // Calculate days since last lab relative to referral timestamp (not today)
    let daysSinceLab = 'Unknown';
    if (labDate && labDate instanceof Date) {
      daysSinceLab = Math.floor((referenceDate - labDate) / (24 * 60 * 60 * 1000));
      // Validate: if > 10 years (3650 days) or negative, likely invalid date
      if (daysSinceLab < 0 || daysSinceLab > 3650) {
        console.warn('Invalid daysSinceLab calculated:', daysSinceLab, 'from labDate:', labDate, 'referenceDate:', referenceDate);
        daysSinceLab = 'Unknown (invalid date)';
      }
    }
    
    // Parse creatinine and GFR (handle various formats)
    const parsedCreat = parseLabValue(creatinine);
    const parsedGFR = parseLabValue(gfr);
    
    // Parse sex value
    const parsedSex = sex ? sex.toString().trim() : 'Unknown';
    
    // Calculate eGFR using CKD-EPI 2021 if we have creatinine, age, and sex
    let calculatedEGFR = null;
    const creatFloat = parseFloat(parsedCreat);
    if (!isNaN(creatFloat) && creatFloat > 0 && age !== 'Unknown' && typeof age === 'number' && parsedSex !== 'Unknown') {
      calculatedEGFR = calculateEGFR_CKDEPI(creatFloat, age, parsedSex);
      console.log('Calculated eGFR:', calculatedEGFR, 'from Creat:', creatFloat, 'Age:', age, 'Sex:', parsedSex);
    }
    
    // Determine if self-referral
    const isSelfReferral = selfReferral && selfReferral.toString().toLowerCase() === 'yes';
    
    // Call Gemini API with enhanced context including calculated eGFR
    const triageResult = callGeminiForTriage({
      age: age,
      ageBracket: ageBracket,
      sex: parsedSex,
      isSelfReferral: isSelfReferral,
      clinic: !isSelfReferral && clinic ? clinic.toString().trim() : '',
      provider: !isSelfReferral && provider ? provider.toString().trim() : '',
      reason: reason ? reason.toString().trim() : 'Not provided',
      creatinine: parsedCreat,
      gfr: parsedGFR,
      calculatedEGFR: calculatedEGFR,
      daysSinceLab: daysSinceLab,
      hasClinicalData: hasClinicalData  // Flag for AI to acknowledge missing data
    });
    
    // Write results to sheet
    if (triageResult.success) {
      writeTriageResults(sheet, row, triageResult);
    }
    
    return triageResult;
    
  } catch (error) {
    console.error('Error triaging row ' + row + ':', error);
    return {
      success: false,
      priority: 'ERROR',
      label: 'ERROR',
      reasoning: error.message.substring(0, 100),
      error: error.message
    };
  }
}

/**
 * Parse lab value handling various input formats
 * @param {*} value - Raw value from sheet
 * @returns {string} Parsed value or 'Not available'
 */
function parseLabValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }
  
  // Handle 'self' or other text indicators
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'self' || lower === 'n/a' || lower === 'unknown') {
      return 'Not available';
    }
    // Try to extract number from string
    const match = value.match(/[\d.]+/);
    if (match) {
      return match[0];
    }
    return 'Not available';
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    // Filter out obviously wrong values (dates stored as numbers, etc.)
    if (value > 1000000) {
      return 'Not available';
    }
    return value.toString();
  }
  
  return 'Not available';
}

/**
 * Calculate eGFR using CKD-EPI 2021 formula (race-free)
 * Reference: Inker LA, et al. N Engl J Med. 2021;385(19):1737-1749
 * 
 * @param {number} creatinine - Serum creatinine in mg/dL
 * @param {number} age - Patient age in years
 * @param {string} sex - Patient sex ("Male" or "Female")
 * @returns {number|null} Calculated eGFR (rounded to 1 decimal) or null if unable to calculate
 */
function calculateEGFR_CKDEPI(creatinine, age, sex) {
  // Validate inputs
  if (!creatinine || creatinine <= 0 || !age || age <= 0 || !sex) {
    return null;
  }
  
  // Determine sex-specific constants
  const isFemale = sex.toString().toLowerCase().startsWith('f');
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const sexMultiplier = isFemale ? 1.012 : 1.0;
  
  // CKD-EPI 2021 formula:
  // eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^-1.200 × 0.9938^Age × (1.012 if female)
  const scrOverKappa = creatinine / kappa;
  const minTerm = Math.min(scrOverKappa, 1);
  const maxTerm = Math.max(scrOverKappa, 1);
  
  const eGFR = 142 
    * Math.pow(minTerm, alpha) 
    * Math.pow(maxTerm, -1.200) 
    * Math.pow(0.9938, age) 
    * sexMultiplier;
  
  // Round to 1 decimal place
  return Math.round(eGFR * 10) / 10;
}

/**
 * Write triage results to the sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number
 * @param {Object} result - Triage result object
 */
function writeTriageResults(sheet, row, result) {
  const priorityCell = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.AI_PRIORITY);
  const reasoningCell = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.AI_REASONING);
  const timestampCell = sheet.getRange(row, TRIAGE_CONFIG.COLUMNS.AI_TIMESTAMP);
  
  // Write values
  priorityCell.setValue(result.priority + '-' + result.label);
  reasoningCell.setValue(result.reasoning);
  timestampCell.setValue(new Date());
  
  // Apply color coding
  const color = TRIAGE_CONFIG.COLORS[result.label] || TRIAGE_CONFIG.COLORS.ERROR;
  priorityCell.setBackground(color);
  
  // Add note with full response if needed
  if (result.fullResponse) {
    priorityCell.setNote('AI Model: ' + TRIAGE_CONFIG.MODEL_NAME + '\n' + result.fullResponse);
  }
}

// ============================================================================
// GEMINI API INTEGRATION
// ============================================================================

/**
 * Call Gemini API for triage assessment
 * @param {Object} patientData - Patient clinical data
 * @returns {Object} Triage result
 */
function callGeminiForTriage(patientData) {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    return {
      success: false,
      priority: 'ERROR',
      label: 'CONFIG ERROR',
      reasoning: 'API key not configured. Add GEMINI_API_KEY to Script Properties.',
      error: 'Missing API key'
    };
  }
  
  const prompt = buildTriagePrompt(patientData);
  
  try {
    const response = callGeminiAPI(apiKey, prompt);
    return parseTriageResponse(response);
  } catch (error) {
    console.error('Gemini API error:', error.message);
    console.error('Patient data summary - Age:', patientData.age, 
                  'GFR:', patientData.gfr, 
                  'Creat:', patientData.creatinine,
                  'Self-referral:', patientData.isSelfReferral);
    
    // Fallback to rule-based triage if API fails
    const fallbackResult = fallbackRuleBasedTriage(patientData);
    fallbackResult.apiError = error.message;  // Track that this was a fallback
    return fallbackResult;
  }
}

/**
 * Get Gemini API key from Script Properties
 * @returns {string|null} API key or null if not found
 */
function getGeminiApiKey() {
  try {
    const props = PropertiesService.getScriptProperties();
    return props.getProperty('GEMINI_API_KEY');
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}

/**
 * Build the triage prompt for Gemini 2.5 Pro with enhanced context
 * @param {Object} data - Patient data including clinic/provider context and calculated eGFR
 * @returns {string} Formatted prompt
 */
function buildTriagePrompt(data) {
  // Build referral source section based on self-referral status
  let referralSource = '';
  if (data.isSelfReferral) {
    referralSource = '- Referral Source: Self-referred patient';
  } else {
    const clinicInfo = data.clinic ? data.clinic : 'Not specified';
    const providerInfo = data.provider ? data.provider : 'Not specified';
    referralSource = `- Referring Clinic: ${clinicInfo}
- Referring Provider: ${providerInfo}`;
  }

  // Build GFR comparison section
  let gfrSection = `- Reported GFR: ${data.gfr} mL/min`;
  if (data.calculatedEGFR !== null) {
    gfrSection += `\n- Calculated eGFR (CKD-EPI 2021): ${data.calculatedEGFR} mL/min`;
    // Calculate discrepancy if reported GFR is a number
    const reportedGFR = parseFloat(data.gfr);
    if (!isNaN(reportedGFR)) {
      const discrepancy = Math.abs(reportedGFR - data.calculatedEGFR);
      if (discrepancy > 10) {
        gfrSection += `\n- ⚠️ GFR DISCREPANCY: ${discrepancy.toFixed(1)} mL/min difference - USE LOWER VALUE for priority`;
      } else {
        gfrSection += `\n- GFR values match (within 10 mL/min)`;
      }
    }
  } else {
    gfrSection += `\n- Calculated eGFR: Unable to calculate (missing creatinine, age, or sex)`;
  }

  // Build missing data warning if no clinical data provided
  let missingDataWarning = '';
  if (!data.hasClinicalData) {
    missingDataWarning = `
⚠️ NO CLINICAL DATA PROVIDED: Reason, Creatinine, and GFR are all missing.
You must acknowledge this in your reasoning and use available context (age, sex, referring facility) to make a judgment.`;
  }

  return `You are a nephrology triage assistant for The Kidney Experts, PLLC in West Tennessee.

PATIENT DATA:
- Age: ${data.age} years (${data.ageBracket}) | Sex: ${data.sex}
${referralSource}
- Reason for Referral: ${data.reason}
- Last Creatinine: ${data.creatinine} mg/dL
${gfrSection}
- Days since last lab: ${data.daysSinceLab}
${missingDataWarning}

PRIORITY SCALE:
1-EMERGENT: GFR <15, Creat >5, dialysis, ESRD, stage 5, severe hyperkalemia, uremic
2-URGENT: GFR 15-29 (Stage 4), Creat 3-5, rapid decline, AKI, new stage 4
3-SOON: GFR 30-44 (Stage 3b), Creat 2-3, significant impairment, AKI recovery
4-ROUTINE: GFR 45-59 (Stage 3a), Creat 1.5-2, stable CKD, proteinuria workup
5-LOW: GFR >60, normal labs, cysts, mild hematuria, second opinion, care transfer

ESCALATION RULES:
- If calculated eGFR differs >10 from reported GFR, USE THE LOWER VALUE for priority
- Labs >90 days old + concerning reason = bump up one level
- Elderly (80+) with moderate values = consider escalation
- Pediatric (<18) = escalate one level
- Self-referred + no concerning data = typically LOW
- Labs unavailable + "dialysis/ESRD/stage 5" = EMERGENT
- Labs unavailable + "stage 4/acute" = URGENT
- Labs unavailable + vague reason = ROUTINE

MISSING DATA HANDLING:
- If NO clinical data (reason, creatinine, GFR all missing), you MUST acknowledge this
- Consider available context: patient age, sex, referring facility type
- Skilled nursing facilities (SNF), hospitals, or rehab centers may warrant SOON for elderly patients
- Default to ROUTINE with note: "No clinical data provided. [Context]. ROUTINE pending records."
- Always recommend obtaining labs and referral reason

RESPOND IN THIS EXACT FORMAT:
PRIORITY: [1-5]
LABEL: [EMERGENT/URGENT/SOON/ROUTINE/LOW]
REASONING: [Concise clinical rationale, max 450 chars. If no clinical data, start with "No clinical data provided." then use context (age, facility type) to justify priority. If GFR discrepancy exists, note both values. Include age/sex, lab age, key phrases from reason. Be direct.]`;
}

/**
 * Call the Gemini API
 * @param {string} apiKey - API key
 * @param {string} prompt - The prompt to send
 * @returns {string} API response text
 */
function callGeminiAPI(apiKey, prompt) {
  const url = TRIAGE_CONFIG.API_URL + '?key=' + apiKey;
  
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.2,  // Low for consistent clinical decisions
      maxOutputTokens: 500,  // Increased for 450 char reasoning
      topP: 0.8,
      topK: 10,
      // Gemini 2.5 Pro uses "thinking" for better reasoning
      // Higher budget = better clinical reasoning, slightly slower
      thinkingConfig: {
        thinkingBudget: 256  // Increased from 128 for better reasoning
      }
    }
    // Note: safetySettings removed - HARM_CATEGORY_MEDICAL is not a valid category
    // Valid categories: HARM_CATEGORY_HATE_SPEECH, HARM_CATEGORY_SEXUALLY_EXPLICIT,
    // HARM_CATEGORY_DANGEROUS_CONTENT, HARM_CATEGORY_HARASSMENT
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  // Log response for debugging (truncated to avoid log overflow)
  console.log('Gemini API response code:', responseCode);
  
  if (responseCode !== 200) {
    console.error('Gemini API error response:', responseText.substring(0, 500));
    throw new Error('API returned status ' + responseCode + ': ' + responseText.substring(0, 200));
  }
  
  const jsonResponse = JSON.parse(responseText);
  
  // Check for safety blocks or other finish reasons
  if (jsonResponse.candidates && 
      jsonResponse.candidates[0] && 
      jsonResponse.candidates[0].finishReason === 'SAFETY') {
    console.warn('Response blocked by safety filters');
    throw new Error('Safety filter blocked response - medical content may have triggered filter');
  }
  
  // Extract text from response - handle thinking model response structure
  // Gemini 2.5 Pro includes "thought" parts and "answer" parts
  // We want the answer parts (where thought is false or undefined)
  if (jsonResponse.candidates && 
      jsonResponse.candidates[0] && 
      jsonResponse.candidates[0].content &&
      jsonResponse.candidates[0].content.parts) {
    
    const parts = jsonResponse.candidates[0].content.parts;
    let answerText = '';
    let thoughtText = '';
    
    // Iterate through all parts, collecting answer text (non-thought parts)
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].text) {
        if (parts[i].thought === true) {
          // This is a thinking/reasoning part - log but don't use
          thoughtText += parts[i].text;
          console.log('Found thought part', i, '(internal reasoning)');
        } else {
          // This is the actual answer
          answerText += parts[i].text;
          console.log('Found answer text in part', i);
        }
      }
    }
    
    // Return the answer text if we found any
    if (answerText) {
      return answerText;
    }
    
    // If no explicit answer but we have thought text, something is wrong
    if (thoughtText) {
      console.warn('Only found thought parts, no answer part. Thought:', thoughtText.substring(0, 200));
      throw new Error('Response only contained thinking parts, no answer');
    }
  }
  
  // Log full response structure for debugging if we get here
  console.error('Unexpected response structure:', JSON.stringify(jsonResponse).substring(0, 1000));
  throw new Error('Unexpected API response structure - no text content found');
}

/**
 * Parse the triage response from Gemini
 * @param {string} responseText - Raw response text
 * @returns {Object} Parsed triage result
 */
function parseTriageResponse(responseText) {
  try {
    const lines = responseText.trim().split('\n');
    let priority = null;
    let label = null;
    let reasoning = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('PRIORITY:')) {
        priority = trimmedLine.replace('PRIORITY:', '').trim();
      } else if (trimmedLine.startsWith('LABEL:')) {
        label = trimmedLine.replace('LABEL:', '').trim();
      } else if (trimmedLine.startsWith('REASONING:')) {
        reasoning = trimmedLine.replace('REASONING:', '').trim();
      }
    }
    
    // Validate parsed values
    if (!priority || !label || !reasoning) {
      console.warn('Incomplete parse from response:', responseText);
      // Try to extract what we can
      if (!priority) priority = '4';
      if (!label) label = 'ROUTINE';
      if (!reasoning) reasoning = 'Unable to parse AI response fully';
    }
    
    // Validate priority is 1-5
    const priorityNum = parseInt(priority);
    if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 5) {
      priority = '4';
      label = 'ROUTINE';
    }
    
    // Validate label
    const validLabels = ['EMERGENT', 'URGENT', 'SOON', 'ROUTINE', 'LOW'];
    if (!validLabels.includes(label.toUpperCase())) {
      label = 'ROUTINE';
    }
    
    return {
      success: true,
      priority: priority,
      label: label.toUpperCase(),
      reasoning: reasoning.substring(0, 450),
      fullResponse: responseText
    };
    
  } catch (error) {
    console.error('Error parsing triage response:', error);
    return {
      success: false,
      priority: '4',
      label: 'ROUTINE',
      reasoning: 'Parse error - defaulting to routine',
      error: error.message
    };
  }
}

// ============================================================================
// FALLBACK RULE-BASED TRIAGE
// ============================================================================

/**
 * Fallback rule-based triage when API is unavailable
 * @param {Object} data - Patient data
 * @returns {Object} Triage result
 */
function fallbackRuleBasedTriage(data) {
  const creat = parseFloat(data.creatinine) || 0;
  const gfr = parseFloat(data.gfr) || 999;
  const reason = (data.reason || '').toLowerCase();
  
  let priority, label, reasoning;
  
  // Check for emergent keywords
  const emergentKeywords = ['dialysis', 'esrd', 'end stage', 'stage 5', 'uremic', 'hyperkalemia'];
  const urgentKeywords = ['stage 4', 'acute renal failure', 'acute kidney', 'arf', 'aki'];
  const soonKeywords = ['stage 3b', 'declining', 'worsening', 'rapid'];
  
  if (emergentKeywords.some(kw => reason.includes(kw)) || gfr < 15 || creat > 5) {
    priority = '1';
    label = 'EMERGENT';
    reasoning = 'Rule-based: Critical GFR/Creat or emergent keywords detected';
  } else if (urgentKeywords.some(kw => reason.includes(kw)) || (gfr >= 15 && gfr < 30) || (creat >= 3 && creat <= 5)) {
    priority = '2';
    label = 'URGENT';
    reasoning = 'Rule-based: Stage 4 range or urgent keywords detected';
  } else if (soonKeywords.some(kw => reason.includes(kw)) || (gfr >= 30 && gfr < 45) || (creat >= 2 && creat < 3)) {
    priority = '3';
    label = 'SOON';
    reasoning = 'Rule-based: Stage 3b range or concerning keywords';
  } else if ((gfr >= 45 && gfr < 60) || (creat >= 1.5 && creat < 2)) {
    priority = '4';
    label = 'ROUTINE';
    reasoning = 'Rule-based: Stage 3a range, stable presentation';
  } else {
    priority = '5';
    label = 'LOW';
    reasoning = 'Rule-based: Near-normal labs or routine evaluation';
  }
  
  return {
    success: true,
    priority: priority,
    label: label,
    reasoning: reasoning,
    fallback: true
  };
}

// ============================================================================
// MENU FUNCTIONS
// ============================================================================

/**
 * Triage a selected range of rows
 * User can select multiple rows and triage them all at once
 */
function triageSelectedRange() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Form Responses 1');
  const selection = ss.getSelection();
  const activeRange = selection.getActiveRange();
  
  if (!activeRange) {
    ui.alert('No Selection', 'Please select one or more rows to triage.', ui.ButtonSet.OK);
    return;
  }
  
  const startRow = activeRange.getRow();
  const numRows = activeRange.getNumRows();
  const endRow = startRow + numRows - 1;
  
  // Validate selection
  if (startRow < 2) {
    ui.alert('Invalid Selection', 'Please select data rows (not the header row).', ui.ButtonSet.OK);
    return;
  }
  
  // Confirm with user
  const response = ui.alert(
    'Triage Selected Rows',
    'This will run AI triage on rows ' + startRow + ' to ' + endRow + ' (' + numRows + ' rows).\n\n' +
    'Existing triage results will be overwritten.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  let processed = 0;
  let errors = 0;
  const results = [];
  
  // Process each row in the selection
  for (let row = startRow; row <= endRow; row++) {
    // Update progress
    ss.toast('Processing row ' + row + ' of ' + endRow + '...', 'AI Triage', -1);
    
    const result = triageReferralRow(sheet, row);
    
    if (result.success) {
      processed++;
      results.push({
        row: row,
        priority: result.priority + '-' + result.label,
        reasoning: result.reasoning
      });
    } else {
      errors++;
      results.push({
        row: row,
        priority: 'ERROR',
        reasoning: result.error || 'Unknown error'
      });
    }
    
    // Small delay to avoid rate limiting (50ms between rows)
    if (row < endRow) {
      Utilities.sleep(50);
    }
  }
  
  // Clear the progress toast
  ss.toast('', '', 1);
  
  // Build summary message
  let summaryMessage = 'Processed: ' + processed + '\nErrors: ' + errors + '\n\n';
  
  // Show first few results
  const maxToShow = Math.min(results.length, 10);
  summaryMessage += 'Results (first ' + maxToShow + '):\n';
  for (let i = 0; i < maxToShow; i++) {
    summaryMessage += 'Row ' + results[i].row + ': ' + results[i].priority + '\n';
  }
  
  if (results.length > maxToShow) {
    summaryMessage += '... and ' + (results.length - maxToShow) + ' more rows';
  }
  
  ui.alert('Triage Complete', summaryMessage, ui.ButtonSet.OK);
}

/**
 * Triage the currently selected row
 */
function triageSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const selection = SpreadsheetApp.getActiveSpreadsheet().getSelection();
  const row = selection.getCurrentCell().getRow();
  
  if (row < 2) {
    SpreadsheetApp.getUi().alert('Please select a data row (not the header).');
    return;
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Running AI triage on row ' + row + '...', 'AI Triage', -1);
  
  const result = triageReferralRow(sheet, row);
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
  
  if (result.success) {
    SpreadsheetApp.getUi().alert(
      'AI Triage Complete',
      'Priority: ' + result.priority + '-' + result.label + '\n\n' +
      'Reasoning: ' + result.reasoning,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert(
      'AI Triage Error',
      'Error: ' + result.error + '\n\n' +
      'Fallback result: ' + result.priority + '-' + result.label,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Batch triage all rows without AI triage results
 */
function triageAllPending() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    ui.alert('No data rows to process.');
    return;
  }
  
  const response = ui.alert(
    'Batch AI Triage',
    'This will run AI triage on all rows without existing triage results.\n\n' +
    'This may take several minutes for large datasets.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  // Get existing triage values
  const triageRange = sheet.getRange(2, TRIAGE_CONFIG.COLUMNS.AI_PRIORITY, lastRow - 1, 1);
  const triageValues = triageRange.getValues();
  
  for (let i = 0; i < triageValues.length; i++) {
    const row = i + 2;
    const existingTriage = triageValues[i][0];
    
    // Skip if already triaged
    if (existingTriage && existingTriage !== '' && existingTriage !== 'ERROR') {
      skipped++;
      continue;
    }
    
    // Update progress
    if (processed % 10 === 0) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Processing row ' + row + ' of ' + lastRow + '...',
        'AI Triage Progress',
        -1
      );
    }
    
    const result = triageReferralRow(sheet, row);
    
    if (result.success) {
      processed++;
    } else {
      errors++;
    }
    
    // Small delay to avoid rate limiting
    Utilities.sleep(100);
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
  
  ui.alert(
    'Batch Triage Complete',
    'Processed: ' + processed + '\n' +
    'Skipped (already triaged): ' + skipped + '\n' +
    'Errors: ' + errors,
    ui.ButtonSet.OK
  );
}

/**
 * Show triage statistics
 */
function showTriageStatistics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('No data to analyze.');
    return;
  }
  
  const triageRange = sheet.getRange(2, TRIAGE_CONFIG.COLUMNS.AI_PRIORITY, lastRow - 1, 1);
  const values = triageRange.getValues();
  
  const stats = {
    total: lastRow - 1,
    triaged: 0,
    pending: 0,
    emergent: 0,
    urgent: 0,
    soon: 0,
    routine: 0,
    low: 0,
    error: 0
  };
  
  values.forEach(row => {
    const value = (row[0] || '').toString().toUpperCase();
    
    if (!value || value === '') {
      stats.pending++;
    } else if (value.includes('EMERGENT')) {
      stats.emergent++;
      stats.triaged++;
    } else if (value.includes('URGENT')) {
      stats.urgent++;
      stats.triaged++;
    } else if (value.includes('SOON')) {
      stats.soon++;
      stats.triaged++;
    } else if (value.includes('ROUTINE')) {
      stats.routine++;
      stats.triaged++;
    } else if (value.includes('LOW')) {
      stats.low++;
      stats.triaged++;
    } else if (value.includes('ERROR')) {
      stats.error++;
    } else {
      stats.pending++;
    }
  });
  
  const message = 
    'Total Referrals: ' + stats.total + '\n' +
    'Triaged: ' + stats.triaged + '\n' +
    'Pending: ' + stats.pending + '\n\n' +
    'DISTRIBUTION:\n' +
    '1-EMERGENT: ' + stats.emergent + ' (' + ((stats.emergent/stats.triaged)*100 || 0).toFixed(1) + '%)\n' +
    '2-URGENT: ' + stats.urgent + ' (' + ((stats.urgent/stats.triaged)*100 || 0).toFixed(1) + '%)\n' +
    '3-SOON: ' + stats.soon + ' (' + ((stats.soon/stats.triaged)*100 || 0).toFixed(1) + '%)\n' +
    '4-ROUTINE: ' + stats.routine + ' (' + ((stats.routine/stats.triaged)*100 || 0).toFixed(1) + '%)\n' +
    '5-LOW: ' + stats.low + ' (' + ((stats.low/stats.triaged)*100 || 0).toFixed(1) + '%)\n\n' +
    'Errors: ' + stats.error;
  
  SpreadsheetApp.getUi().alert('AI Triage Statistics', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Clear all triage results (with confirmation)
 */
function clearAllTriageResults() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Clear All Triage Results?',
    'This will remove all AI triage priorities, reasoning, and timestamps.\n\n' +
    'This action cannot be undone.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return;
  
  // Clear columns AH, AI, AJ
  sheet.getRange(2, TRIAGE_CONFIG.COLUMNS.AI_PRIORITY, lastRow - 1, 3).clearContent();
  sheet.getRange(2, TRIAGE_CONFIG.COLUMNS.AI_PRIORITY, lastRow - 1, 1).setBackground(null);
  
  ui.alert('All triage results cleared.');
}

/**
 * Test the Gemini API connection
 */
function testGeminiConnection() {
  const ui = SpreadsheetApp.getUi();
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    ui.alert(
      'API Key Not Found',
      'Please add your Gemini API key to Script Properties:\n\n' +
      '1. Go to Project Settings (gear icon)\n' +
      '2. Click "Script Properties"\n' +
      '3. Add property: GEMINI_API_KEY\n' +
      '4. Value: Your API key',
      ui.ButtonSet.OK
    );
    return;
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Testing Gemini API connection...', 'API Test', -1);
  
  try {
    const testPrompt = 'Respond with exactly: CONNECTION_OK';
    const response = callGeminiAPI(apiKey, testPrompt);
    
    SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
    
    if (response.includes('CONNECTION_OK') || response.length > 0) {
      ui.alert(
        'Connection Successful',
        'Gemini API is working correctly.\n\n' +
        'Model: ' + TRIAGE_CONFIG.MODEL_NAME + '\n' +
        'Response received: ' + response.substring(0, 100),
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('Unexpected Response', 'Response: ' + response, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
    ui.alert(
      'Connection Failed',
      'Error: ' + error.message + '\n\n' +
      'Please check:\n' +
      '1. API key is correct\n' +
      '2. Generative Language API is enabled\n' +
      '3. API key has correct restrictions',
      ui.ButtonSet.OK
    );
  }
}

// ============================================================================
// FORM SUBMIT INTEGRATION
// ============================================================================

/**
 * Triage a row on form submit (called from OnFormSubmit.js)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 * @returns {Object} Triage result
 */
function normalizeRowAITriage(sheet, row) {
  try {
    const result = triageReferralRow(sheet, row);
    
    return {
      field: 'AITriage',
      action: result.success ? 'Triaged' : 'Error',
      priority: result.priority + '-' + result.label,
      reasoning: result.reasoning
    };
    
  } catch (error) {
    console.error('Error in form submit triage:', error);
    return {
      field: 'AITriage',
      action: 'Error',
      error: error.message
    };
  }
}
