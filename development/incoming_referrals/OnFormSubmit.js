/**
 * ============================================================================
 * ONFORMSUBMIT.JS - Real-Time Form Processing
 * ============================================================================
 * 
 * @fileoverview Real-time normalization handler for form submissions
 * @author The Kidney Experts, PLLC
 * @version 2.0.0
 * @lastModified 2025-11-30
 * 
 * DESCRIPTION:
 * This module handles real-time normalization when referrals are submitted
 * via Google Forms or AppSheet. It processes each new row immediately,
 * normalizing data before the n8n workflow sends to Google Chat.
 * 
 * KEY FEATURE - SELF-REFERRAL NORMALIZATION:
 * - Google Forms sends: Yes/No
 * - AppSheet sends: TRUE/FALSE
 * - This module converts all to: Yes/No (required by n8n workflow)
 * 
 * SETUP INSTRUCTIONS:
 * 1. In Google Sheets: Extensions > Apps Script
 * 2. Click "Triggers" (clock icon) in left sidebar
 * 3. Click "+ Add Trigger"
 * 4. Configure:
 *    - Function: onFormSubmitNormalize
 *    - Deployment: Head
 *    - Event source: From spreadsheet
 *    - Event type: On form submit
 * 5. Click "Save" and authorize
 * 
 * Or use menu: Referral System > Real-Time Triggers > Enable Form Submit Trigger
 * 
 * COLUMN REFERENCE:
 *   B (2)  = Self-Referral (Yes/No) - NORMALIZED FROM TRUE/FALSE
 *   D (4)  = Clinic Name
 *   E (5)  = Referring Provider
 *   F (6)  = Staff Name
 *   G (7)  = Clinic Phone
 *   H (8)  = Clinic Fax
 *   I (9)  = Patient Last Name
 *   J (10) = Patient First Name
 *   K (11) = Patient DOB (used by AI Triage)
 *   T (20) = Address
 *   U (21) = City
 *   V (22) = State
 *   X (24) = Patient Phone
 *   Y (25) = Date of Last Lab Work (used by AI Triage)
 *   AA (27) = Reason for Referral (used by AI Triage)
 *   AB (28) = Last Creatinine (used by AI Triage)
 *   AC (29) = Last GFR (used by AI Triage)
 *   AD (30) = Referral Dept Phone
 *   AE (31) = Complete (TRUE/FALSE)
 *   AF (32) = Status (New/In Progress/Complete)
 *   AH (34) = AI Priority (OUTPUT - set by AI Triage)
 *   AI (35) = AI Reasoning (OUTPUT - set by AI Triage)
 *   AJ (36) = AI Timestamp (OUTPUT - set by AI Triage)
 * 
 * DEPENDENCIES:
 *   - Dict_Providers.js (PROVIDERS dictionary)
 *   - Dict_Clinics.js (CLINICS dictionary)
 *   - Dict_Cities.js (CITIES dictionary)
 *   - Dict_States.js (STATES dictionary)
 *   - ProviderNormalization.js (normalizeProviderName)
 *   - ClinicNormalization.js (normalizeClinicName)
 *   - CityNormalization.js (normalizeCityName)
 *   - StateNormalization.js (normalizeStateName)
 *   - PhoneNormalization.js (normalizePhoneNumber)
 *   - GeminiTriage.js (normalizeRowAITriage) - AI-powered triage
 *   - GoogleChatNotifications.js (sendReferralNotification) - Real-time notifications
 * 
 * ============================================================================
 */

/**
 * Main trigger function - runs automatically when form is submitted
 * @param {Object} e - The form submit event object
 */
