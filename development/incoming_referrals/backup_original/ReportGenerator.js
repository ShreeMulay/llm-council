/**
 * Report Generator Module
 * @module ReportGenerator
 * @description Handles all reporting functionality
 * @version 1.0
 */

const ReportGenerator = {
  /**
   * Generate master report combining all data
   */
  generateMasterReport: function() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      
      if (!sheet) {
        throw new Error('Data sheet not found');
      }
      
      // Create or clear master report sheet
      let reportSheet = ss.getSheetByName('Master Report');
      if (!reportSheet) {
        reportSheet = ss.insertSheet('Master Report');
      } else {
        reportSheet.clear();
      }
      
      const lastRow = sheet.getLastRow();
      const timestamp = new Date().toLocaleString();
      
      // Gather all statistics
      const stats = this.gatherStatistics(sheet);
      
      // Build report content
      const reportContent = [
        ['Medical Referral System - Master Report'],
        ['Generated:', timestamp],
        [''],
        ['=== OVERVIEW ==='],
        ['Total Referrals:', lastRow - 1],
        ['Date Range:', `${stats.dateRange.start} to ${stats.dateRange.end}`],
        [''],
        ['=== DATA QUALITY METRICS ==='],
        ['Complete Records:', `${stats.completeRecords} (${stats.completenessPercent}%)`],
        ['Records with Issues:', stats.recordsWithIssues],
        [''],
        ['=== PHONE NUMBER ANALYSIS ==='],
        ['Total Phone Numbers:', stats.phoneStats.total],
        ['Valid Numbers:', `${stats.phoneStats.valid} (${stats.phoneStats.validPercent}%)`],
        ['Invalid Numbers:', stats.phoneStats.invalid],
        ['Missing Numbers:', stats.phoneStats.missing],
        [''],
        ['=== CLINIC ANALYSIS ==='],
        ['Unique Clinics:', stats.clinicStats.unique],
        ['Most Common Clinic:', stats.clinicStats.mostCommon],
        ['Self Referrals:', stats.clinicStats.selfReferrals],
        ['Government Facilities:', stats.clinicStats.government],
        ['Unknown/Invalid:', stats.clinicStats.unknown],
        [''],
        ['=== TOP 10 CLINICS BY FREQUENCY ===']
      ];
      
      // Add top clinics
      stats.topClinics.forEach((clinic, index) => {
        reportContent.push([`${index + 1}. ${clinic.name}`, `${clinic.count} referrals`]);
      });
      
      reportContent.push(['']);
      reportContent.push(['=== DAILY REFERRAL VOLUME (Last 30 Days) ===']);
      
      // Add daily volume
      stats.dailyVolume.forEach(day => {
        reportContent.push([day.date, `${day.count} referrals`]);
      });
      
      reportContent.push(['']);
      reportContent.push(['=== MISSING REQUIRED FIELDS ===']);
      reportContent.push(['Field', 'Missing Count', 'Percentage']);
      
      // Add missing field analysis
      Object.entries(stats.missingFields).forEach(([field, count]) => {
        const percent = Math.round((count / (lastRow - 1)) * 100);
        reportContent.push([field, count, `${percent}%`]);
      });
      
      // Write report to sheet
      reportSheet.getRange(1, 1, reportContent.length, 2).setValues(reportContent);
      
      // Format report
      this.formatMasterReport(reportSheet);
      
      // Save report timestamp
      PropertiesService.getDocumentProperties()
        .setProperty('LAST_MASTER_REPORT', timestamp);
      
      return true;
      
    } catch (error) {
      console.error('Master report generation failed:', error);
      throw error;
    }
  },
  
  /**
   * Generate daily summary report
   * @returns {string} Report text
   */
  generateDailyReport: function() {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return 'No data available for report';
      }
      
      // Get today's referrals
      const timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      const clinics = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
      const completeColumn = sheet.getRange(2, 31, lastRow - 1, 1).getValues();
      
      let todayCount = 0;
      let completeCount = 0;
      let incompleteCount = 0;
      const clinicCounts = new Map();
      
      timestamps.forEach((row, index) => {
        const timestamp = new Date(row[0]);
        if (timestamp >= today && timestamp < tomorrow) {
          todayCount++;
          
          // Check if complete
          if (completeColumn[index][0]) {
            completeCount++;
          } else {
            incompleteCount++;
          }
          
          // Count by clinic
          const clinic = clinics[index][0];
          if (clinic) {
            const clinicName = clinic.toString();
            clinicCounts.set(clinicName, (clinicCounts.get(clinicName) || 0) + 1);
          }
        }
      });
      
      // Build report text
      let report = `📊 Daily Report for ${today.toLocaleDateString()}\n\n`;
      report += `Total Referrals Today: ${todayCount}\n`;
      report += `✅ Complete: ${completeCount}\n`;
      report += `⏳ Incomplete: ${incompleteCount}\n`;
      report += `📈 Completion Rate: ${todayCount > 0 ? Math.round((completeCount / todayCount) * 100) : 0}%\n\n`;
      
      if (clinicCounts.size > 0) {
        report += 'Top Referring Clinics Today:\n';
        const sortedClinics = Array.from(clinicCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        sortedClinics.forEach(([clinic, count]) => {
          report += `• ${clinic}: ${count} referrals\n`;
        });
      }
      
      // Save daily stats
      this.saveDailyStats(todayCount, completeCount, incompleteCount);
      
      return report;
      
    } catch (error) {
      console.error('Daily report generation failed:', error);
      return 'Error generating daily report';
    }
  },
  
  /**
   * Gather comprehensive statistics
   * @private
   */
  gatherStatistics: function(sheet) {
    const lastRow = sheet.getLastRow();
    const stats = {
      dateRange: { start: '', end: '' },
      completeRecords: 0,
      completenessPercent: 0,
      recordsWithIssues: 0,
      phoneStats: { total: 0, valid: 0, invalid: 0, missing: 0, validPercent: 0 },
      clinicStats: { unique: 0, mostCommon: '', selfReferrals: 0, government: 0, unknown: 0 },
      topClinics: [],
      dailyVolume: [],
      missingFields: {}
    };
    
    if (lastRow <= 1) return stats;
    
    // Get all data
    const allData = sheet.getRange(2, 1, lastRow - 1, 33).getValues();
    
    // Date range
    const timestamps = allData.map(row => new Date(row[0])).filter(d => !isNaN(d));
    if (timestamps.length > 0) {
      timestamps.sort((a, b) => a - b);
      stats.dateRange.start = timestamps[0].toLocaleDateString();
      stats.dateRange.end = timestamps[timestamps.length - 1].toLocaleDateString();
    }
    
    // Analyze completeness and quality
    const requiredColumns = [3, 4, 8, 9, 10, 23, 26]; // D, E, I, J, K, X, AA (0-based)
    const phoneColumns = [6, 7, 23, 29]; // G, H, X, AD (0-based)
    const clinicMap = new Map();
    
    allData.forEach(row => {
      // Check completeness
      let isComplete = true;
      requiredColumns.forEach(colIndex => {
        if (!row[colIndex] || row[colIndex] === '') {
          isComplete = false;
          const fieldName = this.getFieldName(colIndex + 1);
          stats.missingFields[fieldName] = (stats.missingFields[fieldName] || 0) + 1;
        }
      });
      
      if (isComplete) stats.completeRecords++;
      
      // Analyze phone numbers
      phoneColumns.forEach(colIndex => {
        const phone = row[colIndex];
        if (phone && phone !== '') {
          stats.phoneStats.total++;
          const cleaned = phone.toString().replace(/\D/g, '');
          if (cleaned.length >= 10 && cleaned.length <= 11) {
            stats.phoneStats.valid++;
          } else {
            stats.phoneStats.invalid++;
          }
        } else {
          stats.phoneStats.missing++;
        }
      });
      
      // Analyze clinics
      const clinic = row[3]; // Column D (0-based)
      if (clinic) {
        const clinicName = clinic.toString().trim();
        const clinicLower = clinicName.toLowerCase();
        
        // Count clinic frequency
        clinicMap.set(clinicName, (clinicMap.get(clinicName) || 0) + 1);
        
        // Categorize
        if (clinicLower.includes('self') || clinicLower.includes('patient referral')) {
          stats.clinicStats.selfReferrals++;
        } else if (clinicLower.includes('va ') || clinicLower.includes('health dept') || 
                   clinicLower.includes('correctional')) {
          stats.clinicStats.government++;
        } else if (clinicLower === 'unknown' || clinicLower === 'n/a' || clinicLower === '') {
          stats.clinicStats.unknown++;
        }
      }
    });
    
    // Calculate percentages
    stats.completenessPercent = Math.round((stats.completeRecords / (lastRow - 1)) * 100);
    stats.recordsWithIssues = (lastRow - 1) - stats.completeRecords;
    
    if (stats.phoneStats.total > 0) {
      stats.phoneStats.validPercent = Math.round((stats.phoneStats.valid / stats.phoneStats.total) * 100);
    }
    
    // Get top clinics
    const sortedClinics = Array.from(clinicMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    stats.topClinics = sortedClinics.map(([name, count]) => ({ name, count }));
    stats.clinicStats.unique = clinicMap.size;
    
    if (sortedClinics.length > 0) {
      stats.clinicStats.mostCommon = sortedClinics[0][0];
    }
    
    // Calculate daily volume for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyCounts = new Map();
    timestamps.forEach(date => {
      if (date >= thirtyDaysAgo) {
        const dateKey = date.toLocaleDateString();
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
      }
    });
    
    stats.dailyVolume = Array.from(dailyCounts.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-10) // Last 10 days
      .map(([date, count]) => ({ date, count }));
    
    return stats;
  },
  
  /**
   * Get field name from column index
   * @private
   */
  getFieldName: function(columnIndex) {
    const fieldMap = {
      4: 'Clinic Name',
      5: 'Referring Provider',
      9: 'Patient Last Name',
      10: 'Patient First Name',
      11: 'Patient Date of Birth',
      24: 'Patient Phone Number',
      27: 'Reason for Referral'
    };
    
    return fieldMap[columnIndex] || `Column ${String.fromCharCode(64 + columnIndex)}`;
  },
  
  /**
   * Format master report sheet
   * @private
   */
  formatMasterReport: function(sheet) {
    // Title
    sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    
    // Section headers
    const sectionRows = [4, 8, 12, 17, 22]; // Adjust based on content
    sectionRows.forEach(row => {
      const range = sheet.getRange(row, 1);
      if (range.getValue().toString().startsWith('===')) {
        range.setFontSize(12).setFontWeight('bold').setBackground('#f0f0f0');
      }
    });
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 2);
    
    // Add borders to data sections
    const lastRow = sheet.getLastRow();
    sheet.getRange(1, 1, lastRow, 2).setBorder(
      true, true, true, true, false, false,
      '#cccccc', SpreadsheetApp.BorderStyle.SOLID
    );
  },
  
  /**
   * Save daily statistics for trending
   * @private
   */
  saveDailyStats: function(total, complete, incomplete) {
    try {
      const props = PropertiesService.getDocumentProperties();
      const stats = JSON.parse(props.getProperty('DAILY_STATS') || '[]');
      
      stats.push({
        date: new Date().toISOString().split('T')[0],
        total: total,
        complete: complete,
        incomplete: incomplete
      });
      
      // Keep only last 90 days
      if (stats.length > 90) {
        stats.shift();
      }
      
      props.setProperty('DAILY_STATS', JSON.stringify(stats));
      
    } catch (error) {
      console.error('Failed to save daily stats:', error);
    }
  },
  
  /**
   * Generate weekly summary report
   */
  generateWeeklyReport: function() {
    try {
      const props = PropertiesService.getDocumentProperties();
      const dailyStats = JSON.parse(props.getProperty('DAILY_STATS') || '[]');
      
      // Get last 7 days
      const lastWeek = dailyStats.slice(-7);
      
      if (lastWeek.length === 0) {
        return 'No data available for weekly report';
      }
      
      const totals = lastWeek.reduce((acc, day) => ({
        total: acc.total + day.total,
        complete: acc.complete + day.complete,
        incomplete: acc.incomplete + day.incomplete
      }), { total: 0, complete: 0, incomplete: 0 });
      
      const avgDaily = Math.round(totals.total / lastWeek.length);
      const completionRate = totals.total > 0 ? 
        Math.round((totals.complete / totals.total) * 100) : 0;
      
      let report = '📊 Weekly Summary Report\n\n';
      report += `Period: ${lastWeek[0].date} to ${lastWeek[lastWeek.length - 1].date}\n\n`;
      report += `Total Referrals: ${totals.total}\n`;
      report += `Average Daily: ${avgDaily}\n`;
      report += `Completion Rate: ${completionRate}%\n\n`;
      report += 'Daily Breakdown:\n';
      
      lastWeek.forEach(day => {
        const dayCompletion = day.total > 0 ? 
          Math.round((day.complete / day.total) * 100) : 0;
        report += `${day.date}: ${day.total} referrals (${dayCompletion}% complete)\n`;
      });
      
      return report;
      
    } catch (error) {
      console.error('Weekly report generation failed:', error);
      return 'Error generating weekly report';
    }
  }
};