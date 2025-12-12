/**
 * Utilities Module - Helper Functions
 * @module Utilities
 * @description Common utilities for backup, validation, and data operations
 * @author Medical Referral System
 * @version 1.0
 */

// ============================================
// DATA VALIDATION FUNCTIONS
// ============================================

/**
 * Validate all data comprehensively
 */
function validateAllData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const validation = {
    validCount: 0,
    issueCount: 0,
    criticalCount: 0,
    issues: []
  };
  
  // Check required fields
  const requiredColumns = {
    4: 'Clinic Name',
    5: 'Referring Provider',
    9: 'Patient Last Name',
    10: 'Patient First Name',
    11: 'Patient Date of Birth',
    24: 'Patient Phone Number'
  };
  
  let missingCount = 0;
  let validRows = 0;
  
  for (let row = 2; row <= lastRow; row++) {
    let rowValid = true;
    
    Object.entries(requiredColumns).forEach(([colIndex, fieldName]) => {
      const value = sheet.getRange(row, parseInt(colIndex)).getValue();
      if (!value || value === '') {
        rowValid = false;
        missingCount++;
        if (validation.issues.length < 20) {
          validation.issues.push(`Row ${row}: Missing ${fieldName}`);
        }
      }
    });
    
    if (rowValid) validRows++;
  }
  
  validation.validCount = validRows;
  validation.issueCount = missingCount;
  validation.criticalCount = missingCount;
  
  // Show results
  const message = `Data Validation Results:\n\n` +
                 `Valid Records: ${validRows}\n` +
                 `Total Issues: ${missingCount}\n` +
                 `Critical Issues: ${missingCount}\n\n` +
                 (validation.issues.length > 0 ? 
                   `Sample Issues:\n${validation.issues.slice(0, 10).join('\n')}` : 
                   'No issues found!');
  
  SpreadsheetApp.getUi().alert('Data Validation', message, SpreadsheetApp.getUi().ButtonSet.OK);
  
  return validation;
}

/**
 * Find missing required fields
 */
function findMissingRequired() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to check');
    return;
  }
  
  const missingFields = [];
  const requiredColumns = {
    'D': { index: 4, name: 'Clinic Name' },
    'E': { index: 5, name: 'Referring Provider' },
    'I': { index: 9, name: 'Patient Last Name' },
    'J': { index: 10, name: 'Patient First Name' },
    'K': { index: 11, name: 'Patient Date of Birth' },
    'X': { index: 24, name: 'Patient Phone Number' },
    'AA': { index: 27, name: 'Reason for Referral' }
  };
  
  Object.values(requiredColumns).forEach(column => {
    const range = sheet.getRange(2, column.index, lastRow - 1, 1);
    const values = range.getValues();
    
    values.forEach((row, index) => {
      if (!row[0] || row[0] === '') {
        missingFields.push(`Row ${index + 2}: Missing ${column.name}`);
      }
    });
  });
  
  if (missingFields.length === 0) {
    SpreadsheetApp.getUi().alert('All required fields are filled!');
  } else {
    const message = `Found ${missingFields.length} missing required fields:\n\n` +
                   missingFields.slice(0, 20).join('\n') +
                   (missingFields.length > 20 ? '\n...' : '');
    
    SpreadsheetApp.getUi().alert('Missing Required Fields', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
  
  return missingFields;
}

/**
 * Check for duplicate referrals
 */
function checkDuplicateReferrals() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to check');
    return;
  }
  
  // Get patient identifiers (Last Name, First Name, DOB)
  const patientData = sheet.getRange(2, 9, lastRow - 1, 3).getValues();
  const duplicates = [];
  const seen = {};
  
  patientData.forEach((row, index) => {
    const lastName = row[0];
    const firstName = row[1];
    const dob = row[2];
    
    // Create unique key
    const key = `${lastName}_${firstName}_${dob}`;
    
    if (seen[key]) {
      duplicates.push({
        row1: seen[key],
        row2: index + 2,
        patient: `${firstName} ${lastName}`,
        dob: dob
      });
    } else {
      seen[key] = index + 2;
    }
  });
  
  if (duplicates.length === 0) {
    SpreadsheetApp.getUi().alert('No duplicate referrals found!');
  } else {
    const message = `Found ${duplicates.length} duplicate referrals:\n\n` +
                   duplicates.slice(0, 10).map(d => 
                     `Rows ${d.row1} & ${d.row2}: ${d.patient}`
                   ).join('\n');
    
    SpreadsheetApp.getUi().alert('Duplicate Referrals', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
  
  return duplicates;
}

/**
 * Generate daily report
 */
function generateDailyReport() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      SpreadsheetApp.getUi().alert('No data available for report');
      return;
    }
    
    // Get today's referrals
    const timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let todayCount = 0;
    let completeCount = 0;
    
    timestamps.forEach((row, index) => {
      const timestamp = new Date(row[0]);
      if (timestamp >= today && timestamp < tomorrow) {
        todayCount++;
        
        // Check if complete (column AE - index 31)
        const isComplete = sheet.getRange(index + 2, 31).getValue();
        if (isComplete) {
          completeCount++;
        }
      }
    });
    
    const completionRate = todayCount > 0 ? 
      Math.round((completeCount / todayCount) * 100) : 0;
    
    const report = `📊 Daily Report for ${today.toLocaleDateString()}\n\n` +
           `Total Referrals Today: ${todayCount}\n` +
           `✅ Complete: ${completeCount}\n` +
           `⏳ Incomplete: ${todayCount - completeCount}\n` +
           `📈 Completion Rate: ${completionRate}%`;
    
    SpreadsheetApp.getUi().alert('Daily Report', report, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('Daily report generation failed:', error);
    SpreadsheetApp.getUi().alert('Error generating daily report');
  }
}

