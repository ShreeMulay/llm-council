/**
 * ============================================================================
 * CODE.JS - Main Orchestration File
 * ============================================================================
 * 
 * @fileoverview Central controller for TKE Medical Referral System
 * @author The Kidney Experts, PLLC
 * @version 5.0.0
 * @lastModified 2025-11-30
 * 
 * DESCRIPTION:
 * This file serves as the main entry point and orchestrator for the referral
 * management system. It handles:
 *   - Custom menu creation and UI interactions
 *   - Coordination of all normalization modules
 *   - Trigger management (form submit, auto-sort)
 *   - Backup and restore operations
 *   - System configuration and settings
 * 
 * DEPENDENCIES:
 *   - Dict_Providers.js   (PROVIDERS dictionary)
 *   - Dict_Clinics.js     (CLINICS dictionary)
 *   - Dict_Cities.js      (CITIES dictionary)
 *   - Dict_States.js      (STATES dictionary)
 *   - ProviderNormalization.js
 *   - ClinicNormalization.js
 *   - CityNormalization.js
 *   - StateNormalization.js
 *   - PhoneNormalization.js
 *   - OnFormSubmit.js
 * 
 * COLUMN REFERENCE:
 *   A (1)  = Timestamp
 *   B (2)  = Self-Referral (Yes/No)
 *   C (3)  = [varies]
 *   D (4)  = Clinic Name
 *   E (5)  = Referring Provider
 *   F (6)  = Staff Name
 *   G (7)  = Phone 1
 *   H (8)  = Phone 2
 *   I (9)  = Patient Last Name
 *   J (10) = Patient First Name
 *   ...
 *   T (20) = Address
 *   U (21) = City
 *   V (22) = State
 *   W (23) = ZIP
 *   X (24) = Phone 3
 *   ...
 *   AD (30) = Phone 4
 *   AE (31) = Complete (TRUE/FALSE)
 *   AF (32) = Status
 * 
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Global configuration object for the referral system
 * @const {Object}
 */
const CONFIG = {
  /** @type {string} Name of the main data sheet */
  SHEET_NAME: 'Form Responses 1',
  
  /** @type {string} Timezone for date/time operations */
  TIMEZONE: 'America/Chicago',
  
  /** @type {string} Current version number */
  VERSION: '7.0.0',
  
  /** @type {boolean} Enable debug logging */
  DEBUG_MODE: false,
  
  /** @type {number} Rows to process per batch */
  BATCH_SIZE: 100,
  
  /** @type {boolean} Create backup before normalization */
  AUTO_BACKUP: true
};

// ============================================================================
// LEGACY TRIGGER FUNCTIONS (Preserved for backwards compatibility)
// ============================================================================

/**
 * Legacy function: Sets initial values for new form submissions
 * @param {Object} e - The form submit event object
 * @deprecated Use onFormSubmitNormalize() from OnFormSubmit.js instead
 */
function newRow(e) {
  var range = e.range;
  var row = range.getRow();
  var sheet = range.getSheet();
  var theColumn = 31;      // Column AE - Complete
  var StatusColumn = 32;   // Column AF - Status
  sheet.getRange(row, theColumn).setValue("FALSE");
  sheet.getRange(row, StatusColumn).setValue("New");
}

/**
 * Sorts the sheet by timestamp (Column A) in ascending order
 * Used by the auto-sort trigger to maintain chronological order
 */
function autoSortByTimestamp() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    range.sort({column: 1, ascending: true});
  }
}

/**
 * Creates a time-based trigger to auto-sort every 4 hours
 * Removes any existing auto-sort triggers first to prevent duplicates
 */
function createFourHourTrigger() {
  // Remove existing triggers for this function
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == "autoSortByTimestamp") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // Create new 4-hour trigger
  ScriptApp.newTrigger('autoSortByTimestamp')
    .timeBased()
    .everyHours(4)
    .create();
    
  SpreadsheetApp.getUi().alert(
    'Trigger Created',
    'Auto-sort will run every 4 hours.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Displays all installable triggers in the log
 * Useful for debugging trigger issues
 */
function displayAllTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  var ui = SpreadsheetApp.getUi();
  
  if (allTriggers.length === 0) {
    ui.alert('No Triggers', 'No installable triggers found.', ui.ButtonSet.OK);
    return;
  }
  
  var message = 'Active Triggers:\n\n';
  for (var i = 0; i < allTriggers.length; i++) {
    var trigger = allTriggers[i];
    message += (i + 1) + '. ' + trigger.getHandlerFunction() + 
               ' (' + trigger.getEventType() + ')\n';
  }
  
  ui.alert('Trigger Status', message, ui.ButtonSet.OK);
}

