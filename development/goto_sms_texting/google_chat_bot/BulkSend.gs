/**
 * GoTo SMS Texting Tool - Bulk Send Module
 * 
 * BulkSend.gs - Send bulk SMS messages from Google Sheets data
 * 
 * Features:
 * - Batch SMS sending from sheet data
 * - Rate limiting (configurable)
 * - Do-Not-Contact filtering (TCPA compliance)
 * - Progress tracking and status updates
 * - Campaign logging and reporting
 * - Preview/dry-run mode
 */

// ============================================
// CONSTANTS
// ============================================

const BULK_SEND_DEFAULTS = {
  RATE_LIMIT_SECONDS: 1.0,    // Delay between messages
  BATCH_SIZE: 50,              // Max messages per batch
  RETRY_COUNT: 2,              // Number of retries for failed sends
  RETRY_DELAY_SECONDS: 2       // Delay between retries
};

// Send status values
const SendStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  BLOCKED: 'BLOCKED'
};

// ============================================
// SHEET DATA IMPORT
// ============================================

/**
 * Get recipients from a named range or sheet
 * 
 * Expected columns (flexible matching):
 * - phone (required): Phone Number, Mobile, Cell, Telephone
 * - first_name: First Name, FirstName, First, Given Name
 * - last_name: Last Name, LastName, Last, Surname
 * - appointment_date: Appointment Date, Date, Appt Date
 * - appointment_time: Appointment Time, Time, Appt Time
 * 
 * @param {string} sheetName - Name of the sheet containing recipients
 * @param {number} startRow - Starting row (1-based, default 2 to skip header)
 * @param {number} endRow - Ending row (optional, defaults to last row with data)
 * @returns {Array} Array of recipient objects
 */
function getRecipientsFromSheet(sheetName, startRow, endRow) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  
  // Get all data
  const lastRow = endRow || sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const dataRange = sheet.getRange(1, 1, lastRow, lastCol);
  const data = dataRange.getValues();
  
  if (data.length < 2) {
    return []; // Only header or empty
  }
  
  // Parse headers
  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const columnMap = mapColumns(headers);
  
  if (columnMap.phone === -1) {
    throw new Error('Required column "phone" not found. Expected: phone, phone_number, mobile, cell, or telephone');
  }
  
  // Parse recipients
  const recipients = [];
  const start = (startRow || 2) - 1; // Convert to 0-based
  
  for (let i = start; i < data.length; i++) {
    const row = data[i];
    const phone = row[columnMap.phone];
    
    if (!phone) continue; // Skip empty rows
    
    recipients.push({
      rowNumber: i + 1, // 1-based for sheet reference
      phone: phone.toString().trim(),
      firstName: columnMap.firstName >= 0 ? row[columnMap.firstName].toString().trim() : '',
      lastName: columnMap.lastName >= 0 ? row[columnMap.lastName].toString().trim() : '',
      appointmentDate: columnMap.appointmentDate >= 0 ? row[columnMap.appointmentDate].toString().trim() : '',
      appointmentTime: columnMap.appointmentTime >= 0 ? row[columnMap.appointmentTime].toString().trim() : '',
      status: SendStatus.PENDING,
      error: '',
      messageId: ''
    });
  }
  
  Logger.log(`Loaded ${recipients.length} recipients from sheet ${sheetName}`);
  return recipients;
}

/**
 * Map column headers to indices
 */
function mapColumns(headers) {
  const aliases = {
    phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'cell', 'telephone'],
    firstName: ['first_name', 'firstname', 'first', 'fname', 'given_name'],
    lastName: ['last_name', 'lastname', 'last', 'lname', 'surname', 'family_name'],
    appointmentDate: ['appointment_date', 'date', 'appt_date', 'visit_date'],
    appointmentTime: ['appointment_time', 'time', 'appt_time', 'visit_time']
  };
  
  const map = {};
  
  for (const [field, names] of Object.entries(aliases)) {
    map[field] = -1;
    for (const name of names) {
      const idx = headers.indexOf(name);
      if (idx >= 0) {
        map[field] = idx;
        break;
      }
    }
  }
  
  return map;
}

