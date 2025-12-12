/**
 * City Normalization Module
 * @module CityNormalization
 * @description Handles standardization, validation, and normalization of city names
 * @author Medical Referral System
 * @version 1.0
 */

/**
 * Configuration for city normalization
 */
const CITY_CONFIG = {
  COLUMN: {
    INDEX: 21,  // Column U - City (21st column, 1-based indexing)
    LETTER: 'U'
  },
  FORMATTING: {
    CORRECTED_COLOR: '#E6F3FF',     // Light blue for corrected entries
    INVALID_COLOR: '#FFE6E6',       // Light red for invalid entries
    MISSPELLED_COLOR: '#FFF3CD',    // Light yellow for corrected misspellings
    DEFAULT_COLOR: '#FFFFFF'         // White for unchanged
  },
  VALIDATION: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REQUIRE_LETTERS: true
  }
};

/**
 * Common city misspellings and corrections
 * Maps misspelled variations to correct city names
 */
const CITY_CORRECTIONS = {
  // Dyersburg variations
  'dyersburg': 'Dyersburg',
  'dyers': 'Dyersburg',
  'dyerburg': 'Dyersburg',
  'dyersbrug': 'Dyersburg',
  'dyersbur': 'Dyersburg',
  'dyerbsurg': 'Dyersburg',
  'dyresburg': 'Dyersburg',
  'dyrsburg': 'Dyersburg',
  
  // Brownsville variations
  'brownsville': 'Brownsville',
  'brownssville': 'Brownsville',
  'brownsviille': 'Brownsville',
  'brownsvile': 'Brownsville',
  'brownsvillw': 'Brownsville',
  'brownsvill': 'Brownsville',
  'brwonsville': 'Brownsville',
  
  // Jackson variations
  'jackson': 'Jackson',
  'jacksno': 'Jackson',
  'jcakson': 'Jackson',
  'jackon': 'Jackson',
  'jakson': 'Jackson',
  'jacksont': 'Jackson',
  
  // Union City variations
  'union city': 'Union City',
  'unioncity': 'Union City',
  'union  city': 'Union City',
  'uc': 'Union City',
  
  // Martin variations
  'martin': 'Martin',
  'matin': 'Martin',
  'martinb': 'Martin',
  
  // Ripley variations
  'ripley': 'Ripley',
  'riplay': 'Ripley',
  'riplry': 'Ripley',
  'riplwy': 'Ripley',
  'riply': 'Ripley',
  'rpley': 'Ripley',
  'rupley': 'Ripley',
  'ripely': 'Ripley',
  
  // Humboldt variations
  'humboldt': 'Humboldt',
  'humbold': 'Humboldt',
  'humbolt': 'Humboldt',
  'humolbdt': 'Humboldt',
  
  // Henderson variations
  'henderson': 'Henderson',
  'hednerson': 'Henderson',
  'hendeson': 'Henderson',
  
  // Covington variations
  'covington': 'Covington',
  'coviington': 'Covington',
  'covinton': 'Covington',
  'convington': 'Covington',
  
  // McKenzie variations
  'mckenzie': 'McKenzie',
  'mc kenzie': 'McKenzie',
  'mackenzie': 'McKenzie',
  'mckinzie': 'McKenzie',
  
  // Bolivar variations
  'bolivar': 'Bolivar',
  'boliver': 'Bolivar',
  'bollivar': 'Bolivar',
  
  // South Fulton variations
  'south fulton': 'South Fulton',
  'so fulton': 'South Fulton',
  's fulton': 'South Fulton',
  'southfulton': 'South Fulton',
  
  // Halls variations
  'halls': 'Halls',
  'halsl': 'Halls',
  'hals': 'Halls',
  
  // Tiptonville variations
  'tiptonville': 'Tiptonville',
  'tiptonvile': 'Tiptonville',
  'tiptovnille': 'Tiptonville',
  'tiptonvillie': 'Tiptonville',
  
  // Camden variations
  'camden': 'Camden',
  'canden': 'Camden',
  
  // Paris variations
  'paris': 'Paris',
  'pars': 'Paris',
  
  // Selmer variations
  'selmer': 'Selmer',
  'saelmer': 'Selmer',
  'slemer': 'Selmer',
  
  // Milan variations
  'milan': 'Milan',
  'mialn': 'Milan',
  'miln': 'Milan',
  
  // Trenton variations
  'trenton': 'Trenton',
  'tenton': 'Trenton',
  'enton': 'Trenton',
  
  // Dresden variations
  'dresden': 'Dresden',
  'dresdsen': 'Dresden',
  'dreseden': 'Dresden',
  
  // Newbern variations
  'newbern': 'Newbern',
  'newber': 'Newbern',
  'newbernt': 'Newbern',
  'newborn': 'Newbern',
  'nebern': 'Newbern',
  
  // Caruthersville variations
  'caruthersville': 'Caruthersville',
  'carutherville': 'Caruthersville',
  'caurthersville': 'Caruthersville',
  'cautherville': 'Caruthersville',
  
  // Kenton variations
  'kenton': 'Kenton',
  'kinton': 'Kenton',
  
  // Lexington variations
  'lexington': 'Lexington',
  'lexinton': 'Lexington',
  'lexingtion': 'Lexington',
  'lexxington': 'Lexington',
  
  // Brighton variations
  'brighton': 'Brighton',
  'briton': 'Brighton',
  
  // Troy variations
  'troy': 'Troy',
  'tory': 'Troy',
  
  // Gates variations
  'gates': 'Gates',
  'getes': 'Gates',
  
  // Friendship variations
  'friendship': 'Friendship',
  'freindship': 'Friendship',
  'frienship': 'Friendship',
  
  // Greenfield variations
  'greenfield': 'Greenfield',
  'greenfeild': 'Greenfield',
  'grenfield': 'Greenfield',
  
  // Atoka variations
  'atoka': 'Atoka',
  'atoke': 'Atoka',
  
  // Bethel Springs variations
  'bethel springs': 'Bethel Springs',
  'bethel spring': 'Bethel Springs',
  'bethel spgs': 'Bethel Springs',
  'bethel sorings': 'Bethel Springs',
  
  // Hollow Rock variations
  'hollow rock': 'Hollow Rock',
  'hollowrock': 'Hollow Rock',
  'holow rock': 'Hollow Rock',
  
  // Cedar Grove variations
  'cedar grove': 'Cedar Grove',
  'cedargrove': 'Cedar Grove',
  
  // Beech Bluff variations
  'beech bluff': 'Beech Bluff',
  'beach bluff': 'Beech Bluff',
  'beechbluff': 'Beech Bluff',
  
  // Adamsville variations
  'adamsville': 'Adamsville',
  'adamaville': 'Adamsville',
  'adamsvillet': 'Adamsville',
  
  // Huntingdon variations
  'huntingdon': 'Huntingdon',
  'huntington': 'Huntingdon',
  'huntingden': 'Huntingdon',
  
  // Parsons variations
  'parsons': 'Parsons',
  'parson': 'Parsons',
  
  // Savannah variations
  'savannah': 'Savannah',
  'savanah': 'Savannah',
  
  // Stantonville variations
  'stantonville': 'Stantonville',
  'statonville': 'Stantonville',
  
  // Trezevant variations
  'trezevant': 'Trezevant',
  'trezevnt': 'Trezevant',
  
  // Hayti variations (Missouri)
  'hayti': 'Hayti',
  'haiti': 'Hayti',
  
  // Fulton variations (Kentucky)
  'fulton': 'Fulton',
  'fultn': 'Fulton',
  
  // Hickman variations (Kentucky)
  'hickman': 'Hickman',
  'hikman': 'Hickman',
  
  // Steele variations (Missouri)
  'steele': 'Steele',
  'steel': 'Steele',
  
  // Other corrections
  'medina': 'Medina',
  'medinz': 'Medina',
  'wildersville': 'Wildersville',
  'wilderville': 'Wildersville',
  'decaturville': 'Decaturville',
  'dectuarville': 'Decaturville',
  'somerville': 'Somerville',
  'somersville': 'Somerville',
  'whiteville': 'Whiteville',
  'whitville': 'Whiteville',
  'bartlett': 'Bartlett',
  'barlett': 'Bartlett',
  'millington': 'Millington',
  'milington': 'Millington',
  'munford': 'Munford',
  'manford': 'Munford',
  'stanton': 'Stanton',
  'staton': 'Stanton',
  'rutherford': 'Rutherford',
  'ruthford': 'Rutherford',
  'bradford': 'Bradford',
  'braford': 'Bradford',
  'gleason': 'Gleason',
  'gleeson': 'Gleason',
  'sharon': 'Sharon',
  'shron': 'Sharon',
  'sharron': 'Sharon',
  'bells': 'Bells',
  'bels': 'Bells',
  'alamo': 'Alamo',
  'almo': 'Alamo',
  'obion': 'Obion',
  'oboin': 'Obion',
  'henning': 'Henning',
  'henninng': 'Henning',
  'hennings': 'Henning',
  'ridgely': 'Ridgely',
  'ridgley': 'Ridgely',
  'hornbeak': 'Hornbeak',
  'hornbreak': 'Hornbeak',
  'rives': 'Rives',
  'reaves': 'Rives',
  'trimble': 'Trimble',
  'timble': 'Trimble',
  'dyer': 'Dyer',
  'dryer': 'Dyer',
  'finger': 'Finger',
  'fingr': 'Finger',
  'ramer': 'Ramer',
  'ramar': 'Ramer',
  'pinson': 'Pinson',
  'pinsen': 'Pinson',
  'middleton': 'Middleton',
  'midleton': 'Middleton',
  'enville': 'Enville',
  'envile': 'Enville',
  'sardis': 'Sardis',
  'srdis': 'Sardis',
  'bogota': 'Bogota',
  'bogata': 'Bogota',
  'dukedom': 'Dukedom',
  'dukdom': 'Dukedom',
  'cottage grove': 'Cottage Grove',
  'cottagegrove': 'Cottage Grove',
  'palmersville': 'Palmersville',
  'palmerville': 'Palmersville',
  'kennett': 'Kennett',
  'kennet': 'Kennett',
  'cooter': 'Cooter',
  'coter': 'Cooter',
  'finley': 'Finley',
  'finely': 'Finley',
  'holladay': 'Holladay',
  'holliday': 'Holladay',
  'holloaday': 'Holladay',
  'toone': 'Toone',
  'tone': 'Toone',
  'maury city': 'Maury City',
  'maurycity': 'Maury City',
  'portageville': 'Portageville',
  'portgeville': 'Portageville',
  'bragg city': 'Bragg City',
  'braggadocio': 'Braggadocio',
  'paragould': 'Paragould',
  'senath': 'Senath',
  'scotts hill': 'Scotts Hill',
  'scottshill': 'Scotts Hill',
  'big sandy': 'Big Sandy',
  'bigsandy': 'Big Sandy',
  'jacks creek': 'Jacks Creek',
  'jackscreek': 'Jacks Creek',
  'morris chapel': 'Morris Chapel',
  'morrischapel': 'Morris Chapel',
  'bath springs': 'Bath Springs',
  'bathsprings': 'Bath Springs',
  'michie': 'Michie',
  'miche': 'Michie',
  'counce': 'Counce',
  'counc': 'Counce',
  'crump': 'Crump',
  'crimp': 'Crump',
  'guys': 'Guys',
  'guy': 'Guys',
  'pocahontas': 'Pocahontas',
  'pocahonts': 'Pocahontas',
  'drummonds': 'Drummonds',
  'drumonds': 'Drummonds',
  'cordova': 'Cordova',
  'cordva': 'Cordova',
  'arlington': 'Arlington',
  'arlinton': 'Arlington'
};