/**
 * Deletes ALL installable triggers for this project
 * Use with caution - this removes form submit and auto-sort triggers
 */
function deleteAllTriggers() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Delete All Triggers?',
    'This will remove ALL triggers including form submit and auto-sort.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  var allTriggers = ScriptApp.getProjectTriggers();
  var count = allTriggers.length;
  
  for (var i = 0; i < allTriggers.length; i++) {
    ScriptApp.deleteTrigger(allTriggers[i]);
  }
  
  ui.alert('Triggers Deleted', 'Removed ' + count + ' trigger(s).', ui.ButtonSet.OK);
}

// ============================================================================
// ONE-CLICK TRIGGER SETUP
// ============================================================================

/**
 * Setup all triggers at once - Form Submit, Daily/Weekly Digests, Overdue Alerts, Auto-Sort
 * This is the recommended way to initialize the system
 */
function setupAllTriggers() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Setup All Triggers?',
    'This will configure:\n\n' +
    '✅ Form Submit Processing (real-time)\n' +
    '✅ Daily Digest (5 PM CST)\n' +
    '✅ Weekly Digest (Friday 5 PM CST)\n' +
    '✅ Overdue Alerts (9 AM & 2 PM CST)\n' +
    '✅ Auto-Sort (every 4 hours)\n\n' +
    'Any existing triggers will be replaced.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Setting up triggers...', 'Setup', -1);
  
  try {
    // Remove all existing triggers first
    const existingTriggers = ScriptApp.getProjectTriggers();
    existingTriggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
    
    // 1. Form Submit Trigger
    ScriptApp.newTrigger('onFormSubmitNormalize')
      .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
      .onFormSubmit()
      .create();
    
    // 2. Daily Digest (5 PM CST)
    ScriptApp.newTrigger('sendDailyDigest')
      .timeBased()
      .atHour(17)
      .everyDays(1)
      .inTimezone('America/Chicago')
      .create();
    
    // 3. Weekly Digest (Friday 5 PM CST)
    ScriptApp.newTrigger('sendWeeklyDigest')
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.FRIDAY)
      .atHour(17)
      .inTimezone('America/Chicago')
      .create();
    
    // 4. Overdue Alerts (9 AM CST)
    ScriptApp.newTrigger('sendOverdueAlerts')
      .timeBased()
      .atHour(9)
      .everyDays(1)
      .inTimezone('America/Chicago')
      .create();
    
    // 5. Overdue Alerts (2 PM CST)
    ScriptApp.newTrigger('sendOverdueAlerts')
      .timeBased()
      .atHour(14)
      .everyDays(1)
      .inTimezone('America/Chicago')
      .create();
    
    // 6. Auto-Sort (every 4 hours)
    ScriptApp.newTrigger('autoSortByTimestamp')
      .timeBased()
      .everyHours(4)
      .create();
    
    SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
    
    ui.alert(
      '✅ All Triggers Configured!',
      'The following triggers are now active:\n\n' +
      '• Form Submit → Real-time processing\n' +
      '• Daily Digest → 5 PM CST\n' +
      '• Weekly Digest → Friday 5 PM CST\n' +
      '• Overdue Alerts → 9 AM & 2 PM CST\n' +
      '• Auto-Sort → Every 4 hours\n\n' +
      'Total: 6 triggers created',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
    ui.alert('Setup Error', 'Error: ' + error.message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// MENU INITIALIZATION
// ============================================================================

/**
 * Creates the custom menu when the spreadsheet opens
 * This function is automatically called by Google Sheets on open
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('Referral System')
    
    // === NOTIFICATIONS - Daily use ===
    .addSubMenu(ui.createMenu('📢 Notifications')
      .addItem('Send Test Notification', 'sendTestNotification')
      .addItem('Notify Selected Row', 'sendNotificationForSelectedRow')
      .addSeparator()
      .addItem('Send Daily Digest', 'sendDailyDigestNow')
      .addItem('Send Weekly Digest', 'sendWeeklyDigestNow')
      .addSeparator()
      .addItem('Check Overdue Referrals', 'sendOverdueAlertsNow'))
    
    // === AI TRIAGE - Occasional batch operations ===
    .addSubMenu(ui.createMenu('🤖 AI Triage')
      .addItem('Triage Selected Row', 'triageSelectedRow')
      .addItem('Triage Selected Range', 'triageSelectedRange')
      .addItem('Triage All Pending', 'triageAllPending')
      .addSeparator()
      .addItem('View Triage Statistics', 'showTriageStatistics'))
    
    // === ANALYTICS - Performance insights ===
    .addSubMenu(ui.createMenu('📊 Analytics')
      .addItem('Response Metrics', 'showResponseMetrics')
      .addItem('Marketing Sources', 'showMarketingAnalytics')
      .addItem('Provider Statistics', 'showProviderStatistics')
      .addSeparator()
      .addItem('Generate Full Report', 'generateMasterReport'))
    
    .addSeparator()
    
    // === MAINTENANCE - Rare operations ===
    .addSubMenu(ui.createMenu('🔧 Maintenance')
      .addItem('Normalize All Data', 'quickNormalizeAll')
      .addItem('Validate All Data', 'validateDataQuality')
      .addSeparator()
      .addItem('Sort by Timestamp', 'autoSortByTimestamp')
      .addItem('Backup Data', 'createManualBackup'))
    
    // === SYSTEM - One-time setup ===
    .addSubMenu(ui.createMenu('⚙️ System')
      .addItem('Setup All Triggers', 'setupAllTriggers')
      .addItem('View Trigger Status', 'displayAllTriggers')
      .addSeparator()
      .addItem('Test Gemini Connection', 'testGeminiConnection')
      .addItem('Settings', 'showSettings')
      .addSeparator()
      .addItem('Remove All Triggers', 'deleteAllTriggers'))
    
    .addSeparator()
    .addItem('ℹ️ About', 'showAbout')

  .addToUi();
  
  // Initialize system on first run
  initializeSystem();
}

/**
 * Initializes the system on first run
 * Shows welcome message and creates initial backup
 */
function initializeSystem() {
  const docProps = PropertiesService.getDocumentProperties();
  const initialized = docProps.getProperty('SYSTEM_INITIALIZED');
  
  if (!initialized) {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'Welcome to TKE Referral System v7.0',
      'The system has been initialized.\n\n' +
      'Features:\n' +
      '- Provider normalization (1,500+ mappings)\n' +
      '- Clinic normalization (500+ mappings)\n' +
      '- City/State normalization\n' +
      '- Phone number formatting\n' +
      '- Real-time form submit processing\n' +
      '- Self-referral (Column B) normalization\n' +
      '- AI Triage via Google Gemini Pro 2.0\n' +
      '- Google Chat notifications (real-time)\n' +
      '- Daily/Weekly digest reports\n' +
      '- Response time tracking\n\n' +
      'Use "Referral System" menu to access features.',
      ui.ButtonSet.OK
    );
    
    docProps.setProperty('SYSTEM_INITIALIZED', 'true');
    docProps.setProperty('INSTALL_DATE', new Date().toISOString());
    
    if (CONFIG.AUTO_BACKUP) {
      createBackup('Initial');
    }
  }
}

// ============================================================================
// QUICK OPERATIONS
// ============================================================================

/**
 * Normalizes all data fields with one click
 * Processes: phones, providers, clinics, cities, states
 * Creates a backup first if AUTO_BACKUP is enabled
 */
function quickNormalizeAll() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Quick Normalize All Data',
    'This will normalize:\n' +
    '- Phone numbers\n' +
    '- Referring providers\n' +
    '- Clinic names\n' +
    '- Cities\n' +
    '- States\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    const startTime = new Date();
    const sheet = getMainSheet();
    
    // Create backup first
    if (CONFIG.AUTO_BACKUP) {
      showProgressMessage('Creating backup...');
      createBackup('Pre-Normalization');
    }
    
    const results = {
      phones: { processed: 0, corrected: 0, invalid: 0 },
      providers: { processed: 0, corrected: 0, unknown: 0 },
      clinics: { processed: 0, corrected: 0 },
      cities: { processed: 0, corrected: 0, misspellings: 0 },
      states: { processed: 0, corrected: 0 }
    };
    
    // Normalize phone numbers
    showProgressMessage('Normalizing phone numbers...');
    try {
      results.phones = normalizeAllPhoneNumbers(sheet) || results.phones;
    } catch (e) { console.error('Phone normalization error:', e); }
    
    // Normalize referring providers
    showProgressMessage('Normalizing referring providers...');
    try {
      results.providers = normalizeReferringProviders(sheet) || results.providers;
    } catch (e) { console.error('Provider normalization error:', e); }
    
    // Normalize clinic names
    showProgressMessage('Normalizing clinic names...');
    try {
      results.clinics = normalizeClinicNames(sheet) || results.clinics;
    } catch (e) { console.error('Clinic normalization error:', e); }
    
    // Normalize city names
    showProgressMessage('Normalizing city names...');
    try {
      results.cities = normalizeCityData(sheet) || results.cities;
    } catch (e) { console.error('City normalization error:', e); }
    
    // Normalize state data
    showProgressMessage('Normalizing state data...');
    try {
      results.states = normalizeStateData(sheet) || results.states;
    } catch (e) { console.error('State normalization error:', e); }
    
    // Calculate time
    const endTime = new Date();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    // Show summary
    ui.alert(
      'Normalization Complete',
      'Phones: ' + (results.phones.corrected || 0) + ' corrected\n' +
      'Providers: ' + (results.providers.corrected || 0) + ' corrected\n' +
      'Clinics: ' + (results.clinics.corrected || 0) + ' corrected\n' +
      'Cities: ' + (results.cities.corrected || 0) + ' corrected\n' +
      'States: ' + (results.states.corrected || 0) + ' corrected\n\n' +
      'Total Time: ' + totalTime + ' seconds',
      ui.ButtonSet.OK
    );
    
    // Update timestamp
    PropertiesService.getDocumentProperties()
      .setProperty('LAST_NORMALIZATION', new Date().toISOString());
    
    logOperation('Quick Normalize All', results);
    
  } catch (error) {
    handleError('Normalization Failed', error);
  }
}

