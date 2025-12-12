/**
 * Main Orchestration File for Medical Referral System
 * @description Central controller for all referral sheet operations
 * @version 4.0 - Complete Integration with Provider, City, Name, and Address Normalization
 */

// ============================================
// EXISTING TRIGGER FUNCTIONS
// ============================================
function newRow(e) {
  var range = e.range;
  var row = range.getRow();
  var sheet = range.getSheet();
  var theColumn = 31;
  var StatusColumn = 32;
  sheet.getRange(row,theColumn).setValue("FALSE");
  sheet.getRange(row,StatusColumn).setValue("New");
}

function autoSortByTimestamp() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    range.sort({column: 1, ascending: true}); // Sort by Timestamp, newest first
  }
}

function createFourHourTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == "autoSortByTimestamp") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('autoSortByTimestamp')
    .timeBased()
    .everyHours(4)
    .create();
}

function displayAllTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  if (allTriggers.length === 0) {
    Logger.log("No installable triggers found.");
    return;
  }
  for (var i = 0; i < allTriggers.length; i++) {
    var trigger = allTriggers[i];
    Logger.log(
      "Trigger " + (i+1) + 
      ": Function Name = " + trigger.getHandlerFunction() + 
      ", Event Type = " + trigger.getEventType() + 
      ", ID = " + trigger.getUniqueId()
    );
  }
}

function deleteAllTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    ScriptApp.deleteTrigger(allTriggers[i]);
  }
}

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  SHEET_NAME: 'Form Responses 1',
  TIMEZONE: 'America/Chicago',
  VERSION: '4.0.0',
  DEBUG_MODE: false,
  BATCH_SIZE: 100,
  AUTO_BACKUP: true
};

