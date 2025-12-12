/**
 * GoTo SMS Texting Tool - Google Chat Bot
 * 
 * Main Code.gs - Core functionality and GoTo API integration
 * 
 * This Apps Script powers a Google Chat Bot that sends SMS messages
 * to patients using the GoTo API.
 * 
 * Features automatic OAuth token refresh for uninterrupted service.
 */

// ============================================
// CONSTANTS
// ============================================

const AUTH_URL = 'https://authentication.logmeininc.com/oauth/token';
const TOKEN_REFRESH_BUFFER_MINUTES = 12; // Refresh 12 minutes before expiry

// ============================================
// CONFIGURATION
// ============================================

/**
 * Get configuration from Properties Service
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    GOTO_ACCESS_TOKEN: props.getProperty('GOTO_ACCESS_TOKEN'),
    GOTO_REFRESH_TOKEN: props.getProperty('GOTO_REFRESH_TOKEN'),
    GOTO_CLIENT_ID: props.getProperty('GOTO_CLIENT_ID'),
    GOTO_CLIENT_SECRET: props.getProperty('GOTO_CLIENT_SECRET'),
    GOTO_TOKEN_EXPIRY: props.getProperty('GOTO_TOKEN_EXPIRY'),
    GOTO_OWNER_PHONE: props.getProperty('GOTO_OWNER_PHONE'),
    PRACTICE_NAME: props.getProperty('PRACTICE_NAME') || 'Our Practice',
    SPREADSHEET_ID: props.getProperty('SPREADSHEET_ID'),
  };
}

/**
 * Set configuration in Properties Service
 * Run this function once to set up your credentials
 */
function setConfig() {
  const props = PropertiesService.getScriptProperties();
  
  // SET THESE VALUES BEFORE RUNNING
  props.setProperties({
    'GOTO_ACCESS_TOKEN': 'YOUR_ACCESS_TOKEN_HERE',
    'GOTO_REFRESH_TOKEN': 'YOUR_REFRESH_TOKEN_HERE',  // For auto-refresh
    'GOTO_CLIENT_ID': 'YOUR_CLIENT_ID_HERE',          // For token refresh
    'GOTO_CLIENT_SECRET': 'YOUR_CLIENT_SECRET_HERE',  // For token refresh
    'GOTO_TOKEN_EXPIRY': '',  // Will be set automatically on refresh
    'GOTO_OWNER_PHONE': '+1XXXXXXXXXX',  // Your GoTo phone number
    'PRACTICE_NAME': 'Your Practice Name',
    'SPREADSHEET_ID': 'YOUR_GOOGLE_SHEET_ID_HERE',
  });
  
  Logger.log('Configuration saved successfully!');
}

/**
 * Update just the access token (tokens expire)
 */
function updateAccessToken(newToken, expiresInSeconds) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('GOTO_ACCESS_TOKEN', newToken);
  
  if (expiresInSeconds) {
    const expiry = new Date(Date.now() + (expiresInSeconds * 1000));
    props.setProperty('GOTO_TOKEN_EXPIRY', expiry.toISOString());
    Logger.log('Access token updated. Expires at: ' + expiry.toISOString());
  } else {
    Logger.log('Access token updated successfully!');
  }
}

// ============================================
// TOKEN REFRESH FUNCTIONS
// ============================================

/**
 * Check if the access token is expired or will expire soon
 * 
 * @returns {boolean} True if token needs refresh
 */
function isTokenExpired() {
  const config = getConfig();
  
  if (!config.GOTO_TOKEN_EXPIRY) {
    // No expiry set - assume token is valid
    return false;
  }
  
  const expiry = new Date(config.GOTO_TOKEN_EXPIRY);
  const now = new Date();
  const bufferMs = TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000;
  
  // Return true if token will expire within buffer period
  return now.getTime() >= (expiry.getTime() - bufferMs);
}

/**
 * Check if we can perform token refresh
 * 
 * @returns {boolean} True if refresh credentials are available
 */