function onFormSubmitNormalize(e) {
  try {
    const startTime = new Date();
    
    // Get the row that was just submitted
    const range = e.range;
    const row = range.getRow();
    const sheet = range.getSheet();
    
    console.log(`Processing form submission - Row ${row}`);
    
    // Track what was normalized
    const results = {
      row: row,
      timestamp: new Date().toISOString(),
      normalized: []
    };
    
    // Normalize each field in the submitted row
    results.normalized.push(normalizeRowSelfReferral(sheet, row));
    results.normalized.push(normalizeRowProvider(sheet, row));
    results.normalized.push(normalizeRowClinic(sheet, row));
    results.normalized.push(normalizeRowCity(sheet, row));
    results.normalized.push(normalizeRowState(sheet, row));
    results.normalized.push(normalizeRowPhones(sheet, row));
    results.normalized.push(normalizeRowNames(sheet, row));
    results.normalized.push(normalizeRowAddress(sheet, row));
    
    // Set initial status
    setRowStatus(sheet, row);
    
    // Run AI Triage (async - uses Gemini API)
    try {
      if (typeof normalizeRowAITriage === 'function') {
        const triageResult = normalizeRowAITriage(sheet, row);
        results.normalized.push(triageResult);
        console.log('AI Triage result:', triageResult);
      }
    } catch (triageError) {
      console.error('AI Triage error (non-blocking):', triageError);
      results.normalized.push({ field: 'AITriage', action: 'Error', error: triageError.message });
    }
    
    // Send Google Chat notification
    try {
      if (typeof sendReferralNotification === 'function') {
        const notificationResult = sendReferralNotification(sheet, row);
        results.normalized.push({ 
          field: 'Notification', 
          action: notificationResult.success ? 'Sent' : 'Failed',
          escalated: notificationResult.escalated || false,
          type: notificationResult.type || 'unknown'
        });
        console.log('Notification result:', notificationResult);
      }
    } catch (notificationError) {
      console.error('Notification error (non-blocking):', notificationError);
      results.normalized.push({ field: 'Notification', action: 'Error', error: notificationError.message });
    }
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`Form submission normalized in ${processingTime}s:`, results);
    
    // Optional: Log to a separate sheet for monitoring
    logFormSubmission(results, processingTime);
    
  } catch (error) {
    console.error('Error in onFormSubmitNormalize:', error);
    // Don't throw - we don't want to block the form submission
    logError('onFormSubmitNormalize', error);
  }
}

/**
 * Normalize the Self-Referral field (Column B)
 * Converts AppSheet TRUE/FALSE to Google Form Yes/No format
 * This fixes the n8n workflow that expects Yes/No values
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 */
function normalizeRowSelfReferral(sheet, row) {
  const SELF_REFERRAL_COLUMN = 2; // Column B
  
  try {
    const cell = sheet.getRange(row, SELF_REFERRAL_COLUMN);
    const originalValue = cell.getValue();
    
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return { field: 'SelfReferral', action: 'Empty', original: '' };
    }
    
    // Convert to string for comparison
    const valueStr = originalValue.toString().trim().toUpperCase();
    
    // Map TRUE/FALSE to Yes/No
    let normalized = originalValue;
    if (valueStr === 'TRUE' || valueStr === '1') {
      normalized = 'Yes';
    } else if (valueStr === 'FALSE' || valueStr === '0') {
      normalized = 'No';
    } else if (valueStr === 'YES' || valueStr === 'NO') {
      // Already in correct format, just ensure proper casing
      normalized = valueStr === 'YES' ? 'Yes' : 'No';
    }
    
    if (normalized !== originalValue) {
      cell.setValue(normalized);
      cell.setNote(`Original: ${originalValue}`);
      return { field: 'SelfReferral', action: 'Normalized', original: originalValue, normalized: normalized };
    }
    
    return { field: 'SelfReferral', action: 'No change', original: originalValue };
    
  } catch (error) {
    console.error('Error normalizing self-referral:', error);
    return { field: 'SelfReferral', action: 'Error', error: error.message };
  }
}