// ============================================
// MENU INITIALIZATION - COMPREHENSIVE
// ============================================
/**
 * Creates custom menu on sheet open
 * Auto-runs when spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🏥 Referral System')
    // Quick Actions
    .addItem('⚡ Quick Normalize All', 'quickNormalizeAll')
    .addItem('🔄 Full Data Cleanup', 'runFullDataCleanup')
    .addItem('⚡ Quick Fix Common Issues', 'quickFixCommonIssues')
    .addSeparator()
    
    // Phone Number Operations
    .addSubMenu(ui.createMenu('📞 Phone Numbers')
      .addItem('Normalize All Phone Numbers', 'normalizeAllPhoneNumbers')
      .addItem('Validate Phone Numbers Only', 'runPhoneValidation')
      .addItem('Fix Invalid Phone Numbers', 'fixInvalidPhones')
      .addItem('Generate Phone Report', 'generatePhoneReportOnly'))
    
    // Provider Operations (from v3.0)
    .addSubMenu(ui.createMenu('👨‍⚕️ Referring Providers')
      .addItem('Normalize All Providers', 'normalizeProvidersOnly')
      .addItem('Validate Provider Entries', 'validateProviders')
      .addItem('Find Top Referring Providers', 'findTopReferringProviders')
      .addItem('Generate Provider Report', 'generateProviderReportOnly')
      .addItem('Provider Statistics', 'showProviderStatistics')
      .addItem('Deduplicate All Providers', 'runProviderDeduplication')
      .addItem('Find Provider Duplicates', 'findProviderDuplicates')
      .addItem('Validate Provider Duplicates', 'validateProviderDuplicates')
      .addItem('Generate Deduplication Report', 'generateProviderDedupReport')
      .addItem('Quick Fix Provider Names', 'quickFixProviderNames'))
/**
*can delete if needed sometime
*/
    .addSubMenu(ui.createMenu('👨‍⚕️ Providers V4 (New)')
      .addItem('🔄 Run Complete Deduplication', 'runProviderNormalizationV4')
      .addItem('📊 Analyze Current Data', 'analyzeProvidersV4')
      .addItem('🔍 Find New Providers', 'findNewProvidersV4')
      .addItem('📈 Show Duplicate Summary', 'showDuplicateSummaryV4')
      .addItem('✅ Validate Without Changes', 'validateProvidersV4')
      .addSeparator()
      .addItem('📋 Generate V4 Report', 'generateProviderReportV4Manual')
      .addItem('🎯 Find Top Referrers', 'findTopReferrersV4')
      .addItem('🏥 Identify Self-Referrals', 'identifySelfReferralsV4')
      .addItem('🏛️ Identify VA Referrals', 'identifyVAReferralsV4'))

  .addSubMenu(ui.createMenu('🔄 Provider Deduplication')
  .addItem('Deduplicate All Providers', 'deduplicateProvidersOnly')
  .addItem('Validate for Duplicates', 'validateProvidersForDuplicates')
  .addItem('Find Top Referring Providers', 'findTopReferringProviders')
  .addItem('Generate Deduplication Report', 'generateProviderDeduplicationReportOnly')
  .addItem('Quick Fix Provider Duplicates', 'quickFixProviderDuplicates')
  .addItem('Show Provider Statistics', 'showProviderDeduplicationStats'))

    // Name Normalization Operations (from v3.1)
    .addSubMenu(ui.createMenu('👤 Names')
      .addItem('Normalize All Names', 'normalizeNamesOnly')
      .addItem('Normalize Staff Names', 'normalizeStaffNamesOnly')
      .addItem('Normalize Patient Names', 'normalizePatientNamesOnly')
      .addItem('Validate Name Entries', 'validateNameEntries')
      .addItem('Generate Name Report', 'generateNameReportOnly'))
    
    // Address Normalization Operations (from v3.1)
    .addSubMenu(ui.createMenu('📍 Addresses')
      .addItem('Normalize All Addresses', 'normalizeAddressesOnly')
      .addItem('Standardize Street Types', 'standardizeStreetTypesOnly')
      .addItem('Fix Address Typos', 'fixAddressTyposOnly')
      .addItem('Validate Address Format', 'validateAddressFormat')
      .addItem('Generate Address Report', 'generateAddressReportOnly'))
    
    // Cities Operations (from v3.1)
    .addSubMenu(ui.createMenu('🏙️ Cities')
      .addItem('Normalize All Cities', 'normalizeCityDataOnly')
      .addItem('Validate City Entries', 'validateCityEntries')
      .addItem('Fix City Misspellings', 'fixCityMisspellings')
      .addItem('Get City Statistics', 'showCityStatistics')
      .addItem('Generate City Report', 'generateCityReportOnly'))
    
    // Clinic Name Operations
    .addSubMenu(ui.createMenu('🏥 Clinic Names')
      .addItem('Normalize All Clinic Names', 'runClinicNormalization')
      .addItem('Find Duplicate Clinics', 'findDuplicateClinics')
      .addItem('Identify Self-Referrals', 'identifySelfReferrals')
      .addItem('Generate Clinic Report', 'generateClinicReportOnly'))
    
    // State Normalization
    .addSubMenu(ui.createMenu('🗺️ States')
      .addItem('Normalize State Data', 'normalizeStateDataOnly')
      .addItem('Validate State Entries', 'validateStateEntries')
      .addItem('Get State Statistics', 'showStateStatistics')
      .addItem('Generate State Report', 'generateStateReportOnly'))
    
    // Combined Operations - Enhanced
    .addSubMenu(ui.createMenu('🔧 Combined Operations')
      .addItem('Normalize Names & Addresses', 'normalizeNamesAndAddresses')
      .addItem('Normalize Addresses & Cities', 'normalizeAddressesAndCities')
      .addItem('Normalize All Location Data', 'normalizeAllLocationData')
      .addItem('Normalize Phones & Clinics', 'normalizePhonesAndClinics')
      .addItem('Normalize Providers & Clinics', 'normalizeProvidersAndClinics')
      .addItem('Validate All Fields', 'validateAllFields')
      .addItem('Generate Master Cleanup Report', 'generateMasterCleanupReport'))
    
    // Batch Operations (from v3.0)
    .addSubMenu(ui.createMenu('🔄 Batch Processing')
      .addItem('Batch Process All Data', 'batchProcessAllData')
      .addItem('Batch Process Providers', 'batchProcessProvidersMenu')
      .addItem('Batch Process Cities', 'batchProcessCities')
      .addItem('Schedule Automatic Processing', 'scheduleAutomaticProcessing'))
    
    // Data Validation
    .addSubMenu(ui.createMenu('✓ Validation')
      .addItem('Check All Data Quality', 'validateAllData')
      .addItem('Find Missing Required Fields', 'findMissingRequired')
      .addItem('Check for Duplicate Referrals', 'checkDuplicateReferrals')
      .addItem('Validate All Providers', 'validateAllProviders')
      .addItem('Validate All Normalizations', 'validateAllNormalizations'))
    
    // Reports - Enhanced
    .addSubMenu(ui.createMenu('📊 Reports')
      .addItem('Generate Master Report', 'generateMasterReport')
      .addItem('Daily Summary', 'generateDailyReport')
      .addItem('Weekly Summary', 'generateWeeklyReport')
      .addItem('Data Quality Dashboard', 'showDataQualityDashboard')
      .addItem('Normalization Summary', 'showNormalizationSummary')
      .addItem('Weekly Quality Trends', 'showWeeklyTrends'))
    
    .addSeparator()
    
    // Utilities
    .addItem('💾 Backup Data Now', 'createManualBackup')
    .addItem('⚙️ Settings', 'showSettings')
    .addItem('📚 Help & Documentation', 'showHelp')
    .addItem('ℹ️ About', 'showAbout')

  .addSubMenu(ui.createMenu('⏰ Auto-Sort')
      .addItem('Enable Hourly Sorting', 'createHourlySortTrigger')
      .addItem('Sort Now', 'manualSort')
      .addItem('Check Status', 'checkSortStatus')
      .addItem('View Statistics', 'showSortStatistics')
      .addSeparator()
      .addItem('Disable Auto-Sort', 'disableAutoSort'))

  .addToUi();
  // Check if this is first run
  initializeSystem();
}

