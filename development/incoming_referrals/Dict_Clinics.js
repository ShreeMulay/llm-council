/**
 * Clinic Name Dictionary
 * ======================
 * Master dictionary for normalizing clinic names
 * Extracted from ClinicNormalization.js for centralized management
 * 
 * Last Updated: 2025-11-29
 * 
 * USAGE:
 * - Keys are LOWERCASE for case-insensitive matching
 * - Values are the canonical (standardized) clinic name
 * 
 * TO ADD A NEW CLINIC:
 * 1. Add the lowercase key (how it appears in the form)
 * 2. Set the canonical name (proper format)
 * 3. Add common misspellings/variations as additional entries
 */

// ============================================
// CLINIC CONFIGURATION
// ============================================
const CLINIC_CONFIG = {
  COLUMN: {
    INDEX: 4,  // Column D - Clinic Name
    LETTER: 'D'
  },
  FORMATTING: {
    CORRECTED_COLOR: '#E6F3FF',      // Light blue for corrected entries
    SELF_REFERRAL_COLOR: '#FFF3CD',  // Light yellow for self-referrals
    GOVERNMENT_COLOR: '#E8F5E9',     // Light green for government facilities
    DUPLICATE_COLOR: '#FFE6CC',      // Light orange for potential duplicates
    UNKNOWN_COLOR: '#FFE6E6',        // Light red for unknown/invalid
    DEFAULT_COLOR: '#FFFFFF'         // White for unchanged
  },
  VALIDATION: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    REQUIRE_LETTERS: true
  }
};

// ============================================
// SPECIAL CASE PATTERNS
// ============================================
const CLINIC_SPECIAL_CASES = {
  selfReferrals: [
    'self', 'self made', 'self referral', 'self referred', 
    'patient self referred', 'personal', 'self made appt',
    'patient referral', 'patient refferal', 'phone referral', 
    'online', 'patient', 'patient called', 'walk in'
  ],
  unknown: [
    'unknown', 'unknown clinic', 'n/a', 'na', 'none', 'no clinic', '--', 
    'not applicable', 'tbd', 'test clinic', '.', 'blank'
  ],
  governmentFacilities: [
    'health department', 'health dept', 'correctional', 
    'va medical', 'veterans', 'military', 'naval', 'navy',
    'state veterans home', 'corecivic', 'whiteville correctional'
  ]
};

