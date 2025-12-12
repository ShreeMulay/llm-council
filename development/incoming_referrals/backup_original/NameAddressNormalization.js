/**
 * Name and Address Normalization Module
 * @module NameAddressNormalization
 * @description Comprehensive normalization for staff names, patient names, and addresses
 * @author Medical Referral System
 * @version 2.0
 */

/**
 * Configuration for name and address normalization
 */
const NAME_ADDRESS_CONFIG = {
  COLUMNS: {
    STAFF_NAME: 6,        // Column F - Staff Member Filling Out Form
    PATIENT_LAST: 9,      // Column I - Patient Last Name
    PATIENT_FIRST: 10,    // Column J - Patient First Name  
    STREET_ADDRESS: 20    // Column T - Street Address
  },
  FORMATTING: {
    CORRECTED_COLOR: '#E6F3FF',     // Light blue for corrected entries
    NAME_ISSUE_COLOR: '#FFF3CD',    // Light yellow for name issues
    ADDRESS_ISSUE_COLOR: '#FFE6CC', // Light orange for address issues
    DEFAULT_COLOR: '#FFFFFF'         // White for unchanged
  }
};

/**
 * Main function to normalize all names and addresses
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of normalization results
 */
function normalizeNamesAndAddresses(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting name and address normalization...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, corrected: 0 };
    }
    
    // Process each column separately for better control
    const results = {
      staffNames: normalizeStaffNames(sheet, lastRow),
      lastNames: normalizeLastNames(sheet, lastRow),
      firstNames: normalizeFirstNames(sheet, lastRow),
      addresses: normalizeAddresses(sheet, lastRow),
      totalProcessed: 0,
      totalCorrected: 0
    };
    
    // Calculate totals
    results.totalProcessed = results.staffNames.processed + results.lastNames.processed + 
                           results.firstNames.processed + results.addresses.processed;
    results.totalCorrected = results.staffNames.corrected + results.lastNames.corrected + 
                           results.firstNames.corrected + results.addresses.corrected;
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`Name and address normalization complete in ${processingTime} seconds`);
    console.log(`Total processed: ${results.totalProcessed}, Total corrected: ${results.totalCorrected}`);
    
    // Generate report
    generateNormalizationReport(results);
    
    return results;
    
  } catch (error) {
    console.error('Error in normalizeNamesAndAddresses:', error);
    throw new Error(`Failed to normalize names and addresses: ${error.message}`);
  }
}

/**
 * Normalize staff names in column F
 * @private
 */
function normalizeStaffNames(sheet, lastRow) {
  const columnIndex = NAME_ADDRESS_CONFIG.COLUMNS.STAFF_NAME;
  const range = sheet.getRange(2, columnIndex, lastRow - 1, 1);
  const values = range.getValues();
  const backgrounds = [];
  
  let stats = { processed: 0, corrected: 0 };
  
  for (let i = 0; i < values.length; i++) {
    const original = values[i][0];
    if (original && original !== '') {
      stats.processed++;
      
      const normalized = normalizeStaffName(original.toString());
      
      if (normalized !== original) {
        values[i][0] = normalized;
        backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.CORRECTED_COLOR];
        stats.corrected++;
        
        // Add note about the change
        const noteRange = sheet.getRange(i + 2, columnIndex);
        noteRange.setNote(`Original: ${original}`);
      } else {
        backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.DEFAULT_COLOR];
      }
    } else {
      backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.DEFAULT_COLOR];
    }
  }
  
  // Apply changes
  range.setValues(values);
  range.setBackgrounds(backgrounds);
  
  console.log(`Staff names: ${stats.corrected} of ${stats.processed} corrected`);
  return stats;
}

/**
 * Normalize a single staff name
 * @private
 */
