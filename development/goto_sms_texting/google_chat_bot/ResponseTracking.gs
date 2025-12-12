/**
 * GoTo SMS Texting Tool - Response Tracking
 * 
 * ResponseTracking.gs - Handles incoming SMS responses via webhook
 * 
 * Features:
 * - Webhook endpoint for GoTo incoming SMS notifications
 * - Response parsing (CONFIRM, STOP, YES, NO, HELP, START)
 * - Do-Not-Contact list management
 * - Appointment confirmation tracking
 * - Analytics and reporting
 */

// ============================================
// RESPONSE KEYWORDS
// ============================================

const RESPONSE_KEYWORDS = {
  // Confirmation keywords - mark appointment as confirmed
  CONFIRM: ['CONFIRM', 'YES', 'Y', 'CONFIRMED', 'OK', 'OKAY'],
  
  // Stop keywords - add to do-not-contact list (TCPA compliance)
  STOP: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPTOUT', 'OPT-OUT', 'QUIT', 'END'],
  
  // Re-subscribe keywords - remove from do-not-contact list
  START: ['START', 'SUBSCRIBE', 'OPTIN', 'OPT-IN', 'RESUME', 'UNSTOP'],
  
  // Help keywords - send help message
  HELP: ['HELP', 'INFO', '?']
};

// Help response message
const HELP_MESSAGE = "Reply CONFIRM to confirm your appointment. Reply STOP to opt out of messages.";

// ============================================
// WEB APP ENDPOINT (Webhook Handler)
// ============================================

/**
 * Handle GET requests (used for webhook verification)
 * 
 * @param {Object} e - Event object from Apps Script
 * @returns {Object} Text output for verification
 */
function doGet(e) {
  // Return simple acknowledgment for webhook verification
  return ContentService.createTextOutput('GoTo SMS Webhook Active')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handle POST requests (incoming SMS notifications from GoTo)
 * 
 * @param {Object} e - Event object containing webhook payload
 * @returns {Object} JSON response
 */
function doPost(e) {
  try {
    // Parse the incoming webhook payload
    let payload;
    
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    } else {
      Logger.log('No payload received');
      return createJsonResponse({ status: 'error', message: 'No payload' });
    }
    
    Logger.log('Webhook received: ' + JSON.stringify(payload));
    
    // Process the incoming message
    const result = processIncomingMessage(payload);
    
    return createJsonResponse({ status: 'success', result: result });
    
  } catch (error) {
    Logger.log('Webhook error: ' + error.toString());
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Create a JSON response for the webhook
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// MESSAGE PROCESSING
// ============================================

/**
 * Process an incoming SMS message
 * 
 * @param {Object} payload - Webhook payload from GoTo
 * @returns {Object} Processing result
 */
function processIncomingMessage(payload) {
  // Extract message details from GoTo webhook format
  // Note: Actual field names depend on GoTo's webhook structure
  const fromNumber = payload.from || payload.contactPhoneNumber || payload.sender;
  const messageBody = payload.body || payload.text || payload.message || '';
  const timestamp = payload.timestamp || new Date().toISOString();
  const messageId = payload.id || payload.messageId || '';
  
  if (!fromNumber) {
    Logger.log('No sender phone number in payload');
    return { action: 'error', error: 'Missing sender phone number' };
  }
  
  // Classify the response
  const classification = classifyResponse(messageBody);
  
  // Log the incoming message
  logIncomingMessage(fromNumber, messageBody, classification, messageId, timestamp);
  
  // Process based on classification
  switch (classification) {
    case 'CONFIRM':
      return processConfirmation(fromNumber, messageBody);
      
    case 'STOP':
      return processOptOut(fromNumber, messageBody);
      
    case 'START':
      return processOptIn(fromNumber, messageBody);
      
    case 'HELP':
      return processHelpRequest(fromNumber);
      
    default:
      return { action: 'logged', classification: 'OTHER', message: 'Logged for review' };
  }
}

/**
 * Classify an incoming message based on keywords
 * 
 * @param {string} message - The message body
 * @returns {string} Classification (CONFIRM, STOP, START, HELP, or OTHER)
 */
function classifyResponse(message) {
  if (!message) return 'OTHER';
  
  // Clean and uppercase for comparison
  const cleaned = message.toString().trim().toUpperCase();
  
  // Check each category
  for (const [category, keywords] of Object.entries(RESPONSE_KEYWORDS)) {
    for (const keyword of keywords) {
      // Check if message starts with keyword or is exactly the keyword
      if (cleaned === keyword || cleaned.startsWith(keyword + ' ')) {
        return category;
      }
    }
  }
  
  return 'OTHER';
}

// ============================================
// CONFIRMATION PROCESSING
// ============================================

/**
 * Process a CONFIRM response
 * 
 * @param {string} phoneNumber - Patient's phone number
 * @param {string} message - Original message
 * @returns {Object} Processing result
 */
function processConfirmation(phoneNumber, message) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) {
    return { action: 'confirm', status: 'no_spreadsheet' };
  }
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    
    // Ensure Confirmations sheet exists
    let sheet = ss.getSheetByName('Confirmations');
    if (!sheet) {
      sheet = ss.insertSheet('Confirmations');
      sheet.appendRow([
        'Timestamp', 'Phone Number', 'Response', 'Status', 
        'Matched Appointment', 'Original Message Timestamp'
      ]);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }
    
    // Try to match with a pending appointment from Message Log
    const matchResult = findPendingAppointment(phoneNumber);
    
    // Log the confirmation
    sheet.appendRow([
      new Date(),
      phoneNumber,
      message,
      'CONFIRMED',
      matchResult.found ? matchResult.appointmentInfo : 'No pending appointment found',
      matchResult.found ? matchResult.originalTimestamp : 'N/A'
    ]);
    
    Logger.log(`Confirmation logged for ${phoneNumber}`);
    
    return { 
      action: 'confirm', 
      status: 'success', 
      matched: matchResult.found,
      appointmentInfo: matchResult.appointmentInfo
    };
    
  } catch (error) {
    Logger.log('Error processing confirmation: ' + error.toString());
    return { action: 'confirm', status: 'error', error: error.toString() };
  }
}

