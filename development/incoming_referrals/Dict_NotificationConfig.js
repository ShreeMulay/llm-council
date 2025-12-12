/**
 * ============================================================================
 * DICT_NOTIFICATIONCONFIG.JS - Notification System Configuration
 * ============================================================================
 * 
 * @fileoverview Central configuration for Google Chat notifications,
 *               email escalation, and digest scheduling
 * @author The Kidney Experts, PLLC
 * @version 1.0.0
 * @lastModified 2025-11-30
 * 
 * DESCRIPTION:
 * Contains all configuration constants for the notification system including:
 *   - Google Chat webhook settings
 *   - Email escalation recipients
 *   - Column mappings for data extraction
 *   - Marketing source categorization
 *   - Digest scheduling settings
 * 
 * ============================================================================
 */

/**
 * Main notification configuration object
 * @const {Object}
 */
const NOTIFICATION_CONFIG = {
  
  // ========== GOOGLE CHAT WEBHOOK ==========
  WEBHOOK_URL: 'https://chat.googleapis.com/v1/spaces/AAQAWqAS3rI/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=psxImDrYXNrHHMICgM-34gxdMVS5f8UWxcautFUpac8',
  BOT_NAME: 'TKE Referral Bot',
  BOT_ICON: 'https://cdn-icons-png.flaticon.com/512/3774/3774299.png',
  
  // ========== EMAIL ESCALATION ==========
  ESCALATION_EMAILS: [
    'leadership@thekidneyexperts.com',
    'carol.smith@thekidneyexperts.com'
  ],
  ESCALATION_PRIORITIES: ['1-EMERGENT', '2-URGENT'],
  
  // ========== DIGEST SCHEDULING ==========
  DAILY_DIGEST_HOUR: 17,        // 5 PM
  WEEKLY_DIGEST_DAY: ScriptApp.WeekDay.FRIDAY,
  TIMEZONE: 'America/Chicago',  // CST
  
  // ========== SPREADSHEET ==========
  SHEET_NAME: 'Form Responses 1',
  
  // ========== COLUMN INDICES (1-based) ==========
  COLUMNS: {
    TIMESTAMP: 1,              // A - Form submission time
    SELF_REFERRAL: 2,          // B - Yes/No
    HOW_HEARD: 3,              // C - How did you hear about us?
    CLINIC: 4,                 // D - Clinic Name
    PROVIDER: 5,               // E - Referring Provider
    STAFF: 6,                  // F - Staff Member
    CLINIC_PHONE: 7,           // G - Clinic Phone
    CLINIC_FAX: 8,             // H - Clinic Fax
    PATIENT_LAST: 9,           // I - Patient Last Name
    PATIENT_FIRST: 10,         // J - Patient First Name
    DOB: 11,                   // K - Patient DOB
    SEX: 12,                   // L - Sex
    SSN: 13,                   // M - SSN (NEVER USE)
    RACE: 14,                  // N - Race
    SELF_PAY: 15,              // O - Self Pay
    PRIMARY_INSURANCE: 16,     // P - Primary Insurance
    PRIMARY_SUBSCRIBER_ID: 17, // Q - Primary Subscriber ID
    SECONDARY_INSURANCE: 18,   // R - Secondary Insurance
    SECONDARY_SUBSCRIBER_ID: 19, // S - Secondary Subscriber ID
    ADDRESS: 20,               // T - Street Address
    CITY: 21,                  // U - City
    STATE: 22,                 // V - State
    ZIP: 23,                   // W - Zip Code
    PATIENT_PHONE: 24,         // X - Patient Phone
    LAB_DATE: 25,              // Y - Date of Last Lab Work
    LAST_VISIT: 26,            // Z - Date of Last Office Visit
    REASON: 27,                // AA - Reason for Referral
    CREATININE: 28,            // AB - Last Creatinine
    GFR: 29,                   // AC - Last GFR
    REFERRAL_PHONE: 30,        // AD - Referral Dept Phone
    COMPLETE: 31,              // AE - Complete (TRUE/FALSE)
    STATUS: 32,                // AF - Status
    MEMO: 33,                  // AG - Memo
    AI_PRIORITY: 34,           // AH - AI Priority
    AI_REASONING: 35,          // AI - AI Reasoning
    AI_TIMESTAMP: 36           // AJ - AI Timestamp
  },
  
  // ========== STATUS VALUES ==========
  STATUS_VALUES: {
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    SCHEDULED: 'Scheduled',
    AWAITING: 'Awaiting Response',
    COMPLETE: 'Complete'
  },
  
  // ========== PRIORITY CONFIGURATION ==========
  PRIORITIES: {
    '1-EMERGENT': {
      emoji: '🚨',
      label: 'EMERGENT',
      color: '#FF0000',
      guidance: 'Schedule Immediately',
      escalate: true
    },
    '2-URGENT': {
      emoji: '⚠️',
      label: 'URGENT',
      color: '#FF6B00',
      guidance: 'Schedule Within 48 Hours',
      escalate: true
    },
    '3-SOON': {
      emoji: '🔶',
      label: 'SOON',
      color: '#FFD700',
      guidance: 'Schedule Within 1 Week',
      escalate: false
    },
    '4-ROUTINE': {
      emoji: '✅',
      label: 'ROUTINE',
      color: '#90EE90',
      guidance: 'Standard Scheduling',
      escalate: false
    },
    '5-LOW': {
      emoji: '📋',
      label: 'LOW',
      color: '#E0E0E0',
      guidance: 'When Available',
      escalate: false
    }
  },
  
  // ========== MISSING DATA FIELDS TO CHECK ==========
  REQUIRED_FIELDS: [
    { column: 16, name: 'Primary Insurance', checkSelfPay: true },
    { column: 24, name: 'Patient Phone', checkSelfPay: false },
    { column: 25, name: 'Lab Date', checkSelfPay: false },
    { column: 27, name: 'Reason for Referral', checkSelfPay: false },
    { column: 28, name: 'Creatinine', checkSelfPay: false },
    { column: 29, name: 'GFR', checkSelfPay: false }
  ],
  
  // ========== RESPONSE TIME THRESHOLDS (hours) ==========
  RESPONSE_THRESHOLDS: {
    EMERGENT_MAX: 4,      // 4 hours for emergent
    URGENT_MAX: 24,       // 24 hours for urgent
    SOON_MAX: 72,         // 3 days for soon
    ROUTINE_MAX: 120,     // 5 days for routine
    OVERDUE_WARNING: 48   // General warning at 48 hours
  }
};

