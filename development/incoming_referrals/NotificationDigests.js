/**
 * ============================================================================
 * NOTIFICATIONDIGESTS.JS - Daily & Weekly Digest Reports
 * ============================================================================
 * 
 * @fileoverview Generates and sends daily/weekly summary reports to Google Chat
 * @author The Kidney Experts, PLLC
 * @version 1.0.0
 * @lastModified 2025-11-30
 * 
 * DESCRIPTION:
 * This module generates comprehensive digest reports including:
 *   - Daily digest at 5 PM CST
 *   - Weekly digest on Friday at 5 PM CST
 *   - Referral volume summaries
 *   - Priority breakdowns
 *   - Status tracking
 *   - Top referring providers and clinics
 *   - Marketing source analytics for self-referrals
 *   - Response time metrics
 * 
 * DEPENDENCIES:
 *   - Dict_NotificationConfig.js (NOTIFICATION_CONFIG, MARKETING_CATEGORIES)
 *   - GoogleChatNotifications.js (sendToGoogleChat)
 * 
 * ============================================================================
 */

// ============================================================================
// DAILY DIGEST
// ============================================================================

/**
 * Send the daily digest report
 * Triggered at 5 PM CST daily
 */
function sendDailyDigest() {
  try {
    const stats = getDailyStats();
    const card = buildDailyDigestCard(stats);
    
    const result = sendToGoogleChat(card);
    
    console.log('Daily digest sent:', result.success ? 'Success' : 'Failed');
    return result;
    
  } catch (error) {
    console.error('Error sending daily digest:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get statistics for today
 * @returns {Object} Daily statistics
 */
function getDailyStats() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return { total: 0, priorities: {}, statuses: {}, providers: [], clinics: [], selfReferrals: 0, marketingSources: {} };
  }
  
  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get all relevant data
  const cols = NOTIFICATION_CONFIG.COLUMNS;
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 36);
  const data = dataRange.getValues();
  
  const stats = {
    total: 0,
    priorities: { EMERGENT: 0, URGENT: 0, SOON: 0, ROUTINE: 0, LOW: 0, UNKNOWN: 0 },
    statuses: { New: 0, 'In Progress': 0, Scheduled: 0, 'Awaiting Response': 0, Complete: 0 },
    providers: {},
    clinics: {},
    selfReferrals: 0,
    marketingSources: {},
    missingDataCount: 0,
    overdueCount: 0
  };
  
  data.forEach(row => {
    const timestamp = row[cols.TIMESTAMP - 1];
    
    if (timestamp instanceof Date && timestamp >= today && timestamp < tomorrow) {
      stats.total++;
      
      // Priority breakdown
      const priority = (row[cols.AI_PRIORITY - 1] || '').toString().toUpperCase();
      if (priority.includes('EMERGENT')) stats.priorities.EMERGENT++;
      else if (priority.includes('URGENT')) stats.priorities.URGENT++;
      else if (priority.includes('SOON')) stats.priorities.SOON++;
      else if (priority.includes('ROUTINE')) stats.priorities.ROUTINE++;
      else if (priority.includes('LOW')) stats.priorities.LOW++;
      else stats.priorities.UNKNOWN++;
      
      // Status breakdown (current status, not just today's)
      const status = (row[cols.STATUS - 1] || 'New').toString();
      if (stats.statuses.hasOwnProperty(status)) {
        stats.statuses[status]++;
      } else {
        stats.statuses['New']++;
      }
      
      // Self-referral tracking
      const selfRef = (row[cols.SELF_REFERRAL - 1] || '').toString();
      if (selfRef.toLowerCase() === 'yes') {
        stats.selfReferrals++;
        
        // Marketing source
        const howHeard = row[cols.HOW_HEARD - 1] || '';
        const category = categorizeMarketingSource(howHeard);
        stats.marketingSources[category.label] = (stats.marketingSources[category.label] || 0) + 1;
      } else {
        // Provider tracking (non-self-referrals only)
        const provider = (row[cols.PROVIDER - 1] || 'Unknown').toString().trim();
        if (provider && provider !== 'Unknown Provider') {
          stats.providers[provider] = (stats.providers[provider] || 0) + 1;
        }
        
        // Clinic tracking
        const clinic = (row[cols.CLINIC - 1] || 'Unknown').toString().trim();
        if (clinic && clinic !== 'Unknown Clinic') {
          stats.clinics[clinic] = (stats.clinics[clinic] || 0) + 1;
        }
      }
    }
  });
  
  // Convert to sorted arrays
  stats.topProviders = Object.entries(stats.providers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  stats.topClinics = Object.entries(stats.clinics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Get overdue count (all data, not just today)
  stats.overdueCount = getOverdueCount(data, cols);
  
  return stats;
}

/**
 * Build the daily digest card
 * @param {Object} stats - Daily statistics
 * @returns {Object} Google Chat card payload
 */
function buildDailyDigestCard(stats) {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, NOTIFICATION_CONFIG.TIMEZONE, 'EEEE, MMMM d, yyyy');
  
  let text = '';
  
  // Header
  text += `*📊 TKE DAILY REFERRAL DIGEST*\n`;
  text += `📅 ${dateStr}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Today's Summary
  text += `*📈 TODAY'S SUMMARY*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Total New Referrals: *${stats.total}*\n\n`;
  
  if (stats.total > 0) {
    text += `🚨 Emergent: ${stats.priorities.EMERGENT}\n`;
    text += `⚠️ Urgent: ${stats.priorities.URGENT}\n`;
    text += `🔶 Soon: ${stats.priorities.SOON}\n`;
    text += `✅ Routine: ${stats.priorities.ROUTINE}\n`;
    text += `📋 Low: ${stats.priorities.LOW}\n`;
    if (stats.priorities.UNKNOWN > 0) {
      text += `❓ Pending Triage: ${stats.priorities.UNKNOWN}\n`;
    }
    text += `\n`;
  }
  
  // Self-Referrals
  if (stats.selfReferrals > 0) {
    text += `🙋 Self-Referrals: ${stats.selfReferrals}\n\n`;
  }
  
  // Status Breakdown
  text += `*📋 STATUS BREAKDOWN*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `✅ Completed: ${stats.statuses.Complete}\n`;
  text += `📅 Scheduled: ${stats.statuses.Scheduled}\n`;
  text += `🔄 In Progress: ${stats.statuses['In Progress']}\n`;
  text += `⏳ Awaiting Response: ${stats.statuses['Awaiting Response']}\n`;
  text += `🆕 New: ${stats.statuses.New}\n\n`;
  
  // Top Clinics
  if (stats.topClinics.length > 0) {
    text += `*🏥 TOP REFERRING CLINICS TODAY*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    stats.topClinics.forEach((clinic, i) => {
      const bar = '█'.repeat(Math.min(clinic[1] * 2, 10));
      text += `${i + 1}. ${truncateText(clinic[0], 25)} │ ${clinic[1]} │ ${bar}\n`;
    });
    text += `\n`;
  }
  
  // Top Providers
  if (stats.topProviders.length > 0) {
    text += `*👨‍⚕️ TOP REFERRING PROVIDERS TODAY*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    stats.topProviders.forEach((provider, i) => {
      const bar = '█'.repeat(Math.min(provider[1] * 2, 10));
      text += `${i + 1}. ${truncateText(provider[0], 25)} │ ${provider[1]} │ ${bar}\n`;
    });
    text += `\n`;
  }
  
  // Action Items
  const actionItems = [];
  if (stats.priorities.EMERGENT > 0) {
    actionItems.push(`${stats.priorities.EMERGENT} EMERGENT referral(s) need immediate attention`);
  }
  if (stats.priorities.URGENT > 0) {
    actionItems.push(`${stats.priorities.URGENT} URGENT referral(s) to schedule within 48h`);
  }
  if (stats.overdueCount > 0) {
    actionItems.push(`${stats.overdueCount} referral(s) pending > 48 hours`);
  }
  if (stats.statuses.New > 0) {
    actionItems.push(`${stats.statuses.New} referral(s) still marked as 'New'`);
  }
  
  if (actionItems.length > 0) {
    text += `*🚩 ACTION NEEDED*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    actionItems.forEach(item => {
      text += `• ${item}\n`;
    });
    text += `\n`;
  }
  
  // Footer
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔗 <${getSpreadsheetUrl()}|Open Referral Sheet>\n`;
  
  return { text: text };
}

// ============================================================================
// WEEKLY DIGEST
// ============================================================================

/**
 * Send the weekly digest report
 * Triggered on Friday at 5 PM CST
 */
function sendWeeklyDigest() {
  try {
    const stats = getWeeklyStats();
    const card = buildWeeklyDigestCard(stats);
    
    const result = sendToGoogleChat(card);
    
    console.log('Weekly digest sent:', result.success ? 'Success' : 'Failed');
    return result;
    
  } catch (error) {
    console.error('Error sending weekly digest:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get statistics for the current week
 * @returns {Object} Weekly statistics
 */
function getWeeklyStats() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return { total: 0 };
  }
  
  // Get week date range (Monday to Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  
  // Also get last week for comparison
  const lastMonday = new Date(monday);
  lastMonday.setDate(monday.getDate() - 7);
  
  // Get all relevant data
  const cols = NOTIFICATION_CONFIG.COLUMNS;
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 36);
  const data = dataRange.getValues();
  
  const stats = {
    total: 0,
    lastWeekTotal: 0,
    priorities: { EMERGENT: 0, URGENT: 0, SOON: 0, ROUTINE: 0, LOW: 0, UNKNOWN: 0 },
    statuses: { New: 0, 'In Progress': 0, Scheduled: 0, 'Awaiting Response': 0, Complete: 0 },
    providers: {},
    clinics: {},
    selfReferrals: 0,
    marketingSources: {},
    dailyBreakdown: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
    responseMetrics: { totalScheduled: 0, totalCompleted: 0, avgDaysToSchedule: 0 },
    weekStart: monday,
    weekEnd: sunday
  };
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let scheduleTimes = [];
  
  data.forEach(row => {
    const timestamp = row[cols.TIMESTAMP - 1];
    
    if (timestamp instanceof Date) {
      // This week
      if (timestamp >= monday && timestamp < sunday) {
        stats.total++;
        
        // Day breakdown
        const dayName = dayNames[timestamp.getDay()];
        stats.dailyBreakdown[dayName]++;
        
        // Priority breakdown
        const priority = (row[cols.AI_PRIORITY - 1] || '').toString().toUpperCase();
        if (priority.includes('EMERGENT')) stats.priorities.EMERGENT++;
        else if (priority.includes('URGENT')) stats.priorities.URGENT++;
        else if (priority.includes('SOON')) stats.priorities.SOON++;
        else if (priority.includes('ROUTINE')) stats.priorities.ROUTINE++;
        else if (priority.includes('LOW')) stats.priorities.LOW++;
        else stats.priorities.UNKNOWN++;
        
        // Status
        const status = (row[cols.STATUS - 1] || 'New').toString();
        const isComplete = (row[cols.COMPLETE - 1] || '').toString().toUpperCase() === 'TRUE';
        
        if (isComplete) {
          stats.responseMetrics.totalCompleted++;
        }
        
        if (status === 'Scheduled' || status === 'Complete') {
          stats.responseMetrics.totalScheduled++;
        }
        
        // Self-referral tracking
        const selfRef = (row[cols.SELF_REFERRAL - 1] || '').toString();
        if (selfRef.toLowerCase() === 'yes') {
          stats.selfReferrals++;
          
          const howHeard = row[cols.HOW_HEARD - 1] || '';
          const category = categorizeMarketingSource(howHeard);
          stats.marketingSources[category.label] = (stats.marketingSources[category.label] || 0) + 1;
        } else {
          const provider = (row[cols.PROVIDER - 1] || 'Unknown').toString().trim();
          if (provider && provider !== 'Unknown Provider') {
            stats.providers[provider] = (stats.providers[provider] || 0) + 1;
          }
          
          const clinic = (row[cols.CLINIC - 1] || 'Unknown').toString().trim();
          if (clinic && clinic !== 'Unknown Clinic') {
            stats.clinics[clinic] = (stats.clinics[clinic] || 0) + 1;
          }
        }
      }
      
      // Last week (for comparison)
      if (timestamp >= lastMonday && timestamp < monday) {
        stats.lastWeekTotal++;
      }
    }
  });
  
  // Calculate week-over-week change
  if (stats.lastWeekTotal > 0) {
    stats.weekOverWeekChange = ((stats.total - stats.lastWeekTotal) / stats.lastWeekTotal * 100).toFixed(0);
  } else {
    stats.weekOverWeekChange = stats.total > 0 ? '+100' : '0';
  }
  
  // Convert to sorted arrays
  stats.topProviders = Object.entries(stats.providers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  stats.topClinics = Object.entries(stats.clinics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  stats.topMarketingSources = Object.entries(stats.marketingSources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Calculate processing rate
  if (stats.total > 0) {
    stats.processingRate = ((stats.responseMetrics.totalScheduled / stats.total) * 100).toFixed(0);
    stats.completionRate = ((stats.responseMetrics.totalCompleted / stats.total) * 100).toFixed(0);
  } else {
    stats.processingRate = 0;
    stats.completionRate = 0;
  }
  
  return stats;
}

/**
 * Build the weekly digest card
 * @param {Object} stats - Weekly statistics
 * @returns {Object} Google Chat card payload
 */
function buildWeeklyDigestCard(stats) {
  const weekStartStr = Utilities.formatDate(stats.weekStart, NOTIFICATION_CONFIG.TIMEZONE, 'MMM d');
  const weekEndStr = Utilities.formatDate(new Date(stats.weekEnd.getTime() - 1), NOTIFICATION_CONFIG.TIMEZONE, 'MMM d, yyyy');
  
  let text = '';
  
  // Header
  text += `*📊 TKE WEEKLY REFERRAL SUMMARY*\n`;
  text += `📅 Week of ${weekStartStr} - ${weekEndStr}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Weekly Totals
  text += `*📈 WEEKLY TOTALS*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Total Referrals: *${stats.total}*\n`;
  text += `Last Week: ${stats.lastWeekTotal}\n`;
  const changeIcon = parseInt(stats.weekOverWeekChange) >= 0 ? '📈' : '📉';
  const changeSign = parseInt(stats.weekOverWeekChange) >= 0 ? '+' : '';
  text += `Change: ${changeIcon} ${changeSign}${stats.weekOverWeekChange}%\n\n`;
  
  // Priority Breakdown with percentages
  if (stats.total > 0) {
    text += `🚨 Emergent: ${stats.priorities.EMERGENT} (${((stats.priorities.EMERGENT / stats.total) * 100).toFixed(0)}%)\n`;
    text += `⚠️ Urgent: ${stats.priorities.URGENT} (${((stats.priorities.URGENT / stats.total) * 100).toFixed(0)}%)\n`;
    text += `🔶 Soon: ${stats.priorities.SOON} (${((stats.priorities.SOON / stats.total) * 100).toFixed(0)}%)\n`;
    text += `✅ Routine: ${stats.priorities.ROUTINE} (${((stats.priorities.ROUTINE / stats.total) * 100).toFixed(0)}%)\n`;
    text += `📋 Low: ${stats.priorities.LOW} (${((stats.priorities.LOW / stats.total) * 100).toFixed(0)}%)\n`;
    text += `\n`;
  }
  
  // Daily Breakdown
  text += `*📅 DAILY BREAKDOWN*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  days.forEach(day => {
    const count = stats.dailyBreakdown[day] || 0;
    const bar = '█'.repeat(Math.min(count, 15));
    text += `${day}: ${count.toString().padStart(2)} │ ${bar}\n`;
  });
  text += `\n`;
  
  // Response Metrics
  text += `*⏱️ RESPONSE METRICS*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Scheduled/Completed: ${stats.responseMetrics.totalScheduled} of ${stats.total} (${stats.processingRate}%)\n`;
  text += `Fully Completed: ${stats.responseMetrics.totalCompleted} (${stats.completionRate}%)\n\n`;
  
  // Top Clinics
  if (stats.topClinics.length > 0) {
    text += `*🏥 TOP 5 REFERRING CLINICS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    stats.topClinics.forEach((clinic, i) => {
      const bar = '█'.repeat(Math.min(clinic[1], 12));
      text += `${i + 1}. ${clinic[0]} (${clinic[1]})\n`;
    });
    text += `\n`;
  }
  
  // Top Providers
  if (stats.topProviders.length > 0) {
    text += `*👨‍⚕️ TOP 5 REFERRING PROVIDERS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    stats.topProviders.forEach((provider, i) => {
      const bar = '█'.repeat(Math.min(provider[1], 12));
      text += `${i + 1}. ${provider[0]} (${provider[1]})\n`;
    });
    text += `\n`;
  }
  
  // Self-Referral Marketing Sources
  if (stats.selfReferrals > 0 && stats.topMarketingSources.length > 0) {
    text += `*📣 SELF-REFERRAL SOURCES (${stats.selfReferrals} total)*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    stats.topMarketingSources.forEach((source, i) => {
      const category = Object.values(MARKETING_CATEGORIES).find(c => c.label === source[0]) || MARKETING_CATEGORIES.OTHER;
      const bar = '█'.repeat(Math.min(source[1] * 2, 12));
      text += `${category.icon} ${truncateText(source[0], 20)} │ ${source[1]} │ ${bar}\n`;
    });
    
    // Marketing insight
    if (stats.topMarketingSources.length > 0) {
      const topSource = stats.topMarketingSources[0];
      const topPct = ((topSource[1] / stats.selfReferrals) * 100).toFixed(0);
      text += `\n💡 _${topPct}% of self-referrals came from "${topSource[0]}"_\n`;
    }
    text += `\n`;
  }
  
  // Footer
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔗 <${getSpreadsheetUrl()}|Open Referral Sheet>\n`;
  
  return { text: text };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get count of overdue referrals
 * @param {Array} data - All row data
 * @param {Object} cols - Column indices
 * @returns {number} Count of overdue referrals
 */
function getOverdueCount(data, cols) {
  const now = new Date();
  const threshold = NOTIFICATION_CONFIG.RESPONSE_THRESHOLDS.OVERDUE_WARNING;
  const thresholdMs = threshold * 60 * 60 * 1000;
  
  let count = 0;
  
  data.forEach(row => {
    const timestamp = row[cols.TIMESTAMP - 1];
    const status = (row[cols.STATUS - 1] || '').toString();
    const isComplete = (row[cols.COMPLETE - 1] || '').toString().toUpperCase() === 'TRUE';
    
    if (timestamp instanceof Date && !isComplete && status !== 'Scheduled' && status !== 'Complete') {
      const age = now - timestamp;
      if (age > thresholdMs) {
        count++;
      }
    }
  });
  
  return count;
}

// ============================================================================
// TRIGGER MANAGEMENT
// ============================================================================

/**
 * Create the daily and weekly digest triggers
 */
function createDigestTriggers() {
  // Remove existing triggers first
  removeDigestTriggers();
  
  // Daily digest at 5 PM CST
  ScriptApp.newTrigger('sendDailyDigest')
    .timeBased()
    .atHour(NOTIFICATION_CONFIG.DAILY_DIGEST_HOUR)
    .everyDays(1)
    .inTimezone(NOTIFICATION_CONFIG.TIMEZONE)
    .create();
  
  // Weekly digest on Friday at 5 PM CST
  ScriptApp.newTrigger('sendWeeklyDigest')
    .timeBased()
    .onWeekDay(NOTIFICATION_CONFIG.WEEKLY_DIGEST_DAY)
    .atHour(NOTIFICATION_CONFIG.DAILY_DIGEST_HOUR)
    .inTimezone(NOTIFICATION_CONFIG.TIMEZONE)
    .create();
  
  console.log('Digest triggers created');
  
  SpreadsheetApp.getUi().alert(
    'Digest Triggers Created',
    'Daily digest will be sent at 5 PM CST every day.\n\n' +
    'Weekly digest will be sent at 5 PM CST every Friday.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Remove all digest triggers
 */
function removeDigestTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  triggers.forEach(trigger => {
    const handler = trigger.getHandlerFunction();
    if (handler === 'sendDailyDigest' || handler === 'sendWeeklyDigest') {
      ScriptApp.deleteTrigger(trigger);
      console.log('Removed trigger:', handler);
    }
  });
}

/**
 * Check status of digest triggers
 */
function checkDigestTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  const ui = SpreadsheetApp.getUi();
  
  let dailyFound = false;
  let weeklyFound = false;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendDailyDigest') dailyFound = true;
    if (trigger.getHandlerFunction() === 'sendWeeklyDigest') weeklyFound = true;
  });
  
  let message = 'Digest Trigger Status:\n\n';
  message += `Daily Digest (5 PM CST): ${dailyFound ? '✅ Active' : '❌ Not active'}\n`;
  message += `Weekly Digest (Friday 5 PM): ${weeklyFound ? '✅ Active' : '❌ Not active'}`;
  
  ui.alert('Trigger Status', message, ui.ButtonSet.OK);
}

// ============================================================================
// MENU FUNCTIONS
// ============================================================================

/**
 * Send daily digest now (for testing)
 */
function sendDailyDigestNow() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Generating daily digest...', 'Digest', -1);
  
  const result = sendDailyDigest();
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
  
  const ui = SpreadsheetApp.getUi();
  if (result.success) {
    ui.alert('Success', 'Daily digest sent to Google Chat!', ui.ButtonSet.OK);
  } else {
    ui.alert('Error', 'Failed to send digest: ' + result.error, ui.ButtonSet.OK);
  }
}

/**
 * Send weekly digest now (for testing)
 */
function sendWeeklyDigestNow() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Generating weekly digest...', 'Digest', -1);
  
  const result = sendWeeklyDigest();
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
  
  const ui = SpreadsheetApp.getUi();
  if (result.success) {
    ui.alert('Success', 'Weekly digest sent to Google Chat!', ui.ButtonSet.OK);
  } else {
    ui.alert('Error', 'Failed to send digest: ' + result.error, ui.ButtonSet.OK);
  }
}
