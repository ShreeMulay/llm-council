/**
 * Provider Deduplication Module
 * @module ProviderDeduplication
 * @description Handles provider name deduplication and standardization
 * @version 2.0
 */

// [PROVIDER_NORMALIZATION_MAP constant should be inserted here - keeping your existing map]

/**
 * Configuration for provider deduplication
 */
const PROVIDER_DEDUP_CONFIG = {
  COLUMN: {
    INDEX: 5,  // Column E - Referring Provider
    LETTER: 'E'
  },
  FORMATTING: {
    NORMALIZED_COLOR: '#E6F3FF',    // Light blue for normalized
    DUPLICATE_COLOR: '#FFE6CC',      // Light orange for duplicates
    UNKNOWN_COLOR: '#FFE6E6',        // Light red for unknown
    SELF_REFERRAL_COLOR: '#FFF3CD'   // Light yellow for self-referrals
  },
  SIMILARITY: {
    THRESHOLD: 0.85,  // 85% similarity threshold for fuzzy matching
    MIN_LENGTH: 3     // Minimum length for fuzzy matching
  }
};

/**
 * Master provider normalization mapping
 * Maps all variations to standardized names
 */
const PROVIDER_NORMALIZATION_MAP = {
  // ========== A ==========
  'abdullah arshad': 'Abdullah Arshad, MD',
  'abdullah arshad, md': 'Abdullah Arshad, MD',
  
  'adam english': 'Adam English, DO',
  'adam english, do': 'Adam English, DO',
  
  'adenike adedeji': 'Adenike Adedeji, FNP',
  'adenike adedeji, fnp': 'Adenike Adedeji, FNP',
  
  'adeyinka agbetoyin': 'Adeyinka Agbetoyin, MD',
  'adeyinka agbetoyin, md': 'Adeyinka Agbetoyin, MD',
  
  'alan weatherford': 'Alan Weatherford, PA-C',
  'alan weatherford, pa-c-c': 'Alan Weatherford, PA-C',
  'alan weatherford, pa-c': 'Alan Weatherford, PA-C',
  
  'amy jackson smith': 'Amy Smith, PA-C',
  'amy smith': 'Amy Smith, PA-C',
  'amy smith, pa-c-c': 'Amy Smith, PA-C',
  'amy smith,-c, pa-c-c': 'Amy Smith, PA-C',
  
  'amanda fuller': 'Amanda Fuller, FNP',
  'amanda fuller, fnp-bc': 'Amanda Fuller, FNP',
  'amanda fuller, fnp': 'Amanda Fuller, FNP',
  
  'andrea melvin': 'Andrea Melvin, FNP',
  'ashleigh melvin': 'Andrea Melvin, FNP',
  'ashleigh melvin, fnp': 'Andrea Melvin, FNP',
  
  'annie k.massey': 'Annie Kate Massey, PA-C',
  'annie kate massey': 'Annie Kate Massey, PA-C',
  'annie kate massey, pa-c-c': 'Annie Kate Massey, PA-C',
  'annie k.massey, pa-c-c': 'Annie Kate Massey, PA-C',
  
  'anshul bhalla': 'Anshul Bhalla, MD',
  'anshul bhalla, md': 'Anshul Bhalla, MD',
  
  'ar.ahsan': 'Mohammad Ahsan, MD',
  'ar.ahsan, md': 'Mohammad Ahsan, MD',
  'mohammad ahsan': 'Mohammad Ahsan, MD',
  'mohammad ahsan, md': 'Mohammad Ahsan, MD',
  
  // ========== B ==========
  'ben rees': 'Benjamin Reese, PA-C',
  'ben rees, pa-c-c': 'Benjamin Reese, PA-C',
  'ben reese': 'Benjamin Reese, PA-C',
  'ben reese, pa-c-c': 'Benjamin Reese, PA-C',
  'ben reese., pa-c-c': 'Benjamin Reese, PA-C',
  'benjamin reese': 'Benjamin Reese, PA-C',
  'benjamin reese, pa-c-c': 'Benjamin Reese, PA-C',
  'benjamin reese,-c, pa-c-c': 'Benjamin Reese, PA-C',
  
  'beth henson': 'Beth Hinson, FNP',
  'beth hinson': 'Beth Hinson, FNP',
  
  'brad creekmore': 'Brad Creekmore, MD',
  'penny creekmoore': 'Penny Creekmore, FNP',
  'penny creekmore': 'Penny Creekmore, FNP',
  
  'bran mccarver': 'Brian McCarver, MD',
  'brian mccarver': 'Brian McCarver, MD',
  'bran mccarver, md': 'Brian McCarver, MD',
  'brian mccarver, md': 'Brian McCarver, MD',
  
  'brandy latham steelman': 'Brandy Steelman, FNP',
  'brandy steelman': 'Brandy Steelman, FNP',
  'brandy steelman, fnp': 'Brandy Steelman, FNP',
  'steelman': 'Brandy Steelman, FNP',
  
  'brent amzow': 'Brent Zamzow, MD',
  'brent zamzow': 'Brent Zamzow, MD',
  'zamzow': 'Brent Zamzow, MD',
  
  'brittany lynch': 'Brittany Lynch, APRN',
  'brittany lynch aprn': 'Brittany Lynch, APRN',
  'brittany lynch, aprn': 'Brittany Lynch, APRN',
  'brittany lynch aprn and dr.charlotte coleman, md': 'Brittany Lynch, APRN',
  
  'brooke garner': 'Brooke Garner, FNP',
  'brooke garner, fnp': 'Brooke Garner, FNP',
  'brooke garner,-c, fnp': 'Brooke Garner, FNP',
  
  'buffy cook': 'Buffy Cook, MD',
  'buffy cook, md': 'Buffy Cook, MD',
  'buffy jay cook': 'Buffy Cook, MD',
  
  'byron breeding': 'Byron Breeding, PA-C',
  'byron breeding, pa-c': 'Byron Breeding, PA-C',
  'byron breeding, pa-c-c': 'Byron Breeding, PA-C',
  
  // ========== C ==========
  'candice jones': 'Candice Jones, DO',
  'candice jones, do': 'Candice Jones, DO',
  'candice l jones': 'Candice Jones, DO',
  'candice l jones, do': 'Candice Jones, DO',
  
  'carey frix': 'Carey Frix, MD',
  'carey frix, md': 'Carey Frix, MD',
  
  'cassidy belew': 'Cassidy Belew, FNP',
  'cassidy belew, fnp': 'Cassidy Belew, FNP',
  'cassidy belew,-c, fnp': 'Cassidy Belew, FNP',
  
  'chelsey parks': 'Chelsey Parks, DNP',
  'chelsey parks, dnp': 'Chelsey Parks, DNP',
  'chelsey parks, fnp': 'Chelsey Parks, DNP',
  
  'christian gray': 'Christin Gray, FNP',
  'christin gray': 'Christin Gray, FNP',
  'christian gray, fnp': 'Christin Gray, FNP',
  'christin gray, fnp': 'Christin Gray, FNP',
  
  'christ ward': 'Christy Ward, FNP',
  'christy ward': 'Christy Ward, FNP',
  'christ ward, fnp': 'Christy Ward, FNP',
  'christy ward, fnp': 'Christy Ward, FNP',
  
  'christopher d marshall': 'Christopher Marshall, MD',
  'christopher marshall': 'Christopher Marshall, MD',
  'christopher marshall, md': 'Christopher Marshall, MD',
  
  'clarey dowling': 'Clarey Dowling, MD',
  'clarey dowling, md': 'Clarey Dowling, MD',
  'clarey r dowling': 'Clarey Dowling, MD',
  'clarey r dowling, md': 'Clarey Dowling, MD',
  'clarey r.dowling': 'Clarey Dowling, MD',
  'clarey r.dowling, md': 'Clarey Dowling, MD',
  
  'claude pirtle': 'Claude Pirtle, MD',
  'claude pirtle, md': 'Claude Pirtle, MD',
  
  'corey page': 'Corey Page, FNP',
  'corey paige': 'Corey Page, FNP',
  'corey page, fnp': 'Corey Page, FNP',
  
  'crisite vibbert': 'Cristie Vibbert, FNP',
  'cristie vibbert': 'Cristie Vibbert, FNP',
  'crisite vibbert, fnp': 'Cristie Vibbert, FNP',
  
  'cynthia carrol': 'Cynthia Carroll, FNP',
  'cynthia carroll': 'Cynthia Carroll, FNP',
  'cynthia carrol, fnp': 'Cynthia Carroll, FNP',
  'cynthia carroll, fnp': 'Cynthia Carroll, FNP',
  
  // ========== D ==========
  'daniel crall': 'Daniel Crall, PA-C',
  'daniel crall, pa-c-c': 'Daniel Crall, PA-C',
  
  'darren perry': 'Darren Perry, FNP',
  'darren perry, cfnp': 'Darren Perry, FNP',
  'darren perry, fnp': 'Darren Perry, FNP',
  'darren pery': 'Darren Perry, FNP',
  
  'david j.wilbert': 'David Wilbert, PA-C',
  'david wilbert': 'David Wilbert, PA-C',
  'david wilbert, pa-c-c': 'David Wilbert, PA-C',
  'david j.wilbert, pa-c-c': 'David Wilbert, PA-C',
  
  'david krapf': 'David Krapf, DO',
  'david krapf, do': 'David Krapf, DO',
  'david scott krapf': 'David Krapf, DO',
  'david scott krapf, do': 'David Krapf, DO',
  
  'david l seaton': 'David Seaton, MD',
  'david l.seaton': 'David Seaton, MD',
  'david l seaton, md': 'David Seaton, MD',
  'david l.seaton, md': 'David Seaton, MD',
  'david seaton': 'David Seaton, MD',
  'david seaton, md': 'David Seaton, MD',
  
  'debbie delones': 'Debra Delones, FNP',
  'debra delones': 'Debra Delones, FNP',
  'debbie delones, fnp': 'Debra Delones, FNP',
  'debra delones, fnp': 'Debra Delones, FNP',
  
  'deborah leggett': 'Deborah Leggett, FNP',
  'deborah legett': 'Deborah Leggett, FNP',
  
  'deborah smothers': 'Deborah Smothers, FNP',
  'deborah t.smothers': 'Deborah Smothers, FNP',
  'deborah t.smothers, fnp': 'Deborah Smothers, FNP',
  
  'debra cannon': 'Debra Cannon, FNP',
  'debra cannon, fnp': 'Debra Cannon, FNP',
  'debra s cannon': 'Debra Cannon, FNP',
  'debra s cannon, fnp': 'Debra Cannon, FNP',
  'debra s.cannon': 'Debra Cannon, FNP',
  'debra s.cannon, fnp': 'Debra Cannon, FNP',
  
  'dee blakney': 'Dee Blakney, DNP',
  'dee blakney, dnp': 'Dee Blakney, DNP',
  
  'diane maxell': 'Diane Maxwell, FNP',
  'diane maxwell': 'Diane Maxwell, FNP',
  'diane maxell, fnp': 'Diane Maxwell, FNP',
  'diane maxwell, fnp': 'Diane Maxwell, FNP',
  
  'dum piawa': 'Dum Piawa, DO',
  'dum piawa, do': 'Dum Piawa, DO',
  
  // ========== E ==========
  'earl l.stewart': 'Earl Stewart, MD',
  'earl stewart': 'Earl Stewart, MD',
  'earl l.stewart, md': 'Earl Stewart, MD',
  'earl stewart, md': 'Earl Stewart, MD',
  'earl swetward, md': 'Earl Stewart, MD',
  
  'elizabeth anderson': 'Elizabeth Anderson, FNP',
  'elizabeth anderson, fnp': 'Elizabeth Anderson, FNP',
  'elizabeth anderson,-c, fnp': 'Elizabeth Anderson, FNP',
  
  'elizabeth jones': 'Elizabeth Jones, FNP',
  'elizabeth jones, fnp': 'Elizabeth Jones, FNP',
  'elizabeth r jones': 'Elizabeth Jones, FNP',
  'elizabeth r jones, fnp': 'Elizabeth Jones, FNP',
  
  'elizabeth roberts': 'Elizabeth Roberts, FNP',
  'elizabeth roberts, cfnp': 'Elizabeth Roberts, FNP',
  'elizabeth roberts, fnp': 'Elizabeth Roberts, FNP',
  'elizabeth wade roberts': 'Elizabeth Roberts, FNP',
  'elizabeth wade roberts, fnp': 'Elizabeth Roberts, FNP',
  
  'elliot kurban': 'Elliot Kurban, MD',
  'elliot kurban, md': 'Elliot Kurban, MD',
  'elliot kurban /holly bunch, md': 'Elliot Kurban, MD',
  
  'emily bullock': 'Emily Bullock, FNP',
  'emily k.bullock': 'Emily Bullock, FNP',
  'emily k.bullock, fnp': 'Emily Bullock, FNP',
  
  'emily garner': 'Emily Garner, FNP',
  'emily garner, fnp': 'Emily Garner, FNP',
  'emily garner., fnp': 'Emily Garner, FNP',
  
  'emily ezell': 'Emily Smothers Ezell, FNP',
  'emily smothers ezell': 'Emily Smothers Ezell, FNP',
  
  'eric hart': 'Eric Hart, PA-C',
  'eric hart, pa-c-c': 'Eric Hart, PA-C',
  'eric hart,-c, pa-c-c': 'Eric Hart, PA-C',
  
  'eric sievers': 'Eric Sievers, MD',
  'eric sievrs': 'Eric Sievers, MD',
  
  'ethel spivey': 'Ethel Spivey, FNP',
  'ethel spivey, a, fnp': 'Ethel Spivey, FNP',
  'ethel spivey, fnp': 'Ethel Spivey, FNP',
  
  'evelyn jackson': 'Evelyn Jackson, APN',
  'evelyn jackson, apn': 'Evelyn Jackson, APN',
  'evelyn n.jackson': 'Evelyn Jackson, APN',
  'evelyn n.jackson, fnp': 'Evelyn Jackson, APN',
  'evelyn nicole jackson': 'Evelyn Jackson, APN',
  'evelyn nicole jackson, apn': 'Evelyn Jackson, APN',
  
  // ========== F ==========
  'f.gregory cox': 'Fred Gregory Cox, MD',
  'fred cox': 'Fred Gregory Cox, MD',
  'fred cox, md': 'Fred Gregory Cox, MD',
  'fred g cox': 'Fred Gregory Cox, MD',
  'fred g cox, md': 'Fred Gregory Cox, MD',
  'fred g.cox': 'Fred Gregory Cox, MD',
  'fred g.cox, md': 'Fred Gregory Cox, MD',
  'fred gregory cox': 'Fred Gregory Cox, MD',
  'fred gregory cox, md': 'Fred Gregory Cox, MD',
  'greg cox': 'Fred Gregory Cox, MD',
  'greg cox, md': 'Fred Gregory Cox, MD',
  'gregory cox': 'Fred Gregory Cox, MD',
  'gregory cox, md': 'Fred Gregory Cox, MD',
  
  'festus arinze': 'Festus Arinze, MD',
  'festus arinze, md': 'Festus Arinze, MD',
  
  'forrest busch': 'Forrest Busch, DO',
  'forrest busch, do': 'Forrest Busch, DO',
  'forrest k busch': 'Forrest Busch, DO',
  'forrest kenton busch': 'Forrest Busch, DO',
  
  // ========== G-L ==========
  'gary blount': 'Gary Blount, PA-C',
  'gary blount, pa-c-c': 'Gary Blount, PA-C',
  'gary blount,-c, pa-c-c': 'Gary Blount, PA-C',
  'gary christopher blount': 'Gary Blount, PA-C',
  
  'gregory b.franz': 'Gregory Franz, MD',
  'gregory franz': 'Gregory Franz, MD',
  'gregory b.franz, md': 'Gregory Franz, MD',
  'gregory franz, md': 'Gregory Franz, MD',
  
  'heather haddock': 'Heather Haddock, FNP',
  'heather haddock, fnp': 'Heather Haddock, FNP',
  'h.haddock, fnp': 'Heather Haddock, FNP',
  'hearther haddock': 'Heather Haddock, FNP',
  
  'hollie frazier': 'Hollie Frazier, FNP',
  'hollie frazier, fnp': 'Hollie Frazier, FNP',
  
  'james l williams ii': 'James L. Williams II, MD',
  'james l.williams ii': 'James L. Williams II, MD',
  'james l williams ii, md': 'James L. Williams II, MD',
  'james l.williams ii, md': 'James L. Williams II, MD',
  'james williams': 'James L. Williams II, MD',
  'james williams, md': 'James L. Williams II, MD',
  'jim williams': 'James L. Williams II, MD',
  'jim williams, md': 'James L. Williams II, MD',
  
  'jeffrey hampton': 'Jeffrey Hampton, FNP',
  'jeff hampton': 'Jeffrey Hampton, FNP',
  'jeffery hampton': 'Jeffrey Hampton, FNP',
  'jeffrey hampton, fnp': 'Jeffrey Hampton, FNP',
  
  'jessica rains': 'Jessica Rains, PA-C',
  'jessica rains, pa-c-c': 'Jessica Rains, PA-C',
  'jessica rains,-c, pa-c-c': 'Jessica Rains, PA-C',
  
  'joe hunt': 'Joe W. Hunt, MD',
  'joe w hunt': 'Joe W. Hunt, MD',
  'joe w.hunt': 'Joe W. Hunt, MD',
  'joe w.hunt, md': 'Joe W. Hunt, MD',
  
  'john b clendenin': 'John B. Clendenin, MD',
  'john b.clendenin': 'John B. Clendenin, MD',
  'john clendenin': 'John B. Clendenin, MD',
  'john clendenin, md': 'John B. Clendenin, MD',
  
  'joseph freeman': 'Joseph Freeman, MD',
  'joseph a.freeman': 'Joseph Freeman, MD',
  'joseph freeman, md': 'Joseph Freeman, MD',
  
  'karen webb': 'Karen Webb, APN',
  'karen e.webb': 'Karen Webb, APN',
  'karen webb, apn': 'Karen Webb, APN',
  'karen webb, fnp': 'Karen Webb, APN',
  
  'kathy banks': 'Kathy Banks, FNP',
  'kathy banks, fnp': 'Kathy Banks, FNP',
  'kathy joann banks': 'Kathy Banks, FNP',
  
  'kathryn glass': 'Kathryn J. Glass, MD',
  'kathryn j glass': 'Kathryn J. Glass, MD',
  'kathryn j.glass': 'Kathryn J. Glass, MD',
  'kathryn j.glass, md': 'Kathryn J. Glass, MD',
  
  'lakeshia yarbrough': 'Lakeshia Yarbrough, DNP',
  'keshia yarbrough': 'Lakeshia Yarbrough, DNP',
  'lakeshia yarbrough, dnp': 'Lakeshia Yarbrough, DNP',
  'lakeshia yarbrough, fnp': 'Lakeshia Yarbrough, DNP',
  
  'laura west': 'Laura West, FNP',
  'laura b west': 'Laura West, FNP',
  'laura beth west': 'Laura West, FNP',
  'laura west, fnp': 'Laura West, FNP',
  
  'laurel campbell': 'Laurel Campbell, MD',
  'laurel ann campbell': 'Laurel Campbell, MD',
  'laurel campbell, md': 'Laurel Campbell, MD',
  
  'linda peery': 'Linda Peery, PA-C',
  'linda d.peery': 'Linda Peery, PA-C',
  'linda peery, pa-c': 'Linda Peery, PA-C',
  'linda peery, pa-c-c': 'Linda Peery, PA-C',
  
  'lindsey crocker': 'Lindsey Crocker, FNP',
  'lindsay crocker': 'Lindsey Crocker, FNP',
  'lindsey crocker, fnp': 'Lindsey Crocker, FNP',
  
  'lindsey nelson': 'Lindsey Nelson, FNP',
  'lindsey nelson, fnp': 'Lindsey Nelson, FNP',
  'lyndsey nelson': 'Lindsey Nelson, FNP',
  
  // ========== M-Z ==========
  'matthew roberts': 'Matthew Roberts, FNP',
  'matthew w.roberts': 'Matthew Roberts, FNP',
  'matthew roberts, fnp': 'Matthew Roberts, FNP',
  'matthew w.roberts, fnp': 'Matthew Roberts, FNP',
  
  'michael brown': 'Michael Brown, PA-C',
  'michael a brown': 'Michael Brown, PA-C',
  'michael brown, pa-c': 'Michael Brown, PA-C',
  
  'michael bryant': 'Michael L. Bryant, MD',
  'michael l.bryant': 'Michael L. Bryant, MD',
  'michael bryant, md': 'Michael L. Bryant, MD',
  'michael l.bryant, md': 'Michael L. Bryant, MD',
  
  'michiel rudder': 'Michiel Rudder, FNP',
  'michael rudder': 'Michiel Rudder, FNP',
  'brent rudder': 'Michiel Rudder, FNP',
  'michiel rudder, fnp': 'Michiel Rudder, FNP',
  
  'mindy ledford': 'Mindy Ledford, FNP',
  'mindt ledford': 'Mindy Ledford, FNP',
  'mindy ledford, fnp': 'Mindy Ledford, FNP',
  
  'paul scates': 'Paul Scates, MD',
  'paul scates, md': 'Paul Scates, MD',
  
  'randle scott miskelly': 'Randle Scott Miskelly, FNP',
  'r scott miskelly': 'Randle Scott Miskelly, FNP',
  'r.scott miskelly': 'Randle Scott Miskelly, FNP',
  'randle scott miskelly, fnp': 'Randle Scott Miskelly, FNP',
  
  'rachel davis': 'Rachel Davis, FNP',
  'rachal davis': 'Rachel Davis, FNP',
  'rachel davis, fnp': 'Rachel Davis, FNP',
  
  'sarah bridges': 'Sarah Bridges, FNP',
  'sara bridges': 'Sarah Bridges, FNP',
  'sarah bridges, fnp': 'Sarah Bridges, FNP',
  
  'sarah huffstetler': 'Sarah Huffstetler, APRN',
  'sarah e huffstetler': 'Sarah Huffstetler, APRN',
  'sarah huffstetler, aprn': 'Sarah Huffstetler, APRN',
  
  'sierra clary': 'Sierra Clary, FNP',
  'seirra clary': 'Sierra Clary, FNP',
  'sierra clary, fnp': 'Sierra Clary, FNP',
  
  'shanea hines': 'Shanea Hines, DNP',
  'shanea hines, dnp': 'Shanea Hines, DNP',
  'shanea hines, fnp': 'Shanea Hines, DNP',
  
  'sherry whitby': 'Sherry Whitby, APRN',
  'sherry whitby, aprn': 'Sherry Whitby, APRN',
  'whitby sherry': 'Sherry Whitby, APRN',
  
  'suzette stanley': 'Suzette Stanley, FNP',
  'suszette stanley': 'Suzette Stanley, FNP',
  'suzette stanley, fnp': 'Suzette Stanley, FNP',
  
  'tanya arnold': 'Tanya Arnold, FNP',
  'tanya l arnold': 'Tanya Arnold, FNP',
  'tanya lynn arnold': 'Tanya Arnold, FNP',
  'tanya arnold, fnp': 'Tanya Arnold, FNP',
  
  'tonya creasy': 'Tonya Creasy, FNP',
  'tonya creasy.': 'Tonya Creasy, FNP',
  'tonya creasy, fnp': 'Tonya Creasy, FNP',
  
  'tracey kizer': 'Tracey Kizer, FNP',
  'traxcey kizer': 'Tracey Kizer, FNP',
  'tracey kizer, fnp': 'Tracey Kizer, FNP',
  
  'trent theriac': 'Trent Theriac, FNP',
  'thrent theriac': 'Trent Theriac, FNP',
  'trent theriac, fnp': 'Trent Theriac, FNP',
  
  'verneda herring': 'Verneda Herring, FNP',
  'verenda herring': 'Verneda Herring, FNP',
  'verneda herring, fnp': 'Verneda Herring, FNP',
  
  'virginia smith': 'Virginia Smith, FNP',
  'virginia c smith': 'Virginia Smith, FNP',
  'virginia smith, fnp': 'Virginia Smith, FNP',
  
  'wanda graupman': 'Wanda Graupman, FNP',
  'graupman eanda': 'Wanda Graupman, FNP',
  'wanda graupman, fnp': 'Wanda Graupman, FNP',
  
  'william mckee': 'William McKee, MD',
  'neil mckee': 'William McKee, MD',
  'william mckee, md': 'William McKee, MD',
  
  'william stone': 'William Stone, MD',
  'william k.stone': 'William Stone, MD',
  'william stone, md': 'William Stone, MD',
  
  // ========== SPECIAL CASES ==========
  'self referral': 'Self Referral',
  'self': 'Self Referral',
  'patient referral': 'Self Referral',
  'patient': 'Self Referral',
  
  'unknown provider': 'Unknown Provider',
  'unknown': 'Unknown Provider',
  
  'va medical center': 'VA Medical Center',
  'veterans administration': 'VA Medical Center',
  'veterans administration medical center': 'VA Medical Center'
};