/**
 * Validates data quality without making changes
 * Counts issues in providers, phones, cities, and states
 * Renamed from quickFixCommonIssues for clarity
 */
function validateDataQuality() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Validating data quality...');
    
    let issues = {
      providers: { empty: 0, unknown: 0 },
      phones: { invalid: 0 },
      cities: { empty: 0, invalid: 0 },
      states: { empty: 0, invalid: 0 }
    };
    
    // Validate providers
    try {
      const providerStats = validateProviders();
      if (providerStats) {
        issues.providers.empty = providerStats.emptyCount || 0;
        issues.providers.unknown = providerStats.unknownCount || 0;
      }
    } catch (e) { console.error('Provider validation error:', e); }
    
    // Validate phone numbers
    try {
      const phoneStats = validatePhoneNumbers();
      if (phoneStats) {
        issues.phones.invalid = phoneStats.invalid || 0;
      }
    } catch (e) { console.error('Phone validation error:', e); }
    
    const totalIssues = 
      issues.providers.empty + issues.providers.unknown +
      issues.phones.invalid;
    
    ui.alert(
      'Data Quality Report',
      'Provider Issues:\n' +
      '  Empty: ' + issues.providers.empty + '\n' +
      '  Unknown: ' + issues.providers.unknown + '\n\n' +
      'Phone Issues:\n' +
      '  Invalid: ' + issues.phones.invalid + '\n\n' +
      'Total Issues: ' + totalIssues + '\n\n' +
      'Run "Quick Normalize All" to fix these issues.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Validation Failed', error);
  }
}