/**
 * Find a pending appointment for a phone number
 * 
 * @param {string} phoneNumber - Patient's phone number
 * @returns {Object} Match result
 */
function findPendingAppointment(phoneNumber) {
  const config = getConfig();
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Message Log');
    
    if (!sheet) {
      return { found: false };
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Search from most recent to oldest (skip header)
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const rowPhone = row[1]; // Phone Number column
      const rowMessage = row[2]; // Message column
      const rowTimestamp = row[0]; // Timestamp column
      
      // Clean phone numbers for comparison
      const cleanRowPhone = rowPhone ? rowPhone.toString().replace(/\D/g, '') : '';
      const cleanSearchPhone = phoneNumber.replace(/\D/g, '');
      
      if (cleanRowPhone === cleanSearchPhone || 
          cleanRowPhone.endsWith(cleanSearchPhone) || 
          cleanSearchPhone.endsWith(cleanRowPhone)) {
        
        // Check if this was a reminder or confirmation message
        if (rowMessage && (
            rowMessage.includes('reminder') || 
            rowMessage.includes('appointment') ||
            rowMessage.includes('CONFIRM'))) {
          return {
            found: true,
            appointmentInfo: rowMessage.substring(0, 100),
            originalTimestamp: rowTimestamp
          };
        }
      }
    }
    
    return { found: false };
    
  } catch (error) {
    Logger.log('Error finding appointment: ' + error.toString());
    return { found: false };
  }
}

// ============================================
// OPT-OUT / STOP PROCESSING (TCPA Compliance)
// ============================================

/**
 * Process a STOP/opt-out request
 * 
 * @param {string} phoneNumber - Patient's phone number
 * @param {string} message - Original message
 * @returns {Object} Processing result
 */