/**
 * Main function to deduplicate all provider names
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of deduplication results
 */
function deduplicateProviders(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting provider deduplication...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, duplicates: 0 };
    }
    
    // Get all provider names at once
    const range = sheet.getRange(2, PROVIDER_DEDUP_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    // Track statistics
    const stats = {
      processed: 0,
      normalized: 0,
      duplicatesFound: 0,
      selfReferrals: 0,
      vaReferrals: 0,
      unknown: 0,
      providerCounts: new Map(),
      duplicateMap: new Map()
    };
    
    // Process each provider name
    for (let i = 0; i < values.length; i++) {
      const originalValue = values[i][0];
      
      if (originalValue && originalValue !== '') {
        stats.processed++;
        
        const result = normalizeProviderName(originalValue.toString());
        
        values[i][0] = result.normalized;
        backgrounds[i] = [result.backgroundColor];
        
        // Track statistics
        if (result.wasNormalized) stats.normalized++;
        if (result.category === 'self-referral') stats.selfReferrals++;
        if (result.category === 'va') stats.vaReferrals++;
        if (result.category === 'unknown') stats.unknown++;
        
        // Track provider frequency
        const normalizedKey = result.normalized;
        const currentCount = stats.providerCounts.get(normalizedKey) || 0;
        stats.providerCounts.set(normalizedKey, currentCount + 1);
        
        // Track duplicates
        if (result.originalNormalized !== result.normalized) {
          if (!stats.duplicateMap.has(normalizedKey)) {
            stats.duplicateMap.set(normalizedKey, new Set());
          }
          stats.duplicateMap.get(normalizedKey).add(originalValue);
        }
        
        // Add note if there was a normalization
        if (result.note) {
          notes.push({
            row: i + 2,
            col: PROVIDER_DEDUP_CONFIG.COLUMN.INDEX,
            message: result.note
          });
        }
      } else {
        backgrounds[i] = ['#FFFFFF'];
      }
    }
    
    // Apply all changes in batch
    range.setValues(values);
    range.setBackgrounds(backgrounds);
    
    // Add notes
    notes.forEach(function(note) {
      sheet.getRange(note.row, note.col).setNote(note.message);
    });
    
    // Count actual duplicates
    stats.duplicatesFound = 0;
    stats.duplicateMap.forEach(function(variations) {
      if (variations.size > 1) {
        stats.duplicatesFound += variations.size - 1;
      }
    });
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log('Provider deduplication complete in ' + processingTime + ' seconds');
    console.log('Processed: ' + stats.processed + ', Normalized: ' + stats.normalized);
    console.log('Duplicates merged: ' + stats.duplicatesFound);
    console.log('Self-referrals: ' + stats.selfReferrals + ', VA: ' + stats.vaReferrals);
    
    // Generate detailed report
    generateProviderDeduplicationReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error in deduplicateProviders:', error);
    throw new Error('Failed to deduplicate providers: ' + error.message);
  }
}