// ============================================
// RECIPIENT VALIDATION
// ============================================

/**
 * Validate a phone number
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
  if (!phone) return false;
  
  // Remove all non-digit characters except leading +
  const cleaned = phone.toString().replace(/[^\d+]/g, '').replace(/\+/g, '');
  
  // Check length (10-15 digits)
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Filter recipients into valid, invalid, and blocked
 * 
 * @param {Array} recipients - Array of recipient objects
 * @returns {Object} {valid: [], invalid: [], blocked: []}
 */
function filterRecipients(recipients) {
  const valid = [];
  const invalid = [];
  const blocked = [];
  
  for (const r of recipients) {
    if (!isValidPhone(r.phone)) {
      r.status = SendStatus.SKIPPED;
      r.error = 'Invalid phone number format';
      invalid.push(r);
    } else if (typeof isPhoneBlocked === 'function' && isPhoneBlocked(r.phone)) {
      r.status = SendStatus.BLOCKED;
      r.error = 'Recipient opted out (STOP)';
      blocked.push(r);
    } else {
      valid.push(r);
    }
  }
  
  Logger.log(`Filtered recipients: ${valid.length} valid, ${invalid.length} invalid, ${blocked.length} blocked`);
  return { valid, invalid, blocked };
}

// ============================================
// MESSAGE FORMATTING
// ============================================

/**
 * Format a message template with recipient data
 * 
 * @param {string} templateName - Template key from MESSAGE_TEMPLATES
 * @param {Object} recipient - Recipient object
 * @returns {string} Formatted message
 */
function formatBulkMessage(templateName, recipient) {
  const template = getTemplate(templateName);
  
  if (!template) {
    throw new Error(`Unknown template: ${templateName}`);
  }
  
  const config = getConfig();
  let message = template.message;
  
  // Replace standard placeholders
  message = message.replace(/{patient_name}/g, recipient.firstName || 'Patient');
  message = message.replace(/{first_name}/g, recipient.firstName || 'Patient');
  message = message.replace(/{last_name}/g, recipient.lastName || '');
  message = message.replace(/{appointment_date}/g, recipient.appointmentDate || 'your scheduled date');
  message = message.replace(/{appointment_time}/g, recipient.appointmentTime || 'your scheduled time');
  message = message.replace(/{practice_name}/g, config.PRACTICE_NAME || 'Our Practice');
  
  return message;
}

// ============================================
// PREVIEW / DRY RUN
// ============================================

/**
 * Preview a bulk send operation without sending
 * 
 * @param {string} sourceSheetName - Sheet with recipient data
 * @param {string} templateName - Template to use
 * @returns {Object} Preview summary
 */
function previewBulkSend(sourceSheetName, templateName) {
  const recipients = getRecipientsFromSheet(sourceSheetName);
  const { valid, invalid, blocked } = filterRecipients(recipients);
  
  // Generate sample messages
  const samples = [];
  for (let i = 0; i < Math.min(3, valid.length); i++) {
    try {
      const message = formatBulkMessage(templateName, valid[i]);
      samples.push({
        phone: valid[i].phone,
        name: `${valid[i].firstName} ${valid[i].lastName}`.trim(),
        messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
      });
    } catch (e) {
      samples.push({
        phone: valid[i].phone,
        error: e.message
      });
    }
  }
  
  const preview = {
    template: templateName,
    sourceSheet: sourceSheetName,
    totalRecipients: recipients.length,
    validRecipients: valid.length,
    invalidRecipients: invalid.length,
    blockedRecipients: blocked.length,
    willSendTo: valid.length,
    estimatedTimeSeconds: valid.length * BULK_SEND_DEFAULTS.RATE_LIMIT_SECONDS,
    sampleMessages: samples
  };
  
  Logger.log('Bulk Send Preview: ' + JSON.stringify(preview, null, 2));
  return preview;
}

