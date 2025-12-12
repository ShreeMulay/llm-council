/**
 * Phone Number Normalization Module
 * @module PhoneNormalization
 * @description Handles validation, normalization, and standardization of phone numbers
 * @author Medical Referral System
 * @version 1.0
 */

/**
 * Configuration for phone number columns
 */
const PHONE_CONFIG = {
  COLUMNS: {
    CLINIC_PHONE: 7,      // Column G - Clinic Phone Number
    CLINIC_FAX: 8,        // Column H - Clinic Fax Number
    PATIENT_PHONE: 24,    // Column X - Patient Phone Number
    REFERRAL_DEPT: 30     // Column AD - Referral Dept Phone Number
  },
  FORMAT: {
    STANDARD: '(XXX) XXX-XXXX',
    EXTENSION: 'ext.',
    INVALID_COLOR: '#FFE6E6',  // Light red for invalid numbers
    CORRECTED_COLOR: '#E6F3FF' // Light blue for corrected numbers
  },
  VALIDATION: {
    MIN_DIGITS: 10,
    MAX_DIGITS: 10,
    VALID_AREA_CODES: ['731', '901', '615', '931', '573', '618', '270', '662', '870', '414'] // Tennessee and surrounding states
  }
};

/**
 * Main function to normalize all phone numbers in the sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of normalization results
 */
function normalizeAllPhoneNumbers(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting phone number normalization...');
    
    // Get all data at once for better performance
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, errors: 0 };
    }
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 33); // Up to column AG
    const values = dataRange.getValues();
    const backgrounds = dataRange.getBackgrounds();
    
    let stats = {
      processed: 0,
      corrected: 0,
      invalid: 0,
      errors: []
    };
    
    // Process each phone column
    const phoneColumns = Object.values(PHONE_CONFIG.COLUMNS);
    
    phoneColumns.forEach(colIndex => {
      const columnLetter = String.fromCharCode(64 + colIndex);
      console.log(`Processing column ${columnLetter}...`);
      
      for (let i = 0; i < values.length; i++) {
        const originalValue = values[i][colIndex - 1];
        if (originalValue && originalValue !== '') {
          stats.processed++;
          
          const result = normalizePhoneNumber(originalValue.toString());
          
          if (result.isValid) {
            if (result.normalized !== originalValue) {
              values[i][colIndex - 1] = result.normalized;
              backgrounds[i][colIndex - 1] = PHONE_CONFIG.FORMAT.CORRECTED_COLOR;
              stats.corrected++;
            }
          } else {
            // Mark invalid numbers but keep original value
            backgrounds[i][colIndex - 1] = PHONE_CONFIG.FORMAT.INVALID_COLOR;
            stats.invalid++;
            
            // Add note about the issue
            const noteRange = sheet.getRange(i + 2, colIndex);
            const existingNote = noteRange.getNote();
            const newNote = `Invalid phone: ${result.error}${existingNote ? '\n' + existingNote : ''}`;
            noteRange.setNote(newNote);
            
            // Log error for reporting
            stats.errors.push({
              row: i + 2,
              column: columnLetter,
              value: originalValue,
              error: result.error
            });
          }
        }
      }
    });
    
    // Write all changes back in one batch operation
    dataRange.setValues(values);
    dataRange.setBackgrounds(backgrounds);
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`Phone normalization complete in ${processingTime} seconds`);
    console.log(`Processed: ${stats.processed}, Corrected: ${stats.corrected}, Invalid: ${stats.invalid}`);
    
    // Generate summary report
    generatePhoneReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error in normalizeAllPhoneNumbers:', error);
    throw new Error(`Failed to normalize phone numbers: ${error.message}`);
  }
}

/**
 * Normalize a single phone number
 * @param {string} phoneInput - Raw phone number input
 * @returns {Object} Object with normalized number and validation status
 */