/**
 * Menu wrapper for phone normalization
 * Calls normalizeAllPhoneNumbers with the main sheet
 */
function normalizeAllPhoneNumbersMenu() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Normalizing phone numbers...');
    const sheet = getMainSheet();
    const results = normalizeAllPhoneNumbers(sheet);
    
    ui.alert(
      'Phone Normalization Complete',
      'Processed: ' + (results.processed || 0) + '\n' +
      'Corrected: ' + (results.corrected || 0) + '\n' +
      'Invalid: ' + (results.invalid || 0),
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Phone Normalization Failed', error);
  }
}

// ============================================================================
// PROVIDER OPERATIONS
// ============================================================================

/**
 * Shows provider statistics in a dialog
 * Displays totals, top providers, and category breakdowns
 */
function showProviderStatistics() {
  try {
    const stats = getProviderStatistics();
    
    if (!stats) {
      SpreadsheetApp.getUi().alert('No data available');
      return;
    }
    
    const message = 
      'Total Entries: ' + stats.totalEntries + '\n' +
      'Unique Providers: ' + stats.uniqueProviders + '\n' +
      'Empty Fields: ' + stats.emptyEntries + '\n' +
      'Unknown Providers: ' + stats.unknownEntries + '\n' +
      'VA Referrals: ' + stats.vaReferrals + '\n' +
      'Self Referrals: ' + stats.selfReferrals + '\n\n' +
      'Top 5 Providers:\n' +
      stats.topProviders.slice(0, 5).map((p, i) => 
        (i + 1) + '. ' + p[0] + ': ' + p[1]
      ).join('\n');
    
    SpreadsheetApp.getUi().alert('Provider Statistics', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    handleError('Statistics Failed', error);
  }
}

/**
 * Generates a provider report in a new sheet
 */
function generateProviderReportOnly() {
  try {
    showProgressMessage('Generating provider report...');
    
    const stats = getProviderStatistics();
    if (stats) {
      generateProviderReport({
        processed: stats.totalEntries,
        corrected: 0,
        unknown: stats.unknownEntries,
        selfReferrals: stats.selfReferrals,
        vaReferrals: stats.vaReferrals,
        series1Count: 0,
        series2Count: 0,
        series3Count: 0,
        providerCounts: stats.providerCounts,
        duplicates: new Map()
      });
      
      SpreadsheetApp.getUi().alert(
        'Report Generated',
        'Check "Provider Normalization Report" sheet.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    
  } catch (error) {
    handleError('Report Generation Failed', error);
  }
}

/**
 * Validates all providers and shows summary
 */
function validateAllProviders() {
  try {
    showProgressMessage('Validating all providers...');
    
    const results = validateProviders();
    
    const message = 
      'Empty fields: ' + results.emptyCount + '\n' +
      'Unknown providers: ' + results.unknownCount + '\n' +
      'Needs standardization: ' + results.needsStandardization + '\n' +
      'Total issues: ' + results.totalIssues;
    
    SpreadsheetApp.getUi().alert('Validation Results', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    handleError('Validation Failed', error);
  }
}

// ============================================================================
// CITY OPERATIONS
// ============================================================================

/**
 * Normalizes city data and shows results
 * Wrapper for the main normalizeCityData function
 */
function normalizeCityDataOnly() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Normalizing city names...');
    
    const sheet = getMainSheet();
    const results = normalizeCityData(sheet);
    
    ui.alert(
      'City Normalization Complete',
      'Processed: ' + results.processed + '\n' +
      'Corrected: ' + results.corrected + '\n' +
      'Misspellings Fixed: ' + results.misspellings + '\n' +
      'Invalid Entries: ' + results.invalid,
      ui.ButtonSet.OK
    );
    
    logOperation('City Normalization', results);
    
  } catch (error) {
    handleError('City Normalization Failed', error);
  }
}

/**
 * Shows city statistics in a dialog
 */
function showCityStatistics() {
  try {
    const stats = getCityStatistics();
    
    if (!stats) {
      SpreadsheetApp.getUi().alert('No data available');
      return;
    }
    
    let message = 'Total Entries: ' + stats.totalEntries + '\n';
    message += 'Unique Cities: ' + stats.uniqueCities + '\n';
    message += 'Empty Entries: ' + stats.emptyEntries + '\n\n';
    message += 'Top 10 Cities:\n';
    
    stats.topCities.slice(0, 10).forEach(([city, count]) => {
      const percent = ((count / stats.totalEntries) * 100).toFixed(1);
      message += '  ' + city + ': ' + count + ' (' + percent + '%)\n';
    });
    
    SpreadsheetApp.getUi().alert('City Statistics', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    handleError('City Statistics Failed', error);
  }
}

// ============================================================================
// COMBINED OPERATIONS
// ============================================================================

/**
 * Normalizes providers and clinics together
 */
function normalizeProvidersAndClinics() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Normalizing providers and clinics...');
    
    const sheet = getMainSheet();
    
    const providerResults = normalizeReferringProviders(sheet);
    const clinicResults = normalizeClinicNames(sheet);
    
    ui.alert(
      'Providers & Clinics Normalized',
      'Providers:\n' +
      '  Processed: ' + providerResults.processed + '\n' +
      '  Corrected: ' + providerResults.corrected + '\n\n' +
      'Clinics:\n' +
      '  Processed: ' + clinicResults.processed + '\n' +
      '  Corrected: ' + clinicResults.corrected,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Normalization Failed', error);
  }
}

/**
 * Normalizes cities and states together
 * Replaces the old normalizeAllLocationData which called missing functions
 */
function normalizeCitiesAndStates() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Normalizing cities and states...');
    
    const sheet = getMainSheet();
    
    const cityResults = normalizeCityData(sheet);
    const stateResults = normalizeStateData(sheet);
    
    ui.alert(
      'Cities & States Normalized',
      'Cities:\n' +
      '  Processed: ' + cityResults.processed + '\n' +
      '  Corrected: ' + cityResults.corrected + '\n' +
      '  Misspellings: ' + cityResults.misspellings + '\n\n' +
      'States:\n' +
      '  Processed: ' + stateResults.processed + '\n' +
      '  Corrected: ' + stateResults.corrected,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Normalization Failed', error);
  }
}

/**
 * Validates all fields without making changes
 */
function validateAllFields() {
  const ui = SpreadsheetApp.getUi();
  
  showProgressMessage('Validating all fields...');
  
  let summary = 'Validation Results:\n\n';
  
  try {
    const phoneResults = validatePhoneNumbers();
    summary += 'Phones: ' + (phoneResults.invalid || 0) + ' invalid\n';
  } catch (e) { summary += 'Phones: Error\n'; }
  
  try {
    const providerResults = validateProviders();
    summary += 'Providers: ' + (providerResults.totalIssues || 0) + ' issues\n';
  } catch (e) { summary += 'Providers: Error\n'; }
  
  try {
    const cityResults = validateCityEntries();
    summary += 'Cities: ' + (cityResults.totalIssues || 0) + ' issues\n';
  } catch (e) { summary += 'Cities: Error\n'; }
  
  try {
    const stateResults = validateStateEntries();
    summary += 'States: ' + (stateResults.totalIssues || 0) + ' issues\n';
  } catch (e) { summary += 'States: Error\n'; }
  
  ui.alert('Validation Complete', summary, ui.ButtonSet.OK);
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Generates a master report combining all statistics
 * Creates reports for: Providers, Clinics, Cities, States
 */
function generateMasterReport() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Generating reports...');
    
    const sheet = getMainSheet();
    let reportsGenerated = [];
    
    // Generate Provider Report
    showProgressMessage('Generating provider report...');
    try {
      const providerStats = getProviderStatistics();
      if (providerStats) {
        generateProviderReport({
          processed: providerStats.totalEntries,
          corrected: 0,
          unknown: providerStats.unknownEntries,
          selfReferrals: providerStats.selfReferrals,
          vaReferrals: providerStats.vaReferrals,
          series1Count: 0,
          series2Count: 0,
          series3Count: 0,
          providerCounts: providerStats.providerCounts || new Map(),
          duplicates: new Map()
        });
        reportsGenerated.push('Provider Normalization Report');
      }
    } catch (e) { console.error('Provider report error:', e); }
    
    // Generate City Report
    showProgressMessage('Generating city report...');
    try {
      const cityStats = getCityStatistics();
      if (cityStats) {
        generateCityReport({
          processed: cityStats.totalEntries,
          corrected: 0,
          invalid: cityStats.invalidEntries || 0,
          misspellings: 0,
          cityCounts: cityStats.cityCounts || new Map(),
          invalidEntries: []
        });
        reportsGenerated.push('City Normalization Report');
      }
    } catch (e) { console.error('City report error:', e); }
    
    // Generate State Report
    showProgressMessage('Generating state report...');
    try {
      const stateStats = getStateStatistics();
      if (stateStats) {
        generateStateReport({
          processed: stateStats.totalEntries,
          corrected: 0,
          invalid: stateStats.invalidEntries || 0,
          outOfRegion: stateStats.outOfRegion || 0,
          stateCounts: stateStats.stateCounts || new Map(),
          invalidEntries: []
        });
        reportsGenerated.push('State Normalization Report');
      }
    } catch (e) { console.error('State report error:', e); }
    
    // Generate Clinic Report
    showProgressMessage('Generating clinic report...');
    try {
      const clinicStats = getClinicStatistics();
      if (clinicStats) {
        generateClinicReport({
          processed: clinicStats.totalEntries,
          corrected: 0,
          selfReferrals: clinicStats.selfReferrals || 0,
          government: clinicStats.government || 0,
          unknown: clinicStats.unknown || 0,
          duplicates: new Map()
        });
        reportsGenerated.push('Clinic Normalization Report');
      }
    } catch (e) { console.error('Clinic report error:', e); }
    
    // Show summary
    if (reportsGenerated.length > 0) {
      ui.alert(
        'Reports Generated',
        'Created ' + reportsGenerated.length + ' report(s):\n\n' +
        reportsGenerated.map(r => '- ' + r).join('\n'),
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('No Reports', 'No reports could be generated.', ui.ButtonSet.OK);
    }
    
  } catch (error) {
    handleError('Report Generation Failed', error);
  }
}

/**
 * Shows normalization summary in a modal dialog
 */
function showNormalizationSummary() {
  const docProps = PropertiesService.getDocumentProperties();
  const lastNorm = docProps.getProperty('LAST_NORMALIZATION') || 'Never';
  const lastAuto = docProps.getProperty('LAST_AUTO_PROCESSING') || 'Never';
  
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Normalization Summary</h2>
      
      <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px;">
        <h3 style="margin-top: 0;">Last Run Times</h3>
        <p><strong>Full Normalization:</strong> ${lastNorm}</p>
        <p><strong>Automatic Processing:</strong> ${lastAuto}</p>
      </div>
      
      <div style="background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 4px;">
        <h3 style="margin-top: 0;">Available Normalizations</h3>
        <ul>
          <li>Phone Numbers: (XXX) XXX-XXXX format</li>
          <li>Providers: 1,500+ known mappings</li>
          <li>Clinics: 500+ known mappings</li>
          <li>Cities: Tennessee city corrections</li>
          <li>States: Full name from abbreviations</li>
        </ul>
      </div>
      
      <div style="background: #fff3e0; padding: 15px; margin: 10px 0; border-radius: 4px;">
        <h3 style="margin-top: 0;">Color Guide</h3>
        <p><span style="background: #E6F3FF; padding: 2px 8px;">Blue</span> - Normalized</p>
        <p><span style="background: #E8F5E9; padding: 2px 8px;">Green</span> - VA/Government</p>
        <p><span style="background: #FFF3CD; padding: 2px 8px;">Yellow</span> - Self-Referral</p>
        <p><span style="background: #FFE6E6; padding: 2px 8px;">Red</span> - Unknown/Invalid</p>
      </div>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        TKE Referral System v${CONFIG.VERSION}
      </p>
    </div>
  `)
  .setWidth(450)
  .setHeight(550);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Normalization Summary');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the main data sheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The main sheet
 * @throws {Error} If sheet not found
 */
function getMainSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" not found');
  }
  
  return sheet;
}

/**
 * Shows a progress toast message
 * @param {string} message - Message to display
 */
function showProgressMessage(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Processing', -1);
}

/**
 * Handles errors consistently with user feedback
 * @param {string} title - Error title
 * @param {Error} error - Error object
 */
function handleError(title, error) {
  console.error(title + ':', error);
  
  SpreadsheetApp.getUi().alert(
    title,
    'An error occurred:\n\n' + error.message + '\n\n' +
    'Check the logs for details.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
}

/**
 * Logs an operation for audit purposes
 * @param {string} operation - Operation name
 * @param {Object} details - Operation details
 */
function logOperation(operation, details) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation: operation,
      user: Session.getActiveUser().getEmail(),
      details: details
    };
    
    console.log('Operation:', JSON.stringify(logEntry));
    
  } catch (error) {
    console.error('Logging failed:', error);
  }
}

/**
 * Creates a backup of the main sheet
 * @param {string} description - Backup description
 * @returns {string} Backup sheet name
 */
function createBackup(description) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    const backupName = 'Backup_' + description + '_' + timestamp;
    
    // Create backup
    sheet.copyTo(ss).setName(backupName);
    console.log('Backup created: ' + backupName);
    
    // Clean up old backups (keep last 10)
    const sheets = ss.getSheets();
    const backups = sheets.filter(s => s.getName().startsWith('Backup_'))
                          .sort((a, b) => b.getName().localeCompare(a.getName()));
    
    if (backups.length > 10) {
      backups.slice(10).forEach(oldBackup => {
        ss.deleteSheet(oldBackup);
      });
    }
    
    return backupName;
    
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

/**
 * Creates a manual backup with user-provided description
 */
function createManualBackup() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt(
    'Create Backup',
    'Enter backup description (optional):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    try {
      showProgressMessage('Creating backup...');
      
      const description = response.getResponseText() || 'Manual';
      const backupName = createBackup(description);
      
      ui.alert('Backup Created', 'Saved as: ' + backupName, ui.ButtonSet.OK);
      
    } catch (error) {
      handleError('Backup Failed', error);
    }
  }
}

// ============================================================================
// SETTINGS & ABOUT
// ============================================================================

/**
 * Shows system settings dialog
 */
function showSettings() {
  const docProps = PropertiesService.getDocumentProperties();
  
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>System Settings</h2>
      
      <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 4px;">
        <h3 style="margin-top: 0;">Configuration</h3>
        <p><strong>Version:</strong> ${CONFIG.VERSION}</p>
        <p><strong>Sheet Name:</strong> ${CONFIG.SHEET_NAME}</p>
        <p><strong>Timezone:</strong> ${CONFIG.TIMEZONE}</p>
        <p><strong>Auto Backup:</strong> ${CONFIG.AUTO_BACKUP ? 'Enabled' : 'Disabled'}</p>
        <p><strong>Batch Size:</strong> ${CONFIG.BATCH_SIZE} rows</p>
      </div>
      
      <div style="background: #e8f5e9; padding: 15px; margin: 10px 0; border-radius: 4px;">
        <h3 style="margin-top: 0;">Status</h3>
        <p><strong>Install Date:</strong> ${docProps.getProperty('INSTALL_DATE') || 'Unknown'}</p>
        <p><strong>Last Normalization:</strong> ${docProps.getProperty('LAST_NORMALIZATION') || 'Never'}</p>
      </div>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Edit CONFIG object in Code.js to modify settings.
      </p>
    </div>
  `)
  .setWidth(400)
  .setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}