/**
 * Normalize a single provider name
 * @param {string} providerInput - Raw provider name input
 * @returns {Object} Object with normalized name and metadata
 */
function normalizeProviderName(providerInput) {
  try {
    if (!providerInput) {
      return {
        normalized: '',
        original: '',
        wasNormalized: false,
        backgroundColor: '#FFFFFF',
        category: 'empty'
      };
    }
    
    let provider = providerInput.toString().trim();
    const originalProvider = provider;
    
    // Step 1: Clean the name
    provider = cleanProviderName(provider);
    
    // Step 2: Check normalization map
    const lowerProvider = provider.toLowerCase();
    
    if (PROVIDER_NORMALIZATION_MAP[lowerProvider]) {
      const normalized = PROVIDER_NORMALIZATION_MAP[lowerProvider];
      
      // Determine category
      let category = 'normalized';
      let backgroundColor = PROVIDER_DEDUP_CONFIG.FORMATTING.NORMALIZED_COLOR;
      
      if (normalized === 'Self Referral') {
        category = 'self-referral';
        backgroundColor = PROVIDER_DEDUP_CONFIG.FORMATTING.SELF_REFERRAL_COLOR;
      } else if (normalized === 'VA Medical Center') {
        category = 'va';
        backgroundColor = PROVIDER_DEDUP_CONFIG.FORMATTING.VA_COLOR;
      } else if (normalized === 'Unknown Provider') {
        category = 'unknown';
        backgroundColor = PROVIDER_DEDUP_CONFIG.FORMATTING.UNKNOWN_COLOR;
      } else if (originalProvider !== normalized) {
        backgroundColor = PROVIDER_DEDUP_CONFIG.FORMATTING.DUPLICATE_COLOR;
      }
      
      return {
        normalized: normalized,
        original: originalProvider,
        originalNormalized: provider,
        wasNormalized: originalProvider !== normalized,
        backgroundColor: backgroundColor,
        category: category,
        note: originalProvider !== normalized ? 'Deduplicated from: ' + originalProvider : null
      };
    }
    
    // Step 3: If not in map, apply standard formatting
    provider = standardizeProviderFormat(provider);
    
    return {
      normalized: provider,
      original: originalProvider,
      originalNormalized: provider,
      wasNormalized: provider !== originalProvider,
      backgroundColor: provider !== originalProvider ? 
        PROVIDER_DEDUP_CONFIG.FORMATTING.NORMALIZED_COLOR : '#FFFFFF',
      category: 'standard',
      note: provider !== originalProvider ? 'Formatted from: ' + originalProvider : null
    };
    
  } catch (error) {
    console.error('Error normalizing provider:', error);
    return {
      normalized: providerInput,
      original: providerInput,
      wasNormalized: false,
      backgroundColor: PROVIDER_DEDUP_CONFIG.FORMATTING.UNKNOWN_COLOR,
      category: 'error',
      note: 'Error: ' + error.message
    };
  }
}