function normalizePhoneNumber(phoneInput) {
  try {
    if (!phoneInput) {
      return { isValid: false, error: 'Empty value' };
    }
    
    // Convert to string and trim
    let phone = phoneInput.toString().trim();
    
    // Check for known invalid patterns
    if (isKnownInvalidPattern(phone)) {
      return { 
        isValid: false, 
        error: 'Known invalid pattern',
        original: phoneInput
      };
    }
    
    // Extract extension if present
    let extension = '';
    const extPatterns = [
      /\s*ext\.?\s*(\d+)/i,
      /\s*x\s*(\d+)/i,
      /\s*extension\s*(\d+)/i
    ];
    
    for (const pattern of extPatterns) {
      const match = phone.match(pattern);
      if (match) {
        extension = match[1];
        phone = phone.replace(pattern, '');
        break;
      }
    }
    
    // Remove all non-numeric characters
    let digits = phone.replace(/\D/g, '');
    
    // Handle country code (remove leading 1 if present)
    if (digits.length === 11 && digits.startsWith('1')) {
      digits = digits.substring(1);
    }
    
    // Handle numbers with extra leading digits (like 17316958189)
    if (digits.length > 10) {
      // Try to extract a valid 10-digit number
      const validAreaCodes = PHONE_CONFIG.VALIDATION.VALID_AREA_CODES;
      for (const areaCode of validAreaCodes) {
        const index = digits.indexOf(areaCode);
        if (index !== -1 && digits.length - index >= 10) {
          digits = digits.substring(index, index + 10);
          break;
        }
      }
    }
    
    // Validate length
    if (digits.length !== 10) {
      return {
        isValid: false,
        error: `Invalid length: ${digits.length} digits`,
        original: phoneInput
      };
    }
    
    // Validate area code
    const areaCode = digits.substring(0, 3);
    if (!isValidAreaCode(areaCode)) {
      return {
        isValid: false,
        error: `Invalid area code: ${areaCode}`,
        original: phoneInput
      };
    }
    
    // Format the number
    const formatted = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
    
    // Add extension if present
    const normalized = extension ? `${formatted} ext. ${extension}` : formatted;
    
    return {
      isValid: true,
      normalized: normalized,
      original: phoneInput,
      areaCode: areaCode,
      extension: extension
    };
    
  } catch (error) {
    console.error('Error normalizing phone number:', error);
    return {
      isValid: false,
      error: error.message,
      original: phoneInput
    };
  }
}

/**
 * Check if phone number matches known invalid patterns
 * @private
 * @param {string} phone - Phone number to check
 * @returns {boolean} True if invalid pattern detected
 */
function isKnownInvalidPattern(phone) {
  const invalidPatterns = [
    /^0+$/,                    // All zeros
    /^9{7,}$/,                 // Multiple 9s
    /^1234567/,                // Sequential numbers
    /^8675309/,                // Famous invalid number
    /^self$/i,                 // Text "self"
    /^[a-zA-Z\s]+$/,          // Only letters
    /^\.+$/,                   // Only dots
    /^-+$/                     // Only dashes
  ];
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check for too few digits (less than 7)
  if (cleanPhone.length < 7 && cleanPhone.length > 0) {
    return true;
  }
  
  // Check against invalid patterns
  return invalidPatterns.some(pattern => pattern.test(phone));
}

/**
 * Validate area code
 * @private
 * @param {string} areaCode - Three-digit area code
 * @returns {boolean} True if valid area code
 */
function isValidAreaCode(areaCode) {
  // Check if it's a valid North American area code format
  if (!/^[2-9]\d{2}$/.test(areaCode)) {
    return false;
  }
  
  // Check against list of common invalid area codes
  const invalidAreaCodes = ['000', '111', '222', '333', '444', '555', '666', '777', '888', '999'];
  if (invalidAreaCodes.includes(areaCode)) {
    return false;
  }
  
  return true;
}

/**
 * Process a single column of phone numbers
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to process
 * @param {number} columnIndex - Column index (1-based)
 * @returns {Object} Processing statistics
 */
