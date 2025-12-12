/**
 * Provider Name Dictionary
 * ========================
 * Master dictionary for normalizing referring provider names
 * Merged from ProviderNormalization.js, ProviderDeduplication.js, and ProviderNormalizationV4.js
 * 
 * Last Updated: 2025-11-29
 * 
 * USAGE:
 * - Keys are LOWERCASE for case-insensitive matching
 * - Values are the canonical (standardized) provider name
 * 
 * TO ADD A NEW PROVIDER:
 * 1. Add the lowercase key (how it appears in the form)
 * 2. Set the canonical name with credentials (e.g., "John Smith, MD")
 * 3. Add common misspellings/variations as additional entries pointing to same canonical name
 * 
 * CREDENTIAL ABBREVIATIONS:
 * - MD: Medical Doctor
 * - DO: Doctor of Osteopathy
 * - NP/FNP/ANP: Nurse Practitioner
 * - PA/PA-C: Physician Assistant
 * - APRN: Advanced Practice Registered Nurse
 * - DNP: Doctor of Nursing Practice
 */

// ============================================
// PROVIDER CONFIGURATION
// ============================================
const PROVIDER_CONFIG = {
  COLUMN: {
    INDEX: 5,      // Column E - Referring Provider
    LETTER: 'E'
  },
  FORMATTING: {
    CORRECTED_COLOR: '#E6F3FF',      // Light blue - normalized/corrected
    UNKNOWN_COLOR: '#FFE6E6',        // Light red - unknown provider
    SELF_REFERRAL_COLOR: '#FFF3CD',  // Light yellow - self-referral
    VA_COLOR: '#E8F5E9',             // Light green - VA/government
    DUPLICATE_COLOR: '#FFE6CC',      // Light orange - duplicate detected
    DEFAULT_COLOR: '#FFFFFF'         // White - no change needed
  },
  VALIDATION: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    REQUIRE_LETTERS: true
  }
};

// ============================================
// SPECIAL PATTERN MATCHING
// Used for detecting special categories before dictionary lookup
// ============================================
const PROVIDER_SPECIAL_CASES = {
  // Unknown/missing provider patterns
  unknownVariations: [
    'unknown', 'unknown provider', 'n/a', 'na', 'none',
    'no provider', 'not applicable', 'tbd', 'blank', '--',
    'no referral', 'not available', 'unkown', 'no provider listed'
  ],
  
  // Self-referral patterns
  selfReferralVariations: [
    'self', 'self referral', 'self-referral', 'self referred',
    'patient self referred', 'patient referral', 'personal',
    'self made', 'walk in', 'online', 'patient', 'patient called',
    'family referral', 'friend referral', 'family', 'friend'
  ],
  
  // VA/Veterans Administration patterns
  vaVariations: [
    'va', 'veterans', 'veterans administration', 'va medical',
    'va medical center', 'va hospital', 'veterans admin',
    'veterans administration medical center', 'vamc'
  ]
};

// ============================================
// CREDENTIAL STANDARDIZATION
// Maps various credential formats to standard abbreviations
// ============================================
const CREDENTIALS = {
  // MD variants
  'md': 'MD', 'm.d.': 'MD', 'm.d': 'MD', 'medical doctor': 'MD',
  
  // DO variants
  'do': 'DO', 'd.o.': 'DO', 'd.o': 'DO',
  
  // NP variants
  'np': 'NP', 'n.p.': 'NP', 'nurse practitioner': 'NP',
  'fnp': 'FNP', 'fnp-c': 'FNP-C', 'fnp-bc': 'FNP-BC',
  'anp': 'ANP', 'anp-bc': 'ANP-BC',
  'cfnp': 'CFNP', 'acnp': 'ACNP', 'pmhnp': 'PMHNP',
  'cnp': 'CNP', 'agnp': 'AGNP',
  
  // APRN variants
  'aprn': 'APRN', 'a.p.r.n.': 'APRN', 'aprn-bc': 'APRN-BC',
  'apn': 'APN', 'a.p.n.': 'APN', 'apn-bc': 'APN-BC',
  
  // PA variants
  'pa': 'PA', 'p.a.': 'PA', 'physician assistant': 'PA',
  'pa-c': 'PA-C', 'pac': 'PA-C', 'pa-c-c': 'PA-C',
  
  // DNP variants
  'dnp': 'DNP', 'd.n.p.': 'DNP',
  
  // Other credentials
  'phd': 'PhD', 'ph.d.': 'PhD', 'ph.d': 'PhD',
  'rn': 'RN', 'r.n.': 'RN',
  'lpn': 'LPN', 'l.p.n.': 'LPN',
  'cnm': 'CNM', 'c.n.m.': 'CNM',
  'msn': 'MSN', 'bsn': 'BSN'
};

// Credential priority order (for selecting primary when multiple exist)
const CREDENTIAL_PRIORITY = [
  'MD', 'DO', 'DNP', 'PhD',
  'PA-C', 'PA',
  'FNP-BC', 'FNP-C', 'FNP',
  'ANP-BC', 'ANP',
  'APRN-BC', 'APRN',
  'APN-BC', 'APN',
  'NP', 'CNM', 'CNP', 'CFNP', 'ACNP',
  'RN', 'LPN',
  'MSN', 'BSN'
];