/**
 * Main function to deduplicate all provider names
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of deduplication results
 */
function deduplicateProviders(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting provider deduplication...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, duplicates: 0, normalized: 0 };
    }
    
    // Get all provider names at once
    const range = sheet.getRange(2, PROVIDER_DEDUP_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    // Track statistics
    const stats = {
      processed: 0,
      duplicates: 0,
      normalized: 0,
      selfReferrals: 0,
      unknown: 0,
      providerFrequency: new Map(),
      duplicateGroups: new Map()
    };
    
    // Process each provider name
    for (let i = 0; i < values.length; i++) {
      const originalValue = values[i][0];
      
      if (originalValue && originalValue !== '') {
        stats.processed++;
        
        const result = normalizeProviderName(originalValue.toString());
        
        values[i][0] = result.normalized;
        backgrounds[i] = [result.backgroundColor];
        
        // Track statistics
        if (result.wasNormalized) stats.normalized++;
        if (result.category === 'self-referral') stats.selfReferrals++;
        if (result.category === 'unknown') stats.unknown++;
        
        // Track frequency for duplicate detection
        const normalizedKey = result.normalized.toLowerCase();
        if (!stats.providerFrequency.has(normalizedKey)) {
          stats.providerFrequency.set(normalizedKey, []);
        }
        stats.providerFrequency.get(normalizedKey).push(i + 2); // Row number
        
        // Add note if there was a normalization
        if (result.note) {
          notes.push({
            row: i + 2,
            col: PROVIDER_DEDUP_CONFIG.COLUMN.INDEX,
            message: result.note
          });
        }
      } else {
        backgrounds[i] = ['#FFFFFF'];
      }
    }
    
    // Identify duplicate groups (providers appearing more than once)
    stats.providerFrequency.forEach((rows, provider) => {
      if (rows.length > 1) {
        stats.duplicates += rows.length - 1; // Count all except the first as duplicates
        stats.duplicateGroups.set(provider, rows);
      }
    });
    
    // Apply all changes in batch
    range.setValues(values);
    range.setBackgrounds(backgrounds);
    
    // Add notes
    notes.forEach(note => {
      sheet.getRange(note.row, note.col).setNote(note.message);
    });
    
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    console.log(`Provider deduplication complete in ${processingTime} seconds`);
    console.log(`Processed: ${stats.processed}, Normalized: ${stats.normalized}, Duplicates: ${stats.duplicates}`);
    
    // Generate detailed report
    generateProviderDeduplicationReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error in deduplicateProviders:', error);
    throw new Error(`Failed to deduplicate providers: ${error.message}`);
  }
}