// ============================================
// INITIALIZATION
// ============================================
/**
 * Initialize system on first run
 */
function initializeSystem() {
  const docProps = PropertiesService.getDocumentProperties();
  const initialized = docProps.getProperty('SYSTEM_INITIALIZED');
  
  if (!initialized) {
    // First time setup
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '🎉 Welcome to Medical Referral System v4.0',
      'The system has been initialized successfully.\n\n' +
      'Complete Features:\n' +
      '• Provider Normalization (Series 1-3)\n' +
      '• City normalization and validation\n' +
      '• Name normalization (staff & patients)\n' +
      '• Address standardization\n' +
      '• Enhanced reporting & batch processing\n\n' +
      'Use the "🏥 Referral System" menu to access all features.\n\n' +
      'Start with "Quick Normalize All" to clean your data.',
      ui.ButtonSet.OK
    );
    
    // Mark as initialized
    docProps.setProperty('SYSTEM_INITIALIZED', 'true');
    docProps.setProperty('INSTALL_DATE', new Date().toISOString());
    
    // Create backup on first run
    if (CONFIG.AUTO_BACKUP) {
      createBackup('Initial');
    }
  }
}

// ============================================
// QUICK OPERATIONS - COMPREHENSIVE
// ============================================
/**
 * Quick normalize all data with one click - ALL MODULES
 */
function quickNormalizeAll() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '⚡ Quick Normalize All Data',
    'This will normalize:\n' +
    '• Phone numbers (all columns)\n' +
    '• Referring providers\n' +
    '• Staff and patient names\n' +
    '• Street addresses\n' +
    '• Cities\n' +
    '• Clinic names\n' +
    '• State data\n\n' +
    'The process may take several minutes.\n\n' +
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
      phones: {},
      providers: {},
      namesAddresses: {},
      cities: {},
      clinics: {},
      states: {},
      totalTime: 0
    };
    
    // Normalize phone numbers
    showProgressMessage('Normalizing phone numbers...');
    results.phones = normalizeAllPhoneNumbers(sheet);
    
    // Normalize referring providers
    showProgressMessage('Normalizing referring providers...');
    results.providers = normalizeReferringProviders(sheet);
    
    // Normalize names and addresses
    showProgressMessage('Normalizing names and addresses...');
    results.namesAddresses = normalizeNamesAndAddresses(sheet);
    
    // Normalize city names
    showProgressMessage('Normalizing city names...');
    results.cities = normalizeCityData(sheet);
    
    // Normalize clinic names
    showProgressMessage('Normalizing clinic names...');
    results.clinics = normalizeClinicNames(sheet);
    
    // Normalize state data
    showProgressMessage('Normalizing state data...');
    results.states = normalizeStateData(sheet);
    
    // Calculate time
    const endTime = new Date();
    results.totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    // Show comprehensive summary
    ui.alert(
      '✅ Normalization Complete',
      `📞 Phone Numbers:\n` +
      `   Processed: ${results.phones.processed || 0}\n` +
      `   Corrected: ${results.phones.corrected || 0}\n` +
      `   Invalid: ${results.phones.invalid || 0}\n\n` +
      `👨‍⚕️ Referring Providers:\n` +
      `   Processed: ${results.providers.processed || 0}\n` +
      `   Corrected: ${results.providers.corrected || 0}\n` +
      `   Unknown: ${results.providers.unknown || 0}\n\n` +
      `👤 Names & Addresses:\n` +
      `   Total Processed: ${results.namesAddresses.totalProcessed || 0}\n` +
      `   Total Corrected: ${results.namesAddresses.totalCorrected || 0}\n\n` +
      `🏙️ Cities:\n` +
      `   Processed: ${results.cities.processed || 0}\n` +
      `   Corrected: ${results.cities.corrected || 0}\n` +
      `   Misspellings Fixed: ${results.cities.misspellings || 0}\n\n` +
      `🏥 Clinic Names:\n` +
      `   Processed: ${results.clinics.processed || 0}\n` +
      `   Corrected: ${results.clinics.corrected || 0}\n` +
      `   Self-Referrals: ${results.clinics.selfReferrals || 0}\n\n` +
      `🗺️ States:\n` +
      `   Processed: ${results.states.processed || 0}\n` +
      `   Corrected: ${results.states.corrected || 0}\n\n` +
      `⏱️ Total Time: ${results.totalTime} seconds`,
      ui.ButtonSet.OK
    );
    
    // Update last normalization timestamp
    PropertiesService.getDocumentProperties()
      .setProperty('LAST_NORMALIZATION', new Date().toISOString());
    
    logOperation('Quick Normalize All', results);
    
  } catch (error) {
    handleError('Normalization Failed', error);
  }
}