function canRefreshToken() {
  const config = getConfig();
  return !!(config.GOTO_REFRESH_TOKEN && config.GOTO_CLIENT_ID && config.GOTO_CLIENT_SECRET);
}

/**
 * Refresh the access token using the refresh token
 * 
 * @returns {Object} Result object with success status
 */
function refreshAccessToken() {
  const config = getConfig();
  
  if (!canRefreshToken()) {
    return {
      success: false,
      error: 'Cannot refresh token: missing GOTO_REFRESH_TOKEN, GOTO_CLIENT_ID, or GOTO_CLIENT_SECRET'
    };
  }
  
  Logger.log('Attempting to refresh access token...');
  
  // Create Basic Auth header
  const credentials = config.GOTO_CLIENT_ID + ':' + config.GOTO_CLIENT_SECRET;
  const encodedCredentials = Utilities.base64Encode(credentials);
  
  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      'Authorization': 'Basic ' + encodedCredentials
    },
    payload: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(config.GOTO_REFRESH_TOKEN),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(AUTH_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (responseCode === 200) {
      const tokenData = JSON.parse(responseBody);
      const props = PropertiesService.getScriptProperties();
      
      // Update access token
      props.setProperty('GOTO_ACCESS_TOKEN', tokenData.access_token);
      
      // Update expiry
      const expiresIn = tokenData.expires_in || 3600;
      const expiry = new Date(Date.now() + (expiresIn * 1000));
      props.setProperty('GOTO_TOKEN_EXPIRY', expiry.toISOString());
      
      // Update refresh token if new one provided
      if (tokenData.refresh_token) {
        props.setProperty('GOTO_REFRESH_TOKEN', tokenData.refresh_token);
        Logger.log('New refresh token received');
      }
      
      Logger.log('Token refreshed successfully. Expires at: ' + expiry.toISOString());
      logTokenRefresh('SUCCESS', 'Token refreshed');
      
      return { success: true, expiresAt: expiry.toISOString() };
      
    } else if (responseCode === 401) {
      Logger.log('Refresh token is invalid or expired');
      logTokenRefresh('FAILED', 'Refresh token expired - re-authentication required');
      return {
        success: false,
        error: 'Refresh token is invalid or expired. Please re-authenticate at https://developer.goto.com/'
      };
      
    } else {
      Logger.log('Token refresh failed: ' + responseCode + ' - ' + responseBody);
      logTokenRefresh('FAILED', 'HTTP ' + responseCode);
      return {
        success: false,
        error: 'Token refresh failed: ' + responseCode + ' - ' + responseBody
      };
    }
    
  } catch (error) {
    Logger.log('Token refresh error: ' + error.toString());
    logTokenRefresh('ERROR', error.toString());
    return {
      success: false,
      error: 'Token refresh network error: ' + error.toString()
    };
  }
}

/**
 * Ensure we have a valid access token, refreshing if necessary
 * 
 * @returns {Object} Result with valid token or error
 */
function ensureValidToken() {
  const config = getConfig();
  
  // No token at all
  if (!config.GOTO_ACCESS_TOKEN || config.GOTO_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    if (canRefreshToken()) {
      return refreshAccessToken();
    }
    return {
      success: false,
      error: 'No access token configured. Run setConfig() first.'
    };
  }
  
  // Token expired or expiring soon
  if (isTokenExpired()) {
    Logger.log('Token expired or expiring soon, attempting refresh...');
    if (canRefreshToken()) {
      return refreshAccessToken();
    }
    return {
      success: false,
      error: 'Access token expired. Configure GOTO_REFRESH_TOKEN for auto-refresh, or update token manually.'
    };
  }
  
  // Token is valid
  return { success: true };
}

/**
 * Log token refresh events for monitoring
 */
