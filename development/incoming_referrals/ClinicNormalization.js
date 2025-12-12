/**
 * Clinic Normalization Module
 * @module ClinicNormalization
 * @description Handles standardization, validation, and normalization of clinic names
 * @author The Kidney Experts, PLLC
 * @version 5.0 - Refactored to use centralized dictionaries
 * 
 * DEPENDENCIES:
 * - Dict_Clinics.js (must be loaded first in Google Apps Script)
 *   Provides: CLINIC_CONFIG, CLINIC_SPECIAL_CASES, CLINICS, CLINIC_STANDARDIZATION
 */

// ============================================
// MAIN NORMALIZATION FUNCTIONS
// ============================================

/**
 * Main function to normalize all clinic names
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of normalization results
 */
function normalizeClinicNames(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting clinic name normalization...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, errors: 0 };
    }
    
    // Get all clinic names at once
    const range = sheet.getRange(2, CLINIC_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    // Track statistics and duplicates
    const stats = {
      processed: 0,
      corrected: 0,
      selfReferrals: 0,
      government: 0,
      unknown: 0,
      duplicates: new Map()
    };
    
    // Process each clinic name
    for (let i = 0; i < values.length; i++) {
      const originalValue = values[i][0];
      
      if (originalValue && originalValue !== '') {
        stats.processed++;
        
        const result = normalizeClinicName(originalValue.toString());
        
        values[i][0] = result.normalized;
        backgrounds[i] = [result.backgroundColor];
        
        // Track statistics
        if (result.category === 'self-referral') stats.selfReferrals++;
        if (result.category === 'government') stats.government++;
        if (result.category === 'unknown') stats.unknown++;
        if (result.wasNormalized) stats.corrected++;
        
        // Track duplicates for reporting
        const normalizedKey = result.normalized.toLowerCase();
        if (!stats.duplicates.has(normalizedKey)) {
          stats.duplicates.set(normalizedKey, []);
        }
        stats.duplicates.get(normalizedKey).push(i + 2);
        
        // Add note if there was an issue
        if (result.note) {
          notes.push({
            row: i + 2,
            col: CLINIC_CONFIG.COLUMN.INDEX,
            message: result.note
          });
        }
      } else {
        backgrounds[i] = ['#FFFFFF'];
      }
    }
    
    // Apply all changes in batch
    range.setValues(values);
    range.setBackgrounds(backgrounds);
    
    // Add notes
    notes.forEach(note => {
      sheet.getRange(note.row, note.col).setNote(note.message);
    });
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`Clinic normalization complete in ${processingTime} seconds`);
    console.log(`Processed: ${stats.processed}, Corrected: ${stats.corrected}`);
    console.log(`Self-referrals: ${stats.selfReferrals}, Government: ${stats.government}`);
    
    // Generate detailed report
    generateClinicReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error in normalizeClinicNames:', error);
    throw new Error(`Failed to normalize clinic names: ${error.message}`);
  }
}

/**
 * Normalize a single clinic name
 * @param {string} clinicInput - Raw clinic name input
 * @returns {Object} Object with normalized name and metadata
 */
