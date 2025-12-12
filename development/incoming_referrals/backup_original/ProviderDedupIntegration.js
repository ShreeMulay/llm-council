/**
 * Provider Deduplication Integration Module
 * @module ProviderDedupIntegration
 * @description Integration layer for provider deduplication with existing system
 * @version 1.0
 */

// ============================================
// MENU ADDITIONS FOR PROVIDER DEDUPLICATION
// ============================================
/**
 * Add these menu items to your existing onOpen() function in Code.gs
 * Insert under the "Referring Providers" submenu
 */
function getProviderDeduplicationMenuItems() {
  return [
    'Deduplicate All Providers', 'runProviderDeduplication',
    'Find Provider Duplicates', 'findProviderDuplicates',  
    'Validate Provider Duplicates', 'validateProviderDuplicates',
    'Generate Deduplication Report', 'generateProviderDedupReport',
    'Quick Fix Provider Names', 'quickFixProviderNames'
  ];
}

// ============================================
// MAIN ORCHESTRATION FUNCTIONS
// ============================================

/**
 * Run provider deduplication from menu
 */
function runProviderDeduplication() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '👨‍⚕️ Provider Deduplication',
    'This will:\n' +
    '• Merge duplicate provider entries\n' +
    '• Standardize name formats\n' +
    '• Fix credential abbreviations\n' +
    '• Identify self-referrals and VA referrals\n\n' +
    'A backup will be created first.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    showProgressMessage('Creating backup...');
    createBackup('Pre-Provider-Dedup');
    
    showProgressMessage('Deduplicating providers...');
    const sheet = getMainSheet();
    const stats = deduplicateProviders(sheet);
    
    ui.alert(
      '✅ Provider Deduplication Complete',
      `Results:\n\n` +
      `📊 Total Processed: ${stats.processed}\n` +
      `🔄 Duplicates Merged: ${stats.duplicatesFound}\n` +
      `✏️ Names Normalized: ${stats.normalized}\n` +
      `👤 Self-Referrals: ${stats.selfReferrals}\n` +
      `🏥 VA Referrals: ${stats.vaReferrals}\n` +
      `❓ Unknown Providers: ${stats.unknown}\n` +
      `📋 Unique Providers: ${stats.providerCounts.size}\n\n` +
      `Check "Provider Deduplication Report" for details.`,
      ui.ButtonSet.OK
    );
    
    // Log operation
    logOperation('Provider Deduplication', stats);
    
    // Update timestamp
    PropertiesService.getDocumentProperties()
      .setProperty('LAST_PROVIDER_DEDUP', new Date().toISOString());
    
  } catch (error) {
    handleError('Provider Deduplication Failed', error);
  }
}

/**
 * Find provider duplicates without modifying
 */
function findProviderDuplicates() {
  try {
    showProgressMessage('Finding provider duplicates...');
    findDuplicateProviders();
  } catch (error) {
    handleError('Duplicate Search Failed', error);
  }
}

/**
 * Validate provider duplicates
 */
function validateProviderDuplicates() {
  try {
    showProgressMessage('Validating provider duplicates...');
    const issues = validateProviderDuplicates();
    
    // Could generate a validation report here
    if (issues.duplicates.length > 0 || issues.formatting.length > 0) {
      generateValidationReport(issues);
    }
    
  } catch (error) {
    handleError('Validation Failed', error);
  }
}

/**
 * Generate provider deduplication report
 */
function generateProviderDedupReport() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    showProgressMessage('Analyzing provider data...');
    
    const sheet = getMainSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      ui.alert('No data to report');
      return;
    }
    
    // Gather statistics without modifying data
    const stats = analyzeProviderDuplicates(sheet);
    
    // Generate report
    generateProviderDeduplicationReport(stats);
    
    ui.alert(
      'Report Generated',
      'Provider deduplication analysis report has been created.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Report Generation Failed', error);
  }
}

/**
 * Quick fix for common provider name issues
 */
function quickFixProviderNames() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '⚡ Quick Fix Provider Names',
    'This will fix:\n' +
    '• Credential formatting (MD, DO, FNP, etc.)\n' +
    '• Name capitalization\n' +
    '• Extra spaces and punctuation\n\n' +
    'Only formatting will be fixed, no deduplication.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    showProgressMessage('Fixing provider name formatting...');
    
    const sheet = getMainSheet();
    const stats = quickFixProviderFormatting(sheet);
    
    ui.alert(
      'Quick Fix Complete',
      `Fixed ${stats.fixed} provider name formatting issues.`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Quick Fix Failed', error);
  }
}

