/**
 * Automatic Sorting Module for Medical Referral System
 * @module AutoSort
 * @description Handles automatic hourly sorting of referral data by timestamp
 * @author Medical Referral System
 * @version 1.0
 */

/**
 * Configuration for auto-sorting
 */
const AUTOSORT_CONFIG = {
  SHEET_NAME: 'Form Responses 1',
  TIMESTAMP_COLUMN: 1, // Column A
  SORT_ORDER: true, // true = oldest first (ascending), newest last
  TRIGGER_INTERVAL_HOURS: 1, // Hourly sorting
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000
};

/**
 * Main function to sort sheet by timestamp
 * Sorts the entire data range based on timestamp column
 * @returns {boolean} Success status
 */
function autoSortByTimestamp() {
  let retryCount = 0;
  
  while (retryCount < AUTOSORT_CONFIG.MAX_RETRIES) {
    try {
      const startTime = new Date();
      
      // Get the active spreadsheet and sheet
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = spreadsheet.getSheetByName(AUTOSORT_CONFIG.SHEET_NAME);
      
      if (!sheet) {
        throw new Error(`Sheet "${AUTOSORT_CONFIG.SHEET_NAME}" not found`);
      }
      
      // Get the last row and column with data
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      
      // Only sort if there's data to sort (more than just headers)
      if (lastRow <= 1) {
        console.log('No data to sort (only headers present)');
        return true;
      }
      
      // Get the data range (excluding header row)
      const dataRange = sheet.getRange(2, 1, lastRow - 1, lastColumn);
      
      // Perform the sort - ascending order (oldest first, newest last)
      dataRange.sort({
        column: AUTOSORT_CONFIG.TIMESTAMP_COLUMN,
        ascending: AUTOSORT_CONFIG.SORT_ORDER
      });
      
      // Calculate execution time
      const executionTime = (new Date() - startTime) / 1000;
      
      // Log success
      console.log(`Successfully sorted ${lastRow - 1} rows by timestamp (oldest first, newest last) in ${executionTime.toFixed(2)} seconds`);
      
      // Update last sort timestamp in document properties
      PropertiesService.getDocumentProperties()
        .setProperty('LAST_AUTO_SORT', new Date().toISOString());
      
      return true;
      
    } catch (error) {
      retryCount++;
      console.error(`Sort attempt ${retryCount} failed:`, error.toString());
      
      if (retryCount >= AUTOSORT_CONFIG.MAX_RETRIES) {
        console.error('Maximum retry attempts reached. Sort operation failed.');
        
        // Send notification if critical
        notifySortFailure(error);
        return false;
      }
      
      // Wait before retrying
      Utilities.sleep(AUTOSORT_CONFIG.RETRY_DELAY_MS);
    }
  }
}

/**
 * Creates an hourly trigger for automatic sorting
 * Removes any existing sort triggers before creating new one
 */