function processOptOut(phoneNumber, message) {
  const config = getConfig();
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    
    // Ensure Do Not Contact sheet exists
    let sheet = ss.getSheetByName('Do Not Contact');
    if (!sheet) {
      sheet = ss.insertSheet('Do Not Contact');
      sheet.appendRow(['Phone Number', 'Added Date', 'Reason', 'Original Message', 'Status']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }
    
    // Check if already in list
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const existingPhone = data[i][0];
      if (normalizePhone(existingPhone) === normalizePhone(phoneNumber)) {
        Logger.log(`${phoneNumber} already in Do Not Contact list`);
        return { action: 'stop', status: 'already_opted_out' };
      }
    }
    
    // Add to do-not-contact list
    sheet.appendRow([
      phoneNumber,
      new Date(),
      'STOP request',
      message,
      'ACTIVE'
    ]);
    
    Logger.log(`Added ${phoneNumber} to Do Not Contact list`);
    
    return { action: 'stop', status: 'success', message: 'Added to Do Not Contact list' };
    
  } catch (error) {
    Logger.log('Error processing opt-out: ' + error.toString());
    return { action: 'stop', status: 'error', error: error.toString() };
  }
}

/**
 * Process a START/opt-in request (re-subscribe)
 * 
 * @param {string} phoneNumber - Patient's phone number
 * @param {string} message - Original message
 * @returns {Object} Processing result
 */
function processOptIn(phoneNumber, message) {
  const config = getConfig();
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Do Not Contact');
    
    if (!sheet) {
      return { action: 'start', status: 'not_in_list' };
    }
    
    // Find and update status
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const existingPhone = data[i][0];
      if (normalizePhone(existingPhone) === normalizePhone(phoneNumber)) {
        // Update status to REMOVED
        sheet.getRange(i + 1, 5).setValue('REMOVED - Re-subscribed');
        sheet.getRange(i + 1, 2).setValue(new Date()); // Update date
        
        Logger.log(`Removed ${phoneNumber} from Do Not Contact list`);
        return { action: 'start', status: 'success', message: 'Removed from Do Not Contact list' };
      }
    }
    
    return { action: 'start', status: 'not_in_list' };
    
  } catch (error) {
    Logger.log('Error processing opt-in: ' + error.toString());
    return { action: 'start', status: 'error', error: error.toString() };
  }
}

/**
 * Check if a phone number is on the Do Not Contact list
 * 
 * @param {string} phoneNumber - Phone number to check
 * @returns {boolean} True if phone is blocked
 */
function isPhoneBlocked(phoneNumber) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) return false;
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Do Not Contact');
    
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const normalizedSearch = normalizePhone(phoneNumber);
    
    for (let i = 1; i < data.length; i++) {
      const existingPhone = data[i][0];
      const status = data[i][4];
      
      if (normalizePhone(existingPhone) === normalizedSearch && status === 'ACTIVE') {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log('Error checking blocked status: ' + error.toString());
    return false;
  }
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '').slice(-10);
}

// ============================================
// HELP REQUEST PROCESSING
// ============================================

/**
 * Process a HELP request
 * 
 * @param {string} phoneNumber - Patient's phone number
 * @returns {Object} Processing result
 */
function processHelpRequest(phoneNumber) {
  // Send help message back
  const result = sendSMS(phoneNumber, HELP_MESSAGE);
  
  if (result.success) {
    return { action: 'help', status: 'success', message: 'Help message sent' };
  } else {
    return { action: 'help', status: 'error', error: result.error };
  }
}

// ============================================
// INCOMING MESSAGE LOGGING
// ============================================

/**
 * Log an incoming message to the spreadsheet
 * 
 * @param {string} fromNumber - Sender's phone number
 * @param {string} message - Message content
 * @param {string} classification - Message classification
 * @param {string} messageId - GoTo message ID
 * @param {string} timestamp - Message timestamp
 */
function logIncomingMessage(fromNumber, message, classification, messageId, timestamp) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) return;
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Incoming Messages');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Incoming Messages');
      sheet.appendRow([
        'Received At', 'From Number', 'Message', 'Classification', 
        'Message ID', 'Processed', 'Notes'
      ]);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    }
    
    // Flag messages needing manual review
    const needsReview = classification === 'OTHER';
    
    sheet.appendRow([
      new Date(timestamp) || new Date(),
      fromNumber,
      message,
      classification,
      messageId,
      needsReview ? 'NEEDS REVIEW' : 'AUTO-PROCESSED',
      ''
    ]);
    
  } catch (error) {
    Logger.log('Failed to log incoming message: ' + error.toString());
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get message analytics for a date range
 * 
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Object} Analytics summary
 */