/**
 * Marketing source categories for "How did you hear about us?"
 * @const {Object}
 */
const MARKETING_CATEGORIES = {
  FAMILY_PATIENT: {
    icon: '👨‍👩‍👧',
    label: 'Family/Existing Patient',
    keywords: [
      'husband', 'wife', 'daughter', 'son', 'mom', 'dad', 'father', 'mother',
      'patient', 'family', 'sister', 'brother', 'parent', 'spouse', 'relative',
      'is a patient', 'is pt', 'is a pt', 'family member', 'mil', 'fil',
      'mother in law', 'father in law', 'nephew', 'niece', 'cousin', 'aunt', 'uncle'
    ]
  },
  ONLINE_SEARCH: {
    icon: '🔍',
    label: 'Online Search',
    keywords: [
      'google', 'internet', 'online', 'website', 'web', 'search', 'googled',
      'looked up', 'look up', 'searching', 'found online', 'computer', 'compter'
    ]
  },
  WORD_OF_MOUTH: {
    icon: '👥',
    label: 'Word of Mouth',
    keywords: [
      'friend', 'word of mouth', 'neighbor', 'coworker', 'told me', 'told her',
      'told him', 'recommended', 'heard about', 'someone told', 'frien'
    ]
  },
  DOCTOR_RECOMMENDATION: {
    icon: '👨‍⚕️',
    label: 'Doctor Recommendation',
    keywords: [
      'dr.', 'dr ', 'doctor', 'pcp', 'physician', 'np', 'provider', 'referred by',
      'primary care', 'specialist', 'md', 'do', 'nurse practitioner', 'ob ',
      'gastro', 'neuro', 'surgeon', 'medical center', 'clinic refer'
    ]
  },
  HOSPITAL: {
    icon: '🏥',
    label: 'Hospital',
    keywords: [
      'hospital', 'er', 'emergency', 'baptist', 'methodist', 'regional',
      'medical center', 'from the hospital', 'er doctor', 'emergency room',
      'admitted', 'discharge', 'inpatient', 'tipton', 'dyersburg', 'union city'
    ]
  },
  RADIO_TV: {
    icon: '📻',
    label: 'Radio/TV',
    keywords: [
      'radio', 'tv', 'television', 'wtks', '101.3', 'commercial', 'advertisement',
      'ad on', 'heard on'
    ]
  },
  INSURANCE_DIRECTORY: {
    icon: '💳',
    label: 'Insurance Directory',
    keywords: [
      'insurance', 'bcbs', 'blue cross', 'aetna', 'uhc', 'united health',
      'tenncare', 'ambetter', 'cigna', 'humana', 'medicare', 'medicaid',
      'insurance company', 'insurance provider', 'provider lookup', 'directory'
    ]
  },
  LOCAL_PRESENCE: {
    icon: '🚗',
    label: 'Local Presence',
    keywords: [
      'drive by', 'drove by', 'sign', 'office', 'live in', 'saw the',
      'see the', 'near my', 'close to', 'in the area', 'ribbon cutting',
      'saw we had', 'seen we had'
    ]
  },
  WORK_PROFESSIONAL: {
    icon: '💼',
    label: 'Work/Professional',
    keywords: [
      'work', 'employee', 'job', 'case manager', 'social worker', 'i work at',
      'coworker', 'colleague', 'professional', 'clinical'
    ]
  },
  SOCIAL_MEDIA: {
    icon: '📱',
    label: 'Social Media',
    keywords: [
      'facebook', 'instagram', 'twitter', 'social media', 'tiktok', 'youtube'
    ]
  },
  WALK_IN: {
    icon: '🚶',
    label: 'Walk-in',
    keywords: [
      'walk in', 'walked in', 'visited', 'came in', 'stopped by', 'drop in'
    ]
  },
  DIALYSIS: {
    icon: '🩺',
    label: 'Dialysis Center',
    keywords: [
      'dialysis', 'davita', 'fresenius', 'dialysis center', 'dialysis clinic'
    ]
  },
  OTHER: {
    icon: '❓',
    label: 'Other',
    keywords: []  // Default fallback
  }
};

/**
 * Get spreadsheet URL for linking in notifications
 * @returns {string} The spreadsheet URL
 */
function getSpreadsheetUrl() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl();
}

/**
 * Get a direct link to a specific row in the spreadsheet
 * @param {number} row - The row number
 * @returns {string} URL with row reference
 */
function getRowUrl(row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetId = ss.getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME).getSheetId();
  return `${ss.getUrl()}#gid=${sheetId}&range=A${row}`;
}