/**
 * Invalid city entries that should be flagged
 */
const INVALID_CITIES = [
  '0', '777777', 'epic', 'epic tn', 'in epic', 'in chart', 'epic already built',
  'on file', 'unknown', 'not know', 'ff', 'calling clinic', 'tennessee',
  'tn', 'ut', 'nashville tn', 'in epic tn', 'ut', '`dyersburg'
];

/**
 * Valid Tennessee and nearby cities (for validation)
 */
const VALID_CITIES = new Set([
  // Major Tennessee Cities
  'Dyersburg', 'Jackson', 'Memphis', 'Nashville', 'Martin', 'Union City',
  'Brownsville', 'Humboldt', 'Milan', 'Paris', 'Ripley', 'Covington',
  'Henderson', 'Lexington', 'Savannah', 'Selmer', 'Bolivar', 'Camden',
  
  // West Tennessee Cities
  'Newbern', 'Halls', 'Gates', 'Alamo', 'Bells', 'Friendship', 'Trimble',
  'Trenton', 'Kenton', 'Rutherford', 'Bradford', 'Gibson', 'Medina',
  'Atwood', 'Trezevant', 'McKenzie', 'Huntingdon', 'Dresden', 'Gleason',
  'Greenfield', 'Sharon', 'Martin', 'South Fulton', 'Obion', 'Troy',
  'Rives', 'Hornbeak', 'Ridgely', 'Tiptonville', 'Henning', 'Mason',
  'Stanton', 'Munford', 'Brighton', 'Atoka', 'Millington', 'Arlington',
  'Bartlett', 'Somerville', 'Whiteville', 'Adamsville', 'Bethel Springs',
  'Finger', 'Ramer', 'Stantonville', 'Michie', 'Counce', 'Pickwick Dam',
  'Shiloh', 'Crump', 'Enville', 'Scotts Hill', 'Parsons', 'Decaturville',
  'Linden', 'Clifton', 'Waynesboro', 'Hollow Rock', 'Bruceton', 'Cedar Grove',
  'Big Sandy', 'Cottage Grove', 'Palmersville', 'Dukedom', 'Dyer',
  'Finley', 'Lenox', 'Bogota', 'Hickory Valley', 'Saulsbury', 'Grand Junction',
  'Pocahontas', 'Toone', 'Medon', 'Pinson', 'Beech Bluff', 'Huron',
  'Jacks Creek', 'Morris Chapel', 'Sardis', 'Saltillo', 'Bath Springs',
  'Wildersville', 'Yuma', 'Westport', 'Holladay', 'Middleton', 'Hornsby',
  'Guys', 'Corinth', 'Eastport', 'Burnsville', 'Iuka', 'Waterloo',
  'Lutts', 'Olivehill', 'Lobelville', 'Centerville', 'Hohenwald', 'Collinwood',
  'Cypress Inn', 'Darden', 'Gadsden', 'Tigrett', 'Maury City', 'Crockett Mills',
  'Denmark', 'Mercer', 'Lavinia', 'Oakfield', 'Woodland Mills', 'Springville',
  'Drummonds', 'Gallaway', 'Burlison', 'Cordova', 'Collierville', 'Eaton',
  'Rossville', 'Moscow', 'Williston', 'Oakland', 'Piperton', 'Gilt Edge',
  'Hennings', 'Water Valley', 'Braggadocio', 'Rector', 'Holcomb', 'Blytheville',
  'Southaven', 'Olive Branch', 'Clinton', 'Smyrna', 'Franklin', 'Lebanon',
  'Cookeville', 'Clarksville', 'Johnson City', 'Kingsport', 'Bristol',
  'Dover', 'Waverly', 'McLemoresville', 'Reagan', 'Scotts Hill', 'Stantonville',
  'Eva', 'New Johnsonville', 'Sugar Tree', 'Mansfield', 'Idlewild', 'Alpharetta',
  'Tampa', 'Griffin', 'Colorado Springs', 'Millersville', 'Portland', 'Antioch',
  'Conroe', 'Cullman', 'Muscle Shoals', 'Salt Lake City', 'Virginia Beach', 
  'Milledgeville', 'Wingo', 'Fulton', 'Hickman', 'Three Way', 'Magnolia',
  'Salisbury', 'Lake Co', 'FPO', 'Hayti', 'Steele', 'Caruthersville', 'Cooter',
  'Kennett', 'Senath', 'Wardell', 'Pascola', 'Paragould', 'Gosnell', 'Portageville'
]);