// ============================================
// BULK SEND EXECUTION
// ============================================

/**
 * Send bulk SMS messages from a sheet
 * 
 * @param {string} sourceSheetName - Sheet with recipient data
 * @param {string} templateName - Template to use
 * @param {string} campaignName - Optional campaign name for logging
 * @param {number} rateLimit - Seconds between messages (default 1.0)
 * @param {boolean} dryRun - If true, validate but don't send
 * @returns {Object} Result summary
 */
function sendBulkSMS(sourceSheetName, templateName, campaignName, rateLimit, dryRun) {
  const startTime = new Date();
  
  // Default campaign name
  if (!campaignName) {
    campaignName = `Bulk_${Utilities.formatDate(startTime, 'America/New_York', 'yyyyMMdd_HHmmss')}`;
  }
  
  // Default rate limit
  const delay = (rateLimit || BULK_SEND_DEFAULTS.RATE_LIMIT_SECONDS) * 1000;
  
  // Get and filter recipients
  const recipients = getRecipientsFromSheet(sourceSheetName);
  const { valid, invalid, blocked } = filterRecipients(recipients);
  
  // Initialize result
  const result = {
    campaignName: campaignName,
    templateName: templateName,
    startTime: startTime.toISOString(),
    endTime: null,
    totalRecipients: recipients.length,
    sentCount: 0,
    failedCount: 0,
    skippedCount: invalid.length,
    blockedCount: blocked.length,
    recipients: [...invalid, ...blocked]
  };
  
  if (dryRun) {
    Logger.log(`DRY RUN: Would send to ${valid.length} recipients`);
    result.endTime = new Date().toISOString();
    result.dryRun = true;
    valid.forEach(r => {
      r.status = SendStatus.PENDING;
      result.recipients.push(r);
    });
    return result;
  }
  
  // Create/get campaign log sheet
  ensureCampaignLogSheet();
  
  // Send to each valid recipient
  for (let i = 0; i < valid.length; i++) {
    const recipient = valid[i];
    
    try {
      // Format message
      const message = formatBulkMessage(templateName, recipient);
      
      // Send with retry
      let sent = false;
      let lastError = '';
      
      for (let attempt = 0; attempt <= BULK_SEND_DEFAULTS.RETRY_COUNT; attempt++) {
        const response = sendSMS(recipient.phone, message);
        
        if (response.success) {
          recipient.status = SendStatus.SUCCESS;
          recipient.messageId = response.messageId || '';
          result.sentCount++;
          sent = true;
          break;
        } else if (response.blocked) {
          recipient.status = SendStatus.BLOCKED;
          recipient.error = 'Recipient opted out';
          result.blockedCount++;
          sent = true; // Don't retry
          break;
        } else {
          lastError = response.error || 'Unknown error';
          if (attempt < BULK_SEND_DEFAULTS.RETRY_COUNT) {
            Utilities.sleep(BULK_SEND_DEFAULTS.RETRY_DELAY_SECONDS * 1000);
          }
        }
      }
      
      if (!sent) {
        recipient.status = SendStatus.FAILED;
        recipient.error = lastError;
        result.failedCount++;
      }
      
    } catch (e) {
      recipient.status = SendStatus.FAILED;
      recipient.error = e.message;
      result.failedCount++;
    }
    
    result.recipients.push(recipient);
    
    // Rate limiting (except for last message)
    if (i < valid.length - 1) {
      Utilities.sleep(delay);
    }
    
    // Log progress every 10 messages
    if ((i + 1) % 10 === 0) {
      Logger.log(`Progress: ${i + 1}/${valid.length} sent`);
    }
  }
  
  result.endTime = new Date().toISOString();
  
  // Log campaign result
  logCampaignResult(result);
  
  Logger.log(`Bulk send complete: ${result.sentCount}/${valid.length} sent successfully`);
  return result;
}