/**
 * Normalize the referring provider for a single row
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 */
function normalizeRowProvider(sheet, row) {
  const PROVIDER_COLUMN = 5; // Column E
  
  try {
    const cell = sheet.getRange(row, PROVIDER_COLUMN);
    const originalValue = cell.getValue();
    
    if (!originalValue || originalValue === '') {
      cell.setValue('Unknown Provider');
      cell.setBackground('#FFE6E6'); // Light red
      return { field: 'Provider', action: 'Set to Unknown', original: '' };
    }
    
    // Use the deduplication function if available, otherwise normalize
    let normalized;
    if (typeof deduplicateProviderName === 'function') {
      const result = deduplicateProviderName(originalValue.toString());
      normalized = result.canonical;
      cell.setBackground(result.backgroundColor);
    } else if (typeof normalizeProviderName === 'function') {
      const result = normalizeProviderName(originalValue.toString());
      normalized = result.normalized;
      cell.setBackground(result.backgroundColor);
    } else {
      // Fallback: basic normalization using dictionary
      normalized = lookupProvider(originalValue.toString());
      cell.setBackground(normalized !== originalValue ? '#E6F3FF' : '#FFFFFF');
    }
    
    if (normalized !== originalValue) {
      cell.setValue(normalized);
      cell.setNote(`Original: ${originalValue}`);
      return { field: 'Provider', action: 'Normalized', original: originalValue, normalized: normalized };
    }
    
    return { field: 'Provider', action: 'No change', original: originalValue };
    
  } catch (error) {
    console.error('Error normalizing provider:', error);
    return { field: 'Provider', action: 'Error', error: error.message };
  }
}

/**
 * Normalize the clinic name for a single row
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 */
function normalizeRowClinic(sheet, row) {
  const CLINIC_COLUMN = 4; // Column D
  
  try {
    const cell = sheet.getRange(row, CLINIC_COLUMN);
    const originalValue = cell.getValue();
    
    if (!originalValue || originalValue === '') {
      cell.setValue('Unknown Clinic');
      cell.setBackground('#FFE6E6');
      return { field: 'Clinic', action: 'Set to Unknown', original: '' };
    }
    
    let normalized;
    if (typeof normalizeClinicName === 'function') {
      const result = normalizeClinicName(originalValue.toString());
      normalized = result.normalized;
      cell.setBackground(result.backgroundColor);
    } else {
      normalized = lookupClinic(originalValue.toString());
      cell.setBackground(normalized !== originalValue ? '#E6F3FF' : '#FFFFFF');
    }
    
    if (normalized !== originalValue) {
      cell.setValue(normalized);
      cell.setNote(`Original: ${originalValue}`);
      return { field: 'Clinic', action: 'Normalized', original: originalValue, normalized: normalized };
    }
    
    return { field: 'Clinic', action: 'No change', original: originalValue };
    
  } catch (error) {
    console.error('Error normalizing clinic:', error);
    return { field: 'Clinic', action: 'Error', error: error.message };
  }
}

/**
 * Normalize the city for a single row
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 */
function normalizeRowCity(sheet, row) {
  const CITY_COLUMN = 21; // Column U
  
  try {
    const cell = sheet.getRange(row, CITY_COLUMN);
    const originalValue = cell.getValue();
    
    if (!originalValue || originalValue === '') {
      return { field: 'City', action: 'Empty', original: '' };
    }
    
    let normalized;
    if (typeof normalizeCityName === 'function') {
      const result = normalizeCityName(originalValue.toString());
      normalized = result.normalized;
      cell.setBackground(result.backgroundColor);
    } else {
      normalized = lookupCity(originalValue.toString());
      cell.setBackground(normalized !== originalValue ? '#E6F3FF' : '#FFFFFF');
    }
    
    if (normalized !== originalValue) {
      cell.setValue(normalized);
      cell.setNote(`Original: ${originalValue}`);
      return { field: 'City', action: 'Normalized', original: originalValue, normalized: normalized };
    }
    
    return { field: 'City', action: 'No change', original: originalValue };
    
  } catch (error) {
    console.error('Error normalizing city:', error);
    return { field: 'City', action: 'Error', error: error.message };
  }
}