/**
 * Main function to normalize all city entries
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of normalization results
 */
function normalizeCityData(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting city normalization...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, corrected: 0, invalid: 0 };
    }
    
    // Get all city data at once
    const range = sheet.getRange(2, CITY_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    // Track statistics
    const stats = {
      processed: 0,
      corrected: 0,
      invalid: 0,
      misspellings: 0,
      cityCounts: new Map(),
      invalidEntries: []
    };
    
    // Process each city entry
    for (let i = 0; i < values.length; i++) {
      const originalValue = values[i][0];
      
      if (originalValue !== null && originalValue !== undefined && originalValue !== '') {
        stats.processed++;
        
        const result = normalizeCityName(originalValue.toString());
        
        values[i][0] = result.normalized;
        backgrounds[i] = [result.backgroundColor];
        
        // Track statistics
        if (result.wasNormalized) stats.corrected++;
        if (result.category === 'invalid') {
          stats.invalid++;
          stats.invalidEntries.push({
            row: i + 2,
            original: originalValue,
            normalized: result.normalized
          });
        }
        if (result.category === 'misspelling') stats.misspellings++;
        
        // Count city occurrences
        const cityKey = result.normalized;
        stats.cityCounts.set(cityKey, (stats.cityCounts.get(cityKey) || 0) + 1);
        
        // Add note if there was an issue or correction
        if (result.note) {
          notes.push({
            row: i + 2,
            col: CITY_CONFIG.COLUMN.INDEX,
            message: result.note
          });
        }
      } else {
        // Empty cell
        backgrounds[i] = [CITY_CONFIG.DEFAULT_COLOR];
      }
    }
    
    // Apply all changes in batch
    range.setValues(values);
    range.setBackgrounds(backgrounds);
    
    // Add notes
    notes.forEach(note => {
      sheet.getRange(note.row, note.col).setNote(note.message);
    });
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`City normalization complete in ${processingTime} seconds`);
    console.log(`Processed: ${stats.processed}, Corrected: ${stats.corrected}, Invalid: ${stats.invalid}`);
    
    // Generate detailed report
    generateCityReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error in normalizeCityData:', error);
    throw new Error(`Failed to normalize city data: ${error.message}`);
  }
}