/**
 * Generate weekly report
 */
function generateWeeklyReport() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      SpreadsheetApp.getUi().alert('No data available for report');
      return;
    }
    
    // Get week's referrals
    const timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let weekCount = 0;
    let completeCount = 0;
    const dailyCounts = new Map();
    
    timestamps.forEach((row, index) => {
      const timestamp = new Date(row[0]);
      if (timestamp >= weekAgo && timestamp <= today) {
        weekCount++;
        
        // Track daily
        const dateKey = timestamp.toLocaleDateString();
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
        
        // Check if complete
        const isComplete = sheet.getRange(index + 2, 31).getValue();
        if (isComplete) {
          completeCount++;
        }
      }
    });
    
    const avgDaily = Math.round(weekCount / 7);
    const completionRate = weekCount > 0 ? 
      Math.round((completeCount / weekCount) * 100) : 0;
    
    let report = `📊 Weekly Summary Report\n\n`;
    report += `Period: ${weekAgo.toLocaleDateString()} to ${today.toLocaleDateString()}\n\n`;
    report += `Total Referrals: ${weekCount}\n`;
    report += `Average Daily: ${avgDaily}\n`;
    report += `Completion Rate: ${completionRate}%\n\n`;
    
    // Add daily breakdown
    if (dailyCounts.size > 0) {
      report += `Daily Breakdown:\n`;
      Array.from(dailyCounts.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-7)
        .forEach(([date, count]) => {
          report += `• ${date}: ${count} referrals\n`;
        });
    }
    
    SpreadsheetApp.getUi().alert('Weekly Report', report, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('Weekly report generation failed:', error);
    SpreadsheetApp.getUi().alert('Error generating weekly report');
  }
}

/**
 * Show data quality dashboard
 */