// ============================================
// CAMPAIGN LOGGING
// ============================================

/**
 * Ensure the Campaign Log sheet exists
 */
function ensureCampaignLogSheet() {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) return;
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Campaign Log');
    
    if (!sheet) {
      sheet = ss.insertSheet('Campaign Log');
      sheet.appendRow([
        'Campaign Name', 'Template', 'Start Time', 'End Time',
        'Total', 'Sent', 'Failed', 'Skipped', 'Blocked',
        'Success Rate', 'Duration (sec)'
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  } catch (e) {
    Logger.log('Error creating Campaign Log sheet: ' + e.message);
  }
}

/**
 * Log a campaign result to the Campaign Log sheet
 * 
 * @param {Object} result - Result from sendBulkSMS
 */
function logCampaignResult(result) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) return;
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Campaign Log');
    
    if (!sheet) return;
    
    const startTime = new Date(result.startTime);
    const endTime = new Date(result.endTime);
    const durationSeconds = (endTime - startTime) / 1000;
    const successRate = result.totalRecipients > 0 
      ? ((result.sentCount / result.totalRecipients) * 100).toFixed(1) + '%'
      : 'N/A';
    
    sheet.appendRow([
      result.campaignName,
      result.templateName,
      startTime,
      endTime,
      result.totalRecipients,
      result.sentCount,
      result.failedCount,
      result.skippedCount,
      result.blockedCount,
      successRate,
      durationSeconds.toFixed(1)
    ]);
    
  } catch (e) {
    Logger.log('Error logging campaign result: ' + e.message);
  }
}

/**
 * Export detailed results to a new sheet
 * 
 * @param {Object} result - Result from sendBulkSMS
 * @returns {string} Name of the created sheet
 */
function exportResultsToSheet(result) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  
  // Create unique sheet name
  const sheetName = `Results_${result.campaignName}`.substring(0, 100);
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet(sheetName);
  
  // Header
  sheet.appendRow(['Row', 'Phone', 'First Name', 'Last Name', 'Status', 'Message ID', 'Error']);
  sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  
  // Data
  for (const r of result.recipients) {
    sheet.appendRow([
      r.rowNumber || '',
      r.phone,
      r.firstName,
      r.lastName,
      r.status,
      r.messageId,
      r.error
    ]);
  }
  
  // Format status column with colors
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const statusRange = sheet.getRange(2, 5, lastRow - 1, 1);
    const statusValues = statusRange.getValues();
    
    for (let i = 0; i < statusValues.length; i++) {
      const cell = sheet.getRange(i + 2, 5);
      switch (statusValues[i][0]) {
        case SendStatus.SUCCESS:
          cell.setBackground('#d4edda'); // Light green
          break;
        case SendStatus.FAILED:
          cell.setBackground('#f8d7da'); // Light red
          break;
        case SendStatus.BLOCKED:
          cell.setBackground('#fff3cd'); // Light yellow
          break;
        case SendStatus.SKIPPED:
          cell.setBackground('#e2e3e5'); // Light gray
          break;
      }
    }
  }
  
  sheet.autoResizeColumns(1, 7);
  Logger.log(`Results exported to sheet: ${sheetName}`);
  
  return sheetName;
}

// ============================================
// SUMMARY GENERATION
// ============================================

/**
 * Generate a human-readable summary of a bulk send result
 * 
 * @param {Object} result - Result from sendBulkSMS
 * @returns {string} Formatted summary
 */