// ============================================
// ENHANCED NORMALIZATION FUNCTIONS
// ============================================

/**
 * Enhanced version of normalizeReferringProviders that includes deduplication
 * Replace the existing function in ProviderNormalization.gs with this
 */
function normalizeReferringProvidersWithDedup(sheet) {
  try {
    const startTime = new Date();
    console.log('Starting enhanced provider normalization with deduplication...');
    
    // First run the standard normalization
    const standardResults = normalizeReferringProviders(sheet);
    
    // Then run deduplication
    const dedupResults = deduplicateProviders(sheet);
    
    // Combine results
    const combinedResults = {
      processed: standardResults.processed,
      corrected: standardResults.corrected + dedupResults.normalized,
      duplicatesFound: dedupResults.duplicatesFound,
      selfReferrals: dedupResults.selfReferrals,
      vaReferrals: dedupResults.vaReferrals,
      unknown: standardResults.unknown + dedupResults.unknown,
      series1Count: standardResults.series1Count,
      series2Count: standardResults.series2Count,  
      series3Count: standardResults.series3Count,
      uniqueProviders: dedupResults.providerCounts.size
    };
    
    const endTime = new Date();
    combinedResults.processingTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`Enhanced normalization complete in ${combinedResults.processingTime} seconds`);
    
    return combinedResults;
    
  } catch (error) {
    console.error('Enhanced normalization failed:', error);
    throw error;
  }
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze provider duplicates without modifying data
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object} Analysis statistics
 */
function analyzeProviderDuplicates(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { processed: 0 };
  }
  
  const range = sheet.getRange(2, 5, lastRow - 1, 1); // Column E
  const values = range.getValues();
  
  const stats = {
    processed: 0,
    potentialDuplicates: 0,
    formattingIssues: 0,
    selfReferrals: 0,
    vaReferrals: 0,
    unknown: 0,
    providerCounts: new Map(),
    duplicateMap: new Map(),
    variations: []
  };
  
  // Analyze each provider
  values.forEach((row, index) => {
    const provider = row[0];
    if (provider && provider !== '') {
      stats.processed++;
      
      const result = normalizeProviderName(provider.toString());
      
      // Count categories
      if (result.category === 'self-referral') stats.selfReferrals++;
      if (result.category === 'va') stats.vaReferrals++;
      if (result.category === 'unknown') stats.unknown++;
      
      // Track formatting issues
      if (result.wasNormalized) {
        stats.formattingIssues++;
      }
      
      // Track provider frequency
      const normalizedKey = result.normalized;
      if (!stats.providerCounts.has(normalizedKey)) {
        stats.providerCounts.set(normalizedKey, 0);
      }
      stats.providerCounts.get(normalizedKey)++;
      
      // Track variations
      if (provider !== result.normalized) {
        if (!stats.duplicateMap.has(normalizedKey)) {
          stats.duplicateMap.set(normalizedKey, new Set());
        }
        stats.duplicateMap.get(normalizedKey).add(provider);
      }
    }
  });
  
  // Count potential duplicates
  stats.duplicateMap.forEach((variations, normalized) => {
    if (variations.size > 0) {
      stats.potentialDuplicates += variations.size;
      stats.variations.push({
        normalized: normalized,
        variations: Array.from(variations),
        count: variations.size
      });
    }
  });
  
  // Sort variations by count
  stats.variations.sort((a, b) => b.count - a.count);
  
  return stats;
}

/**
 * Quick fix provider formatting without full deduplication
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object} Fix statistics
 */
