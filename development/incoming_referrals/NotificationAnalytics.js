/**
 * ============================================================================
 * NOTIFICATIONANALYTICS.JS - Trends & Response Time Tracking
 * ============================================================================
 * 
 * @fileoverview Analytics for referral trends, response times, and anomalies
 * @author The Kidney Experts, PLLC
 * @version 1.0.0
 * @lastModified 2025-11-30
 * 
 * DESCRIPTION:
 * This module provides analytics features including:
 *   - Response time tracking (#10)
 *   - Seasonal/trend alerts (#9)
 *   - Volume anomaly detection
 *   - Overdue referral alerts
 *   - Marketing source analysis
 * 
 * DEPENDENCIES:
 *   - Dict_NotificationConfig.js (NOTIFICATION_CONFIG, MARKETING_CATEGORIES)
 *   - GoogleChatNotifications.js (sendToGoogleChat)
 * 
 * ============================================================================
 */

// ============================================================================
// RESPONSE TIME TRACKING (#10)
// ============================================================================

/**
 * Calculate response time metrics for all referrals
 * Uses Column AE (Complete) and AF (Status)
 * @returns {Object} Response time metrics
 */
function calculateResponseMetrics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return { error: 'No data available' };
  }
  
  const cols = NOTIFICATION_CONFIG.COLUMNS;
  const data = sheet.getRange(2, 1, lastRow - 1, 36).getValues();
  
  const now = new Date();
  const metrics = {
    total: data.length,
    byStatus: {
      New: { count: 0, avgAge: 0, ages: [] },
      'In Progress': { count: 0, avgAge: 0, ages: [] },
      Scheduled: { count: 0, avgAge: 0, ages: [] },
      'Awaiting Response': { count: 0, avgAge: 0, ages: [] },
      Complete: { count: 0, avgAge: 0, ages: [] }
    },
    byPriority: {
      EMERGENT: { total: 0, completed: 0, avgTimeToComplete: 0, times: [] },
      URGENT: { total: 0, completed: 0, avgTimeToComplete: 0, times: [] },
      SOON: { total: 0, completed: 0, avgTimeToComplete: 0, times: [] },
      ROUTINE: { total: 0, completed: 0, avgTimeToComplete: 0, times: [] },
      LOW: { total: 0, completed: 0, avgTimeToComplete: 0, times: [] }
    },
    overdue: [],
    urgentOverdue: [],
    sameDayRate: 0,
    under48HourRate: 0
  };
  
  let sameDayCount = 0;
  let under48HourCount = 0;
  let completedCount = 0;
  
  data.forEach((row, index) => {
    const timestamp = row[cols.TIMESTAMP - 1];
    const status = (row[cols.STATUS - 1] || 'New').toString();
    const isComplete = (row[cols.COMPLETE - 1] || '').toString().toUpperCase() === 'TRUE';
    const priority = (row[cols.AI_PRIORITY - 1] || '').toString().toUpperCase();
    
    if (!(timestamp instanceof Date)) return;
    
    const ageMs = now - timestamp;
    const ageHours = ageMs / (1000 * 60 * 60);
    const ageDays = ageHours / 24;
    
    // Status tracking
    if (metrics.byStatus.hasOwnProperty(status)) {
      metrics.byStatus[status].count++;
      metrics.byStatus[status].ages.push(ageDays);
    }
    
    // Priority tracking
    let priorityKey = null;
    if (priority.includes('EMERGENT')) priorityKey = 'EMERGENT';
    else if (priority.includes('URGENT')) priorityKey = 'URGENT';
    else if (priority.includes('SOON')) priorityKey = 'SOON';
    else if (priority.includes('ROUTINE')) priorityKey = 'ROUTINE';
    else if (priority.includes('LOW')) priorityKey = 'LOW';
    
    if (priorityKey) {
      metrics.byPriority[priorityKey].total++;
      
      if (isComplete || status === 'Complete' || status === 'Scheduled') {
        metrics.byPriority[priorityKey].completed++;
        metrics.byPriority[priorityKey].times.push(ageDays);
        completedCount++;
        
        if (ageDays < 1) sameDayCount++;
        if (ageDays < 2) under48HourCount++;
      }
    }
    
    // Overdue detection
    const rowNum = index + 2;
    const patientName = `${row[cols.PATIENT_LAST - 1]}, ${row[cols.PATIENT_FIRST - 1]}`;
    
    if (!isComplete && status !== 'Complete' && status !== 'Scheduled') {
      // Check against thresholds
      const thresholds = NOTIFICATION_CONFIG.RESPONSE_THRESHOLDS;
      
      if (priorityKey === 'EMERGENT' && ageHours > thresholds.EMERGENT_MAX) {
        metrics.urgentOverdue.push({
          row: rowNum,
          patient: patientName,
          priority: priorityKey,
          ageHours: Math.round(ageHours),
          status: status
        });
      } else if (priorityKey === 'URGENT' && ageHours > thresholds.URGENT_MAX) {
        metrics.urgentOverdue.push({
          row: rowNum,
          patient: patientName,
          priority: priorityKey,
          ageHours: Math.round(ageHours),
          status: status
        });
      } else if (ageHours > thresholds.OVERDUE_WARNING) {
        metrics.overdue.push({
          row: rowNum,
          patient: patientName,
          priority: priorityKey || 'UNKNOWN',
          ageHours: Math.round(ageHours),
          status: status
        });
      }
    }
  });
  
  // Calculate averages
  for (const status in metrics.byStatus) {
    const ages = metrics.byStatus[status].ages;
    if (ages.length > 0) {
      metrics.byStatus[status].avgAge = (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
    }
  }
  
  for (const priority in metrics.byPriority) {
    const times = metrics.byPriority[priority].times;
    if (times.length > 0) {
      metrics.byPriority[priority].avgTimeToComplete = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
    }
  }
  
  // Overall rates
  if (completedCount > 0) {
    metrics.sameDayRate = ((sameDayCount / completedCount) * 100).toFixed(0);
    metrics.under48HourRate = ((under48HourCount / completedCount) * 100).toFixed(0);
  }
  
  return metrics;
}