function logTokenRefresh(status, details) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) return;
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Token Log');
    
    if (!sheet) {
      sheet = ss.insertSheet('Token Log');
      sheet.appendRow(['Timestamp', 'Event', 'Status', 'Details']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    
    sheet.appendRow([new Date(), 'Token Refresh', status, details]);
    
  } catch (error) {
    Logger.log('Failed to log token refresh: ' + error.toString());
  }
}

/**
 * Get current token status for monitoring
 * 
 * @returns {Object} Token status information
 */
function getTokenStatus() {
  const config = getConfig();
  
  const status = {
    hasAccessToken: !!(config.GOTO_ACCESS_TOKEN && config.GOTO_ACCESS_TOKEN !== 'YOUR_ACCESS_TOKEN_HERE'),
    hasRefreshToken: !!(config.GOTO_REFRESH_TOKEN && config.GOTO_REFRESH_TOKEN !== 'YOUR_REFRESH_TOKEN_HERE'),
    canAutoRefresh: canRefreshToken(),
    tokenExpiry: config.GOTO_TOKEN_EXPIRY || null,
    isExpired: isTokenExpired()
  };
  
  if (config.GOTO_TOKEN_EXPIRY) {
    const expiry = new Date(config.GOTO_TOKEN_EXPIRY);
    const now = new Date();
    const remainingMs = expiry.getTime() - now.getTime();
    status.minutesUntilExpiry = Math.max(0, Math.round(remainingMs / 60000));
  }
  
  Logger.log('Token Status: ' + JSON.stringify(status, null, 2));
  return status;
}

// ============================================
// GOTO API INTEGRATION
// ============================================

/**
 * Send an SMS message via GoTo API
 * 
 * Automatically refreshes the access token if expired and refresh is configured.
 * Checks Do-Not-Contact list before sending (TCPA compliance).
 * 
 * @param {string} phoneNumber - Recipient phone number (E.164 format)
 * @param {string} message - Message body to send
 * @returns {Object} API response or error object
 */
function sendSMS(phoneNumber, message) {
  // Check Do-Not-Contact list first (TCPA compliance)
  if (typeof isPhoneBlocked === 'function' && isPhoneBlocked(phoneNumber)) {
    const msg = 'Message blocked: recipient has opted out (STOP). Phone: ' + phoneNumber;
    Logger.log(msg);
    logBlockedMessage(phoneNumber, message);
    return { success: false, error: msg, blocked: true };
  }
  
  // Ensure we have a valid token (auto-refresh if needed)
  const tokenCheck = ensureValidToken();
  if (!tokenCheck.success) {
    return { success: false, error: tokenCheck.error };
  }
  
  // Get fresh config after potential token refresh
  const config = getConfig();
  
  if (!config.GOTO_OWNER_PHONE) {
    return { success: false, error: 'Owner phone number not configured.' };
  }
  
  // Validate phone number format
  const cleanPhone = formatPhoneNumber(phoneNumber);
  if (!cleanPhone) {
    return { success: false, error: 'Invalid phone number format. Use E.164 format (e.g., +15145550199)' };
  }
  
  const url = 'https://api.goto.com/messaging/v1/messages';
  
  const payload = {
    ownerPhoneNumber: config.GOTO_OWNER_PHONE,
    contactPhoneNumbers: [cleanPhone],
    body: message
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + config.GOTO_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    let response = UrlFetchApp.fetch(url, options);
    let responseCode = response.getResponseCode();
    let responseBody = response.getContentText();
    
    // Handle 401 by attempting token refresh and retry
    if (responseCode === 401 && canRefreshToken()) {
      Logger.log('Received 401, attempting token refresh...');
      const refreshResult = refreshAccessToken();
      
      if (refreshResult.success) {
        // Retry with new token
        const newConfig = getConfig();
        options.headers['Authorization'] = 'Bearer ' + newConfig.GOTO_ACCESS_TOKEN;
        response = UrlFetchApp.fetch(url, options);
        responseCode = response.getResponseCode();
        responseBody = response.getContentText();
      }
    }
    
    if (responseCode === 200 || responseCode === 201) {
      const result = JSON.parse(responseBody);
      
      // Log to spreadsheet
      logMessage(cleanPhone, message, 'SUCCESS', result.id || 'N/A');
      
      return { 
        success: true, 
        messageId: result.id,
        data: result 
      };
    } else {
      const errorMsg = `API Error ${responseCode}: ${responseBody}`;
      logMessage(cleanPhone, message, 'FAILED', errorMsg);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = 'Request failed: ' + error.toString();
    logMessage(cleanPhone, message, 'ERROR', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Format and validate phone number to E.164 format
 * 
 * @param {string} phone - Phone number in various formats
 * @returns {string|null} Formatted phone number or null if invalid
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.toString().trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.length === 10) {
    // US/Canada number without country code
    return '+1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US/Canada with country code but no +
    return '+' + cleaned;
  } else if (hasPlus && cleaned.length >= 10) {
    // Already has + prefix
    return '+' + cleaned;
  }
  
  // Return null for invalid numbers
  return null;
}

// ============================================
// LOGGING TO GOOGLE SHEET
// ============================================

/**
 * Log a sent message to the Google Sheet
 * 
 * @param {string} phone - Recipient phone number
 * @param {string} message - Message content
 * @param {string} status - SUCCESS, FAILED, or ERROR
 * @param {string} details - Message ID or error details
 */
function logMessage(phone, message, status, details) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) {
    Logger.log('No spreadsheet configured for logging');
    return;
  }
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Message Log');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Message Log');
      sheet.appendRow(['Timestamp', 'Phone Number', 'Message', 'Status', 'Details', 'Sent By']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }
    
    // Get current user
    const user = Session.getActiveUser().getEmail() || 'Chat Bot';
    
    // Append log entry
    sheet.appendRow([
      new Date(),
      phone,
      message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      status,
      details,
      user
    ]);
    
  } catch (error) {
    Logger.log('Failed to log message: ' + error.toString());
  }
}

