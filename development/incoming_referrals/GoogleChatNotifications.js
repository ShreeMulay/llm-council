/**
 * ============================================================================
 * GOOGLECHATNOTIFICATIONS.JS - Real-Time Google Chat Notifications
 * ============================================================================
 * 
 * @fileoverview Sends formatted notifications to Google Chat for new referrals
 * @author The Kidney Experts, PLLC
 * @version 1.1.0
 * @lastModified 2025-12-05
 * 
 * DESCRIPTION:
 * This module handles real-time notifications to Google Chat when new
 * referrals are submitted. Features include:
 *   - Rich formatted message cards
 *   - Self-referral vs provider referral detection
 *   - Provider statistics (#3 feature)
 *   - Missing data alerts (#4 feature)
 *   - Email escalation for EMERGENT/URGENT (#5 feature)
 *   - Marketing source categorization for self-referrals
 * 
 * DEPENDENCIES:
 *   - Dict_NotificationConfig.js (NOTIFICATION_CONFIG, MARKETING_CATEGORIES)
 *   - GeminiTriage.js (for AI priority data)
 * 
 * ============================================================================
 */

// ============================================================================
// MAIN NOTIFICATION FUNCTION
// ============================================================================

/**
 * Send a notification for a new referral
 * Called from OnFormSubmit.js after processing
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number of the new referral
 * @returns {Object} Result object with success status
 */