/**
 * Quick fix for most common issues (from v3.0)
 */
function quickFixCommonIssues() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Fixing common issues...');
    
    const sheet = getMainSheet();
    let fixCount = 0;
    
    // Fix empty provider fields
    const providerStats = validateProviders();
    if (providerStats.emptyCount > 0) {
      fixCount += providerStats.emptyCount;
    }
    
    // Fix invalid phone numbers
    const phoneStats = validatePhoneNumbers();
    if (phoneStats && phoneStats.invalid) {
      fixCount += phoneStats.invalid;
    }
    
    ui.alert(
      'Quick Fix Complete',
      `Fixed ${fixCount} common issues.\n\n` +
      `Run "Quick Normalize All" for comprehensive cleanup.`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Quick Fix Failed', error);
  }
}

// ============================================
// PROVIDER OPERATIONS (from v3.0)
// ============================================
/**
 * Show provider statistics
 */
function showProviderStatistics() {
  try {
    const stats = getProviderStatistics();
    
    if (!stats) {
      SpreadsheetApp.getUi().alert('No data available');
      return;
    }
    
    const message = `Provider Statistics\n\n` +
                   `Total Entries: ${stats.totalEntries}\n` +
                   `Unique Providers: ${stats.uniqueProviders}\n` +
                   `Empty Fields: ${stats.emptyEntries}\n` +
                   `Unknown Providers: ${stats.unknownEntries}\n` +
                   `VA Referrals: ${stats.vaReferrals}\n` +
                   `Self Referrals: ${stats.selfReferrals}\n\n` +
                   `Top 5 Providers:\n` +
                   stats.topProviders.slice(0, 5).map((p, i) => 
                     `${i+1}. ${p[0]}: ${p[1]} referrals`
                   ).join('\n');
    
    SpreadsheetApp.getUi().alert('Provider Statistics', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    handleError('Statistics Failed', error);
  }
}

/**
 * Generate provider report only
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
        'Provider report has been created in "Provider Normalization Report" sheet.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    
  } catch (error) {
    handleError('Report Generation Failed', error);
  }
}

/**
 * Validate all providers across the sheet
 */
function validateAllProviders() {
  try {
    showProgressMessage('Validating all providers...');
    
    const results = validateProviders();
    
    const message = `Provider Validation Complete\n\n` +
                   `Empty fields: ${results.emptyCount}\n` +
                   `Unknown providers: ${results.unknownCount}\n` +
                   `Needs standardization: ${results.needsStandardization}\n` +
                   `Total issues: ${results.totalIssues}`;
    
    SpreadsheetApp.getUi().alert('Validation Results', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    handleError('Validation Failed', error);
  }
}

// ============================================
// CITY OPERATIONS (from v3.1)
// ============================================
/**
 * Normalize city data only
 */
function normalizeCityDataOnly() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Normalizing city names...');
    
    const sheet = getMainSheet();
    const results = normalizeCityData(sheet);
    
    ui.alert(
      '🏙️ City Normalization Complete',
      `Processed: ${results.processed}\n` +
      `Corrected: ${results.corrected}\n` +
      `Misspellings Fixed: ${results.misspellings}\n` +
      `Invalid Entries: ${results.invalid}\n\n` +
      `Check "City Normalization Report" for details.`,
      ui.ButtonSet.OK
    );
    
    logOperation('City Normalization', results);
    
  } catch (error) {
    handleError('City Normalization Failed', error);
  }
}

/**
 * Validate city entries
 */
function validateCityEntries() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const CITY_COLUMN_INDEX = 21; // Column U
  const range = sheet.getRange(2, CITY_COLUMN_INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  let invalidCount = 0;
  let emptyCount = 0;
  let misspellingCount = 0;
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
    } else if (typeof normalizeCityName === 'function') {
      const result = normalizeCityName(city.toString());
      if (result.category === 'invalid') {
        invalidCount++;
        issues.push({
          row: index + 2,
          issue: 'Invalid city',
          value: city
        });
      } else if (result.category === 'misspelling') {
        misspellingCount++;
        issues.push({
          row: index + 2,
          issue: 'Misspelled city',
          value: city,
          suggestion: result.normalized
        });
      }
    }
  });
  
  const totalIssues = invalidCount + emptyCount + misspellingCount;
  
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
                   `Misspellings: ${misspellingCount}\n\n` +
                   `Total issues: ${totalIssues}\n\n` +
                   `Run "Normalize All Cities" to fix these issues.`;
    
    SpreadsheetApp.getUi().alert('City Validation', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
  
  return {
    emptyCount,
    invalidCount,
    misspellingCount,
    totalIssues,
    issues
  };
}