/**
 * Normalize a single city name
 * @param {string} cityInput - Raw city input
 * @returns {Object} Object with normalized name and metadata
 */
function normalizeCityName(cityInput) {
  try {
    if (!cityInput) {
      return {
        normalized: '',
        original: '',
        wasNormalized: false,
        backgroundColor: CITY_CONFIG.DEFAULT_COLOR,
        category: 'empty'
      };
    }
    
    let city = cityInput.toString().trim();
    const originalCity = city;
    
    // Step 1: Clean the input
    city = cleanCityInput(city);
    
    // Step 2: Check if it's an invalid entry
    if (isInvalidCity(city)) {
      return {
        normalized: city.toUpperCase() === city ? toTitleCase(city) : city,
        original: originalCity,
        wasNormalized: true,
        backgroundColor: CITY_CONFIG.FORMATTING.INVALID_COLOR,
        category: 'invalid',
        note: `Invalid city entry: "${originalCity}"`
      };
    }
    
    // Step 3: Check for corrections/misspellings
    const lowerCity = city.toLowerCase().trim();
    if (CITY_CORRECTIONS[lowerCity]) {
      const corrected = CITY_CORRECTIONS[lowerCity];
      return {
        normalized: corrected,
        original: originalCity,
        wasNormalized: true,
        backgroundColor: CITY_CONFIG.FORMATTING.MISSPELLED_COLOR,
        category: 'misspelling',
        note: `Corrected spelling from: ${originalCity}`
      };
    }
    
    // Step 4: Handle special formatting cases
    city = formatCityName(city);
    
    // Step 5: Validate against known cities
    if (VALID_CITIES.has(city)) {
      const needsCorrection = city !== originalCity;
      return {
        normalized: city,
        original: originalCity,
        wasNormalized: needsCorrection,
        backgroundColor: needsCorrection ? CITY_CONFIG.FORMATTING.CORRECTED_COLOR : CITY_CONFIG.DEFAULT_COLOR,
        category: 'valid',
        note: needsCorrection ? `Formatted from: ${originalCity}` : null
      };
    }
    
    // Step 6: For unrecognized cities, apply title case if all caps or all lowercase
    if (city === city.toUpperCase() || city === city.toLowerCase()) {
      const formatted = toTitleCase(city);
      return {
        normalized: formatted,
        original: originalCity,
        wasNormalized: true,
        backgroundColor: CITY_CONFIG.FORMATTING.CORRECTED_COLOR,
        category: 'formatted',
        note: `Formatted from: ${originalCity}`
      };
    }
    
    // Step 7: Return as-is if no changes needed
    return {
      normalized: city,
      original: originalCity,
      wasNormalized: false,
      backgroundColor: CITY_CONFIG.DEFAULT_COLOR,
      category: 'unchanged',
      note: null
    };
    
  } catch (error) {
    console.error('Error normalizing city:', error);
    return {
      normalized: cityInput,
      original: cityInput,
      wasNormalized: false,
      backgroundColor: CITY_CONFIG.FORMATTING.INVALID_COLOR,
      category: 'error',
      note: `Error: ${error.message}`
    };
  }
}