function quickFixProviderFormatting(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { fixed: 0 };
  }
  
  const range = sheet.getRange(2, 5, lastRow - 1, 1); // Column E
  const values = range.getValues();
  const backgrounds = [];
  
  let fixCount = 0;
  
  values.forEach((row, index) => {
    const original = row[0];
    if (original && original !== '') {
      // Only fix formatting, don't deduplicate
      const cleaned = cleanProviderName(original.toString());
      const formatted = standardizeProviderFormat(cleaned);
      
      if (formatted !== original) {
        row[0] = formatted;
        backgrounds[index] = ['#E6F3FF']; // Light blue for fixed
        fixCount++;
      } else {
        backgrounds[index] = ['#FFFFFF'];
      }
    } else {
      backgrounds[index] = ['#FFFFFF'];
    }
  });
  
  // Apply changes
  range.setValues(values);
  range.setBackgrounds(backgrounds);
  
  return { fixed: fixCount };
}

/**
 * Generate validation report for provider issues
 * @param {Object} issues - Validation issues
 */
function generateValidationReport(issues) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let reportSheet = ss.getSheetByName('Provider Validation Issues');
  
  if (!reportSheet) {
    reportSheet = ss.insertSheet('Provider Validation Issues');
  } else {
    reportSheet.clear();
  }
  
  const headers = [
    ['Provider Validation Issues Report'],
    ['Generated:', new Date().toLocaleString()],
    [''],
    ['Summary'],
    ['Duplicate Entries:', issues.duplicates.length],
    ['Formatting Issues:', issues.formatting.length],
    ['Unknown Providers:', issues.unknown.length],
    ['Self Referrals:', issues.selfReferrals],
    ['VA Referrals:', issues.vaReferrals],
    ['']
  ];
  
  reportSheet.getRange(1, 1, headers.length, 2).setValues(headers);
  
  // Add duplicate details
  if (issues.duplicates.length > 0) {
    const dupStart = headers.length + 1;
    const dupHeaders = [['Duplicate Entries'], ['Row', 'Provider', 'Matches Row']];
    reportSheet.getRange(dupStart, 1, dupHeaders.length, 3).setValues(dupHeaders);
    
    const dupData = issues.duplicates.slice(0, 50).map(dup => [
      dup.row,
      dup.provider,
      dup.firstSeen
    ]);
    
    if (dupData.length > 0) {
      reportSheet.getRange(dupStart + 2, 1, dupData.length, 3).setValues(dupData);
    }
  }
  
  // Format report
  reportSheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  reportSheet.autoResizeColumns(1, 3);
}

// ============================================
// BATCH PROCESSING ADDITIONS
// ============================================

/**
 * Batch process providers with deduplication
 * @param {number} batchSize - Number of rows per batch
 * @returns {Object} Processing statistics
 */
function batchProcessProvidersWithDedup(batchSize = 500) {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return { processed: 0 };
  }
  
  const totalBatches = Math.ceil((lastRow - 1) / batchSize);
  const stats = {
    processed: 0,
    duplicatesFound: 0,
    normalized: 0,
    batches: totalBatches
  };
  
  for (let batch = 0; batch < totalBatches; batch++) {
    const startRow = 2 + (batch * batchSize);
    const endRow = Math.min(startRow + batchSize - 1, lastRow);
    const numRows = endRow - startRow + 1;
    
    showProgressMessage(`Processing batch ${batch + 1}/${totalBatches} (rows ${startRow}-${endRow})...`);
    
    // Process this batch
    const range = sheet.getRange(startRow, 5, numRows, 1);
    const values = range.getValues();
    const backgrounds = [];
    
    values.forEach((row, index) => {
      const original = row[0];
      if (original && original !== '') {
        stats.processed++;
        
        const result = normalizeProviderName(original.toString());
        row[0] = result.normalized;
        backgrounds[index] = [result.backgroundColor];
        
        if (result.wasNormalized) {
          stats.normalized++;
          if (result.category === 'normalized' && result.originalNormalized !== result.normalized) {
            stats.duplicatesFound++;
          }
        }
      } else {
        backgrounds[index] = ['#FFFFFF'];
      }
    });
    
    // Apply batch changes
    range.setValues(values);
    range.setBackgrounds(backgrounds);
    
    // Small delay to prevent timeout
    Utilities.sleep(100);
  }
  
  showProgressMessage('Batch processing complete!');
  
  return stats;
}

// ============================================
// INTEGRATION WITH MAIN QUICK NORMALIZE
// ============================================

/**
 * Enhanced quickNormalizeAll that includes provider deduplication
 * This would replace or enhance the existing quickNormalizeAll function
 */
