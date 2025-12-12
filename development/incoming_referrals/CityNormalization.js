/**
 * City Normalization Module
 * @module CityNormalization
 * @description Handles standardization, validation, and normalization of city names
 * @author The Kidney Experts, PLLC
 * @version 4.0 - Refactored to use centralized dictionaries
 * 
 * DEPENDENCIES:
 * - Dict_Cities.js (must be loaded first in Google Apps Script)
 *   Provides: CITY_CONFIG, CITIES, CITY_CORRECTIONS, INVALID_CITIES, VALID_CITIES
 */

// ============================================
// MAIN NORMALIZATION FUNCTIONS
// ============================================

/**
 * Main function to normalize all city entries
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of normalization results
 */
function normalizeCityData(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting city normalization...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, corrected: 0, invalid: 0 };
    }
    
    // Get all city data at once
    const range = sheet.getRange(2, CITY_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    // Track statistics
    const stats = {
      processed: 0,
      corrected: 0,
      invalid: 0,
      misspellings: 0,
      cityCounts: new Map(),
      invalidEntries: []
    };
    
    // Process each city entry
    for (let i = 0; i < values.length; i++) {
      const originalValue = values[i][0];
      
      if (originalValue !== null && originalValue !== undefined && originalValue !== '') {
        stats.processed++;
        
        const result = normalizeCityName(originalValue.toString());
        
        values[i][0] = result.normalized;
        backgrounds[i] = [result.backgroundColor];
        
        // Track statistics
        if (result.wasNormalized) stats.corrected++;
        if (result.category === 'invalid') {
          stats.invalid++;
          stats.invalidEntries.push({
            row: i + 2,
            original: originalValue,
            normalized: result.normalized
          });
        }
        if (result.category === 'misspelling') stats.misspellings++;
        
        // Count city occurrences
        const cityKey = result.normalized;
        stats.cityCounts.set(cityKey, (stats.cityCounts.get(cityKey) || 0) + 1);
        
        // Add note if there was an issue or correction
        if (result.note) {
          notes.push({
            row: i + 2,
            col: CITY_CONFIG.COLUMN.INDEX,
            message: result.note
          });
        }
      } else {
        backgrounds[i] = [CITY_CONFIG.DEFAULT_COLOR];
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
    
    console.log(`City normalization complete in ${processingTime} seconds`);
    console.log(`Processed: ${stats.processed}, Corrected: ${stats.corrected}, Invalid: ${stats.invalid}`);
    
    // Generate detailed report
    generateCityReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error in normalizeCityData:', error);
    throw new Error(`Failed to normalize city data: ${error.message}`);
  }
}

/**
 * Normalize a single city name
 * @param {string} cityInput - Raw city input
 * @returns {Object} Object with normalized name and metadata
 */
function normalizeCityName(cityInput) {
  try {
    if (!cityInput) {
      return {
        normalized: '',
        original: '',
        wasNormalized: false,
        backgroundColor: CITY_CONFIG.DEFAULT_COLOR,
        category: 'empty'
      };
    }
    
    let city = cityInput.toString().trim();
    const originalCity = city;
    
    // Step 1: Clean the input
    city = cleanCityInput(city);
    
    // Step 2: Check if it's an invalid entry
    if (isInvalidCity(city)) {
      return {
        normalized: city.toUpperCase() === city ? toTitleCaseCity(city) : city,
        original: originalCity,
        wasNormalized: true,
        backgroundColor: CITY_CONFIG.FORMATTING.INVALID_COLOR,
        category: 'invalid',
        note: `Invalid city entry: "${originalCity}"`
      };
    }
    
    // Step 3: Check for corrections/misspellings using CITIES from Dict_Cities.js
    const lowerCity = city.toLowerCase().trim();
    const cityDict = (typeof CITIES !== 'undefined') ? CITIES : 
                     (typeof CITY_CORRECTIONS !== 'undefined') ? CITY_CORRECTIONS : {};
    
    if (cityDict[lowerCity]) {
      const corrected = cityDict[lowerCity];
      return {
        normalized: corrected,
        original: originalCity,
        wasNormalized: true,
        backgroundColor: CITY_CONFIG.FORMATTING.MISSPELLED_COLOR,
        category: 'misspelling',
        note: `Corrected spelling from: ${originalCity}`
      };
    }
    
    // Step 4: Handle special formatting cases
    city = formatCityName(city);
    
    // Step 5: Validate against known cities using VALID_CITIES from Dict_Cities.js
    const validCitiesSet = (typeof VALID_CITIES !== 'undefined') ? VALID_CITIES : new Set();
    
    if (validCitiesSet.has(city)) {
      const needsCorrection = city !== originalCity;
      return {
        normalized: city,
        original: originalCity,
        wasNormalized: needsCorrection,
        backgroundColor: needsCorrection ? CITY_CONFIG.FORMATTING.CORRECTED_COLOR : CITY_CONFIG.DEFAULT_COLOR,
        category: 'valid',
        note: needsCorrection ? `Formatted from: ${originalCity}` : null
      };
    }
    
    // Step 6: For unrecognized cities, apply title case if all caps or all lowercase
    if (city === city.toUpperCase() || city === city.toLowerCase()) {
      const formatted = toTitleCaseCity(city);
      return {
        normalized: formatted,
        original: originalCity,
        wasNormalized: true,
        backgroundColor: CITY_CONFIG.FORMATTING.CORRECTED_COLOR,
        category: 'formatted',
        note: `Formatted from: ${originalCity}`
      };
    }
    
    // Step 7: Return as-is if no changes needed
    return {
      normalized: city,
      original: originalCity,
      wasNormalized: false,
      backgroundColor: CITY_CONFIG.DEFAULT_COLOR,
      category: 'unchanged',
      note: null
    };
    
  } catch (error) {
    console.error('Error normalizing city:', error);
    return {
      normalized: cityInput,
      original: cityInput,
      wasNormalized: false,
      backgroundColor: CITY_CONFIG.FORMATTING.INVALID_COLOR,
      category: 'error',
      note: `Error: ${error.message}`
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clean city input by removing extra spaces and special characters
 * @private
 */
function cleanCityInput(input) {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\t/g, ' ')
    .replace(/^\d+\s*/, '')
    .trim();
}

/**
 * Check if a city name is invalid
 * @private
 */
function isInvalidCity(city) {
  const lowerCity = city.toLowerCase().trim();
  const invalidList = (typeof INVALID_CITIES !== 'undefined') ? INVALID_CITIES : 
    ['unknown', 'n/a', 'na', 'none', 'test', 'tbd', 'blank'];
  
  return invalidList.includes(lowerCity) || 
         lowerCity.includes('epic') || 
         lowerCity === '0' ||
         lowerCity.length < CITY_CONFIG.VALIDATION.MIN_LENGTH ||
         /^\d+$/.test(lowerCity);
}

/**
 * Format city name with proper capitalization
 * @private
 */
function formatCityName(city) {
  const specialCases = {
    'ft': 'Fort',
    'st': 'Saint',
    'mt': 'Mount'
  };
  
  const words = city.split(/\s+/);
  
  const formatted = words.map((word, index) => {
    const lowerWord = word.toLowerCase();
    
    for (const [abbr, full] of Object.entries(specialCases)) {
      if (lowerWord === abbr || lowerWord.startsWith(abbr + '.')) {
        return full + word.substring(abbr.length);
      }
    }
    
    const lowercaseWords = ['of', 'the', 'and', 'or', 'in', 'at', 'on', 'by', 'for'];
    if (index > 0 && lowercaseWords.includes(lowerWord)) {
      return lowerWord;
    }
    
    if (lowerWord.startsWith('mc') && word.length > 2) {
      return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    
    if (lowerWord.startsWith("o'") && word.length > 2) {
      return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return formatted.join(' ');
}

/**
 * Convert string to title case
 * @private
 */
function toTitleCaseCity(str) {
  return str.split(/\s+/).map(word => {
    if (word.length === 0) return word;
    if (word.length <= 4 && word === word.toUpperCase()) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

/**
 * Generate a detailed city normalization report
 * @param {Object} stats - Statistics from normalization
 */
function generateCityReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('City Normalization Report');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('City Normalization Report');
    } else {
      reportSheet.clear();
    }
    
    const sortedCities = Array.from(stats.cityCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const total = stats.processed;
    
    const headers = [
      ['City Normalization Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Version:', '4.0 - Centralized Dictionaries'],
      [''],
      ['Summary Statistics'],
      ['Total Processed:', stats.processed],
      ['Entries Corrected:', stats.corrected],
      ['Misspellings Fixed:', stats.misspellings],
      ['Invalid Entries:', stats.invalid],
      [''],
      ['Top Cities by Frequency'],
      ['City', 'Count', 'Percentage']
    ];
    
    reportSheet.getRange(1, 1, headers.length, 3).setValues(headers);
    
    const cityData = sortedCities.slice(0, 50).map(([city, count]) => [
      city,
      count,
      `${((count / total) * 100).toFixed(2)}%`
    ]);
    
    if (cityData.length > 0) {
      reportSheet.getRange(13, 1, cityData.length, 3).setValues(cityData);
    }
    
    if (stats.invalidEntries.length > 0) {
      const invalidStart = 13 + cityData.length + 2;
      const invalidHeaders = [
        ['Invalid Entries'],
        ['Row', 'Original Value', 'Status']
      ];
      
      reportSheet.getRange(invalidStart, 1, invalidHeaders.length, 3)
        .setValues(invalidHeaders);
      
      const invalidData = stats.invalidEntries.slice(0, 50).map(entry => [
        entry.row,
        entry.original,
        'Invalid/Unknown City'
      ]);
      
      reportSheet.getRange(invalidStart + 2, 1, invalidData.length, 3)
        .setValues(invalidData);
    }
    
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(5, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(11, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(12, 1, 1, 3).setFontWeight('bold').setBackground('#E8E8E8');
    
    reportSheet.autoResizeColumns(1, 3);
    
    const legendStart = Math.max(13 + cityData.length + stats.invalidEntries.length + 4, 70);
    const legend = [
      ['Color Legend'],
      ['', 'Corrected Formatting'],
      ['', 'Corrected Misspellings'],
      ['', 'Invalid Entries']
    ];
    
    reportSheet.getRange(legendStart, 1, legend.length, 2).setValues(legend);
    reportSheet.getRange(legendStart, 1).setFontWeight('bold');
    
    reportSheet.getRange(legendStart + 1, 1).setBackground(CITY_CONFIG.FORMATTING.CORRECTED_COLOR);
    reportSheet.getRange(legendStart + 2, 1).setBackground(CITY_CONFIG.FORMATTING.MISSPELLED_COLOR);
    reportSheet.getRange(legendStart + 3, 1).setBackground(CITY_CONFIG.FORMATTING.INVALID_COLOR);
    
    console.log('City normalization report generated');
    
  } catch (error) {
    console.error('Error generating city report:', error);
  }
}

// ============================================
// VALIDATION & STATISTICS FUNCTIONS
// ============================================

/**
 * Validate city entries without modifying them
 */
function validateCityEntries() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const range = sheet.getRange(2, CITY_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  let invalidCount = 0;
  let emptyCount = 0;
  let misspelledCount = 0;
  const issues = [];
  
  values.forEach((row, index) => {
    const city = row[0];
    
    if (!city || city === '') {
      emptyCount++;
      issues.push({
        row: index + 2,
        issue: 'Empty city field',
        value: ''
      });
    } else {
      const result = normalizeCityName(city.toString());
      
      if (result.category === 'invalid') {
        invalidCount++;
        issues.push({
          row: index + 2,
          issue: 'Invalid city',
          value: city
        });
      } else if (result.category === 'misspelling') {
        misspelledCount++;
        issues.push({
          row: index + 2,
          issue: 'Misspelled city',
          value: city,
          suggestion: result.normalized
        });
      }
    }
  });
  
  const totalIssues = invalidCount + emptyCount + misspelledCount;
  
  if (totalIssues === 0) {
    SpreadsheetApp.getUi().alert(
      'City Validation Complete',
      'All city entries are valid!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    const message = `City Validation Results:\n\n` +
                   `Empty fields: ${emptyCount}\n` +
                   `Invalid cities: ${invalidCount}\n` +
                   `Misspelled cities: ${misspelledCount}\n\n` +
                   `Total issues: ${totalIssues}\n\n` +
                   `Run "Normalize City Data" to fix these issues.`;
    
    SpreadsheetApp.getUi().alert('City Validation', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
  
  return {
    emptyCount,
    invalidCount,
    misspelledCount,
    totalIssues,
    issues
  };
}

/**
 * Get city statistics for reporting
 */
function getCityStatistics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return null;
  }
  
  const range = sheet.getRange(2, CITY_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  const cityCounts = new Map();
  let emptyCount = 0;
  let invalidCount = 0;
  
  values.forEach(row => {
    const city = row[0];
    if (!city || city === '') {
      emptyCount++;
    } else {
      const normalized = normalizeCityName(city.toString());
      if (normalized.category === 'invalid') {
        invalidCount++;
      }
      cityCounts.set(normalized.normalized, (cityCounts.get(normalized.normalized) || 0) + 1);
    }
  });
  
  const sorted = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  return {
    totalEntries: lastRow - 1,
    uniqueCities: cityCounts.size,
    emptyEntries: emptyCount,
    invalidEntries: invalidCount,
    topCities: sorted.slice(0, 20),
    cityCounts: cityCounts
  };
}

// ============================================
// MENU FUNCTIONS
// ============================================

/**
 * Menu function to normalize city data only
 */
function normalizeCityDataOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = normalizeCityData(sheet);
  
  SpreadsheetApp.getUi().alert(
    'City Normalization Complete',
    `Processed: ${stats.processed}\n` +
    `Corrected: ${stats.corrected}\n` +
    `Misspellings Fixed: ${stats.misspellings}\n` +
    `Invalid: ${stats.invalid}\n\n` +
    `Check "City Normalization Report" for details.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Show city statistics in dialog
 */
function showCityStatistics() {
  const stats = getCityStatistics();
  
  if (!stats) {
    SpreadsheetApp.getUi().alert('No data available');
    return;
  }
  
  let message = `City Data Statistics:\n\n`;
  message += `Total Entries: ${stats.totalEntries}\n`;
  message += `Unique Cities: ${stats.uniqueCities}\n`;
  message += `Empty Entries: ${stats.emptyEntries}\n`;
  message += `Invalid Entries: ${stats.invalidEntries}\n\n`;
  message += `Top 10 Cities:\n`;
  
  stats.topCities.slice(0, 10).forEach(([city, count]) => {
    const percent = ((count / stats.totalEntries) * 100).toFixed(1);
    message += `  ${city}: ${count} (${percent}%)\n`;
  });
  
  SpreadsheetApp.getUi().alert('City Statistics', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Fix city misspellings with user confirmation
 */
function fixCityMisspellings() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Fix City Misspellings',
    'This will correct common city name misspellings.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    normalizeCityDataOnly();
  }
}

/**
 * Generate city report only
 */
function generateCityReportOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = {
    processed: 0,
    corrected: 0,
    invalid: 0,
    misspellings: 0,
    cityCounts: new Map(),
    invalidEntries: []
  };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to report');
    return;
  }
  
  const values = sheet.getRange(2, CITY_CONFIG.COLUMN.INDEX, lastRow - 1, 1).getValues();
  
  values.forEach((row, index) => {
    const city = row[0];
    if (city) {
      stats.processed++;
      const result = normalizeCityName(city.toString());
      stats.cityCounts.set(result.normalized, (stats.cityCounts.get(result.normalized) || 0) + 1);
      if (result.category === 'invalid') {
        stats.invalid++;
        stats.invalidEntries.push({ row: index + 2, original: city, normalized: result.normalized });
      }
    }
  });
  
  generateCityReport(stats);
  SpreadsheetApp.getUi().alert('City report generated.');
}