function sendReferralNotification(sheet, row) {
  try {
    // Extract all data from the row
    const rowData = extractRowData(sheet, row);
    
    // Determine if self-referral
    const isSelfReferral = rowData.selfReferral === 'Yes';
    
    // Build the notification card
    const card = isSelfReferral 
      ? buildSelfReferralCard(rowData, row)
      : buildProviderReferralCard(rowData, row);
    
    // Send to Google Chat
    const chatResult = sendToGoogleChat(card);
    
    // Send email escalation if needed
    if (shouldEscalate(rowData.aiPriority)) {
      sendEscalationEmail(rowData, row);
    }
    
    console.log(`Notification sent for row ${row}: ${chatResult.success ? 'Success' : 'Failed'}`);
    
    return {
      success: chatResult.success,
      escalated: shouldEscalate(rowData.aiPriority),
      type: isSelfReferral ? 'self-referral' : 'provider-referral'
    };
    
  } catch (error) {
    console.error('Error sending notification for row ' + row + ':', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// DATA EXTRACTION
// ============================================================================

/**
 * Extract all relevant data from a row
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The spreadsheet sheet
 * @param {number} row - The row number
 * @returns {Object} Extracted data object
 */
function extractRowData(sheet, row) {
  const cols = NOTIFICATION_CONFIG.COLUMNS;
  const getValue = (col) => {
    const val = sheet.getRange(row, col).getValue();
    return val !== null && val !== undefined ? val : '';
  };
  
  return {
    timestamp: getValue(cols.TIMESTAMP),
    selfReferral: getValue(cols.SELF_REFERRAL),
    howHeard: getValue(cols.HOW_HEARD),
    clinic: getValue(cols.CLINIC),
    provider: getValue(cols.PROVIDER),
    patientLast: getValue(cols.PATIENT_LAST),
    patientFirst: getValue(cols.PATIENT_FIRST),
    dob: getValue(cols.DOB),
    sex: getValue(cols.SEX),
    selfPay: getValue(cols.SELF_PAY),
    primaryInsurance: getValue(cols.PRIMARY_INSURANCE),
    city: getValue(cols.CITY),
    state: getValue(cols.STATE),
    patientPhone: getValue(cols.PATIENT_PHONE),
    labDate: getValue(cols.LAB_DATE),
    reason: getValue(cols.REASON),
    creatinine: getValue(cols.CREATININE),
    gfr: getValue(cols.GFR),
    aiPriority: getValue(cols.AI_PRIORITY),
    aiReasoning: getValue(cols.AI_REASONING)
  };
}

// ============================================================================
// CARD BUILDERS
// ============================================================================

/**
 * Build notification card for provider referrals
 * @param {Object} data - Row data
 * @param {number} row - Row number
 * @returns {Object} Google Chat card payload
 */
function buildProviderReferralCard(data, row) {
  const priority = getPriorityConfig(data.aiPriority);
  const age = calculateAge(data.dob);
  const labDaysAgo = calculateDaysAgo(data.labDate);
  const missingFields = checkMissingData(data);
  const providerStats = getProviderMonthlyStats(data.provider);
  
  // Build text sections
  let text = '';
  
  // Header
  text += `*${priority.emoji} ${priority.label} REFERRAL*\n`;
  text += `⏰ ${priority.guidance}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Patient Info
  text += `👤 *Patient:* ${data.patientLast}, ${data.patientFirst}`;
  if (data.sex) text += ` (${data.sex})`;
  text += `\n`;
  text += `🎂 *DOB:* ${formatDate(data.dob)}`;
  if (age !== null) text += ` (${age} yo)`;
  text += `\n`;
  text += `📞 *Phone:* ${formatPhone(data.patientPhone) || 'Not provided'}\n`;
  text += `📍 *Location:* ${data.city || '?'}, ${data.state || '?'}\n`;
  text += `💳 *Insurance:* ${getInsuranceDisplay(data)}\n`;
  text += `🙋 *Self-Referral:* No\n`;
  text += `\n`;
  
  // Clinic/Provider Info
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏥 *Clinic:* ${data.clinic || 'Unknown'}\n`;
  text += `👨‍⚕️ *Provider:* ${data.provider || 'Unknown'}\n`;
  if (providerStats.count > 0) {
    text += `📊 *This Month:* ${providerStats.count} referrals`;
    if (providerStats.rank <= 10) {
      text += ` (#${providerStats.rank} top referrer)`;
    }
    text += `\n`;
  }
  text += `\n`;
  
  // Clinical Info
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📝 *Reason:* ${truncateText(data.reason, 200) || 'Not provided'}\n`;
  text += `🧪 *Creatinine:* ${data.creatinine || 'Not provided'}${data.creatinine ? ' mg/dL' : ''}\n`;
  text += `📊 *GFR:* ${data.gfr || 'Not provided'}${data.gfr ? ' mL/min' : ''}\n`;
  text += `📅 *Labs:* ${formatDate(data.labDate) || 'Not provided'}`;
  if (labDaysAgo !== null) text += ` (${labDaysAgo} days ago)`;
  text += `\n\n`;
  
  // AI Assessment (full reasoning - no truncation to preserve clinical context)
  if (data.aiReasoning) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🤖 *AI Assessment:*\n`;
    text += `"${data.aiReasoning}"\n\n`;
  }
  
  // Missing Data Alert
  if (missingFields.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ *Missing:* ${missingFields.join(', ')}\n\n`;
  }
  
  // Escalation Notice
  if (shouldEscalate(data.aiPriority)) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📧 *ESCALATED:* Email sent to leadership\n\n`;
  }
  
  // Footer
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🕐 *Received:* ${formatTimestamp(data.timestamp)}\n`;
  text += `🔗 <${getRowUrl(row)}|View in Sheet>\n`;
  
  return { text: text };
}

/**
 * Build notification card for self-referrals
 * @param {Object} data - Row data
 * @param {number} row - Row number
 * @returns {Object} Google Chat card payload
 */
function buildSelfReferralCard(data, row) {
  const priority = getPriorityConfig(data.aiPriority);
  const age = calculateAge(data.dob);
  const labDaysAgo = calculateDaysAgo(data.labDate);
  const missingFields = checkMissingData(data);
  const marketingSource = categorizeMarketingSource(data.howHeard);
  
  // Build text sections
  let text = '';
  
  // Header - Different for self-referral
  text += `*🙋 SELF-REFERRAL - ${priority.label}*\n`;
  text += `${priority.emoji} ${priority.guidance}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Patient Info
  text += `👤 *Patient:* ${data.patientLast}, ${data.patientFirst}`;
  if (data.sex) text += ` (${data.sex})`;
  text += `\n`;
  text += `🎂 *DOB:* ${formatDate(data.dob)}`;
  if (age !== null) text += ` (${age} yo)`;
  text += `\n`;
  text += `📞 *Phone:* ${formatPhone(data.patientPhone) || 'Not provided'}\n`;
  text += `📍 *Location:* ${data.city || '?'}, ${data.state || '?'}\n`;
  text += `💳 *Insurance:* ${getInsuranceDisplay(data)}\n\n`;
  
  // Marketing Source Section (instead of Clinic/Provider)
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📣 *Source:* ${marketingSource.icon} ${marketingSource.label}\n`;
  if (data.howHeard && data.howHeard.toString().trim() !== '') {
    text += `💬 _"${truncateText(data.howHeard, 120)}"_\n`;
  }
  text += `\n`;
  
  // Clinical Info
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📝 *Reason:* ${truncateText(data.reason, 200) || 'Not provided'}\n`;
  text += `🧪 *Creatinine:* ${data.creatinine || 'Not provided'}${data.creatinine ? ' mg/dL' : ''}\n`;
  text += `📊 *GFR:* ${data.gfr || 'Not provided'}${data.gfr ? ' mL/min' : ''}\n`;
  text += `📅 *Labs:* ${formatDate(data.labDate) || 'Not provided'}`;
  if (labDaysAgo !== null) text += ` (${labDaysAgo} days ago)`;
  text += `\n\n`;
  
  // AI Assessment (full reasoning - no truncation to preserve clinical context)
  if (data.aiReasoning) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🤖 *AI Assessment:*\n`;
    text += `"${data.aiReasoning}"\n\n`;
  }
  
  // Missing Data Alert
  if (missingFields.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚠️ *Missing:* ${missingFields.join(', ')}\n\n`;
  }
  
  // Escalation Notice (rare for self-referrals but possible)
  if (shouldEscalate(data.aiPriority)) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📧 *ESCALATED:* Email sent to leadership\n\n`;
  }
  
  // Footer
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🕐 *Received:* ${formatTimestamp(data.timestamp)}\n`;
  text += `🔗 <${getRowUrl(row)}|View in Sheet>\n`;
  
  return { text: text };
}

// ============================================================================
// GOOGLE CHAT API
// ============================================================================

/**
 * Send message to Google Chat webhook
 * @param {Object} payload - Message payload
 * @returns {Object} Result with success status
 */
function sendToGoogleChat(payload) {
  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(NOTIFICATION_CONFIG.WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true };
    } else {
      console.error('Google Chat API error:', response.getContentText());
      return { success: false, error: response.getContentText() };
    }
    
  } catch (error) {
    console.error('Error sending to Google Chat:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EMAIL ESCALATION
// ============================================================================

/**
 * Check if priority requires escalation
 * @param {string} priority - AI priority string (e.g., "1-EMERGENT")
 * @returns {boolean} True if should escalate
 */
function shouldEscalate(priority) {
  if (!priority) return false;
  return NOTIFICATION_CONFIG.ESCALATION_PRIORITIES.some(p => 
    priority.toUpperCase().includes(p.split('-')[1])
  );
}

/**
 * Send escalation email for urgent/emergent referrals
 * @param {Object} data - Row data
 * @param {number} row - Row number
 */
function sendEscalationEmail(data, row) {
  try {
    const priority = getPriorityConfig(data.aiPriority);
    const subject = `${priority.emoji} ${priority.label} Referral Alert: ${data.patientLast}, ${data.patientFirst}`;
    
    let body = `
URGENT REFERRAL NOTIFICATION
============================

A ${priority.label} priority referral has been received and requires immediate attention.

PATIENT INFORMATION
-------------------
Name: ${data.patientLast}, ${data.patientFirst}
DOB: ${formatDate(data.dob)}
Phone: ${formatPhone(data.patientPhone) || 'Not provided'}
Location: ${data.city || '?'}, ${data.state || '?'}
Insurance: ${getInsuranceDisplay(data)}

REFERRAL DETAILS
----------------
${data.selfReferral === 'Yes' ? 'Self-Referral' : `Clinic: ${data.clinic || 'Unknown'}\nProvider: ${data.provider || 'Unknown'}`}

Reason: ${data.reason || 'Not provided'}
Creatinine: ${data.creatinine || 'Not provided'}
GFR: ${data.gfr || 'Not provided'}

AI ASSESSMENT
-------------
Priority: ${data.aiPriority || 'Not available'}
Reasoning: ${data.aiReasoning || 'Not available'}

ACTION REQUIRED
---------------
${priority.guidance}

View in spreadsheet: ${getRowUrl(row)}

---
This is an automated message from TKE Referral Bot.
    `.trim();
    
    // Send to all escalation recipients
    NOTIFICATION_CONFIG.ESCALATION_EMAILS.forEach(email => {
      try {
        MailApp.sendEmail({
          to: email,
          subject: subject,
          body: body
        });
        console.log(`Escalation email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    });
    
  } catch (error) {
    console.error('Error sending escalation email:', error);
  }
}

// ============================================================================
// PROVIDER STATISTICS (#3)
// ============================================================================

/**
 * Get provider's referral count for the current month
 * @param {string} providerName - Provider name
 * @returns {Object} Stats with count and rank
 */
function getProviderMonthlyStats(providerName) {
  if (!providerName || providerName === '' || providerName === 'Unknown Provider') {
    return { count: 0, rank: 999 };
  }
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) return { count: 0, rank: 999 };
    
    // Get this month's start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all timestamps and providers
    const timestamps = sheet.getRange(2, NOTIFICATION_CONFIG.COLUMNS.TIMESTAMP, lastRow - 1, 1).getValues();
    const providers = sheet.getRange(2, NOTIFICATION_CONFIG.COLUMNS.PROVIDER, lastRow - 1, 1).getValues();
    
    // Count referrals per provider this month
    const providerCounts = {};
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i][0];
      const provider = (providers[i][0] || '').toString().trim();
      
      if (timestamp instanceof Date && timestamp >= monthStart && provider) {
        providerCounts[provider.toLowerCase()] = (providerCounts[provider.toLowerCase()] || 0) + 1;
      }
    }
    
    // Get count for this provider
    const normalizedName = providerName.toString().trim().toLowerCase();
    const count = providerCounts[normalizedName] || 0;
    
    // Calculate rank
    const sortedCounts = Object.values(providerCounts).sort((a, b) => b - a);
    const rank = sortedCounts.indexOf(count) + 1;
    
    return { count, rank: rank || 999 };
    
  } catch (error) {
    console.error('Error getting provider stats:', error);
    return { count: 0, rank: 999 };
  }
}

// ============================================================================
// MISSING DATA DETECTION (#4)
// ============================================================================

/**
 * Check for missing required data
 * @param {Object} data - Row data
 * @returns {Array} List of missing field names
 */
function checkMissingData(data) {
  const missing = [];
  
  // Check insurance (special handling for self-pay)
  if (!data.selfPay || data.selfPay.toString().toLowerCase() !== 'yes') {
    if (!data.primaryInsurance || data.primaryInsurance.toString().trim() === '') {
      missing.push('Primary Insurance');
    }
  }
  
  // Check other fields
  if (!data.patientPhone || data.patientPhone.toString().trim() === '') {
    missing.push('Patient Phone');
  }
  
  if (!data.reason || data.reason.toString().trim() === '') {
    missing.push('Reason for Referral');
  }
  
  // Lab data (less critical for self-referrals)
  if (!data.creatinine || data.creatinine.toString().trim() === '') {
    missing.push('Creatinine');
  }
  
  if (!data.gfr || data.gfr.toString().trim() === '') {
    missing.push('GFR');
  }
  
  if (!data.labDate) {
    missing.push('Lab Date');
  }
  
  return missing;
}

// ============================================================================
// MARKETING SOURCE CATEGORIZATION
// ============================================================================

/**
 * Categorize the "How did you hear about us?" response
 * @param {string} response - Raw response text
 * @returns {Object} Category with icon and label
 */
function categorizeMarketingSource(response) {
  if (!response || response.toString().trim() === '') {
    return MARKETING_CATEGORIES.OTHER;
  }
  
  const normalized = response.toString().toLowerCase().trim();
  
  // Check each category's keywords
  for (const [key, category] of Object.entries(MARKETING_CATEGORIES)) {
    if (key === 'OTHER') continue; // Skip OTHER, it's the fallback
    
    for (const keyword of category.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  // Default to OTHER
  return MARKETING_CATEGORIES.OTHER;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get priority configuration from priority string
 * @param {string} priorityStr - Priority string (e.g., "2-URGENT")
 * @returns {Object} Priority config
 */
function getPriorityConfig(priorityStr) {
  if (!priorityStr) {
    return {
      emoji: '❓',
      label: 'UNKNOWN',
      color: '#CCCCCC',
      guidance: 'Review Required',
      escalate: false
    };
  }
  
  const normalized = priorityStr.toString().toUpperCase();
  
  for (const [key, config] of Object.entries(NOTIFICATION_CONFIG.PRIORITIES)) {
    if (normalized.includes(key) || normalized.includes(config.label)) {
      return config;
    }
  }
  
  // Try to extract just the label
  for (const [key, config] of Object.entries(NOTIFICATION_CONFIG.PRIORITIES)) {
    if (normalized.includes(config.label)) {
      return config;
    }
  }
  
  return {
    emoji: '❓',
    label: priorityStr,
    color: '#CCCCCC',
    guidance: 'Review Required',
    escalate: false
  };
}

/**
 * Calculate age from date of birth
 * @param {Date|string} dob - Date of birth
 * @returns {number|null} Age in years or null
 */
function calculateAge(dob) {
  if (!dob) return null;
  
  try {
    const birthDate = dob instanceof Date ? dob : new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 && age < 150 ? age : null;
  } catch (e) {
    return null;
  }
}

/**
 * Calculate days since a date
 * @param {Date|string} date - The date
 * @returns {number|null} Days ago or null
 */
function calculateDaysAgo(date) {
  if (!date) return null;
  
  try {
    const pastDate = date instanceof Date ? date : new Date(date);
    if (isNaN(pastDate.getTime())) return null;
    
    const today = new Date();
    const diffTime = today - pastDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 ? diffDays : null;
  } catch (e) {
    return null;
  }
}

/**
 * Format a date for display
 * @param {Date|string} date - The date
 * @returns {string} Formatted date or empty string
 */
function formatDate(date) {
  if (!date) return '';
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return Utilities.formatDate(d, NOTIFICATION_CONFIG.TIMEZONE, 'M/d/yyyy');
  } catch (e) {
    return '';
  }
}

/**
 * Format a timestamp for display
 * @param {Date|string} timestamp - The timestamp
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  
  try {
    const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(d.getTime())) return 'Unknown';
    
    return Utilities.formatDate(d, NOTIFICATION_CONFIG.TIMEZONE, 'MMM d, yyyy \'at\' h:mm a') + ' CST';
  } catch (e) {
    return 'Unknown';
  }
}

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone or original
 */
function formatPhone(phone) {
  if (!phone) return '';
  
  const digits = phone.toString().replace(/\D/g, '');
  
  // Remove leading 1 if present
  const cleaned = digits.length === 11 && digits.startsWith('1') 
    ? digits.substring(1) 
    : digits;
  
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  }
  
  return phone.toString();
}

/**
 * Get insurance display text
 * @param {Object} data - Row data
 * @returns {string} Insurance display text
 */
function getInsuranceDisplay(data) {
  if (data.selfPay && data.selfPay.toString().toLowerCase() === 'yes') {
    return 'Self Pay';
  }
  
  if (data.primaryInsurance && data.primaryInsurance.toString().trim() !== '') {
    return data.primaryInsurance.toString().trim();
  }
  
  return 'Not provided';
}

/**
 * Truncate text to max length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  
  const str = text.toString().trim();
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// MENU FUNCTIONS
// ============================================================================

/**
 * Send a test notification
 */
function sendTestNotification() {
  const testPayload = {
    text: `*🧪 TEST NOTIFICATION*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `This is a test message from TKE Referral Bot.\n\n` +
          `✅ Webhook connection successful!\n` +
          `📅 ${formatTimestamp(new Date())}\n\n` +
          `If you see this message, notifications are working correctly.`
  };
  
  const result = sendToGoogleChat(testPayload);
  
  const ui = SpreadsheetApp.getUi();
  if (result.success) {
    ui.alert('Test Successful', 'Test notification sent to Google Chat!', ui.ButtonSet.OK);
  } else {
    ui.alert('Test Failed', 'Error: ' + result.error, ui.ButtonSet.OK);
  }
}

/**
 * Send notification for the currently selected row
 */
function sendNotificationForSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
  const selection = SpreadsheetApp.getActiveSpreadsheet().getSelection();
  const row = selection.getCurrentCell().getRow();
  
  if (row < 2) {
    SpreadsheetApp.getUi().alert('Please select a data row (not the header).');
    return;
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Sending notification...', 'Notification', -1);
  
  const result = sendReferralNotification(sheet, row);
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
  
  const ui = SpreadsheetApp.getUi();
  if (result.success) {
    let msg = 'Notification sent successfully!';
    if (result.escalated) {
      msg += '\n\nEmail escalation also sent to leadership.';
    }
    ui.alert('Success', msg, ui.ButtonSet.OK);
  } else {
    ui.alert('Error', 'Failed to send notification: ' + result.error, ui.ButtonSet.OK);
  }
}

/**
 * Resend notifications for all rows from today
 */
function resendTodayNotifications() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Resend Today\'s Notifications',
    'This will resend notifications for all referrals received today.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    ui.alert('No data rows to process.');
    return;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const timestamps = sheet.getRange(2, NOTIFICATION_CONFIG.COLUMNS.TIMESTAMP, lastRow - 1, 1).getValues();
  
  let sent = 0;
  let errors = 0;
  
  for (let i = 0; i < timestamps.length; i++) {
    const rowTimestamp = timestamps[i][0];
    
    if (rowTimestamp instanceof Date) {
      const rowDate = new Date(rowTimestamp);
      rowDate.setHours(0, 0, 0, 0);
      
      if (rowDate.getTime() === today.getTime()) {
        const row = i + 2;
        SpreadsheetApp.getActiveSpreadsheet().toast(`Sending notification for row ${row}...`, 'Progress', -1);
        
        const result = sendReferralNotification(sheet, row);
        if (result.success) {
          sent++;
        } else {
          errors++;
        }
        
        // Small delay to avoid rate limiting
        Utilities.sleep(500);
      }
    }
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
  
  ui.alert(
    'Complete',
    `Notifications sent: ${sent}\nErrors: ${errors}`,
    ui.ButtonSet.OK
  );
}
