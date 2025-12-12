/**
 * City Name Dictionary
 * ====================
 * Master dictionary for normalizing city names
 * Extracted from CityNormalization.js for centralized management
 * 
 * Last Updated: 2025-11-29
 * 
 * USAGE:
 * - Keys are LOWERCASE for case-insensitive matching
 * - Values are the canonical (standardized) city name
 * 
 * TO ADD A NEW CITY:
 * 1. Add the lowercase key (how it appears in the form)
 * 2. Set the proper capitalized name
 * 3. Add common misspellings as additional entries
 */

// ============================================
// CITY CONFIGURATION
// ============================================
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

// ============================================
// INVALID CITY ENTRIES
// ============================================
const INVALID_CITIES = [
  '0', '777777', 'epic', 'epic tn', 'in epic', 'in chart', 'epic already built',
  'on file', 'unknown', 'not know', 'ff', 'calling clinic', 'tennessee',
  'tn', 'ut', 'nashville tn', 'in epic tn', '`dyersburg'
];

// ============================================
// VALID CITIES (for validation)
// ============================================
const VALID_CITIES_LIST = [
  // Major Tennessee Cities
  'Dyersburg', 'Jackson', 'Memphis', 'Nashville', 'Martin', 'Union City',
  'Brownsville', 'Humboldt', 'Milan', 'Paris', 'Ripley', 'Covington',
  'Henderson', 'Lexington', 'Savannah', 'Selmer', 'Bolivar', 'Camden',
  
  // West Tennessee Cities
  'Newbern', 'Halls', 'Gates', 'Alamo', 'Bells', 'Friendship', 'Trimble',
  'Trenton', 'Kenton', 'Rutherford', 'Bradford', 'Gibson', 'Medina',
  'Atwood', 'Trezevant', 'McKenzie', 'Huntingdon', 'Dresden', 'Gleason',
  'Greenfield', 'Sharon', 'South Fulton', 'Obion', 'Troy',
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
  'Dover', 'Waverly', 'McLemoresville', 'Reagan', 'Stantonville',
  'Eva', 'New Johnsonville', 'Sugar Tree', 'Mansfield', 'Idlewild', 'Alpharetta',
  'Tampa', 'Griffin', 'Colorado Springs', 'Millersville', 'Portland', 'Antioch',
  'Conroe', 'Cullman', 'Muscle Shoals', 'Salt Lake City', 'Virginia Beach', 
  'Milledgeville', 'Wingo', 'Fulton', 'Hickman', 'Three Way', 'Magnolia',
  'Salisbury', 'Lake Co', 'FPO', 'Hayti', 'Steele', 'Caruthersville', 'Cooter',
  'Kennett', 'Senath', 'Wardell', 'Pascola', 'Paragould', 'Gosnell', 'Portageville'
];

// Create a Set for efficient lookup
const VALID_CITIES = new Set(VALID_CITIES_LIST);

// ============================================
// MASTER CITY CORRECTIONS DICTIONARY
// ============================================
const CITIES = {
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
  'arlinton': 'Arlington',
  
  // Major cities that might have variations
  'memphis': 'Memphis',
  'mempis': 'Memphis',
  'nashville': 'Nashville',
  'nashvile': 'Nashville',
  'clarksville': 'Clarksville',
  'clarksvillw': 'Clarksville',
  'chattanooga': 'Chattanooga',
  'knoxville': 'Knoxville',
  
  // Additional common cities
  'gibson': 'Gibson',
  'atwood': 'Atwood',
  'bruceton': 'Bruceton',
  'clifton': 'Clifton',
  'linden': 'Linden',
  'waynesboro': 'Waynesboro',
  'mason': 'Mason',
  'collierville': 'Collierville',
  'germantown': 'Germantown'
};

// ============================================
// ALIASES FOR BACKWARD COMPATIBILITY
// ============================================
const CITY_CORRECTIONS = CITIES;

// Export for use in other modules (Google Apps Script compatible)
// In GAS, all top-level variables are automatically available across files