function showDataQualityDashboard() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data available');
    return;
  }
  
  let completeRecords = 0;
  let validPhones = 0;
  let validClinics = 0;
  let validProviders = 0;
  
  for (let row = 2; row <= lastRow; row++) {
    // Check if all required fields are present
    const clinic = sheet.getRange(row, 4).getValue();
    const provider = sheet.getRange(row, 5).getValue();
    const lastName = sheet.getRange(row, 9).getValue();
    const firstName = sheet.getRange(row, 10).getValue();
    const dob = sheet.getRange(row, 11).getValue();
    const phone = sheet.getRange(row, 24).getValue();
    
    // Check completeness
    if (clinic && provider && lastName && firstName && dob && phone) {
      completeRecords++;
    }
    
    // Check phone validity
    if (phone && phone.toString().replace(/\D/g, '').length >= 10) {
      validPhones++;
    }
    
    // Check clinic validity
    if (clinic && clinic !== 'Unknown Clinic' && clinic !== '') {
      validClinics++;
    }
    
    // Check provider validity
    if (provider && provider !== 'Unknown Provider' && provider !== '') {
      validProviders++;
    }
  }
  
  const totalRecords = lastRow - 1;
  const completenessPercent = Math.round((completeRecords / totalRecords) * 100);
  const phoneQuality = Math.round((validPhones / totalRecords) * 100);
  const clinicQuality = Math.round((validClinics / totalRecords) * 100);
  const providerQuality = Math.round((validProviders / totalRecords) * 100);
  
  const message = `📊 Data Quality Dashboard\n\n` +
                 `Total Records: ${totalRecords}\n\n` +
                 `✅ Complete Records: ${completeRecords} (${completenessPercent}%)\n` +
                 `📞 Valid Phones: ${validPhones} (${phoneQuality}%)\n` +
                 `🏥 Valid Clinics: ${validClinics} (${clinicQuality}%)\n` +
                 `👨‍⚕️ Valid Providers: ${validProviders} (${providerQuality}%)\n\n` +
                 `Overall Quality Score: ${Math.round((completenessPercent + phoneQuality + clinicQuality + providerQuality) / 4)}%`;
  
  SpreadsheetApp.getUi().alert('Data Quality Dashboard', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Show weekly trends
 */
function showWeeklyTrends() {
  const message = `📈 Weekly Trends Analysis\n\n` +
                 `This feature analyzes trends over the past 4 weeks.\n\n` +
                 `Coming soon:\n` +
                 `• Referral volume trends\n` +
                 `• Completion rate trends\n` +
                 `• Top referring providers\n` +
                 `• Peak referral days\n\n` +
                 `Check back after next update!`;
  
  SpreadsheetApp.getUi().alert('Weekly Trends', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Get phone statistics (stub - implement in PhoneNormalization.gs)
 */
function getPhoneStatistics() {
  return {
    totalEntries: 0,
    validPhones: 0,
    invalidPhones: 0,
    missingPhones: 0
  };
}

/**
 * Get clinic statistics (stub - implement in ClinicNormalization.gs)
 */
function getClinicStatistics() {
  return {
    totalEntries: 0,
    uniqueClinics: 0,
    selfReferrals: 0,
    government: 0
  };
}

/**
 * Get state statistics (stub - implement in StateNormalization.gs)  
 */
function getStateStatistics() {
  return {
    totalEntries: 0,
    uniqueStates: 0,
    emptyEntries: 0,
    topStates: []
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  const digits = phone.toString().replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
  }
  
  return phone;
}

/**
 * Parse date string to Date object
 * @param {string} dateStr - Date string
 * @returns {Date} Date object
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Format date for display
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date || !(date instanceof Date)) return '';
  
  return Utilities.formatDate(date, 'America/Chicago', 'MM/dd/yyyy');
}

/**
 * Get column letter from index
 * @param {number} columnIndex - 1-based column index
 * @returns {string} Column letter(s)
 */
function getColumnLetter(columnIndex) {
  let letter = '';
  
  while (columnIndex > 0) {
    const remainder = (columnIndex - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    columnIndex = Math.floor((columnIndex - 1) / 26);
  }
  
  return letter;
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} Is valid email
 */
function isValidEmail(email) {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Mask sensitive data for display
 * @param {string} data - Sensitive data
 * @param {number} showLast - Number of characters to show at end
 * @returns {string} Masked data
 */
function maskSensitiveData(data, showLast = 4) {
  if (!data) return '';
  
  const str = data.toString();
  if (str.length <= showLast) return str;
  
  const masked = '*'.repeat(str.length - showLast) + str.slice(-showLast);
  return masked;
}