/**
 * Log a blocked message attempt (recipient opted out)
 * 
 * @param {string} phone - Recipient phone number
 * @param {string} message - Message that was blocked
 */
function logBlockedMessage(phone, message) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) return;
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Blocked Messages');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Blocked Messages');
      sheet.appendRow(['Timestamp', 'Phone Number', 'Message', 'Reason', 'Attempted By']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }
    
    const user = Session.getActiveUser().getEmail() || 'Chat Bot';
    
    sheet.appendRow([
      new Date(),
      phone,
      message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      'Recipient opted out (STOP)',
      user
    ]);
    
  } catch (error) {
    Logger.log('Failed to log blocked message: ' + error.toString());
  }
}

/**
 * Log patient contact to a separate sheet
 * 
 * @param {string} firstName - Patient first name
 * @param {string} lastName - Patient last name
 * @param {string} phone - Patient phone number
 * @param {string} templateUsed - Which template was sent
 */
function logPatient(firstName, lastName, phone, templateUsed) {
  const config = getConfig();
  
  if (!config.SPREADSHEET_ID) return;
  
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Patients');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('Patients');
      sheet.appendRow(['Timestamp', 'First Name', 'Last Name', 'Phone', 'Last Template', 'Contact Count']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }
    
    // Check if patient already exists
    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][3] === phone) {
        existingRow = i + 1;
        break;
      }
    }
    
    if (existingRow > 0) {
      // Update existing patient
      const currentCount = sheet.getRange(existingRow, 6).getValue() || 0;
      sheet.getRange(existingRow, 1).setValue(new Date());
      sheet.getRange(existingRow, 5).setValue(templateUsed);
      sheet.getRange(existingRow, 6).setValue(currentCount + 1);
    } else {
      // Add new patient
      sheet.appendRow([new Date(), firstName, lastName, phone, templateUsed, 1]);
    }
    
  } catch (error) {
    Logger.log('Failed to log patient: ' + error.toString());
  }
}