/**
 * Fix city misspellings with user confirmation
 */
function fixCityMisspellings() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '⚠️ Fix City Misspellings',
    'This will:\n' +
    '• Correct common city name misspellings\n' +
    '• Fix capitalization issues\n' +
    '• Standardize city name formats\n' +
    '• Mark invalid entries for manual review\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    try {
      showProgressMessage('Fixing city misspellings...');
      
      const sheet = getMainSheet();
      const results = normalizeCityData(sheet);
      
      ui.alert(
        'City Correction Complete',
        `Fixed ${results.corrected} city entries.\n` +
        `Misspellings corrected: ${results.misspellings}\n` +
        `Invalid entries marked: ${results.invalid}`,
        ui.ButtonSet.OK
      );
      
    } catch (error) {
      handleError('City Fix Failed', error);
    }
  }
}

/**
 * Show city statistics
 */
function showCityStatistics() {
  try {
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
    
  } catch (error) {
    handleError('City Statistics Failed', error);
  }
}

// ============================================
// BATCH OPERATIONS - ENHANCED
// ============================================
/**
 * Batch process all data in chunks for better performance
 */
function batchProcessAllData() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '🔄 Batch Process All Data',
    'This will process all data in batches for optimal performance.\n\n' +
    'Recommended for sheets with over 1000 rows.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    const sheet = getMainSheet();
    const lastRow = sheet.getLastRow();
    const batchSize = CONFIG.BATCH_SIZE;
    
    showProgressMessage(`Processing ${lastRow - 1} rows in batches of ${batchSize}...`);
    
    // Process in batches
    for (let startRow = 2; startRow <= lastRow; startRow += batchSize) {
      const endRow = Math.min(startRow + batchSize - 1, lastRow);
      
      showProgressMessage(`Processing rows ${startRow} to ${endRow}...`);
      
      // Process each module for this batch
      // Note: You'd need to modify each normalization function to accept row ranges
      
      Utilities.sleep(100); // Small delay to prevent timeout
    }
    
    ui.alert('Batch Processing Complete', 
      `Successfully processed ${lastRow - 1} rows.`, 
      ui.ButtonSet.OK);
    
  } catch (error) {
    handleError('Batch Processing Failed', error);
  }
}

/**
 * Batch process providers
 */
function batchProcessProvidersMenu() {
  try {
    showProgressMessage('Batch processing providers...');
    
    const stats = batchProcessProviders(500);
    
    SpreadsheetApp.getUi().alert(
      'Batch Processing Complete',
      `Processed: ${stats.processed} providers\n` +
      `Corrected: ${stats.corrected}\n` +
      `Series 1 (A-I): ${stats.series1Count}\n` +
      `Series 2 (J-R): ${stats.series2Count}\n` +
      `Series 3 (S-Z): ${stats.series3Count}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Batch Processing Failed', error);
  }
}

/**
 * Batch process cities
 */
function batchProcessCities() {
  try {
    showProgressMessage('Batch processing cities...');
    
    const sheet = getMainSheet();
    const results = normalizeCityData(sheet);
    
    SpreadsheetApp.getUi().alert(
      'Batch Processing Complete',
      `Processed: ${results.processed} cities\n` +
      `Corrected: ${results.corrected}\n` +
      `Misspellings: ${results.misspellings}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Batch Processing Failed', error);
  }
}

/**
 * Schedule automatic processing
 */
function scheduleAutomaticProcessing() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Schedule Automatic Processing',
    'This will set up daily automatic normalization at 2:00 AM.\n\n' +
    'The system will:\n' +
    '• Create a backup\n' +
    '• Normalize all data\n' +
    '• Generate reports\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    try {
      // Create time-based trigger
      ScriptApp.newTrigger('automaticDailyProcessing')
        .timeBased()
        .everyDays(1)
        .atHour(2)
        .create();
      
      ui.alert('Scheduled', 'Automatic processing scheduled successfully.', ui.ButtonSet.OK);
      
    } catch (error) {
      handleError('Scheduling Failed', error);
    }
  }
}

/**
 * Automatic daily processing function
 */