/**
 * Normalize the state for a single row
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 */
function normalizeRowState(sheet, row) {
  const STATE_COLUMN = 22; // Column V
  
  try {
    const cell = sheet.getRange(row, STATE_COLUMN);
    const originalValue = cell.getValue();
    
    if (!originalValue || originalValue === '') {
      // Default to Tennessee for The Kidney Experts
      cell.setValue('Tennessee');
      cell.setBackground('#E6F3FF');
      return { field: 'State', action: 'Defaulted to Tennessee', original: '' };
    }
    
    let normalized;
    if (typeof normalizeStateName === 'function') {
      const result = normalizeStateName(originalValue.toString());
      normalized = result.normalized;
      cell.setBackground(result.backgroundColor);
    } else {
      normalized = lookupState(originalValue.toString());
      cell.setBackground(normalized !== originalValue ? '#E6F3FF' : '#FFFFFF');
    }
    
    if (normalized !== originalValue) {
      cell.setValue(normalized);
      cell.setNote(`Original: ${originalValue}`);
      return { field: 'State', action: 'Normalized', original: originalValue, normalized: normalized };
    }
    
    return { field: 'State', action: 'No change', original: originalValue };
    
  } catch (error) {
    console.error('Error normalizing state:', error);
    return { field: 'State', action: 'Error', error: error.message };
  }
}

/**
 * Normalize phone numbers for a single row
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 */
function normalizeRowPhones(sheet, row) {
  const PHONE_COLUMNS = [7, 8, 24, 30]; // G, H, X, AD
  const results = [];
  
  PHONE_COLUMNS.forEach(colIndex => {
    try {
      const cell = sheet.getRange(row, colIndex);
      const originalValue = cell.getValue();
      
      if (!originalValue || originalValue === '') {
        return;
      }
      
      let normalized;
      if (typeof normalizePhoneNumber === 'function') {
        const result = normalizePhoneNumber(originalValue.toString());
        if (result.isValid) {
          normalized = result.normalized;
          cell.setBackground('#E6F3FF');
        } else {
          cell.setBackground('#FFE6E6');
          cell.setNote(`Invalid: ${result.error}`);
          results.push({ column: colIndex, action: 'Invalid', error: result.error });
          return;
        }
      } else {
        normalized = formatPhoneBasic(originalValue.toString());
        cell.setBackground(normalized !== originalValue ? '#E6F3FF' : '#FFFFFF');
      }
      
      if (normalized !== originalValue) {
        cell.setValue(normalized);
        results.push({ column: colIndex, action: 'Normalized', original: originalValue, normalized: normalized });
      }
      
    } catch (error) {
      console.error(`Error normalizing phone column ${colIndex}:`, error);
    }
  });
  
  return { field: 'Phones', action: results.length > 0 ? 'Normalized' : 'No change', details: results };
}

/**
 * Normalize names for a single row (staff, patient first/last)
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 */
function normalizeRowNames(sheet, row) {
  const NAME_COLUMNS = {
    6: 'Staff Name',      // Column F
    9: 'Patient Last',    // Column I
    10: 'Patient First'   // Column J
  };
  
  const results = [];
  
  Object.entries(NAME_COLUMNS).forEach(([colIndex, fieldName]) => {
    try {
      const cell = sheet.getRange(row, parseInt(colIndex));
      const originalValue = cell.getValue();
      
      if (!originalValue || originalValue === '') {
        return;
      }
      
      // Basic proper case normalization
      const normalized = properCapitalize(originalValue.toString());
      
      if (normalized !== originalValue) {
        cell.setValue(normalized);
        cell.setBackground('#E6F3FF');
        results.push({ field: fieldName, original: originalValue, normalized: normalized });
      }
      
    } catch (error) {
      console.error(`Error normalizing ${fieldName}:`, error);
    }
  });
  
  return { field: 'Names', action: results.length > 0 ? 'Normalized' : 'No change', details: results };
}

/**
 * Normalize address for a single row
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number to process
 */