// ============================================
// TEMPLATE MESSAGE FUNCTIONS
// ============================================

/**
 * Send kidney video introduction message
 */
function sendKidneyVideo(firstName, lastName, phone) {
  const config = getConfig();
  const template = getTemplate('kidney_video');
  
  const message = template.message
    .replace('{first_name}', firstName)
    .replace('{practice_name}', config.PRACTICE_NAME);
  
  logPatient(firstName, lastName, phone, 'kidney_video');
  return sendSMS(phone, message);
}

/**
 * Send appointment reminder
 */
function sendAppointmentReminder(firstName, lastName, phone, date, time) {
  const config = getConfig();
  const template = getTemplate('appointment_reminder');
  
  const message = template.message
    .replace('{patient_name}', firstName)
    .replace('{appointment_date}', date)
    .replace('{appointment_time}', time);
  
  logPatient(firstName, lastName, phone, 'appointment_reminder');
  return sendSMS(phone, message);
}

/**
 * Send appointment confirmation
 */
function sendAppointmentConfirmation(firstName, lastName, phone, date, time) {
  const config = getConfig();
  const template = getTemplate('appointment_confirmation');
  
  const message = template.message
    .replace('{patient_name}', firstName)
    .replace('{appointment_date}', date)
    .replace('{appointment_time}', time);
  
  logPatient(firstName, lastName, phone, 'appointment_confirmation');
  return sendSMS(phone, message);
}

/**
 * Send follow-up message
 */
function sendFollowUp(firstName, lastName, phone) {
  const template = getTemplate('follow_up');
  
  const message = template.message
    .replace('{patient_name}', firstName);
  
  logPatient(firstName, lastName, phone, 'follow_up');
  return sendSMS(phone, message);
}

/**
 * Send prescription ready notification
 */
function sendPrescriptionReady(firstName, lastName, phone) {
  const template = getTemplate('prescription_ready');
  
  const message = template.message
    .replace('{patient_name}', firstName);
  
  logPatient(firstName, lastName, phone, 'prescription_ready');
  return sendSMS(phone, message);
}

/**
 * Send thank you message
 */
function sendThankYou(firstName, lastName, phone) {
  const template = getTemplate('thank_you');
  
  const message = template.message
    .replace('{patient_name}', firstName);
  
  logPatient(firstName, lastName, phone, 'thank_you');
  return sendSMS(phone, message);
}

/**
 * Send custom message
 */
function sendCustomMessage(firstName, lastName, phone, customMessage) {
  logPatient(firstName, lastName, phone, 'custom');
  return sendSMS(phone, customMessage);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Test the SMS functionality
 */
function testSendSMS() {
  const result = sendSMS('+15145550199', 'This is a test message from the GoTo SMS Bot!');
  Logger.log(result);
}

/**
 * Verify configuration is set up correctly
 */
function verifyConfig() {
  const config = getConfig();
  
  const checks = {
    'Access Token': !!config.GOTO_ACCESS_TOKEN && config.GOTO_ACCESS_TOKEN !== 'YOUR_ACCESS_TOKEN_HERE',
    'Owner Phone': !!config.GOTO_OWNER_PHONE && config.GOTO_OWNER_PHONE !== '+1XXXXXXXXXX',
    'Practice Name': !!config.PRACTICE_NAME,
    'Spreadsheet ID': !!config.SPREADSHEET_ID && config.SPREADSHEET_ID !== 'YOUR_GOOGLE_SHEET_ID_HERE',
  };
  
  Logger.log('=== Configuration Check ===');
  let allGood = true;
  
  for (const [name, status] of Object.entries(checks)) {
    const icon = status ? 'OK' : 'MISSING';
    Logger.log(`${name}: ${icon}`);
    if (!status) allGood = false;
  }
  
  if (allGood) {
    Logger.log('\nAll configuration is set up correctly!');
  } else {
    Logger.log('\nPlease run setConfig() and fill in the missing values.');
  }
  
  return checks;
}