/**
 * Shows about dialog with system information
 */
function showAbout() {
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>TKE Referral Management System</h2>
      <p><strong>Version:</strong> ${CONFIG.VERSION}</p>
      <hr>
      
      <h3>Features</h3>
      <ul>
        <li>Provider normalization (1,500+ mappings)</li>
        <li>Clinic normalization (500+ mappings)</li>
        <li>City/State normalization</li>
        <li>Phone number formatting</li>
        <li>Real-time form processing</li>
        <li>Self-referral (TRUE/FALSE to Yes/No)</li>
        <li>Auto-sorting every 4 hours</li>
        <li>Automatic backups</li>
      </ul>
      
      <h3>AI Triage (NEW)</h3>
      <ul>
        <li>Powered by Google Gemini Pro 2.0</li>
        <li>Automatic priority assignment (1-5)</li>
        <li>Clinical reasoning explanation</li>
        <li>Real-time on form submission</li>
      </ul>
      
      <h3>Priority Levels</h3>
      <ul style="font-size: 11px;">
        <li><span style="background:#FF0000;color:white;padding:1px 4px;">1-EMERGENT</span> GFR &lt;15, Dialysis</li>
        <li><span style="background:#FF6B00;color:white;padding:1px 4px;">2-URGENT</span> GFR 15-29, Stage 4</li>
        <li><span style="background:#FFD700;padding:1px 4px;">3-SOON</span> GFR 30-44, Stage 3b</li>
        <li><span style="background:#90EE90;padding:1px 4px;">4-ROUTINE</span> GFR 45-59, Stable</li>
        <li><span style="background:#E0E0E0;padding:1px 4px;">5-LOW</span> GFR &gt;60, Monitoring</li>
      </ul>
      
      <h3>Data Sources</h3>
      <ul>
        <li>Google Forms</li>
        <li>AppSheet mobile app</li>
      </ul>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px;">
        The Kidney Experts, PLLC<br>
        West Tennessee
      </p>
    </div>
  `)
  .setWidth(420)
  .setHeight(580);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'About');
}