function quickNormalizeAllWithDedup() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '⚡ Quick Normalize All (with Deduplication)',
    'This enhanced version will:\n' +
    '• Normalize all standard fields\n' +
    '• PLUS: Deduplicate provider names\n' +
    '• PLUS: Merge provider variations\n' +
    '• PLUS: Enhanced duplicate detection\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    const startTime = new Date();
    const sheet = getMainSheet();
    
    // Create backup
    showProgressMessage('Creating backup...');
    createBackup('Pre-Enhanced-Normalization');
    
    const results = {
      phones: {},
      providers: {},
      providerDedup: {},
      namesAddresses: {},
      cities: {},
      clinics: {},
      states: {},
      totalTime: 0
    };
    
    // Run all normalizations
    showProgressMessage('Normalizing phone numbers...');
    results.phones = normalizeAllPhoneNumbers(sheet);
    
    // Enhanced provider normalization with deduplication
    showProgressMessage('Normalizing and deduplicating providers...');
    results.providers = normalizeReferringProvidersWithDedup(sheet);
    
    showProgressMessage('Normalizing names and addresses...');
    results.namesAddresses = normalizeNamesAndAddresses(sheet);
    
    showProgressMessage('Normalizing city names...');
    results.cities = normalizeCityData(sheet);
    
    showProgressMessage('Normalizing clinic names...');
    results.clinics = normalizeClinicNames(sheet);
    
    showProgressMessage('Normalizing state data...');
    results.states = normalizeStateData(sheet);
    
    const endTime = new Date();
    results.totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    // Enhanced summary with deduplication stats
    ui.alert(
      '✅ Enhanced Normalization Complete',
      `📞 Phone Numbers:\n` +
      `   Processed: ${results.phones.processed || 0}\n` +
      `   Corrected: ${results.phones.corrected || 0}\n\n` +
      `👨‍⚕️ Providers (with Deduplication):\n` +
      `   Processed: ${results.providers.processed || 0}\n` +
      `   Duplicates Merged: ${results.providers.duplicatesFound || 0}\n` +
      `   Unique Providers: ${results.providers.uniqueProviders || 0}\n` +
      `   Self-Referrals: ${results.providers.selfReferrals || 0}\n` +
      `   VA Referrals: ${results.providers.vaReferrals || 0}\n\n` +
      `📍 Locations & Names:\n` +
      `   Names/Addresses: ${results.namesAddresses.totalProcessed || 0}\n` +
      `   Cities: ${results.cities.processed || 0}\n` +
      `   States: ${results.states.processed || 0}\n\n` +
      `🏥 Clinics:\n` +
      `   Processed: ${results.clinics.processed || 0}\n` +
      `   Corrected: ${results.clinics.corrected || 0}\n\n` +
      `⏱️ Total Time: ${results.totalTime} seconds`,
      ui.ButtonSet.OK
    );
    
    // Update timestamps
    const props = PropertiesService.getDocumentProperties();
    const now = new Date().toISOString();
    props.setProperty('LAST_NORMALIZATION', now);
    props.setProperty('LAST_PROVIDER_DEDUP', now);
    
    logOperation('Enhanced Quick Normalize with Dedup', results);
    
  } catch (error) {
    handleError('Enhanced Normalization Failed', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get main sheet (reuse from main system)
 */
function getMainSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  if (!sheet) {
    throw new Error('Sheet "Form Responses 1" not found');
  }
  return sheet;
}

/**
 * Show progress message (reuse from main system)
 */
function showProgressMessage(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, '⏳ Processing', -1);
}

/**
 * Handle errors (reuse from main system)
 */
function handleError(title, error) {
  console.error(`${title}:`, error);
  
  SpreadsheetApp.getUi().alert(
    `❌ ${title}`,
    `An error occurred:\n\n${error.message}\n\n` +
    `Please check the logs for more details.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
}

/**
 * Create backup (reuse from main system)
 */
function createBackup(description) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Form Responses 1');
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    const backupName = `Backup_${description}_${timestamp}`;
    
    sheet.copyTo(ss).setName(backupName);
    console.log(`Backup created: ${backupName}`);
    
    return backupName;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

/**
 * Log operation (reuse from main system)
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
    
  } catch (error) {
    console.error('Failed to log operation:', error);
  }
}