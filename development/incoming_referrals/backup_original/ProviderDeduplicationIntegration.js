/**
 * Provider Deduplication Integration
 * @description Add these functions to your existing Code.gs or MenuIntegration.gs file
 * @version 1.0
 */

// ============================================
// ADD TO YOUR EXISTING onOpen() FUNCTION
// ============================================
/**
 * Add this submenu to your existing menu structure in onOpen()
 * Place it after the existing "👨‍⚕️ Referring Providers" submenu
 */
function addProviderDeduplicationMenu(ui) {
  // This should be added to your existing menu structure
  // Find the section with .addSubMenu(ui.createMenu('👨‍⚕️ Referring Providers')
  // And add this new submenu right after it:
  
  /*
  .addSubMenu(ui.createMenu('🔄 Provider Deduplication')
    .addItem('Deduplicate All Providers', 'deduplicateProvidersOnly')
    .addItem('Validate for Duplicates', 'validateProvidersForDuplicates')
    .addItem('Find Top Referring Providers', 'findTopReferringProviders')
    .addItem('Generate Deduplication Report', 'generateProviderDeduplicationReportOnly')
    .addItem('Quick Fix Provider Duplicates', 'quickFixProviderDuplicates')
    .addItem('Show Provider Statistics', 'showProviderDeduplicationStats'))
  */
}

// ============================================
// WRAPPER FUNCTIONS FOR MENU ITEMS
// ============================================

/**
 * Generate provider deduplication report only
 */
function generateProviderDeduplicationReportOnly() {
  try {
    showProgressMessage('Generating provider deduplication report...');
    
    const sheet = getMainSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      SpreadsheetApp.getUi().alert('No data to report');
      return;
    }
    
    // Run validation to gather statistics without modifying data
    const stats = analyzeProviderDuplicates(sheet);
    
    // Generate the report
    generateProviderDeduplicationReport(stats);
    
    SpreadsheetApp.getUi().alert(
      'Report Generated',
      'Provider deduplication report has been created in "Provider Deduplication Report" sheet.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    handleError('Report Generation Failed', error);
  }
}

/**
 * Quick fix for the most common provider duplicates
 */
function quickFixProviderDuplicates() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '⚡ Quick Fix Provider Duplicates',
    'This will automatically resolve the most common provider duplicates:\n\n' +
    '• Standardize credentials (MD, DO, FNP, etc.)\n' +
    '• Fix common misspellings\n' +
    '• Merge name variations\n' +
    '• Resolve 100+ known duplicate patterns\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    showProgressMessage('Fixing provider duplicates...');
    
    const sheet = getMainSheet();
    const stats = deduplicateProviders(sheet);
    
    ui.alert(
      '✅ Quick Fix Complete',
      `Processed: ${stats.processed} providers\n` +
      `Duplicates Resolved: ${stats.deduplicated}\n` +
      `Names Normalized: ${stats.normalized}\n` +
      `Unique Providers: ${stats.canonicalProviders.size}\n\n` +
      `Previous unique count was likely much higher due to duplicates.`,
      ui.ButtonSet.OK
    );
    
    logOperation('Quick Fix Provider Duplicates', stats);
    
  } catch (error) {
    handleError('Quick Fix Failed', error);
  }
}

/**
 * Show provider deduplication statistics
 */