function normalizeStaffName(name) {
  // Step 1: Clean basic whitespace and trim
  let cleaned = name.trim().replace(/\s+/g, ' ');
  
  // Step 2: Handle special cases like "tke Carol" -> "TKE Carol"
  if (cleaned.toLowerCase().startsWith('tke ')) {
    cleaned = 'TKE ' + cleaned.substring(4);
  }
  
  // Step 3: Handle parenthetical information (preserve it but normalize contents)
  const parenMatch = cleaned.match(/^([^(]+)(\(.+\))$/);
  if (parenMatch) {
    const mainName = parenMatch[1].trim();
    const parenContent = parenMatch[2];
    const innerContent = parenContent.slice(1, -1).trim();
    cleaned = properCapitalizeName(mainName) + ' (' + properCapitalizeName(innerContent) + ')';
  } else {
    cleaned = properCapitalizeName(cleaned);
  }
  
  // Step 4: Handle credentials (LPN, RN, MD, etc.)
  cleaned = preserveCredentials(cleaned);
  
  // Step 5: Fix period consistency (keep periods after initials)
  cleaned = fixInitialPeriods(cleaned);
  
  return cleaned;
}

/**
 * Normalize patient last names in column I
 * @private
 */
function normalizeLastNames(sheet, lastRow) {
  const columnIndex = NAME_ADDRESS_CONFIG.COLUMNS.PATIENT_LAST;
  const range = sheet.getRange(2, columnIndex, lastRow - 1, 1);
  const values = range.getValues();
  const backgrounds = [];
  
  let stats = { processed: 0, corrected: 0 };
  
  for (let i = 0; i < values.length; i++) {
    const original = values[i][0];
    if (original && original !== '') {
      stats.processed++;
      
      const normalized = normalizeLastName(original.toString());
      
      if (normalized !== original) {
        values[i][0] = normalized;
        backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.CORRECTED_COLOR];
        stats.corrected++;
        
        // Add note about the change
        const noteRange = sheet.getRange(i + 2, columnIndex);
        noteRange.setNote(`Original: ${original}`);
      } else {
        backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.DEFAULT_COLOR];
      }
    } else {
      backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.DEFAULT_COLOR];
    }
  }
  
  // Apply changes
  range.setValues(values);
  range.setBackgrounds(backgrounds);
  
  console.log(`Last names: ${stats.corrected} of ${stats.processed} corrected`);
  return stats;
}

/**
 * Normalize a single last name
 * @private
 */
function normalizeLastName(name) {
  // Clean whitespace
  let cleaned = name.trim().replace(/\s+/g, ' ');
  
  // Handle special prefixes and suffixes
  const prefixes = ['mc', 'mac', 'o\'', 'de', 'van', 'von', 'la', 'le', 'st', 'saint'];
  const suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', 'v', 'esq', 'phd', 'md'];
  
  // Check if it's all one word
  if (!cleaned.includes(' ')) {
    // Handle special cases like McDonald, O'Brien, etc.
    cleaned = handleSpecialLastNames(cleaned);
  } else {
    // Multiple words - handle each part
    const parts = cleaned.split(' ');
    cleaned = parts.map(part => handleSpecialLastNames(part)).join(' ');
  }
  
  return cleaned;
}

/**
 * Handle special last name cases
 * @private
 */
function handleSpecialLastNames(name) {
  const lower = name.toLowerCase();
  
  // Handle Mc and Mac prefixes
  if (lower.startsWith('mc') && name.length > 2) {
    return 'Mc' + name.charAt(2).toUpperCase() + name.slice(3).toLowerCase();
  }
  if (lower.startsWith('mac') && name.length > 3) {
    return 'Mac' + name.charAt(3).toUpperCase() + name.slice(4).toLowerCase();
  }
  
  // Handle O' prefix
  if (lower.startsWith('o\'') && name.length > 2) {
    return 'O\'' + name.charAt(2).toUpperCase() + name.slice(3).toLowerCase();
  }
  
  // Handle hyphenated names
  if (name.includes('-')) {
    return name.split('-').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('-');
  }
  
  // Standard capitalization
  return properCapitalizeName(name);
}

/**
 * Normalize patient first names in column J
 * @private
 */