function getAnalytics(startDate, endDate) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) {
    return { error: 'No spreadsheet configured' };
  }
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    
    // Default to last 30 days if no dates provided
    if (!startDate) startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (!endDate) endDate = new Date();
    
    const analytics = {
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      outbound: {
        total: 0,
        success: 0,
        failed: 0,
        byTemplate: {}
      },
      inbound: {
        total: 0,
        confirmations: 0,
        stops: 0,
        starts: 0,
        help: 0,
        other: 0
      },
      rates: {
        deliveryRate: 0,
        responseRate: 0,
        confirmationRate: 0,
        optOutRate: 0
      }
    };
    
    // Count outbound messages
    const msgSheet = ss.getSheetByName('Message Log');
    if (msgSheet) {
      const msgData = msgSheet.getDataRange().getValues();
      for (let i = 1; i < msgData.length; i++) {
        const timestamp = new Date(msgData[i][0]);
        if (timestamp >= startDate && timestamp <= endDate) {
          analytics.outbound.total++;
          if (msgData[i][3] === 'SUCCESS') {
            analytics.outbound.success++;
          } else {
            analytics.outbound.failed++;
          }
        }
      }
    }
    
    // Count inbound messages
    const inSheet = ss.getSheetByName('Incoming Messages');
    if (inSheet) {
      const inData = inSheet.getDataRange().getValues();
      for (let i = 1; i < inData.length; i++) {
        const timestamp = new Date(inData[i][0]);
        if (timestamp >= startDate && timestamp <= endDate) {
          analytics.inbound.total++;
          const classification = inData[i][3];
          switch (classification) {
            case 'CONFIRM': analytics.inbound.confirmations++; break;
            case 'STOP': analytics.inbound.stops++; break;
            case 'START': analytics.inbound.starts++; break;
            case 'HELP': analytics.inbound.help++; break;
            default: analytics.inbound.other++;
          }
        }
      }
    }
    
    // Calculate rates
    if (analytics.outbound.total > 0) {
      analytics.rates.deliveryRate = ((analytics.outbound.success / analytics.outbound.total) * 100).toFixed(1) + '%';
      analytics.rates.responseRate = ((analytics.inbound.total / analytics.outbound.total) * 100).toFixed(1) + '%';
      analytics.rates.confirmationRate = ((analytics.inbound.confirmations / analytics.outbound.total) * 100).toFixed(1) + '%';
      analytics.rates.optOutRate = ((analytics.inbound.stops / analytics.outbound.total) * 100).toFixed(1) + '%';
    }
    
    return analytics;
    
  } catch (error) {
    Logger.log('Error getting analytics: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * Create/update the Analytics dashboard sheet
 */
function updateAnalyticsDashboard() {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) return;
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Analytics');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Analytics');
    } else {
      sheet.clear();
    }
    
    // Get analytics for different periods
    const today = new Date();
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today - 30 * 24 * 60 * 60 * 1000);
    
    const weeklyStats = getAnalytics(weekAgo, today);
    const monthlyStats = getAnalytics(monthAgo, today);
    
    // Build dashboard
    sheet.appendRow(['SMS Analytics Dashboard', '', 'Last Updated: ' + new Date().toLocaleString()]);
    sheet.appendRow(['']);
    
    // Weekly stats
    sheet.appendRow(['=== Last 7 Days ===']);
    sheet.appendRow(['Messages Sent', weeklyStats.outbound?.total || 0]);
    sheet.appendRow(['Successful', weeklyStats.outbound?.success || 0]);
    sheet.appendRow(['Failed', weeklyStats.outbound?.failed || 0]);
    sheet.appendRow(['Responses Received', weeklyStats.inbound?.total || 0]);
    sheet.appendRow(['Confirmations', weeklyStats.inbound?.confirmations || 0]);
    sheet.appendRow(['Opt-Outs (STOP)', weeklyStats.inbound?.stops || 0]);
    sheet.appendRow(['Delivery Rate', weeklyStats.rates?.deliveryRate || 'N/A']);
    sheet.appendRow(['Response Rate', weeklyStats.rates?.responseRate || 'N/A']);
    sheet.appendRow(['']);
    
    // Monthly stats
    sheet.appendRow(['=== Last 30 Days ===']);
    sheet.appendRow(['Messages Sent', monthlyStats.outbound?.total || 0]);
    sheet.appendRow(['Successful', monthlyStats.outbound?.success || 0]);
    sheet.appendRow(['Responses Received', monthlyStats.inbound?.total || 0]);
    sheet.appendRow(['Confirmations', monthlyStats.inbound?.confirmations || 0]);
    sheet.appendRow(['Opt-Outs (STOP)', monthlyStats.inbound?.stops || 0]);
    sheet.appendRow(['Response Rate', monthlyStats.rates?.responseRate || 'N/A']);
    sheet.appendRow(['Confirmation Rate', monthlyStats.rates?.confirmationRate || 'N/A']);
    sheet.appendRow(['Opt-Out Rate', monthlyStats.rates?.optOutRate || 'N/A']);
    
    // Format
    sheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');
    sheet.getRange('A3').setFontWeight('bold');
    sheet.getRange('A13').setFontWeight('bold');
    sheet.autoResizeColumns(1, 3);
    
    Logger.log('Analytics dashboard updated');
    
  } catch (error) {
    Logger.log('Error updating analytics: ' + error.toString());
  }
}