function showProviderDeduplicationStats() {
  try {
    const sheet = getMainSheet();
    const stats = analyzeProviderDuplicates(sheet);
    
    const html = HtmlService.createHtmlOutput(`
      <div style="font-family: 'Google Sans', Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1a73e8;">🔄 Provider Deduplication Statistics</h2>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="margin-top: 0;">Current Status</h3>
          <p><strong>Total Provider Entries:</strong> ${stats.processed}</p>
          <p><strong>Unique Providers (with duplicates):</strong> ${stats.uniqueBeforeDedup}</p>
          <p><strong>Unique Providers (after deduplication):</strong> ${stats.canonicalProviders.size}</p>
          <p><strong>Duplicate Entries Found:</strong> ${stats.totalDuplicates}</p>
          <p><strong>Providers with Duplicates:</strong> ${stats.providersWithDuplicates}</p>
        </div>
        
        <div style="background: #e8f0fe; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="margin-top: 0;">Top Duplicated Providers</h3>
          ${stats.topDuplicates.map(([name, count]) => 
            `<p>• <strong>${name}:</strong> ${count} variations</p>`
          ).join('')}
        </div>
        
        <div style="background: #fef7e0; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="margin-top: 0;">Categories</h3>
          <p><strong>Self Referrals:</strong> ${stats.selfReferrals}</p>
          <p><strong>VA Referrals:</strong> ${stats.vaReferrals}</p>
          <p><strong>Unknown Providers:</strong> ${stats.unknown}</p>
          <p><strong>LeBonheur Referrals:</strong> ${stats.lebonheur}</p>
        </div>
        
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="margin-top: 0;">Potential Savings</h3>
          <p>By deduplicating providers, you will:</p>
          <p>• Reduce unique provider count by <strong>${stats.reductionPercent}%</strong></p>
          <p>• Consolidate <strong>${stats.totalDuplicates}</strong> duplicate entries</p>
          <p>• Improve reporting accuracy</p>
          <p>• Enable better referral pattern analysis</p>
        </div>
        
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p style="color: #5f6368; font-size: 12px;">
            Run "Deduplicate All Providers" to apply these corrections
          </p>
        </div>
      </div>
    `)
    .setWidth(500)
    .setHeight(600);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Provider Deduplication Statistics');
    
  } catch (error) {
    handleError('Statistics Failed', error);
  }
}

/**
 * Analyze provider duplicates without modifying data
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to analyze
 * @returns {Object} Statistics about duplicates
 */
function analyzeProviderDuplicates(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      processed: 0,
      uniqueBeforeDedup: 0,
      canonicalProviders: new Set(),
      totalDuplicates: 0,
      providersWithDuplicates: 0,
      topDuplicates: [],
      selfReferrals: 0,
      vaReferrals: 0,
      unknown: 0,
      lebonheur: 0,
      reductionPercent: 0
    };
  }
  
  const range = sheet.getRange(2, 5, lastRow - 1, 1); // Column E
  const values = range.getValues();
  
  const stats = {
    processed: 0,
    uniqueBeforeDedup: new Set(),
    canonicalProviders: new Set(),
    duplicateMap: new Map(),
    selfReferrals: 0,
    vaReferrals: 0,
    unknown: 0,
    lebonheur: 0
  };
  
  // Analyze each provider
  values.forEach(row => {
    const provider = row[0];
    if (provider && provider !== '') {
      stats.processed++;
      stats.uniqueBeforeDedup.add(provider.toString());
      
      const result = deduplicateProviderName(provider.toString());
      stats.canonicalProviders.add(result.canonical);
      
      // Track duplicates
      if (!stats.duplicateMap.has(result.canonical)) {
        stats.duplicateMap.set(result.canonical, new Set());
      }
      stats.duplicateMap.get(result.canonical).add(provider.toString());
      
      // Count categories
      if (result.canonical === 'Self Referral') stats.selfReferrals++;
      if (result.canonical === 'VA Medical Center') stats.vaReferrals++;
      if (result.canonical === 'Unknown Provider') stats.unknown++;
      if (result.canonical === 'LeBonheur') stats.lebonheur++;
    }
  });
  
  // Calculate duplicate statistics
  let totalDuplicates = 0;
  let providersWithDuplicates = 0;
  const duplicateCounts = [];
  
  stats.duplicateMap.forEach((variations, canonical) => {
    if (variations.size > 1) {
      providersWithDuplicates++;
      totalDuplicates += variations.size - 1;
      duplicateCounts.push([canonical, variations.size]);
    }
  });
  
  // Sort to find top duplicates
  duplicateCounts.sort((a, b) => b[1] - a[1]);
  
  const reductionPercent = stats.uniqueBeforeDedup.size > 0 ?
    Math.round((1 - stats.canonicalProviders.size / stats.uniqueBeforeDedup.size) * 100) : 0;
  
  return {
    processed: stats.processed,
    uniqueBeforeDedup: stats.uniqueBeforeDedup.size,
    canonicalProviders: stats.canonicalProviders,
    totalDuplicates: totalDuplicates,
    providersWithDuplicates: providersWithDuplicates,
    topDuplicates: duplicateCounts.slice(0, 5),
    selfReferrals: stats.selfReferrals,
    vaReferrals: stats.vaReferrals,
    unknown: stats.unknown,
    lebonheur: stats.lebonheur,
    reductionPercent: reductionPercent,
    duplicateMap: stats.duplicateMap
  };
}