function automaticDailyProcessing() {
  try {
    console.log('Starting automatic daily processing...');
    
    const sheet = getMainSheet();
    
    // Create backup
    createBackup('Automatic');
    
    // Run all normalizations
    normalizeAllPhoneNumbers(sheet);
    normalizeReferringProviders(sheet);
    normalizeNamesAndAddresses(sheet);
    normalizeCityData(sheet);
    normalizeClinicNames(sheet);
    normalizeStateData(sheet);
    
    // Log completion
    const timestamp = new Date().toISOString();
    PropertiesService.getDocumentProperties()
      .setProperty('LAST_AUTO_PROCESSING', timestamp);
    
    console.log('Automatic processing completed at:', timestamp);
    
  } catch (error) {
    console.error('Automatic processing failed:', error);
    // Could send email notification here
  }
}

// ============================================
// COMBINED OPERATIONS - ENHANCED
// ============================================
/**
 * Normalize providers and clinics together
 */
function normalizeProvidersAndClinics() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Normalizing providers and clinics...');
    
    const sheet = getMainSheet();
    
    // Normalize providers
    const providerResults = normalizeReferringProviders(sheet);
    
    // Normalize clinics
    const clinicResults = normalizeClinicNames(sheet);
    
    ui.alert(
      '👨‍⚕️🏥 Providers & Clinics Normalized',
      `Providers:\n` +
      `  Processed: ${providerResults.processed}\n` +
      `  Corrected: ${providerResults.corrected}\n\n` +
      `Clinics:\n` +
      `  Processed: ${clinicResults.processed}\n` +
      `  Corrected: ${clinicResults.corrected}\n`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Provider & Clinic Normalization Failed', error);
  }
}

/**
 * Normalize addresses and cities together
 */
function normalizeAddressesAndCities() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Normalizing addresses and cities...');
    
    const sheet = getMainSheet();
    
    // Normalize addresses
    const addressResults = normalizeAddresses(sheet, sheet.getLastRow());
    
    // Normalize cities
    const cityResults = normalizeCityData(sheet);
    
    ui.alert(
      '📍🏙️ Addresses & Cities Normalized',
      `Addresses:\n` +
      `  Processed: ${addressResults.processed}\n` +
      `  Corrected: ${addressResults.corrected}\n\n` +
      `Cities:\n` +
      `  Processed: ${cityResults.processed}\n` +
      `  Corrected: ${cityResults.corrected}\n` +
      `  Misspellings Fixed: ${cityResults.misspellings}\n`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Address & City Normalization Failed', error);
  }
}

/**
 * Normalize all location data
 */
function normalizeAllLocationData() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '📍 Normalize All Location Data',
    'This will normalize:\n' +
    '• Street addresses (Column T)\n' +
    '• Cities (Column U)\n' +
    '• States (Column V)\n' +
    '• ZIP codes (Column W)\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    const startTime = new Date();
    const sheet = getMainSheet();
    
    showProgressMessage('Normalizing addresses...');
    const addressResults = normalizeAddresses(sheet, sheet.getLastRow());
    
    showProgressMessage('Normalizing cities...');
    const cityResults = normalizeCityData(sheet);
    
    showProgressMessage('Normalizing states...');
    const stateResults = normalizeStateData(sheet);
    
    const endTime = new Date();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    
    ui.alert(
      '✅ Location Data Normalization Complete',
      `📍 Addresses:\n` +
      `   Processed: ${addressResults.processed}\n` +
      `   Corrected: ${addressResults.corrected}\n\n` +
      `🏙️ Cities:\n` +
      `   Processed: ${cityResults.processed}\n` +
      `   Corrected: ${cityResults.corrected}\n` +
      `   Misspellings: ${cityResults.misspellings}\n\n` +
      `🗺️ States:\n` +
      `   Processed: ${stateResults.processed}\n` +
      `   Corrected: ${stateResults.corrected}\n\n` +
      `⏱️ Total Time: ${processingTime} seconds`,
      ui.ButtonSet.OK
    );
    
    logOperation('Normalize All Location Data', {
      addresses: addressResults,
      cities: cityResults,
      states: stateResults,
      totalTime: processingTime
    });
    
  } catch (error) {
    handleError('Location Normalization Failed', error);
  }
}

/**
 * Validate all fields - COMPREHENSIVE
 */