/**
 * Normalize a single provider name
 * @param {string} providerInput - Raw provider name input
 * @returns {Object} Object with normalized name and metadata
 */
function normalizeProviderName(providerInput) {
  try {
    if (!providerInput) {
      return {
        normalized: '',
        original: '',
        wasNormalized: false,
        backgroundColor: '#FFFFFF',
        category: 'empty'
      };
    }
    
    let provider = providerInput.toString().trim();
    const originalProvider = provider;
    
    // Step 1: Clean the name first
    provider = cleanProviderName(provider);
    
    // Step 2: Check for special cases
    const lowerProvider = provider.toLowerCase();
    
    // Check for self-referrals
    if (lowerProvider === 'self' || lowerProvider === 'self referral' || 
        lowerProvider === 'patient' || lowerProvider === 'patient referral') {
      return {
        normalized: 'Self Referral',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_DEDUP_CONFIG.FORMATTING.SELF_REFERRAL_COLOR,
        category: 'self-referral',
        note: 'Self referral - no provider involved'
      };
    }
    
    // Check for unknown
    if (lowerProvider === 'unknown' || lowerProvider === 'unknown provider' || 
        lowerProvider === 'n/a' || lowerProvider === '') {
      return {
        normalized: 'Unknown Provider',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_DEDUP_CONFIG.FORMATTING.UNKNOWN_COLOR,
        category: 'unknown',
        note: 'Unknown provider'
      };
    }
    
    // Step 3: Check VA/Government cases
    if (lowerProvider.includes('va ') || lowerProvider.includes('veterans') ||
        lowerProvider.includes('va medical')) {
      return {
        normalized: 'VA Medical Center',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_DEDUP_CONFIG.FORMATTING.NORMALIZED_COLOR,
        category: 'va-referral',
        note: 'VA Medical Center referral'
      };
    }
    
    // Step 4: Apply normalization map
    if (PROVIDER_NORMALIZATION_MAP[lowerProvider]) {
      const normalized = PROVIDER_NORMALIZATION_MAP[lowerProvider];
      return {
        normalized: normalized,
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_DEDUP_CONFIG.FORMATTING.NORMALIZED_COLOR,
        category: 'normalized',
        note: `Standardized from: ${originalProvider}`
      };
    }
    
    // Step 5: Try fuzzy matching if exact match not found
    const fuzzyMatch = findFuzzyMatch(lowerProvider);
    if (fuzzyMatch) {
      return {
        normalized: fuzzyMatch,
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_DEDUP_CONFIG.FORMATTING.NORMALIZED_COLOR,
        category: 'fuzzy-matched',
        note: `Fuzzy matched from: ${originalProvider}`
      };
    }
    
    // Step 6: If still not found, apply proper formatting
    provider = formatProviderName(provider);
    
    return {
      normalized: provider,
      original: originalProvider,
      wasNormalized: provider !== originalProvider,
      backgroundColor: provider !== originalProvider ? 
        PROVIDER_DEDUP_CONFIG.FORMATTING.NORMALIZED_COLOR : '#FFFFFF',
      category: 'formatted',
      note: provider !== originalProvider ? `Formatted from: ${originalProvider}` : null
    };
    
  } catch (error) {
    console.error('Error normalizing provider name:', error);
    return {
      normalized: providerInput,
      original: providerInput,
      wasNormalized: false,
      backgroundColor: PROVIDER_DEDUP_CONFIG.FORMATTING.UNKNOWN_COLOR,
      category: 'error',
      note: `Error: ${error.message}`
    };
  }
}

