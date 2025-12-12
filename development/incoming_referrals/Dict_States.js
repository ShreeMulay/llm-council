/**
 * State Name Dictionary
 * =====================
 * Master dictionary for normalizing US state names
 * Extracted from StateNormalization.js for centralized management
 * 
 * Last Updated: 2025-11-29
 * 
 * USAGE:
 * - Keys are LOWERCASE for case-insensitive matching
 * - Values are the canonical (standardized) state name
 */

// ============================================
// STATE CONFIGURATION
// ============================================
const STATE_CONFIG = {
  COLUMN: {
    INDEX: 22,  // Column V - State
    LETTER: 'V'
  },
  FORMATTING: {
    CORRECTED_COLOR: '#E6F3FF',     // Light blue for corrected entries
    INVALID_COLOR: '#FFE6E6',       // Light red for invalid entries
    OUT_OF_REGION_COLOR: '#FFF3CD', // Light yellow for out-of-region states
    DEFAULT_COLOR: '#FFFFFF'         // White for unchanged
  },
  DEFAULT_STATE: 'Tennessee',        // Default state for most entries
  PRIMARY_REGION_STATES: [           // Expected states for the region
    'Tennessee', 'Missouri', 'Kentucky', 'Arkansas', 'Mississippi', 
    'Alabama', 'Illinois', 'Georgia'
  ]
};

// ============================================
// STATE ABBREVIATIONS
// Comprehensive two-letter abbreviation mapping
// ============================================
const STATE_ABBREVIATIONS = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

// ============================================
// MASTER STATE DICTIONARY
// Includes variations, typos, and alternative formats
// ============================================
const STATES = {
  // Tennessee variations (most common)
  'tennessee': 'Tennessee',
  'tenessee': 'Tennessee',
  'tennesse': 'Tennessee',
  'tennssee': 'Tennessee',
  'tenneessee': 'Tennessee',
  'tenneesse': 'Tennessee',
  'tn': 'Tennessee',
  't': 'Tennessee',  // Single T likely means Tennessee
  'tenn': 'Tennessee',
  'ten': 'Tennessee',
  'th': 'Tennessee',     // Likely typo for TN
  
  // Missouri variations
  'missouri': 'Missouri',
  'mo': 'Missouri',
  'mo.': 'Missouri',
  
  // Kentucky variations
  'kentucky': 'Kentucky',
  'ky': 'Kentucky',
  
  // Arkansas variations
  'arkansas': 'Arkansas',
  'arkansa': 'Arkansas',
  'ar': 'Arkansas',
  
  // Mississippi variations
  'mississippi': 'Mississippi',
  'ms': 'Mississippi',
  
  // Alabama variations
  'alabama': 'Alabama',
  'al': 'Alabama',
  
  // Illinois variations
  'illinois': 'Illinois',
  'il': 'Illinois',
  
  // Indiana variations
  'indiana': 'Indiana',
  'in': 'Indiana',
  
  // Georgia variations
  'georgia': 'Georgia',
  'ga': 'Georgia',
  
  // Florida variations
  'florida': 'Florida',
  'fl': 'Florida',
  
  // Texas variations
  'texas': 'Texas',
  'tx': 'Texas',
  
  // Virginia variations
  'virginia': 'Virginia',
  'va': 'Virginia',
  
  // Wisconsin variations
  'wisconsin': 'Wisconsin',
  'wi': 'Wisconsin',
  
  // Colorado variations
  'colorado': 'Colorado',
  'co': 'Colorado',
  
  // Ohio variations
  'ohio': 'Ohio',
  'oh': 'Ohio',
  
  // North Carolina variations
  'north carolina': 'North Carolina',
  'nc': 'North Carolina',
  
  // South Carolina variations
  'south carolina': 'South Carolina',
  'sc': 'South Carolina',
  
  // Louisiana variations
  'louisiana': 'Louisiana',
  'la': 'Louisiana',
  
  // California variations
  'california': 'California',
  'ca': 'California',
  
  // New York variations
  'new york': 'New York',
  'ny': 'New York',
  
  // Pennsylvania variations
  'pennsylvania': 'Pennsylvania',
  'pa': 'Pennsylvania',
  
  // Michigan variations
  'michigan': 'Michigan',
  'mi': 'Michigan',
  
  // Minnesota variations
  'minnesota': 'Minnesota',
  'mn': 'Minnesota',
  
  // Iowa variations
  'iowa': 'Iowa',
  'ia': 'Iowa',
  
  // Kansas variations
  'kansas': 'Kansas',
  'ks': 'Kansas',
  
  // Oklahoma variations
  'oklahoma': 'Oklahoma',
  'ok': 'Oklahoma',
  
  // Utah variations
  'utah': 'Utah',
  'ut': 'Utah',
  
  // Arizona variations
  'arizona': 'Arizona',
  'az': 'Arizona',
  
  // Nevada variations
  'nevada': 'Nevada',
  'nv': 'Nevada',
  
  // Oregon variations
  'oregon': 'Oregon',
  'or': 'Oregon',
  
  // Washington variations
  'washington': 'Washington',
  'wa': 'Washington',
  
  // West Virginia variations
  'west virginia': 'West Virginia',
  'wv': 'West Virginia',
  
  // Maryland variations
  'maryland': 'Maryland',
  'md': 'Maryland',
  
  // New Jersey variations
  'new jersey': 'New Jersey',
  'nj': 'New Jersey',
  
  // Connecticut variations
  'connecticut': 'Connecticut',
  'ct': 'Connecticut',
  
  // Massachusetts variations
  'massachusetts': 'Massachusetts',
  'ma': 'Massachusetts',
  
  // Maine variations
  'maine': 'Maine',
  'me': 'Maine',
  
  // New Hampshire variations
  'new hampshire': 'New Hampshire',
  'nh': 'New Hampshire',
  
  // Vermont variations
  'vermont': 'Vermont',
  'vt': 'Vermont',
  
  // Rhode Island variations
  'rhode island': 'Rhode Island',
  'ri': 'Rhode Island',
  
  // Delaware variations
  'delaware': 'Delaware',
  'de': 'Delaware',
  
  // District of Columbia variations
  'district of columbia': 'District of Columbia',
  'dc': 'District of Columbia',
  'd.c.': 'District of Columbia',
  'washington dc': 'District of Columbia',
  'washington d.c.': 'District of Columbia',
  
  // Montana variations
  'montana': 'Montana',
  'mt': 'Montana',
  
  // Idaho variations
  'idaho': 'Idaho',
  'id': 'Idaho',
  
  // Wyoming variations
  'wyoming': 'Wyoming',
  'wy': 'Wyoming',
  
  // North Dakota variations
  'north dakota': 'North Dakota',
  'nd': 'North Dakota',
  
  // South Dakota variations
  'south dakota': 'South Dakota',
  'sd': 'South Dakota',
  
  // Nebraska variations
  'nebraska': 'Nebraska',
  'ne': 'Nebraska',
  
  // Alaska variations
  'alaska': 'Alaska',
  'ak': 'Alaska',
  
  // Hawaii variations
  'hawaii': 'Hawaii',
  'hi': 'Hawaii',
  
  // New Mexico variations
  'new mexico': 'New Mexico',
  'nm': 'New Mexico',
  
  // Special cases
  'atoka': 'Tennessee'  // Atoka is likely referring to a Tennessee location
};

// ============================================
// ALIASES FOR BACKWARD COMPATIBILITY
// ============================================
const STATE_VARIATIONS = STATES;

// Export for use in other modules (Google Apps Script compatible)
// In GAS, all top-level variables are automatically available across files
