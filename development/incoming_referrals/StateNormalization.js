/**
 * State Normalization Module
 * @module StateNormalization
 * @description Handles standardization, validation, and normalization of US state names
 * @author The Kidney Experts, PLLC
 * @version 4.0 - Refactored to use centralized dictionaries
 * 
 * DEPENDENCIES:
 * - Dict_States.js (must be loaded first in Google Apps Script)
 *   Provides: STATE_CONFIG, STATE_ABBREVIATIONS, STATES, STATE_VARIATIONS
 */

// ============================================
// MAIN NORMALIZATION FUNCTIONS
// ============================================

/**
 * Main function to normalize all state entries
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of normalization results
 */
function normalizeStateData(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting state normalization...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, corrected: 0, invalid: 0 };
    }
    
    // Get all state data at once
    const range = sheet.getRange(2, STATE_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    // Track statistics
    const stats = {
      processed: 0,
      corrected: 0,
      invalid: 0,
      outOfRegion: 0,
      stateCounts: new Map(),
      invalidEntries: []
    };
    
    // Process each state entry
    for (let i = 0; i < values.length; i++) {
      const originalValue = values[i][0];
      
      if (originalValue !== null && originalValue !== undefined && originalValue !== '') {
        stats.processed++;
        
        const result = normalizeStateName(originalValue.toString());
        
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
        if (result.category === 'out-of-region') stats.outOfRegion++;
        
        // Count state occurrences
        const stateKey = result.normalized;
        stats.stateCounts.set(stateKey, (stats.stateCounts.get(stateKey) || 0) + 1);
        
        // Add note if there was an issue or correction
        if (result.note) {
          notes.push({
            row: i + 2,
            col: STATE_CONFIG.COLUMN.INDEX,
            message: result.note
          });
        }
      } else {
        // Empty cell - default to Tennessee
        values[i][0] = STATE_CONFIG.DEFAULT_STATE;
        backgrounds[i] = [STATE_CONFIG.FORMATTING.CORRECTED_COLOR];
        stats.corrected++;
        
        notes.push({
          row: i + 2,
          col: STATE_CONFIG.COLUMN.INDEX,
          message: 'Empty state - defaulted to Tennessee'
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
    
    console.log(`State normalization complete in ${processingTime} seconds`);
    console.log(`Processed: ${stats.processed}, Corrected: ${stats.corrected}, Invalid: ${stats.invalid}`);
    
    // Generate detailed report
    generateStateReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error in normalizeStateData:', error);
    throw new Error(`Failed to normalize state data: ${error.message}`);
  }
}

/**
 * Normalize a single state name
 * @param {string} stateInput - Raw state input
 * @returns {Object} Object with normalized name and metadata
 */
function normalizeStateName(stateInput) {
  try {
    if (!stateInput) {
      return {
        normalized: STATE_CONFIG.DEFAULT_STATE,
        original: '',
        wasNormalized: true,
        backgroundColor: STATE_CONFIG.FORMATTING.CORRECTED_COLOR,
        category: 'empty',
        note: 'Empty state - defaulted to Tennessee'
      };
    }
    
    let state = stateInput.toString().trim();
    const originalState = state;
    
    // Step 1: Clean the input
    state = cleanStateInput(state);
    
    // Step 2: Check if already a valid full state name
    if (isValidStateName(state)) {
      state = properCapitalizeState(state);
      const isInRegion = STATE_CONFIG.PRIMARY_REGION_STATES.includes(state);
      
      return {
        normalized: state,
        original: originalState,
        wasNormalized: state !== originalState,
        backgroundColor: state !== originalState ? STATE_CONFIG.FORMATTING.CORRECTED_COLOR : 
                        !isInRegion ? STATE_CONFIG.FORMATTING.OUT_OF_REGION_COLOR : 
                        STATE_CONFIG.FORMATTING.DEFAULT_COLOR,
        category: isInRegion ? 'valid' : 'out-of-region',
        note: !isInRegion ? `Out of primary region: ${state}` : null
      };
    }
    
    // Step 3: Check variations and typos using STATES from Dict_States.js
    const lowerState = state.toLowerCase();
    const stateDict = (typeof STATES !== 'undefined') ? STATES : 
                      (typeof STATE_VARIATIONS !== 'undefined') ? STATE_VARIATIONS : {};
    
    if (stateDict[lowerState]) {
      const normalized = stateDict[lowerState];
      const isInRegion = STATE_CONFIG.PRIMARY_REGION_STATES.includes(normalized);
      
      return {
        normalized: normalized,
        original: originalState,
        wasNormalized: true,
        backgroundColor: STATE_CONFIG.FORMATTING.CORRECTED_COLOR,
        category: isInRegion ? 'corrected' : 'out-of-region',
        note: `Corrected from: ${originalState}`
      };
    }
    
    // Step 4: Check standard abbreviations using STATE_ABBREVIATIONS from Dict_States.js
    const upperState = state.toUpperCase();
    const abbrevDict = (typeof STATE_ABBREVIATIONS !== 'undefined') ? STATE_ABBREVIATIONS : {};
    
    if (abbrevDict[upperState]) {
      const fullName = abbrevDict[upperState];
      const isInRegion = STATE_CONFIG.PRIMARY_REGION_STATES.includes(fullName);
      
      return {
        normalized: fullName,
        original: originalState,
        wasNormalized: true,
        backgroundColor: STATE_CONFIG.FORMATTING.CORRECTED_COLOR,
        category: isInRegion ? 'abbreviation' : 'out-of-region',
        note: `Expanded abbreviation: ${originalState} → ${fullName}`
      };
    }
    
    // Step 5: Handle special cases
    const specialResult = handleSpecialCases(state, originalState);
    if (specialResult) {
      return specialResult;
    }
    
    // Step 6: If still not recognized, default to Tennessee
    console.warn(`Unrecognized state value: "${originalState}"`);
    
    return {
      normalized: STATE_CONFIG.DEFAULT_STATE,
      original: originalState,
      wasNormalized: true,
      backgroundColor: STATE_CONFIG.FORMATTING.INVALID_COLOR,
      category: 'invalid',
      note: `Invalid state "${originalState}" - defaulted to Tennessee`
    };
    
  } catch (error) {
    console.error('Error normalizing state:', error);
    return {
      normalized: STATE_CONFIG.DEFAULT_STATE,
      original: stateInput,
      wasNormalized: true,
      backgroundColor: STATE_CONFIG.FORMATTING.INVALID_COLOR,
      category: 'error',
      note: `Error: ${error.message}`
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clean state input by removing extra spaces and special characters
 * @private
 */
function cleanStateInput(input) {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.-]/g, '')
    .replace(/^\.+|\.+$/g, '')
    .trim();
}

/**
 * Check if a string is a valid US state name
 * @private
 */
function isValidStateName(state) {
  const validStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
  ];
  
  return validStates.some(validState => 
    validState.toLowerCase() === state.toLowerCase()
  );
}

/**
 * Properly capitalize state names
 * @private
 */
function properCapitalizeState(state) {
  const multiWordStates = {
    'new hampshire': 'New Hampshire',
    'new jersey': 'New Jersey',
    'new mexico': 'New Mexico',
    'new york': 'New York',
    'north carolina': 'North Carolina',
    'north dakota': 'North Dakota',
    'rhode island': 'Rhode Island',
    'south carolina': 'South Carolina',
    'south dakota': 'South Dakota',
    'west virginia': 'West Virginia',
    'district of columbia': 'District of Columbia'
  };
  
  const lower = state.toLowerCase();
  if (multiWordStates[lower]) {
    return multiWordStates[lower];
  }
  
  return state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
}

/**
 * Handle special cases and edge situations
 * @private
 */
function handleSpecialCases(state, originalState) {
  const lower = state.toLowerCase();
  
  const tennesseeIndicators = [
    'in epic', 'in chart', 'unknown', 'tennessee ',
    'tn ', 'west tennessee', 'middle tennessee', 'east tennessee'
  ];
  
  if (tennesseeIndicators.some(indicator => lower.includes(indicator))) {
    return {
      normalized: 'Tennessee',
      original: originalState,
      wasNormalized: true,
      backgroundColor: STATE_CONFIG.FORMATTING.CORRECTED_COLOR,
      category: 'special-case',
      note: `Interpreted "${originalState}" as Tennessee`
    };
  }
  
  if (lower.includes('atoka')) {
    return {
      normalized: 'Tennessee',
      original: originalState,
      wasNormalized: true,
      backgroundColor: STATE_CONFIG.FORMATTING.CORRECTED_COLOR,
      category: 'city-reference',
      note: 'Atoka interpreted as Tennessee location'
    };
  }
  
  return null;
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

/**
 * Generate a detailed state normalization report
 * @param {Object} stats - Statistics from normalization
 */
function generateStateReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('State Normalization Report');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('State Normalization Report');
    } else {
      reportSheet.clear();
    }
    
    const sortedStates = Array.from(stats.stateCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const total = stats.processed;
    
    const headers = [
      ['State Normalization Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Version:', '4.0 - Centralized Dictionaries'],
      [''],
      ['Summary Statistics'],
      ['Total Processed:', stats.processed],
      ['Entries Corrected:', stats.corrected],
      ['Invalid Entries:', stats.invalid],
      ['Out-of-Region States:', stats.outOfRegion],
      [''],
      ['State Distribution'],
      ['State', 'Count', 'Percentage']
    ];
    
    reportSheet.getRange(1, 1, headers.length, 3).setValues(headers);
    
    const stateData = sortedStates.map(([state, count]) => [
      state,
      count,
      `${((count / total) * 100).toFixed(2)}%`
    ]);
    
    if (stateData.length > 0) {
      reportSheet.getRange(13, 1, stateData.length, 3).setValues(stateData);
    }
    
    if (stats.invalidEntries.length > 0) {
      const invalidStart = 13 + stateData.length + 2;
      const invalidHeaders = [
        ['Invalid Entries'],
        ['Row', 'Original Value', 'Corrected To']
      ];
      
      reportSheet.getRange(invalidStart, 1, invalidHeaders.length, 3)
        .setValues(invalidHeaders);
      
      const invalidData = stats.invalidEntries.slice(0, 50).map(entry => [
        entry.row,
        entry.original,
        entry.normalized
      ]);
      
      reportSheet.getRange(invalidStart + 2, 1, invalidData.length, 3)
        .setValues(invalidData);
    }
    
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(5, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(11, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(12, 1, 1, 3).setFontWeight('bold').setBackground('#E8E8E8');
    
    reportSheet.autoResizeColumns(1, 3);
    
    const legendStart = Math.max(13 + stateData.length + stats.invalidEntries.length + 4, 50);
    const legend = [
      ['Color Legend'],
      ['', 'Corrected Entries'],
      ['', 'Invalid Entries (Defaulted)'],
      ['', 'Out-of-Region States']
    ];
    
    reportSheet.getRange(legendStart, 1, legend.length, 2).setValues(legend);
    reportSheet.getRange(legendStart, 1).setFontWeight('bold');
    
    reportSheet.getRange(legendStart + 1, 1).setBackground(STATE_CONFIG.FORMATTING.CORRECTED_COLOR);
    reportSheet.getRange(legendStart + 2, 1).setBackground(STATE_CONFIG.FORMATTING.INVALID_COLOR);
    reportSheet.getRange(legendStart + 3, 1).setBackground(STATE_CONFIG.FORMATTING.OUT_OF_REGION_COLOR);
    
    console.log('State normalization report generated');
    
  } catch (error) {
    console.error('Error generating state report:', error);
  }
}

// ============================================
// VALIDATION & STATISTICS FUNCTIONS
// ============================================

/**
 * Validate state entries without modifying them
 */
function validateStateEntries() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const range = sheet.getRange(2, STATE_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  let invalidCount = 0;
  let emptyCount = 0;
  let outOfRegionCount = 0;
  const issues = [];
  
  values.forEach((row, index) => {
    const state = row[0];
    
    if (!state || state === '') {
      emptyCount++;
      issues.push({
        row: index + 2,
        issue: 'Empty state field',
        value: ''
      });
    } else {
      const result = normalizeStateName(state.toString());
      
      if (result.category === 'invalid') {
        invalidCount++;
        issues.push({
          row: index + 2,
          issue: 'Invalid state',
          value: state
        });
      } else if (result.category === 'out-of-region') {
        outOfRegionCount++;
        issues.push({
          row: index + 2,
          issue: 'Out of region',
          value: state
        });
      }
    }
  });
  
  const totalIssues = invalidCount + emptyCount + outOfRegionCount;
  
  if (totalIssues === 0) {
    SpreadsheetApp.getUi().alert(
      'State Validation Complete',
      'All state entries are valid and in the expected region!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    const message = `State Validation Results:\n\n` +
                   `Empty fields: ${emptyCount}\n` +
                   `Invalid states: ${invalidCount}\n` +
                   `Out-of-region states: ${outOfRegionCount}\n\n` +
                   `Total issues: ${totalIssues}\n\n` +
                   `Run "Normalize State Data" to fix these issues.`;
    
    SpreadsheetApp.getUi().alert('State Validation', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
  
  return {
    emptyCount,
    invalidCount,
    outOfRegionCount,
    totalIssues,
    issues
  };
}

/**
 * Get state statistics for reporting
 */
function getStateStatistics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return null;
  }
  
  const range = sheet.getRange(2, STATE_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  const stateCounts = new Map();
  let emptyCount = 0;
  
  values.forEach(row => {
    const state = row[0];
    if (!state || state === '') {
      emptyCount++;
    } else {
      const normalized = normalizeStateName(state.toString()).normalized;
      stateCounts.set(normalized, (stateCounts.get(normalized) || 0) + 1);
    }
  });
  
  const sorted = Array.from(stateCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  return {
    totalEntries: lastRow - 1,
    uniqueStates: stateCounts.size,
    emptyEntries: emptyCount,
    topStates: sorted.slice(0, 10),
    stateCounts: stateCounts
  };
}

// ============================================
// MENU FUNCTIONS
// ============================================

/**
 * Menu function to normalize state data only
 */
function normalizeStateDataOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = normalizeStateData(sheet);
  
  SpreadsheetApp.getUi().alert(
    'State Normalization Complete',
    `Processed: ${stats.processed}\n` +
    `Corrected: ${stats.corrected}\n` +
    `Invalid: ${stats.invalid}\n` +
    `Out-of-region: ${stats.outOfRegion}\n\n` +
    `Check "State Normalization Report" for details.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Show state statistics in dialog
 */
function showStateStatistics() {
  const stats = getStateStatistics();
  
  if (!stats) {
    SpreadsheetApp.getUi().alert('No data available');
    return;
  }
  
  let message = `State Data Statistics:\n\n`;
  message += `Total Entries: ${stats.totalEntries}\n`;
  message += `Unique States: ${stats.uniqueStates}\n`;
  message += `Empty Entries: ${stats.emptyEntries}\n\n`;
  message += `State Distribution:\n`;
  
  stats.topStates.forEach(([state, count]) => {
    const percent = ((count / stats.totalEntries) * 100).toFixed(1);
    message += `  ${state}: ${count} (${percent}%)\n`;
  });
  
  SpreadsheetApp.getUi().alert('State Statistics', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Generate state report only
 */
function generateStateReportOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = {
    processed: 0,
    corrected: 0,
    invalid: 0,
    outOfRegion: 0,
    stateCounts: new Map(),
    invalidEntries: []
  };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to report');
    return;
  }
  
  const values = sheet.getRange(2, STATE_CONFIG.COLUMN.INDEX, lastRow - 1, 1).getValues();
  
  values.forEach((row, index) => {
    const state = row[0];
    if (state) {
      stats.processed++;
      const result = normalizeStateName(state.toString());
      stats.stateCounts.set(result.normalized, (stats.stateCounts.get(result.normalized) || 0) + 1);
      if (result.category === 'invalid') {
        stats.invalid++;
        stats.invalidEntries.push({ row: index + 2, original: state, normalized: result.normalized });
      }
    }
  });
  
  generateStateReport(stats);
  SpreadsheetApp.getUi().alert('State report generated.');
}