/**
 * Clean provider name by removing extra spaces and standardizing punctuation
 * @private
 */
function cleanProviderName(name) {
  return name
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/\s*,\s*/g, ', ')      // Standardize comma spacing
    .replace(/\s*\.\s*/g, '.')      // Remove spaces around periods
    .replace(/\.+/g, '.')           // Replace multiple periods with single
    .replace(/\s*-\s*/g, '-')       // Standardize hyphen spacing
    .replace(/[^\w\s,.-]/g, '')     // Remove special characters except comma, period, hyphen
    .trim();
}

/**
 * Find fuzzy match for provider name
 * @private
 */
function findFuzzyMatch(searchName) {
  if (searchName.length < PROVIDER_DEDUP_CONFIG.SIMILARITY.MIN_LENGTH) {
    return null;
  }
  
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [key, value] of Object.entries(PROVIDER_NORMALIZATION_MAP)) {
    const score = calculateSimilarity(searchName, key);
    if (score > highestScore && score >= PROVIDER_DEDUP_CONFIG.SIMILARITY.THRESHOLD) {
      highestScore = score;
      bestMatch = value;
    }
  }
  
  return bestMatch;
}

/**
 * Calculate similarity score between two strings (Levenshtein distance based)
 * @private
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * @private
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,       // insertion
          matrix[i - 1][j] + 1        // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Format provider name with proper capitalization and credentials
 * @private
 */