/**
 * Clean city input by removing extra spaces and special characters
 * @private
 */
function cleanCityInput(input) {
  return input
    .trim()
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/^["'`]+|["'`]+$/g, '') // Remove quotes at beginning/end
    .replace(/\t/g, ' ')            // Replace tabs with spaces
    .replace(/^\d+\s*/, '')         // Remove leading numbers
    .trim();
}

/**
 * Check if a city name is invalid
 * @private
 */
function isInvalidCity(city) {
  const lowerCity = city.toLowerCase().trim();
  return INVALID_CITIES.includes(lowerCity) || 
         lowerCity.includes('epic') || 
         lowerCity === '0' ||
         lowerCity.length < CITY_CONFIG.VALIDATION.MIN_LENGTH ||
         /^\d+$/.test(lowerCity); // All numbers
}

/**
 * Format city name with proper capitalization
 * @private
 */
function formatCityName(city) {
  // Handle special cases
  const specialCases = {
    'ft': 'Fort',
    'st': 'Saint',
    'mt': 'Mount'
  };
  
  // Split by spaces
  const words = city.split(/\s+/);
  
  const formatted = words.map((word, index) => {
    const lowerWord = word.toLowerCase();
    
    // Check for special cases at the beginning of words
    for (const [abbr, full] of Object.entries(specialCases)) {
      if (lowerWord === abbr || lowerWord.startsWith(abbr + '.')) {
        return full + word.substring(abbr.length);
      }
    }
    
    // Articles and prepositions that should be lowercase (unless first word)
    const lowercaseWords = ['of', 'the', 'and', 'or', 'in', 'at', 'on', 'by', 'for'];
    if (index > 0 && lowercaseWords.includes(lowerWord)) {
      return lowerWord;
    }
    
    // Handle McKenzie, McDonald, etc.
    if (lowerWord.startsWith('mc') && word.length > 2) {
      return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    
    // Handle O'Brien, O'Neill, etc.
    if (lowerWord.startsWith("o'") && word.length > 2) {
      return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    
    // Standard title case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return formatted.join(' ');
}

/**
 * Convert string to title case
 * @private
 */
function toTitleCase(str) {
  return str.split(/\s+/).map(word => {
    if (word.length === 0) return word;
    
    // Keep all caps if it's an acronym (2-4 letters)
    if (word.length <= 4 && word === word.toUpperCase()) {
      return word;
    }
    
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Generate a detailed city normalization report
 * @param {Object} stats - Statistics from normalization
 */
function generateCityReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('City Normalization Report');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('City Normalization Report');
    } else {
      reportSheet.clear();
    }
    
    // Sort cities by frequency
    const sortedCities = Array.from(stats.cityCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    // Calculate percentages
    const total = stats.processed;
    
    // Create report headers
    const headers = [
      ['City Normalization Report'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Statistics'],
      ['Total Processed:', stats.processed],
      ['Entries Corrected:', stats.corrected],
      ['Misspellings Fixed:', stats.misspellings],
      ['Invalid Entries:', stats.invalid],
      [''],
      ['Top Cities by Frequency'],
      ['City', 'Count', 'Percentage']
    ];
    
    // Add headers to sheet
    reportSheet.getRange(1, 1, headers.length, 3).setValues(headers);
    
    // Add top 50 cities
    const cityData = sortedCities.slice(0, 50).map(([city, count]) => [
      city,
      count,
      `${((count / total) * 100).toFixed(2)}%`
    ]);
    
    if (cityData.length > 0) {
      reportSheet.getRange(12, 1, cityData.length, 3).setValues(cityData);
    }
    
    // Add invalid entries section if any
    if (stats.invalidEntries.length > 0) {
      const invalidStart = 12 + cityData.length + 2;
      const invalidHeaders = [
        ['Invalid Entries'],
        ['Row', 'Original Value', 'Status']
      ];
      
      reportSheet.getRange(invalidStart, 1, invalidHeaders.length, 3)
        .setValues(invalidHeaders);
      
      const invalidData = stats.invalidEntries.slice(0, 50).map(entry => [
        entry.row,
        entry.original,
        'Invalid/Unknown City'
      ]);
      
      reportSheet.getRange(invalidStart + 2, 1, invalidData.length, 3)
        .setValues(invalidData);
    }
    
    // Format the report
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(4, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(10, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(11, 1, 1, 3).setFontWeight('bold').setBackground('#E8E8E8');
    
    // Auto-resize columns
    reportSheet.autoResizeColumns(1, 3);
    
    // Add color legend at the bottom
    const legendStart = Math.max(12 + cityData.length + stats.invalidEntries.length + 4, 70);
    const legend = [
      ['Color Legend'],
      ['', 'Corrected Formatting'],
      ['', 'Corrected Misspellings'],
      ['', 'Invalid Entries']
    ];
    
    reportSheet.getRange(legendStart, 1, legend.length, 2).setValues(legend);
    reportSheet.getRange(legendStart, 1).setFontWeight('bold');
    
    // Apply colors to legend
    reportSheet.getRange(legendStart + 1, 1).setBackground(CITY_CONFIG.FORMATTING.CORRECTED_COLOR);
    reportSheet.getRange(legendStart + 2, 1).setBackground(CITY_CONFIG.FORMATTING.MISSPELLED_COLOR);
    reportSheet.getRange(legendStart + 3, 1).setBackground(CITY_CONFIG.FORMATTING.INVALID_COLOR);
    
    console.log('City normalization report generated');
    
    // Show summary
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Report generated: ${stats.processed} cities processed, ${stats.corrected} corrected`,
      'Report Complete',
      5
    );
    
  } catch (error) {
    console.error('Error generating city report:', error);
  }
}

/**
 * Validate city entries without modifying them
 */
function validateCityEntries() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const range = sheet.getRange(2, CITY_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  let invalidCount = 0;
  let emptyCount = 0;
  let misspelledCount = 0;
  const issues = [];
  
  values.forEach((row, index) => {
    const city = row[0];
    
    if (!city || city === '') {
      emptyCount++;
      issues.push({
        row: index + 2,
        issue: 'Empty city field',
        value: ''
      });
    } else {
      const result = normalizeCityName(city.toString());
      
      if (result.category === 'invalid') {
        invalidCount++;
        issues.push({
          row: index + 2,
          issue: 'Invalid city',
          value: city
        });
      } else if (result.category === 'misspelling') {
        misspelledCount++;
        issues.push({
          row: index + 2,
          issue: 'Misspelled city',
          value: city,
          suggestion: result.normalized
        });
      }
    }
  });
  
  // Generate validation summary
  const totalIssues = invalidCount + emptyCount + misspelledCount;
  
  if (totalIssues === 0) {
    SpreadsheetApp.getUi().alert(
      'City Validation Complete',
      'All city entries are valid!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    const message = `City Validation Results:\n\n` +
                   `Empty fields: ${emptyCount}\n` +
                   `Invalid cities: ${invalidCount}\n` +
                   `Misspelled cities: ${misspelledCount}\n\n` +
                   `Total issues: ${totalIssues}\n\n` +
                   `Run "Normalize City Data" to fix these issues.`;
    
    SpreadsheetApp.getUi().alert('City Validation', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
    // Log detailed issues
    console.log('City validation issues:', issues);
  }
  
  return {
    emptyCount,
    invalidCount,
    misspelledCount,
    totalIssues,
    issues
  };
}

/**
 * Get city statistics for reporting
 */
function getCityStatistics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return null;
  }
  
  const range = sheet.getRange(2, CITY_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  const cityCounts = new Map();
  let emptyCount = 0;
  let invalidCount = 0;
  
  values.forEach(row => {
    const city = row[0];
    if (!city || city === '') {
      emptyCount++;
    } else {
      const normalized = normalizeCityName(city.toString());
      if (normalized.category === 'invalid') {
        invalidCount++;
      }
      cityCounts.set(normalized.normalized, (cityCounts.get(normalized.normalized) || 0) + 1);
    }
  });
  
  // Sort by count
  const sorted = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  return {
    totalEntries: lastRow - 1,
    uniqueCities: cityCounts.size,
    emptyEntries: emptyCount,
    invalidEntries: invalidCount,
    topCities: sorted.slice(0, 20),
    cityCounts: cityCounts
  };
}

/**
 * Menu function to normalize city data only
 */
function normalizeCityDataOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = normalizeCityData(sheet);
  
  SpreadsheetApp.getUi().alert(
    'City Normalization Complete',
    `Processed: ${stats.processed}\n` +
    `Corrected: ${stats.corrected}\n` +
    `Misspellings Fixed: ${stats.misspellings}\n` +
    `Invalid: ${stats.invalid}\n\n` +
    `Check "City Normalization Report" for details.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}