function normalizeFirstNames(sheet, lastRow) {
  const columnIndex = NAME_ADDRESS_CONFIG.COLUMNS.PATIENT_FIRST;
  const range = sheet.getRange(2, columnIndex, lastRow - 1, 1);
  const values = range.getValues();
  const backgrounds = [];
  
  let stats = { processed: 0, corrected: 0 };
  
  for (let i = 0; i < values.length; i++) {
    const original = values[i][0];
    if (original && original !== '') {
      stats.processed++;
      
      const normalized = normalizeFirstName(original.toString());
      
      if (normalized !== original) {
        values[i][0] = normalized;
        backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.CORRECTED_COLOR];
        stats.corrected++;
        
        // Add note about the change
        const noteRange = sheet.getRange(i + 2, columnIndex);
        noteRange.setNote(`Original: ${original}`);
      } else {
        backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.DEFAULT_COLOR];
      }
    } else {
      backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.DEFAULT_COLOR];
    }
  }
  
  // Apply changes
  range.setValues(values);
  range.setBackgrounds(backgrounds);
  
  console.log(`First names: ${stats.corrected} of ${stats.processed} corrected`);
  return stats;
}

/**
 * Normalize a single first name
 * @private
 */
function normalizeFirstName(name) {
  // Clean whitespace
  let cleaned = name.trim().replace(/\s+/g, ' ');
  
  // Handle nicknames in quotes (e.g., Stephen "Steve" -> Stephen "Steve")
  const nicknameMatch = cleaned.match(/^([^"]+)"([^"]+)"(.*)$/);
  if (nicknameMatch) {
    const firstName = properCapitalizeName(nicknameMatch[1].trim());
    const nickname = properCapitalizeName(nicknameMatch[2].trim());
    const rest = nicknameMatch[3] ? ' ' + properCapitalizeName(nicknameMatch[3].trim()) : '';
    return firstName + ' "' + nickname + '"' + rest;
  }
  
  // Handle multiple first names
  if (cleaned.includes(' ')) {
    return cleaned.split(' ').map(part => properCapitalizeName(part)).join(' ');
  }
  
  // Single name
  return properCapitalizeName(cleaned);
}

/**
 * Normalize street addresses in column T
 * @private
 */
function normalizeAddresses(sheet, lastRow) {
  const columnIndex = NAME_ADDRESS_CONFIG.COLUMNS.STREET_ADDRESS;
  const range = sheet.getRange(2, columnIndex, lastRow - 1, 1);
  const values = range.getValues();
  const backgrounds = [];
  
  let stats = { processed: 0, corrected: 0 };
  
  for (let i = 0; i < values.length; i++) {
    const original = values[i][0];
    if (original && original !== '') {
      stats.processed++;
      
      const normalized = normalizeAddress(original.toString());
      
      if (normalized !== original) {
        values[i][0] = normalized;
        backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.CORRECTED_COLOR];
        stats.corrected++;
        
        // Add note about the change
        const noteRange = sheet.getRange(i + 2, columnIndex);
        noteRange.setNote(`Original: ${original}`);
      } else {
        backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.DEFAULT_COLOR];
      }
    } else {
      backgrounds[i] = [NAME_ADDRESS_CONFIG.FORMATTING.DEFAULT_COLOR];
    }
  }
  
  // Apply changes
  range.setValues(values);
  range.setBackgrounds(backgrounds);
  
  console.log(`Addresses: ${stats.corrected} of ${stats.processed} corrected`);
  return stats;
}

/**
 * Normalize a single address
 * @private
 */
function normalizeAddress(address) {
  // Step 1: Clean whitespace and basic formatting
  let cleaned = address.trim().replace(/\s+/g, ' ');
  
  // Step 2: Fix obvious typos
  cleaned = fixAddressTypos(cleaned);
  
  // Step 3: Handle PO Box specially
  if (cleaned.toLowerCase().includes('po box') || cleaned.toLowerCase().includes('p.o. box')) {
    return standardizePOBox(cleaned);
  }
  
  // Step 4: Standardize street types
  cleaned = standardizeStreetTypes(cleaned);
  
  // Step 5: Standardize directionals
  cleaned = standardizeDirectionals(cleaned);
  
  // Step 6: Proper capitalization for address
  cleaned = capitalizeAddress(cleaned);
  
  // Step 7: Fix periods (remove from abbreviations except initials)
  cleaned = cleaned.replace(/\b([A-Z][a-z]+)\./g, '$1');
  
  return cleaned;
}

/**
 * Fix common address typos
 * @private
 */
function fixAddressTypos(address) {
  const typoFixes = {
    '18 l leland': '18 Leland',
    'SunnybraeAve': 'Sunnybrae Ave',
    '121Broadmeadow': '121 Broadmeadow',
    'beaver creek': 'Beaver Creek'
  };
  
  let fixed = address;
  for (const [typo, correction] of Object.entries(typoFixes)) {
    const regex = new RegExp(typo, 'gi');
    fixed = fixed.replace(regex, correction);
  }
  
  return fixed;
}

/**
 * Standardize PO Box formatting
 * @private
 */
function standardizePOBox(address) {
  return address.replace(/\b(p\.?o\.?\s*box)\s*(\d+)/gi, 'PO Box $2');
}

/**
 * Standardize street type abbreviations
 * @private
 */
function standardizeStreetTypes(address) {
  const streetTypes = {
    // Common abbreviations to standard form
    'ave\\.?\\b': 'Ave',
    'avenue\\b': 'Ave',
    'st\\.?\\b': 'St',
    'street\\b': 'St',
    'rd\\.?\\b': 'Rd',
    'road\\b': 'Rd',
    'dr\\.?\\b': 'Dr',
    'drive\\b': 'Dr',
    'ln\\.?\\b': 'Ln',
    'lane\\b': 'Ln',
    'ct\\.?\\b': 'Ct',
    'court\\b': 'Ct',
    'pl\\.?\\b': 'Pl',
    'place\\b': 'Pl',
    'blvd\\.?\\b': 'Blvd',
    'boulevard\\b': 'Blvd',
    'cir\\.?\\b': 'Cir',
    'circle\\b': 'Cir',
    'pkwy\\.?\\b': 'Pkwy',
    'parkway\\b': 'Pkwy',
    'hwy\\.?\\b': 'Hwy',
    'highway\\b': 'Hwy',
    'trl\\.?\\b': 'Trl',
    'trail\\b': 'Trl',
    'cv\\.?\\b': 'Cv',
    'cove\\b': 'Cv'
  };
  
  let standardized = address;
  for (const [pattern, replacement] of Object.entries(streetTypes)) {
    const regex = new RegExp(pattern, 'gi');
    standardized = standardized.replace(regex, replacement);
  }
  
  return standardized;
}

/**
 * Standardize directional abbreviations
 * @private
 */
function standardizeDirectionals(address) {
  const directionals = {
    '\\bn\\.?\\b': 'N',
    '\\bnorth\\b': 'N',
    '\\bs\\.?\\b': 'S',
    '\\bsouth\\b': 'S',
    '\\be\\.?\\b': 'E',
    '\\beast\\b': 'E',
    '\\bw\\.?\\b': 'W',
    '\\bwest\\b': 'W',
    '\\bne\\.?\\b': 'NE',
    '\\bnortheast\\b': 'NE',
    '\\bnw\\.?\\b': 'NW',
    '\\bnorthwest\\b': 'NW',
    '\\bse\\.?\\b': 'SE',
    '\\bsoutheast\\b': 'SE',
    '\\bsw\\.?\\b': 'SW',
    '\\bsouthwest\\b': 'SW'
  };
  
  let standardized = address;
  for (const [pattern, replacement] of Object.entries(directionals)) {
    const regex = new RegExp(pattern, 'gi');
    standardized = standardized.replace(regex, replacement);
  }
  
  return standardized;
}

/**
 * Properly capitalize an address
 * @private
 */
function capitalizeAddress(address) {
  // Split by spaces and capitalize each word appropriately
  const words = address.split(' ');
  
  return words.map(word => {
    // Keep all-caps abbreviations (like PO, NE, SW, etc.)
    if (word.length <= 2 && word === word.toUpperCase()) {
      return word;
    }
    
    // Keep numbers as-is
    if (/^\d/.test(word)) {
      return word;
    }
    
    // Handle hyphenated words
    if (word.includes('-')) {
      return word.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join('-');
    }
    
    // Standard capitalization
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Properly capitalize a name
 * @private
 */
function properCapitalizeName(name) {
  // Handle special cases first
  const lower = name.toLowerCase();
  
  // Common name particles that should be lowercase (except at start)
  const particles = ['de', 'del', 'der', 'di', 'la', 'le', 'van', 'von'];
  
  // Split by spaces and handle each part
  const parts = name.split(' ');
  
  return parts.map((part, index) => {
    // Keep particles lowercase (unless first word)
    if (index > 0 && particles.includes(part.toLowerCase())) {
      return part.toLowerCase();
    }
    
    // Handle hyphenated names
    if (part.includes('-')) {
      return part.split('-').map(subpart => 
        subpart.charAt(0).toUpperCase() + subpart.slice(1).toLowerCase()
      ).join('-');
    }
    
    // Standard capitalization
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Preserve professional credentials in proper format
 * @private
 */
function preserveCredentials(name) {
  const credentials = [
    'MD', 'DO', 'PhD', 'RN', 'LPN', 'LVN', 'BSN', 'MSN', 
    'NP', 'PA', 'PT', 'OT', 'DDS', 'DMD', 'PharmD', 'LCSW',
    'LMFT', 'LCPC', 'CNA', 'MA', 'EMT', 'RT'
  ];
  
  let result = name;
  credentials.forEach(cred => {
    const regex = new RegExp('\\b' + cred + '\\b', 'gi');
    result = result.replace(regex, cred);
  });
  
  return result;
}

/**
 * Fix period usage after initials
 * @private
 */
function fixInitialPeriods(name) {
  // Add periods after single letter initials if missing
  let fixed = name.replace(/\b([A-Z])(\s|$)/g, '$1.$2');
  
  // Remove duplicate periods
  fixed = fixed.replace(/\.+/g, '.');
  
  // Remove period if followed by comma
  fixed = fixed.replace(/\.,/g, ',');
  
  return fixed;
}

/**
 * Generate normalization report
 * @private
 */
function generateNormalizationReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('Name Address Normalization Report');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('Name Address Normalization Report');
    } else {
      reportSheet.clear();
    }
    
    const headers = [
      ['Name and Address Normalization Report'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Statistics'],
      [''],
      ['Field', 'Processed', 'Corrected', 'Correction Rate'],
      ['Staff Names', stats.staffNames.processed, stats.staffNames.corrected, 
       stats.staffNames.processed > 0 ? Math.round((stats.staffNames.corrected / stats.staffNames.processed) * 100) + '%' : '0%'],
      ['Patient Last Names', stats.lastNames.processed, stats.lastNames.corrected,
       stats.lastNames.processed > 0 ? Math.round((stats.lastNames.corrected / stats.lastNames.processed) * 100) + '%' : '0%'],
      ['Patient First Names', stats.firstNames.processed, stats.firstNames.corrected,
       stats.firstNames.processed > 0 ? Math.round((stats.firstNames.corrected / stats.firstNames.processed) * 100) + '%' : '0%'],
      ['Street Addresses', stats.addresses.processed, stats.addresses.corrected,
       stats.addresses.processed > 0 ? Math.round((stats.addresses.corrected / stats.addresses.processed) * 100) + '%' : '0%'],
      [''],
      ['TOTALS', stats.totalProcessed, stats.totalCorrected,
       stats.totalProcessed > 0 ? Math.round((stats.totalCorrected / stats.totalProcessed) * 100) + '%' : '0%'],
      [''],
      ['Color Legend'],
      ['', 'Corrected/Standardized entries'],
      ['', 'Name formatting issues'],
      ['', 'Address formatting issues']
    ];
    
    // Write headers
    reportSheet.getRange(1, 1, headers.length, 4).setValues(headers);
    
    // Format the report
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(4, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(6, 1, 1, 4).setFontWeight('bold').setBackground('#E8E8E8');
    reportSheet.getRange(12, 1, 1, 4).setFontWeight('bold').setBackground('#D0D0D0');
    reportSheet.getRange(14, 1).setFontSize(12).setFontWeight('bold');
    
    // Apply color legend
    reportSheet.getRange(15, 1).setBackground(NAME_ADDRESS_CONFIG.FORMATTING.CORRECTED_COLOR);
    reportSheet.getRange(16, 1).setBackground(NAME_ADDRESS_CONFIG.FORMATTING.NAME_ISSUE_COLOR);
    reportSheet.getRange(17, 1).setBackground(NAME_ADDRESS_CONFIG.FORMATTING.ADDRESS_ISSUE_COLOR);
    
    // Auto-resize columns
    reportSheet.autoResizeColumns(1, 4);
    
    console.log('Normalization report generated');
    
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

/**
 * Menu function to normalize names only
 */
function normalizeNamesOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to process');
    return;
  }
  
  const results = {
    staffNames: normalizeStaffNames(sheet, lastRow),
    lastNames: normalizeLastNames(sheet, lastRow),
    firstNames: normalizeFirstNames(sheet, lastRow)
  };
  
  const totalProcessed = results.staffNames.processed + results.lastNames.processed + results.firstNames.processed;
  const totalCorrected = results.staffNames.corrected + results.lastNames.corrected + results.firstNames.corrected;
  
  SpreadsheetApp.getUi().alert(
    'Name Normalization Complete',
    `Processed: ${totalProcessed} names\n` +
    `Corrected: ${totalCorrected} names\n\n` +
    `Staff Names: ${results.staffNames.corrected}/${results.staffNames.processed}\n` +
    `Last Names: ${results.lastNames.corrected}/${results.lastNames.processed}\n` +
    `First Names: ${results.firstNames.corrected}/${results.firstNames.processed}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Menu function to normalize addresses only
 */
function normalizeAddressesOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to process');
    return;
  }
  
  const results = normalizeAddresses(sheet, lastRow);
  
  SpreadsheetApp.getUi().alert(
    'Address Normalization Complete',
    `Processed: ${results.processed} addresses\n` +
    `Corrected: ${results.corrected} addresses\n` +
    `Correction rate: ${results.processed > 0 ? Math.round((results.corrected / results.processed) * 100) : 0}%`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Validate name entries without modifying them
 */
function validateNameEntries() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  let issues = {
    allCaps: [],
    allLower: [],
    mixed: [],
    special: []
  };
  
  // Check staff names
  const staffRange = sheet.getRange(2, NAME_ADDRESS_CONFIG.COLUMNS.STAFF_NAME, lastRow - 1, 1);
  const staffValues = staffRange.getValues();
  
  staffValues.forEach((row, index) => {
    const name = row[0];
    if (name && name !== '') {
      const nameStr = name.toString();
      if (nameStr === nameStr.toUpperCase() && nameStr.match(/[A-Z]/)) {
        issues.allCaps.push(`Row ${index + 2}, Col F: ${nameStr}`);
      } else if (nameStr === nameStr.toLowerCase() && nameStr.match(/[a-z]/)) {
        issues.allLower.push(`Row ${index + 2}, Col F: ${nameStr}`);
      }
    }
  });
  
  const totalIssues = issues.allCaps.length + issues.allLower.length + issues.mixed.length + issues.special.length;
  
  if (totalIssues === 0) {
    SpreadsheetApp.getUi().alert('All names appear to be properly formatted!');
  } else {
    let message = `Found ${totalIssues} potential issues:\n\n`;
    if (issues.allCaps.length > 0) {
      message += `ALL CAPS entries: ${issues.allCaps.length}\n`;
    }
    if (issues.allLower.length > 0) {
      message += `all lowercase entries: ${issues.allLower.length}\n`;
    }
    
    message += '\nRun normalization to fix these issues.';
    
    SpreadsheetApp.getUi().alert('Name Validation Results', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}