function formatProviderName(name) {
  // Detect and preserve credentials
  const credentials = ['MD', 'DO', 'NP', 'FNP', 'PA', 'PA-C', 'APRN', 'DNP', 'APN', 'CFNP', 'FNP-BC'];
  let foundCredential = '';
  
  // Check for credentials
  credentials.forEach(cred => {
    const pattern = new RegExp(`\\b${cred}\\b`, 'i');
    if (pattern.test(name)) {
      foundCredential = cred;
      name = name.replace(pattern, '').trim();
    }
  });
  
  // Remove trailing comma if present
  name = name.replace(/,$/, '').trim();
  
  // Proper case the name
  const words = name.split(/\s+/);
  const formattedWords = words.map(word => {
    // Handle special cases (McName, O'Name, etc.)
    if (word.toLowerCase().startsWith('mc') && word.length > 2) {
      return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    if (word.toLowerCase().startsWith("o'") && word.length > 2) {
      return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    
    // Handle hyphenated names
    if (word.includes('-')) {
      return word.split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('-');
    }
    
    // Standard proper case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  let formattedName = formattedWords.join(' ');
  
  // Add credential back if found
  if (foundCredential) {
    formattedName += ', ' + foundCredential;
  }
  
  return formattedName;
}

/**
 * Generate a detailed provider deduplication report
 * @param {Object} stats - Statistics from deduplication
 */
function generateProviderDeduplicationReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('Provider Deduplication Report');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('Provider Deduplication Report');
    } else {
      reportSheet.clear();
    }
    
    // Prepare duplicate analysis
    const duplicateAnalysis = [];
    stats.duplicateGroups.forEach((rows, provider) => {
      duplicateAnalysis.push([
        provider,
        rows.length,
        rows.slice(0, 10).join(', ') + (rows.length > 10 ? '...' : '')
      ]);
    });
    
    // Sort by frequency
    duplicateAnalysis.sort((a, b) => b[1] - a[1]);
    
    // Create report headers
    const headers = [
      ['Provider Deduplication Report'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Statistics'],
      ['Total Processed:', stats.processed],
      ['Names Normalized:', stats.normalized],
      ['Duplicate Entries:', stats.duplicates],
      ['Self Referrals:', stats.selfReferrals],
      ['Unknown Providers:', stats.unknown],
      ['Unique Providers:', stats.providerFrequency.size],
      [''],
      ['Duplicate Provider Groups'],
      ['Provider Name', 'Count', 'Row Numbers']
    ];
    
    // Add headers to sheet
    reportSheet.getRange(1, 1, headers.length, 3).setValues(headers);
    
    // Add duplicate analysis
    if (duplicateAnalysis.length > 0) {
      const topDuplicates = duplicateAnalysis.slice(0, 30); // Top 30
      reportSheet.getRange(14, 1, topDuplicates.length, 3).setValues(topDuplicates);
    }
    
    // Format the report
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(4, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(12, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(13, 1, 1, 3).setFontWeight('bold').setBackground('#E8E8E8');
    
    // Auto-resize columns
    reportSheet.autoResizeColumns(1, 3);
    
    // Add provider frequency chart
    const frequencyStart = 14 + Math.min(duplicateAnalysis.length, 30) + 2;
    const topProviders = Array.from(stats.providerFrequency.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20);
    
    const frequencyHeaders = [
      ['Top 20 Most Frequent Providers'],
      ['Provider', 'Frequency']
    ];
    
    reportSheet.getRange(frequencyStart, 1, frequencyHeaders.length, 2).setValues(frequencyHeaders);
    reportSheet.getRange(frequencyStart, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(frequencyStart + 1, 1, 1, 2).setFontWeight('bold').setBackground('#E8E8E8');
    
    const frequencyData = topProviders.map(([provider, rows]) => [provider, rows.length]);
    if (frequencyData.length > 0) {
      reportSheet.getRange(frequencyStart + 2, 1, frequencyData.length, 2).setValues(frequencyData);
    }
    
    // Add color legend
    const legendStart = frequencyStart + frequencyData.length + 4;
    const legend = [
      ['Color Legend'],
      ['', 'Normalized/Standardized'],
      ['', 'Duplicate Entries'],
      ['', 'Self Referrals'],
      ['', 'Unknown Providers']
    ];
    
    reportSheet.getRange(legendStart, 1, legend.length, 2).setValues(legend);
    reportSheet.getRange(legendStart, 1).setFontWeight('bold');
    
    // Apply colors to legend
    reportSheet.getRange(legendStart + 1, 1).setBackground(PROVIDER_DEDUP_CONFIG.FORMATTING.NORMALIZED_COLOR);
    reportSheet.getRange(legendStart + 2, 1).setBackground(PROVIDER_DEDUP_CONFIG.FORMATTING.DUPLICATE_COLOR);
    reportSheet.getRange(legendStart + 3, 1).setBackground(PROVIDER_DEDUP_CONFIG.FORMATTING.SELF_REFERRAL_COLOR);
    reportSheet.getRange(legendStart + 4, 1).setBackground(PROVIDER_DEDUP_CONFIG.FORMATTING.UNKNOWN_COLOR);
    
    console.log('Provider deduplication report generated');
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

/**
 * Find all duplicate provider entries
 */
function findDuplicateProviders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to analyze');
    return;
  }
  
  const range = sheet.getRange(2, PROVIDER_DEDUP_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  const backgrounds = range.getBackgrounds();
  
  const providerMap = new Map();
  
  // Find duplicates
  values.forEach((row, index) => {
    const provider = row[0];
    if (provider && provider !== '') {
      const normalized = normalizeProviderName(provider.toString()).normalized.toLowerCase();
      if (!providerMap.has(normalized)) {
        providerMap.set(normalized, []);
      }
      providerMap.get(normalized).push(index);
    }
  });
  
  // Highlight duplicates
  let duplicateCount = 0;
  providerMap.forEach((indices, provider) => {
    if (indices.length > 1) {
      duplicateCount += indices.length - 1;
      indices.forEach(index => {
        backgrounds[index][0] = PROVIDER_DEDUP_CONFIG.FORMATTING.DUPLICATE_COLOR;
      });
    }
  });
  
  range.setBackgrounds(backgrounds);
  
  SpreadsheetApp.getUi().alert(
    `Found ${duplicateCount} duplicate provider entries.\n` +
    `Unique providers: ${providerMap.size}\n\n` +
    `Check the Provider Deduplication Report for details.`
  );
}

/**
 * Menu function to deduplicate providers only
 */
function deduplicateProvidersOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = deduplicateProviders(sheet);
  SpreadsheetApp.getUi().alert(
    `Provider deduplication complete.\n\n` +
    `Processed: ${stats.processed}\n` +
    `Normalized: ${stats.normalized}\n` +
    `Duplicates found: ${stats.duplicates}\n` +
    `Self-referrals: ${stats.selfReferrals}\n` +
    `Unknown: ${stats.unknown}\n` +
    `Unique providers: ${stats.providerFrequency.size}`
  );
}

/**
 * Validate providers without modifying them
 */
function validateProviders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const range = sheet.getRange(2, PROVIDER_DEDUP_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  let emptyCount = 0;
  let unknownCount = 0;
  let selfReferralCount = 0;
  let needsNormalization = 0;
  
  values.forEach((row, index) => {
    const provider = row[0];
    if (!provider || provider === '') {
      emptyCount++;
    } else {
      const result = normalizeProviderName(provider.toString());
      if (result.category === 'unknown') unknownCount++;
      if (result.category === 'self-referral') selfReferralCount++;
      if (result.wasNormalized) needsNormalization++;
    }
  });
  
  SpreadsheetApp.getUi().alert(
    `Provider Validation Results:\n\n` +
    `Empty fields: ${emptyCount}\n` +
    `Unknown providers: ${unknownCount}\n` +
    `Self-referrals: ${selfReferralCount}\n` +
    `Needs normalization: ${needsNormalization}\n\n` +
    `Run "Deduplicate Providers" to fix these issues.`
  );
  
  return {
    emptyCount,
    unknownCount,
    selfReferralCount,
    needsNormalization,
    totalIssues: emptyCount + unknownCount + needsNormalization
  };
}