function generateBulkSendSummary(result) {
  const startTime = new Date(result.startTime);
  const endTime = new Date(result.endTime);
  const durationSeconds = (endTime - startTime) / 1000;
  const successRate = result.totalRecipients > 0 
    ? ((result.sentCount / result.totalRecipients) * 100).toFixed(1)
    : 0;
  
  let summary = `
==================================================
BULK SEND SUMMARY: ${result.campaignName}
==================================================
Template: ${result.templateName}
Start: ${Utilities.formatDate(startTime, 'America/New_York', 'yyyy-MM-dd HH:mm:ss')}
End: ${Utilities.formatDate(endTime, 'America/New_York', 'yyyy-MM-dd HH:mm:ss')}
Duration: ${durationSeconds.toFixed(1)} seconds

RESULTS:
  Total Recipients: ${result.totalRecipients}
  Sent Successfully: ${result.sentCount}
  Failed: ${result.failedCount}
  Skipped (invalid): ${result.skippedCount}
  Blocked (opted-out): ${result.blockedCount}
  Success Rate: ${successRate}%
`;

  // Add failed details
  const failed = result.recipients.filter(r => r.status === SendStatus.FAILED);
  if (failed.length > 0) {
    summary += `\nFAILED RECIPIENTS (${failed.length}):\n`;
    for (let i = 0; i < Math.min(10, failed.length); i++) {
      summary += `  - ${failed[i].phone}: ${failed[i].error}\n`;
    }
    if (failed.length > 10) {
      summary += `  ... and ${failed.length - 10} more\n`;
    }
  }
  
  // Add blocked details
  const blockedList = result.recipients.filter(r => r.status === SendStatus.BLOCKED);
  if (blockedList.length > 0) {
    summary += `\nBLOCKED RECIPIENTS (${blockedList.length}):\n`;
    for (let i = 0; i < Math.min(5, blockedList.length); i++) {
      summary += `  - ${blockedList[i].phone} (opted out)\n`;
    }
    if (blockedList.length > 5) {
      summary += `  ... and ${blockedList.length - 5} more\n`;
    }
  }
  
  summary += '==================================================\n';
  
  return summary;
}

// ============================================
// USER INTERFACE FUNCTIONS
// ============================================

/**
 * Show bulk send dialog in the spreadsheet
 */