// ============================================
// ENHANCED COMBINED OPERATIONS
// ============================================

/**
 * Add this to your quickNormalizeAll() function to include provider deduplication
 */
function enhancedQuickNormalizeAll() {
  // Add this section to your existing quickNormalizeAll function
  // Right after the existing provider normalization:
  
  /*
  // Deduplicate providers (NEW)
  showProgressMessage('Deduplicating provider names...');
  results.providerDedup = deduplicateProviders(sheet);
  */
  
  // And add to the results display:
  /*
  `👨‍⚕️ Provider Deduplication:\n` +
  `   Duplicates Resolved: ${results.providerDedup.deduplicated || 0}\n` +
  `   Unique Providers: ${results.providerDedup.canonicalProviders.size || 0}\n\n` +
  */
}

/**
 * Combined operation: Normalize and deduplicate all provider data
 */
function normalizeAndDeduplicateProviders() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '👨‍⚕️ Complete Provider Normalization',
    'This will:\n' +
    '1. Normalize all provider names (Series 1-3)\n' +
    '2. Deduplicate provider entries\n' +
    '3. Standardize credentials\n' +
    '4. Resolve all known duplicates\n\n' +
    'This comprehensive operation will ensure clean provider data.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    const startTime = new Date();
    const sheet = getMainSheet();
    
    showProgressMessage('Creating backup...');
    createBackup('Pre-Provider-Deduplication');
    
    // First normalize (from existing system)
    showProgressMessage('Normalizing provider names...');
    const normalizeResults = normalizeReferringProviders(sheet);
    
    // Then deduplicate
    showProgressMessage('Deduplicating providers...');
    const dedupeResults = deduplicateProviders(sheet);
    
    const endTime = new Date();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    
    ui.alert(
      '✅ Provider Processing Complete',
      `Normalization:\n` +
      `  Processed: ${normalizeResults.processed}\n` +
      `  Corrected: ${normalizeResults.corrected}\n` +
      `  Series 1-3 Applied: ${normalizeResults.series1Count + normalizeResults.series2Count + normalizeResults.series3Count}\n\n` +
      `Deduplication:\n` +
      `  Duplicates Resolved: ${dedupeResults.deduplicated}\n` +
      `  Names Normalized: ${dedupeResults.normalized}\n` +
      `  Unique Providers: ${dedupeResults.canonicalProviders.size}\n\n` +
      `⏱️ Total Time: ${processingTime} seconds`,
      ui.ButtonSet.OK
    );
    
    logOperation('Complete Provider Normalization', {
      normalization: normalizeResults,
      deduplication: dedupeResults,
      totalTime: processingTime
    });
    
  } catch (error) {
    handleError('Provider Processing Failed', error);
  }
}

// ============================================
// BATCH PROCESSING FOR LARGE DATASETS
// ============================================

/**
 * Batch process provider deduplication for large datasets
 * @param {number} batchSize - Number of rows to process at once
 */