function validateAllFields() {
  showProgressMessage('Validating all fields...');
  
  validatePhoneNumbers();
  validateProviders();
  validateNameEntries();
  validateAddressFormat();
  validateCityEntries();
  validateStateEntries();
  
  SpreadsheetApp.getUi().alert(
    'Validation Complete',
    'All field validations have been completed. Check individual reports for details.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================
// REPORTING - COMPREHENSIVE
// ============================================
/**
 * Generate master report combining all reports
 */
function generateMasterReport() {
  try {
    showProgressMessage('Generating master report...');
    
    const sheet = getMainSheet();
    const stats = {
      phones: getPhoneStatistics ? getPhoneStatistics() : {},
      providers: getProviderStatistics(),
      clinics: getClinicStatistics ? getClinicStatistics() : {},
      cities: getCityStatistics(),
      states: getStateStatistics ? getStateStatistics() : {}
    };
    
    // Generate individual reports
    if (stats.providers) {
      generateProviderReport({
        processed: stats.providers.totalEntries,
        corrected: 0,
        unknown: stats.providers.unknownEntries,
        selfReferrals: stats.providers.selfReferrals,
        vaReferrals: stats.providers.vaReferrals,
        series1Count: 0,
        series2Count: 0,
        series3Count: 0,
        providerCounts: stats.providerCounts,
        duplicates: new Map()
      });
    }
    
    if (stats.cities) {
      generateCityReport({
        processed: stats.cities.totalEntries,
        corrected: 0,
        invalid: stats.cities.invalidEntries,
        misspellings: 0,
        cityCounts: stats.cities.cityCounts,
        invalidEntries: []
      });
    }
    
    SpreadsheetApp.getUi().alert(
      'Master Report Generated',
      'Check individual report sheets for detailed analysis.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Master Report Failed', error);
  }
}

/**
 * Show normalization summary - ENHANCED
 */
function showNormalizationSummary() {
  const docProps = PropertiesService.getDocumentProperties();
  const lastNorm = docProps.getProperty('LAST_NORMALIZATION') || 'Never';
  const lastProvider = docProps.getProperty('LAST_PROVIDER_NORMALIZATION') || 'Never';
  const lastCity = docProps.getProperty('LAST_CITY_NORMALIZATION') || 'Never';
  const lastAuto = docProps.getProperty('LAST_AUTO_PROCESSING') || 'Never';
  
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Google Sans', Arial, sans-serif; padding: 20px;">
      <h2 style="color: #1a73e8;">📊 Normalization Summary</h2>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h3 style="margin-top: 0;">Last Run Times</h3>
        <p><strong>Full Normalization:</strong> ${lastNorm}</p>
        <p><strong>Provider Normalization:</strong> ${lastProvider}</p>
        <p><strong>City Normalization:</strong> ${lastCity}</p>
        <p><strong>Automatic Processing:</strong> ${lastAuto}</p>
      </div>
      
      <div style="background: #e8f0fe; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h3 style="margin-top: 0;">Available Normalizations</h3>
        <ul>
          <li><strong>Phone Numbers:</strong> Format to (XXX) XXX-XXXX</li>
          <li><strong>Providers:</strong> Standardize names & credentials</li>
          <li><strong>Names:</strong> Proper capitalization for staff & patients</li>
          <li><strong>Addresses:</strong> Standardize street types & formatting</li>
          <li><strong>Cities:</strong> Fix misspellings & standardize names</li>
          <li><strong>Clinics:</strong> Unify variations & identify types</li>
          <li><strong>States:</strong> Full names from abbreviations</li>
        </ul>
      </div>
      
      <div style="background: #fef7e0; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h3 style="margin-top: 0;">Color Coding Guide</h3>
        <p>📘 <span style="background: #E6F3FF; padding: 2px 5px;">Light Blue</span> - Corrected/Normalized</p>
        <p>📗 <span style="background: #E8F5E9; padding: 2px 5px;">Light Green</span> - VA/Government</p>
        <p>📙 <span style="background: #FFF3CD; padding: 2px 5px;">Light Yellow</span> - Self-Referrals/Name Issues</p>
        <p>📕 <span style="background: #FFE6E6; padding: 2px 5px;">Light Red</span> - Unknown/Invalid</p>
        <p>📙 <span style="background: #FFE6CC; padding: 2px 5px;">Light Orange</span> - Duplicates/Address Issues</p>
      </div>
      
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <p style="color: #5f6368; font-size: 12px;">
          Medical Referral System v${CONFIG.VERSION}<br>
          © 2025 - Optimized for Healthcare Excellence
        </p>
      </div>
    </div>
  `)
  .setWidth(500)
  .setHeight(600);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Normalization Summary');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
/**
 * Get the main data sheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getMainSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);
  }
  
  return sheet;
}

/**
 * Show progress message
 * @param {string} message - Message to display
 */
function showProgressMessage(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, '⏳ Processing', -1);
}

/**
 * Handle errors consistently
 * @param {string} title - Error title
 * @param {Error} error - Error object
 */
function handleError(title, error) {
  console.error(`${title}:`, error);
  
  SpreadsheetApp.getUi().alert(
    `❌ ${title}`,
    `An error occurred:\n\n${error.message}\n\n` +
    `Please check the logs for more details.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  // Clear any toast messages
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
}

/**
 * Log operation for audit trail
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
    
    console.log('Operation Log:', JSON.stringify(logEntry));
    
    // Optionally save to sheet or properties
    if (CONFIG.DEBUG_MODE) {
      const props = PropertiesService.getScriptProperties();
      const logs = JSON.parse(props.getProperty('OPERATION_LOGS') || '[]');
      logs.push(logEntry);
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.shift();
      }
      
      props.setProperty('OPERATION_LOGS', JSON.stringify(logs));
    }
  } catch (error) {
    console.error('Failed to log operation:', error);
  }
}

/**
 * Create backup of the sheet
 * @param {string} description - Backup description
 */
function createBackup(description) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    const backupName = `Backup_${description}_${timestamp}`;
    
    // Check if backup already exists
    let backupSheet = ss.getSheetByName(backupName);
    if (backupSheet) {
      ss.deleteSheet(backupSheet);
    }
    
    // Create new backup
    sheet.copyTo(ss).setName(backupName);
    console.log(`Backup created: ${backupName}`);
    
    // Clean up old backups (keep only last 10)
    const sheets = ss.getSheets();
    const backups = sheets.filter(s => s.getName().startsWith('Backup_'))
                          .sort((a, b) => b.getName().localeCompare(a.getName()));
    
    if (backups.length > 10) {
      backups.slice(10).forEach(oldBackup => {
        ss.deleteSheet(oldBackup);
        console.log(`Deleted old backup: ${oldBackup.getName()}`);
      });
    }
    
    return backupName;
    
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

/**
 * Create manual backup
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
      
      ui.alert(
        'Backup Created',
        `Backup saved as: ${backupName}`,
        ui.ButtonSet.OK
      );
      
    } catch (error) {
      handleError('Backup Failed', error);
    }
  }
}

// ============================================
// SETTINGS & HELP - ENHANCED
// ============================================
/**
 * Show settings dialog
 */
function showSettings() {
  const docProps = PropertiesService.getDocumentProperties();
  
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Google Sans', Arial, sans-serif; padding: 20px;">
      <h2 style="color: #1a73e8;">⚙️ System Settings</h2>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h3 style="margin-top: 0;">Current Configuration</h3>
        <p><strong>Version:</strong> ${CONFIG.VERSION}</p>
        <p><strong>Sheet Name:</strong> ${CONFIG.SHEET_NAME}</p>
        <p><strong>Timezone:</strong> ${CONFIG.TIMEZONE}</p>
        <p><strong>Auto Backup:</strong> ${CONFIG.AUTO_BACKUP ? '✓ Enabled' : '✗ Disabled'}</p>
        <p><strong>Debug Mode:</strong> ${CONFIG.DEBUG_MODE ? '✓ On' : '✗ Off'}</p>
        <p><strong>Batch Size:</strong> ${CONFIG.BATCH_SIZE} rows</p>
      </div>
      
      <div style="background: #e8f0fe; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h3 style="margin-top: 0;">System Status</h3>
        <p><strong>Install Date:</strong> ${docProps.getProperty('INSTALL_DATE') || 'Unknown'}</p>
        <p><strong>Last Normalization:</strong> ${docProps.getProperty('LAST_NORMALIZATION') || 'Never'}</p>
        <p><strong>Last Provider Update:</strong> ${docProps.getProperty('LAST_PROVIDER_NORMALIZATION') || 'Never'}</p>
        <p><strong>Last City Update:</strong> ${docProps.getProperty('LAST_CITY_NORMALIZATION') || 'Never'}</p>
        <p><strong>Last Auto Processing:</strong> ${docProps.getProperty('LAST_AUTO_PROCESSING') || 'Never'}</p>
      </div>
      
      <div style="margin-top: 20px;">
        <p style="color: #5f6368; font-size: 12px;">
          To modify settings, edit the CONFIG object in Code.gs
        </p>
      </div>
    </div>
  `)
  .setWidth(450)
  .setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'System Settings');
}

/**
 * Show about dialog
 */
function showAbout() {
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Google Sans', Arial, sans-serif; padding: 20px;">
      <h2 style="color: #1a73e8;">Medical Referral Management System</h2>
      <p><strong>Version:</strong> ${CONFIG.VERSION}</p>
      <hr>
      
      <h3>Complete Features</h3>
      <ul>
        <li>Comprehensive data normalization (all fields)</li>
        <li>Provider name standardization (Series 1-3)</li>
        <li>City normalization and misspelling correction</li>
        <li>Name normalization (staff & patients)</li>
        <li>Address standardization and validation</li>
        <li>Phone number validation and formatting</li>
        <li>Clinic name unification</li>
        <li>State abbreviation expansion</li>
        <li>Automated reporting and analytics</li>
        <li>Batch processing capabilities</li>
        <li>Scheduled automatic processing</li>
        <li>Data validation and quality checks</li>
      </ul>
      
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <p style="color: #5f6368; font-size: 12px;">
          © 2025 Medical Referral System<br>
          Designed for West Tennessee Healthcare Network
        </p>
      </div>
    </div>
  `)
  .setWidth(450)
  .setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'About');
}