// ============================================
// MASTER PROVIDER DICTIONARY
// Comprehensive mapping of all provider name variations
// ============================================
const PROVIDERS = {
  
  // ==================== A ====================
  'abdullah arshad': 'Abdullah Arshad, MD',
  'abdullah arshad, md': 'Abdullah Arshad, MD',
  'abdullah arshad md': 'Abdullah Arshad, MD',
  'arshad': 'Abdullah Arshad, MD',
  
  'adam engish': 'Adam English, DO',
  'adam engish, do': 'Adam English, DO',
  'adam english': 'Adam English, DO',
  'adam english, do': 'Adam English, DO',
  
  'adenike adedeji': 'Adenike Adedeji, FNP',
  'adenike adedeji, fnp': 'Adenike Adedeji, FNP',
  
  'adey agbetoyin': 'Adeyinka Agbetoyin, MD',
  'adey agbetoyin, md': 'Adeyinka Agbetoyin, MD',
  'adeyinka agbetoyin': 'Adeyinka Agbetoyin, MD',
  'adeyinka agbetoyin, md': 'Adeyinka Agbetoyin, MD',
  
  'adil ayub': 'Adil Ayub, MD',
  'adil ayub, md': 'Adil Ayub, MD',
  
  'adrean stamper': 'Adrean Stamper, FNP',
  'adrean stamper, fnp': 'Adrean Stamper, FNP',
  'adrean stamper, np': 'Adrean Stamper, FNP',
  
  'ahmad al shyoukh': 'Ahmad Al Shyoukh, MD',
  'ahmad al shyoukh, md': 'Ahmad Al Shyoukh, MD',
  
  'ahsan': 'Mohammad Ahsan, MD',
  'ar. ahsan': 'Mohammad Ahsan, MD',
  'ar. ahsan, md': 'Mohammad Ahsan, MD',
  'ar.ahsan': 'Mohammad Ahsan, MD',
  'ar.ahsan, md': 'Mohammad Ahsan, MD',
  'mohammad ahsan': 'Mohammad Ahsan, MD',
  'mohammad ahsan, md': 'Mohammad Ahsan, MD',
  'muhammad ahsan': 'Mohammad Ahsan, MD',
  
  'aimee stooksberry': 'Amiee Stooksberry, APRN',
  'amiee stooksberry': 'Amiee Stooksberry, APRN',
  'amiee stooksberry, aprn': 'Amiee Stooksberry, APRN',
  'amiee stooksberry, np': 'Amiee Stooksberry, APRN',
  
  'alan weatherford': 'Alan Weatherford, PA-C',
  'alan weatherford, pa-c': 'Alan Weatherford, PA-C',
  'alan weatherford, pa-c-c': 'Alan Weatherford, PA-C',
  
  'albert earle weeks': 'Albert Earle Weeks, MD',
  'albert earle weeks, md': 'Albert Earle Weeks, MD',
  
  'aleica graden': 'Alicia Graden, FNP',
  'alesia branson': 'Alesia Branson, FNP',
  'alesia branson, fnp': 'Alesia Branson, FNP',
  
  'alexandra buckland': 'Alexandra Buckland, FNP',
  'alexandra buckland, fnp': 'Alexandra Buckland, FNP',
  'alexandra buckland, np': 'Alexandra Buckland, FNP',
  
  'alexandra burns': 'Alexandra Burns, FNP',
  'alexandra burns, fnp': 'Alexandra Burns, FNP',
  'alexandra burns, np': 'Alexandra Burns, FNP',
  
  'alexandra korshun': 'Alexandra Korshun, MD',
  'alexandra korshun, md': 'Alexandra Korshun, MD',
  
  'alicia gradeb': 'Alicia Graden, FNP',
  'alicia graden': 'Alicia Graden, FNP',
  'alicia graden, fnp': 'Alicia Graden, FNP',
  
  'alicia landers': 'Alicia Landers, FNP',
  'alicia landers, fnp': 'Alicia Landers, FNP',
  'alicia landers, np': 'Alicia Landers, FNP',
  
  'alicia springer': 'Alicia Springer, FNP',
  'alicia springer n. p': 'Alicia Springer, FNP',
  'alicia springer, fnp': 'Alicia Springer, FNP',
  'alicia springer, np': 'Alicia Springer, FNP',
  
  'alisha gupta': 'Alisha Gupta, MD',
  'alisha gupta, md': 'Alisha Gupta, MD',
  
  'alisha lowe': 'Alisha Lowe, FNP',
  'alisha lowe, fnp': 'Alisha Lowe, FNP',
  
  'alison moore': 'Alison Moore, FNP',
  'alison moore, fnp': 'Alison Moore, FNP',
  'alison moore, np': 'Alison Moore, FNP',
  
  'all care medical': 'All Care Medical',
  
  'allie alexander-lusk': 'Allie Alexander-Lusk, FNP',
  'allie alexander-lusk, fnp': 'Allie Alexander-Lusk, FNP',
  
  'allison adams': 'Allison Adams, FNP',
  'allison adams, fnp': 'Allison Adams, FNP',
  
  'allison castleman': 'Allison Castleman, FNP',
  'allison castleman, fnp': 'Allison Castleman, FNP',
  
  'allison jowers': 'Allison Jowers, PA-C',
  'allison jowers, pa': 'Allison Jowers, PA-C',
  'allison jowers, pa-c': 'Allison Jowers, PA-C',
  'allison jowers, -c, pa': 'Allison Jowers, PA-C',
  
  'alvin james miller': 'Alvin James Miller, MD',
  'alvin james miller, md': 'Alvin James Miller, MD',
  
  'amanda e russell': 'Amanda Russell, FNP',
  'amanda e russell, np': 'Amanda Russell, FNP',
  'amanda russell': 'Amanda Russell, FNP',
  'amanda russell, fnp': 'Amanda Russell, FNP',
  'amanda russell, np': 'Amanda Russell, FNP',
  'mandy russell': 'Amanda Russell, FNP',
  'mandy russell, fnp': 'Amanda Russell, FNP',
  'mandy russell, np': 'Amanda Russell, FNP',
  
  'amanda fuller': 'Amanda Fuller, FNP-BC',
  'amanda fuller fnp bc': 'Amanda Fuller, FNP-BC',
  'amanda fuller fnp-bc': 'Amanda Fuller, FNP-BC',
  'amanda fuller-fnp-bc': 'Amanda Fuller, FNP-BC',
  'amanda fuller, fnp': 'Amanda Fuller, FNP-BC',
  'amanda fuller, fnp-bc': 'Amanda Fuller, FNP-BC',
  'amanda fuller, np': 'Amanda Fuller, FNP-BC',
  
  'amanda hearn': 'Amanda Hearn, FNP',
  'amanda hearn, fnp': 'Amanda Hearn, FNP',
  'amanda hearn, np': 'Amanda Hearn, FNP',
  
  'amanda keown': 'Amanda Keown, FNP',
  'amanda keown, fnp': 'Amanda Keown, FNP',
  
  'amanda moore': 'Amanda Moore, FNP',
  'amanda moore, fnp': 'Amanda Moore, FNP',
  'amanda moore, np': 'Amanda Moore, FNP',
  
  'amanda nold': 'Amanda Nold, PA-C',
  'amanda nold, pa': 'Amanda Nold, PA-C',
  'amanda nold, pa-c': 'Amanda Nold, PA-C',
  'amanda nold, -c, pa': 'Amanda Nold, PA-C',
  
  'amanda polman': 'Amanda Polman, FNP-C',
  'amanda polman, fnp': 'Amanda Polman, FNP-C',
  'amanda polman, fnp-b': 'Amanda Polman, FNP-C',
  'amanda polman, fnp-c': 'Amanda Polman, FNP-C',
  
  'amanda rongey': 'Amanda Rongey, FNP',
  'amanda rongey, fnp': 'Amanda Rongey, FNP',
  
  'amanda taylor': 'Amanda Taylor, FNP',
  'amanda taylor, fnp': 'Amanda Taylor, FNP',
  
  'amanda tuner': 'Amanda Turner, FNP',
  'amanda tuner, fnp': 'Amanda Turner, FNP',
  'amanda tuner, np': 'Amanda Turner, FNP',
  'amanda turner': 'Amanda Turner, FNP',
  'amanda turner, fnp': 'Amanda Turner, FNP',
  
  'amber fern': 'Amber Fern, FNP',
  'amber fern, fnp': 'Amber Fern, FNP',
  
  'amber steele': 'Amber Steele, FNP-C',
  'amber steele, fnp': 'Amber Steele, FNP-C',
  'amber steele, fnp-c': 'Amber Steele, FNP-C',
  
  'amber taylor': 'Amber Taylor, FNP',
  'amber taylor, fnp': 'Amber Taylor, FNP',
  
  'amedisys': 'Amedisys',
  'amedysis': 'Amedisys',
  
  'amie roland': 'Amie Roland, FNP',
  'amie roland, fnp': 'Amie Roland, FNP',
  
  'amy jackson smith': 'Amy Smith, PA-C',
  'amy jackson smith, pa': 'Amy Smith, PA-C',
  'amy jackson smith, pa-c': 'Amy Smith, PA-C',
  'amy jackson smith, -c, pa': 'Amy Smith, PA-C',
  'amy smith': 'Amy Smith, PA-C',
  'amy smith, pa': 'Amy Smith, PA-C',
  'amy smith, pa-c': 'Amy Smith, PA-C',
  'amy smith, pa-c-c': 'Amy Smith, PA-C',
  'amy smith,-c, pa-c-c': 'Amy Smith, PA-C',
  
  'amy lawrence': 'Amy Lawrence, FNP',
  'amy lawrence, fnp': 'Amy Lawrence, FNP',
  
  'amy medford': 'Amy Medford, FNP',
  'amy medford, fnp': 'Amy Medford, FNP',
  'amy medford, apn-fnp': 'Amy Medford, FNP',
  
  'amy myers': 'Amy Myers, FNP',
  'amy myers, fnp': 'Amy Myers, FNP',
  'amy myers, np': 'Amy Myers, FNP',
  
  'amy turner': 'Amy Turner, FNP',
  'amy turner, fnp': 'Amy Turner, FNP',
  
  'amy wynn': 'Amy Wynn, FNP',
  'amy wynn, fnp': 'Amy Wynn, FNP',
  
  'andrea hay': 'Andrea Hay, FNP',
  'andrea hay, fnp': 'Andrea Hay, FNP',
  
  'andrea melvin': 'Andrea Melvin, FNP',
  'andrea melvin, fnp': 'Andrea Melvin, FNP',
  'ashleigh melvin': 'Andrea Melvin, FNP',
  'ashleigh melvin, fnp': 'Andrea Melvin, FNP',
  'ashleigh melvin, np': 'Andrea Melvin, FNP',
  
  'andrea swain': 'Andrea Swain, FNP',
  'andrea swain, fnp': 'Andrea Swain, FNP',
  'andria swain': 'Andrea Swain, FNP',
  
  'andrew coleman': 'Andrew Coleman, MD',
  'andrew coleman, md': 'Andrew Coleman, MD',
  
  'andrew murphy': 'Andrew Murphy, MD',
  'andrew murphy, md': 'Andrew Murphy, MD',
  
  'andrew myers': 'Andrew Myers, MD',
  'andrew myers, md': 'Andrew Myers, MD',
  
  'angel warren': 'Angel Warren, FNP',
  'angel warren, fnp': 'Angel Warren, FNP',
  'angela warren': 'Angel Warren, FNP',
  
  'angela constant': 'Angela Constant, FNP',
  'angela constant, fnp': 'Angela Constant, FNP',
  'angela constant, np': 'Angela Constant, FNP',
  'angelaconstant': 'Angela Constant, FNP',
  
  'angela cursey': 'Angela Cursey, FNP',
  'angela cursey, fnp': 'Angela Cursey, FNP',
  'angela b. cursey, fnp': 'Angela Cursey, FNP',
  
  'angela mealer': 'Angela Mealer, FNP',
  'angela mealer, fnp': 'Angela Mealer, FNP',
  'angela mealer, np': 'Angela Mealer, FNP',
  
  'angela odell': 'Angela Odell, NP',
  
  'angela quick': 'Angela Quick, NP',
  
  'angela tippitt': 'Angela Tippitt, FNP',
  'angela tippitt, fnp': 'Angela Tippitt, FNP',
  
  'angela upchurch': 'Angela Upchurch, NP',
  
  'angela uta': 'Angela Uta, FNP',
  'angela uta, fnp': 'Angela Uta, FNP',
  'angela uta, np': 'Angela Uta, FNP',
  
  'angeli jain': 'Angeli Jain, MD',
  'angeli jain, md': 'Angeli Jain, MD',
  'angela jain': 'Angeli Jain, MD',
  
  'annie k.massey': 'Annie Kate Massey, PA-C',
  'annie kate massey': 'Annie Kate Massey, PA-C',
  'annie kate massey, pa': 'Annie Kate Massey, PA-C',
  'annie kate massey, pa-c': 'Annie Kate Massey, PA-C',
  'annie kate massey, pa-c-c': 'Annie Kate Massey, PA-C',
  'annie k.massey, pa-c-c': 'Annie Kate Massey, PA-C',
  'annie k. massey, pa-c': 'Annie Kate Massey, PA-C',
  
  'anshul bhalla': 'Anshul Bhalla, MD',
  'anshul bhalla, md': 'Anshul Bhalla, MD',
  
  'april mckinney': 'April McKinney, FNP',
  
  'april nichols': 'April Nichols, NP',
  
  'april walker': 'April Walker, FNP',
  'april walker, fnp': 'April Walker, FNP',
  
  'archie wright': 'Archie Wright, MD',
  'archie wright, md': 'Archie Wright, MD',
  
  'arun rao': 'Arun Rao, MD',
  
  'ashleigh mcintosh': 'Ashleigh McIntosh, FNP',
  'ashleigh mcintosh, fnp': 'Ashleigh McIntosh, FNP',
  'ashleigh mcintosh, np': 'Ashleigh McIntosh, FNP',
  
  'ashley baker': 'Ashley Baker, FNP',
  'ashley baker, fnp': 'Ashley Baker, FNP',
  'ashley baker, np': 'Ashley Baker, FNP',
  
  'ashley caldwell': 'Ashley Caldwell, FNP',
  'ashley caldwell, fnp': 'Ashley Caldwell, FNP',
  
  'ashley freeman': 'Ashley Freeman, FNP',
  'ashley freeman, fnp': 'Ashley Freeman, FNP',
  'ashley freemand': 'Ashley Freeman, FNP',
  
  'ashley gullett': 'Ashley Gullett, FNP',
  
  'ashley pennington': 'Ashley Pennington, FNP',
  'ashley pennington, fnp': 'Ashley Pennington, FNP',
  'ashley pennington, np': 'Ashley Pennington, FNP',
  
  'ashley shaw': 'Ashley Shaw, FNP',
  'ashley shaw, fnp': 'Ashley Shaw, FNP',
  
  'ashraf alqaqa': 'Ashraf Alqaqa, MD',
  'ashraf alqaqa, md': 'Ashraf Alqaqa, MD',
  
  'autumn ellis': 'Autumn Ellis, FNP',
  'autun ellis': 'Autumn Ellis, FNP',
  
  'ayesha jaleel': 'Ayesha Jaleel, MD',
  'ayesha tribble': 'Ayesha Tribble, NP',
  
  // ==================== B ====================
  'barry wall': 'Barry Wall, MD',
  
  'beatrice concepcion': 'Beatrice Concepcion, NP',
  
  'beckie johnson': 'Becky Johnson, CNM',
  'becky bruce': 'Becky Bruce, FNP',
  'becky bruce, fnp': 'Becky Bruce, FNP',
  
  'belinda hilliard': 'Belinda Hilliard Presley, DNP',
  'belinda hillliard presley': 'Belinda Hilliard Presley, DNP',
  'belinda hilliard presley': 'Belinda Hilliard Presley, DNP',
  'belinda hilliard (presley)': 'Belinda Hilliard Presley, DNP',
  'belinda presley': 'Belinda Hilliard Presley, DNP',
  'belinda presley, dnp': 'Belinda Hilliard Presley, DNP',
  'beninda presley': 'Belinda Hilliard Presley, DNP',
  'belinda presley hilliard': 'Belinda Hilliard Presley, DNP',
  'belinda hilliard presley, dnp': 'Belinda Hilliard Presley, DNP',
  'belinda pressley': 'Belinda Hilliard Presley, DNP',
  'belinda pressley, dnp': 'Belinda Hilliard Presley, DNP',
  
  'ben rees': 'Benjamin Reese, PA-C',
  'ben rees, pa-c-c': 'Benjamin Reese, PA-C',
  'ben reese': 'Benjamin Reese, PA-C',
  'ben reese, pa-c': 'Benjamin Reese, PA-C',
  'ben reese, pa-c-c': 'Benjamin Reese, PA-C',
  'ben reese., pa-c': 'Benjamin Reese, PA-C',
  'ben reese., pa-c-c': 'Benjamin Reese, PA-C',
  'ben reese pacq': 'Benjamin Reese, PA-C',
  'benjamin reese': 'Benjamin Reese, PA-C',
  'benjamin reese, pa-c': 'Benjamin Reese, PA-C',
  'benjamin reese, pa-c-c': 'Benjamin Reese, PA-C',
  'benjamin reese,-c, pa-c-c': 'Benjamin Reese, PA-C',
  'benjamin reeese': 'Benjamin Reese, PA-C',
  
  'beth graves': 'Elizabeth Graves, FNP',
  'beth graves, fnp': 'Elizabeth Graves, FNP',
  'beth graves, np': 'Elizabeth Graves, FNP',
  
  'beth henson': 'Beth Hinson, FNP',
  'beth hinson': 'Beth Hinson, FNP',
  'beth hinson, fnp': 'Beth Hinson, FNP',
  
  'beth ruiz': 'Beth Ruiz, PA-C',
  'beth ruiz, pa': 'Beth Ruiz, PA-C',
  'beth ruiz, pa-c': 'Beth Ruiz, PA-C',
  'beth ruiz, -c, pa': 'Beth Ruiz, PA-C',
  
  'bethany jackson': 'Bethany Jackson, MD',
  'bethany jackson, md': 'Bethany Jackson, MD',
  
  'bethany kelley': 'Bethany Kelley, FNP',
  'bethany kelley, fnp': 'Bethany Kelley, FNP',
  'bethany kelly': 'Bethany Kelley, FNP',
  'bethany kelley, np': 'Bethany Kelley, FNP',
  
  'bethany mcswain': 'Bethany McSwain, NP',
  'bethany russell': 'Bethany Russell, NP',
  
  'betsy akin': 'Betsy Akin, FNP',
  'betsy akin, fnp': 'Betsy Akin, FNP',
  'betsy akin, np': 'Betsy Akin, FNP',
  
  'betty roe': 'Betty Roe, FNP',
  'betty roe, fnp': 'Betty Roe, FNP',
  
  'beverly mccann': 'Beverly McCann, FNP',
  'beverly mccann, fnp': 'Beverly McCann, FNP',
  
  'brad adkins': 'Brad Adkins, NP',
  'brad creekmore': 'Brad Creekmore, MD',
  'brad creekmore, md': 'Brad Creekmore, MD',
  
  'bradley gatlin': 'Bradley Gatlin, FNP-C',
  'bradley gatlin, fnp': 'Bradley Gatlin, FNP-C',
  'bradley gatlin, fnp-c': 'Bradley Gatlin, FNP-C',
  
  'brandi rose': 'Brandi Rose, FNP',
  'brandi rose, fnp': 'Brandi Rose, FNP',
  'brandi rose, np': 'Brandi Rose, FNP',
  
  'brandon churchill': 'Brandon Churchill, NP',
  'brandon churchill ssd': 'Brandon Churchill, NP',
  
  'brandon pate': 'Brandon Pate, FNP',
  'brandon pate, fnp': 'Brandon Pate, FNP',
  'brandon pate, np': 'Brandon Pate, FNP',
  
  'brandy latham steelman': 'Brandy Steelman, FNP',
  'brandy latham steelman, np': 'Brandy Steelman, FNP',
  'brandy steelman': 'Brandy Steelman, FNP',
  'brandy steelman, fnp': 'Brandy Steelman, FNP',
  'brandy steelman, np': 'Brandy Steelman, FNP',
  'steelman': 'Brandy Steelman, FNP',
  
  'brandy rogers': 'Brandy Rogers, FNP-C',
  'brandy rogers, fnp': 'Brandy Rogers, FNP-C',
  'brandy rogers, fnp-c': 'Brandy Rogers, FNP-C',
  
  'bran mccarver': 'Brian McCarver, MD',
  'brian mccarver': 'Brian McCarver, MD',
  'bran mccarver, md': 'Brian McCarver, MD',
  'brian mccarver, md': 'Brian McCarver, MD',
  
  'brian fullwood': 'Brian Fullwood, NP',
  'brian qualls': 'Brian Qualls, NP',
  
  'brent amzow': 'Brent Zamzow, MD',
  'brent zamzow': 'Brent Zamzow, MD',
  'brent zamzow, md': 'Brent Zamzow, MD',
  'zamzow': 'Brent Zamzow, MD',
  
  'brent rudder': 'Michiel Rudder, FNP',
  'brent rudder, fnp': 'Michiel Rudder, FNP',
  'michiel brent rudder': 'Michiel Rudder, FNP',
  'michiel brent rudder, fnp': 'Michiel Rudder, FNP',
  'michiel rudder': 'Michiel Rudder, FNP',
  'michiel rudder, fnp': 'Michiel Rudder, FNP',
  'michael rudder': 'Michiel Rudder, FNP',
  
  'brittany bennett': 'Brittany Bennett, NP',
  
  'brittany lynch': 'Brittany Lynch, APRN',
  'brittany lynch aprn': 'Brittany Lynch, APRN',
  'brittany lynch, aprn': 'Brittany Lynch, APRN',
  'brittany lynch aprn and dr. charlotte coleman, md': 'Brittany Lynch, APRN',
  'brittany lynch aprn and dr.charlotte coleman, md': 'Brittany Lynch, APRN',
  
  'brittany proudfit': 'Brittany Proudfit, FNP-C',
  'brittany proudfit, fnp': 'Brittany Proudfit, FNP-C',
  'brittany proudfit, fnp-c': 'Brittany Proudfit, FNP-C',
  
  'brittany rauchle': 'Brittany Rauchle, FNP',
  'brittany rauchle, fnp': 'Brittany Rauchle, FNP',
  
  'brooke bedwell': 'Brooke Bedwell, FNP',
  'brooke bedwell, fnp': 'Brooke Bedwell, FNP',
  
  'brooke creasy': 'Brooke Creasy, NP',
  
  'brooke garner': 'Brooke Garner, FNP-C',
  'brooke garner, fnp': 'Brooke Garner, FNP-C',
  'brooke garner, fnp-c': 'Brooke Garner, FNP-C',
  'brooke garner,-c, fnp': 'Brooke Garner, FNP-C',
  
  'bruce brown': 'Bruce Brown, MD',
  
  'bryan merrick': 'Bryan Merrick, NP',
  'bryan tygart': 'Bryan Tygart, MD',
  'bryan tygart, md': 'Bryan Tygart, MD',
  'md bryan tygart': 'Bryan Tygart, MD',
  
  'buffy cook': 'Buffy Cook, MD',
  'buffy cook, md': 'Buffy Cook, MD',
  'buffy jay cook': 'Buffy Cook, MD',
  
  'byron breeding': 'Byron Breeding, PA-C',
  'byron breeding, pa-c': 'Byron Breeding, PA-C',
  'byron breeding, pa-c-c': 'Byron Breeding, PA-C',
  'byron breeeding': 'Byron Breeding, PA-C',
  
  // ==================== C ====================
  'caitlin hawkins': 'Caitlin Hawkins, PA-C',
  'caitlin hawkins, pa-c': 'Caitlin Hawkins, PA-C',
  'caitlin hawkins, -c, pa': 'Caitlin Hawkins, PA-C',
  
  'caitlin wamble': 'Caitlin Wamble, NP',
  'caitlyn trostel': 'Caitlyn Trostel, NP',
  'candace rowland': 'Candace Rowland, NP',
  
  'candice jones': 'Candice Jones, DO',
  'candice jones, do': 'Candice Jones, DO',
  'candice l jones': 'Candice Jones, DO',
  'candice l jones, do': 'Candice Jones, DO',
  
  'cara roberson': 'Cara Roberson, FNP',
  'cara roberson, fnp': 'Cara Roberson, FNP',
  
  'care rite pllc': 'CareRite, PLLC',
  'carerite pllc': 'CareRite, PLLC',
  'carerite, pllc': 'CareRite, PLLC',
  
  'carey frix': 'Carey Frix, MD',
  'carey frix, md': 'Carey Frix, MD',
  
  'carie cox': 'Carie Cox, FNP-C',
  'carie cox, fnp': 'Carie Cox, FNP-C',
  'carie cox, fnp-c': 'Carie Cox, FNP-C',
  
  'carla': 'Carla, NP',
  'carmel verrier': 'Carmel Verrier, NP',
  
  'carol guess': 'Carol Guess, MD',
  'carol guess, md': 'Carol Guess, MD',
  'cw guess': 'Carol Guess, MD',
  'guess': 'Carol Guess, MD',
  
  'carol newman': 'Carolyn Newman, FNP',
  'carolyn m. newman, fnp': 'Carolyn Newman, FNP',
  'carolyn m.newman': 'Carolyn Newman, FNP',
  'carolyn m.newman, fnp': 'Carolyn Newman, FNP',
  
  'carolyn marcum': 'Carolyn Marcum, NP',
  
  'carr': 'Carr, MD',
  'carter': 'Carter, NP',
  
  'cassidy belew': 'Cassidy Belew, FNP-C',
  'cassidy belew, fnp': 'Cassidy Belew, FNP-C',
  'cassidy belew, fnp-c': 'Cassidy Belew, FNP-C',
  'cassidy belew, np': 'Cassidy Belew, FNP-C',
  'cassidy belew,-c, fnp': 'Cassidy Belew, FNP-C',
  
  'chad odle': 'Michael Chad Odle, FNP',
  'michael chad odle': 'Michael Chad Odle, FNP',
  'michael chad odle, fnp': 'Michael Chad Odle, FNP',
  'michael odle': 'Michael Chad Odle, FNP',
  'michael odle, fnp': 'Michael Chad Odle, FNP',
  
  'chad scott': 'Chad Scott, FNP',
  'chad scott, fnp': 'Chad Scott, FNP',
  
  'charleston b wallace': 'Charleston Wallace, FNP',
  'charleston wallace': 'Charleston Wallace, FNP',
  'charleston wallace, fnp': 'Charleston Wallace, FNP',
  
  'charles leckie': 'Charles Leckie, MD',
  'charles neal': 'Charles Neal, MD',
  
  'chasity campbell': 'Chasity Campbell, FNP-C',
  'chasity campbell, fnp': 'Chasity Campbell, FNP-C',
  'chasity campbell, fnp-c': 'Chasity Campbell, FNP-C',
  
  'chelsey parks': 'Chelsey Parks, DNP',
  'chelsey parks, dnp': 'Chelsey Parks, DNP',
  'chelsey parks, fnp': 'Chelsey Parks, DNP',
  'chelsey sparks': 'Chelsey Parks, DNP',
  'chelsey sparks, np': 'Chelsey Parks, DNP',
  
  'cheryl middleton': 'Cheryl Middleton, FNP',
  'cheryl middleton, fnp': 'Cheryl Middleton, FNP',
  
  'chibuzo nwokolo': 'Chibuzo Nwokolo, MD',
  'chibuzo nwokolo, md': 'Chibuzo Nwokolo, MD',
  'lisa alexander nwokolo, np': 'Lisa Alexander Nwokolo, NP',
  
  'chris ledbetter': 'Chris Ledbetter, MD',
  
  'christa bane': 'Jaclyn Bane, NP',
  
  'christian gray': 'Christin Gray, FNP-C',
  'christian gray, fnp': 'Christin Gray, FNP-C',
  'christin gray': 'Christin Gray, FNP-C',
  'christin gray, fnp': 'Christin Gray, FNP-C',
  'christin gray, fnp-c': 'Christin Gray, FNP-C',
  'christin gray, np': 'Christin Gray, FNP-C',
  'christin gray, np-c': 'Christin Gray, FNP-C',
  
  'christie king patterson': 'Christie King Patterson, NP',
  'christie king patterson, np': 'Christie King Patterson, NP',
  
  'christopher davidson': 'Christopher Davidson, NP',
  'christopher ingelmo': 'Christopher Ingelmo, MD',
  
  'christopher knight': 'Christopher Knight, MD',
  'christopher knight, md': 'Christopher Knight, MD',
  
  'christopher marshall': 'Christopher Marshall, MD',
  'christopher marshall, md': 'Christopher Marshall, MD',
  'christopher d marshall': 'Christopher Marshall, MD',
  
  'christ ward': 'Christy Ward, FNP',
  'christy ward': 'Christy Ward, FNP',
  'christ ward, fnp': 'Christy Ward, FNP',
  'christy ward, fnp': 'Christy Ward, FNP',
  'christy ward, np': 'Christy Ward, FNP',
  
  'christy dougherty': 'Christy Dougherty, FNP',
  'christy dougherty, fnp': 'Christy Dougherty, FNP',
  'christy dougherty, np': 'Christy Dougherty, FNP',
  
  'christy tipton': 'Christy Tipton, NP',
  'christy tipton, fnp': 'Christy Tipton, NP',
  'christy tipton, np': 'Christy Tipton, NP',
  
  'claire hooper': 'Claire Hooper, NP',
  'clara johnson': 'Clara Johnson, NP',
  
  'clarey dowling': 'Clarey R. Dowling, MD',
  'clarey dowling m. d': 'Clarey R. Dowling, MD',
  'clarey dowling, md': 'Clarey R. Dowling, MD',
  'clarey dowling,, md': 'Clarey R. Dowling, MD',
  'clarey r dowling': 'Clarey R. Dowling, MD',
  'clarey r dowling m. d': 'Clarey R. Dowling, MD',
  'clarey r. dowling m. d': 'Clarey R. Dowling, MD',
  'clarey r.dowling': 'Clarey R. Dowling, MD',
  'clarey r.dowling, md': 'Clarey R. Dowling, MD',
  'clarry dowling': 'Clarey R. Dowling, MD',
  
  'claude pirtle': 'Claude Pirtle, MD',
  'claude pirtle, md': 'Claude Pirtle, MD',
  
  'clay marvin': 'Clay Marvin, FNP-C',
  'clay marvin, fnp': 'Clay Marvin, FNP-C',
  'clay marvin, fnp-c': 'Clay Marvin, FNP-C',
  'clay marvin, np': 'Clay Marvin, FNP-C',
  
  'colton gramse': 'Colton Gramse, NP',
  
  'connie griffin': 'Connie Griffin, NP',
  'connie griffin, fnp': 'Connie Griffin, NP',
  'connie griffin, np': 'Connie Griffin, NP',
  
  'connie reaves': 'Connie Reaves, FNP',
  'connie reaves, fnp': 'Connie Reaves, FNP',
  'connie reaves, np': 'Connie Reaves, FNP',
  
  'conrado': 'Conrado Sioson, MD',
  'conrado sioson': 'Conrado Sioson, MD',
  'conrado sioson, md': 'Conrado Sioson, MD',
  
  'corey page': 'Corey Page, FNP',
  'corey page, fnp': 'Corey Page, FNP',
  'corey paige': 'Corey Page, FNP',
  
  'courtney faught': 'Courtney Faught, APRN',
  'courtney faught, aprn': 'Courtney Faught, APRN',
  'courtney faught, fnp': 'Courtney Faught, APRN',
  
  'courtney shires': 'Courtney Shires, NP',
  
  'cristie vibbert': 'Cristie Vibbert, FNP',
  'cristie vibbert, fnp': 'Cristie Vibbert, FNP',
  'crisite vibbert': 'Cristie Vibbert, FNP',
  'crisite vibbert, fnp': 'Cristie Vibbert, FNP',
  
  'cynthia carroll': 'Cynthia Carroll, FNP',
  'cynthia carroll, fnp': 'Cynthia Carroll, FNP',
  'cynthia carrol': 'Cynthia Carroll, FNP',
  'cynthia carrol, fnp': 'Cynthia Carroll, FNP',
  
  'cynthia eblen': 'Cynthia Eblen, FNP',
  'cynthia eblen, fnp': 'Cynthia Eblen, FNP',
  
  'cynthia mashburn': 'Cynthia Mashburn, FNP',
  'cynthia mashburn, fnp': 'Cynthia Mashburn, FNP',
  
  'cyble carter': 'Syble Carter, FNP',
  'syble carter': 'Syble Carter, FNP',
  'syble carter, fnp': 'Syble Carter, FNP',
  'syble carter, np': 'Syble Carter, FNP',
  
  // ==================== D ====================
  'dafnis carranza': 'Dafnis Carranza, MD',
  'dalton weaver': 'Dalton Weaver, NP',
  
  'daniel crall': 'Daniel Crall, PA-C',
  'daniel crall, pa': 'Daniel Crall, PA-C',
  'daniel crall, pa-c': 'Daniel Crall, PA-C',
  'daniel crall, pa-c-c': 'Daniel Crall, PA-C',
  
  'daniel hoit': 'Daniel Hoit, MD',
  'daniel hoit, md': 'Daniel Hoit, MD',
  
  'daniel otten': 'Daniel Otten, MD',
  'dr otten': 'Daniel Otten, MD',
  'otten': 'Daniel Otten, MD',
  
  'darren perry': 'Darren Perry, CFNP',
  'darren perry, cfnp': 'Darren Perry, CFNP',
  'darren perry, fnp': 'Darren Perry, CFNP',
  'darren pery': 'Darren Perry, CFNP',
  
  'darryl worley': 'Darryl Worley, NP',
  
  'dave jain': 'Dave Jain, DO',
  'dave jain, do': 'Dave Jain, DO',
  
  'dave roberts': 'David Roberts, PA-C',
  
  'david guthrie': 'David Guthrie, MD',
  'david guthrie, md': 'David Guthrie, MD',
  'guthrie': 'David Guthrie, MD',
  
  'david j. wilbert': 'David J. Wilbert, PA-C',
  'david j. wilbert, pa-c': 'David J. Wilbert, PA-C',
  'david j.wilbert': 'David J. Wilbert, PA-C',
  'david j.wilbert, pa-c-c': 'David J. Wilbert, PA-C',
  'david wilbert': 'David J. Wilbert, PA-C',
  'david wilbert, pa-c': 'David J. Wilbert, PA-C',
  'david wilbert, pa-c-c': 'David J. Wilbert, PA-C',
  
  'david krapf': 'David Krapf, DO',
  'david krapf, do': 'David Krapf, DO',
  'david scott krapf': 'David Krapf, DO',
  'david scott krapf, do': 'David Krapf, DO',
  
  'david l seaton': 'David L. Seaton, MD',
  'david l. seaton': 'David L. Seaton, MD',
  'david l. seaton, md': 'David L. Seaton, MD',
  'david l. steaton': 'David L. Seaton, MD',
  'david l.seaton': 'David L. Seaton, MD',
  'david l.seaton, md': 'David L. Seaton, MD',
  'david seaton': 'David L. Seaton, MD',
  'david seaton, md': 'David L. Seaton, MD',
  
  'david laird': 'David Laird, MD',
  
  'david larsen': 'David Larsen, MD',
  'david larsen, md': 'David Larsen, MD',
  'larsen': 'David Larsen, MD',
  
  'david maness': 'David Maness, DO',
  'david maness, do': 'David Maness, DO',
  
  'david roberts': 'David Roberts, PA-C',
  'david roberts, pa-c': 'David Roberts, PA-C',
  'david roberts, -c, pa': 'David Roberts, PA-C',
  
  'davis': 'Davis, NP',
  'davis matthew l': 'Matthew L. Davis, MD',
  'day': 'Day, MD',
  
  'd. gregory franz': 'Gregory Franz, MD',
  
  'deb graves': 'Deborah Graves, FNP',
  
  'debbie delones': 'Debra Delones, FNP-C',
  'debbie delones, fnp': 'Debra Delones, FNP-C',
  'debbie delones, fnp-c': 'Debra Delones, FNP-C',
  'debbie delones npo': 'Debra Delones, FNP-C',
  'deborah delones': 'Debra Delones, FNP-C',
  'debra delones': 'Debra Delones, FNP-C',
  'debra delones, fnp': 'Debra Delones, FNP-C',
  'debra delones, fnp-c': 'Debra Delones, FNP-C',
  'delones': 'Debra Delones, FNP-C',
  
  'deborah dillard': 'Deborah Dillard, NP',
  
  'deborah graves': 'Deborah Graves, FNP',
  'deborah graves, fnp': 'Deborah Graves, FNP',
  'deborah graves, np': 'Deborah Graves, FNP',
  
  'deborah lampley': 'Deborah Lampley, FNP',
  'deborah lampley, fnp': 'Deborah Lampley, FNP',
  'deborah lampley, np': 'Deborah Lampley, FNP',
  
  'deborah leggett': 'Deborah Leggett, FNP',
  'deborah leggett, fnp': 'Deborah Leggett, FNP',
  'deborah legett': 'Deborah Leggett, FNP',
  
  'deborah p. jones': 'Deborah P. Jones, NP',
  'deborah p.jones': 'Deborah P. Jones, NP',
  'deborah sherer': 'Deborah Sherer, NP',
  
  'deborah smothers': 'Deborah T. Smothers, FNP',
  'deborah t. smothers': 'Deborah T. Smothers, FNP',
  'deborah t. smothers, fnp': 'Deborah T. Smothers, FNP',
  'deborah t.smothers': 'Deborah T. Smothers, FNP',
  'deborah t.smothers, fnp': 'Deborah T. Smothers, FNP',
  'deborah smothers, fnp': 'Deborah T. Smothers, FNP',
  
  'debra cannon': 'Debra S. Cannon, FNP',
  'debra cannon, fnp': 'Debra S. Cannon, FNP',
  'debra s cannon': 'Debra S. Cannon, FNP',
  'debra s cannon, fnp': 'Debra S. Cannon, FNP',
  'debra s. cannon, fnp': 'Debra S. Cannon, FNP',
  'debra s.cannon': 'Debra S. Cannon, FNP',
  'debra s.cannon, fnp': 'Debra S. Cannon, FNP',
  
  'debra grace': 'Debra Grace, NP',
  
  'dee blakney': 'Dee Blakney, DNP',
  'dee blakney, dnp': 'Dee Blakney, DNP',
  
  'demetria davis': 'Demetria Davis, PA-C',
  'demetria davis, pa': 'Demetria Davis, PA-C',
  'demetria davis, pa-c': 'Demetria Davis, PA-C',
  'demetria davis, -c, pa': 'Demetria Davis, PA-C',
  
  'denean hendren': 'Denean Hendren, NP',
  'denise': 'Denise, NP',
  
  'denise shok': 'Denise Shook, NP',
  'denise shok, np': 'Denise Shook, NP',
  'denise shook': 'Denise Shook, NP',
  'denise shook, fnp': 'Denise Shook, NP',
  'denise shook, np': 'Denise Shook, NP',
  
  'derek moeller': 'Derek Moeller, NP',
  'derek wakefield': 'Ray Wakefield, FNP',
  'deseray melton': 'Deseray Melton, NP',
  
  'desiree holland': 'Desiree Holland, NP',
  'desiree holland, fnp': 'Desiree Holland, NP',
  'desiree holland, np': 'Desiree Holland, NP',
  'desiree hollland': 'Desiree Holland, NP',
  
  'devin beck': 'Devin Beck, FNP',
  'devin beck, fnp': 'Devin Beck, FNP',
  
  'diane maxwell': 'Diane Maxwell, FNP-BC',
  'diane maxwell, fnp': 'Diane Maxwell, FNP-BC',
  'diane maxwell, fnp-bc': 'Diane Maxwell, FNP-BC',
  'diane maxell': 'Diane Maxwell, FNP-BC',
  'diane maxell, fnp': 'Diane Maxwell, FNP-BC',
  'diane maxell, fnp-c': 'Diane Maxwell, FNP-BC',
  
  'diane rybacki': 'Diane Rybacki, NP',
  
  'dr baba': 'Rauf Baba, MD',
  'dr babas': 'Rauf Baba, MD',
  
  'dr busch': 'Forrest Busch, DO',
  'forrest busch': 'Forrest Busch, DO',
  'forrest busch, do': 'Forrest Busch, DO',
  'forrest k busch': 'Forrest Busch, DO',
  'forrest kenton busch': 'Forrest Busch, DO',
  'busch': 'Forrest Busch, DO',
  
  'dr gore': 'Margaret Gore, MD',
  'gore': 'Margaret Gore, MD',
  'margaret gore': 'Margaret Gore, MD',
  'margaret gore, md': 'Margaret Gore, MD',
  
  'dr gravenor': 'Gravenor, MD',
  'gravenor': 'Gravenor, MD',
  
  'dr gregory franz @ kirkland cancer center': 'Gregory Franz, MD',
  
  'dr hale in union city': 'John W. Hale, MD',
  
  'dr mckee': 'William N. McKee, MD',
  
  'dr mulay covington': 'Shree Mulay, MD',
  'dr shree mulay': 'Shree Mulay, MD',
  
  'dr naifeh': 'Naifeh, MD',
  
  'dr rhodes': 'Rhodes, MD',
  'rhodes': 'Rhodes, MD',
  
  'dr steven weaver': 'Steven Weaver, MD',
  'steven weaver': 'Steven Weaver, MD',
  
  'dr. kumar yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh, md': 'Kumar Yogesh, MD',
  'yogesh': 'Kumar Yogesh, MD',
  
  'dr. machra': 'Ravinder MacHra, MD',
  'ravinder machra': 'Ravinder MacHra, MD',
  'ravinder machra, md': 'Ravinder MacHra, MD',
  'ravinder machra,, md': 'Ravinder MacHra, MD',
  'r machra': 'Ravinder MacHra, MD',
  'machara': 'Ravinder MacHra, MD',
  
  'dr. ronald smith, md': 'Ronald Smith, MD',
  
  'dum piawa': 'Dum Piawa, DO',
  'dum piawa, do': 'Dum Piawa, DO',
  
  // ==================== E ====================
  'earl stewart': 'Earl Stewart, MD',
  'earl stewart, md': 'Earl Stewart, MD',
  'earl stewart,, md': 'Earl Stewart, MD',
  'earl l. stewart, md': 'Earl Stewart, MD',
  'earl l.stewart': 'Earl Stewart, MD',
  'earl l.stewart, md': 'Earl Stewart, MD',
  'earl stewart m. d': 'Earl Stewart, MD',
  'earl swetward, md': 'Earl Stewart, MD',
  
  'edward leichner': 'Edward Leichner, MD',
  'elesa miller': 'Elesa Miller, FNP',
  
  'elizabeth anderson': 'Elizabeth Anderson, FNP-C',
  'elizabeth anderson, fnp': 'Elizabeth Anderson, FNP-C',
  'elizabeth anderson, fnp-c': 'Elizabeth Anderson, FNP-C',
  'elizabeth anderson,-c, fnp': 'Elizabeth Anderson, FNP-C',
  
  'elizabeth frazier': 'Elizabeth Frazier, NP',
  'elizabeth frazier, fnp': 'Elizabeth Frazier, NP',
  'elizabeth frazier, np': 'Elizabeth Frazier, NP',
  
  'elizabeth graves': 'Elizabeth Graves, FNP',
  'elizabeth graves, fnp': 'Elizabeth Graves, FNP',
  'elizabeth graves, np': 'Elizabeth Graves, FNP',
  
  'elizabeth james': 'Elizabeth James, NP',
  
  'elizabeth jones': 'Elizabeth R. Jones, NP',
  'elizabeth jones, fnp': 'Elizabeth R. Jones, NP',
  'elizabeth jones, np': 'Elizabeth R. Jones, NP',
  'elizabeth r jones': 'Elizabeth R. Jones, NP',
  'elizabeth r jones, np': 'Elizabeth R. Jones, NP',
  
  'elizabeth londino': 'Elizabeth Londino, NP',
  'londino': 'Elizabeth Londino, NP',
  
  'elizabeth lu': 'Elizabeth Lu, NP',
  
  'elizabeth martin': 'Elizabeth Martin, APN',
  'elizabeth martin, apn': 'Elizabeth Martin, APN',
  'elizabeth martin, aprn': 'Elizabeth Martin, APN',
  
  'elizabeth roberson': 'Elizabeth Roberson, NP',
  
  'elizabeth roberts': 'Elizabeth Wade Roberts, NP',
  'elizabeth roberts, cfnp': 'Elizabeth Wade Roberts, CFNP',
  'elizabeth roberts, fnp': 'Elizabeth Wade Roberts, NP',
  'elizabeth roberts, np': 'Elizabeth Wade Roberts, NP',
  'elizabeth wade roberts': 'Elizabeth Wade Roberts, NP',
  'elizabeth wade roberts, fnp': 'Elizabeth Wade Roberts, NP',
  'elizabeth wade roberts, np': 'Elizabeth Wade Roberts, NP',
  
  'elizabeth rodriguez': 'Elizabeth Rodriguez, MD',
  'elizabeth rodriguez, md': 'Elizabeth Rodriguez, MD',
  
  'elliot kurban': 'Elliot Kurban, MD',
  'elliot kurban, md': 'Elliot Kurban, MD',
  'elliot kurban md/holly bunch, np': 'Elliot Kurban, MD',
  'elliot kurban /holly bunch, md': 'Elliot Kurban, MD',
  'kurban': 'Elliot Kurban, MD',
  
  'elly riley': 'Elly Riley, NP',
  
  'emily': 'Emily, NP',
  
  'emily bullock': 'Emily K. Bullock, FNP',
  'emily k. bullock, fnp': 'Emily K. Bullock, FNP',
  'emily k.bullock': 'Emily K. Bullock, FNP',
  'emily k.bullock, fnp': 'Emily K. Bullock, FNP',
  'emily bullock, fnp': 'Emily K. Bullock, FNP',
  
  'emily ezell': 'Emily Smothers Ezell, NP',
  'emily smothers ezell': 'Emily Smothers Ezell, NP',
  'emily smothers ezell, fnp': 'Emily Smothers Ezell, NP',
  
  'emily garner': 'Emily Garner, NP',
  'emily garner, fnp': 'Emily Garner, NP',
  'emily garner, np': 'Emily Garner, NP',
  'emily garner., np': 'Emily Garner, NP',
  
  'emily miller': 'Emily Miller, APRN',
  'emily miller, aprn': 'Emily Miller, APRN',
  'emilly miller': 'Emily Miller, APRN',
  
  'emmanuel obi': 'Emmanuel Obi, MD',
  'obi': 'Emmanuel Obi, MD',
  
  'eric hart': 'Eric Hart, PA-C',
  'eric hart, pa': 'Eric Hart, PA-C',
  'eric hart, pa-c': 'Eric Hart, PA-C',
  'eric hart, pa-c-c': 'Eric Hart, PA-C',
  'eric hart,-c, pa-c-c': 'Eric Hart, PA-C',
  
  'eric sievers': 'Eric Sievers, NP',
  'eric sievrs': 'Eric Sievers, NP',
  'eric sievers, md': 'Eric Sievers, MD',
  
  'erica scheffer': 'Erica Scheffer, MD',
  'erica scheffer, md': 'Erica Scheffer, MD',
  
  'erick stafford': 'Erick Stafford, PA-C',
  'erick stafford, pa': 'Erick Stafford, PA-C',
  'erick stafford, pa-c': 'Erick Stafford, PA-C',
  'erick stafford, -c, pa': 'Erick Stafford, PA-C',
  
  'erin peeden': 'Erin Peeden, NP',
  'erin williams': 'Erin Williams, NP',
  
  'esden': 'Esden, MD',
  'ethan loeb': 'Ethan Loeb, MD',
  
  'ethel spivey': 'Ethel Spivey, ANP',
  'ethel spivey, anp': 'Ethel Spivey, ANP',
  'ethel spivey, a, fnp': 'Ethel Spivey, ANP',
  'ethel spivey, fnp': 'Ethel Spivey, ANP',
  
  'evelyn jackson': 'Evelyn Nicole Jackson, APN',
  'evelyn jackson, apn': 'Evelyn Nicole Jackson, APN',
  'evelyn n. jackson, fnp': 'Evelyn Nicole Jackson, FNP',
  'evelyn n.jackson': 'Evelyn Nicole Jackson, APN',
  'evelyn n.jackson, fnp': 'Evelyn Nicole Jackson, FNP',
  'evelyn nicole jackson': 'Evelyn Nicole Jackson, APN',
  'evelyn nicole jackson, apn': 'Evelyn Nicole Jackson, APN',
  
  'ezekiel adetunji': 'Ezekiel Adetunji, NP',
  
  // ==================== F ====================
  'f. gregory cox': 'F. Gregory Cox, MD',
  'f. gregory cox, md': 'F. Gregory Cox, MD',
  'f. gregory cox,, md': 'F. Gregory Cox, MD',
  'f.gregory cox': 'F. Gregory Cox, MD',
  'fred cox': 'F. Gregory Cox, MD',
  'fred cox, md': 'F. Gregory Cox, MD',
  'fred g cox': 'F. Gregory Cox, MD',
  'fred g cox, md': 'F. Gregory Cox, MD',
  'fred g. cox, md': 'F. Gregory Cox, MD',
  'fred g.cox': 'F. Gregory Cox, MD',
  'fred g.cox, md': 'F. Gregory Cox, MD',
  'fred gregory cox': 'F. Gregory Cox, MD',
  'fred gregory cox, md': 'F. Gregory Cox, MD',
  'greg cox': 'F. Gregory Cox, MD',
  'greg cox, md': 'F. Gregory Cox, MD',
  'gregory cox': 'F. Gregory Cox, MD',
  'gregory cox, md': 'F. Gregory Cox, MD',
  
  'faisal soliman': 'Faisal Soliman, MD',
  
  'farrah vernon': 'Farrah Vernon, DO',
  'farrah vernon, do': 'Farrah Vernon, DO',
  
  'festus arinze': 'Festus Arinze, MD',
  'festus arinze, md': 'Festus Arinze, MD',
  'festus arinze m. d': 'Festus Arinze, MD',
  
  'finley leslie': 'Finley Leslie, NP',
  'frank': 'Frank, MD',
  'franz': 'Gregory Franz, MD',
  'fred sesti': 'Fred Sesti, MD',
  
  // ==================== G ====================
  'gary blount': 'Gary Blount, PA-C',
  'gary blount, pa': 'Gary Blount, PA-C',
  'gary blount, pa-c': 'Gary Blount, PA-C',
  'gary blount, pa-c-c': 'Gary Blount, PA-C',
  'gary blount,-c, pa-c-c': 'Gary Blount, PA-C',
  'gary christopher blount': 'Gary Blount, PA-C',
  
  'gaudam md nithyalakshmi': 'Nithyalakshmi Gaudam, MD',
  'gaudam nithyalakshmi': 'Nithyalakshmi Gaudam, MD',
  'gaudam nithyalakshmi, md': 'Nithyalakshmi Gaudam, MD',
  
  'george mangle': 'George Mangle, MD',
  'grant jackson': 'Grant Jackson, NP',
  'grant studebaker': 'Grant Studebaker, MD',
  
  'gregary byers': 'Gregary C. Byers, FNP-C',
  'gregary byers, fnp': 'Gregary C. Byers, FNP-C',
  'gregary byers, fnp-c': 'Gregary C. Byers, FNP-C',
  'gregary c. byers, fnp-c': 'Gregary C. Byers, FNP-C',
  'gregary c.byers': 'Gregary C. Byers, FNP-C',
  'gregary c.byers, fnp': 'Gregary C. Byers, FNP-C',
  
  'gregg mitchell': 'Gregg Mitchell, NP',
  'mitchell': 'Gregg Mitchell, NP',
  
  'gregory b. franz': 'Gregory Franz, MD',
  'gregory b.franz': 'Gregory Franz, MD',
  'gregory b.franz, md': 'Gregory Franz, MD',
  'gregory franz': 'Gregory Franz, MD',
  'gregory franz, md': 'Gregory Franz, MD',
  
  'gregory jenkins': 'Gregory Jenkins, MD',
  
  // ==================== H ====================
  'hailee tillery': 'Hailee Tillery, FNP',
  'hailee tillery, fnp': 'Hailee Tillery, FNP',
  'hailee tillery, np': 'Hailee Tillery, FNP',
  'haille tillery': 'Hailee Tillery, FNP',
  
  'haley sanders': 'Haley Sanders, PA-C',
  'haley sanders, pa': 'Haley Sanders, PA-C',
  'haley sanders, pa-c': 'Haley Sanders, PA-C',
  'haley sanders, -c, pa': 'Haley Sanders, PA-C',
  'haylie sanders': 'Haley Sanders, PA-C',
  
  'haley scillion': 'Haley Scillion, FNP',
  'haley scillion, fnp': 'Haley Scillion, FNP',
  
  'hans hinterkopf': 'Hans Hinterkopf, PA-C',
  'hans hinterkopf, pa-c': 'Hans Hinterkopf, PA-C',
  'hans hinterkopf, -c, pa': 'Hans Hinterkopf, PA-C',
  
  'harborview': 'Harborview Health Systems',
  'harborview health systems': 'Harborview Health Systems',
  'haborveiw': 'Harborview Health Systems',
  
  'haris zafarullah': 'Haris Zafarullah, MD',
  'hayti': 'Hayti Medical Center',
  
  'heather a garrett': 'Heather Garrett, FNP',
  'heather garrett': 'Heather Garrett, FNP',
  'heather garrett, fnp': 'Heather Garrett, FNP',
  
  'heather haddock': 'Heather Haddock, FNP',
  'heather haddock, fnp': 'Heather Haddock, FNP',
  'heather haddock, np': 'Heather Haddock, FNP',
  'h. haddock, fnp': 'Heather Haddock, FNP',
  'h.haddock, fnp': 'Heather Haddock, FNP',
  'hearther haddock': 'Heather Haddock, FNP',
  
  'heather hobbs': 'Heather Hobbs, FNP',
  'heather hobbs, fnp': 'Heather Hobbs, FNP',
  
  'heather mcfarland': 'Heather McFarland, FNP',
  'heather mcfarland, fnp': 'Heather McFarland, FNP',
  
  'heather mckee': 'Heather McKee, NP',
  
  'heidi hill': 'Heidi Hill, NP',
  'heidi hill, fnp': 'Heidi Hill, NP',
  'heidi hill, np': 'Heidi Hill, NP',
  
  'hetal patel': 'Hetal Patel, MD',
  'hetal patel, md': 'Hetal Patel, MD',
  
  'hill': 'Hill, NP',
  'hinds': 'Michael Hinds, MD',
  
  'hillary blankenship': 'Hillary Blankenship, APRN-BC',
  'hillary blankenship, aprn': 'Hillary Blankenship, APRN-BC',
  'hillary blankenship, aprn-bc': 'Hillary Blankenship, APRN-BC',
  
  'hollie frazier': 'Hollie Frazier, NP',
  'hollie frazier, fnp': 'Hollie Frazier, NP',
  'hollie frazier, np': 'Hollie Frazier, NP',
  'hollie fraier, np': 'Hollie Frazier, NP',
  
  'holly bunch': 'Holly Bunch, NP',
  'holly bunch, fnp': 'Holly Bunch, NP',
  'holly bunch, np': 'Holly Bunch, NP',
  
  'holly sanders': 'Holly Sanders, NP',
  
  'holly shourd': 'Holly Shourd, FNP',
  'holly shourd, fnp': 'Holly Shourd, FNP',
  
  // ==================== I ====================
  'ihsan haq': 'Ihsan Haq, MD',
  'in epic': 'In Epic System',
  'ionela halke': 'Ionela Halke, NP',
  'ivy hardin': 'Ivy Hardin, NP',
  
  // ==================== J ====================
  'jackie scott': 'Jackie Scott, FNP',
  'jackie scott, fnp': 'Jackie Scott, FNP',
  'jacqueline scott': 'Jackie Scott, FNP',
  'jacqueline scott, fnp': 'Jackie Scott, FNP',
  
  'jaclyn bane': 'Jaclyn Bane, FNP',
  'jaclyn bane, fnp': 'Jaclyn Bane, FNP',
  'christa bane': 'Jaclyn Bane, FNP',
  
  'jacob aelion': 'Jacob Aelion, MD',
  'jacob aelion, md': 'Jacob Aelion, MD',
  
  'james batey': 'James Batey, MD',
  'james batey, md': 'James Batey, MD',
  
  'james burrow': 'James E. Burrow, FNP',
  'james e burrow': 'James E. Burrow, FNP',
  'james e burrow, fnp': 'James E. Burrow, FNP',
  
  'james hudson': 'James Hudson, MD',
  
  'james king': 'James King, MD',
  
  'james l williams ii': 'James L. Williams II, MD',
  'james l.williams ii': 'James L. Williams II, MD',
  'james l williams ii, md': 'James L. Williams II, MD',
  'james l.williams ii, md': 'James L. Williams II, MD',
  'james williams': 'James L. Williams II, MD',
  'james williams, md': 'James L. Williams II, MD',
  'jim williams': 'James L. Williams II, MD',
  'jim williams, md': 'James L. Williams II, MD',
  
  'james payne': 'James Payne, MD',
  
  'james tetleton': 'James Tetleton, FNP',
  'james tetleton, fnp': 'James Tetleton, FNP',
  
  'jamesa poindexter': 'Jamesa Poindexter, FNP',
  
  'jan sims': 'Jan Sims, FNP',
  'jan sims, fnp': 'Jan Sims, FNP',
  
  'janson davis': 'Janson Davis, PA-C',
  'janson davis, pa-c': 'Janson Davis, PA-C',
  
  'jared davis': 'Jared Davis, PA-C',
  'jared davis, pa-c': 'Jared Davis, PA-C',
  
  'jason goolsby': 'Jason Goolsby, DO',
  'jason goolsby, do': 'Jason Goolsby, DO',
  
  'jason infeld': 'Jason Infeld, MD',
  'jason infeld facc': 'Jason Infeld, MD',
  'jason infeld, md': 'Jason Infeld, MD',
  
  'jason myatt': 'Jason Myatt, FNP',
  
  'jayme walker': 'Jayme Walker, APRN',
  'jayme walker msn': 'Jayme Walker, APRN',
  'jayme walker, aprn': 'Jayme Walker, APRN',
  
  'jean davis': 'Jean Davis, DO',
  'jean ah davis': 'Jean Davis, DO',
  'jean davis, do': 'Jean Davis, DO',
  
  'jeffrey hampton': 'Jeffrey Hampton, FNP',
  'jeff hampton': 'Jeffrey Hampton, FNP',
  'jeffery hampton': 'Jeffrey Hampton, FNP',
  'jeffrey hampton, fnp': 'Jeffrey Hampton, FNP',
  
  'jennifer davis': 'Jennifer Davis, FNP',
  'jennifer davis, fnp': 'Jennifer Davis, FNP',
  
  'jennifer harper': 'Jennifer Harper, FNP',
  'jennifer harper, fnp': 'Jennifer Harper, FNP',
  
  'jennifer jennings': 'Jennifer Jennings, FNP-BC',
  'jennifer jennings, fnp-bc': 'Jennifer Jennings, FNP-BC',
  'jennifer jennings, fnp': 'Jennifer Jennings, FNP-BC',
  
  'jennifer mcwilliams': 'Jennifer McWilliams, FNP',
  'jennifer mcwiliams': 'Jennifer McWilliams, FNP',
  'jennifer mcwillaims': 'Jennifer McWilliams, FNP',
  'jennifer mcwilliams, fnp': 'Jennifer McWilliams, FNP',
  
  'jerald white': 'Jerald White, MD',
  'jerald white, md': 'Jerald White, MD',
  
  'jeremy lawson': 'Jeremy Lawson, FNP',
  'jeremy lawson, fnp': 'Jeremy Lawson, FNP',
  
  'jerry p wilson': 'Jerry P. Wilson, MD',
  'jerry p.wilson': 'Jerry P. Wilson, MD',
  'jerry p wilson, md': 'Jerry P. Wilson, MD',
  
  'jessica kirk': 'Jessica Kirk, FNP',
  'jessica kirk, fnp': 'Jessica Kirk, FNP',
  
  'jessica rains': 'Jessica Rains, PA-C',
  'jessica rains, pa-c': 'Jessica Rains, PA-C',
  'jessica rains pa_c': 'Jessica Rains, PA-C',
  
  'jessica reese': 'Jessica Reese, FNP',
  'jessica reese, fnp': 'Jessica Reese, FNP',
  
  'jill bennett': 'Jill Bennett, FNP',
  'jill bennett, fnp': 'Jill Bennett, FNP',
  
  'jillian ferrari': 'Jillian Ferrari, FNP',
  'jillian ferrari, fnp': 'Jillian Ferrari, FNP',
  
  'joe mobley': 'Joe Mobley, MD',
  'joe mobley, md': 'Joe Mobley, MD',
  
  'joe hunt': 'Joe W. Hunt, MD',
  'joe w hunt': 'Joe W. Hunt, MD',
  'joe w.hunt': 'Joe W. Hunt, MD',
  'joe w.hunt, md': 'Joe W. Hunt, MD',
  
  'john b clendenin': 'John B. Clendenin, MD',
  'john b.clendenin': 'John B. Clendenin, MD',
  'john clendenin': 'John B. Clendenin, MD',
  'john clendenin, md': 'John B. Clendenin, MD',
  
  'john baker': 'John Baker, MD',
  'john baker, md': 'John Baker, MD',
  
  'john beasley': 'John Beasley, FNP',
  'john beasley, fnp': 'John Beasley, FNP',
  
  'john fussell': 'John Thomas Fussell, PA-C',
  'john thomas fussell': 'John Thomas Fussell, PA-C',
  'john fussell, pa-c': 'John Thomas Fussell, PA-C',
  
  'john hale': 'John W. Hale, MD',
  'john w hale': 'John W. Hale, MD',
  'dr hale in union city': 'John W. Hale, MD',
  
  'john riddick': 'John Riddick, MD',
  'john riddick, md': 'John Riddick, MD',
  
  'joon lee': 'Joon Lee, MD',
  'joon lee, md': 'Joon Lee, MD',
  'lee': 'Joon Lee, MD',
  
  'jordan daniels': 'Jordan Daniels, FNP',
  'jordan daniels, fnp': 'Jordan Daniels, FNP',
  'j daniels': 'Jordan Daniels, FNP',
  
  'joseph freeman': 'Joseph Freeman, MD',
  'joseph a.freeman': 'Joseph Freeman, MD',
  'joseph freeman, md': 'Joseph Freeman, MD',
  
  'joseph lamb': 'Joseph Lamb, MD',
  
  'joseph m.kulpeksa': 'Joseph M. Kulpeksa, MD',
  'joseph m.kulpeksa, md': 'Joseph M. Kulpeksa, MD',
  
  'joseph montgomery': 'Joseph Montgomery, MD',
  
  'joseph peters': 'Joseph Peters, MD',
  'joseph peters, md': 'Joseph Peters, MD',
  'dr joseph peters': 'Joseph Peters, MD',
  'dr. joseph peters': 'Joseph Peters, MD',
  
  'joshua whitledge': 'Joshua Whitledge, DO',
  'joshua d.whitledge': 'Joshua Whitledge, DO',
  'joshua whitledge, do': 'Joshua Whitledge, DO',
  'whitledge': 'Joshua Whitledge, DO',
  
  'joshua scearce': 'Joshua Scearce, MD',
  'joshua scearce, md': 'Joshua Scearce, MD',
  
  'joyce addo': 'Joyce Addo, PA-C',
  'joyce addo, pa-c': 'Joyce Addo, PA-C',
  
  'judith tessema': 'Judith Tessema, MD',
  'judith tessema, md': 'Judith Tessema, MD',
  
  'judy bain': 'Judy Bain, FNP',
  'judy bain, fnp': 'Judy Bain, FNP',
  
  'julia frye': 'Julia Frye, FNP',
  'julia frye, fnp': 'Julia Frye, FNP',
  
  'julie cantrell': 'Julie Cantrell, PA-C',
  'julie cantrell, pa-c': 'Julie Cantrell, PA-C',
  
  'justin turner': 'Justin Turner, MD',
  'justin turner, md': 'Justin Turner, MD',
  
  // ==================== K ====================
  'kaleb grimes': 'Kaleb Grimes, FNP',
  'kaleb grimes, fnp': 'Kaleb Grimes, FNP',
  
  'kalie foust': 'Kalie Foust, FNP',
  'kalie foust, fnp': 'Kalie Foust, FNP',
  'katie foust': 'Kalie Foust, FNP',
  
  'kamala karri': 'Kamala Karri, DNP',
  'kamala karri, dnp': 'Kamala Karri, DNP',
  
  'kandace dalton': 'Kandace Dalton, FNP',
  'kandace dalton, fnp': 'Kandace Dalton, FNP',
  
  'karen armour': 'Karen Armour, MD',
  'karen armour, md': 'Karen Armour, MD',
  
  'karen webb': 'Karen E. Webb, APN',
  'karen e.webb': 'Karen E. Webb, APN',
  'karen webb, apn': 'Karen E. Webb, APN',
  'karen webb, fnp': 'Karen E. Webb, APN',
  
  'karen martin': 'Karen Martin, FNP-C',
  'karen martin, fnp-c': 'Karen Martin, FNP-C',
  
  'karin featherston': 'Karin Featherston, FNP',
  'karin featherston, fnp': 'Karin Featherston, FNP',
  
  'kasey lax': 'Kasey Lax, FNP',
  'kasey lax, fnp': 'Kasey Lax, FNP',
  
  'kate cummings': 'Katherine Cummings, PA-C',
  'katherine cummings': 'Katherine Cummings, PA-C',
  'katherine cummings, pa-c': 'Katherine Cummings, PA-C',
  
  'katelyn pratt': 'Katelyn Pratt, FNP',
  'katelyn pratt, fnp': 'Katelyn Pratt, FNP',
  'mary katelyn pratt': 'Katelyn Pratt, FNP',
  'mary katelyn pratt, fnp': 'Katelyn Pratt, FNP',
  
  'katelyn robertson': 'Katelyn Robertson, FNP',
  'katelyn robertson, fnp': 'Katelyn Robertson, FNP',
  'kate robertson': 'Katelyn Robertson, FNP',
  'kately roberson': 'Katelyn Robertson, FNP',
  
  'kathy banks': 'Kathy Banks, FNP-C',
  'kathy banks, fnp': 'Kathy Banks, FNP-C',
  'kathy joann banks': 'Kathy Banks, FNP-C',
  
  'katherine forsbach': 'Katherine Forsbach, FNP',
  'katherine forsbach, fnp': 'Katherine Forsbach, FNP',
  
  'katherine james': 'Katherine James, FNP',
  'katherine james, fnp': 'Katherine James, FNP',
  
  'kathryn glass': 'Kathryn J. Glass, MD',
  'kathryn j glass': 'Kathryn J. Glass, MD',
  'kathryn j.glass': 'Kathryn J. Glass, MD',
  'kathryn j.glass, md': 'Kathryn J. Glass, MD',
  
  'kathy kee': 'Kathy Kee, FNP-BC',
  'kathy kee, fnp-bc': 'Kathy Kee, FNP-BC',
  'kathy kee, fnp': 'Kathy Kee, FNP-BC',
  
  'katie johnson': 'Katie Johnson, FNP',
  'katie johnson, fnp': 'Katie Johnson, FNP',
  
  'katie may': 'Katie May, FNP',
  'katie may, fnp': 'Katie May, FNP',
  
  'kayla holt': 'Kayla Holt, FNP',
  'kayla holt, fnp': 'Kayla Holt, FNP',
  
  'kaylie huddleston': 'Kaylie Huddleston, FNP',
  'kaylie huddleston, fnp': 'Kaylie Huddleston, FNP',
  
  'keata anthony': 'Keata Anthony, FNP',
  'keata anthony, fnp': 'Keata Anthony, FNP',
  
  'keith l.perkins jr.': 'Keith L. Perkins Jr., MD',
  'keith l.perkins jr., md': 'Keith L. Perkins Jr., MD',
  
  'keith mosher': 'Keith Mosher, MD',
  'keith mosher, md': 'Keith Mosher, MD',
  
  'keith nord': 'Keith Nord, MD',
  'keith nord, md': 'Keith Nord, MD',
  
  'kelley burg': 'Kelley Burg, FNP',
  'kelley burg, fnp': 'Kelley Burg, FNP',
  
  'kelly barnes': 'Kelly Barnes, FNP',
  'kelly barnes, fnp': 'Kelly Barnes, FNP',
  
  'kelly mccallum': 'Kelly McCallum, FNP',
  'kelly mccallum, fnp': 'Kelly McCallum, FNP',
  
  'kelly pulley': 'Kelly Pulley, FNP',
  'kelly pulley, fnp': 'Kelly Pulley, FNP',
  'pulley kelly': 'Kelly Pulley, FNP',
  
  'ken beene': 'Ken Beene, FNP',
  'ken beene, fnp': 'Ken Beene, FNP',
  
  'kenneth carr': 'Kenneth Carr, MD',
  'kenneth carr, md': 'Kenneth Carr, MD',
  
  'kenneth scott jackson': 'Kenneth Scott Jackson, FNP',
  'kenneth scott jackson, fnp': 'Kenneth Scott Jackson, FNP',
  
  'kenneth tozer': 'Kenneth Tozer, MD',
  'kenneth tozer, md': 'Kenneth Tozer, MD',
  
  'kerri ervin': 'Kerri Ervin, FNP',
  'kerri a ervin': 'Kerri Ervin, FNP',
  'kerri ervin, fnp': 'Kerri Ervin, FNP',
  
  'kerri sumler': 'Kerri Sumler, FNP',
  'kerri sumler, fnp': 'Kerri Sumler, FNP',
  
  'kevin gray': 'Kevin Gray, MD',
  'kevin gray, md': 'Kevin Gray, MD',
  
  'kevin lovette': 'Kevin Lovette, MD',
  
  'kevin stroup': 'Kevin Stroup, MD',
  'kevin stroup, md': 'Kevin Stroup, MD',
  
  'kimberly byrd': 'Kimberly Byrd, FNP',
  'kristin byrd': 'Kimberly Byrd, FNP',
  
  'kimberly roberts': 'Kimberly Roberts, FNP',
  'kimberly roberts, fnp': 'Kimberly Roberts, FNP',
  
  'kimberly russom': 'Kimberly Russom, FNP',
  'kimberly russom, fnp': 'Kimberly Russom, FNP',
  
  'kimberlie simpson': 'Kimberlie Simpson, FNP',
  'kimberlie simpson, fnp': 'Kimberlie Simpson, FNP',
  
  'kirsten sass': 'Kirsten Sass, PA-C',
  'kirsten sass, pa-c': 'Kirsten Sass, PA-C',
  
  'kofi nuako': 'Kofi Nuako, MD',
  
  'kolby herron': 'Kolby Herron, FNP',
  'kolby herron, fnp': 'Kolby Herron, FNP',
  
  'kristen beasley': 'Kristen Beasley, FNP',
  'kristen beasley, fnp': 'Kristen Beasley, FNP',
  
  'kristen martin': 'Kristen Martin, PA-C',
  'kristen martin, pa-c': 'Kristen Martin, PA-C',
  
  'kristi hazlewood': 'Kristi Hazlewood, FNP',
  'kristi hazlewood, fnp': 'Kristi Hazlewood, FNP',
  
  'kristin davis': 'Kristin Davis, FNP',
  'kristin davis, fnp': 'Kristin Davis, FNP',
  
  'kristy king': 'Kristy King, FNP',
  'kristy king, fnp': 'Kristy King, FNP',
  
  'kylie smith': 'Kylie Smith, FNP',
  'kylie smith, fnp': 'Kylie Smith, FNP',
  
  // ==================== L ====================
  'laken clanton': 'Laken Clanton, FNP',
  'laken clanton, fnp': 'Laken Clanton, FNP',
  
  'lakeshia yarbrough': 'Lakeshia Yarbrough, DNP',
  'keshia yarbrough': 'Lakeshia Yarbrough, DNP',
  'lakeshia yarbrough, dnp': 'Lakeshia Yarbrough, DNP',
  'lakeshia yarbrough, fnp': 'Lakeshia Yarbrough, DNP',
  
  'lane williams': 'Lane Williams, MD',
  'lane williams, md': 'Lane Williams, MD',
  
  'laura baker': 'Laura Baker, FNP',
  'laura baker msn': 'Laura Baker, FNP',
  'laura baker msn, fnp': 'Laura Baker, FNP',
  
  'laura west': 'Laura West, FNP',
  'laura beth west': 'Laura West, FNP',
  'laura b west': 'Laura West, FNP',
  'laura west, fnp': 'Laura West, FNP',
  
  'laura lancaster': 'Laura Lancaster, FNP',
  
  'laura langdon': 'Laura Langdon, PA-C',
  'laura langdon, pa-c': 'Laura Langdon, PA-C',
  
  'laura russell': 'Laura Russell, CFNP',
  'laura russell, cfnp': 'Laura Russell, CFNP',
  'laura russell, fnp': 'Laura Russell, CFNP',
  
  'laura wallace': 'Laura Wallace, FNP',
  'laura wallace, fnp': 'Laura Wallace, FNP',
  
  'laurel campbell': 'Laurel Campbell, MD',
  'laurel ann campbell': 'Laurel Campbell, MD',
  'laurel campbell, md': 'Laurel Campbell, MD',
  
  'lauren butler': 'Lauren Butler, FNP',
  'lauren butler, fnp': 'Lauren Butler, FNP',
  
  'lauren droke': 'Lauren Droke, FNP',
  'lauren droke, fnp': 'Lauren Droke, FNP',
  
  'lauren hansen': 'Lauren Hansen, DO',
  'lauren hansen, do': 'Lauren Hansen, DO',
  
  'lauren schultz': 'Lauren Schultz, PA-C',
  'lauren schultz, pa-c': 'Lauren Schultz, PA-C',
  
  'laurie austin': 'Laurie Austin, FNP',
  'laurie austin, fnp': 'Laurie Austin, FNP',
  
  'lesley howell': 'Lesley Howell, FNP',
  'lesley howell, fnp': 'Lesley Howell, FNP',
  
  'leslie ary': 'Leslie Ary, ACNP',
  'leslie ary, fnp': 'Leslie Ary, ACNP',
  'leslie ary, ac, fnp': 'Leslie Ary, ACNP',
  'old leslie ary': 'Leslie Ary, ACNP',
  
  'linda crozier': 'Linda Crozier, FNP',
  'linda crozier, fnp': 'Linda Crozier, FNP',
  'linda n.crozier': 'Linda Crozier, FNP',
  
  'linda peery': 'Linda D. Peery, PA-C',
  'linda d.peery': 'Linda D. Peery, PA-C',
  'linda denise peery': 'Linda D. Peery, PA-C',
  'linda peery, pa-c': 'Linda D. Peery, PA-C',
  
  'linda smiley': 'Linda Smiley, MD',
  'linda smiley, md': 'Linda Smiley, MD',
  
  'lindsey crocker': 'Lindsey Crocker, FNP',
  'lindsay crocker': 'Lindsey Crocker, FNP',
  'lindsey crocker, fnp': 'Lindsey Crocker, FNP',
  
  'lindsey nelson': 'Lindsey Nelson, FNP',
  'lindsey nelson, fnp': 'Lindsey Nelson, FNP',
  'lyndsey nelson': 'Lindsey Nelson, FNP',
  
  'lindsey rayborn': 'Lindsey Rayborn, FNP',
  'lindsey rayborn, fnp': 'Lindsey Rayborn, FNP',
  
  'lisa alexander nwokolo': 'Lisa Alexander Nwokolo, NP',
  'lisa alexander nwokolo, np': 'Lisa Alexander Nwokolo, NP',
  
  'lisa king': 'Lisa King, FNP',
  'lisa d king': 'Lisa King, FNP',
  'lisa king, fnp': 'Lisa King, FNP',
  
  'lisa fletcher': 'Lisa Fletcher, FNP',
  'lisa fletcher, fnp': 'Lisa Fletcher, FNP',
  
  'lisa hubbard': 'Lisa Hubbard, PA-C',
  'lisa hubbard, pa-c': 'Lisa Hubbard, PA-C',
  
  'lisa hunt': 'Lisa Hunt, APN',
  'lisa hunt, apn': 'Lisa Hunt, APN',
  'lisa hunt, aprn': 'Lisa Hunt, APN',
  
  'lisa klyce': 'Lisa Klyce, FNP',
  'lisa klyce, fnp': 'Lisa Klyce, FNP',
  
  'lisa morris': 'Lisa Morris, FNP-BC',
  'lisa morris, fnp': 'Lisa Morris, FNP-BC',
  'lisa morris, fnp-bc': 'Lisa Morris, FNP-BC',
  
  'logan hardin': 'Logan Hardin, DO',
  'logan hardin, do': 'Logan Hardin, DO',
  
  'logan rummells': 'Logan Rummells, FNP',
  'logan rummells, fnp': 'Logan Rummells, FNP',
  'logan rammells': 'Logan Rummells, FNP',
  
  'loren carroll': 'Loren Carroll, MD',
  'loren carroll, md': 'Loren Carroll, MD',
  
  'lori laman': 'Lori F. Laman, APN',
  'lori f.laman': 'Lori F. Laman, APN',
  'lori laman, apn': 'Lori F. Laman, APN',
  'lori laman, aprn': 'Lori F. Laman, APN',
  
  'lynda hughes': 'Lynda Hughes, FNP',
  'lynda hughes, fnp': 'Lynda Hughes, FNP',
  
  // ==================== M ====================
  'madalyn guymon': 'Madalyn Guymon, FNP',
  'madalyn guymon, fnp': 'Madalyn Guymon, FNP',
  
  'madelyn riels': 'Madelyn Riels, DO',
  'madelyn riels, do': 'Madelyn Riels, DO',
  
  'madison lamar': 'Madison Lamar, NP-C',
  'madison lamar, np-c': 'Madison Lamar, NP-C',
  
  'madison martin': 'Madison Martin, PA-C',
  'madison martin, pa-c': 'Madison Martin, PA-C',
  
  'madison northcutt': 'Madison Northcutt, FNP-C',
  'madison northcutt, fnp': 'Madison Northcutt, FNP-C',
  'madison northcutt, fnp-c': 'Madison Northcutt, FNP-C',
  
  'maegen smith': 'Maegen Smith, FNP',
  'maegen smith, fnp': 'Maegen Smith, FNP',
  
  'makiya rinks': 'Makiya Rinks, FNP-C',
  'makiya rinks, fnp-c': 'Makiya Rinks, FNP-C',
  
  'mallory pate': 'Mallory Pate, FNP',
  'mallory pate, fnp': 'Mallory Pate, FNP',
  
  'margaret gore': 'Margaret Gore, MD',
  'margaret gore, md': 'Margaret Gore, MD',
  'dr gore': 'Margaret Gore, MD',
  'gore': 'Margaret Gore, MD',
  
  'marianne fowler': 'Marianne Fowler, FNP',
  'marianne fowler, fnp': 'Marianne Fowler, FNP',
  
  'marion joy scott': 'Marion Joy Scott, FNP',
  'marion joy scott, fnp': 'Marion Joy Scott, FNP',
  
  'mark andrew scott': 'Mark Andrew Scott, MD',
  'mark andrew scott, md': 'Mark Andrew Scott, MD',
  
  'mark vinson': 'Mark Vinson, FNP',
  'mark vinson, fnp': 'Mark Vinson, FNP',
  
  'mary beth shirley': 'Mary Beth Shirley, PA-C',
  'mary shirley': 'Mary Beth Shirley, PA-C',
  'mary beth shirley, pa-c': 'Mary Beth Shirley, PA-C',
  
  'mary jane fullwood': 'Mary Jane Fullwood, MD',
  'mary jane fullwood, md': 'Mary Jane Fullwood, MD',
  
  'mary rhoads': 'Mary Sue Rhoads, NP',
  'mary sue rhoads': 'Mary Sue Rhoads, NP',
  
  'matthew davis': 'Matthew Davis, MD',
  'matthew davis, md': 'Matthew Davis, MD',
  'davis matthew l': 'Matthew Davis, MD',
  
  'matthew king': 'Matthew King, FNP',
  'matthew king, fnp': 'Matthew King, FNP',
  
  'matthew roberts': 'Matthew W. Roberts, FNP-C',
  'matthew w.roberts': 'Matthew W. Roberts, FNP-C',
  'matthew roberts, fnp-c': 'Matthew W. Roberts, FNP-C',
  'matthew roberts fnp c': 'Matthew W. Roberts, FNP-C',
  
  'meagan pigue': 'Meagan Pigue, FNP',
  'meagan pigue, fnp': 'Meagan Pigue, FNP',
  
  'mechelle perry': 'Mechelle Perry, CFNP',
  'mechelle perry, cfnp': 'Mechelle Perry, CFNP',
  'mechelle perry, fnp': 'Mechelle Perry, CFNP',
  
  'mechelle taylor-moragne': 'Mechelle Taylor-Moragne, MD',
  'mechelle taylor-moragne, md': 'Mechelle Taylor-Moragne, MD',
  'mechelle taylor moragne': 'Mechelle Taylor-Moragne, MD',
  'taylor moragne': 'Mechelle Taylor-Moragne, MD',
  
  'megan hickerson': 'Megan Hickerson, FNP',
  'megan hickerson, fnp': 'Megan Hickerson, FNP',
  
  'melanie austin': 'Melanie Austin, FNP',
  'melanie austin, fnp': 'Melanie Austin, FNP',
  
  'melanie reaves': 'Melanie Reaves, FNP',
  'melanie reaves, fnp': 'Melanie Reaves, FNP',
  
  'melinda olds': 'Melinda Olds, DNP',
  'melinda olds, dnp': 'Melinda Olds, DNP',
  
  'melissa baines': 'Melissa Baines, FNP',
  'melissa baines, fnp': 'Melissa Baines, FNP',
  
  'melissa swinea': 'Melissa Swinea, APRN',
  'melissa swinea, aprn': 'Melissa Swinea, APRN',
  'melissa swinea, anp-bc': 'Melissa Swinea, APRN',
  
  'melissa turner': 'Melissa Turner, FNP',
  'melissa turner, fnp': 'Melissa Turner, FNP',
  
  'melissa watkins': 'Melissa Watkins, FNP',
  'melissa watkins, fnp': 'Melissa Watkins, FNP',
  
  'meredith gaitley': 'Meredith Gaitley, APRN',
  'meredith gaitley, aprn': 'Meredith Gaitley, APRN',
  'meredithy gaitley': 'Meredith Gaitley, APRN',
  
  'michael brown': 'Michael Brown, PA-C',
  'michael a brown': 'Michael Brown, PA-C',
  'michael brown, pa-c': 'Michael Brown, PA-C',
  
  'michael chad odle': 'Michael Chad Odle, FNP',
  'michael odle': 'Michael Chad Odle, FNP',
  'chad odle': 'Michael Chad Odle, FNP',
  'michael chad odle, fnp': 'Michael Chad Odle, FNP',
  
  'michael craig': 'Michael Craig, MD',
  'michael craig, md': 'Michael Craig, MD',
  
  'michael hinds': 'Michael Hinds, MD',
  'michael hinds, md': 'Michael Hinds, MD',
  'hinds': 'Michael Hinds, MD',
  
  'michael bryant': 'Michael L. Bryant, MD',
  'michael l.bryant': 'Michael L. Bryant, MD',
  'michael bryant, md': 'Michael L. Bryant, MD',
  'michael l.bryant, md': 'Michael L. Bryant, MD',
  
  'michelle roberts': 'Michelle Roberts, FNP',
  'michelle roberts, fnp': 'Michelle Roberts, FNP',
  
  'michiel rudder': 'Michiel Rudder, FNP',
  'michael rudder': 'Michiel Rudder, FNP',
  'michiel brent rudder': 'Michiel Rudder, FNP',
  'michiel rudder, fnp': 'Michiel Rudder, FNP',
  'brent rudder': 'Michiel Rudder, FNP',
  
  'mikayla owen': 'Mikayla Owen, FNP',
  'mikayla owen, fnp': 'Mikayla Owen, FNP',
  
  'mindy ledford': 'Mindy Ledford, FNP',
  'mindt ledford': 'Mindy Ledford, FNP',
  'minfy ledford': 'Mindy Ledford, FNP',
  'mindy ledforf': 'Mindy Ledford, FNP',
  'mindy ledford, fnp': 'Mindy Ledford, FNP',
  
  'misty barker': 'Misty Barker, FNP',
  'misty barker, fnp': 'Misty Barker, FNP',
  
  'misty hurt': 'Misty Hurt, FNP',
  'misty hurt, fnp': 'Misty Hurt, FNP',
  
  'mohammad yousuf': 'Mohammad Yousuf, MD',
  'mohammad yousuf, md': 'Mohammad Yousuf, MD',
  'mohommad yousuf': 'Mohammad Yousuf, MD',
  'mohammed yousuf': 'Mohammad Yousuf, MD',
  'yousuf': 'Mohammad Yousuf, MD',
  
  'mohsin alhaddad': 'Mohsin Alhaddad, MD',
  'mohsin alhaddad, md': 'Mohsin Alhaddad, MD',
  
  'monica whorton': 'Monica Whorton, FNP',
  'monica whorton, fnp': 'Monica Whorton, FNP',
  
  'monique casey-bolden': 'Monique Casey-Bolden, MD',
  'monique casey-bolden, md': 'Monique Casey-Bolden, MD',
  
  'morgan fields': 'Morgan Fields, FNP',
  'morgan fields, fnp': 'Morgan Fields, FNP',
  
  'morgan simpson': 'Morgan Simpson, FNP',
  'morgan simpson, fnp': 'Morgan Simpson, FNP',
  
  'morgan stone': 'Morgan Stone, FNP',
  'morgan stone, fnp': 'Morgan Stone, FNP',
  
  'morgan young': 'Morgan Young, FNP',
  'morgan young, fnp': 'Morgan Young, FNP',
  
  // ==================== N ====================
  'nicole jackson': 'Nicole Jackson, APRN',
  'nicole jackson, aprn': 'Nicole Jackson, APRN',
  
  'nicole jennings': 'Nicole Jennings, MD',
  'nicole jennings, md': 'Nicole Jennings, MD',
  
  'nicole umstead': 'Nicole Umstead, FNP',
  'nicole umstead, fnp': 'Nicole Umstead, FNP',
  
  'nicole wilson': 'Nicole Wilson, FNP',
  'nicole wilson, fnp': 'Nicole Wilson, FNP',
  
  'nita hastings': 'Nita Hastings, FNP',
  'nita hastings, fnp': 'Nita Hastings, FNP',
  
  // ==================== O ====================
  'oakley jordan': 'Oakley Jordan, MD',
  'oakley jordan, md': 'Oakley Jordan, MD',
  
  // ==================== P ====================
  'patrick andre': 'Patrick Andre, MD',
  'patrick andre, md': 'Patrick Andre, MD',
  'patrick n.andre': 'Patrick Andre, MD',
  
  'patsy crihfield': 'Patsy Crihfield, FNP',
  'patsy crihfield, fnp': 'Patsy Crihfield, FNP',
  
  'patti jones': 'Patti Jones, FNP-C',
  'patti jones, fnp': 'Patti Jones, FNP-C',
  'patti jones, fnp-c': 'Patti Jones, FNP-C',
  
  'paul brinkman': 'Paul Brinkman, PA-C',
  'paul brinkman, pa-c': 'Paul Brinkman, PA-C',
  
  'paul park': 'Paul Park, MD',
  'paul park, md': 'Paul Park, MD',
  
  'paul scates': 'Paul E. Scates, MD',
  'paul scates, md': 'Paul E. Scates, MD',
  'scates paul e, md': 'Paul E. Scates, MD',
  
  'paul smith': 'Paul Smith, MD',
  'paul smith, md': 'Paul Smith, MD',
  
  'paula wilder': 'Paula Wilder, FNP',
  'paula wilder, fnp': 'Paula Wilder, FNP',
  
  'penny creekmore': 'Penny Creekmore, FNP',
  'penny creekmoore': 'Penny Creekmore, FNP',
  'penny creekmore, fnp': 'Penny Creekmore, FNP',
  
  'penny pope': 'Penny Pope, FNP-C',
  'penny pope, fnp': 'Penny Pope, FNP-C',
  'penny pope, fnp-c': 'Penny Pope, FNP-C',
  
  'peter carter': 'Peter Carter, MD',
  'peter carter, md': 'Peter Carter, MD',
  
  // ==================== R ====================
  'r scott miskelly': 'R. Scott Miskelly, FNP',
  'r.scott miskelly': 'R. Scott Miskelly, FNP',
  'r scott miskelly, fnp': 'R. Scott Miskelly, FNP',
  'randle scott miskelly': 'R. Scott Miskelly, FNP',
  'randle scott miskelly, fnp': 'R. Scott Miskelly, FNP',
  'randle miskelly': 'R. Scott Miskelly, FNP',
  'scott miskelly': 'R. Scott Miskelly, FNP',
  
  'rachel davis': 'Rachel Davis, FNP',
  'rachal davis': 'Rachel Davis, FNP',
  'rachel davis, fnp': 'Rachel Davis, FNP',
  
  'rachel matthews': 'Rachel Matthews, FNP-BC',
  'rachel matthews, fnp': 'Rachel Matthews, FNP-BC',
  'rachel matthews, fnp-bc': 'Rachel Matthews, FNP-BC',
  
  'rachel nelson': 'Rachel Nelson, DO',
  'rachel nelson, do': 'Rachel Nelson, DO',
  
  'rachel taylor': 'Rachel Taylor, FNP',
  'rachel taylor, fnp': 'Rachel Taylor, FNP',
  'rachel mccollum taylor': 'Rachel Taylor, FNP',
  
  'rachel tosh': 'Rachel Tosh, FNP',
  'rachel tosh, fnp': 'Rachel Tosh, FNP',
  
  'rachelle hale': 'Rachelle Hale, FNP',
  'rachelle hale, fnp': 'Rachelle Hale, FNP',
  
  'randall williams': 'Randall Williams, PA-C',
  'randall williams, pa-c': 'Randall Williams, PA-C',
  
  'rauf baba': 'Rauf Baba, MD',
  'rauf baba, md': 'Rauf Baba, MD',
  'dr baba': 'Rauf Baba, MD',
  'dr babas': 'Rauf Baba, MD',
  
  'ravinder machra': 'Ravinder MacHra, MD',
  'ravinder machra, md': 'Ravinder MacHra, MD',
  'r machra': 'Ravinder MacHra, MD',
  'machara': 'Ravinder MacHra, MD',
  'dr. machra': 'Ravinder MacHra, MD',
  
  'ray wakefield': 'Ray Wakefield, FNP',
  'ray wakefield, fnp': 'Ray Wakefield, FNP',
  'derek wakefield': 'Ray Wakefield, FNP',
  
  'rebecca johnson': 'Rebecca Johnson, CNM',
  'rebecca johnson, cnm': 'Rebecca Johnson, CNM',
  
  'rebecca jones': 'Rebecca Jones, FNP',
  'rebecca jones, fnp': 'Rebecca Jones, FNP',
  
  'rebecca woods': 'Rebecca Woods, FNP',
  'rebecca woods, fnp': 'Rebecca Woods, FNP',
  
  'rhonda hunt': 'Rhonda Hunt, FNP',
  'rhonda hunt, fnp': 'Rhonda Hunt, FNP',
  
  'rima zahr': 'Rima Zahr, DO',
  'rima zahr, do': 'Rima Zahr, DO',
  
  'rita koon': 'Rita Koon, FNP',
  'rita koon, fnp': 'Rita Koon, FNP',
  
  'robert callery': 'Robert Callery, FNP',
  'robert callery, fnp': 'Robert Callery, FNP',
  
  'robert day': 'Robert Day, MD',
  'robert day, md': 'Robert Day, MD',
  
  'robert scott parker ii': 'Robert Scott Parker II, MD',
  'robert scott parker ii, md': 'Robert Scott Parker II, MD',
  'robert parker': 'Robert Scott Parker II, MD',
  
  'rosemary jacobs': 'Rosemary Jacobs, APRN',
  'rosemary jacobs, aprn': 'Rosemary Jacobs, APRN',
  
  'roslin carlson': 'Roslin Carlson, FNP',
  'roslin carlson, fnp': 'Roslin Carlson, FNP',
  
  'ruby turner': 'Ruby Turner, FNP',
  'ruby turner, fnp': 'Ruby Turner, FNP',
  
  'rylee smith': 'Rylee Smith, PA-C',
  'rylee smith, pa-c': 'Rylee Smith, PA-C',
  
  // ==================== S ====================
  'salman saeed': 'Salman Saeed, MD',
  'salman saeed, md': 'Salman Saeed, MD',
  
  'samantha french': 'Samantha French, FNP',
  'samantha french, fnp': 'Samantha French, FNP',
  'samantha french, anp': 'Samantha French, FNP',
  
  'samantha ivy': 'Samantha Ivy, FNP',
  'samantha ivy, fnp': 'Samantha Ivy, FNP',
  
  'samuel bradberry': 'Samuel Bradberry, MD',
  'samuel bradberry, md': 'Samuel Bradberry, MD',
  
  'samuel t johnson jr': 'Samuel T. Johnson Jr., MD',
  'samuel t johnson jr., md': 'Samuel T. Johnson Jr., MD',
  'samuel johnson jr., md': 'Samuel T. Johnson Jr., MD',
  
  'sandra dennis': 'Sandra Dennis, FNP',
  'sandra dennis, fnp': 'Sandra Dennis, FNP',
  
  'sandra mcneill': 'Sandra McNeill, FNP',
  'sandra mcneill, fnp': 'Sandra McNeill, FNP',
  'sandra elder mcneill': 'Sandra McNeill, FNP',
  
  'sandra tharpe': 'Sandra Tharpe, FNP',
  'sandra tharpe, fnp': 'Sandra Tharpe, FNP',
  'sandra tharpe-fnp': 'Sandra Tharpe, FNP',
  'sandra trharpe': 'Sandra Tharpe, FNP',
  
  'sara palomino': 'Sara Palomino, FNP',
  'sara palomino, fnp': 'Sara Palomino, FNP',
  'sara palominio': 'Sara Palomino, FNP',
  
  'sara ward': 'Sara Ward, FNP',
  'sara ward, fnp': 'Sara Ward, FNP',
  
  'sarah benson': 'Sarah Benson, FNP',
  'sarah benson, fnp': 'Sarah Benson, FNP',
  
  'sarah bridges': 'Sarah Bridges, FNP',
  'sara bridges': 'Sarah Bridges, FNP',
  'sarah bridges, fnp': 'Sarah Bridges, FNP',
  
  'sarah crawford': 'Sarah Crawford, FNP',
  'sarah crawford, fnp': 'Sarah Crawford, FNP',
  
  'sarah huffstetler': 'Sarah E. Huffstetler, APRN',
  'sarah e huffstetler': 'Sarah E. Huffstetler, APRN',
  'sarah e. huffstetler': 'Sarah E. Huffstetler, APRN',
  'sarah huffstetler, aprn': 'Sarah E. Huffstetler, APRN',
  'sarah huffsteler': 'Sarah E. Huffstetler, APRN',
  
  'scott norris': 'Scott Norris, FNP',
  'scott norris, fnp': 'Scott Norris, FNP',
  'scot norris': 'Scott Norris, FNP',
  
  'scott sadler': 'Scott Sadler, MD',
  'scott sadler, md': 'Scott Sadler, MD',
  
  'shanea hines': 'Shanea Hines, DNP',
  'shanea hines, dnp': 'Shanea Hines, DNP',
  'shanea hines, fnp': 'Shanea Hines, DNP',
  'shanea hines, cfnp': 'Shanea Hines, DNP',
  
  'shannon atchison': 'Shannon Atchison, FNP',
  'shannon atchison, fnp': 'Shannon Atchison, FNP',
  
  'shant garabedian': 'Shant Garabedian, DO',
  'shant garabedian, do': 'Shant Garabedian, DO',
  'shant garabedian d. o': 'Shant Garabedian, DO',
  
  'sharon white': 'Sharon White, FNP',
  'sharon white, fnp': 'Sharon White, FNP',
  
  'sheila carlton': 'Sheila Carlton, FNP',
  'sheila carlton, fnp': 'Sheila Carlton, FNP',
  
  'sheila underwood': 'Sheila Underwood, FNP',
  'sheila underwood, fnp': 'Sheila Underwood, FNP',
  
  'shelle flora': 'Shelle Flora, FNP',
  'shelle flora, fnp': 'Shelle Flora, FNP',
  
  'shellie hendren': 'Shellie Hendren, APRN',
  'shellie hendren, aprn': 'Shellie Hendren, APRN',
  'shennlie hendren': 'Shellie Hendren, APRN',
  
  'sherry moore': 'Sherry Moore, FNP',
  'sherry moore, fnp': 'Sherry Moore, FNP',
  
  'sherry page': 'Sherry Page, DNP',
  'sherry page dnp cpnp pmhs': 'Sherry Page, DNP',
  
  'sherry whitby': 'Sherry Whitby, APRN',
  'sherry whitby, aprn': 'Sherry Whitby, APRN',
  'whitby sherry': 'Sherry Whitby, APRN',
  'whitby sherry, np': 'Sherry Whitby, APRN',
  
  'sierra clary': 'Sierra Clary, FNP',
  'seirra clary': 'Sierra Clary, FNP',
  'sierra clary, fnp': 'Sierra Clary, FNP',
  
  'somer lambert': 'Somer Lambert, FNP',
  'somer lambert, fnp': 'Somer Lambert, FNP',
  
  'stacey bennett': 'Stacey Bennett, FNP',
  'stacey bennett, fnp': 'Stacey Bennett, FNP',
  
  'staci cownover': 'Staci Cownover, PA-C',
  'staci cownover, pa': 'Staci Cownover, PA-C',
  'staci cownover, pa-c': 'Staci Cownover, PA-C',
  
  'stacye hopper': 'Stacye Hopper, FNP',
  'stacye hopper, fnp': 'Stacye Hopper, FNP',
  
  'stephanie boling': 'Stephanie Boling, FNP-C',
  'stephanie boling, fnp': 'Stephanie Boling, FNP-C',
  'stephanie boling, fnp-c': 'Stephanie Boling, FNP-C',
  
  'stephanie coleman': 'Stephanie Coleman, FNP',
  'stephanie coleman, fnp': 'Stephanie Coleman, FNP',
  
  'stephanie little': 'Stephanie Little, PA-C',
  'stephanie little, pa-c': 'Stephanie Little, PA-C',
  
  'stephanie sells': 'Stephanie Sells, FNP',
  'stephanie sells, fnp': 'Stephanie Sells, FNP',
  
  'stephanie southall': 'Stephanie Southall, FNP-C',
  'stephanie southall, fnp-c': 'Stephanie Southall, FNP-C',
  
  'summer alexander': 'Summer Alexander, FNP',
  'summer alexander, fnp': 'Summer Alexander, FNP',
  
  'susan lowry': 'Susan Lowry, MD',
  'susan lowry, md': 'Susan Lowry, MD',
  
  'suzanne morris': 'Suzanne Morris, FNP-C',
  'suzanne morris, fnp': 'Suzanne Morris, FNP-C',
  'suzanne morris, fnp-c': 'Suzanne Morris, FNP-C',
  
  'suzette stanley': 'Suzette Stanley, APN',
  'suszette stanley': 'Suzette Stanley, APN',
  'suzette stanley, apn': 'Suzette Stanley, APN',
  'suzette stsnley': 'Suzette Stanley, APN',
  
  'syble carter': 'Syble Carter, FNP',
  'syble carter, fnp': 'Syble Carter, FNP',
  'cyble carter': 'Syble Carter, FNP',
  
  'syed zaidi': 'Syed Zaidi, MD',
  'syed zaidi, md': 'Syed Zaidi, MD',
  'zaidi': 'Syed Zaidi, MD',
  'dr zaidi & associates': 'Dr. Zaidi and Associates',
  'dr. zaidi and associates': 'Dr. Zaidi and Associates',
  
  // ==================== T ====================
  'tabitha woodard': 'Tabitha Woodard, FNP-C',
  'tabitha woodard, fnp-c': 'Tabitha Woodard, FNP-C',
  'tabitha woodward': 'Tabitha Woodard, FNP-C',
  
  'tammi ferguson': 'Tammi Ferguson, FNP',
  'tammi ferguson, fnp': 'Tammi Ferguson, FNP',
  
  'tammy holcomb': 'Tammy Holcomb, FNP',
  'tammy holcomb, fnp': 'Tammy Holcomb, FNP',
  
  'tanveer aslam': 'Tanveer Aslam, MD',
  'tanveer aslam, md': 'Tanveer Aslam, MD',
  'aslam': 'Tanveer Aslam, MD',
  
  'tanya arnold': 'Tanya L. Arnold, FNP',
  'tanya l arnold': 'Tanya L. Arnold, FNP',
  'tanya lynn arnold': 'Tanya L. Arnold, FNP',
  'tanya arnold, fnp': 'Tanya L. Arnold, FNP',
  'tonya arnold': 'Tanya L. Arnold, FNP',
  
  'tanya jackson': 'Tanya Lynn Jackson, FNP',
  'tanya lynn jackson': 'Tanya Lynn Jackson, FNP',
  
  'tara hendrix': 'Tara Hendrix, FNP',
  'tara hendrix, fnp': 'Tara Hendrix, FNP',
  
  'taran coleman': 'Taran Coleman, FNP',
  'taran coleman, fnp': 'Taran Coleman, FNP',
  
  'tayler johnston': 'Tayler Johnston, APRN',
  'tayler johnston, aprn': 'Tayler Johnston, APRN',
  
  'taylor smith': 'Taylor Smith, PA-C',
  'taylor smith, pa': 'Taylor Smith, PA-C',
  'taylor smith, pa-c': 'Taylor Smith, PA-C',
  
  'teresa cox': 'Teresa Cox, FNP',
  'teresa cox, fnp': 'Teresa Cox, FNP',
  'teresa cox n. p': 'Teresa Cox, FNP',
  
  'terra micah king': 'Terra Micah King, FNP',
  'terra micah king-fnp': 'Terra Micah King, FNP',
  
  'terry colotta': 'Terry Colotta, MD',
  'terry colotta, md': 'Terry Colotta, MD',
  
  'terry howell': 'Terry Howell, FNP',
  'terry howel': 'Terry Howell, FNP',
  'terry howell, fnp': 'Terry Howell, FNP',
  
  'tiffani white': 'Tiffani White, FNP',
  'tiffani white, fnp': 'Tiffani White, FNP',
  
  'tiffany gray': 'Tiffany Gray, FNP',
  'tiffany gray, fnp': 'Tiffany Gray, FNP',
  
  'tiffany simpson': 'Tiffany Simpson, FNP',
  'tiffany simpson, fnp': 'Tiffany Simpson, FNP',
  
  'timothy mcpherson': 'Timothy McPherson, DO',
  'timothy mcpherson, do': 'Timothy McPherson, DO',
  'timothy mcpherson d. o': 'Timothy McPherson, DO',
  
  'toby hampton': 'Toby Hampton, MD',
  'toby hampton, md': 'Toby Hampton, MD',
  
  'tommy miller, iii': 'Tommy Miller III, MD',
  
  'toni reed': 'Toni Reed, APRN',
  'toni reed, aprn': 'Toni Reed, APRN',
  
  'tonya creasy': 'Tonya Creasy, FNP',
  'tonya creasy.': 'Tonya Creasy, FNP',
  'tonya creasy, fnp': 'Tonya Creasy, FNP',
  
  'tracey kizer': 'Tracey Kizer, FNP',
  'traxcey kizer': 'Tracey Kizer, FNP',
  'tracy kiezer': 'Tracey Kizer, FNP',
  'tracey kizer, fnp': 'Tracey Kizer, FNP',
  
  'traci hill': 'Traci Hill, FNP',
  'traci hill, fnp': 'Traci Hill, FNP',
  
  'tracy little': 'Tracy Little, ANP-BC',
  'tracy little, anp-bc': 'Tracy Little, ANP-BC',
  
  'trent theriac': 'Trent Theriac, FNP',
  'thrent theriac': 'Trent Theriac, FNP',
  'trent theriac, fnp': 'Trent Theriac, FNP',
  
  'tri m. nguyen': 'Tri M. Nguyen, MD',
  'tri m nguyen': 'Tri M. Nguyen, MD',
  'tri m. nguyen, md': 'Tri M. Nguyen, MD',
  
  'tyler sherwood': 'Tyler Sherwood, PA-C',
  'tyler sherwood, pa-c': 'Tyler Sherwood, PA-C',
  
  'tyler stanfield': 'Tyler Stanfield, PA-C',
  'tyler stanfield, pa-c': 'Tyler Stanfield, PA-C',
  
  // ==================== V ====================
  'verneda herring': 'Verneda Herring, FNP-BC',
  'verenda herring': 'Verneda Herring, FNP-BC',
  'verneda herring, fnp': 'Verneda Herring, FNP-BC',
  'verneda herring, fnp-bc': 'Verneda Herring, FNP-BC',
  
  'vincent fry': 'Vincent Fry, MD',
  
  'virginia peebles': 'Virginia Peebles, FNP',
  'virginia peebles, fnp': 'Virginia Peebles, FNP',
  
  'virginia smith': 'Virginia C. Smith, FNP',
  'virginia c smith': 'Virginia C. Smith, FNP',
  'virginia c smith, fnp': 'Virginia C. Smith, FNP',
  
  'vivian stokes': 'Vivian Stokes, FNP-C',
  'vivian stokes, fnp-c': 'Vivian Stokes, FNP-C',
  
  // ==================== W ====================
  'walter rayford': 'Walter Rayford, MD',
  
  'wanda graupman': 'Wanda Graupman, FNP',
  'graupman eanda': 'Wanda Graupman, FNP',
  'wanda graupman, fnp': 'Wanda Graupman, FNP',
  
  'whitney millican': 'Whitney Millican, FNP-BC',
  'whitney millican, fnp': 'Whitney Millican, FNP-BC',
  'whitney millican, fnp-bc': 'Whitney Millican, FNP-BC',
  
  'whitney moore': 'Whitney Moore, FNP',
  'whitney moore, fnp': 'Whitney Moore, FNP',
  
  'whitney wright': 'Whitney Wright, FNP',
  'whitney wright, fnp': 'Whitney Wright, FNP',
  
  'whitney young': 'Whitney Young, FNP',
  'whitney young, fnp': 'Whitney Young, FNP',
  
  'will merrick': 'William Merrick, MD',
  'william merrick': 'William Merrick, MD',
  
  'william a eason': 'William A. Eason, MD',
  'william andrew eason': 'William A. Eason, MD',
  'william andrew eason, md': 'William A. Eason, MD',
  'william eason': 'William A. Eason, MD',
  
  'william caicedo': 'William Caicedo, FNP-C',
  'william caicedo, fnp-c': 'William Caicedo, FNP-C',
  'william calcedo': 'William Caicedo, FNP-C',
  
  'william carney': 'William Carney, MD',
  'william carney, md': 'William Carney, MD',
  'william carney m. d': 'William Carney, MD',
  
  'william gower': 'William Gower, FNP',
  'william gower, fnp': 'William Gower, FNP',
  
  'william d white': 'William D. White, FNP',
  'william white': 'William D. White, FNP',
  'william white, fnp': 'William D. White, FNP',
  
  'william mckee': 'William N. McKee, MD',
  'william n. mckee': 'William N. McKee, MD',
  'william mckee, md': 'William N. McKee, MD',
  'neil mckee': 'William N. McKee, MD',
  'mckee': 'William N. McKee, MD',
  'dr mckee': 'William N. McKee, MD',
  
  'william mcmahon': 'William McMahon, MD',
  
  'william shaw': 'William Shaw, FNP',
  'william shaw, fnp': 'William Shaw, FNP',
  
  'william stone': 'William K. Stone, MD',
  'william k stone': 'William K. Stone, MD',
  'william k.stone': 'William K. Stone, MD',
  'william stone, md': 'William K. Stone, MD',
  
  'william turner': 'William Turner, MD',
  'william turner, md': 'William Turner, MD',
  'w. turner': 'William Turner, MD',
  'will turner': 'William Turner, MD',
  
  // ==================== Y ====================
  'yaohui chai': 'Yaohui Chai, MD',
  'yaohui chai, md': 'Yaohui Chai, MD',
  
  'yamini menon': 'Yamini Menon, MD',
  'yamini menon, md': 'Yamini Menon, MD',
  
  // ==================== Z ====================
  'zaher al-shallah': 'Zaher Al-Shallah, MD',
  'zaher al- shallah': 'Zaher Al-Shallah, MD',
  
  // ==================== SPECIAL CATEGORIES ====================
  
  // Self Referrals
  'self referral': 'Self Referral',
  'self-referral': 'Self Referral',
  'self': 'Self Referral',
  'patient referral': 'Self Referral',
  'patient': 'Self Referral',
  'patient self referred': 'Self Referral',
  'family referral': 'Family Referral',
  'myself': 'Self Referral',
  'walk in': 'Self Referral',
  'online': 'Self Referral',
  
  // VA / Government
  'va': 'VA Medical Center',
  'va referral': 'VA Medical Center',
  'veterans administration': 'VA Medical Center',
  'veterans administration referral': 'VA Medical Center',
  'veterans administration referred': 'VA Medical Center',
  'veterans administration medical center': 'VA Medical Center',
  'va medical center': 'VA Medical Center',
  'memphis va': 'Memphis VA Medical Center',
  'memphis veterans administration medical center': 'Memphis VA Medical Center',
  'marion va': 'Marion VA Medical Center',
  'marion veterans administration': 'Marion VA Medical Center',
  'marion veterans administration medical center': 'Marion VA Medical Center',
  'marion veterans administration medical clinic': 'Marion VA Medical Center',
  'nashville veterans administration medical clinic': 'Nashville VA Medical Center',
  'poplar bluff va': 'Poplar Bluff VA Medical Center',
  'poplar bluff veterans administration medical center': 'Poplar Bluff VA Medical Center',
  'john j pershing veterans administration medical center': 'John J. Pershing VA Medical Center',
  
  // Unknown/System
  'unknown provider': 'Unknown Provider',
  'unknown': 'Unknown Provider',
  'no provider': 'Unknown Provider',
  'provider change': 'Provider Change',
  'sent through fax que': 'Sent Through Fax Queue',
  'in chart': 'In Chart',
  
  // Facilities
  'diabetes center of jackson': 'Diabetes Center of Jackson',
  'lebonheur': 'LeBonheur',
  'westtennesseehealthcare': 'West Tennessee Healthcare',
  'selmer wth': 'West Tennessee Healthcare - Selmer',
  'prime care selmer': 'West Tennessee Healthcare - Selmer'
};

// ============================================
// ALIASES FOR BACKWARD COMPATIBILITY
// These allow existing code to work during transition
// ============================================
const PROVIDER_STANDARDIZATION = PROVIDERS;

// Export for use in other modules (Google Apps Script compatible)
// In GAS, all top-level variables are automatically available across files