/**
 * Send overdue referral alerts
 */
function sendOverdueAlerts() {
  try {
    const metrics = calculateResponseMetrics();
    
    if (metrics.urgentOverdue.length === 0 && metrics.overdue.length === 0) {
      console.log('No overdue referrals to alert');
      return { success: true, message: 'No overdue referrals' };
    }
    
    let text = '';
    
    // Urgent overdue (EMERGENT/URGENT past threshold)
    if (metrics.urgentOverdue.length > 0) {
      text += `*🚨 URGENT OVERDUE REFERRALS*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `These high-priority referrals need immediate attention:\n\n`;
      
      metrics.urgentOverdue.forEach(ref => {
        const emoji = ref.priority === 'EMERGENT' ? '🚨' : '⚠️';
        text += `${emoji} *${ref.patient}*\n`;
        text += `   Priority: ${ref.priority} | Age: ${ref.ageHours}h | Status: ${ref.status}\n`;
        text += `   🔗 <${getRowUrl(ref.row)}|View Row ${ref.row}>\n\n`;
      });
    }
    
    // Regular overdue (>48 hours)
    if (metrics.overdue.length > 0) {
      text += `*⏰ REFERRALS PENDING > 48 HOURS*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      // Group by priority
      const grouped = {};
      metrics.overdue.forEach(ref => {
        if (!grouped[ref.priority]) grouped[ref.priority] = [];
        grouped[ref.priority].push(ref);
      });
      
      for (const priority in grouped) {
        text += `\n*${priority}:*\n`;
        grouped[priority].slice(0, 5).forEach(ref => {
          const days = Math.round(ref.ageHours / 24);
          text += `• ${ref.patient} (${days} days, ${ref.status})\n`;
        });
        if (grouped[priority].length > 5) {
          text += `  _...and ${grouped[priority].length - 5} more_\n`;
        }
      }
    }
    
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔗 <${getSpreadsheetUrl()}|Open Referral Sheet>\n`;
    
    const result = sendToGoogleChat({ text: text });
    
    // Also send email for urgent overdue
    if (metrics.urgentOverdue.length > 0) {
      sendOverdueEscalationEmail(metrics.urgentOverdue);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error sending overdue alerts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email for urgent overdue referrals
 * @param {Array} overdueRefs - List of overdue referrals
 */
function sendOverdueEscalationEmail(overdueRefs) {
  if (!overdueRefs || overdueRefs.length === 0) return;
  
  const subject = `🚨 ${overdueRefs.length} Urgent/Emergent Referral(s) Overdue`;
  
  let body = `
URGENT: OVERDUE REFERRAL ALERT
==============================

The following high-priority referrals have exceeded their response time thresholds:

`;
  
  overdueRefs.forEach(ref => {
    body += `
${ref.priority}: ${ref.patient}
  - Age: ${ref.ageHours} hours
  - Current Status: ${ref.status}
  - View: ${getRowUrl(ref.row)}
`;
  });
  
  body += `
---
This is an automated alert from TKE Referral Bot.
`;
  
  NOTIFICATION_CONFIG.ESCALATION_EMAILS.forEach(email => {
    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body.trim()
      });
    } catch (e) {
      console.error('Failed to send overdue email to ' + email, e);
    }
  });
}

// ============================================================================
// TREND ANALYSIS (#9)
// ============================================================================

/**
 * Analyze volume trends and detect anomalies
 * @returns {Object} Trend analysis results
 */
function analyzeVolumeTrends() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return { error: 'Insufficient data' };
  }
  
  const cols = NOTIFICATION_CONFIG.COLUMNS;
  const timestamps = sheet.getRange(2, cols.TIMESTAMP, lastRow - 1, 1).getValues();
  
  const now = new Date();
  
  // Calculate daily volumes for the last 30 days
  const dailyVolumes = {};
  const weeklyVolumes = {};
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = Utilities.formatDate(date, NOTIFICATION_CONFIG.TIMEZONE, 'yyyy-MM-dd');
    dailyVolumes[key] = 0;
  }
  
  timestamps.forEach(row => {
    const ts = row[0];
    if (ts instanceof Date) {
      const key = Utilities.formatDate(ts, NOTIFICATION_CONFIG.TIMEZONE, 'yyyy-MM-dd');
      if (dailyVolumes.hasOwnProperty(key)) {
        dailyVolumes[key]++;
      }
    }
  });
  
  // Calculate statistics
  const volumes = Object.values(dailyVolumes);
  const todayVolume = volumes[0];
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const stdDev = Math.sqrt(volumes.map(v => Math.pow(v - avgVolume, 2)).reduce((a, b) => a + b, 0) / volumes.length);
  
  // This week vs last week
  const thisWeekVolumes = volumes.slice(0, 7);
  const lastWeekVolumes = volumes.slice(7, 14);
  const thisWeekTotal = thisWeekVolumes.reduce((a, b) => a + b, 0);
  const lastWeekTotal = lastWeekVolumes.reduce((a, b) => a + b, 0);
  
  // Detect anomalies (>2 standard deviations)
  const anomalies = [];
  if (todayVolume > avgVolume + 2 * stdDev) {
    anomalies.push({
      type: 'HIGH_VOLUME',
      message: `Today's volume (${todayVolume}) is significantly higher than average (${avgVolume.toFixed(1)})`
    });
  }
  
  // Week-over-week trend
  let weekTrend = 0;
  if (lastWeekTotal > 0) {
    weekTrend = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal * 100).toFixed(0);
  }
  
  return {
    todayVolume,
    avgDailyVolume: avgVolume.toFixed(1),
    stdDev: stdDev.toFixed(1),
    thisWeekTotal,
    lastWeekTotal,
    weekOverWeekChange: weekTrend,
    anomalies,
    dailyVolumes: Object.entries(dailyVolumes).slice(0, 7) // Last 7 days
  };
}