function showBulkSendDialog() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; }
      .form-group { margin-bottom: 15px; }
      label { display: block; margin-bottom: 5px; font-weight: bold; }
      select, input { width: 100%; padding: 8px; box-sizing: border-box; }
      button { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
      .primary { background: #4285f4; color: white; border: none; }
      .secondary { background: #f1f3f4; border: 1px solid #ddd; }
      .preview { background: #f8f9fa; padding: 10px; margin-top: 15px; border-radius: 4px; }
    </style>
    
    <h3>Bulk SMS Send</h3>
    
    <div class="form-group">
      <label>Source Sheet (with recipients):</label>
      <input type="text" id="sheetName" placeholder="e.g., Patients, Appointments">
    </div>
    
    <div class="form-group">
      <label>Message Template:</label>
      <select id="template">
        <option value="appointment_reminder">Appointment Reminder</option>
        <option value="appointment_confirmation">Appointment Confirmation</option>
        <option value="kidney_video">Kidney Treatment Video</option>
        <option value="follow_up">Follow-up Message</option>
        <option value="prescription_ready">Prescription Ready</option>
        <option value="thank_you">Thank You</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>Campaign Name (optional):</label>
      <input type="text" id="campaign" placeholder="Auto-generated if empty">
    </div>
    
    <div class="form-group">
      <label>Rate Limit (seconds between messages):</label>
      <input type="number" id="rate" value="1.0" min="0.5" step="0.5">
    </div>
    
    <button class="secondary" onclick="preview()">Preview</button>
    <button class="primary" onclick="send()">Send Messages</button>
    
    <div id="result" class="preview" style="display:none;"></div>
    
    <script>
      function preview() {
        const sheet = document.getElementById('sheetName').value;
        const template = document.getElementById('template').value;
        
        if (!sheet) {
          alert('Please enter a sheet name');
          return;
        }
        
        google.script.run
          .withSuccessHandler(showResult)
          .withFailureHandler(showError)
          .previewBulkSend(sheet, template);
      }
      
      function send() {
        const sheet = document.getElementById('sheetName').value;
        const template = document.getElementById('template').value;
        const campaign = document.getElementById('campaign').value;
        const rate = parseFloat(document.getElementById('rate').value);
        
        if (!sheet) {
          alert('Please enter a sheet name');
          return;
        }
        
        if (!confirm('Send bulk messages now?')) {
          return;
        }
        
        google.script.run
          .withSuccessHandler(showResult)
          .withFailureHandler(showError)
          .sendBulkSMS(sheet, template, campaign, rate, false);
      }
      
      function showResult(result) {
        const div = document.getElementById('result');
        div.style.display = 'block';
        div.innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
      }
      
      function showError(error) {
        alert('Error: ' + error.message);
      }
    </script>
  `)
    .setWidth(400)
    .setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Bulk SMS Send');
}

/**
 * Add custom menu to spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('SMS Tools')
    .addItem('Bulk Send...', 'showBulkSendDialog')
    .addItem('View Campaign Log', 'goToCampaignLog')
    .addSeparator()
    .addItem('Update Analytics', 'updateAnalyticsDashboard')
    .addToUi();
}

/**
 * Navigate to Campaign Log sheet
 */
function goToCampaignLog() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Campaign Log');
  
  if (sheet) {
    ss.setActiveSheet(sheet);
  } else {
    SpreadsheetApp.getUi().alert('Campaign Log sheet not found. Run a bulk send first.');
  }
}

// ============================================
// TEST FUNCTIONS
// ============================================

/**
 * Test bulk send with dry run
 */
function testBulkSendDryRun() {
  // First create a test sheet with sample data
  createTestRecipientsSheet();
  
  // Preview
  const preview = previewBulkSend('Test Recipients', 'appointment_reminder');
  Logger.log('Preview: ' + JSON.stringify(preview, null, 2));
  
  // Dry run
  const result = sendBulkSMS('Test Recipients', 'appointment_reminder', 'Test_Campaign', 1.0, true);
  Logger.log('Dry Run Result: ' + JSON.stringify(result, null, 2));
  Logger.log(generateBulkSendSummary(result));
}

/**
 * Create a test recipients sheet for testing
 */
function createTestRecipientsSheet() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  
  let sheet = ss.getSheetByName('Test Recipients');
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet('Test Recipients');
  
  // Header
  sheet.appendRow(['Phone', 'First Name', 'Last Name', 'Appointment Date', 'Appointment Time']);
  
  // Sample data
  const testData = [
    ['+15145551001', 'John', 'Smith', 'December 15, 2024', '9:00 AM'],
    ['+15145551002', 'Jane', 'Doe', 'December 15, 2024', '10:30 AM'],
    ['+15145551003', 'Bob', 'Johnson', 'December 16, 2024', '2:00 PM'],
    ['invalid-phone', 'Test', 'Invalid', 'December 17, 2024', '3:00 PM'],
    ['+15145551005', 'Alice', 'Williams', 'December 18, 2024', '11:00 AM']
  ];
  
  for (const row of testData) {
    sheet.appendRow(row);
  }
  
  sheet.autoResizeColumns(1, 5);
  Logger.log('Test Recipients sheet created with 5 sample records');
}

/**
 * Test the complete bulk send flow (actual send - use with caution!)
 */
function testBulkSendActual() {
  // WARNING: This will actually send messages!
  // Only run if you have a test sheet with test phone numbers
  
  const confirm = Browser.msgBox(
    'Warning',
    'This will send ACTUAL SMS messages. Continue?',
    Browser.Buttons.YES_NO
  );
  
  if (confirm !== 'yes') {
    Logger.log('Test cancelled');
    return;
  }
  
  const result = sendBulkSMS('Test Recipients', 'appointment_reminder', 'Actual_Test', 1.0, false);
  Logger.log(generateBulkSendSummary(result));
  
  // Export results
  const exportSheet = exportResultsToSheet(result);
  Logger.log('Results exported to: ' + exportSheet);
}