// ============================================
// MASTER CLINIC DICTIONARY
// ============================================
const CLINICS = {
  // ========== WEST TENNESSEE HEALTHCARE SYSTEM ==========
  // Core West Tennessee Healthcare locations
  'west tennessee healthcare': 'West Tennessee Healthcare',
  'west tn healthcare': 'West Tennessee Healthcare',
  'west tn healtcare': 'West Tennessee Healthcare',
  'wth': 'West Tennessee Healthcare',
  'wthc': 'West Tennessee Healthcare',
  'west tn hc': 'West Tennessee Healthcare',
  'wtnh': 'West Tennessee Healthcare',
  'wt medical group': 'West Tennessee Healthcare',
  'west tennessee medical group': 'West Tennessee Healthcare',
  
  // Specific WTH Locations - Standalone Clinics
  'caruthersville clinic': 'West Tennessee Healthcare - Caruthersville',
  'caruthersville medical': 'West Tennessee Healthcare - Caruthersville',
  'caruthersville west tennessee healthcare clinic': 'West Tennessee Healthcare - Caruthersville',
  'prime care - caruthersville': 'West Tennessee Healthcare - Caruthersville',
  'the - caruthersville clinic': 'West Tennessee Healthcare - Caruthersville',
  
  'hillview south': 'West Tennessee Healthcare - Hillview South',
  'hillview south clinic': 'West Tennessee Healthcare - Hillview South',
  'hillview south medical': 'West Tennessee Healthcare - Hillview South',
  'hillview south medical clinic': 'West Tennessee Healthcare - Hillview South',
  'hillview south medical group': 'West Tennessee Healthcare - Hillview South',
  'hillview south south fulton': 'West Tennessee Healthcare - Hillview South',
  'hillview clinic': 'West Tennessee Healthcare - Hillview South',
  'hilview south clinic': 'West Tennessee Healthcare - Hillview South',
  
  'northside': 'West Tennessee Healthcare - Northside',
  'northside clinic': 'West Tennessee Healthcare - Northside',
  'northside medical clinic primary care': 'West Tennessee Healthcare - Northside',
  'northside primary care': 'West Tennessee Healthcare - Northside',
  
  'thomsen farms': 'West Tennessee Healthcare - Thomsen Farms',
  'thomsen farms clinic': 'West Tennessee Healthcare - Thomsen Farms',
  'thomsen farms walk-in clinic': 'West Tennessee Healthcare - Thomsen Farms',
  'thomsen farms walk in clinic': 'West Tennessee Healthcare - Thomsen Farms',
  
  // WTH Primary Care Centers
  'primary care - bemis': 'West Tennessee Healthcare Primary Care - Bemis',
  'primary care bemis': 'West Tennessee Healthcare Primary Care - Bemis',
  'ws tn healthcare primary care halls': 'West Tennessee Healthcare Primary Care - Halls',
  'primary care - halls': 'West Tennessee Healthcare Primary Care - Halls',
  'primary care halls': 'West Tennessee Healthcare Primary Care - Halls',
  'primary care in halls': 'West Tennessee Healthcare Primary Care - Halls',
  'halls family walk-in clinic': 'West Tennessee Healthcare Primary Care - Halls',
  'primary care hillview': 'West Tennessee Healthcare - Hillview South',
  'mh primary care hillview': 'West Tennessee Healthcare - Hillview South',
  'mh primary care martin': 'West Tennessee Healthcare Primary Care - Martin',
  'west tennessee primary care martin': 'West Tennessee Healthcare Primary Care - Martin',
  'martin primary care': 'West Tennessee Healthcare Primary Care - Martin',
  'primary care center': 'West Tennessee Healthcare Primary Care',
  'primary care south': 'West Tennessee Healthcare Primary Care - South',
  
  // WTH Dyersburg locations
  'dyersburg': 'West Tennessee Healthcare - Dyersburg',
  'west tn dyersburg': 'West Tennessee Healthcare - Dyersburg',
  'west tn dyersburg clinic': 'West Tennessee Healthcare - Dyersburg',
  'dyersburg primary care': 'West Tennessee Healthcare Primary Care - Dyersburg',
  'dyersburg primary care center': 'West Tennessee Healthcare Primary Care - Dyersburg',
  'primary care - dyersburg': 'West Tennessee Healthcare Primary Care - Dyersburg',
  'primary care dyersburg': 'West Tennessee Healthcare Primary Care - Dyersburg',
  'primary care center - dyersburg': 'West Tennessee Healthcare Primary Care - Dyersburg',
  'primary care clinic dyersburg': 'West Tennessee Healthcare Primary Care - Dyersburg',
  'dyersburg ed': 'West Tennessee Healthcare - Emergency Department Dyersburg',
  'dyersburghospital er': 'West Tennessee Healthcare - Emergency Department Dyersburg',
  
  // WTH Other locations
  'west tn - martin': 'West Tennessee Healthcare - Martin',
  'volunteer hospital - martin': 'West Tennessee Healthcare - Volunteer Hospital Martin',
  'west tennessee healthcare - volunteer hospital': 'West Tennessee Healthcare - Volunteer Hospital',
  'west tn paris henry co clinic': 'West Tennessee Healthcare - Paris Henry County',
  'west tennessee healthcare - paris henry county': 'West Tennessee Healthcare - Paris Henry County',
  'paris henry county clinic': 'West Tennessee Healthcare - Paris Henry County',
  'paris henry county clinci': 'West Tennessee Healthcare - Paris Henry County',
  'west tn marvin thrive clinic': 'West Tennessee Healthcare - Marvin',
  'marvin thrive clinic ( ripley tn)': 'West Tennessee Healthcare - Marvin Ripley',
  
  'west tennessee healthcare - bolivar': 'West Tennessee Healthcare - Bolivar',
  'west tennessee healthcare - camden': 'West Tennessee Healthcare - Camden',
  'camden primary care': 'West Tennessee Healthcare - Camden',
  'camden primary clinic': 'West Tennessee Healthcare - Camden',
  'camden medical': 'West Tennessee Healthcare - Camden',
  'camden medical clinic': 'West Tennessee Healthcare - Camden',
  
  'west tennessee healthcare - henderson': 'West Tennessee Healthcare - Henderson',
  'wt henderson primary': 'West Tennessee Healthcare - Henderson',
  'henderson healthcare': 'West Tennessee Healthcare - Henderson',
  'prime care - henderson': 'West Tennessee Healthcare - Henderson',
  'prime care henderson': 'West Tennessee Healthcare - Henderson',
  'prime care henderson tn': 'West Tennessee Healthcare - Henderson',
  'prime care medical center henderson': 'West Tennessee Healthcare - Henderson',
  
  'west tennessee healthcare - selmer': 'West Tennessee Healthcare - Selmer',
  'west n medical group primary care selmer': 'West Tennessee Healthcare Primary Care - Selmer',
  'prime care - selmer': 'West Tennessee Healthcare - Selmer',
  'prime care selmer': 'West Tennessee Healthcare - Selmer',
  'prime c prime care selmer': 'West Tennessee Healthcare - Selmer',
  'prime carer selmer': 'West Tennessee Healthcare - Selmer',
  'selmer prime care': 'West Tennessee Healthcare - Selmer',
  'selmer clinic sent in referral via email': 'West Tennessee Healthcare - Selmer',
  
  'west tennessee healthcare - lexington': 'West Tennessee Healthcare - Lexington',
  'lexington healthcare': 'West Tennessee Healthcare - Lexington',
  'lexington primary care': 'West Tennessee Healthcare - Lexington',
  'lexington family practice': 'West Tennessee Healthcare - Lexington',
  
  'west tennessee healthcare - halls': 'West Tennessee Healthcare - Halls',
  'west tennessee healthcare - lift health': 'West Tennessee Healthcare - Lift Health',
  'lift walk-in': 'West Tennessee Healthcare - Lift Health',
  'the lift health clinic': 'West Tennessee Healthcare - Lift Health',
  
  'west tennessee healthcare - medsouth': 'West Tennessee Healthcare - MedSouth',
  'medsouth medical center': 'West Tennessee Healthcare - MedSouth',
  
  'prime care adamsville': 'West Tennessee Healthcare - Adamsville',
  'adamsville healthcare': 'West Tennessee Healthcare - Adamsville',
  
  // WTH Specialty departments
  'west tennessee healthcare - cardiology': 'West Tennessee Healthcare - Cardiology',
  'west tenn cardiology': 'West Tennessee Healthcare - Cardiology',
  'west tn med group specialty care': 'West Tennessee Healthcare Specialty Care',
  'wt internal med': 'West Tennessee Healthcare - Internal Medicine',
  'west tennessee healthcare - internal medicine': 'West Tennessee Healthcare - Internal Medicine',
  'west tennessee healthcare - neurology': 'West Tennessee Healthcare - Neurology',
  'west tn neurology': 'West Tennessee Healthcare - Neurology',
  'west tennessee healthcare - pediatrics': 'West Tennessee Healthcare - Pediatrics',
  'west ten pediatrics': 'West Tennessee Healthcare - Pediatrics',
  'west tennessee healthcare - pulmonology': 'West Tennessee Healthcare - Pulmonology',
  'west tennessee healthcare - emergency department': 'West Tennessee Healthcare - Emergency Department',
  'west tennessee healthcare - prime care': 'West Tennessee Healthcare - Prime Care',
  'prime care medical center': 'West Tennessee Healthcare - Prime Care',
  'west tennessee healthcare - urology': 'West Tennessee Healthcare - Urology',
  'west tennessee healthcare - urology dyersburg': 'West Tennessee Healthcare - Urology Dyersburg',
  "west tennessee healthcare - women's health": "West Tennessee Healthcare - Women's Health",
  
  // WTH Endocrinology
  'endocrinology': 'West Tennessee Healthcare - Endocrinology',
  'endocrine & diabetes clinic': 'West Tennessee Healthcare - Endocrinology',
  'west tennessee endocrinology': 'West Tennessee Healthcare - Endocrinology',
  'west tennessee healthcare - endocrinology': 'West Tennessee Healthcare - Endocrinology',
  'endocrinology jackson': 'West Tennessee Healthcare - Endocrinology Jackson',
  'west tennessee healthcare - endocrinology jackson': 'West Tennessee Healthcare - Endocrinology Jackson',
  'enocrinology jackson': 'West Tennessee Healthcare - Endocrinology Jackson',
  'endocrinology dyersburg': 'West Tennessee Healthcare - Endocrinology Dyersburg',
  'endocrinology dyersburg tn': 'West Tennessee Healthcare - Endocrinology Dyersburg',
  'west tennessee healthcare - endocrinology dyersburg': 'West Tennessee Healthcare - Endocrinology Dyersburg',
  'stmg endocrinology dyersburg': 'West Tennessee Healthcare - Endocrinology Dyersburg',
  
  // Cardiothoracic Surgery (part of WTH)
  'cardiothoracic surgery': 'West Tennessee Healthcare - Cardiothoracic Surgery',
  'cardiothoracic surgery center': 'West Tennessee Healthcare - Cardiothoracic Surgery',
  'cardiothoracis surgery center': 'West Tennessee Healthcare - Cardiothoracic Surgery',
  'ct surgery': 'West Tennessee Healthcare - Cardiothoracic Surgery',
  'cv surgery': 'West Tennessee Healthcare - Cardiothoracic Surgery',
  
  // WTH Walk-In and Primary Care
  'west tennessee primary care': 'West Tennessee Healthcare Primary Care',
  'west tennessee primary care clinic': 'West Tennessee Healthcare Primary Care',
  'west tennessee walk-in': 'West Tennessee Healthcare Walk-In',
  'west tennessee walk in': 'West Tennessee Healthcare Walk-In',
  'wt medical group primary care': 'West Tennessee Healthcare Primary Care',
  
  // WTH Emergency and Hospital
  'jackson - madison county general hospital': 'Jackson-Madison County General Hospital',
  'jackson - madison county general hospital, floor c9': 'Jackson-Madison County General Hospital',
  'jackson madison county general hospital': 'Jackson-Madison County General Hospital',
  
  // ========== BAPTIST MEMORIAL HEALTH CARE ==========
  'baptist': 'Baptist Memorial Healthcare',
  'baptist memorial healthcare': 'Baptist Memorial Healthcare',
  'baptist memorial hospital': 'Baptist Memorial Hospital',
  'baptist memorial hospital carroll county': 'Baptist Memorial Hospital Carroll County',
  'baptist memorial hospital union city': 'Baptist Memorial Hospital Union City',
  'baptist tipton hospital': 'Baptist Tipton Hospital',
  'baptist referral center': 'Baptist Referral Center',
  'baptist surgical tower': 'Baptist Surgical Tower',
  'baptist urgent care': 'Baptist Urgent Care',
  'baptist cancer center': 'Baptist Cancer Center',
  'baptist cancer center union city': 'Baptist Cancer Center Union City',
  'baptist family health': 'Baptist Family Healthcare',
  'baptist family healthcare': 'Baptist Family Healthcare',
  'baptist family helathcare clinic': 'Baptist Family Healthcare Clinic',
  'baptist carroll county family healthcare': 'Baptist Carroll County Family Healthcare',
  'baptist huntingdon family healthcare': 'Baptist Huntingdon Family Healthcare',
  
  // Baptist Medical Group (BMG)
  'bmg': 'Baptist Medical Group',
  'bmg jenkins & nease internal medicine': 'Baptist Medical Group - Jenkins & Nease Internal Medicine',
  'bmg rheumatology': 'Baptist Medical Group - Rheumatology',
  "bmg the doctor's clinic": "Baptist Medical Group - The Doctor's Clinic",
  "bmg the doctor's clinic - martin": "Baptist Medical Group - The Doctor's Clinic Martin",
  "bmg the doctor's clinic - union city": "Baptist Medical Group - The Doctor's Clinic Union City",
  'bmg tipton family medicine': 'Baptist Medical Group - Tipton Family Medicine',
  'tipton family medicine': 'Baptist Medical Group - Tipton Family Medicine',
  "bmg women's health center": "Baptist Medical Group - Women's Health Center",
  "the doctors clinic": "Baptist Medical Group - The Doctor's Clinic",
  
  // ========== JACKSON CLINIC ==========
  'jackson': 'Jackson Clinic',
  'jackson clinic': 'Jackson Clinic',
  'the jackson clinic': 'Jackson Clinic',
  'jackson clinic - bolivar': 'Jackson Clinic - Bolivar',
  'jackson clinic - humboldt': 'Jackson Clinic - Humboldt',
  'jackson clinic - medina': 'Jackson Clinic - Medina',
  'jackson clinic - milan': 'Jackson Clinic - Milan',
  'jackson clinic milan': 'Jackson Clinic - Milan',
  'the jackson clinic - milan': 'Jackson Clinic - Milan',
  'jackson clinic north': 'Jackson Clinic North',
  'jackson north': 'Jackson Clinic North',
  'jackson north clinic': 'Jackson Clinic North',
  'north clinic jackson': 'Jackson Clinic North',
  'jackson clinic baptist campus': 'Jackson Clinic Baptist Campus',
  'wtbjc': 'Jackson Clinic',
  'the jackson clinic-baptist outpatient campus': 'Jackson Clinic Baptist Campus',
  
  // ========== METHODIST MEDICAL GROUP ==========
  'methodist medical group': 'Methodist Medical Group',
  'methodist healthcare': 'Methodist Healthcare',
  'methodist medical group - atoka': 'Methodist Medical Group - Atoka',
  'methodist medical group atoka': 'Methodist Medical Group - Atoka',
  'methodist medical group comprehensive atoka': 'Methodist Medical Group Comprehensive - Atoka',
  'methodist medical group comprehinsive - atoka': 'Methodist Medical Group Comprehensive - Atoka',
  'methodist medical group comprehinsive atoka': 'Methodist Medical Group Comprehensive - Atoka',
  'methodist medical group comprehinsive in atoka': 'Methodist Medical Group Comprehensive - Atoka',
  'methodist medical group brighton': 'Methodist Medical Group - Brighton',
  'methodist medical group covington pike': 'Methodist Medical Group - Covington Pike',
  'methodist medical group neurology': 'Methodist Medical Group - Neurology',
  'methodist medical group - primary care': 'Methodist Medical Group - Primary Care',
  'methodist rheumatology': 'Methodist Medical Group - Rheumatology',
  'mmgsouthwind champion hills': 'Methodist Medical Group - Southwind Champion Hills',
  
  // Methodist Transplant
  'methodist transplant': 'Methodist Transplant Institute',
  'methodist transplant clinic': 'Methodist Transplant Institute',
  'methodist transplant clinic in memphis, tn': 'Methodist Transplant Institute',
  'methodist transplant institute': 'Methodist Transplant Institute',
  'methodist transplant institute post kidney': 'Methodist Transplant Institute',
  
  // ========== CHRISTIAN FAMILY MEDICINE ==========
  'christian family medicine': 'Christian Family Medicine',
  'cfm': 'Christian Family Medicine',
  'christian family med': 'Christian Family Medicine',
  'christian family medicine - bolivar': 'Christian Family Medicine - Bolivar',
  'christian family medicine - covington': 'Christian Family Medicine - Covington',
  'christian family medicine - henderson': 'Christian Family Medicine - Henderson',
  'christian family medicine - mckenzie': 'Christian Family Medicine - McKenzie',
  'christian family medicine - parsons': 'Christian Family Medicine - Parsons',
  'christian family medicine - trenton': 'Christian Family Medicine - Trenton',
  'christian family medicine & pediatrics': 'Christian Family Medicine & Pediatrics',
  'christian family medicine and pediatrics': 'Christian Family Medicine & Pediatrics',
  'christian family medicine & pediatrics - gibson county': 'Christian Family Medicine & Pediatrics - Gibson County',
  'christian family medicine & pediatrics - weakley county': 'Christian Family Medicine & Pediatrics - Weakley County',
  'christian care clinic': 'Christian Family Medicine',
  'christian care clinic, llc': 'Christian Family Medicine',
  
  // ========== CHRIST COMMUNITY HEALTH SERVICES ==========
  'cchs': 'Christ Community Health Services',
  'christ community': 'Christ Community Health Services',
  'christ community health services': 'Christ Community Health Services',
  'christ community health services - east jackson': 'Christ Community Health Services - East Jackson',
  
  // ========== REELFOOT FAMILY WALK-IN CLINICS ==========
  'reelfoot family walk-in clinic': 'Reelfoot Family Walk-In Clinic',
  'reelfoot family walk-in clinic - dresden': 'Reelfoot Family Walk-In Clinic - Dresden',
  'reelfoot family walk-in clinic - dyersburg': 'Reelfoot Family Walk-In Clinic - Dyersburg',
  'reelfoot family walk-in clinic - paris': 'Reelfoot Family Walk-In Clinic - Paris',
  'reelfoot family walk-in clinic - tiptonville': 'Reelfoot Family Walk-In Clinic - Tiptonville',
  'reelfoot family walk-in clinic - union city': 'Reelfoot Family Walk-In Clinic - Union City',
  'reelfot family walk-in': 'Reelfoot Family Walk-In Clinic',
  'reelfoot manor health and rehab': 'Reelfoot Manor Health and Rehab',
  
  // ========== FAST PACE HEALTH ==========
  'fast pace health': 'Fast Pace Health',
  'fastpace health': 'Fast Pace Health',
  'fastpace martin': 'Fast Pace Health - Martin',
  'fast pace health - dyersburg': 'Fast Pace Health - Dyersburg',
  'fast pace health - humboldt': 'Fast Pace Health - Humboldt',
  'fast pace health - huntingdon': 'Fast Pace Health - Huntingdon',
  'fast pace health - lexington': 'Fast Pace Health - Lexington',
  'fast pace health - martin': 'Fast Pace Health - Martin',
  'fast pace health - parsons': 'Fast Pace Health - Parsons',
  'fast pace health - union city': 'Fast Pace Health - Union City',
  
  // ========== HOMETOWN HEALTH ==========
  'hometown': 'Hometown Health Clinic',
  'hometown clinic': 'Hometown Health Clinic',
  'hometown health clinic': 'Hometown Health Clinic',
  'home town health clinic': 'Hometown Health Clinic',
  'hometown health and wellness clinic': 'Hometown Health Clinic',
  'hometown health clinci': 'Hometown Health Clinic',
  'hometown health clinic - bruceton': 'Hometown Health Clinic - Bruceton',
  'hometown health clinic - mckenzie': 'Hometown Health Clinic - McKenzie',
  'hometown health clinic dresden': 'Hometown Health Clinic - Dresden',
  'hometown health clinic, mckenzie': 'Hometown Health Clinic - McKenzie',
  'hometown health clinic/mckenzie medical center': 'Hometown Health Clinic - McKenzie',
  'hometown healthcare': 'Hometown Health Clinic',
  'hometown urgent': 'Hometown Urgent Care',
  'hometown urgent care': 'Hometown Urgent Care',
  'hometown urgent team': 'Hometown Urgent Care',
  
  // ========== HUMBOLDT FAMILY WALK-IN ==========
  'humboldt family': 'Humboldt Family Walk-In Clinic',
  'humboldt family care walk-in clinic': 'Humboldt Family Walk-In Clinic',
  'humboldt family walk-in': 'Humboldt Family Walk-In Clinic',
  'humboldt family walk-in clinic': 'Humboldt Family Walk-In Clinic',
  
  // ========== FAMILY CARE/HEALTHCARE VARIATIONS ==========
  'family care - jackson': 'Family Care Walk-In Clinic - Jackson',
  'family care - - threeway': 'Family Care Clinic - Threeway',
  'family care clinic - - threeway': 'Family Care Clinic - Threeway',
  'family care walk-in': 'Family Care Walk-In Clinic',
  'family care walk-in clini': 'Family Care Walk-In Clinic',
  'family care walk-in clinic': 'Family Care Walk-In Clinic',
  'family care walk-in clinic - milan': 'Family Care Walk-In Clinic - Milan',
  'family care walk-in clinic (milan)': 'Family Care Walk-In Clinic - Milan',
  'family care walk-in clinic milan': 'Family Care Walk-In Clinic - Milan',
  
  'family healthcare': 'Family Healthcare',
  'family healthcare - camden': 'Family Healthcare - Camden',
  'family healthcare - jackson': 'Family Healthcare - Jackson',
  'family healthcare of jacksn': 'Family Healthcare - Jackson',
  'family healthcare of jacson': 'Family Healthcare - Jackson',
  'the family healthcare - jackson': 'Family Healthcare - Jackson',
  'family health center - jackson': 'Family Healthcare - Jackson',
  
  'family medicine care': 'Family Medical Care',
  'family medicine clinia': 'Family Medical Clinic',
  'family medicine clinic': 'Family Medical Clinic',
  'family medicine clinic - jackson': 'Family Medical Clinic - Jackson',
  'family medicine clinic - jackson.com': 'Family Medical Clinic - Jackson',
  'family medicine clinic of jacksontn': 'Family Medical Clinic - Jackson',
  'family medicine clinic of jakcson': 'Family Medical Clinic - Jackson',
  'family medicine clinic - trezevant': 'Family Medical Clinic - Trezevant',
  'family medicine clinicof trezevant': 'Family Medical Clinic - Trezevant',
  'family medicine of clinic': 'Family Medical Clinic',
  
  'family clinic': 'Family Clinic & Wellness',
  'family clinic & wellness': 'Family Clinic & Wellness',
  'family clinic & wellness co': 'Family Clinic & Wellness',
  'family clinic and wellness co': 'Family Clinic & Wellness',
  'the family clinic & wellness': 'Family Clinic & Wellness',
  'the family clinic & wellness co': 'Family Clinic & Wellness',
  
  // ========== PREMIER/FIRST CARE/FIRST CHOICE ==========
  'premier fam care': 'Premier Family Medicine',
  'premier fam medicine': 'Premier Family Medicine',
  'premier family': 'Premier Family Medicine',
  'premier family care': 'Premier Family Medicine',
  'premier family care inc': 'Premier Family Medicine',
  'premier family medicine': 'Premier Family Medicine',
  'premier family medicine - jackson': 'Premier Family Medicine - Jackson',
  'premier internal medicine & pediatrics': 'Premier Internal Medicine & Pediatrics',
  'premier primary care': 'Premier Primary Care',
  'premier primary clinic': 'Premier Primary Care',
  
  'first care': 'First Care Medical Center',
  'first care medical': 'First Care Medical Center',
  'first care medical center': 'First Care Medical Center',
  'firstcare medical center': 'First Care Medical Center',
  
  'first choice medical': 'First Choice Medical Care',
  'first choice medical care': 'First Choice Medical Care',
  'first choice medical care, pllc': 'First Choice Medical Care, PLLC',
  'first choice medical center': 'First Choice Medical Care',
  'first choice medicalcare': 'First Choice Medical Care',
  'firsst choice medical care': 'First Choice Medical Care',
  '1st choice medical care': 'First Choice Medical Care',
  
  // ========== LIFESPAN HEALTHCARE ==========
  'lifespan': 'Lifespan Healthcare',
  'lifespan - savannah': 'Lifespan Healthcare - Savannah',
  'lifespan health': 'Lifespan Healthcare',
  'lifespan health adamsville': 'Lifespan Healthcare - Adamsville',
  'lifespan health clifton': 'Lifespan Healthcare - Clifton',
  'lifespan health enoch': 'Lifespan Healthcare - Enoch',
  'lifespan healthcare': 'Lifespan Healthcare',
  
  // ========== ST. FRANCIS MEDICAL PARTNERS ==========
  'st. francis medical partners': 'St. Francis Medical Partners',
  'st. francis physician network': 'St. Francis Medical Partners',
  'st. francis physicians': 'St. Francis Medical Partners',
  'may medical': 'St. Francis Medical Partners - May Medical Group',
  'may medical group': 'St. Francis Medical Partners - May Medical Group',
  'may medical group o saint francis medical partners': 'St. Francis Medical Partners - May Medical Group',
  'sfmp - may medical': 'St. Francis Medical Partners - May Medical Group',
  'sfmp - may medical group': 'St. Francis Medical Partners - May Medical Group',
  'sfmp may medical group': 'St. Francis Medical Partners - May Medical Group',
  'sfp - may medical group': 'St. Francis Medical Partners - May Medical Group',
  'sfp sfmp - covington': 'St. Francis Medical Partners - Covington',
  'sfp sfmp may medical group': 'St. Francis Medical Partners - May Medical Group',
  'st. francis medical partners - may medical group': 'St. Francis Medical Partners - May Medical Group',
  
  // ========== URGENT TEAM ==========
  'urgent team': 'Urgent Team',
  'urgentteam': 'Urgent Team',
  'urgent team - dyersburg': 'Urgent Team - Dyersburg',
  'urgent team dyersburg': 'Urgent Team - Dyersburg',
  'urgent team - jackson': 'Urgent Team - Jackson',
  'urgent team jackson': 'Urgent Team - Jackson',
  
  // ========== AHC FACILITIES ==========
  'ahc decatur county': 'AHC Decatur County',
  'ahc dyersburg': 'AHC Dyersburg',
  'ahc humboldt': 'AHC Humboldt',
  'ahc mcnairy': 'AHC McNairy',
  'ahc paris': 'AHC Paris',
  'ahc savannah': 'AHC Savannah',
  'ahc vanayer (ltc facility)': 'AHC Vanayer',
  'ahc west tennessess transitional care': 'AHC West Tennessee Transitional Care',
  'ahc westwood': 'AHC Westwood',
  'vanayer': 'Vanayer Rehab and Nursing Center',
  'vanayer rehab and nursing center': 'Vanayer Rehab and Nursing Center',
  
  // ========== SPECIALIZED MEDICAL GROUPS ==========
  'west bone and joint': 'West Tennessee Bone & Joint Institute',
  'west tennessee bone and joint': 'West Tennessee Bone & Joint Institute',
  
  'heart & vascular center of west tennessee': 'Heart & Vascular Center of West Tennessee',
  'heart and vascular center of west tennessee': 'Heart & Vascular Center of West Tennessee',
  'heart and vascular center of west tn': 'Heart & Vascular Center of West Tennessee',
  'the heart & vascular institute': 'Heart & Vascular Center of West Tennessee',
  
  'cardiovascular clinic of west tennessee': 'Cardiovascular Clinic of West Tennessee',
  'northwest tenn cardiology clinic': 'Northwest Tennessee Cardiology Clinic',
  'northwest tenn cardiology clin': 'Northwest Tennessee Cardiology Clinic',
  'northwest tenn cardiology cliniic': 'Northwest Tennessee Cardiology Clinic',
  'northwest tenn. cardiology clinic': 'Northwest Tennessee Cardiology Clinic',
  'northwest tennessee cardiology': 'Northwest Tennessee Cardiology Clinic',
  'northwest tennessee cardiology clinic': 'Northwest Tennessee Cardiology Clinic',
  'northwest tn cardiology clinic': 'Northwest Tennessee Cardiology Clinic',
  'nwtcc': 'Northwest Tennessee Cardiology Clinic',
  'nwtcc clinic': 'Northwest Tennessee Cardiology Clinic',
  
  'jackson urological associates': 'Jackson Urological Associates',
  'jackson surgical associates': 'Jackson Surgical Associates',
  "jackson women's clinic": "Jackson Women's Clinic",
  "the women's clinic": "The Women's Clinic",
  "women's clinic": "The Women's Clinic",
  "women's clinic (jackson, tn.)": "The Women's Clinic",
  "women's clinic, pa": "The Women's Clinic",
  
  'kirkland cancer center': 'Kirkland Cancer Center',
  'dr. gregory franz @ kirkland cancer center': 'Kirkland Cancer Center',
  'darryl worley cancer center': 'Darryl Worley Cancer Center',
  'daryl worley cancer center': 'Darryl Worley Cancer Center',
  
  'the kidney experts': 'The Kidney Experts',
  'west tn kidney speicalists': 'West Tennessee Kidney Specialists',
  'west tn kidney specialists': 'West Tennessee Kidney Specialists',
  'west tennessee kidney specialists': 'West Tennessee Kidney Specialists',
  'the kidney experts covington, tn': 'The Kidney Experts - Covington',
  
  'skyline gastroenterology': 'Skyline Gastroenterology',
  'sklyline gastroenterology': 'Skyline Gastroenterology',
  'skyline gastroenterology of west tn': 'Skyline Gastroenterology',
  
  'stern cardiovascular': 'Stern Cardiovascular Foundation',
  'stern cardiovacular': 'Stern Cardiovascular Foundation',
  'stern cardiology': 'Stern Cardiovascular Foundation',
  'stern cardiovascular foundation': 'Stern Cardiovascular Foundation',
  'stern crdiovascular foundation': 'Stern Cardiovascular Foundation',
  
  // ========== DIABETES/ENDOCRINE CENTERS ==========
  'presley diabetes': 'Presley Diabetes & Endocrine Center',
  'presley diabetes & endocrine center': 'Presley Diabetes & Endocrine Center',
  'presley diabetes & endocrinology': 'Presley Diabetes & Endocrine Center',
  'presley diabetes and endocrine': 'Presley Diabetes & Endocrine Center',
  'presley diabetes and endocrine center': 'Presley Diabetes & Endocrine Center',
  'presley diabetes and endocrine ctr': 'Presley Diabetes & Endocrine Center',
  'presley diabetes and endocrinology': 'Presley Diabetes & Endocrine Center',
  'presley diabetes endocrine center': 'Presley Diabetes & Endocrine Center',
  'presley diabetic and endocrine center': 'Presley Diabetes & Endocrine Center',
  'presley dm and endocrine center': 'Presley Diabetes & Endocrine Center',
  'pdec': 'Presley Diabetes & Endocrine Center',
  
  'diabetes center - jackson': 'Diabetes Center of Jackson',
  'dyersburgdiabetes clinic': 'Dyersburg Diabetes Clinic',
  
  // ========== NURSING HOMES/REHAB CENTERS ==========
  'dyer nursing and rehab': 'Dyer Nursing and Rehabilitation Center',
  'dyer nursing and rehabilitation center': 'Dyer Nursing and Rehabilitation Center',
  'dyer nursing home': 'Dyer Nursing and Rehabilitation Center',
  'dyersburg nursing and reahb': 'Dyersburg Nursing and Rehabilitation Center',
  'dyersburg health and rehab': 'Dyersburg Health and Rehabilitation Center',
  
  'mission convalescent': 'Mission Convalescent Home',
  'mission convalescent home': 'Mission Convalescent Home',
  
  'nhc - milan': 'NHC Healthcare - Milan',
  'nhc healthcare - milan': 'NHC Healthcare - Milan',
  
  'ripley healthcare and rehab': 'Ripley Healthcare and Rehabilitation',
  'ripley nursing home': 'Ripley Healthcare and Rehabilitation',
  
  'signature health of ridgely': 'Signature Healthcare of Ridgely',
  'signature healthcare of ridgely': 'Signature Healthcare of Ridgely',
  
  'the bay': 'The Bay at Dyersburg',
  'the bay at dyersburg': 'The Bay at Dyersburg',
  
  'the waters': 'The Waters of Union City',
  'the waters - union city': 'The Waters of Union City',
  'the waters is uc': 'The Waters of Union City',
  
  'tennessee state veterans home': 'Tennessee State Veterans Home',
  'tennessee state veterans home - humboldt, tn': 'Tennessee State Veterans Home - Humboldt',
  'tn state veterans home': 'Tennessee State Veterans Home',
  
  'haywood post acute': 'Haywood Post Acute',
  'huntingdon health and rehab': 'Huntingdon Health and Rehabilitation',
  'trenton health and rehab': 'Trenton Health and Rehabilitation',
  'union city health and rehabilitation': 'Union City Health and Rehabilitation',
  'westwood nursing and rehab': 'Westwood Nursing and Rehabilitation',
  'alamo nursing and rehab': 'Alamo Nursing and Rehabilitation',
  'adamsville healthcare & rehab': 'Adamsville Healthcare & Rehabilitation',
  'okeena health & rehablitation': 'Okeena Health & Rehabilitation',
  'okeena nursing home': 'Okeena Health & Rehabilitation',
  'oakwood clc': 'Oakwood Nursing Home',
  'oakwood nursing home': 'Oakwood Nursing Home',
  'river oaks nursing home': 'River Oaks Nursing Home',
  'heritage nursing center': 'Heritage Nursing Center',
  'laurelwood healthcare center': 'Laurelwood Healthcare Center',
  'maplewood healthcare': 'Maplewood Healthcare',
  'magnolia creek': 'Magnolia Creek Nursing and Rehabilitation',
  'magnolia creek nursing and rehab': 'Magnolia Creek Nursing and Rehabilitation',
  'magnolina creek nursing home': 'Magnolia Creek Nursing and Rehabilitation',
  'northbrooke post acute': 'Northbrooke Post Acute',
  'pine meadows healthcare and rehab': 'Pine Meadows Healthcare and Rehabilitation',
  
  // ========== HEALTH DEPARTMENTS ==========
  'crockett co.health department': 'Crockett County Health Department',
  'crockett county health department': 'Crockett County Health Department',
  'crockett county health department. - alamo, tn': 'Crockett County Health Department',
  'crokett county health department': 'Crockett County Health Department',
  
  'dyer county health department': 'Dyer County Health Department',
  'gibson county community health center': 'Gibson County Community Health Center',
  'hardeman county community health': 'Hardeman County Community Health Center',
  'hardeman county community health center': 'Hardeman County Community Health Center',
  'hardeman county. comm. health center': 'Hardeman County Community Health Center',
  'henderson county health department': 'Henderson County Health Department',
  'lauderdale county health department': 'Lauderdale County Health Department',
  'obion county health department': 'Obion County Health Department',
  'tipton county health department': 'Tipton County Health Department',
  'weakley county health department': 'Weakley County Health Department',
  
  // ========== CORRECTIONAL FACILITIES ==========
  'hardeman county correctional': 'Hardeman County Correctional Facility',
  'hardeman county correctional facility': 'Hardeman County Correctional Facility',
  'whiteville correctional': 'Whiteville Correctional Facility',
  'whiteville correctional facility': 'Whiteville Correctional Facility',
  'corecivic': 'CoreCivic',
  'corecivic hardeman co': 'CoreCivic - Hardeman County',
  'south central correctional center': 'South Central Correctional Center',
  
  // ========== VETERANS ADMINISTRATION ==========
  'veterans administration medical center': 'Veterans Administration Medical Center',
  'veterans administration referral': 'Veterans Administration Medical Center',
  'veterans administration referred': 'Veterans Administration Medical Center',
  'john j pershing veterans administration medical center': 'John J. Pershing VA Medical Center',
  'memphis veterans administration medical center': 'Memphis VA Medical Center',
  'nashville veterans administration medical clinic': 'Nashville VA Medical Center',
  'poplar bluff veterans administration medical center': 'Poplar Bluff VA Medical Center',
  'marian veterans administration': 'Marion VA Medical Center',
  'marion veterans administration medical center': 'Marion VA Medical Center',
  'marion veterans administration medical clinic': 'Marion VA Medical Center',
  
  // ========== INDIVIDUAL DOCTOR PRACTICES ==========
  'dr joseph peters': 'Dr. Joseph Peters Family Practice',
  'dr joseph peters family practice': 'Dr. Joseph Peters Family Practice',
  'dr. joseph peters': 'Dr. Joseph Peters Family Practice',
  'dr. joseph peters family practice': 'Dr. Joseph Peters Family Practice',
  'dr. joseph peters, family practice': 'Dr. Joseph Peters Family Practice',
  'dr. joseph peters, md': 'Dr. Joseph Peters Family Practice',
  
  'dr zaidi & associates': 'Dr. Zaidi and Associates',
  'dr zaidi and assoc': 'Dr. Zaidi and Associates',
  'dr zaidi and associates': 'Dr. Zaidi and Associates',
  'dr. zaidi and associates': 'Dr. Zaidi and Associates',
  'zaidi and assoc': 'Dr. Zaidi and Associates',
  
  'dr baba': 'Dr. Baba Clinic',
  'dr babas': 'Dr. Baba Clinic',
  'baba clinic': 'Dr. Baba Clinic',
  'rauf baba, md': 'Dr. Baba Clinic',
  
  'dr busch': 'Dr. Busch',
  'dr gore': 'Dr. Gore',
  'dr gravenor': 'Dr. Gravenor',
  'dr hale in union city': 'Dr. Hale - Union City',
  'dr mckee': 'Dr. McKee',
  'dr mulay covington': 'Dr. Mulay - Covington',
  'dr shree mulay': 'Dr. Shree Mulay',
  'dr naifeh': 'Dr. Naifeh',
  'dr otten': 'Dr. Otten',
  'dr rhodes': 'Dr. Rhodes',
  'dr steven weaver': 'Dr. Steven Weaver',
  'dr. kumar yogesh': 'Dr. Kumar Yogesh',
  'kumar yogesh': 'Dr. Kumar Yogesh',
  'dr. machra': 'Dr. Machra',
  'dr. ronald smith, md': 'Dr. Ronald Smith',
  'joon lee, md': 'Dr. Joon Lee',
  'paul scates md family medicine': 'Paul Scates Family Medicine',
  'scates paul e md': 'Paul Scates Family Medicine',
  'scates family medicine': 'Paul Scates Family Medicine',
  'adeyinka agbetoyin, md': 'Dr. Adeyinka Agbetoyin',
  'james w martin, md, llc': 'Dr. James W Martin',
  
  // ========== OTHER MEDICAL CLINICS ==========
  // Milan area
  'milan family walk-in clinic': 'Milan Medical Center',
  'milan medical': 'Milan Medical Center',
  'milan medical center': 'Milan Medical Center',
  'milan physicians quality care': 'Physicians Quality Care - Milan',
  'physicians quality care': 'Physicians Quality Care',
  'physicians quality care - milan': 'Physicians Quality Care - Milan',
  'physicians quality care milan': 'Physicians Quality Care - Milan',
  
  // Bemis area
  'bemis family clinic': 'Bemis Medical Clinic',
  'bemis medical': 'Bemis Medical Clinic',
  'bemis medical clinic': 'Bemis Medical Clinic',
  'bemis medical clinic, inc': 'Bemis Medical Clinic',
  'bemis tucker medical clinic': 'Bemis Medical Clinic',
  
  // Brownsville area
  'brownsville': 'Brownsville Medical Clinic',
  'brownsville family medicine': 'Brownsville Medical Clinic',
  'brownsville medical': 'Brownsville Medical Clinic',
  'brownsville medical clinic': 'Brownsville Medical Clinic',
  'brownsville medical clinic - alamo': 'Brownsville Medical Clinic - Alamo',
  'faith family medicine clinic': 'Faith Family Medicine Clinic',
  'faith family medicine clinic (brownsville)': 'Faith Family Medicine Clinic - Brownsville',
  
  // Ripley area
  'ripley': 'Ripley Medical Clinic',
  'ripley clinic': 'Ripley Medical Clinic',
  'ripley medical': 'Ripley Medical Clinic',
  'ripley medical clinic': 'Ripley Medical Clinic',
  'riplwy medical clinic': 'Ripley Medical Clinic',
  'riply medical clinic': 'Ripley Medical Clinic',
  'rpley medical clinic': 'Ripley Medical Clinic',
  
  // Dresden area
  'dresden': 'Dresden Family Clinic',
  'dresden family clinic': 'Dresden Family Clinic',
  
  // Dyersburg specific clinics
  'dyersburg skin & allergy clinic': 'Dyersburg Skin and Allergy Clinic',
  'dyersburg skin and allergy clinic': 'Dyersburg Skin and Allergy Clinic',
  'dyersburg skin clinic': 'Dyersburg Skin and Allergy Clinic',
  'dyersburg urology': 'Dyersburg Urology Clinic',
  'dyersburg urology clinic': 'Dyersburg Urology Clinic',
  'dyersburgurology': 'Dyersburg Urology Clinic',
  'dyersburg medical group': 'Dyersburg Medical Group',
  
  // Harborview system
  'harborview health systems': 'Harborview Health Systems',
  'harborview health systems - dyersburg': 'Harborview Health Systems - Dyersburg',
  
  // Other named clinics
  'advanced family medicine': 'Advanced Family Medicine',
  'advanced family medicine center': 'Advanced Family Medicine Center',
  'advanced family medicine center - rhc': 'Advanced Family Medicine Center - RHC',
  
  'armour family medcine': 'Armour Family Medicine',
  'armour family medicare': 'Armour Family Medicine',
  'armour family medicine': 'Armour Family Medicine',
  
  'bootheel primary cafre clinic': 'Bootheel Primary Care Clinic',
  'bootheel primary care': 'Bootheel Primary Care Clinic',
  'bootheel primary care clinic': 'Bootheel Primary Care Clinic',
  'bootheel primary clinic': 'Bootheel Primary Care Clinic',
  'boothell primary care clinic': 'Bootheel Primary Care Clinic',
  
  'carerite, pllc': 'CareRite, PLLC',
  'carebridge medical clinic': 'CareBridge Medical Clinic',
  
  'complete care': 'Complete Care',
  'complete care primary care': 'Complete Care Primary Care',
  
  'crockett medical': 'Crockett Medical Clinic',
  'crockett medical clinic': 'Crockett Medical Clinic',
  
  'crossroads family health clinic': 'Crossroads Family Health Clinic',
  
  'decaturville family practice': 'Decaturville Family Practice',
  
  'delta clinics': 'Delta Clinics',
  'delta clinics`': 'Delta Clinics',
  
  'delones clinic': 'Delones Clinic',
  'easley delones family medicine': 'Easley Delones Family Medicine',
  
  'dowling family clinic': 'Dowling Family Medicine',
  'dowling family medicine': 'Dowling Family Medicine',
  'dowling medical clinic': 'Dowling Medical Clinic',
  
  'eastview medical clinic': 'Eastview Medical Clinic',
  
  'ermco family wellnes': 'Ermco Family Wellness Center',
  'ermco family wellness': 'Ermco Family Wellness Center',
  'ermco family wellness center': 'Ermco Family Wellness Center',
  'ermco family wellness clinic': 'Ermco Family Wellness Center',
  'ermco family welness center': 'Ermco Family Wellness Center',
  
  "evan's medical clinic": 'Evans Medical Clinic',
  'evans cliinic': 'Evans Medical Clinic',
  'evans clinic': 'Evans Medical Clinic',
  'evans medical clinic': 'Evans Medical Clinic',
  "the evan's clinic": 'Evans Medical Clinic',
  'the evans clinic': 'Evans Medical Clinic',
  
  'freedom family medicine': 'Freedom Family Medicine',
  'freedom family medicine clinic': 'Freedom Family Medicine',
  
  'frix - jennings': 'Frix Jennings Clinic',
  'frix - jennings clinic': 'Frix Jennings Clinic',
  'frix jennings': 'Frix Jennings Clinic',
  'frix jennings clinic': 'Frix Jennings Clinic',
  'drix and jennings': 'Frix Jennings Clinic',
  
  'grace family practice': 'Grace Family Practice',
  'grace family practice clinic': 'Grace Family Practice',
  
  'greenfield family care': 'Greenfield Family Care',
  
  'hayti': 'Hayti Medical Center',
  'hayti medical & diagnostics': 'Hayti Medical Center',
  'hayti medical and diagnostic': 'Hayti Medical Center',
  'hayti medical center': 'Hayti Medical Center',
  
  'johnson clinic - covington': 'Johnson Clinic - Covington',
  'the covington clinic': 'Johnson Clinic - Covington',
  
  'jackson purchase primary care': 'Jackson Purchase Primary Care',
  'jackson purchase primary care - clinton': 'Jackson Purchase Primary Care - Clinton',
  'jackson purchase primary care - fulton': 'Jackson Purchase Primary Care - Fulton',
  'jp primary care fulton clinic': 'Jackson Purchase Primary Care - Fulton',
  
  'lakeside health clinic': 'Lakeside Health Clinic',
  'lakeside health clinic primary care': 'Lakeside Health Clinic Primary Care',
  'lakeside health clinic, primary care': 'Lakeside Health Clinic Primary Care',
  
  'lauderdale county medical': 'Lauderdale County Medical Clinic',
  'lauderdale county medical clinic': 'Lauderdale County Medical Clinic',
  
  'le bonheur kidney transplant clinic': 'LeBonheur Kidney Transplant Clinic',
  'lebonheur': 'LeBonheur',
  'lebonheur kidney transplant clinic': 'LeBonheur Kidney Transplant Clinic',
  
  'leitherland family care': 'Leitherland Family Care',
  'leitherland family care clinic': 'Leitherland Family Care',
  
  'lexcar clinic': 'Lexcare Clinic',
  'lexcare clinic': 'Lexcare Clinic',
  
  'liberty medical clinic': 'Liberty Medical Clinic',
  
  'madison family practice': 'Madison Family Practice',
  
  'magnolia clinic': 'Magnolia Clinic',
  'the magnolia clinic': 'Magnolia Clinic',
  
  'main st fam': 'Main Street Family Medicine',
  'main st family medicine': 'Main Street Family Medicine',
  'main street family care': 'Main Street Family Medicine',
  'main street family medicine': 'Main Street Family Medicine',
  'mainstreet family care': 'Main Street Family Medicine',
  'mian street family medicine': 'Main Street Family Medicine',
  
  "martin children's clinic": "Martin Children's Clinic",
  'martin medical': 'Martin Medical Center',
  'martin medical center': 'Martin Medical Center',
  
  'mckenzie medical': 'McKenzie Medical Center',
  'mckenzie medical center': 'McKenzie Medical Center',
  
  'med north': 'MedNorth',
  'med north group, pllc': 'MedNorth',
  'mednorth': 'MedNorth',
  'mednorth cardiology': 'MedNorth Cardiology',
  
  'medina family medicine': 'Medina Family Medical Clinic',
  'medina family medicine clinic': 'Medina Family Medical Clinic',
  'medina family practice': 'Medina Family Medical Clinic',
  'media family practice': 'Medina Family Medical Clinic',
  
  'medical clinic - alamo': 'The Medical Clinic - Alamo',
  'the medical clinic - alamo': 'The Medical Clinic - Alamo',
  'alamo medical': 'The Medical Clinic - Alamo',
  
  'michie healthcare associates, llc': 'Michie Medical Clinic',
  'michie medical clinic': 'Michie Medical Clinic',
  
  'mid south pain treatment center': 'MidSouth Pain Treatment Center',
  'midsouth pain treatment center': 'MidSouth Pain Treatment Center',
  'southern pain and regenerative medicine': 'Southern Pain and Regenerative Medicine',
  
  'newbern medical clinic': 'Newbern Medical Clinic',
  
  'obion county medical clinic': 'Obion County Medical Clinic',
  
  'one health family clinic': 'One Health Family Clinic',
  
  'pemiscot memorial': 'Pemiscot Memorial',
  'pemiscot primary care': 'Pemiscot Primary Care Clinic',
  'pemiscot primary care clinic': 'Pemiscot Primary Care Clinic',
  'premiscot primary care': 'Pemiscot Primary Care Clinic',
  
  'perry county medical center': 'Perry County Medical Center',
  
  'qualls harbin family medicine': 'Qualls Harbin Family Medicine',
  
  'rutherford clinic': 'Rutherford Medical Clinic',
  'rutherford medical clinic': 'Rutherford Medical Clinic',
  
  'scheidler family clinic': 'Scheidler Family Clinic',
  
  'scotts hill medical clinic': 'Scotts Hill Medical Clinic',
  
  'seaton family practice': 'Seaton Family Practice',
  
  "slayton corner clinic": "Slayton's Corner Clinic",
  "slayton's corner clinic": "Slayton's Corner Clinic",
  
  'south gibson family care': 'South Gibson Family Care',
  
  'south jackson medical & wellness': 'South Jackson Medical & Wellness Center',
  'south jackson medical & wellness center': 'South Jackson Medical & Wellness Center',
  'south jackson medical and wellness': 'South Jackson Medical & Wellness Center',
  
  'southern family practice': 'Southern Family Practice',
  'southern family practice clinic': 'Southern Family Practice',
  'southern family pratice': 'Southern Family Practice',
  'southron family practice': 'Southern Family Practice',
  
  'southern health and wellness': 'Southern Health and Wellness Clinic',
  'southern health and wellness clinic': 'Southern Health and Wellness Clinic',
  
  'speight family medicine': 'Speight Family Medicine',
  'speight medical': 'Speight Family Medicine',
  
  'springer medical': 'Springer Medical Associates',
  'springer medical associates': 'Springer Medical Associates',
  'springer medical assoicates': 'Springer Medical Associates',
  
  'stanton community health center': 'Stanton Health Center',
  'stanton health': 'Stanton Health Center',
  'stanton health center': 'Stanton Health Center',
  'stanton health clinic': 'Stanton Health Center',
  'staton health center': 'Stanton Health Center',
  
  'taylor medical center': 'Taylor Medical Clinic',
  'taylor medical centerpllc': 'Taylor Medical Clinic',
  'taylor medical clinic': 'Taylor Medical Clinic',
  
  'terrell clinic': 'Terrell Clinic',
  'terrell clinic & aesthetics': 'Terrell Clinic & Aesthetics',
  'terrell clinic & aesthetics, llc': 'Terrell Clinic & Aesthetics',
  'terrell clinic, llc': 'Terrell Clinic',
  
  'total family care': 'Total Family Care',
  'total life care': 'Total Life Care',
  
  'transsouth healthcare': 'TransSouth Healthcare',
  'transsouth helathcare': 'TransSouth Healthcare',
  
  'tri county health clinic': 'Tri County Health Clinic',
  
  'trinity medical clinic': 'Trinity Medical Clinic',
  'trinity medical clinic, llc': 'Trinity Medical Clinic',
  
  'tristar family healthcare': 'TriStar Family Healthcare',
  'tri star family healthcare': 'TriStar Family Healthcare',
  
  'tucker clinic': 'Tucker Clinic',
  
  'union city urgent care': 'Union City Urgent Care',
  'union city urology': 'Union City Urology',
  
  'unity health & wellness': 'Unity Health & Wellness',
  
  'ut family medicine': 'UT Family Medicine',
  'ut family practice': 'UT Family Medicine',
  'ut medical': 'UT Medicine',
  'ut medicine': 'UT Medicine',
  
  'vassar clini': 'Vassar Clinic',
  'vassar clinic': 'Vassar Clinic',
  
  'volunteer family medicine': 'Volunteer Family Medicine',
  'volunteer family medicine and urgent care': 'Volunteer Family Medicine and Urgent Care',
  
  'waddell clinic': 'Waddell Primary Care & Aesthetics',
  'waddell clinic primary care': 'Waddell Primary Care & Aesthetics',
  'waddell clinic primary care & aesthetics': 'Waddell Primary Care & Aesthetics',
  'waddell primary care': 'Waddell Primary Care & Aesthetics',
  'waddell primary care & aesthetics': 'Waddell Primary Care & Aesthetics',
  'waddell primary care and aesthetics': 'Waddell Primary Care & Aesthetics',
  
  'wade family': 'Wade Family Medicine',
  'wade family medicine': 'Wade Family Medicine',
  
  'waverly family medicine': 'Waverly Family Medicine',
  
  'weakley county family medicine': 'Weakley County Family Medicine',
  
  'west clinic': 'West Clinic',
  
  'west family care': 'West Family Care Clinic',
  'west family care clini': 'West Family Care Clinic',
  'west family care clinic': 'West Family Care Clinic',
  
  'west cancer center': 'West Cancer Center',
  'the west cancer center': 'West Cancer Center',
  'the west cancer clinic': 'West Cancer Center',
  'west cancer in paris': 'West Cancer Center - Paris',
  
  'whiteville family medicine': 'Whiteville Medical Center',
  'whiteville family medicine clinic': 'Whiteville Medical Center',
  'whiteville medical center': 'Whiteville Medical Center',
  'whiteville medical center llc': 'Whiteville Medical Center',
  
  'william b acree': 'William B Acree Clinic',
  'william b acree clinic': 'William B Acree Clinic',
  'williwm b acree clinic': 'William B Acree Clinic',
  
  "women's health center": "Women's Health Center",
  "women's health center - martin": "Women's Health Center - Martin",
  "women's health center - union city": "Women's Health Center - Union City",
  "women's health center union city": "Women's Health Center - Union City",
  "women's health martin": "Women's Health Center - Martin",
  
  // ========== SELF REFERRAL / SPECIAL ==========
  'self referral': 'Self Referral',
  'self-referral': 'Self Referral',
  'self': 'Self Referral',
  'patient referral': 'Self Referral',
  'unknown clinic': 'Unknown Clinic',
  'unknown': 'Unknown Clinic'
};

// ============================================
// ALIASES FOR BACKWARD COMPATIBILITY
// ============================================
const CLINIC_STANDARDIZATION = CLINICS;

// Export for use in other modules (Google Apps Script compatible)
// In GAS, all top-level variables are automatically available across files