function normalizeRowAddress(sheet, row) {
  const ADDRESS_COLUMN = 20; // Column T
  
  try {
    const cell = sheet.getRange(row, ADDRESS_COLUMN);
    const originalValue = cell.getValue();
    
    if (!originalValue || originalValue === '') {
      return { field: 'Address', action: 'Empty', original: '' };
    }
    
    let normalized;
    if (typeof normalizeAddress === 'function') {
      normalized = normalizeAddress(originalValue.toString());
    } else {
      normalized = normalizeAddressBasic(originalValue.toString());
    }
    
    if (normalized !== originalValue) {
      cell.setValue(normalized);
      cell.setBackground('#E6F3FF');
      return { field: 'Address', action: 'Normalized', original: originalValue, normalized: normalized };
    }
    
    return { field: 'Address', action: 'No change', original: originalValue };
    
  } catch (error) {
    console.error('Error normalizing address:', error);
    return { field: 'Address', action: 'Error', error: error.message };
  }
}

/**
 * Set the initial status for a new row
 * @param {Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number
 */
function setRowStatus(sheet, row) {
  const COMPLETE_COLUMN = 31;  // Column AE
  const STATUS_COLUMN = 32;    // Column AF
  
  try {
    sheet.getRange(row, COMPLETE_COLUMN).setValue('FALSE');
    sheet.getRange(row, STATUS_COLUMN).setValue('New');
  } catch (error) {
    console.error('Error setting row status:', error);
  }
}

// ============================================
// FALLBACK LOOKUP FUNCTIONS
// These are used if the main normalization functions aren't available
// ============================================

/**
 * Lookup provider in dictionary
 */
function lookupProvider(name) {
  if (typeof PROVIDERS !== 'undefined') {
    const key = name.toLowerCase().trim();
    return PROVIDERS[key] || name;
  }
  return name;
}

/**
 * Lookup clinic in dictionary
 */
function lookupClinic(name) {
  if (typeof CLINICS !== 'undefined') {
    const key = name.toLowerCase().trim();
    return CLINICS[key] || name;
  }
  return name;
}

/**
 * Lookup city in dictionary
 */
function lookupCity(name) {
  if (typeof CITIES !== 'undefined') {
    const key = name.toLowerCase().trim();
    return CITIES[key] || name;
  }
  return name;
}

/**
 * Lookup state in dictionary
 */
function lookupState(name) {
  if (typeof STATES !== 'undefined') {
    const key = name.toLowerCase().trim();
    return STATES[key] || name;
  }
  // Handle common abbreviations
  const abbrevs = {
    'tn': 'Tennessee', 'ky': 'Kentucky', 'mo': 'Missouri',
    'ar': 'Arkansas', 'ms': 'Mississippi', 'al': 'Alabama'
  };
  return abbrevs[name.toLowerCase().trim()] || name;
}

/**
 * Basic phone formatting
 */
function formatPhoneBasic(phone) {
  const digits = phone.replace(/\D/g, '');
  
  // Remove leading 1 if present
  const cleaned = digits.length === 11 && digits.startsWith('1') 
    ? digits.substring(1) 
    : digits;
  
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  }
  
  return phone; // Return original if can't format
}

/**
 * Basic proper case capitalization
 */