/**
 * Send trend alert if anomalies detected
 */
function sendTrendAlerts() {
  try {
    const trends = analyzeVolumeTrends();
    
    if (!trends.anomalies || trends.anomalies.length === 0) {
      console.log('No trend anomalies to report');
      return { success: true, message: 'No anomalies' };
    }
    
    let text = `*📈 TREND ALERT*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    trends.anomalies.forEach(anomaly => {
      if (anomaly.type === 'HIGH_VOLUME') {
        text += `🔥 *High Volume Detected*\n`;
        text += `${anomaly.message}\n\n`;
      }
    });
    
    // Add context
    text += `*📊 Current Stats:*\n`;
    text += `• Today: ${trends.todayVolume} referrals\n`;
    text += `• 30-day avg: ${trends.avgDailyVolume}/day\n`;
    text += `• This week: ${trends.thisWeekTotal} total\n`;
    
    const changeIcon = parseInt(trends.weekOverWeekChange) >= 0 ? '📈' : '📉';
    const changeSign = parseInt(trends.weekOverWeekChange) >= 0 ? '+' : '';
    text += `• vs Last week: ${changeIcon} ${changeSign}${trends.weekOverWeekChange}%\n`;
    
    return sendToGoogleChat({ text: text });
    
  } catch (error) {
    console.error('Error sending trend alerts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get seasonal context/insights
 * @returns {Object} Seasonal insights
 */
function getSeasonalInsights() {
  const now = new Date();
  const month = now.getMonth();
  
  const insights = {
    currentMonth: Utilities.formatDate(now, NOTIFICATION_CONFIG.TIMEZONE, 'MMMM'),
    predictions: [],
    tips: []
  };
  
  // Seasonal patterns (based on typical healthcare trends)
  switch (month) {
    case 0: // January
      insights.predictions.push('Post-holiday volume typically increases as patients catch up on appointments');
      insights.tips.push('Expect higher volume from new insurance enrollees');
      break;
    case 1: // February
    case 2: // March
      insights.predictions.push('Steady volume expected');
      insights.tips.push('Good time to process backlog from holidays');
      break;
    case 3: // April
    case 4: // May
      insights.predictions.push('Spring typically sees stable referral patterns');
      break;
    case 5: // June
    case 6: // July
      insights.predictions.push('Summer months may see slight decrease as patients vacation');
      insights.tips.push('Consider proactive outreach to pending patients');
      break;
    case 7: // August
      insights.predictions.push('Back-to-school season may increase family scheduling');
      break;
    case 8: // September
    case 9: // October
      insights.predictions.push('Fall typically sees increased volume');
      insights.tips.push('Prepare for flu season-related kidney concerns');
      break;
    case 10: // November
      insights.predictions.push('Pre-holiday rush expected - patients want appointments before year-end');
      insights.tips.push('Insurance deductible deadlines drive increased volume');
      break;
    case 11: // December
      insights.predictions.push('Early month busy, late month slow due to holidays');
      insights.tips.push('Use slower period for year-end reporting and cleanup');
      break;
  }
  
  return insights;
}

// ============================================================================
// MARKETING ANALYTICS
// ============================================================================

/**
 * Analyze marketing sources for self-referrals
 * @param {number} days - Number of days to analyze
 * @returns {Object} Marketing analytics
 */
function analyzeMarketingSources(days = 30) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return { error: 'No data available' };
  }
  
  const cols = NOTIFICATION_CONFIG.COLUMNS;
  const data = sheet.getRange(2, 1, lastRow - 1, 36).getValues();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const sources = {};
  let totalSelfReferrals = 0;
  
  data.forEach(row => {
    const timestamp = row[cols.TIMESTAMP - 1];
    const selfRef = (row[cols.SELF_REFERRAL - 1] || '').toString().toLowerCase();
    const howHeard = row[cols.HOW_HEARD - 1] || '';
    
    if (timestamp instanceof Date && timestamp >= cutoffDate && selfRef === 'yes') {
      totalSelfReferrals++;
      
      const category = categorizeMarketingSource(howHeard);
      if (!sources[category.label]) {
        sources[category.label] = {
          icon: category.icon,
          count: 0,
          examples: []
        };
      }
      sources[category.label].count++;
      
      // Keep up to 3 examples
      if (sources[category.label].examples.length < 3 && howHeard.toString().trim()) {
        sources[category.label].examples.push(howHeard.toString().trim());
      }
    }
  });
  
  // Sort by count
  const sortedSources = Object.entries(sources)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([label, data]) => ({
      label,
      icon: data.icon,
      count: data.count,
      percentage: ((data.count / totalSelfReferrals) * 100).toFixed(1),
      examples: data.examples
    }));
  
  return {
    totalSelfReferrals,
    period: `${days} days`,
    sources: sortedSources,
    topSource: sortedSources[0] || null
  };
}

// ============================================================================
// MENU FUNCTIONS
// ============================================================================

/**
 * Show response time metrics in a dialog
 */
function showResponseMetrics() {
  const metrics = calculateResponseMetrics();
  const ui = SpreadsheetApp.getUi();
  
  let message = 'RESPONSE TIME METRICS\n';
  message += '=====================\n\n';
  
  message += 'STATUS BREAKDOWN:\n';
  for (const status in metrics.byStatus) {
    const data = metrics.byStatus[status];
    message += `  ${status}: ${data.count} (avg age: ${data.avgAge} days)\n`;
  }
  
  message += '\nPRIORITY PERFORMANCE:\n';
  for (const priority in metrics.byPriority) {
    const data = metrics.byPriority[priority];
    if (data.total > 0) {
      const rate = ((data.completed / data.total) * 100).toFixed(0);
      message += `  ${priority}: ${data.completed}/${data.total} (${rate}%) avg ${data.avgTimeToComplete} days\n`;
    }
  }
  
  message += `\nOVERALL RATES:\n`;
  message += `  Same-day processing: ${metrics.sameDayRate}%\n`;
  message += `  Under 48-hour: ${metrics.under48HourRate}%\n`;
  
  message += `\nOVERDUE:\n`;
  message += `  Urgent/Emergent: ${metrics.urgentOverdue.length}\n`;
  message += `  Standard (>48h): ${metrics.overdue.length}\n`;
  
  ui.alert('Response Metrics', message, ui.ButtonSet.OK);
}

/**
 * Show marketing analytics in a dialog
 */
function showMarketingAnalytics() {
  const analytics = analyzeMarketingSources(30);
  const ui = SpreadsheetApp.getUi();
  
  if (analytics.error) {
    ui.alert('Error', analytics.error, ui.ButtonSet.OK);
    return;
  }
  
  let message = `MARKETING SOURCE ANALYSIS (${analytics.period})\n`;
  message += '=====================================\n\n';
  message += `Total Self-Referrals: ${analytics.totalSelfReferrals}\n\n`;
  
  message += 'SOURCE BREAKDOWN:\n';
  analytics.sources.forEach((source, i) => {
    message += `  ${i + 1}. ${source.icon} ${source.label}: ${source.count} (${source.percentage}%)\n`;
  });
  
  if (analytics.topSource) {
    message += `\nTOP SOURCE: ${analytics.topSource.icon} ${analytics.topSource.label}\n`;
    message += `Accounts for ${analytics.topSource.percentage}% of self-referrals\n`;
  }
  
  ui.alert('Marketing Analytics', message, ui.ButtonSet.OK);
}

/**
 * Send overdue alerts now (for testing)
 */
function sendOverdueAlertsNow() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Checking for overdue referrals...', 'Alerts', -1);
  
  const result = sendOverdueAlerts();
  
  SpreadsheetApp.getActiveSpreadsheet().toast('', '', 1);
  
  const ui = SpreadsheetApp.getUi();
  if (result.success) {
    ui.alert('Success', result.message || 'Overdue alerts sent!', ui.ButtonSet.OK);
  } else {
    ui.alert('Error', 'Failed: ' + result.error, ui.ButtonSet.OK);
  }
}

/**
 * Create trigger for daily overdue check
 */
function createOverdueCheckTrigger() {
  // Remove existing
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendOverdueAlerts') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Check twice daily: 9 AM and 2 PM
  ScriptApp.newTrigger('sendOverdueAlerts')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .inTimezone(NOTIFICATION_CONFIG.TIMEZONE)
    .create();
  
  ScriptApp.newTrigger('sendOverdueAlerts')
    .timeBased()
    .atHour(14)
    .everyDays(1)
    .inTimezone(NOTIFICATION_CONFIG.TIMEZONE)
    .create();
  
  SpreadsheetApp.getUi().alert(
    'Overdue Check Triggers Created',
    'Overdue referral alerts will be sent at 9 AM and 2 PM CST daily.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