function processPhoneColumn(sheet, columnIndex) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { processed: 0 };
    
    const range = sheet.getRange(2, columnIndex, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    let stats = { processed: 0, corrected: 0, invalid: 0 };
    
    for (let i = 0; i < values.length; i++) {
      const value = values[i][0];
      if (value && value !== '') {
        stats.processed++;
        const result = normalizePhoneNumber(value.toString());
        
        if (result.isValid) {
          values[i][0] = result.normalized;
          backgrounds[i] = [result.normalized !== value ? PHONE_CONFIG.FORMAT.CORRECTED_COLOR : '#FFFFFF'];
          if (result.normalized !== value) stats.corrected++;
        } else {
          backgrounds[i] = [PHONE_CONFIG.FORMAT.INVALID_COLOR];
          notes.push({ row: i + 2, message: `Invalid: ${result.error}` });
          stats.invalid++;
        }
      } else {
        backgrounds[i] = ['#FFFFFF'];
      }
    }
    
    // Apply updates
    range.setValues(values);
    range.setBackgrounds(backgrounds);
    
    // Set notes for invalid numbers
    notes.forEach(note => {
      sheet.getRange(note.row, columnIndex).setNote(note.message);
    });
    
    return stats;
  } catch (error) {
    console.error(`Error processing column ${columnIndex}:`, error);
    throw error;
  }
}

/**
 * Generate a report of phone number issues
 * @param {Object} stats - Statistics from normalization
 */
function generatePhoneReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('Phone Validation Report');
    
    // Create report sheet if it doesn't exist
    if (!reportSheet) {
      reportSheet = ss.insertSheet('Phone Validation Report');
    } else {
      reportSheet.clear();
    }
    
    // Add headers
    const headers = [
      ['Phone Number Validation Report'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Statistics'],
      ['Total Processed:', stats.processed],
      ['Numbers Corrected:', stats.corrected],
      ['Invalid Numbers:', stats.invalid],
      [''],
      ['Invalid Number Details'],
      ['Row', 'Column', 'Original Value', 'Error']
    ];
    
    reportSheet.getRange(1, 1, headers.length, Math.max(...headers.map(row => row.length)))
      .setValues(headers);
    
    // Add error details if any
    if (stats.errors && stats.errors.length > 0) {
      const errorData = stats.errors.map(err => 
        [err.row, err.column, err.value, err.error]
      );
      reportSheet.getRange(11, 1, errorData.length, 4).setValues(errorData);
    }
    
    // Format the report
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(4, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(9, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(10, 1, 1, 4).setFontWeight('bold').setBackground('#E8E8E8');
    
    reportSheet.autoResizeColumns(1, 4);
    
    console.log('Phone validation report generated');
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

/**
 * Menu function to normalize specific column
 */
function normalizeClinicPhones() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = processPhoneColumn(sheet, PHONE_CONFIG.COLUMNS.CLINIC_PHONE);
  SpreadsheetApp.getUi().alert(`Clinic phones processed. Corrected: ${stats.corrected}, Invalid: ${stats.invalid}`);
}

/**
 * Menu function to validate all phones without changing them
 */
function validatePhoneNumbers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const phoneColumns = Object.values(PHONE_CONFIG.COLUMNS);
  let invalidCount = 0;
  let invalidDetails = [];
  
  phoneColumns.forEach(colIndex => {
    const range = sheet.getRange(2, colIndex, lastRow - 1, 1);
    const values = range.getValues();
    
    values.forEach((row, i) => {
      if (row[0] && row[0] !== '') {
        const result = normalizePhoneNumber(row[0].toString());
        if (!result.isValid) {
          invalidCount++;
          invalidDetails.push({
            row: i + 2,
            column: String.fromCharCode(64 + colIndex),
            value: row[0],
            error: result.error
          });
        }
      }
    });
  });
  
  if (invalidCount > 0) {
    generatePhoneReport({ 
      processed: lastRow - 1, 
      corrected: 0, 
      invalid: invalidCount, 
      errors: invalidDetails 
    });
    SpreadsheetApp.getUi().alert(`Found ${invalidCount} invalid phone numbers. Check "Phone Validation Report" sheet for details.`);
  } else {
    SpreadsheetApp.getUi().alert('All phone numbers are valid!');
  }
}