function properCapitalize(text) {
  if (!text) return '';
  
  return text.trim()
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Handle Mc/Mac prefixes
      if (word.toLowerCase().startsWith('mc') && word.length > 2) {
        return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Basic address normalization
 */
function normalizeAddressBasic(address) {
  let normalized = address.trim().replace(/\s+/g, ' ');
  
  // Standardize common street types
  const streetTypes = {
    'street': 'St', 'st.': 'St', 'avenue': 'Ave', 'ave.': 'Ave',
    'road': 'Rd', 'rd.': 'Rd', 'drive': 'Dr', 'dr.': 'Dr',
    'lane': 'Ln', 'ln.': 'Ln', 'court': 'Ct', 'ct.': 'Ct',
    'boulevard': 'Blvd', 'blvd.': 'Blvd', 'circle': 'Cir', 'cir.': 'Cir'
  };
  
  Object.entries(streetTypes).forEach(([pattern, replacement]) => {
    const regex = new RegExp('\\b' + pattern + '\\b', 'gi');
    normalized = normalized.replace(regex, replacement);
  });
  
  return normalized;
}

// ============================================
// LOGGING FUNCTIONS
// ============================================

/**
 * Log form submission processing
 */
function logFormSubmission(results, processingTime) {
  try {
    const props = PropertiesService.getDocumentProperties();
    const logs = JSON.parse(props.getProperty('FORM_SUBMIT_LOGS') || '[]');
    
    logs.push({
      timestamp: new Date().toISOString(),
      row: results.row,
      processingTime: processingTime,
      normalizations: results.normalized.filter(r => r.action !== 'No change' && r.action !== 'Empty').length
    });
    
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs.shift();
    }
    
    props.setProperty('FORM_SUBMIT_LOGS', JSON.stringify(logs));
    
  } catch (error) {
    console.error('Error logging form submission:', error);
  }
}

/**
 * Log errors
 */
function logError(functionName, error) {
  try {
    const props = PropertiesService.getDocumentProperties();
    const errors = JSON.parse(props.getProperty('ERROR_LOGS') || '[]');
    
    errors.push({
      timestamp: new Date().toISOString(),
      function: functionName,
      message: error.message,
      stack: error.stack
    });
    
    // Keep only last 50 errors
    if (errors.length > 50) {
      errors.shift();
    }
    
    props.setProperty('ERROR_LOGS', JSON.stringify(errors));
    
  } catch (e) {
    console.error('Error logging error:', e);
  }
}

// ============================================
// TRIGGER MANAGEMENT
// ============================================

/**
 * Create the form submit trigger programmatically
 * Run this once to set up the trigger
 */
function createFormSubmitTrigger() {
  // Remove any existing form submit triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onFormSubmitNormalize') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const trigger = ScriptApp.newTrigger('onFormSubmitNormalize')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  
  console.log('Form submit trigger created:', trigger.getUniqueId());
  
  SpreadsheetApp.getUi().alert(
    'Trigger Created',
    'Form submissions will now be automatically normalized in real-time.\n\n' +
    'Trigger ID: ' + trigger.getUniqueId(),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  return trigger;
}

/**
 * Remove the form submit trigger
 */
function removeFormSubmitTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onFormSubmitNormalize') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  
  SpreadsheetApp.getUi().alert(
    'Trigger Removed',
    `Removed ${removed} form submit trigger(s).\n\n` +
    'Form submissions will no longer be automatically normalized.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Check if form submit trigger exists
 */
function checkFormSubmitTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const formTrigger = triggers.find(t => t.getHandlerFunction() === 'onFormSubmitNormalize');
  
  if (formTrigger) {
    SpreadsheetApp.getUi().alert(
      'Trigger Status',
      '✅ Form submit trigger is ACTIVE\n\n' +
      'Trigger ID: ' + formTrigger.getUniqueId() + '\n' +
      'Event Type: ' + formTrigger.getEventType() + '\n\n' +
      'All form submissions are being normalized in real-time.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert(
      'Trigger Status',
      '❌ Form submit trigger is NOT active\n\n' +
      'Run "Enable Real-Time Normalization" to activate.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * View recent form submission logs
 */
function viewFormSubmitLogs() {
  try {
    const props = PropertiesService.getDocumentProperties();
    const logs = JSON.parse(props.getProperty('FORM_SUBMIT_LOGS') || '[]');
    
    if (logs.length === 0) {
      SpreadsheetApp.getUi().alert('No form submission logs available');
      return;
    }
    
    const recentLogs = logs.slice(-10).reverse();
    
    let message = 'Recent Form Submissions (Last 10):\n\n';
    recentLogs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleString();
      message += `Row ${log.row}: ${log.normalizations} fields normalized (${log.processingTime}s)\n`;
      message += `  ${date}\n\n`;
    });
    
    SpreadsheetApp.getUi().alert('Form Submission Logs', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', 'Failed to retrieve logs: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