function normalizeClinicName(clinicInput) {
  try {
    if (!clinicInput) {
      return {
        normalized: '',
        original: '',
        wasNormalized: false,
        backgroundColor: '#FFFFFF',
        category: 'empty'
      };
    }
    
    let clinic = clinicInput.toString().trim();
    const originalClinic = clinic;
    
    // Step 1: Clean the name first
    clinic = cleanClinicName(clinic);
    
    // Step 2: Check for special cases (use CLINIC_SPECIAL_CASES from Dict_Clinics.js)
    const lowerClinic = clinic.toLowerCase();
    const specialCases = (typeof CLINIC_SPECIAL_CASES !== 'undefined') ? CLINIC_SPECIAL_CASES : {
      selfReferrals: ['self', 'self referral', 'self-referral', 'patient referral', 'walk in', 'walk-in'],
      unknown: ['unknown', 'n/a', 'na', 'none', 'tbd', ''],
      governmentFacilities: ['va ', 'veterans', 'health dept', 'correctional']
    };
    
    // Check for self-referrals
    if (specialCases.selfReferrals && specialCases.selfReferrals.some(pattern => 
        lowerClinic === pattern || lowerClinic.includes(pattern))) {
      return {
        normalized: 'Self Referral',
        original: originalClinic,
        wasNormalized: true,
        backgroundColor: CLINIC_CONFIG.FORMATTING.SELF_REFERRAL_COLOR,
        category: 'self-referral',
        note: 'Self referral - no clinic involved'
      };
    }
    
    // Check for unknown/invalid
    if (specialCases.unknown && specialCases.unknown.some(pattern => 
        lowerClinic === pattern || lowerClinic === '')) {
      return {
        normalized: 'Unknown Clinic',
        original: originalClinic,
        wasNormalized: true,
        backgroundColor: CLINIC_CONFIG.FORMATTING.UNKNOWN_COLOR,
        category: 'unknown',
        note: 'Unknown or missing clinic information'
      };
    }
    
    // Step 3: Apply standardization dictionary (use CLINICS from Dict_Clinics.js)
    const clinicDict = (typeof CLINICS !== 'undefined') ? CLINICS : 
                       (typeof CLINIC_STANDARDIZATION !== 'undefined') ? CLINIC_STANDARDIZATION : {};
    
    if (clinicDict[lowerClinic]) {
      clinic = clinicDict[lowerClinic];
    } else {
      // Step 4: Fix common patterns before checking again
      clinic = fixCommonPatterns(clinic);
      
      // Check again after fixing patterns
      const cleanedLower = clinic.toLowerCase();
      if (clinicDict[cleanedLower]) {
        clinic = clinicDict[cleanedLower];
      } else {
        // Step 5: Apply partial matching rules for complex cases
        const standardized = applyComplexStandardization(clinic);
        if (standardized !== clinic) {
          clinic = standardized;
        } else {
          // Step 6: If still not found, apply proper capitalization
          clinic = properCapitalizationClinic(clinic);
        }
      }
    }
    
    // Step 7: Determine category and color
    let category = 'standard';
    let backgroundColor = '#FFFFFF';
    
    if (specialCases.governmentFacilities && specialCases.governmentFacilities.some(pattern => 
        clinic.toLowerCase().includes(pattern))) {
      category = 'government';
      backgroundColor = CLINIC_CONFIG.FORMATTING.GOVERNMENT_COLOR;
    } else if (clinic !== originalClinic) {
      backgroundColor = CLINIC_CONFIG.FORMATTING.CORRECTED_COLOR;
    }
    
    return {
      normalized: clinic,
      original: originalClinic,
      wasNormalized: clinic !== originalClinic,
      backgroundColor: backgroundColor,
      category: category,
      note: clinic !== originalClinic ? `Standardized from: ${originalClinic}` : null
    };
    
  } catch (error) {
    console.error('Error normalizing clinic name:', error);
    return {
      normalized: clinicInput,
      original: clinicInput,
      wasNormalized: false,
      backgroundColor: CLINIC_CONFIG.FORMATTING.UNKNOWN_COLOR,
      category: 'error',
      note: `Error: ${error.message}`
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clean clinic name by removing extra spaces, leading dashes, and standardizing punctuation
 * @private
 */
function cleanClinicName(name) {
  return name
    .replace(/^[\s\-\.]+/, '')
    .replace(/[\s\-\.]+$/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—]\s*/g, ' - ')
    .replace(/\b([A-Z])\./g, '$1')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*&\s*/g, ' & ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\-+/g, '-')
    .trim();
}

/**
 * Apply complex standardization rules for partial matches
 * @private
 */
function applyComplexStandardization(name) {
  const lowerName = name.toLowerCase();
  
  // West Tennessee Healthcare variations
  if (lowerName.includes('west tenn') || lowerName.includes('west tn') || 
      lowerName.includes('wth') || lowerName.includes('wtmg')) {
    if (lowerName.includes('endocrin')) return 'West Tennessee Healthcare - Endocrinology';
    if (lowerName.includes('cardio')) return 'West Tennessee Healthcare - Cardiology';
    if (lowerName.includes('neuro')) return 'West Tennessee Healthcare - Neurology';
    if (lowerName.includes('peds') || lowerName.includes('pediatric')) return 'West Tennessee Healthcare - Pediatrics';
    if (lowerName.includes('primary')) return 'West Tennessee Healthcare Primary Care';
    return 'West Tennessee Healthcare';
  }
  
  // Baptist/BMG variations
  if (lowerName.includes('bmg') || (lowerName.includes('baptist') && !lowerName.includes('jackson clinic'))) {
    if (lowerName.includes('tipton')) return 'Baptist Medical Group - Tipton Family Medicine';
    if (lowerName.includes('doctor')) return 'Baptist Medical Group - The Doctor\'s Clinic';
    if (lowerName.includes('rheum')) return 'Baptist Medical Group - Rheumatology';
    if (lowerName.includes('women')) return 'Baptist Medical Group - Women\'s Health Center';
    return 'Baptist Medical Group';
  }
  
  // Jackson Clinic variations
  if (lowerName.includes('jackson clinic') || lowerName === 'jackson') {
    if (lowerName.includes('baptist')) return 'Jackson Clinic Baptist Campus';
    if (lowerName.includes('north')) return 'Jackson Clinic North';
    if (lowerName.includes('bolivar')) return 'Jackson Clinic - Bolivar';
    if (lowerName.includes('humboldt')) return 'Jackson Clinic - Humboldt';
    if (lowerName.includes('milan')) return 'Jackson Clinic - Milan';
    if (lowerName.includes('medina')) return 'Jackson Clinic - Medina';
    return 'Jackson Clinic';
  }
  
  // Methodist variations
  if (lowerName.includes('methodist')) {
    if (lowerName.includes('transplant')) return 'Methodist Transplant Institute';
    if (lowerName.includes('rheum')) return 'Methodist Medical Group - Rheumatology';
    return 'Methodist Medical Group';
  }
  
  // Check for specific doctors
  if (lowerName.startsWith('dr ') || lowerName.startsWith('dr. ')) {
    return properCapitalizationClinic(name);
  }
  
  // AHC facilities
  if (lowerName.startsWith('ahc ')) {
    const location = name.substring(4);
    return `AHC ${properCapitalizationClinic(location)}`;
  }
  
  return name;
}

/**
 * Fix common patterns in clinic names
 * @private
 */
function fixCommonPatterns(name) {
  return name
    .replace(/\bwalk[\s-]*in\b/gi, 'Walk-In')
    .replace(/\bwalkin\b/gi, 'Walk-In')
    .replace(/\bwoman['']?s?\b/gi, 'Women\'s')
    .replace(/\bwomens\b/gi, 'Women\'s')
    .replace(/\bhealth\s+care\b/gi, 'Healthcare')
    .replace(/\bhealthcenter\b/gi, 'Health Center')
    .replace(/\bmed\s+center\b/gi, 'Medical Center')
    .replace(/\bmed\s+clinic\b/gi, 'Medical Clinic')
    .replace(/\bfam\s+med\b/gi, 'Family Medicine')
    .replace(/\bfam\s+practice\b/gi, 'Family Practice')
    .replace(/\bmedcial\b/gi, 'Medical')
    .replace(/\bmedicla\b/gi, 'Medical')
    .replace(/\bfamiliy\b/gi, 'Family')
    .replace(/\bfamly\b/gi, 'Family')
    .replace(/\bprimay\b/gi, 'Primary')
    .replace(/\bclinci\b/gi, 'Clinic')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Apply proper capitalization rules for clinic names
 * @private
 */
function properCapitalizationClinic(name) {
  const lowercaseWords = ['of', 'and', 'the', 'in', 'at', 'for', 'to', 'with', 'on'];
  const acronyms = ['LLC', 'PLLC', 'PC', 'PA', 'MD', 'NP', 'DO', 'RN', 'LPN',
                    'BMG', 'UT', 'VA', 'PQC', 'SDG', 'TN', 'RHC', 'ER', 'ED', 
                    'AHC', 'TKE', 'KCC', 'MMG', 'JUA', 'TSVH', 'US', 'NP'];
  
  const words = name.split(/\b/);
  
  const capitalized = words.map((word, index) => {
    if (!word.trim()) return word;
    
    const upperWord = word.toUpperCase();
    if (acronyms.includes(upperWord)) {
      return upperWord;
    }
    
    if (index > 0 && lowercaseWords.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    
    // Special cases for names
    if (word.toLowerCase() === 'mcnairy') return 'McNairy';
    if (word.toLowerCase() === 'mckenzie') return 'McKenzie';
    if (word.toLowerCase() === 'mcdowell') return 'McDowell';
    if (word.toLowerCase() === 'lebonheur') return 'LeBonheur';
    
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return capitalized.join('');
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

/**
 * Generate a detailed clinic normalization report
 * @param {Object} stats - Statistics from normalization
 */
function generateClinicReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('Clinic Normalization Report');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('Clinic Normalization Report');
    } else {
      reportSheet.clear();
    }
    
    // Prepare duplicate analysis
    const duplicateAnalysis = [];
    let duplicateCount = 0;
    
    stats.duplicates.forEach((rows, clinicName) => {
      if (rows.length > 1) {
        duplicateCount += rows.length - 1;
        duplicateAnalysis.push([
          clinicName,
          rows.length,
          rows.slice(0, 10).join(', ') + (rows.length > 10 ? '...' : '')
        ]);
      }
    });
    
    duplicateAnalysis.sort((a, b) => b[1] - a[1]);
    
    // Create report headers
    const headers = [
      ['Clinic Name Normalization Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Version:', '5.0 - Centralized Dictionaries'],
      [''],
      ['Summary Statistics'],
      ['Total Processed:', stats.processed],
      ['Names Corrected:', stats.corrected],
      ['Self Referrals:', stats.selfReferrals],
      ['Government Facilities:', stats.government],
      ['Unknown/Invalid:', stats.unknown],
      ['Potential Duplicates:', duplicateCount],
      ['Unique Clinics:', stats.duplicates.size],
      [''],
      ['Top Duplicate Clinic Names'],
      ['Clinic Name', 'Count', 'Row Numbers']
    ];
    
    reportSheet.getRange(1, 1, headers.length, 3).setValues(headers);
    
    if (duplicateAnalysis.length > 0) {
      const topDuplicates = duplicateAnalysis.slice(0, 30);
      reportSheet.getRange(16, 1, topDuplicates.length, 3).setValues(topDuplicates);
    }
    
    // Format the report
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(5, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(14, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(15, 1, 1, 3).setFontWeight('bold').setBackground('#E8E8E8');
    
    reportSheet.autoResizeColumns(1, 3);
    
    // Add color legend
    const legendStart = Math.max(16 + duplicateAnalysis.length + 2, 50);
    const legend = [
      ['Color Legend'],
      ['', 'Self Referrals'],
      ['', 'Government Facilities'],
      ['', 'Corrected Names'],
      ['', 'Unknown/Invalid'],
      ['', 'Potential Duplicates']
    ];
    
    reportSheet.getRange(legendStart, 1, legend.length, 2).setValues(legend);
    reportSheet.getRange(legendStart, 1).setFontWeight('bold');
    
    reportSheet.getRange(legendStart + 1, 1).setBackground(CLINIC_CONFIG.FORMATTING.SELF_REFERRAL_COLOR);
    reportSheet.getRange(legendStart + 2, 1).setBackground(CLINIC_CONFIG.FORMATTING.GOVERNMENT_COLOR);
    reportSheet.getRange(legendStart + 3, 1).setBackground(CLINIC_CONFIG.FORMATTING.CORRECTED_COLOR);
    reportSheet.getRange(legendStart + 4, 1).setBackground(CLINIC_CONFIG.FORMATTING.UNKNOWN_COLOR);
    reportSheet.getRange(legendStart + 5, 1).setBackground(CLINIC_CONFIG.FORMATTING.DUPLICATE_COLOR);
    
    console.log('Clinic normalization report generated');
  } catch (error) {
    console.error('Error generating clinic report:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Find and highlight potential duplicate clinics
 */
function findDuplicateClinics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to analyze');
    return;
  }
  
  const range = sheet.getRange(2, CLINIC_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  const backgrounds = range.getBackgrounds();
  
  const clinicMap = new Map();
  
  values.forEach((row, index) => {
    const clinic = row[0];
    if (clinic && clinic !== '') {
      const normalized = normalizeClinicName(clinic.toString()).normalized.toLowerCase();
      if (!clinicMap.has(normalized)) {
        clinicMap.set(normalized, []);
      }
      clinicMap.get(normalized).push(index);
    }
  });
  
  let duplicateCount = 0;
  clinicMap.forEach((indices, clinic) => {
    if (indices.length > 1) {
      duplicateCount += indices.length;
      indices.forEach(index => {
        backgrounds[index][0] = CLINIC_CONFIG.FORMATTING.DUPLICATE_COLOR;
      });
    }
  });
  
  range.setBackgrounds(backgrounds);
  
  SpreadsheetApp.getUi().alert(
    `Found ${duplicateCount} potential duplicate clinic entries.\n` +
    `Unique clinics: ${clinicMap.size}\n\n` +
    `Check the Clinic Normalization Report for details.`
  );
}

/**
 * Menu function to normalize clinic names only
 */
function normalizeClinicNamesOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = normalizeClinicNames(sheet);
  SpreadsheetApp.getUi().alert(
    `Clinic names processed.\n\n` +
    `Corrected: ${stats.corrected}\n` +
    `Self-referrals: ${stats.selfReferrals}\n` +
    `Government facilities: ${stats.government}\n` +
    `Unknown: ${stats.unknown}\n` +
    `Unique clinics: ${stats.duplicates.size}`
  );
}

/**
 * Run clinic normalization from menu
 */
function runClinicNormalization() {
  normalizeClinicNamesOnly();
}

/**
 * Get clinic statistics for reporting
 * @returns {Object} Clinic statistics
 */
function getClinicStatistics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return null;
  }
  
  const range = sheet.getRange(2, CLINIC_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  const clinicCounts = new Map();
  let emptyCount = 0;
  let selfReferralCount = 0;
  let governmentCount = 0;
  let unknownCount = 0;
  
  values.forEach(row => {
    const clinic = row[0];
    if (!clinic || clinic === '') {
      emptyCount++;
    } else {
      const result = normalizeClinicName(clinic.toString());
      const normalized = result.normalized;
      
      if (result.category === 'self-referral') selfReferralCount++;
      if (result.category === 'government') governmentCount++;
      if (result.category === 'unknown') unknownCount++;
      
      clinicCounts.set(normalized, (clinicCounts.get(normalized) || 0) + 1);
    }
  });
  
  const sorted = Array.from(clinicCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  return {
    totalEntries: lastRow - 1,
    uniqueClinics: clinicCounts.size,
    emptyEntries: emptyCount,
    selfReferrals: selfReferralCount,
    government: governmentCount,
    unknown: unknownCount,
    topClinics: sorted.slice(0, 20),
    clinicCounts: clinicCounts
  };
}

/**
 * Identify self-referral entries
 */
function identifySelfReferrals() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to analyze');
    return;
  }
  
  const range = sheet.getRange(2, CLINIC_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  let selfReferralCount = 0;
  const selfReferralRows = [];
  
  values.forEach((row, index) => {
    const clinic = row[0];
    if (clinic) {
      const result = normalizeClinicName(clinic.toString());
      if (result.category === 'self-referral') {
        selfReferralCount++;
        selfReferralRows.push(index + 2);
      }
    }
  });
  
  SpreadsheetApp.getUi().alert(
    'Self-Referral Analysis',
    `Found ${selfReferralCount} self-referral entries.\n\n` +
    `Rows: ${selfReferralRows.slice(0, 20).join(', ')}${selfReferralRows.length > 20 ? '...' : ''}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