// ============================================
// WEEKLY REPORT
// ============================================

/**
 * Generate and optionally email a weekly summary report
 * 
 * @param {string} emailTo - Email address to send report (optional)
 */
function sendWeeklyReport(emailTo) {
  const analytics = getAnalytics(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date()
  );
  
  if (analytics.error) {
    Logger.log('Could not generate report: ' + analytics.error);
    return;
  }
  
  const config = getConfig();
  const practiceName = config.PRACTICE_NAME || 'Your Practice';
  
  const report = `
SMS Communication Weekly Report
${practiceName}
Week ending: ${new Date().toLocaleDateString()}

OUTBOUND MESSAGES
-----------------
Total Sent: ${analytics.outbound.total}
Successful: ${analytics.outbound.success}
Failed: ${analytics.outbound.failed}
Delivery Rate: ${analytics.rates.deliveryRate}

PATIENT RESPONSES
-----------------
Total Responses: ${analytics.inbound.total}
Confirmations: ${analytics.inbound.confirmations}
Opt-Outs: ${analytics.inbound.stops}
Re-subscriptions: ${analytics.inbound.starts}
Help Requests: ${analytics.inbound.help}
Other: ${analytics.inbound.other}

KEY METRICS
-----------
Response Rate: ${analytics.rates.responseRate}
Confirmation Rate: ${analytics.rates.confirmationRate}
Opt-Out Rate: ${analytics.rates.optOutRate}

---
Generated by GoTo SMS Bot
  `;
  
  Logger.log(report);
  
  // Send email if address provided
  if (emailTo) {
    try {
      GmailApp.sendEmail(emailTo, 
        `SMS Weekly Report - ${practiceName}`, 
        report
      );
      Logger.log('Weekly report sent to ' + emailTo);
    } catch (error) {
      Logger.log('Could not send email: ' + error.toString());
    }
  }
  
  return report;
}

// ============================================
// SCHEDULED TRIGGERS
// ============================================

/**
 * Set up scheduled triggers for analytics updates
 * Run this once to set up automatic updates
 */
function setupScheduledTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateAnalyticsDashboard') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Update analytics daily at 6 AM
  ScriptApp.newTrigger('updateAnalyticsDashboard')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  
  Logger.log('Scheduled triggers set up successfully');
}

// ============================================
// TESTING FUNCTIONS
// ============================================

/**
 * Test response classification
 */
function testClassification() {
  const testCases = [
    'CONFIRM',
    'Yes',
    'y',
    'STOP',
    'stop please',
    'unsubscribe',
    'HELP',
    'START',
    'Hello there',
    'I have a question'
  ];
  
  testCases.forEach(msg => {
    const result = classifyResponse(msg);
    Logger.log(`"${msg}" => ${result}`);
  });
}

/**
 * Test webhook handler with sample payload
 */
function testWebhook() {
  const samplePayload = {
    from: '+15145550199',
    body: 'CONFIRM',
    timestamp: new Date().toISOString(),
    id: 'test-123'
  };
  
  const result = processIncomingMessage(samplePayload);
  Logger.log('Test result: ' + JSON.stringify(result, null, 2));
}

/**
 * Test analytics
 */
function testAnalytics() {
  const analytics = getAnalytics();
  Logger.log('Analytics: ' + JSON.stringify(analytics, null, 2));
}
