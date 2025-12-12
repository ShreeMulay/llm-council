/**
 * Provider Normalization Module
 * @module ProviderNormalization
 * @description Handles standardization, validation, and normalization of referring provider names
 * @author The Kidney Experts, PLLC
 * @version 4.0 - Refactored to use centralized dictionaries
 * 
 * DEPENDENCIES:
 * - Dict_Providers.js (must be loaded first in Google Apps Script)
 *   Provides: PROVIDER_CONFIG, PROVIDER_SPECIAL_CASES, PROVIDERS, PROVIDER_STANDARDIZATION, CREDENTIALS
 */

// ============================================
// MAIN NORMALIZATION FUNCTIONS
// ============================================

/**
 * Main function to normalize all referring provider names
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of normalization results
 */
function normalizeReferringProviders(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting referring provider normalization...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, corrected: 0 };
    }
    
    // Get provider names from column E
    const range = sheet.getRange(2, PROVIDER_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    // Track statistics
    const stats = {
      processed: 0,
      corrected: 0,
      unknown: 0,
      selfReferrals: 0,
      vaReferrals: 0,
      series1Count: 0,  // A-I
      series2Count: 0,  // J-R
      series3Count: 0,  // S-Z
      providerCounts: new Map(),
      duplicates: new Map()
    };
    
    // Process each provider name
    for (let i = 0; i < values.length; i++) {
      const originalValue = values[i][0];
      
      if (originalValue && originalValue !== '') {
        stats.processed++;
        
        const result = normalizeProviderName(originalValue.toString());
        
        values[i][0] = result.normalized;
        backgrounds[i] = [result.backgroundColor];
        
        // Track statistics
        if (result.category === 'unknown') stats.unknown++;
        if (result.category === 'self-referral') stats.selfReferrals++;
        if (result.category === 'va') stats.vaReferrals++;
        if (result.wasNormalized) stats.corrected++;
        
        // Track series
        if (result.series === 1) stats.series1Count++;
        else if (result.series === 2) stats.series2Count++;
        else if (result.series === 3) stats.series3Count++;
        
        // Track provider counts
        const normalizedKey = result.normalized;
        stats.providerCounts.set(normalizedKey, 
          (stats.providerCounts.get(normalizedKey) || 0) + 1);
        
        // Track duplicates for reporting
        if (!stats.duplicates.has(normalizedKey)) {
          stats.duplicates.set(normalizedKey, []);
        }
        stats.duplicates.get(normalizedKey).push(i + 2); // Row number
        
        // Add note if there was an issue
        if (result.note) {
          notes.push({
            row: i + 2,
            col: PROVIDER_CONFIG.COLUMN.INDEX,
            message: result.note
          });
        }
      } else {
        // Empty field - mark as unknown
        values[i][0] = 'Unknown Provider';
        backgrounds[i] = [PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR];
        stats.unknown++;
        
        notes.push({
          row: i + 2,
          col: PROVIDER_CONFIG.COLUMN.INDEX,
          message: 'Empty provider field - marked as Unknown'
        });
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
    
    console.log(`Provider normalization complete in ${processingTime} seconds`);
    console.log(`Processed: ${stats.processed}, Corrected: ${stats.corrected}`);
    console.log(`Series 1 (A-I): ${stats.series1Count}`);
    console.log(`Series 2 (J-R): ${stats.series2Count}`);
    console.log(`Series 3 (S-Z): ${stats.series3Count}`);
    
    // Generate detailed report
    generateProviderReport(stats);
    
    // Save last normalization timestamp
    PropertiesService.getDocumentProperties()
      .setProperty('LAST_PROVIDER_NORMALIZATION', new Date().toISOString());
    
    return stats;
  } catch (error) {
    console.error('Error in normalizeReferringProviders:', error);
    throw new Error(`Failed to normalize referring providers: ${error.message}`);
  }
}

/**
 * Normalize a single provider name
 * @param {string} providerInput - Raw provider name input
 * @returns {Object} Object with normalized name and metadata
 */
function normalizeProviderName(providerInput) {
  try {
    if (!providerInput) {
      return {
        normalized: 'Unknown Provider',
        original: '',
        wasNormalized: true,
        backgroundColor: PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR,
        category: 'unknown',
        series: 0,
        note: 'Empty provider field'
      };
    }
    
    let provider = providerInput.toString().trim();
    const originalProvider = provider;
    
    // Step 1: Clean the input
    provider = cleanProviderName(provider);
    
    // Step 2: Check for special cases
    const lowerProvider = provider.toLowerCase();
    
    // Check for unknown variations
    if (PROVIDER_SPECIAL_CASES.unknownVariations.some(pattern => 
        lowerProvider === pattern || lowerProvider.includes(pattern))) {
      return {
        normalized: 'Unknown Provider',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR,
        category: 'unknown',
        series: 0,
        note: 'Unknown or missing provider information'
      };
    }
    
    // Check for self-referrals
    if (PROVIDER_SPECIAL_CASES.selfReferralVariations.some(pattern => 
        lowerProvider === pattern || lowerProvider.includes(pattern))) {
      return {
        normalized: 'Self Referral',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_CONFIG.FORMATTING.SELF_REFERRAL_COLOR,
        category: 'self-referral',
        series: 0,
        note: 'Patient self-referred'
      };
    }
    
    // Check for VA referrals
    if (PROVIDER_SPECIAL_CASES.vaVariations.some(pattern => 
        lowerProvider === pattern || lowerProvider.includes(pattern))) {
      return {
        normalized: 'VA Medical Center',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_CONFIG.FORMATTING.VA_COLOR,
        category: 'va',
        series: 0,
        note: 'Veterans Administration referral'
      };
    }
    
    // Step 3: Check standardization dictionary
    // Create normalized lookup key
    const lookupKey = provider.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/,+/g, ',')
      .replace(/\./g, '')
      .replace(/\s*,\s*/g, ', ')
      .trim();
    
    // Use PROVIDERS dictionary from Dict_Providers.js
    if (typeof PROVIDERS !== 'undefined' && PROVIDERS[lookupKey]) {
      provider = PROVIDERS[lookupKey];
    } else if (typeof PROVIDER_STANDARDIZATION !== 'undefined' && PROVIDER_STANDARDIZATION[lookupKey]) {
      provider = PROVIDER_STANDARDIZATION[lookupKey];
    } else {
      // If not in dictionary, format the name properly
      provider = formatProviderName(provider);
    }
    
    // Step 4: Determine series based on first letter
    let series = 0;
    const firstLetter = provider.charAt(0).toUpperCase();
    if (firstLetter >= 'A' && firstLetter <= 'I') {
      series = 1;
    } else if (firstLetter >= 'J' && firstLetter <= 'R') {
      series = 2;
    } else if (firstLetter >= 'S' && firstLetter <= 'Z') {
      series = 3;
    }
    
    // Step 5: Determine if name was changed
    const wasNormalized = provider !== originalProvider;
    
    return {
      normalized: provider,
      original: originalProvider,
      wasNormalized: wasNormalized,
      backgroundColor: wasNormalized ? 
        PROVIDER_CONFIG.FORMATTING.CORRECTED_COLOR : 
        PROVIDER_CONFIG.FORMATTING.DEFAULT_COLOR,
      category: 'standard',
      series: series,
      note: wasNormalized ? `Standardized from: ${originalProvider}` : null
    };
    
  } catch (error) {
    console.error('Error normalizing provider name:', error);
    return {
      normalized: 'Unknown Provider',
      original: providerInput,
      wasNormalized: true,
      backgroundColor: PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR,
      category: 'error',
      series: 0,
      note: `Error: ${error.message}`
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clean provider name by removing extra spaces and standardizing punctuation
 * @private
 */
function cleanProviderName(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/\s*,\s*/g, ', ')       // Standardize comma spacing
    .replace(/\s*\.\s*/g, '. ')      // Standardize period spacing
    .replace(/\.+/g, '.')            // Remove multiple periods
    .replace(/\s*-\s*/g, '-')        // Remove spaces around hyphens
    .replace(/['`]/g, "'")           // Standardize apostrophes
    .trim();
}

/**
 * Format provider name with proper capitalization and credentials
 * @private
 */
function formatProviderName(name) {
  // Use CREDENTIALS from Dict_Providers.js if available, otherwise use local
  const credentials = (typeof CREDENTIALS !== 'undefined') ? CREDENTIALS : {
    'md': 'MD', 'm.d.': 'MD', 'm.d': 'MD',
    'do': 'DO', 'd.o.': 'DO', 'd.o': 'DO',
    'np': 'NP', 'n.p.': 'NP',
    'fnp': 'FNP', 'fnp-c': 'FNP-C', 'fnp-bc': 'FNP-BC',
    'anp': 'ANP', 'anp-bc': 'ANP-BC',
    'aprn': 'APRN', 'aprn-bc': 'APRN-BC',
    'apn': 'APN', 'apn-bc': 'APN-BC',
    'pa': 'PA', 'pa-c': 'PA-C',
    'dnp': 'DNP', 'phd': 'PhD',
    'rn': 'RN', 'lpn': 'LPN'
  };
  
  // Extract name and credentials
  let mainName = name;
  let extractedCredentials = [];
  
  // Look for credentials (usually after comma or at end)
  const parts = name.split(',');
  if (parts.length > 1) {
    mainName = parts[0].trim();
    const credentialPart = parts.slice(1).join(',').trim();
    
    // Extract individual credentials
    const credWords = credentialPart.split(/[\s,]+/);
    credWords.forEach(word => {
      const lowerWord = word.toLowerCase().replace(/[^a-z-]/g, '');
      if (credentials[lowerWord]) {
        extractedCredentials.push(credentials[lowerWord]);
      } else if (word.match(/^[A-Z]{2,}$/)) {
        extractedCredentials.push(word); // Keep unknown abbreviations as-is
      }
    });
  }
  
  // Format the main name
  const formattedName = properCapitalizeProviderName(mainName);
  
  // Select primary credential if multiple
  let primaryCredential = '';
  if (extractedCredentials.length > 0) {
    primaryCredential = selectPrimaryCredential(extractedCredentials);
  }
  
  // Reconstruct full name
  return primaryCredential ? 
    `${formattedName}, ${primaryCredential}` : 
    formattedName;
}

/**
 * Properly capitalize provider name
 * @private
 */
function properCapitalizeProviderName(name) {
  const words = name.split(/\s+/);
  
  return words.map(word => {
    // Handle special cases
    if (word.toLowerCase() === 'ii') return 'II';
    if (word.toLowerCase() === 'iii') return 'III';
    if (word.toLowerCase() === 'iv') return 'IV';
    if (word.toLowerCase() === 'jr' || word.toLowerCase() === 'jr.') return 'Jr';
    if (word.toLowerCase() === 'sr' || word.toLowerCase() === 'sr.') return 'Sr';
    
    // Handle Mac/Mc prefixes
    if (word.toLowerCase().startsWith('mc') && word.length > 2) {
      return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    if (word.toLowerCase().startsWith('mac') && word.length > 3) {
      return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
    }
    
    // Handle hyphenated names
    if (word.includes('-')) {
      return word.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join('-');
    }
    
    // Handle names with apostrophes
    if (word.includes("'")) {
      const parts = word.split("'");
      return parts.map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join("'");
    }
    
    // Standard capitalization
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Select the primary credential from a list
 * @private
 */
function selectPrimaryCredential(credentials) {
  // Use CREDENTIAL_PRIORITY from Dict_Providers.js if available
  const priority = (typeof CREDENTIAL_PRIORITY !== 'undefined') ? CREDENTIAL_PRIORITY : [
    'MD', 'DO', 'DNP', 'PhD', 
    'PA-C', 'PA', 
    'FNP-BC', 'FNP-C', 'FNP',
    'ANP-BC', 'ANP', 
    'APRN-BC', 'APRN',
    'APN-BC', 'APN',
    'NP', 'CNM', 'CNP',
    'RN', 'LPN',
    'MSN', 'BSN'
  ];
  
  for (const cred of priority) {
    if (credentials.includes(cred)) {
      return cred;
    }
  }
  
  return credentials[0] || '';
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

/**
 * Generate a detailed provider normalization report
 * @param {Object} stats - Statistics from normalization
 */
function generateProviderReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('Provider Normalization Report');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('Provider Normalization Report');
    } else {
      reportSheet.clear();
    }
    
    // Prepare data for report
    const duplicateProviders = [];
    let duplicateCount = 0;
    
    stats.duplicates.forEach((rows, providerName) => {
      if (rows.length > 1) {
        duplicateCount += rows.length - 1;
        duplicateProviders.push([
          providerName,
          rows.length,
          rows.slice(0, 10).join(', ') + (rows.length > 10 ? '...' : '')
        ]);
      }
    });
    
    // Sort by frequency
    duplicateProviders.sort((a, b) => b[1] - a[1]);
    
    // Get top providers by frequency
    const topProviders = Array.from(stats.providerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
    
    // Create report headers
    const headers = [
      ['Referring Provider Normalization Report', ''],
      ['Generated:', new Date().toLocaleString()],
      ['Version:', '4.0 - Centralized Dictionaries'],
      ['', ''],
      ['SUMMARY STATISTICS', ''],
      ['Total Processed:', stats.processed],
      ['Names Corrected:', stats.corrected],
      ['Unknown Providers:', stats.unknown],
      ['Self Referrals:', stats.selfReferrals],
      ['VA Referrals:', stats.vaReferrals],
      ['Unique Providers:', stats.providerCounts.size],
      ['Potential Duplicates:', duplicateCount],
      ['', ''],
      ['SERIES DISTRIBUTION', ''],
      ['Series 1 (A-I):', (stats.series1Count || 0) + ' providers'],
      ['Series 2 (J-R):', (stats.series2Count || 0) + ' providers'],
      ['Series 3 (S-Z):', (stats.series3Count || 0) + ' providers'],
      ['Special Cases:', (stats.unknown + stats.selfReferrals + stats.vaReferrals) + ' entries'],
      ['', ''],
      ['TOP 50 PROVIDERS BY FREQUENCY', '']
    ];
    
    // Add headers to sheet
    reportSheet.getRange(1, 1, headers.length, 2).setValues(headers);
    
    // Add top providers header
    const providerHeaderRow = headers.length + 1;
    reportSheet.getRange(providerHeaderRow, 1, 1, 3)
      .setValues([['Provider Name', 'Referrals', 'Percentage']]);
    
    // Add top providers data
    if (topProviders.length > 0) {
      const providerData = topProviders.map(([name, count]) => [
        name,
        count,
        `${((count / stats.processed) * 100).toFixed(2)}%`
      ]);
      reportSheet.getRange(providerHeaderRow + 1, 1, providerData.length, 3)
        .setValues(providerData);
    }
    
    // Add duplicates section
    const duplicatesStart = providerHeaderRow + topProviders.length + 3;
    
    reportSheet.getRange(duplicatesStart, 1, 1, 2)
      .setValues([['PROVIDERS WITH MULTIPLE REFERRALS', '']]);
    
    reportSheet.getRange(duplicatesStart + 1, 1, 1, 3)
      .setValues([['Provider Name', 'Count', 'Row Numbers']]);
    
    if (duplicateProviders.length > 0) {
      const topDuplicates = duplicateProviders.slice(0, 30);
      reportSheet.getRange(duplicatesStart + 2, 1, topDuplicates.length, 3)
        .setValues(topDuplicates);
    }
    
    // Format the report
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(5, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(14, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(20, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(providerHeaderRow, 1, 1, 3)
      .setFontWeight('bold').setBackground('#E8E8E8');
    reportSheet.getRange(duplicatesStart, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(duplicatesStart + 1, 1, 1, 3)
      .setFontWeight('bold').setBackground('#E8E8E8');
    
    // Auto-resize columns
    reportSheet.autoResizeColumns(1, 3);
    
    // Add color legend at the bottom
    const legendStart = Math.max(duplicatesStart + duplicateProviders.length + 5, 100);
    const legend = [
      ['COLOR LEGEND', ''],
      ['', 'Corrected/Standardized Names'],
      ['', 'Unknown Providers'],
      ['', 'Self Referrals'],
      ['', 'VA Medical Center'],
      ['', 'Potential Duplicates']
    ];
    
    reportSheet.getRange(legendStart, 1, legend.length, 2).setValues(legend);
    reportSheet.getRange(legendStart, 1).setFontWeight('bold');
    
    // Apply colors to legend
    reportSheet.getRange(legendStart + 1, 1).setBackground(PROVIDER_CONFIG.FORMATTING.CORRECTED_COLOR);
    reportSheet.getRange(legendStart + 2, 1).setBackground(PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR);
    reportSheet.getRange(legendStart + 3, 1).setBackground(PROVIDER_CONFIG.FORMATTING.SELF_REFERRAL_COLOR);
    reportSheet.getRange(legendStart + 4, 1).setBackground(PROVIDER_CONFIG.FORMATTING.VA_COLOR);
    reportSheet.getRange(legendStart + 5, 1).setBackground(PROVIDER_CONFIG.FORMATTING.DUPLICATE_COLOR);
    
    console.log('Provider normalization report generated');
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Report generated successfully',
      'Provider Normalization Report',
      5
    );
    
  } catch (error) {
    console.error('Error generating provider report:', error);
    throw error;
  }
}

// ============================================
// VALIDATION & STATISTICS FUNCTIONS
// ============================================

/**
 * Validate provider entries without modifying them
 */
function validateProviders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const range = sheet.getRange(2, PROVIDER_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  let emptyCount = 0;
  let unknownCount = 0;
  let needsStandardization = 0;
  const issues = [];
  
  values.forEach((row, index) => {
    const provider = row[0];
    
    if (!provider || provider === '') {
      emptyCount++;
      issues.push({
        row: index + 2,
        issue: 'Empty provider field'
      });
    } else {
      const result = normalizeProviderName(provider.toString());
      
      if (result.category === 'unknown') {
        unknownCount++;
        issues.push({
          row: index + 2,
          issue: 'Unknown provider',
          value: provider
        });
      } else if (result.wasNormalized) {
        needsStandardization++;
      }
    }
  });
  
  const totalIssues = emptyCount + unknownCount + needsStandardization;
  
  if (totalIssues === 0) {
    SpreadsheetApp.getUi().alert(
      'Provider Validation Complete',
      'All provider entries are properly formatted!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    const message = `Provider Validation Results:\n\n` +
                   `Empty fields: ${emptyCount}\n` +
                   `Unknown providers: ${unknownCount}\n` +
                   `Needs standardization: ${needsStandardization}\n\n` +
                   `Total issues: ${totalIssues}\n\n` +
                   `Run "Normalize Referring Providers" to fix these issues.`;
    
    SpreadsheetApp.getUi().alert('Provider Validation', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
    console.log('Provider validation issues:', issues.slice(0, 20));
  }
  
  return {
    emptyCount,
    unknownCount,
    needsStandardization,
    totalIssues,
    issues
  };
}

/**
 * Get provider statistics for reporting
 */
function getProviderStatistics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return null;
  }
  
  const range = sheet.getRange(2, PROVIDER_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  const providerCounts = new Map();
  let emptyCount = 0;
  let unknownCount = 0;
  let vaCount = 0;
  let selfCount = 0;
  
  values.forEach(row => {
    const provider = row[0];
    if (!provider || provider === '') {
      emptyCount++;
    } else {
      const result = normalizeProviderName(provider.toString());
      const normalized = result.normalized;
      
      if (result.category === 'unknown') unknownCount++;
      if (result.category === 'va') vaCount++;
      if (result.category === 'self-referral') selfCount++;
      
      providerCounts.set(normalized, (providerCounts.get(normalized) || 0) + 1);
    }
  });
  
  const sorted = Array.from(providerCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  return {
    totalEntries: lastRow - 1,
    uniqueProviders: providerCounts.size,
    emptyEntries: emptyCount,
    unknownEntries: unknownCount,
    vaReferrals: vaCount,
    selfReferrals: selfCount,
    topProviders: sorted.slice(0, 20),
    providerCounts: providerCounts
  };
}

/**
 * Find providers with the most referrals
 */
function findTopReferringProviders(limit = 20) {
  const stats = getProviderStatistics();
  
  if (!stats) {
    SpreadsheetApp.getUi().alert('No data available');
    return;
  }
  
  let message = `Top ${limit} Referring Providers:\n\n`;
  
  stats.topProviders.slice(0, limit).forEach((provider, index) => {
    const percentage = ((provider[1] / stats.totalEntries) * 100).toFixed(2);
    message += `${index + 1}. ${provider[0]}: ${provider[1]} referrals (${percentage}%)\n`;
  });
  
  message += `\nTotal unique providers: ${stats.uniqueProviders}`;
  
  SpreadsheetApp.getUi().alert('Top Referring Providers', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

// ============================================
// MENU FUNCTIONS
// ============================================

/**
 * Menu function to normalize providers only
 */
function normalizeProvidersOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = normalizeReferringProviders(sheet);
  
  SpreadsheetApp.getUi().alert(
    'Provider Normalization Complete',
    `Processed: ${stats.processed}\n` +
    `Corrected: ${stats.corrected}\n` +
    `Unknown: ${stats.unknown}\n` +
    `Self Referrals: ${stats.selfReferrals}\n` +
    `VA Referrals: ${stats.vaReferrals}\n\n` +
    `Series 1 (A-I): ${stats.series1Count}\n` +
    `Series 2 (J-R): ${stats.series2Count}\n` +
    `Series 3 (S-Z): ${stats.series3Count}\n\n` +
    `Check "Provider Normalization Report" for details.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Process providers in batches for better performance
 */
function batchProcessProviders(batchSize = 500) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  let totalStats = {
    processed: 0,
    corrected: 0,
    unknown: 0,
    selfReferrals: 0,
    vaReferrals: 0,
    series1Count: 0,
    series2Count: 0,
    series3Count: 0
  };
  
  for (let startRow = 2; startRow <= lastRow; startRow += batchSize) {
    const endRow = Math.min(startRow + batchSize - 1, lastRow);
    
    const numRows = endRow - startRow + 1;
    const range = sheet.getRange(startRow, PROVIDER_CONFIG.COLUMN.INDEX, numRows, 1);
    const values = range.getValues();
    
    values.forEach(row => {
      const provider = row[0];
      if (provider) {
        const result = normalizeProviderName(provider.toString());
        
        totalStats.processed++;
        if (result.wasNormalized) totalStats.corrected++;
        if (result.category === 'unknown') totalStats.unknown++;
        if (result.category === 'self-referral') totalStats.selfReferrals++;
        if (result.category === 'va') totalStats.vaReferrals++;
        
        if (result.series === 1) totalStats.series1Count++;
        else if (result.series === 2) totalStats.series2Count++;
        else if (result.series === 3) totalStats.series3Count++;
      }
    });
    
    console.log(`Processed rows ${startRow} to ${endRow}`);
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Processing rows ${startRow} to ${endRow}...`,
      'Provider Normalization',
      2
    );
  }
  
  return totalStats;
}