function createHourlySortTrigger() {
  try {
    // First, remove any existing sort triggers to avoid duplicates
    removeExistingSortTriggers();
    
    // Create new hourly trigger
    const trigger = ScriptApp.newTrigger('autoSortByTimestamp')
      .timeBased()
      .everyHours(AUTOSORT_CONFIG.TRIGGER_INTERVAL_HOURS)
      .create();
    
    // Log trigger creation
    console.log(`Created hourly sort trigger with ID: ${trigger.getUniqueId()}`);
    
    // Store trigger ID for reference
    PropertiesService.getDocumentProperties()
      .setProperty('SORT_TRIGGER_ID', trigger.getUniqueId());
    
    // Show confirmation to user
    SpreadsheetApp.getUi().alert(
      '✅ Hourly Sorting Enabled',
      `The sheet will now be automatically sorted by timestamp every hour.\n\n` +
      `Sort Order: Oldest entries first, newest entries last\n` +
      `Trigger ID: ${trigger.getUniqueId()}\n` +
      `Next run: In approximately 1 hour`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    return trigger;
    
  } catch (error) {
    console.error('Failed to create hourly trigger:', error);
    SpreadsheetApp.getUi().alert(
      '❌ Trigger Creation Failed',
      `Unable to create hourly trigger.\n\nError: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    throw error;
  }
}

/**
 * Removes all existing sort triggers
 * @returns {number} Number of triggers removed
 */
function removeExistingSortTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removedCount = 0;
    
    triggers.forEach(trigger => {
      // Remove triggers that call our sort function
      if (trigger.getHandlerFunction() === 'autoSortByTimestamp') {
        ScriptApp.deleteTrigger(trigger);
        console.log(`Removed existing sort trigger: ${trigger.getUniqueId()}`);
        removedCount++;
      }
    });
    
    // Clear stored trigger ID
    if (removedCount > 0) {
      PropertiesService.getDocumentProperties()
        .deleteProperty('SORT_TRIGGER_ID');
    }
    
    console.log(`Removed ${removedCount} existing sort trigger(s)`);
    return removedCount;
    
  } catch (error) {
    console.error('Error removing triggers:', error);
    throw error;
  }
}

/**
 * Manually trigger sort with user confirmation
 */
function manualSort() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '🔄 Manual Sort',
    'Sort the sheet by timestamp now?\n\n' +
    'Sort order: Oldest entries first, newest entries last',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    try {
      // Show progress
      SpreadsheetApp.getActiveSpreadsheet()
        .toast('Sorting sheet (oldest first, newest last)...', '⏳ Processing', -1);
      
      const success = autoSortByTimestamp();
      
      if (success) {
        SpreadsheetApp.getActiveSpreadsheet()
          .toast('Sheet sorted successfully! Newest entries are at the bottom.', '✅ Complete', 3);
      } else {
        throw new Error('Sort operation failed');
      }
      
    } catch (error) {
      ui.alert(
        '❌ Sort Failed',
        `Unable to sort sheet.\n\nError: ${error.message}`,
        ui.ButtonSet.OK
      );
    }
  }
}

/**
 * Check trigger status and last sort time
 */
function checkSortStatus() {
  try {
    const props = PropertiesService.getDocumentProperties();
    const lastSort = props.getProperty('LAST_AUTO_SORT');
    const triggerId = props.getProperty('SORT_TRIGGER_ID');
    
    // Check if trigger exists
    const triggers = ScriptApp.getProjectTriggers();
    const activeTrigger = triggers.find(t => 
      t.getHandlerFunction() === 'autoSortByTimestamp'
    );
    
    let status = '📊 Auto-Sort Status\n\n';
    
    if (activeTrigger) {
      status += '✅ Status: ACTIVE\n';
      status += `Trigger Type: ${activeTrigger.getEventType()}\n`;
      status += `Trigger ID: ${activeTrigger.getUniqueId()}\n`;
      status += 'Sort Order: Oldest first → Newest last\n';
    } else {
      status += '❌ Status: INACTIVE\n';
      status += 'No active sort trigger found\n';
    }
    
    if (lastSort) {
      const lastSortDate = new Date(lastSort);
      const timeSinceSort = (new Date() - lastSortDate) / 1000 / 60; // minutes
      
      status += `\nLast Sort: ${lastSortDate.toLocaleString()}\n`;
      status += `Time Since: ${timeSinceSort.toFixed(0)} minutes ago`;
    } else {
      status += '\nLast Sort: Never';
    }
    
    SpreadsheetApp.getUi().alert('Sort Status', status, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('Error checking sort status:', error);
    SpreadsheetApp.getUi().alert('Error', 'Unable to check sort status', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Disable automatic sorting
 */
function disableAutoSort() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '⚠️ Disable Auto-Sort',
    'This will stop automatic hourly sorting.\n\n' +
    'Are you sure you want to disable it?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    try {
      const removedCount = removeExistingSortTriggers();
      
      ui.alert(
        'Auto-Sort Disabled',
        `Removed ${removedCount} sort trigger(s).\n\n` +
        'Automatic sorting has been disabled.',
        ui.ButtonSet.OK
      );
      
    } catch (error) {
      ui.alert(
        'Error',
        `Failed to disable auto-sort.\n\nError: ${error.message}`,
        ui.ButtonSet.OK
      );
    }
  }
}

/**
 * Send notification when sort fails (for critical errors)
 * @private
 * @param {Error} error - The error that occurred
 */
function notifySortFailure(error) {
  try {
    // Log to stackdriver
    console.error('CRITICAL: Auto-sort failed after all retries', {
      error: error.toString(),
      timestamp: new Date().toISOString(),
      sheet: AUTOSORT_CONFIG.SHEET_NAME
    });
    
    // You could also send an email notification here if needed
    // Example:
    // MailApp.sendEmail({
    //   to: 'admin@example.com',
    //   subject: 'Medical Referral System - Sort Failure',
    //   body: `Automatic sorting failed at ${new Date().toLocaleString()}\n\nError: ${error.message}`
    // });
    
  } catch (notifyError) {
    console.error('Failed to send sort failure notification:', notifyError);
  }
}

/**
 * Get sorting statistics
 * @returns {Object} Statistics about sorting operations
 */
function getSortStatistics() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(AUTOSORT_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Sheet not found');
    }
    
    const lastRow = sheet.getLastRow();
    const props = PropertiesService.getDocumentProperties();
    const lastSort = props.getProperty('LAST_AUTO_SORT');
    
    // Get timestamp range
    let oldestTimestamp = null;
    let newestTimestamp = null;
    
    if (lastRow > 1) {
      const timestamps = sheet.getRange(2, AUTOSORT_CONFIG.TIMESTAMP_COLUMN, lastRow - 1, 1)
        .getValues()
        .filter(row => row[0]) // Filter out empty cells
        .map(row => new Date(row[0]));
      
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a - b);
        oldestTimestamp = timestamps[0];
        newestTimestamp = timestamps[timestamps.length - 1];
      }
    }
    
    return {
      totalRows: lastRow - 1,
      lastSortTime: lastSort ? new Date(lastSort) : null,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp,
      isSorted: checkIfCurrentlySorted(sheet),
      triggerActive: ScriptApp.getProjectTriggers()
        .some(t => t.getHandlerFunction() === 'autoSortByTimestamp')
    };
    
  } catch (error) {
    console.error('Error getting sort statistics:', error);
    return null;
  }
}

/**
 * Check if sheet is currently sorted correctly (oldest to newest)
 * @private
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to check
 * @returns {boolean} True if sorted correctly
 */
function checkIfCurrentlySorted(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 2) {
      return true; // Not enough data to be unsorted
    }
    
    const timestamps = sheet.getRange(2, AUTOSORT_CONFIG.TIMESTAMP_COLUMN, Math.min(lastRow - 1, 100), 1)
      .getValues()
      .map(row => row[0] ? new Date(row[0]).getTime() : 0);
    
    // Check if sorted in ascending order (oldest to newest)
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] < timestamps[i - 1]) {
        return false; // Found newer entry before older one
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('Error checking sort order:', error);
    return false;
  }
}

/**
 * Menu integration - Add to your existing onOpen function
 * This should be called from your main Code.gs file
 */
function addSortMenuItems(ui) {
  return ui.createMenu('⏰ Auto-Sort')
    .addItem('Enable Hourly Sorting', 'createHourlySortTrigger')
    .addItem('Sort Now', 'manualSort')
    .addItem('Check Status', 'checkSortStatus')
    .addItem('View Statistics', 'showSortStatistics')
    .addSeparator()
    .addItem('Disable Auto-Sort', 'disableAutoSort');
}

/**
 * Show sorting statistics in a dialog
 */
function showSortStatistics() {
  try {
    const stats = getSortStatistics();
    
    if (!stats) {
      SpreadsheetApp.getUi().alert('Error', 'Unable to retrieve statistics', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    let message = '📊 Sorting Statistics\n\n';
    message += `Total Data Rows: ${stats.totalRows}\n`;
    message += `Currently Sorted: ${stats.isSorted ? '✅ Yes (oldest → newest)' : '❌ No'}\n`;
    message += `Auto-Sort Active: ${stats.triggerActive ? '✅ Yes' : '❌ No'}\n`;
    message += `Sort Order: Oldest first → Newest last\n\n`;
    
    if (stats.lastSortTime) {
      const timeSince = (new Date() - stats.lastSortTime) / 1000 / 60;
      message += `Last Sort: ${stats.lastSortTime.toLocaleString()}\n`;
      message += `Time Since: ${timeSince.toFixed(0)} minutes ago\n\n`;
    }
    
    if (stats.oldestEntry && stats.newestEntry) {
      message += `Date Range:\n`;
      message += `  First Entry (Top): ${stats.oldestEntry.toLocaleDateString()}\n`;
      message += `  Last Entry (Bottom): ${stats.newestEntry.toLocaleDateString()}`;
    }
    
    SpreadsheetApp.getUi().alert('Sort Statistics', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('Error showing statistics:', error);
    SpreadsheetApp.getUi().alert('Error', `Failed to show statistics: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}