function batchProcessProviderDeduplication(batchSize = 500) {
  const sheet = getMainSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to process');
    return;
  }
  
  const totalBatches = Math.ceil((lastRow - 1) / batchSize);
  
  showProgressMessage(`Processing ${lastRow - 1} providers in ${totalBatches} batches...`);
  
  const overallStats = {
    processed: 0,
    deduplicated: 0,
    normalized: 0,
    canonicalProviders: new Set()
  };
  
  for (let batch = 0; batch < totalBatches; batch++) {
    const startRow = 2 + (batch * batchSize);
    const endRow = Math.min(startRow + batchSize - 1, lastRow);
    const rowCount = endRow - startRow + 1;
    
    showProgressMessage(`Processing batch ${batch + 1}/${totalBatches} (rows ${startRow}-${endRow})...`);
    
    // Get batch data
    const range = sheet.getRange(startRow, 5, rowCount, 1); // Column E
    const values = range.getValues();
    const backgrounds = [];
    
    // Process batch
    for (let i = 0; i < values.length; i++) {
      const originalValue = values[i][0];
      
      if (originalValue && originalValue !== '') {
        overallStats.processed++;
        
        const result = deduplicateProviderName(originalValue.toString());
        
        values[i][0] = result.canonical;
        backgrounds[i] = [result.backgroundColor];
        
        if (result.wasDeduplicated) overallStats.deduplicated++;
        if (result.wasNormalized) overallStats.normalized++;
        overallStats.canonicalProviders.add(result.canonical);
      } else {
        backgrounds[i] = ['#FFFFFF'];
        values[i][0] = 'Unknown Provider';
      }
    }
    
    // Apply batch changes
    range.setValues(values);
    range.setBackgrounds(backgrounds);
    
    // Small delay to prevent timeout
    Utilities.sleep(100);
  }
  
  showProgressMessage('Generating report...');
  generateProviderDeduplicationReport(overallStats);
  
  SpreadsheetApp.getUi().alert(
    'Batch Processing Complete',
    `Processed: ${overallStats.processed} providers\n` +
    `Duplicates Resolved: ${overallStats.deduplicated}\n` +
    `Unique Providers: ${overallStats.canonicalProviders.size}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  return overallStats;
}

// ============================================
// VALIDATION AND TESTING
// ============================================

/**
 * Test the deduplication on a sample without applying changes
 */
function testProviderDeduplication() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt(
    'Test Provider Deduplication',
    'Enter a provider name to test deduplication:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const testName = response.getResponseText();
    const result = deduplicateProviderName(testName);
    
    let message = `Input: "${testName}"\n\n`;
    message += `Canonical Name: ${result.canonical}\n`;
    message += `Was Deduplicated: ${result.wasDeduplicated ? 'Yes' : 'No'}\n`;
    message += `Was Normalized: ${result.wasNormalized ? 'Yes' : 'No'}\n`;
    message += `Category: ${result.category}\n`;
    
    if (result.note) {
      message += `\nNote: ${result.note}`;
    }
    
    ui.alert('Deduplication Test Result', message, ui.ButtonSet.OK);
  }
}

// ============================================
// EXPORT/IMPORT PROVIDER MAPPINGS
// ============================================

/**
 * Export provider mappings to a sheet for review/editing
 */
function exportProviderMappings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let mappingSheet = ss.getSheetByName('Provider Mappings');
  
  if (!mappingSheet) {
    mappingSheet = ss.insertSheet('Provider Mappings');
  } else {
    mappingSheet.clear();
  }
  
  const headers = [
    ['Provider Mappings - Editable'],
    ['Instructions: Edit the canonical name (Column B) to change how providers are deduplicated'],
    [''],
    ['Original/Variation', 'Canonical Name', 'Category']
  ];
  
  mappingSheet.getRange(1, 1, headers.length, 3).setValues(headers);
  
  // Export all mappings
  const mappingData = [];
  Object.entries(PROVIDER_CANONICAL_MAPPING).forEach(([original, canonical]) => {
    let category = 'standard';
    if (canonical === 'Self Referral') category = 'self-referral';
    if (canonical === 'Unknown Provider') category = 'unknown';
    if (canonical === 'VA Medical Center') category = 'va';
    if (canonical === 'LeBonheur') category = 'specialty';
    
    mappingData.push([original, canonical, category]);
  });
  
  if (mappingData.length > 0) {
    mappingSheet.getRange(5, 1, mappingData.length, 3).setValues(mappingData);
  }
  
  // Format
  mappingSheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  mappingSheet.getRange(4, 1, 1, 3).setFontWeight('bold').setBackground('#E8E8E8');
  mappingSheet.autoResizeColumns(1, 3);
  
  SpreadsheetApp.getUi().alert(
    'Mappings Exported',
    'Provider mappings have been exported to "Provider Mappings" sheet.\n' +
    'You can edit the canonical names and then import them back.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}