/**
 * Provider Name Normalization Module - Version 4 (Comprehensive)
 * @module ProviderNormalizationV4
 * @description Complete provider deduplication and standardization system
 * @author Medical Referral System
 * @version 4.0 - Standalone Module
 */

/**
 * Configuration for provider normalization V4
 */
const PROVIDER_V4_CONFIG = {
  COLUMN: {
    INDEX: 5,  // Column E - Referring Provider
    LETTER: 'E'
  },
  FORMATTING: {
    CORRECTED_COLOR: '#E6F3FF',      // Light blue for corrected entries
    SELF_REFERRAL_COLOR: '#FFF3CD',  // Light yellow for self-referrals
    VA_COLOR: '#E8F5E9',              // Light green for VA referrals
    UNKNOWN_COLOR: '#FFE6E6',         // Light red for unknown providers
    DUPLICATE_COLOR: '#FFE6CC'        // Light orange for consolidated duplicates
  },
  BATCH_SIZE: 500,  // Process in batches for better performance
  CREATE_BACKUP: true
};

/**
 * Master provider standardization dictionary V4
 * Complete mapping of all provider variations
 */
const PROVIDER_V4_DICTIONARY = {
  // ========== A Providers ==========
  'abdullah arshad': 'Abdullah Arshad, MD',
  'abdullah arshad md': 'Abdullah Arshad, MD',
  'abdullah arshad, md': 'Abdullah Arshad, MD',
  
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
  
  'adrean stamper': 'Adrean Stamper, NP',
  'adrean stamper, np': 'Adrean Stamper, NP',
  
  'ahmad al shyoukh': 'Ahmad Al Shyoukh, MD',
  
  'ahsan': 'Mohammad Ahsan, MD',
  'ar. ahsan': 'Mohammad Ahsan, MD',
  'ar. ahsan, md': 'Mohammad Ahsan, MD',
  'muhammad ahsan': 'Mohammad Ahsan, MD',
  
  'aimee stooksberry': 'Amiee Stooksberry, APRN',
  'amiee stooksberry': 'Amiee Stooksberry, APRN',
  'amiee stooksberry, aprn': 'Amiee Stooksberry, APRN',
  'amiee stooksberry, np': 'Amiee Stooksberry, APRN',
  
  'alan weatherford': 'Alan Weatherford, PA-C',
  'alan weatherford, pa-c': 'Alan Weatherford, PA-C',
  
  'albert earle weeks': 'Albert Earle Weeks, MD',
  'albert earle weeks, md': 'Albert Earle Weeks, MD',
  
  'aleica graden': 'Alicia Graden, FNP',
  'alesia branson': 'Alesia Branson, NP',
  
  'alexandra buckland': 'Alexandra Buckland, NP',
  'alexandra buckland, np': 'Alexandra Buckland, NP',
  
  'alexandra burns': 'Alexandra Burns, FNP',
  'alexandra burns, fnp': 'Alexandra Burns, FNP',
  'alexandra burns, np': 'Alexandra Burns, FNP',
  
  'alexandra korshun': 'Alexandra Korshun, MD',
  'alexandra korshun, md': 'Alexandra Korshun, MD',
  
  'alicia gradeb': 'Alicia Graden, FNP',
  'alicia graden': 'Alicia Graden, FNP',
  'alicia graden, fnp': 'Alicia Graden, FNP',
  
  'alicia landers': 'Alicia Landers, NP',
  'alicia landers, np': 'Alicia Landers, NP',
  
  'alicia springer': 'Alicia Springer, NP',
  'alicia springer n. p': 'Alicia Springer, NP',
  'alicia springer, np': 'Alicia Springer, NP',
  
  'alisha gupta': 'Alisha Gupta, MD',
  'alisha gupta, md': 'Alisha Gupta, MD',
  
  'alisha lowe': 'Alisha Lowe, NP',
  
  'alison moore': 'Alison Moore, NP',
  'alison moore, np': 'Alison Moore, NP',
  
  'all care medical': 'All Care Medical',
  
  'allie alexander-lusk': 'Allie Alexander-Lusk, NP',
  
  'allison adams': 'Allison Adams, NP',
  'allison castleman': 'Allison Castleman, NP',
  
  'allison jowers': 'Allison Jowers, PA-C',
  'allison jowers, pa': 'Allison Jowers, PA-C',
  'allison jowers, pa-c': 'Allison Jowers, PA-C',
  
  'alvin james miller': 'Alvin James Miller, MD',
  
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
  'amanda fuller-fnp-bc': 'Amanda Fuller, FNP-BC',
  'amanda fuller, fnp-bc': 'Amanda Fuller, FNP-BC',
  'amanda fuller, np': 'Amanda Fuller, FNP-BC',
  
  'amanda hearn': 'Amanda Hearn, NP',
  'amanda hearn, np': 'Amanda Hearn, NP',
  
  'amanda keown': 'Amanda Keown, NP',
  
  'amanda moore': 'Amanda Moore, NP',
  'amanda moore, np': 'Amanda Moore, NP',
  
  'amanda nold': 'Amanda Nold, PA',
  'amanda nold, pa': 'Amanda Nold, PA',
  
  'amanda polman': 'Amanda Polman, FNP-C',
  'amanda polman, fnp': 'Amanda Polman, FNP-C',
  'amanda polman, fnp-c': 'Amanda Polman, FNP-C',
  
  'amanda rongey': 'Amanda Rongey, NP',
  
  'amanda taylor': 'Amanda Taylor, NP',
  
  'amanda tuner': 'Amanda Turner, FNP',
  'amanda tuner, fnp': 'Amanda Turner, FNP',
  'amanda tuner, np': 'Amanda Turner, FNP',
  'amanda turner': 'Amanda Turner, FNP',
  'amanda turner, fnp': 'Amanda Turner, FNP',
  
  'amber fern': 'Amber Fern, NP',
  
  'amber steele': 'Amber Steele, FNP-C',
  'amber steele, fnp': 'Amber Steele, FNP-C',
  'amber steele, fnp-c': 'Amber Steele, FNP-C',
  
  'amber taylor': 'Amber Taylor, NP',
  
  'amedysis': 'Amedisys',
  
  'amie roland': 'Amie Roland, FNP',
  'amie roland, fnp': 'Amie Roland, FNP',
  
  'amy jackson smith': 'Amy Jackson Smith, PA-C',
  'amy jackson smith, pa-c': 'Amy Jackson Smith, PA-C',
  'amy smith': 'Amy Smith, PA-C',
  'amy smith, pa': 'Amy Smith, PA-C',
  
  'amy lawrence': 'Amy Lawrence, NP',
  
  'amy medford': 'Amy Medford, FNP',
  'amy medford, fnp': 'Amy Medford, FNP',
  
  'amy myers': 'Amy Myers, NP',
  'amy myers, np': 'Amy Myers, NP',
  
  'amy turner': 'Amy Turner, NP',
  'amy wynn': 'Amy Wynn, NP',
  
  'andrea hay': 'Andrea Hay, FNP',
  'andrea hay, fnp': 'Andrea Hay, FNP',
  
  'andrea melvin': 'Andrea Melvin, NP',
  
  'andrea swain': 'Andrea Swain, NP',
  'andria swain': 'Andrea Swain, NP',
  
  'andrew coleman': 'Andrew Coleman, MD',
  'andrew coleman, md': 'Andrew Coleman, MD',
  
  'andrew murphy': 'Andrew Murphy, MD',
  'andrew murphy, md': 'Andrew Murphy, MD',
  
  'andrew myers': 'Andrew Myers, MD',
  'andrew myers, md': 'Andrew Myers, MD',
  
  // ========== B through Z - Continuing with key entries ==========
  
  // B Section
  'belinda hilliard': 'Belinda Hilliard Presley, DNP',
  'belinda presley': 'Belinda Hilliard Presley, DNP',
  'benjamin reese': 'Benjamin Reese, PA-C',
  'beth graves': 'Deborah Graves, FNP',
  'bethany kelly': 'Bethany Kelly, NP',
  'brandon pate': 'Brandon Pate, FNP',
  'brittany lynch': 'Brittany Lynch, APRN',
  'brooke garner': 'Brooke Garner, FNP-C',
  
  // C Section
  'cassidy belew': 'Cassidy Belew, FNP-C',
  'christy ward': 'Christy Ward, FNP',
  'christopher marshall': 'Christopher Marshall, MD',
  'courtney faught': 'Courtney Faught, FNP',
  'cynthia carroll': 'Cynthia Carroll, FNP',
  
  // D Section
  'david seaton': 'David L. Seaton, MD',
  'david l. seaton': 'David L. Seaton, MD',
  'deborah graves': 'Deborah Graves, FNP',
  'debra cannon': 'Debra Cannon, FNP',
  
  // E Section
  'earl stewart': 'Earl Stewart, MD',
  'elizabeth anderson': 'Elizabeth Anderson, FNP-C',
  'emily miller': 'Emily Miller, APRN',
  'eric hart': 'Eric Hart, PA-C',
  
  // F Section
  'forrest busch': 'Forrest Busch, DO',
  'fred cox': 'F. Gregory Cox, MD',
  'f. gregory cox': 'F. Gregory Cox, MD',
  
  // G Section
  'gregory franz': 'Gregory B. Franz, MD',
  'gary blount': 'Gary Blount, PA-C',
  
  // H Section
  'hailee tillery': 'Hailee Tillery, FNP',
  'heather haddock': 'Heather Haddock, FNP',
  
  // J Section
  'james williams': 'James L. Williams II, MD',
  'jessica rains': 'Jessica Rains, PA-C',
  'john clendenin': 'John B. Clendenin, MD',
  'joseph peters': 'Joseph Peters, MD',
  
  // K Section
  'karen webb': 'Karen E. Webb, APN-BC',
  'kathy banks': 'Kathy Banks, FNP-C',
  'kenneth carr': 'Kenneth Carr, MD',
  
  // L Section
  'laurel campbell': 'Laurel Campbell, MD',
  'lisa hunt': 'Lisa Hunt, APN',
  'lisa king': 'Lisa King, NP',
  
  // M Section
  'michael bryant': 'Michael L. Bryant, MD',
  'michelle roberts': 'Michelle Roberts, NP',
  
  // N Section
  'nicole jennings': 'Nicole Jennings, MD',
  
  // P Section
  'paul scates': 'Paul Scates, MD',
  'paul scates, md': 'Paul Scates, MD',
  'scates paul e, md': 'Paul Scates, MD',
  
  // R Section
  'robert day': 'Robert Day, MD',
  'ruby turner': 'Ruby Turner, NP',
  
  // S Section
  'samuel johnson jr': 'Samuel T. Johnson Jr, MD',
  'sarah huffstetler': 'Sarah E. Huffstetler, APRN',
  'scott miskelly': 'R. Scott Miskelly, FNP',
  'stephanie coleman': 'Stephanie Coleman, FNP',
  'suzette stanley': 'Suzette Stanley, APN',
  
  // T Section
  'tanveer aslam': 'Tanveer Aslam, MD',
  'tiffany simpson': 'Tiffany Simpson, FNP',
  
  // W Section
  'william turner': 'William Turner, MD',
  'william mckee': 'William McKee, MD',
  
  // Y Section
  'yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh, md': 'Kumar Yogesh, MD',
  
  // ========== Special Cases ==========
  'self referral': 'Self Referral',
  'self': 'Self Referral',
  'patient referral': 'Self Referral',
  
  'unknown provider': 'Unknown Provider',
  'unknown': 'Unknown Provider',
  
  'va medical center': 'VA Medical Center',
  'veterans administration medical center': 'VA Medical Center',
  'veterans administration referral': 'VA Medical Center',
  'veterans administration referred': 'VA Medical Center',
  
  'in epic': 'In Epic',
  'sent through fax que': 'Sent Through Fax Queue',
  
  'diabetes center of jackson': 'Diabetes Center of Jackson',
  'lebonheur': 'LeBonheur',
  'harborview': 'Harborview Health Systems',
  'haborveiw': 'Harborview Health Systems',

  //additional
  // ========== A ==========
  'abdullah arshad': 'Abdullah Arshad, MD',
  'abdullah arshad, md': 'Abdullah Arshad, MD',
  
  'adam english': 'Adam English, DO',
  'adam english, do': 'Adam English, DO',
  
  'adenike adedeji': 'Adenike Adedeji, FNP',
  'adenike adedeji, fnp': 'Adenike Adedeji, FNP',
  
  'adeyinka agbetoyin': 'Adeyinka Agbetoyin, MD',
  'adeyinka agbetoyin, md': 'Adeyinka Agbetoyin, MD',
  
  'adil ayub': 'Adil Ayub, MD',
  'adil ayub, md': 'Adil Ayub, MD',
  
  'adrean stamper': 'Adrean Stamper, FNP',
  'adrean stamper, fnp': 'Adrean Stamper, FNP',
  
  'ahmad al shyoukh': 'Ahmad Al Shyoukh, MD',
  'ahmad al shyoukh, md': 'Ahmad Al Shyoukh, MD',
  
  'alan weatherford': 'Alan Weatherford, PA-C',
  'alan weatherford, pa-c-c': 'Alan Weatherford, PA-C',
  'alan weatherford, pa-c': 'Alan Weatherford, PA-C',
  
  'albert earle weeks': 'Albert Earle Weeks, MD',
  'albert earle weeks, md': 'Albert Earle Weeks, MD',
  
  'alesia branson': 'Alesia Branson, FNP',
  'alesia branson, fnp': 'Alesia Branson, FNP',
  
  'alexandra buckland': 'Alexandra Buckland, FNP',
  'alexandra buckland, fnp': 'Alexandra Buckland, FNP',
  
  'alexandra burns': 'Alexandra Burns, FNP',
  'alexandra burns, fnp': 'Alexandra Burns, FNP',
  
  'alexandra korshun': 'Alexandra Korshun, MD',
  'alexandra korshun, md': 'Alexandra Korshun, MD',
  
  'alicia graden': 'Alicia Graden, FNP',
  'alicia graden, fnp': 'Alicia Graden, FNP',
  
  'alicia landers': 'Alicia Landers, FNP',
  'alicia landers, fnp': 'Alicia Landers, FNP',
  
  'alicia springer': 'Alicia Springer, FNP',
  'alicia springer, fnp': 'Alicia Springer, FNP',
  
  'alisha gupta': 'Alisha Gupta, MD',
  'alisha gupta, md': 'Alisha Gupta, MD',
  
  'alisha lowe': 'Alisha Lowe, FNP',
  'alisha lowe, fnp': 'Alisha Lowe, FNP',
  
  'alison moore': 'Alison Moore, FNP',
  'alison moore, fnp': 'Alison Moore, FNP',
  
  'all care medical': 'All Care Medical',
  
  'allie alexander-lusk': 'Allie Alexander-Lusk, FNP',
  'allie alexander-lusk, fnp': 'Allie Alexander-Lusk, FNP',
  
  'allison adams': 'Allison Adams, FNP',
  'allison adams, fnp': 'Allison Adams, FNP',
  
  'allison castleman': 'Allison Castleman, FNP',
  'allison castleman, fnp': 'Allison Castleman, FNP',
  
  'allison jowers': 'Allison Jowers, PA-C',
  'allison jowers, -c, pa': 'Allison Jowers, PA-C',
  'allison jowers, pa-c': 'Allison Jowers, PA-C',
  
  'alvin james miller': 'Alvin James Miller, MD',
  'alvin james miller, md': 'Alvin James Miller, MD',
  
  'amanda fuller': 'Amanda Fuller, FNP',
  'amanda fuller, fnp-bc': 'Amanda Fuller, FNP',
  'amanda fuller, fnp': 'Amanda Fuller, FNP',
  
  'amanda hearn': 'Amanda Hearn, FNP',
  'amanda hearn, fnp': 'Amanda Hearn, FNP',
  
  'amanda keown': 'Amanda Keown, FNP',
  'amanda keown, fnp': 'Amanda Keown, FNP',
  
  'amanda moore': 'Amanda Moore, FNP',
  'amanda moore, fnp': 'Amanda Moore, FNP',
  
  'amanda nold': 'Amanda Nold, PA-C',
  'amanda nold, -c, pa': 'Amanda Nold, PA-C',
  'amanda nold, pa-c': 'Amanda Nold, PA-C',
  
  'amanda polman': 'Amanda Polman, FNP',
  'amanda polman, fnp': 'Amanda Polman, FNP',
  
  'amanda rongey': 'Amanda Rongey, FNP',
  'amanda rongey, fnp': 'Amanda Rongey, FNP',
  
  'amanda russell': 'Amanda Russell, FNP',
  'amanda russell, fnp': 'Amanda Russell, FNP',
  
  'amanda taylor': 'Amanda Taylor, FNP',
  'amanda taylor, fnp': 'Amanda Taylor, FNP',
  
  'amanda turner': 'Amanda Turner, FNP',
  'amanda turner, fnp': 'Amanda Turner, FNP',
  
  'amber fern': 'Amber Fern, FNP',
  'amber fern, fnp': 'Amber Fern, FNP',
  
  'amber steele': 'Amber Steele, FNP',
  'amber steele, fnp': 'Amber Steele, FNP',
  
  'amber taylor': 'Amber Taylor, FNP',
  'amber taylor, fnp': 'Amber Taylor, FNP',
  
  'amedisys': 'Amedisys',
  
  'amie roland': 'Amie Roland, FNP',
  'amie roland, fnp': 'Amie Roland, FNP',
  
  'amiee stooksberry': 'Amiee Stooksberry, APRN',
  'amiee stooksberry, aprn': 'Amiee Stooksberry, APRN',
  
  'amy jackson smith': 'Amy Smith, PA-C',
  'amy smith': 'Amy Smith, PA-C',
  'amy smith, pa-c-c': 'Amy Smith, PA-C',
  'amy smith,-c, pa-c-c': 'Amy Smith, PA-C',
  'amy smith, pa-c': 'Amy Smith, PA-C',
  'amy jackson smith, -c, pa': 'Amy Smith, PA-C',
  
  'amy lawrence': 'Amy Lawrence, FNP',
  'amy lawrence, fnp': 'Amy Lawrence, FNP',
  
  'amy medford': 'Amy Medford, FNP',
  'amy medford, fnp': 'Amy Medford, FNP',
  
  'amy myers': 'Amy Myers, FNP',
  'amy myers, fnp': 'Amy Myers, FNP',
  
  'amy turner': 'Amy Turner, FNP',
  'amy turner, fnp': 'Amy Turner, FNP',
  
  'amy wynn': 'Amy Wynn, FNP',
  'amy wynn, fnp': 'Amy Wynn, FNP',
  
  'andrea hay': 'Andrea Hay, FNP',
  'andrea hay, fnp': 'Andrea Hay, FNP',
  
  'andrea melvin': 'Andrea Melvin, FNP',
  'ashleigh melvin': 'Andrea Melvin, FNP',
  'ashleigh melvin, fnp': 'Andrea Melvin, FNP',
  'andrea melvin, fnp': 'Andrea Melvin, FNP',
  
  'andrea swain': 'Andrea Swain, FNP',
  'andrea swain, fnp': 'Andrea Swain, FNP',
  
  'andrew coleman': 'Andrew Coleman, MD',
  'andrew coleman, md': 'Andrew Coleman, MD',
  
  'andrew murphy': 'Andrew Murphy, MD',
  'andrew murphy, md': 'Andrew Murphy, MD',
  
  'andrew myers': 'Andrew Myers, MD',
  'andrew myers, md': 'Andrew Myers, MD',
  
  'angel warren': 'Angel Warren, FNP',
  'angel warren, fnp': 'Angel Warren, FNP',
  
  'angela constant': 'Angela Constant, FNP',
  'angela constant, fnp': 'Angela Constant, FNP',
  
  'angela cursey': 'Angela Cursey, FNP',
  'angela cursey, fnp': 'Angela Cursey, FNP',
  
  'angela mealer': 'Angela Mealer, FNP',
  'angela mealer, fnp': 'Angela Mealer, FNP',
  
  'angela odell': 'Angela Odell',
  
  'angela quick': 'Angela Quick',
  
  'angela tippitt': 'Angela Tippitt, FNP',
  'angela tippitt, fnp': 'Angela Tippitt, FNP',
  
  'angela upchurch': 'Angela Upchurch',
  
  'angela uta': 'Angela Uta, FNP',
  'angela uta, fnp': 'Angela Uta, FNP',
  
  'angela warren': 'Angela Warren',
  
  'angeli jain': 'Angeli Jain, MD',
  'angeli jain, md': 'Angeli Jain, MD',
  
  'annie k.massey': 'Annie Kate Massey, PA-C',
  'annie kate massey': 'Annie Kate Massey, PA-C',
  'annie kate massey, pa-c-c': 'Annie Kate Massey, PA-C',
  'annie k.massey, pa-c-c': 'Annie Kate Massey, PA-C',
  'annie kate massey, pa-c': 'Annie Kate Massey, PA-C',
  
  'anshul bhalla': 'Anshul Bhalla, MD',
  'anshul bhalla, md': 'Anshul Bhalla, MD',
  
  'april mckinney': 'April McKinney',
  
  'april nichols': 'April Nichols',
  
  'april walker': 'April Walker, FNP',
  'april walker, fnp': 'April Walker, FNP',
  
  'ar.ahsan': 'Mohammad Ahsan, MD',
  'ar.ahsan, md': 'Mohammad Ahsan, MD',
  'mohammad ahsan': 'Mohammad Ahsan, MD',
  'mohammad ahsan, md': 'Mohammad Ahsan, MD',
  
  'archie wright': 'Archie Wright, MD',
  'archie wright, md': 'Archie Wright, MD',
  
  'ariel diza': 'Ariel Diza',
  
  'arun rao': 'Arun Rao',
  
  'ashleigh mcintosh': 'Ashleigh McIntosh, FNP',
  'ashleigh mcintosh, fnp': 'Ashleigh McIntosh, FNP',
  
  'ashley baker': 'Ashley Baker, FNP',
  'ashley baker, fnp': 'Ashley Baker, FNP',
  
  'ashley caldwell': 'Ashley Caldwell, FNP',
  'ashley caldwell, fnp': 'Ashley Caldwell, FNP',
  
  'ashley freeman': 'Ashley Freeman, FNP',
  'ashley freeman, fnp': 'Ashley Freeman, FNP',
  
  'ashley gullett': 'Ashley Gullett',
  
  'ashley pennington': 'Ashley Pennington, FNP',
  'ashley pennington, fnp': 'Ashley Pennington, FNP',
  
  'ashley shaw': 'Ashley Shaw, FNP',
  'ashley shaw, fnp': 'Ashley Shaw, FNP',
  
  'ashraf alqaqa': 'Ashraf Alqaqa, MD',
  'ashraf alqaqa, md': 'Ashraf Alqaqa, MD',
  
  'autumn ellis': 'Autumn Ellis',
  'autun ellis': 'Autumn Ellis',
  
  'ayesha jaleel': 'Ayesha Jaleel',
  
  'ayesha tribble': 'Ayesha Tribble',
  
  'ayodele olusanya': 'Ayodele Olusanya',
  
  'ayush shrestha': 'Ayush Shrestha',
  
  // ========== B ==========
  'barry wall': 'Barry Wall',
  
  'beatrice concepcion': 'Beatrice Concepcion',
  
  'beckie johnson': 'Beckie Johnson',
  
  'becky bruce': 'Becky Bruce, FNP',
  'becky bruce, fnp': 'Becky Bruce, FNP',
  
  'belinda hilliard presley': 'Belinda Hilliard Presley, DNP',
  'belinda hilliard presley, dnp': 'Belinda Hilliard Presley, DNP',
  
  'ben rees': 'Benjamin Reese, PA-C',
  'ben rees, pa-c-c': 'Benjamin Reese, PA-C',
  'ben reese': 'Benjamin Reese, PA-C',
  'ben reese, pa-c-c': 'Benjamin Reese, PA-C',
  'ben reese., pa-c-c': 'Benjamin Reese, PA-C',
  'benjamin reese': 'Benjamin Reese, PA-C',
  'benjamin reese, pa-c-c': 'Benjamin Reese, PA-C',
  'benjamin reese,-c, pa-c-c': 'Benjamin Reese, PA-C',
  'benjamin reese, pa-c': 'Benjamin Reese, PA-C',
  
  'beth graves': 'Beth Graves, FNP',
  'beth graves, fnp': 'Beth Graves, FNP',
  
  'beth henson': 'Beth Hinson, FNP',
  'beth hinson': 'Beth Hinson, FNP',
  'beth hinson, fnp': 'Beth Hinson, FNP',
  
  'beth ruiz': 'Beth Ruiz, PA-C',
  'beth ruiz, -c, pa': 'Beth Ruiz, PA-C',
  'beth ruiz, pa-c': 'Beth Ruiz, PA-C',
  
  'bethany jackson': 'Bethany Jackson, MD',
  'bethany jackson, md': 'Bethany Jackson, MD',
  
  'bethany kelley': 'Bethany Kelley, FNP',
  'bethany kelly': 'Bethany Kelley, FNP',
  'bethany kelley, fnp': 'Bethany Kelley, FNP',
  'bethany kelly, fnp': 'Bethany Kelley, FNP',
  
  'bethany mcswain': 'Bethany McSwain',
  
  'bethany russell': 'Bethany Russell',
  
  'betsy akin': 'Betsy Akin, FNP',
  'betsy akin, fnp': 'Betsy Akin, FNP',
  
  'betty roe': 'Betty Roe, FNP',
  'betty roe, fnp': 'Betty Roe, FNP',
  
  'beverly mccann': 'Beverly McCann, FNP',
  'beverly mccann, fnp': 'Beverly McCann, FNP',
  
  'bmh uc': 'BMH UC',
  
  'bourji': 'Bourji',
  
  'brad adkins': 'Brad Adkins',
  
  'brad creekmore': 'Brad Creekmore, MD',
  'brad creekmore, md': 'Brad Creekmore, MD',
  
  'bradley gatlin': 'Bradley Gatlin, FNP',
  'bradley gatlin, fnp': 'Bradley Gatlin, FNP',
  
  'brandi rose': 'Brandi Rose, FNP',
  'brandi rose, fnp': 'Brandi Rose, FNP',
  
  'brandon churchill': 'Brandon Churchill',
  'brandon churchill ssd': 'Brandon Churchill',
  
  'brandon pate': 'Brandon Pate, FNP',
  'brandon pate, fnp': 'Brandon Pate, FNP',
  
  'brandy latham steelman': 'Brandy Steelman, FNP',
  'brandy steelman': 'Brandy Steelman, FNP',
  'brandy steelman, fnp': 'Brandy Steelman, FNP',
  'steelman': 'Brandy Steelman, FNP',
  
  'brandy rogers': 'Brandy Rogers, FNP',
  'brandy rogers, fnp': 'Brandy Rogers, FNP',
  
  'brenda dexter': 'Brenda Dexter',
  
  'brenda richardson': 'Brenda Richardson',
  
  'brenda springfield': 'Brenda Springfield',
  
  'brent amzow': 'Brent Zamzow, MD',
  'brent zamzow': 'Brent Zamzow, MD',
  'zamzow': 'Brent Zamzow, MD',
  'brent zamzow, md': 'Brent Zamzow, MD',
  
  'brent rudder': 'Michiel Rudder, FNP',
  'brent rudder, fnp': 'Michiel Rudder, FNP',
  
  'brian fullwood': 'Brian Fullwood',
  
  'bran mccarver': 'Brian McCarver, MD',
  'brian mccarver': 'Brian McCarver, MD',
  'bran mccarver, md': 'Brian McCarver, MD',
  'brian mccarver, md': 'Brian McCarver, MD',
  
  'brian qualls': 'Brian Qualls',
  
  'brittany bennett': 'Brittany Bennett',
  
  'brittany lynch': 'Brittany Lynch, APRN',
  'brittany lynch aprn': 'Brittany Lynch, APRN',
  'brittany lynch, aprn': 'Brittany Lynch, APRN',
  'brittany lynch aprn and dr.charlotte coleman, md': 'Brittany Lynch, APRN',
  
  'brittany proudfit': 'Brittany Proudfit, FNP',
  'brittany proudfit, fnp': 'Brittany Proudfit, FNP',
  
  'brittany rauchle': 'Brittany Rauchle, FNP',
  'brittany rauchle, fnp': 'Brittany Rauchle, FNP',
  
  'brooke bedwell': 'Brooke Bedwell, FNP',
  'brooke bedwell, fnp': 'Brooke Bedwell, FNP',
  
  'brooke creasy': 'Brooke Creasy',
  
  'brooke garner': 'Brooke Garner, FNP',
  'brooke garner, fnp': 'Brooke Garner, FNP',
  'brooke garner,-c, fnp': 'Brooke Garner, FNP',
  
  'brownsville family medicine': 'Brownsville Family Medicine',
  
  'bruce brown': 'Bruce Brown',
  
  'bryan merrick': 'Bryan Merrick',
  
  'bryan tygart': 'Bryan Tygart, MD',
  'bryan tygart, md': 'Bryan Tygart, MD',
  
  'bryant michael': 'Michael L. Bryant, MD',
  'bryant michael, md': 'Michael L. Bryant, MD',
  
  'buffy cook': 'Buffy Cook, MD',
  'buffy cook, md': 'Buffy Cook, MD',
  'buffy jay cook': 'Buffy Cook, MD',
  
  'byron breeding': 'Byron Breeding, PA-C',
  'byron breeding, pa-c': 'Byron Breeding, PA-C',
  'byron breeding, pa-c-c': 'Byron Breeding, PA-C',
  
  // ========== C ==========
  'caitlin hawkins': 'Caitlin Hawkins, PA-C',
  'caitlin hawkins, -c, pa': 'Caitlin Hawkins, PA-C',
  'caitlin hawkins, pa-c': 'Caitlin Hawkins, PA-C',
  
  'caitlin wamble': 'Caitlin Wamble',
  
  'caitlyn trostel': 'Caitlyn Trostel',
  
  'candace rowland': 'Candace Rowland',
  
  'candice jones': 'Candice Jones, DO',
  'candice jones, do': 'Candice Jones, DO',
  'candice l jones': 'Candice Jones, DO',
  'candice l jones, do': 'Candice Jones, DO',
  
  'cara roberson': 'Cara Roberson, FNP',
  'cara roberson, fnp': 'Cara Roberson, FNP',
  
  'care rite pllc': 'CareRite, PLLC',
  'carerite pllc': 'CareRite, PLLC',
  
  'carey frix': 'Carey Frix, MD',
  'carey frix, md': 'Carey Frix, MD',
  
  'carie cox': 'Carie Cox, FNP',
  'carie cox, fnp': 'Carie Cox, FNP',
  
  'carla': 'Carla',
  
  'carmel verrier': 'Carmel Verrier',
  
  'carol guess': 'Carol Guess, MD',
  'carol guess, md': 'Carol Guess, MD',
  'cw guess': 'Carol Guess, MD',
  
  'carol newman': 'Carol Newman',
  
  'carolyn m.newman': 'Carolyn M. Newman, FNP',
  'carolyn m.newman, fnp': 'Carolyn M. Newman, FNP',
  
  'carolyn marcum': 'Carolyn Marcum',
  
  'carr': 'Carr',
  
  'carter': 'Carter',
  
  'cassidy belew': 'Cassidy Belew, FNP',
  'cassidy belew, fnp': 'Cassidy Belew, FNP',
  'cassidy belew,-c, fnp': 'Cassidy Belew, FNP',
  
  'chad scott': 'Chad Scott, FNP',
  'chad scott, fnp': 'Chad Scott, FNP',
  
  'charles leckie': 'Charles Leckie',
  
  'charles neal': 'Charles Neal',
  
  'charleston wallace': 'Charleston Wallace, FNP',
  'charleston wallace, fnp': 'Charleston Wallace, FNP',
  
  'chasity campbell': 'Chasity Campbell, FNP',
  'chasity campbell, fnp': 'Chasity Campbell, FNP',
  
  'chelsea shannon': 'Chelsea Shannon',
  
  'chelsey parks': 'Chelsey Parks, DNP',
  'chelsey parks, dnp': 'Chelsey Parks, DNP',
  'chelsey parks, fnp': 'Chelsey Parks, DNP',
  
  'cheryl middleton': 'Cheryl Middleton, FNP',
  'cheryl middleton, fnp': 'Cheryl Middleton, FNP',
  
  'chibuzo nwokolo': 'Chibuzo Nwokolo, MD',
  'chibuzo nwokolo, md': 'Chibuzo Nwokolo, MD',
  
  'chris ledbetter': 'Chris Ledbetter',
  
  'christa bane': 'Christa Bane',
  
  'christie king patterson': 'Christie King Patterson, FNP',
  'christie king patterson, fnp': 'Christie King Patterson, FNP',
  
  'christian gray': 'Christin Gray, FNP',
  'christin gray': 'Christin Gray, FNP',
  'christian gray, fnp': 'Christin Gray, FNP',
  'christin gray, fnp': 'Christin Gray, FNP',
  
  'christopher davidson': 'Christopher Davidson',
  
  'christopher ingelmo': 'Christopher Ingelmo',
  
  'christopher knight': 'Christopher Knight, MD',
  'christopher knight, md': 'Christopher Knight, MD',
  
  'christopher d marshall': 'Christopher Marshall, MD',
  'christopher marshall': 'Christopher Marshall, MD',
  'christopher marshall, md': 'Christopher Marshall, MD',
  
  'christy dougherty': 'Christy Dougherty, FNP',
  'christy dougherty, fnp': 'Christy Dougherty, FNP',
  
  'christy tipton': 'Christy Tipton, FNP',
  'christy tipton, fnp': 'Christy Tipton, FNP',
  
  'christ ward': 'Christy Ward, FNP',
  'christy ward': 'Christy Ward, FNP',
  'christ ward, fnp': 'Christy Ward, FNP',
  'christy ward, fnp': 'Christy Ward, FNP',
  
  'claire hooper': 'Claire Hooper',
  
  'clara johnson': 'Clara Johnson',
  
  'clarey dowling': 'Clarey Dowling, MD',
  'clarey dowling, md': 'Clarey Dowling, MD',
  'clarey r dowling': 'Clarey Dowling, MD',
  'clarey r dowling, md': 'Clarey Dowling, MD',
  'clarey r.dowling': 'Clarey Dowling, MD',
  'clarey r.dowling, md': 'Clarey Dowling, MD',
  
  'claude pirtle': 'Claude Pirtle, MD',
  'claude pirtle, md': 'Claude Pirtle, MD',
  
  'clay marvin': 'Clay Marvin, FNP',
  'clay marvin, fnp': 'Clay Marvin, FNP',
  
  'colton gramse': 'Colton Gramse',
  
  'connie griffin': 'Connie Griffin, FNP',
  'connie griffin, fnp': 'Connie Griffin, FNP',
  
  'connie reaves': 'Connie Reaves, FNP',
  'connie reaves, fnp': 'Connie Reaves, FNP',
  
  'conrado sioson': 'Conrado Sioson, MD',
  'conrado sioson, md': 'Conrado Sioson, MD',
  
  'corey page': 'Corey Page, FNP',
  'corey paige': 'Corey Page, FNP',
  'corey page, fnp': 'Corey Page, FNP',
  
  'courtney faught': 'Courtney Faught, APRN',
  'courtney faught, aprn': 'Courtney Faught, APRN',
  'courtney faught, fnp': 'Courtney Faught, APRN',
  
  'courtney shires': 'Courtney Shires',
  
  'crisite vibbert': 'Cristie Vibbert, FNP',
  'cristie vibbert': 'Cristie Vibbert, FNP',
  'crisite vibbert, fnp': 'Cristie Vibbert, FNP',
  'cristie vibbert, fnp': 'Cristie Vibbert, FNP',
  
  'cynthia carrol': 'Cynthia Carroll, FNP',
  'cynthia carroll': 'Cynthia Carroll, FNP',
  'cynthia carrol, fnp': 'Cynthia Carroll, FNP',
  'cynthia carroll, fnp': 'Cynthia Carroll, FNP',
  
  'cynthia eblen': 'Cynthia Eblen, FNP',
  'cynthia eblen, fnp': 'Cynthia Eblen, FNP',
  
  'cynthia mashburn': 'Cynthia Mashburn, FNP',
  'cynthia mashburn, fnp': 'Cynthia Mashburn, FNP',
  
  // ========== D ==========
  'dafnis carranza': 'Dafnis Carranza',
  
  'dalton weaver': 'Dalton Weaver',
  
  'daniel crall': 'Daniel Crall, PA-C',
  'daniel crall, pa-c-c': 'Daniel Crall, PA-C',
  'daniel crall, pa-c': 'Daniel Crall, PA-C',
  
  'daniel hoit': 'Daniel Hoit, MD',
  'daniel hoit, md': 'Daniel Hoit, MD',
  
  'daniel otten': 'Daniel Otten',
  
  'darren perry': 'Darren Perry, FNP',
  'darren perry, cfnp': 'Darren Perry, FNP',
  'darren perry, fnp': 'Darren Perry, FNP',
  'darren pery': 'Darren Perry, FNP',
  
  'dave jain': 'Dave Jain, DO',
  'dave jain, do': 'Dave Jain, DO',
  
  'dave roberts': 'David Roberts, PA-C',
  
  'david guthrie': 'David Guthrie, MD',
  'david guthrie, md': 'David Guthrie, MD',
  
  'david krapf': 'David Krapf, DO',
  'david krapf, do': 'David Krapf, DO',
  'david scott krapf': 'David Krapf, DO',
  'david scott krapf, do': 'David Krapf, DO',
  
  'david laird': 'David Laird',
  
  'david larsen': 'David Larsen, MD',
  'david larsen, md': 'David Larsen, MD',
  
  'david maness': 'David Maness, DO',
  'david maness, do': 'David Maness, DO',
  
  'david roberts': 'David Roberts, PA-C',
  'david roberts, -c, pa': 'David Roberts, PA-C',
  'david roberts, pa-c': 'David Roberts, PA-C',
  
  'david l seaton': 'David Seaton, MD',
  'david l.seaton': 'David Seaton, MD',
  'david l seaton, md': 'David Seaton, MD',
  'david l.seaton, md': 'David Seaton, MD',
  'david seaton': 'David Seaton, MD',
  'david seaton, md': 'David Seaton, MD',
  
  'david j.wilbert': 'David Wilbert, PA-C',
  'david wilbert': 'David Wilbert, PA-C',
  'david wilbert, pa-c-c': 'David Wilbert, PA-C',
  'david j.wilbert, pa-c-c': 'David Wilbert, PA-C',
  'david wilbert, pa-c': 'David Wilbert, PA-C',
  
  'davis matthew l': 'Matthew Davis, MD',
  
  'day': 'Day',
  
  'deborah dillard': 'Deborah Dillard',
  
  'deborah graves': 'Deborah Graves, FNP',
  'deborah graves, fnp': 'Deborah Graves, FNP',
  
  'deborah lampley': 'Deborah Lampley, FNP',
  'deborah lampley, fnp': 'Deborah Lampley, FNP',
  
  'deborah leggett': 'Deborah Leggett, FNP',
  'deborah legett': 'Deborah Leggett, FNP',
  'deborah leggett, fnp': 'Deborah Leggett, FNP',
  
  'deborah p.jones': 'Deborah P. Jones',
  
  'deborah sherer': 'Deborah Sherer',
  
  'deborah smothers': 'Deborah Smothers, FNP',
  'deborah t.smothers': 'Deborah Smothers, FNP',
  'deborah t.smothers, fnp': 'Deborah Smothers, FNP',
  'deborah smothers, fnp': 'Deborah Smothers, FNP',
  
  'debbie delones': 'Debra Delones, FNP',
  'debra delones': 'Debra Delones, FNP',
  'debbie delones, fnp': 'Debra Delones, FNP',
  'debra delones, fnp': 'Debra Delones, FNP',
  
  'debra cannon': 'Debra Cannon, FNP',
  'debra cannon, fnp': 'Debra Cannon, FNP',
  'debra s cannon': 'Debra Cannon, FNP',
  'debra s cannon, fnp': 'Debra Cannon, FNP',
  'debra s.cannon': 'Debra Cannon, FNP',
  'debra s.cannon, fnp': 'Debra Cannon, FNP',
  
  'debra grace': 'Debra Grace',
  
  'dee blakney': 'Dee Blakney, DNP',
  'dee blakney, dnp': 'Dee Blakney, DNP',
  
  'demetria davis': 'Demetria Davis, PA-C',
  'demetria davis, -c, pa': 'Demetria Davis, PA-C',
  'demetria davis, pa-c': 'Demetria Davis, PA-C',
  
  'denean hendren': 'Denean Hendren',
  
  'denise': 'Denise',
  
  'denise shok': 'Denise Shook, FNP',
  'denise shook': 'Denise Shook, FNP',
  'denise shok, fnp': 'Denise Shook, FNP',
  'denise shook, fnp': 'Denise Shook, FNP',
  
  'derek moeller': 'Derek Moeller',
  
  'derek wakefield': 'Derek Wakefield',
  
  'deseray melton': 'Deseray Melton',
  
  'desiree holland': 'Desiree Holland, FNP',
  'desiree holland, fnp': 'Desiree Holland, FNP',
  'desiree hollland': 'Desiree Holland, FNP',
  
  'devin beck': 'Devin Beck, FNP',
  'devin beck, fnp': 'Devin Beck, FNP',
  
  'diabetes center of jackson': 'Diabetes Center of Jackson',
  
  'diane maxell': 'Diane Maxwell, FNP',
  'diane maxwell': 'Diane Maxwell, FNP',
  'diane maxell, fnp': 'Diane Maxwell, FNP',
  'diane maxwell, fnp': 'Diane Maxwell, FNP',
  
  'diane rybacki': 'Diane Rybacki',
  
  'dum piawa': 'Dum Piawa, DO',
  'dum piawa, do': 'Dum Piawa, DO',
  
  // ========== E ==========
  'earl l.stewart': 'Earl Stewart, MD',
  'earl stewart': 'Earl Stewart, MD',
  'earl l.stewart, md': 'Earl Stewart, MD',
  'earl stewart, md': 'Earl Stewart, MD',
  'earl swetward, md': 'Earl Stewart, MD',
  
  'edward leichner': 'Edward Leichner',
  
  'elesa miller': 'Elesa Miller',
  
  'elizabeth anderson': 'Elizabeth Anderson, FNP',
  'elizabeth anderson, fnp': 'Elizabeth Anderson, FNP',
  'elizabeth anderson,-c, fnp': 'Elizabeth Anderson, FNP',
  
  'elizabeth frazier': 'Elizabeth Frazier, FNP',
  'elizabeth frazier, fnp': 'Elizabeth Frazier, FNP',
  
  'elizabeth graves': 'Elizabeth Graves, FNP',
  'elizabeth graves, fnp': 'Elizabeth Graves, FNP',
  
  'elizabeth jones': 'Elizabeth Jones, FNP',
  'elizabeth jones, fnp': 'Elizabeth Jones, FNP',
  'elizabeth r jones': 'Elizabeth Jones, FNP',
  'elizabeth r jones, fnp': 'Elizabeth Jones, FNP',
  
  'elizabeth londino': 'Elizabeth Londino',
  'londino': 'Elizabeth Londino',
  
  'elizabeth lu': 'Elizabeth Lu',
  
  'elizabeth martin': 'Elizabeth Martin, APRN',
  'elizabeth martin, aprn': 'Elizabeth Martin, APRN',
  
  'elizabeth roberson': 'Elizabeth Roberson',
  
  'elizabeth roberts': 'Elizabeth Roberts, FNP',
  'elizabeth roberts, cfnp': 'Elizabeth Roberts, FNP',
  'elizabeth roberts, fnp': 'Elizabeth Roberts, FNP',
  'elizabeth wade roberts': 'Elizabeth Roberts, FNP',
  'elizabeth wade roberts, fnp': 'Elizabeth Roberts, FNP',
  
  'elizabeth rodriguez': 'Elizabeth Rodriguez, MD',
  'elizabeth rodriguez, md': 'Elizabeth Rodriguez, MD',
  
  'elliot kurban': 'Elliot Kurban, MD',
  'elliot kurban, md': 'Elliot Kurban, MD',
  'elliot kurban /holly bunch, md': 'Elliot Kurban, MD',
  
  'elly riley': 'Elly Riley',
  
  'emilly miller': 'Emily Miller, APRN',
  
  'emily': 'Emily',
  
  'emily bullock': 'Emily Bullock, FNP',
  'emily k.bullock': 'Emily Bullock, FNP',
  'emily k.bullock, fnp': 'Emily Bullock, FNP',
  'emily bullock, fnp': 'Emily Bullock, FNP',
  
  'emily garner': 'Emily Garner, FNP',
  'emily garner, fnp': 'Emily Garner, FNP',
  'emily garner., fnp': 'Emily Garner, FNP',
  
  'emily miller': 'Emily Miller, APRN',
  'emily miller, aprn': 'Emily Miller, APRN',
  
  'emily ezell': 'Emily Smothers Ezell, FNP',
  'emily smothers ezell': 'Emily Smothers Ezell, FNP',
  'emily smothers ezell, fnp': 'Emily Smothers Ezell, FNP',
  
  'emmanuel obi': 'Emmanuel Obi',
  
  'eric hart': 'Eric Hart, PA-C',
  'eric hart, pa-c-c': 'Eric Hart, PA-C',
  'eric hart,-c, pa-c-c': 'Eric Hart, PA-C',
  'eric hart, pa-c': 'Eric Hart, PA-C',
  
  'eric sievers': 'Eric Sievers, MD',
  'eric sievrs': 'Eric Sievers, MD',
  'eric sievers, md': 'Eric Sievers, MD',
  
  'erica scheffer': 'Erica Scheffer, MD',
  'erica scheffer, md': 'Erica Scheffer, MD',
  
  'erick stafford': 'Erick Stafford, PA-C',
  'erick stafford, -c, pa': 'Erick Stafford, PA-C',
  'erick stafford, pa-c': 'Erick Stafford, PA-C',
  
  'erin peeden': 'Erin Peeden',
  
  'erin williams': 'Erin Williams',
  
  'esden': 'Esden',
  
  'ethan loeb': 'Ethan Loeb',
  
  'ethel spivey': 'Ethel Spivey, FNP',
  'ethel spivey, a, fnp': 'Ethel Spivey, FNP',
  'ethel spivey, fnp': 'Ethel Spivey, FNP',
  
  'evelyn jackson': 'Evelyn Jackson, APN',
  'evelyn jackson, apn': 'Evelyn Jackson, APN',
  'evelyn n.jackson': 'Evelyn Jackson, APN',
  'evelyn n.jackson, fnp': 'Evelyn Jackson, APN',
  'evelyn nicole jackson': 'Evelyn Jackson, APN',
  'evelyn nicole jackson, apn': 'Evelyn Jackson, APN',
  
  'ezekiel adetunji': 'Ezekiel Adetunji',
  
  // ========== F ==========
  'faisal soliman': 'Faisal Soliman',
  
  'farrah vernon': 'Farrah Vernon, DO',
  'farrah vernon, do': 'Farrah Vernon, DO',
  
  'festus arinze': 'Festus Arinze, MD',
  'festus arinze, md': 'Festus Arinze, MD',
  
  'finley leslie': 'Finley Leslie',
  
  'forrest busch': 'Forrest Busch, DO',
  'forrest busch, do': 'Forrest Busch, DO',
  'forrest k busch': 'Forrest Busch, DO',
  'forrest kenton busch': 'Forrest Busch, DO',
  
  'frank': 'Frank',
  
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
  
  'fred sesti': 'Fred Sesti',
  
  // ========== G-L ==========
  'gary blount': 'Gary Blount, PA-C',
  'gary blount, pa-c-c': 'Gary Blount, PA-C',
  'gary blount,-c, pa-c-c': 'Gary Blount, PA-C',
  'gary christopher blount': 'Gary Blount, PA-C',
  'gary blount, pa-c': 'Gary Blount, PA-C',
  
  'gaudam nithyalakshmi': 'Gaudam Nithyalakshmi, MD',
  'gaudam nithyalakshmi, md': 'Gaudam Nithyalakshmi, MD',
  
  'george mangle': 'George Mangle',
  
  'grant jackson': 'Grant Jackson',
  
  'grant studebaker': 'Grant Studebaker',
  
  'graupman eanda': 'Wanda Graupman, FNP',
  'wanda graupman': 'Wanda Graupman, FNP',
  'graupman eanda, fnp': 'Wanda Graupman, FNP',
  'wanda graupman, fnp': 'Wanda Graupman, FNP',
  
  'gregary byers': 'Gregary Byers, FNP',
  'gregary byers, fnp': 'Gregary Byers, FNP',
  'gregary c.byers': 'Gregary Byers, FNP',
  'gregary c.byers, fnp': 'Gregary Byers, FNP',
  
  'gregg mitchell': 'Gregg Mitchell',
  
  'gregory b.franz': 'Gregory Franz, MD',
  'gregory franz': 'Gregory Franz, MD',
  'gregory b.franz, md': 'Gregory Franz, MD',
  'gregory franz, md': 'Gregory Franz, MD',
  
  'gregory jenkins': 'Gregory Jenkins',
  
  'hailee tillery': 'Hailee Tillery, FNP',
  'hailee tillery, fnp': 'Hailee Tillery, FNP',
  'haille tillery': 'Hailee Tillery, FNP',
  
  'haley sanders': 'Haley Sanders, PA-C',
  'haley sanders, -c, pa': 'Haley Sanders, PA-C',
  'haley sanders, pa-c': 'Haley Sanders, PA-C',
  'haylie sanders': 'Haley Sanders, PA-C',
  
  'haley scillion': 'Haley Scillion, FNP',
  'haley scillion, fnp': 'Haley Scillion, FNP',
  
  'hans hinterkopf': 'Hans Hinterkopf, PA-C',
  'hans hinterkopf, -c, pa': 'Hans Hinterkopf, PA-C',
  'hans hinterkopf, pa-c': 'Hans Hinterkopf, PA-C',
  
  'harborview health systems': 'Harborview Health Systems',
  
  'haris zafarullah': 'Haris Zafarullah',
  
  'hayti': 'Hayti',
  
  'heather a garrett': 'Heather Garrett, FNP',
  'heather garrett': 'Heather Garrett, FNP',
  'heather garrett, fnp': 'Heather Garrett, FNP',
  
  'heather haddock': 'Heather Haddock, FNP',
  'heather haddock, fnp': 'Heather Haddock, FNP',
  'h.haddock, fnp': 'Heather Haddock, FNP',
  'hearther haddock': 'Heather Haddock, FNP',
  
  'heather hobbs': 'Heather Hobbs, FNP',
  'heather hobbs, fnp': 'Heather Hobbs, FNP',
  
  'heather mcfarland': 'Heather McFarland, FNP',
  'heather mcfarland, fnp': 'Heather McFarland, FNP',
  
  'heather mckee': 'Heather McKee',
  
  'heidi hill': 'Heidi Hill, FNP',
  'heidi hill, fnp': 'Heidi Hill, FNP',
  
  'hetal patel': 'Hetal Patel, MD',
  'hetal patel, md': 'Hetal Patel, MD',
  
  'hollie frazier': 'Hollie Frazier, FNP',
  'hollie frazier, fnp': 'Hollie Frazier, FNP',
  
  'holly bunch': 'Holly Bunch, FNP',
  'holly bunch, fnp': 'Holly Bunch, FNP',
  
  'holly sanders': 'Holly Sanders',
  
  'holly shourd': 'Holly Shourd, FNP',
  'holly shourd, fnp': 'Holly Shourd, FNP',
  
  'ihsan haq': 'Ihsan Haq',
  
  'ionela halke': 'Ionela Halke',
  
  'ivy hardin': 'Ivy Hardin',
  
  'j daniels': 'J Daniels',
  
  'jackie scott': 'Jackie Scott, FNP',
  'jackie scott, fnp': 'Jackie Scott, FNP',
  'jacqueline scott': 'Jacqueline Scott, FNP',
  'jacqueline scott, fnp': 'Jacqueline Scott, FNP',
  
  'jaclyn bane': 'Jaclyn Bane, FNP',
  'jaclyn bane, fnp': 'Jaclyn Bane, FNP',
  
  'jacob aelion': 'Jacob Aelion, MD',
  'jacob aelion, md': 'Jacob Aelion, MD',
  
  'jacqueline roberts': 'Jacqueline Roberts',
  
  'james batey': 'James Batey, MD',
  'james batey, md': 'James Batey, MD',
  
  'james burrow': 'James E. Burrow, FNP',
  'james e burrow': 'James E. Burrow, FNP',
  'james e burrow, fnp': 'James E. Burrow, FNP',
  
  'james c.hall': 'James C. Hall, MD',
  'james c.hall, md': 'James C. Hall, MD',
  
  'james hudson': 'James Hudson',
  
  'james king': 'James King',
  
  'james l williams ii': 'James L. Williams II, MD',
  'james l.williams ii': 'James L. Williams II, MD',
  'james l williams ii, md': 'James L. Williams II, MD',
  'james l.williams ii, md': 'James L. Williams II, MD',
  'james williams': 'James L. Williams II, MD',
  'james williams, md': 'James L. Williams II, MD',
  'jim williams': 'James L. Williams II, MD',
  'jim williams, md': 'James L. Williams II, MD',
  
  'james martin': 'James Martin',
  
  'james payne': 'James Payne',
  
  'james tetleton': 'James Tetleton, FNP',
  'james tetleton, fnp': 'James Tetleton, FNP',
  
  'jamesa poindexter': 'Jamesa Poindexter',
  
  'jamey colston paul scates': 'Paul Scates, MD',
  'jamey colston paul scates, fnp': 'Paul Scates, MD',
  
  'jamie burrus': 'Jamie Burrus',
  
  'jan sims': 'Jan Sims, FNP',
  'jan sims, fnp': 'Jan Sims, FNP',
  
  'janie daniel': 'Janie Daniel',
  
  'janson davis': 'Janson Davis, PA-C',
  'janson davis, -c, pa': 'Janson Davis, PA-C',
  'janson davis, pa-c': 'Janson Davis, PA-C',
  
  'jared davis': 'Jared Davis, PA-C',
  'jared davis, -c, pa': 'Jared Davis, PA-C',
  'jared davis, pa-c': 'Jared Davis, PA-C',
  
  'jason goolsby': 'Jason Goolsby, DO',
  'jason goolsby, do': 'Jason Goolsby, DO',
  
  'jason infeld facc': 'Jason Infeld, MD',
  'jason infeld facc, md': 'Jason Infeld, MD',
  'jason infeld, md': 'Jason Infeld, MD',
  
  'jason myatt': 'Jason Myatt',
  
  'jasreen kaur': 'Jasreen Kaur',
  
  'jayme walker': 'Jayme Walker, APRN',
  'jayme walker msn': 'Jayme Walker, APRN',
  'jayme walker msn, aprn': 'Jayme Walker, APRN',
  'jayme walker, aprn': 'Jayme Walker, APRN',
  
  'jean ah davis': 'Jean Davis, DO',
  'jean davis': 'Jean Davis, DO',
  'jean ah davis, do': 'Jean Davis, DO',
  'jean davis, do': 'Jean Davis, DO',
  
  'jeffery scott': 'Jeffery Scott',
  
  'jeffrey hampton': 'Jeffrey Hampton, FNP',
  'jeff hampton': 'Jeffrey Hampton, FNP',
  'jeffery hampton': 'Jeffrey Hampton, FNP',
  'jeffrey hampton, fnp': 'Jeffrey Hampton, FNP',
  
  'jennifer davis': 'Jennifer Davis, FNP',
  'jennifer davis, fnp': 'Jennifer Davis, FNP',
  
  'jennifer easley': 'Jennifer Easley',
  
  'jennifer harper': 'Jennifer Harper, FNP',
  'jennifer harper, ac, fnp': 'Jennifer Harper, FNP',
  'jennifer harper, fnp': 'Jennifer Harper, FNP',
  
  'jennifer jennings': 'Jennifer Jennings, FNP',
  'jennifer jennings, fnp': 'Jennifer Jennings, FNP',
  
  'jennifer mcwiliams': 'Jennifer McWilliams, FNP',
  'jennifer mcwillaims': 'Jennifer McWilliams, FNP',
  'jennifer mcwilliams': 'Jennifer McWilliams, FNP',
  'jennifer mcwilliams, fnp': 'Jennifer McWilliams, FNP',
  
  'jerald white': 'Jerald White, MD',
  'jerald white, md': 'Jerald White, MD',
  
  'jeremy hubbard': 'Jeremy Hubbard',
  
  'jeremy lawson': 'Jeremy Lawson, FNP',
  'jeremy lawson, fnp': 'Jeremy Lawson, FNP',
  
  'jerry floyd': 'Jerry Floyd',
  
  'jerry p wilson': 'Jerry P. Wilson, MD',
  'jerry p.wilson': 'Jerry P. Wilson, MD',
  'jerry p wilson, md': 'Jerry P. Wilson, MD',
  'jerry p.wilson, md': 'Jerry P. Wilson, MD',
  
  'jessica davis': 'Jessica Davis',
  
  'jessica kirk': 'Jessica Kirk, FNP',
  'jessica kirk, fnp': 'Jessica Kirk, FNP',
  
  'jessica rains': 'Jessica Rains, PA-C',
  'jessica rains pa_c': 'Jessica Rains, PA-C',
  'jessica rains, pa-c-c': 'Jessica Rains, PA-C',
  'jessica rains,-c, pa-c-c': 'Jessica Rains, PA-C',
  'jessica rains, pa-c': 'Jessica Rains, PA-C',
  
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
  'joe w. hunt, md': 'Joe W. Hunt, MD',
  
  'john b clendenin': 'John B. Clendenin, MD',
  'john b.clendenin': 'John B. Clendenin, MD',
  'john clendenin': 'John B. Clendenin, MD',
  'john clendenin, md': 'John B. Clendenin, MD',
  'john b. clendenin, md': 'John B. Clendenin, MD',
  
  'john baker': 'John Baker, MD',
  'john baker, md': 'John Baker, MD',
  
  'john barr biglane': 'John Barr Biglane, MD',
  'john barr biglane, md': 'John Barr Biglane, MD',
  
  'john beasley': 'John Beasley, FNP',
  'john beasley, fnp': 'John Beasley, FNP',
  
  'john beddies': 'John Beddies',
  
  'john carraher': 'John Carraher',
  
  'john elliott': 'John Elliott',
  
  'john fussell': 'John Thomas Fussell, PA-C',
  'john fussell, -c, pa': 'John Thomas Fussell, PA-C',
  'john thomas fussell': 'John Thomas Fussell, PA-C',
  'john thomas fussell, -c, pa': 'John Thomas Fussell, PA-C',
  'john fussell, pa-c': 'John Thomas Fussell, PA-C',
  'john thomas fussell, pa-c': 'John Thomas Fussell, PA-C',
  
  'john hale': 'John W. Hale',
  'john w hale': 'John W. Hale',
  
  'john riddick': 'John Riddick, MD',
  'john riddick, md': 'John Riddick, MD',
  
  'johnpowell': 'John Powell',
  
  'joon lee': 'Joon Lee, MD',
  'joon lee, md': 'Joon Lee, MD',
  
  'jordan daniels': 'Jordan Daniels, FNP',
  'jordan daniels, fnp': 'Jordan Daniels, FNP',
  
  'joseph fouche': 'Joseph Fouche',
  
  'joseph freeman': 'Joseph Freeman, MD',
  'joseph a.freeman': 'Joseph Freeman, MD',
  'joseph freeman, md': 'Joseph Freeman, MD',
  
  'joseph lamb': 'Joseph Lamb',
  
  'joseph m.kulpeksa': 'Joseph M. Kulpeksa, MD',
  'joseph m.kulpeksa, md': 'Joseph M. Kulpeksa, MD',
  
  'joseph montgomery': 'Joseph Montgomery',
  
  'joseph peters': 'Joseph Peters, MD',
  'joseph peters, md': 'Joseph Peters, MD',
  
  'joshua beck': 'Joshua Beck',
  
  'joshua d.whitledge': 'Joshua Whitledge, DO',
  'joshua whitledge': 'Joshua Whitledge, DO',
  'joshua d.whitledge, do': 'Joshua Whitledge, DO',
  'joshua whitledge, do': 'Joshua Whitledge, DO',
  
  'joshua scearce': 'Joshua Scearce, MD',
  'joshua scearce, md': 'Joshua Scearce, MD',
  
  'joy smith': 'Joy Smith',
  
  'joyce addo': 'Joyce Addo, PA-C',
  'joyce addo, -c, pa': 'Joyce Addo, PA-C',
  'joyce addo, pa-c': 'Joyce Addo, PA-C',
  
  'judith tessema': 'Judith Tessema, MD',
  'judith tessema, md': 'Judith Tessema, MD',
  
  'judy bain': 'Judy Bain, FNP',
  'judy bain, fnp': 'Judy Bain, FNP',
  
  'julia frye': 'Julia Frye, FNP',
  'julia frye, fnp': 'Julia Frye, FNP',
  
  'julie cantrell': 'Julie Cantrell, PA-C',
  'julie cantrell, -c, pa': 'Julie Cantrell, PA-C',
  'julie cantrell, pa-c': 'Julie Cantrell, PA-C',
  
  'justin turner': 'Justin Turner, MD',
  'justin turner, md': 'Justin Turner, MD',
  
  'kaitlin stotlar': 'Kaitlin Stotlar',
  
  'kaleb grimes': 'Kaleb Grimes, FNP',
  'kaleb grimes, fnp': 'Kaleb Grimes, FNP',
  
  'kalie foust': 'Kalie Foust, FNP',
  'kalie foust, fnp': 'Kalie Foust, FNP',
  'katie foust': 'Kalie Foust, FNP',
  
  'kalieah winstead p.a': 'Keliea Ann Winstead',
  'keliea ann winstead': 'Keliea Ann Winstead',
  
  'kamala karri': 'Kamala Karri, DNP',
  'kamala karri, dnp': 'Kamala Karri, DNP',
  
  'kandace dalton': 'Kandace Dalton, FNP',
  'kandace dalton, fnp': 'Kandace Dalton, FNP',
  
  'kandarp patel': 'Kandarp Patel',
  
  'kara vinyard': 'Kara Vinyard',
  
  'karen armour': 'Karen Armour, MD',
  'karen armour, md': 'Karen Armour, MD',
  
  'karen e.webb-bc': 'Karen Webb, APN',
  'karen e.webb': 'Karen Webb, APN',
  'karen e.webb-bc, aprn': 'Karen Webb, APN',
  'karen e.webb, aprn': 'Karen Webb, APN',
  'karen webb': 'Karen Webb, APN',
  'karen webb, apn': 'Karen Webb, APN',
  'karen webb, fnp': 'Karen Webb, APN',
  
  'karen hanks': 'Karen Hanks',
  
  'karen martin': 'Karen Martin, FNP',
  'karen martin, fnp': 'Karen Martin, FNP',
  
  'karin featherston': 'Karin Featherston, FNP',
  'karin featherston, fnp': 'Karin Featherston, FNP',
  
  'kasey lax': 'Kasey Lax, FNP',
  'kasey lax, fnp': 'Kasey Lax, FNP',
  
  'kate cummings': 'Katherine Cummings, PA-C',
  'kate cummings, -c, pa': 'Katherine Cummings, PA-C',
  'katherine cummings': 'Katherine Cummings, PA-C',
  'katherine cummings, -c, pa': 'Katherine Cummings, PA-C',
  'kate cummings, pa-c': 'Katherine Cummings, PA-C',
  'katherine cummings, pa-c': 'Katherine Cummings, PA-C',
  
  'kate robertson': 'Katelyn Robertson, FNP',
  'kately roberson': 'Katelyn Robertson, FNP',
  'katelyn pratt': 'Katelyn Pratt, FNP',
  'katelyn pratt, fnp': 'Katelyn Pratt, FNP',
  'mary katelyn pratt': 'Katelyn Pratt, FNP',
  'mary katelyn pratt, fnp': 'Katelyn Pratt, FNP',
  
  'katelyn robertson': 'Katelyn Robertson, FNP',
  'katelyn robertson, fnp': 'Katelyn Robertson, FNP',
  
  'katelyn watkins': 'Katelyn Watkins',
  
  'kath joann banks': 'Kathy Banks, FNP',
  'kathy banks': 'Kathy Banks, FNP',
  'kathy banks, fnp': 'Kathy Banks, FNP',
  'kathy joann banks': 'Kathy Banks, FNP',
  'kathy joann banks, fnp': 'Kathy Banks, FNP',
  
  'katherine elizabeth frieling': 'Katherine Elizabeth Frieling',
  
  'katherine forsbach': 'Katherine Forsbach, FNP',
  'katherine forsbach, fnp': 'Katherine Forsbach, FNP',
  
  'katherine james': 'Katherine James, FNP',
  'katherine james, fnp': 'Katherine James, FNP',
  
  'kathryn glass': 'Kathryn J. Glass, MD',
  'kathryn j glass': 'Kathryn J. Glass, MD',
  'kathryn j.glass': 'Kathryn J. Glass, MD',
  'kathryn j.glass, md': 'Kathryn J. Glass, MD',
  'kathryn j. glass, md': 'Kathryn J. Glass, MD',
  
  'kathy kee': 'Kathy Kee, FNP',
  'kathy kee, fnp': 'Kathy Kee, FNP',
  
  'kathy oconnor wray': 'Kathy OConnor Wray',
  
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
  
  'kelley fowler': 'Kelley Nicole Fowler',
  'kelley nicole fowler': 'Kelley Nicole Fowler',
  
  'kelly baldwin': 'Kelly Baldwin',
  
  'kelly barnes': 'Kelly Barnes, FNP',
  'kelly barnes , fnp': 'Kelly Barnes, FNP',
  'kelly barnes , fnp, fnp': 'Kelly Barnes, FNP',
  'kelly barnes, fnp': 'Kelly Barnes, FNP',
  
  'kelly mccallum': 'Kelly McCallum, FNP',
  'kelly mccallum, fnp': 'Kelly McCallum, FNP',
  
  'kelly pulley': 'Kelly Pulley, FNP',
  'kelly pulley, fnp': 'Kelly Pulley, FNP',
  'pulley kelly': 'Kelly Pulley, FNP',
  'pulley kelly, fnp': 'Kelly Pulley, FNP',
  
  'ken beene': 'Ken Beene, FNP',
  'ken beene, fnp': 'Ken Beene, FNP',
  
  'kenneth carr': 'Kenneth Carr, MD',
  'kenneth carr, md': 'Kenneth Carr, MD',
  
  'kenneth scott jackson': 'Kenneth Scott Jackson, FNP',
  'kenneth scott jackson, fnp': 'Kenneth Scott Jackson, FNP',
  
  'kenneth tozer': 'Kenneth Tozer, MD',
  'kenneth tozer, md': 'Kenneth Tozer, MD',
  
  'kerri a ervin': 'Kerri Ervin, FNP',
  'kerri ervin': 'Kerri Ervin, FNP',
  'kerri ervin, fnp': 'Kerri Ervin, FNP',
  
  'kerri sumler': 'Kerri Sumler, FNP',
  'kerri sumler, fnp': 'Kerri Sumler, FNP',
  
  'kevin cox': 'Kevin Cox',
  
  'kevin gray': 'Kevin Gray, MD',
  'kevin gray, md': 'Kevin Gray, MD',
  
  'kevin lovette': 'Kevin Lovette',
  
  'kevin stroup': 'Kevin Stroup, MD',
  'kevin stroup, md': 'Kevin Stroup, MD',
  
  'kim howerton': 'Kimberly Howerton',
  'kimberly howerton': 'Kimberly Howerton',
  
  'kimberlie simpson': 'Kimberlie Simpson, FNP',
  'kimberlie simpson, fnp': 'Kimberlie Simpson, FNP',
  
  'kimberly byrd': 'Kimberly Byrd',
  'kristin byrd': 'Kimberly Byrd',
  
  'kimberly roberts': 'Kimberly Roberts, FNP',
  'kimberly roberts, fnp': 'Kimberly Roberts, FNP',
  
  'kimberly russom': 'Kimberly Russom, FNP',
  'kimberly russom, fnp': 'Kimberly Russom, FNP',
  
  'kiran samindla': 'Kiran Samindla',
  
  'kirsten sass': 'Kirsten Sass, PA-C',
  'kirsten sass, -c, pa': 'Kirsten Sass, PA-C',
  'kirsten sass, pa-c': 'Kirsten Sass, PA-C',
  
  'kofi nuako': 'Kofi Nuako',
  
  'kolby herron': 'Kolby Herron, FNP',
  'kolby herron, fnp': 'Kolby Herron, FNP',
  
  'krista allen': 'Krista Allen',
  
  'kristen beasley': 'Kristen Beasley, FNP',
  'kristen beasley, fnp': 'Kristen Beasley, FNP',
  
  'kristen martin': 'Kristen Martin, PA-C',
  'kristen martin, -c, pa': 'Kristen Martin, PA-C',
  'kristen martin, pa-c': 'Kristen Martin, PA-C',
  
  'kristi hazlewood': 'Kristi Hazlewood, FNP',
  'kristi hazlewood, fnp': 'Kristi Hazlewood, FNP',
  
  'kristin davis': 'Kristin Davis, FNP',
  'kristin davis, fnp': 'Kristin Davis, FNP',
  
  'kristin s.deaton': 'Kristin S. Deaton',
  
  'kristy king': 'Kristy King, FNP',
  'kristy king, fnp': 'Kristy King, FNP',
  
  'kumar yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh, md': 'Kumar Yogesh, MD',
  
  'kylie smith': 'Kylie Smith, FNP',
  'kylie smith, fnp': 'Kylie Smith, FNP',
  
  'laken clanton': 'Laken Clanton, FNP',
  'laken clanton, fnp': 'Laken Clanton, FNP',
  
  'lakeshia yarbrough': 'Lakeshia Yarbrough, DNP',
  'keshia yarbrough': 'Lakeshia Yarbrough, DNP',
  'lakeshia yarbrough, dnp': 'Lakeshia Yarbrough, DNP',
  'lakeshia yarbrough, fnp': 'Lakeshia Yarbrough, DNP',
  
  'lane williams': 'Lane Williams, MD',
  'lane williams, md': 'Lane Williams, MD',
  
  'lauderdale hospital': 'Lauderdale Hospital',
  
  'laura baker msn': 'Laura Baker, FNP',
  'laura baker msn, fnp': 'Laura Baker, FNP',
  
  'laura beth west': 'Laura West, FNP',
  'laura west': 'Laura West, FNP',
  'laura b west': 'Laura West, FNP',
  'laura beth west, fnp': 'Laura West, FNP',
  'laura west, fnp': 'Laura West, FNP',
  
  'laura lancaster': 'Laura Lancaster',
  
  'laura langdon': 'Laura Langdon, PA-C',
  'laura langdon, -c, pa': 'Laura Langdon, PA-C',
  'laura langdon, pa-c': 'Laura Langdon, PA-C',
  
  'laura russell': 'Laura Russell, FNP',
  'laura russell, c, fnp': 'Laura Russell, FNP',
  'laura russell, fnp': 'Laura Russell, FNP',
  
  'laura wallace': 'Laura Wallace, FNP',
  'laura wallace, fnp': 'Laura Wallace, FNP',
  
  'laurel ann campbell': 'Laurel Campbell, MD',
  'laurel campbell': 'Laurel Campbell, MD',
  'laurel ann campbell, md': 'Laurel Campbell, MD',
  'laurel campbell, md': 'Laurel Campbell, MD',
  
  'lauren butler': 'Lauren Butler, FNP',
  'lauren butler, fnp': 'Lauren Butler, FNP',
  
  'lauren droke': 'Lauren Droke, FNP',
  'lauren droke, fnp': 'Lauren Droke, FNP',
  
  'lauren hansen': 'Lauren Hansen, DO',
  'lauren hansen, do': 'Lauren Hansen, DO',
  
  'lauren harbin': 'Lauren Harbin',
  
  'lauren hopper': 'Lauren Hopper',
  
  'lauren putman': 'Lauren Putman',
  
  'lauren schultz': 'Lauren Schultz, PA-C',
  'lauren schultz, -c, pa': 'Lauren Schultz, PA-C',
  'lauren schultz, pa-c': 'Lauren Schultz, PA-C',
  
  'laurie austin': 'Laurie Austin, FNP',
  'laurie austin, fnp': 'Laurie Austin, FNP',
  
  'lawrence jackson': 'Lawrence Jackson',
  
  'lebonheur': 'LeBonheur',
  
  'lee carter': 'Lee Carter',
  
  'lesley howell': 'Lesley Howell, FNP',
  'lesley howell, fnp': 'Lesley Howell, FNP',
  
  'leslie ary': 'Leslie Ary, FNP',
  'leslie ary, ac, fnp': 'Leslie Ary, FNP',
  'leslie ary, fnp': 'Leslie Ary, FNP',
  'old leslie ary': 'Leslie Ary, FNP',
  
  'leslie deberry': 'Leslie Deberry',
  
  'linda crozier': 'Linda Crozier, FNP',
  'linda crozier, fnp': 'Linda Crozier, FNP',
  'linda n.crozier': 'Linda Crozier, FNP',
  'linda n.crozier, fnp': 'Linda Crozier, FNP',
  
  'linda denise peery': 'Linda Peery, PA-C',
  'linda peery': 'Linda Peery, PA-C',
  'linda d.peery': 'Linda Peery, PA-C',
  'linda denise peery, -c, pa': 'Linda Peery, PA-C',
  'linda peery, pa-c': 'Linda Peery, PA-C',
  'linda peery, pa-c-c': 'Linda Peery, PA-C',
  
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
  
  'lisa alexander nwokolo': 'Lisa Alexander Nwokolo, FNP',
  'lisa alexander nwokolo, fnp': 'Lisa Alexander Nwokolo, FNP',
  
  'lisa d king': 'Lisa King, FNP',
  'lisa king': 'Lisa King, FNP',
  'lisa d king, fnp': 'Lisa King, FNP',
  'lisa king, fnp': 'Lisa King, FNP',
  
  'lisa fletcher': 'Lisa Fletcher, FNP',
  'lisa fletcher, fnp': 'Lisa Fletcher, FNP',
  
  'lisa hubbard': 'Lisa Hubbard, PA-C',
  'lisa hubbard, -c, pa': 'Lisa Hubbard, PA-C',
  'lisa hubbard, pa-c': 'Lisa Hubbard, PA-C',
  
  'lisa hunt': 'Lisa Hunt, APRN',
  'lisa hunt, aprn': 'Lisa Hunt, APRN',
  'lisa hunt, fnp': 'Lisa Hunt, APRN',
  
  'lisa klyce': 'Lisa Klyce, FNP',
  'lisa klyce, fnp': 'Lisa Klyce, FNP',
  
  'lisa medlin': 'Lisa Medlin',
  
  'lisa morris': 'Lisa Morris, FNP',
  'lisa morris, fnp': 'Lisa Morris, FNP',
  
  'logan hardin': 'Logan Hardin, DO',
  'logan hardin, do': 'Logan Hardin, DO',
  
  'logan rummells': 'Logan Rummells, FNP',
  'logan rummells, fnp': 'Logan Rummells, FNP',
  
  'loren carroll': 'Loren Carroll, MD',
  'loren carroll, md': 'Loren Carroll, MD',
  
  'loretta king': 'Loretta King',
  
  'lori f.laman': 'Lori Laman, APRN',
  'lori laman': 'Lori Laman, APRN',
  'lori f.laman, aprn': 'Lori Laman, APRN',
  'lori laman, aprn': 'Lori Laman, APRN',
  'lori laman, fnp': 'Lori Laman, APRN',
  
  'lori taylor': 'Lori Taylor',
  
  'lorrie cooksey': 'Lorrie Cooksey',
  
  'louis caruso': 'Louis Caruso',
  
  'louis cunningham': 'Louis Cunningham',
  
  'lusia filetti': 'Lusia Filetti',
  
  'lynda hughes': 'Lynda Hughes, FNP',
  'lynda hughes, fnp': 'Lynda Hughes, FNP',
  
  // ========== M-Z ==========
  'm.david boatright': 'Michael David Boatright, MD',
  'michael david boatright': 'Michael David Boatright, MD',
  'm.david boatright, md': 'Michael David Boatright, MD',
  'michael david boatright, md': 'Michael David Boatright, MD',
  
  'mackey peacock': 'Mackey Peacock',
  
  'madalyn guymon': 'Madalyn Guymon, FNP',
  'madalyn guymon, fnp': 'Madalyn Guymon, FNP',
  
  'madelyn riels': 'Madelyn Riels, DO',
  'madelyn riels, do': 'Madelyn Riels, DO',
  
  'madison lamar': 'Madison Lamar, FNP',
  'madison lamar, fnp': 'Madison Lamar, FNP',
  
  'madison martin': 'Madison Martin, PA-C',
  'madison martin, -c, pa': 'Madison Martin, PA-C',
  'madison martin, pa-c': 'Madison Martin, PA-C',
  
  'madison northcutt': 'Madison Northcutt, FNP',
  'madison northcutt, fnp': 'Madison Northcutt, FNP',
  
  'madison wallace': 'Madison Wallace',
  
  'madrid': 'Madrid',
  
  'maegen smith': 'Maegen Smith, FNP',
  'maegen smith, fnp': 'Maegen Smith, FNP',
  
  'makiya rinks': 'Makiya Rinks, FNP',
  'makiya rinks, fnp': 'Makiya Rinks, FNP',
  
  'malik murtaza': 'Malik Murtaza',
  
  'mallory pate': 'Mallory Pate, FNP',
  'mallory pate, fnp': 'Mallory Pate, FNP',
  
  'manish talwar': 'Manish Talwar',
  
  'margaret gore': 'Margaret Gore, MD',
  'margaret gore, md': 'Margaret Gore, MD',
  
  'margie hill': 'Margie Hill',
  
  'marianne fowler': 'Marianne Fowler, FNP',
  'marianne fowler, fnp': 'Marianne Fowler, FNP',
  
  'marion joy scott': 'Marion Joy Scott, FNP',
  'marion joy scott, fnp': 'Marion Joy Scott, FNP',
  
  'mark andrew scott': 'Mark Andrew Scott, MD',
  'mark andrew scott, md': 'Mark Andrew Scott, MD',
  
  'mark vinson': 'Mark Vinson, FNP',
  'mark vinson, fnp': 'Mark Vinson, FNP',
  
  'marshall banks': 'Marshall Banks',
  
  'mary beth parks': 'Mary Beth Parks',
  
  'mary beth shirley': 'Mary Beth Shirley, PA-C',
  'mary beth shirley, -c, pa': 'Mary Beth Shirley, PA-C',
  'mary shirley': 'Mary Beth Shirley, PA-C',
  'mary shirley, -c, pa': 'Mary Beth Shirley, PA-C',
  'mary beth shirley, pa-c': 'Mary Beth Shirley, PA-C',
  'mary shirley, pa-c': 'Mary Beth Shirley, PA-C',
  
  'mary clinic': 'Mary Clinic',
  
  'mary jane dickey': 'Mary Jane Dickey',
  
  'mary jane fullwood': 'Mary Jane Fullwood, MD',
  'mary jane fullwood, md': 'Mary Jane Fullwood, MD',
  
  'mary kathryn lunceford-levesque': 'Mary Kathryn Lunceford-Levesque',
  
  'mary rhoads': 'Mary Sue Rhoads',
  'mary sue rhoads': 'Mary Sue Rhoads',
  
  'mary simpson': 'Mary Simpson',
  
  'mary smith-williams': 'Mary Smith-Williams',
  'smith-williams mary': 'Mary Smith-Williams',
  'williams mary s': 'Mary Smith-Williams',
  'mary williams': 'Mary Williams',
  
  'matthew davis': 'Matthew Davis, MD',
  'matthew davis, md': 'Matthew Davis, MD',
  
  'matthew french': 'Matthew French',
  
  'matthew king': 'Matthew King, FNP',
  'matthew king, fnp': 'Matthew King, FNP',
  
  'matthew roberts': 'Matthew Roberts, FNP',
  'matthew w.roberts': 'Matthew Roberts, FNP',
  'matthew roberts, fnp': 'Matthew Roberts, FNP',
  'matthew w.roberts, fnp': 'Matthew Roberts, FNP',
  
  'meagan pigue': 'Meagan Pigue, FNP',
  'meagan pigue, fnp': 'Meagan Pigue, FNP',
  
  'mechelle perry': 'Mechelle Perry, FNP',
  'mechelle perry, c, fnp': 'Mechelle Perry, FNP',
  'mechelle perry, fnp': 'Mechelle Perry, FNP',
  
  'mechelle taylor-moragne': 'Mechelle Taylor-Moragne, MD',
  'mechelle taylor-moragne, md': 'Mechelle Taylor-Moragne, MD',
  
  'megan hickerson': 'Megan Hickerson, FNP',
  'megan hickerson, fnp': 'Megan Hickerson, FNP',
  
  'meike alex bridgeman': 'Meike Alex Bridgeman, FNP',
  'meike alex bridgeman, fnp': 'Meike Alex Bridgeman, FNP',
  
  'melani sidwell': 'Melani Sidwell',
  
  'melanie austin': 'Melanie Austin, FNP',
  'melanie austin, fnp': 'Melanie Austin, FNP',
  
  'melanie hoppers': 'Melanie Hoppers',
  
  'melanie reaves': 'Melanie Reaves, FNP',
  'melanie reaves, fnp': 'Melanie Reaves, FNP',
  
  'melinda maranto': 'Melinda Maranto',
  
  'melinda olds': 'Melinda Olds, DNP',
  'melinda olds, dnp': 'Melinda Olds, DNP',
  
  'melissa baines': 'Melissa Baines, FNP',
  'melissa baines, fnp': 'Melissa Baines, FNP',
  
  'melissa swinea': 'Melissa Swinea, APRN',
  'melissa swinea, anp-bc': 'Melissa Swinea, APRN',
  'melissa swinea, aprn': 'Melissa Swinea, APRN',
  
  'melissa turner': 'Melissa Turner, FNP',
  'melissa turner, fnp': 'Melissa Turner, FNP',
  
  'melissa watkins': 'Melissa Watkins, FNP',
  'melissa watkins, fnp': 'Melissa Watkins, FNP',
  
  'melove casey': 'Melove Casey',
  
  'meredith gaitley': 'Meredith Gaitley, APRN',
  'meredith gaitley, aprn': 'Meredith Gaitley, APRN',
  'meredithy gaitley': 'Meredith Gaitley, APRN',
  'meredithy gaitley, aprn': 'Meredith Gaitley, APRN',
  
  'meredith pelster': 'Meredith Pelster',
  
  'micah whitnell': 'Micah Whitnell',
  
  'michael brown': 'Michael Brown, PA-C',
  'michael a brown': 'Michael Brown, PA-C',
  'michael brown, pa-c': 'Michael Brown, PA-C',
  
  'michael chad odle': 'Michael Odle, FNP',
  'michael odle': 'Michael Odle, FNP',
  'michael chad odle, fnp': 'Michael Odle, FNP',
  'michael odle, fnp': 'Michael Odle, FNP',
  
  'michael craig': 'Michael Craig, MD',
  'michael craig, md': 'Michael Craig, MD',
  
  'michael hinds': 'Michael Hinds, MD',
  'michael hinds, md': 'Michael Hinds, MD',
  
  'michael bryant': 'Michael L. Bryant, MD',
  'michael l.bryant': 'Michael L. Bryant, MD',
  'michael bryant, md': 'Michael L. Bryant, MD',
  'michael l.bryant, md': 'Michael L. Bryant, MD',
  'michael l. bryant, md': 'Michael L. Bryant, MD',
  
  'michael martin': 'Michael Martin',
  
  'michelle roberts': 'Michelle Roberts, FNP',
  'michelle roberts, fnp': 'Michelle Roberts, FNP',
  
  'michiel rudder': 'Michiel Rudder, FNP',
  'michael rudder': 'Michiel Rudder, FNP',
  'michiel brent rudder': 'Michiel Rudder, FNP',
  'michiel rudder, fnp': 'Michiel Rudder, FNP',
  'michiel brent rudder, fnp': 'Michiel Rudder, FNP',
  
  'mikayla owen': 'Mikayla Owen, FNP',
  'mikayla owen, fnp': 'Mikayla Owen, FNP',
  
  'mindy ledford': 'Mindy Ledford, FNP',
  'mindt ledford': 'Mindy Ledford, FNP',
  'mindy ledford, fnp': 'Mindy Ledford, FNP',
  
  'mineo': 'Mineo',
  
  'misty allen': 'Misty Allen',
  
  'misty barker': 'Misty Barker, FNP',
  'misty barker, fnp': 'Misty Barker, FNP',
  
  'misty hurt': 'Misty Hurt, FNP',
  'misty hurt, fnp': 'Misty Hurt, FNP',
  
  'mit patel': 'Mit Patel',
  
  'mohammad moughrabieh': 'Mohammad Moughrabieh',
  'moughrabieh': 'Mohammad Moughrabieh',
  
  'mohammad yousuf': 'Mohammad Yousuf, MD',
  'mohammad yousuf, md': 'Mohammad Yousuf, MD',
  'mohommad yousuf': 'Mohammad Yousuf, MD',
  'mohommad yousuf, md': 'Mohammad Yousuf, MD',
  
  'mohsin alhaddad': 'Mohsin Alhaddad, MD',
  'mohsin alhaddad, md': 'Mohsin Alhaddad, MD',
  
  'monica hall': 'Monica Hall',
  
  'monica vineyard': 'Monica Vineyard',
  
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
  
  'munford clinic': 'Munford Clinic',
  
  'myk robinson': 'Myk Robinson',
  
  'nbhc mid-south': 'NBHC Mid-South',
  
  'neeraja yedlapati': 'Neeraja Yedlapati',
  
  'nicholas treece': 'Nicholas Treece',
  
  'nicolas arcuri': 'Nicolas Arcuri',
  'nicolas arcurl': 'Nicolas Arcuri',
  
  'nicole jackson': 'Nicole Jackson, APRN',
  'nicole jackson, aprn': 'Nicole Jackson, APRN',
  
  'nicole jennings': 'Nicole Jennings, MD',
  'nicole jennings, md': 'Nicole Jennings, MD',
  
  'nicole umstead': 'Nicole Umstead, FNP',
  'nicole umstead, fnp': 'Nicole Umstead, FNP',
  
  'nicole wilson': 'Nicole Wilson, FNP',
  'nicole wilson, fnp': 'Nicole Wilson, FNP',
  
  'nirav patel': 'Nirav Patel',
  
  'nita hastings': 'Nita Hastings, FNP',
  'nita hastings, fnp': 'Nita Hastings, FNP',
  
  'norma': 'Norma',
  
  'norma wood': 'Norma Wood',
  
  'oakley jordan': 'Oakley Jordan, MD',
  'oakley jordan, md': 'Oakley Jordan, MD',
  
  'ophelps': 'Ophelps',
  
  'osayawe odeh': 'Osayawe Odeh',
  
  'oswald thomas': 'Oswald Thomas',
  
  'paige': 'Paige',
  
  'patricia blasick': 'Patricia Blasick',
  'trish blasick': 'Patricia Blasick',
  
  'patricia crane bryson': 'Patricia Crane-Bryson',
  'patricia crane-bryson': 'Patricia Crane-Bryson',
  
  'patrick andre': 'Patrick Andre, MD',
  'patrick andre, md': 'Patrick Andre, MD',
  'patrick n.andre': 'Patrick Andre, MD',
  'patrick n.andre, md': 'Patrick Andre, MD',
  
  'patsy crihfield': 'Patsy Crihfield, FNP',
  'patsy crihfield, fnp': 'Patsy Crihfield, FNP',
  
  'patti jones': 'Patti Jones, FNP',
  'patti jones-': 'Patti Jones, FNP',
  'patti jones, fnp': 'Patti Jones, FNP',
  'patti jones-, fnp': 'Patti Jones, FNP',
  
  'paul brinkman': 'Paul Brinkman, PA-C',
  'paul brinkman, -c, pa': 'Paul Brinkman, PA-C',
  'paul brinkman, pa-c': 'Paul Brinkman, PA-C',
  
  'paul park': 'Paul Park, MD',
  'paul park, md': 'Paul Park, MD',
  
  'paul scates': 'Paul Scates, MD',
  'paul scates, md': 'Paul Scates, MD',
  
  'paul smith': 'Paul Smith, MD',
  'paul smith, md': 'Paul Smith, MD',
  
  'paula wilder': 'Paula Wilder, FNP',
  'paula wilder, fnp': 'Paula Wilder, FNP',
  
  'penny creekmoore': 'Penny Creekmore, FNP',
  'penny creekmore': 'Penny Creekmore, FNP',
  'penny creekmore, fnp': 'Penny Creekmore, FNP',
  
  'penny pope': 'Penny Pope, FNP',
  'penny pope, fnp': 'Penny Pope, FNP',
  
  'peter carter': 'Peter Carter, MD',
  'peter carter, md': 'Peter Carter, MD',
  
  'peter lawrence': 'Peter Lawrence',
  
  'peyton barnett': 'Peyton Barnett',
  
  'post acute': 'Post Acute',
  
  'prime care selmer': 'Prime Care Selmer',
  
  'priyanka jethwani': 'Priyanka Jethwani',
  
  'quratulain syed': 'Quratulain Syed',
  
  'r scott miskelly': 'Randle Scott Miskelly, FNP',
  'r.scott miskelly': 'Randle Scott Miskelly, FNP',
  'r scott miskelly, fnp': 'Randle Scott Miskelly, FNP',
  'r.scott miskelly, fnp': 'Randle Scott Miskelly, FNP',
  'randle scott miskelly': 'Randle Scott Miskelly, FNP',
  'randle scott miskelly, fnp': 'Randle Scott Miskelly, FNP',
  
  'rachel davis': 'Rachel Davis, FNP',
  'rachal davis': 'Rachel Davis, FNP',
  'rachel davis, fnp': 'Rachel Davis, FNP',
  
  'rachel matthews': 'Rachel Matthews, FNP',
  'rachel matthews, fnp': 'Rachel Matthews, FNP',
  
  'rachel nelson': 'Rachel Nelson, DO',
  'rachel nelson, do': 'Rachel Nelson, DO',
  
  'rachel taylor': 'Rachel Taylor, FNP',
  'rachel taylor, fnp': 'Rachel Taylor, FNP',
  
  'rachel tosh': 'Rachel Tosh, FNP',
  'rachel tosh, fnp': 'Rachel Tosh, FNP',
  
  'rachelle hale': 'Rachelle Hale, FNP',
  'rachelle hale, fnp': 'Rachelle Hale, FNP',
  
  'rafael sanchez': 'Rafael Sanchez',
  
  'randall williams': 'Randall Williams, PA-C',
  'randall williams, -c, pa': 'Randall Williams, PA-C',
  'randall williams, pa-c': 'Randall Williams, PA-C',
  
  'randy guy': 'Randy Guy',
  
  'rauf baba': 'Rauf Baba, MD',
  'rauf baba, md': 'Rauf Baba, MD',
  
  'ravinder machra': 'Ravinder Machra, MD',
  'ravinder machra, md': 'Ravinder Machra, MD',
  
  'ray wakefield': 'Ray Wakefield, FNP',
  'ray wakefield, fnp': 'Ray Wakefield, FNP',
  
  'rebecca johnson': 'Rebecca Johnson, CNM',
  'rebecca johnson, cnm': 'Rebecca Johnson, CNM',
  
  'rebecca jones': 'Rebecca Jones, FNP',
  'rebecca jones, fnp': 'Rebecca Jones, FNP',
  
  'rebecca woods': 'Rebecca Woods, FNP',
  'rebecca woods, fnp': 'Rebecca Woods, FNP',
  
  'renea terrell': 'Renea Terrell',
  
  'rhiannon andresen': 'Rhiannon Andresen',
  
  'rhonda hunt': 'Rhonda Hunt, FNP',
  'rhonda hunt, fnp': 'Rhonda Hunt, FNP',
  
  'rima zahr': 'Rima Zahr, DO',
  'rima zahr, do': 'Rima Zahr, DO',
  
  'ripley medical clinic': 'Ripley Medical Clinic',
  
  'rita hollingsworth': 'Rita Hollingsworth',
  
  'rita koon': 'Rita Koon, FNP',
  'rita koon, fnp': 'Rita Koon, FNP',
  
  'river oaks': 'River Oaks',
  
  'robbin brewer': 'Robbin Brewer, LPN',
  'robbin brewer, lpn': 'Robbin Brewer, LPN',
  
  'robert burns': 'Robert Burns',
  
  'robert callery': 'Robert Callery, FNP',
  'robert callery, fnp': 'Robert Callery, FNP',
  
  'robert day': 'Robert Day, MD',
  'robert day, md': 'Robert Day, MD',
  
  'robert johnson': 'Robert Johnson',
  
  'robert scott parker ii': 'Robert Scott Parker II, MD',
  'robert scott parker ii, md': 'Robert Scott Parker II, MD',
  
  'robertd turner': 'Robert Turner',
  
  'rosemary jacobs': 'Rosemary Jacobs, APRN',
  'rosemary jacobs, aprn': 'Rosemary Jacobs, APRN',
  
  'roslin carlson': 'Roslin Carlson, FNP',
  'roslin carlson, fnp': 'Roslin Carlson, FNP',
  
  'ruby turner': 'Ruby Turner, FNP',
  'ruby turner, fnp': 'Ruby Turner, FNP',
  
  'russell little': 'Russell Little',
  
  'ruth ann slayton': 'Ruthann Slayton',
  'ruthann slayton': 'Ruthann Slayton',
  
  'ryan fashempour': 'Ryan Fashempour',
  
  'ryan hamilton': 'Ryan Hamilton',
  
  'rylee smith': 'Rylee Smith, PA-C',
  'rylee smith, -c, pa': 'Rylee Smith, PA-C',
  'rylee smith, pa-c': 'Rylee Smith, PA-C',
  
  'saira farid': 'Saira Farid',
  
  'salman saeed': 'Salman Saeed, MD',
  'salman saeed, md': 'Salman Saeed, MD',
  
  'samantha french-tiffany simpson': 'Samantha French, FNP',
  'samantha french': 'Samantha French, FNP',
  'samantha french, a, fnp': 'Samantha French, FNP',
  'samantha french, fnp': 'Samantha French, FNP',
  
  'samantha ivy': 'Samantha Ivy, FNP',
  'samantha ivy, fnp': 'Samantha Ivy, FNP',
  
  'sameul bada': 'Samuel Bada',
  'samuel bada': 'Samuel Bada',
  
  'samuel bradberry': 'Samuel Bradberry, MD',
  'samuel bradberry, md': 'Samuel Bradberry, MD',
  
  'samuel johnson jr.': 'Samuel T. Johnson Jr., MD',
  'samuel t johnson jr.': 'Samuel T. Johnson Jr., MD',
  'samuel johnson jr., md': 'Samuel T. Johnson Jr., MD',
  'samuel t johnson jr., md': 'Samuel T. Johnson Jr., MD',
  
  'sandra dennis': 'Sandra Dennis, FNP',
  'sandra dennis, fnp': 'Sandra Dennis, FNP',
  
  'sandra freeman': 'Sandra Freeman',
  
  'sandra mcneill': 'Sandra McNeill, FNP',
  'sandra mcneill, fnp': 'Sandra McNeill, FNP',
  
  'sandra tharpe': 'Sandra Tharpe, FNP',
  'sandra tharpe-': 'Sandra Tharpe, FNP',
  'sandra tharpe, fnp': 'Sandra Tharpe, FNP',
  'sandra tharpe-, fnp': 'Sandra Tharpe, FNP',
  'sandra trharpe': 'Sandra Tharpe, FNP',
  'sandra trharpe, fnp': 'Sandra Tharpe, FNP',
  
  'sandy henin': 'Sandy Henin',
  
  'sara fancescon': 'Sara Fancescon',
  
  'sara hodge': 'Sara Hodge',
  
  'sara jackson': 'Sara Jackson',
  
  'sara palominio': 'Sara Palomino',
  'sara palomino': 'Sara Palomino',
  'sara palominio, fnp': 'Sara Palomino, FNP',
  'sara palomino, fnp': 'Sara Palomino, FNP',
  
  'sara ward': 'Sara Ward, FNP',
  'sara ward, fnp': 'Sara Ward, FNP',
  
  'sarah benson': 'Sarah Benson, FNP',
  'sarah benson, fnp': 'Sarah Benson, FNP',
  
  'sarah bridges': 'Sarah Bridges, FNP',
  'sara bridges': 'Sarah Bridges, FNP',
  'sarah bridges, fnp': 'Sarah Bridges, FNP',
  
  'sarah crawford': 'Sarah Crawford, FNP',
  'sarah crawford, fnp': 'Sarah Crawford, FNP',
  
  'sarah huffstetler': 'Sarah Huffstetler, APRN',
  'sarah e huffstetler': 'Sarah Huffstetler, APRN',
  'sarah huffstetler, aprn': 'Sarah Huffstetler, APRN',
  
  'scott norris': 'Scott Norris, FNP',
  'scott norris, fnp': 'Scott Norris, FNP',
  
  'scott sadler': 'Scott Sadler, MD',
  'scott sadler, md': 'Scott Sadler, MD',
  
  'selmer wth': 'Selmer WTH',
  
  'sere merriman': 'Sere Merriman',
  
  'seunghyun kim': 'Seunghyun Kim',
  
  'shanea hines': 'Shanea Hines, DNP',
  'shanea hines, dnp': 'Shanea Hines, DNP',
  'shanea hines, fnp': 'Shanea Hines, DNP',
  
  'shannon atchison': 'Shannon Atchison, FNP',
  'shannon atchison, fnp': 'Shannon Atchison, FNP',
  
  'shannon burke': 'Shannon Burke',
  
  'shannon hamilton': 'Shannon Hamilton',
  
  'shant garabedian': 'Shant Garabedian, DO',
  'shant garabedian, do': 'Shant Garabedian, DO',
  
  'shari tidwell': 'Shari Tidwell',
  
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
  'shennlie hendren, aprn': 'Shellie Hendren, APRN',
  
  'sherry eubank': 'Sherry Eubank',
  
  'sherry moore': 'Sherry Moore, FNP',
  'sherry moore, fnp': 'Sherry Moore, FNP',
  
  'sherry page cpnp pmhs': 'Sherry Page, DNP',
  'sherry page cpnp pmhs, dnp': 'Sherry Page, DNP',
  
  'sherry whitby': 'Sherry Whitby, APRN',
  'sherry whitby, aprn': 'Sherry Whitby, APRN',
  'whitby sherry': 'Sherry Whitby, APRN',
  'whitby sherry, fnp': 'Sherry Whitby, APRN',
  'sherry whitby, fnp': 'Sherry Whitby, APRN',
  
  'sherwan ahmad': 'Sherwan Ahmad',
  
  'sheryl bryant': 'Sheryl Bryant',
  
  'sheryl wright': 'Sheryl Wright',
  
  'shieh': 'Shieh',
  
  'shuang fu': 'Shuang Fu',
  
  'sierra clary': 'Sierra Clary, FNP',
  'seirra clary': 'Sierra Clary, FNP',
  'sierra clary, fnp': 'Sierra Clary, FNP',
  
  'simon okewole': 'Simon Okewole',
  
  'somer lambert': 'Somer Lambert, FNP',
  'somer lambert, fnp': 'Somer Lambert, FNP',
  
  'stacey bennett': 'Stacey Bennett, FNP',
  'stacey bennett, fnp': 'Stacey Bennett, FNP',
  
  'staci cownover': 'Staci Cownover, PA-C',
  'staci cownover, -c, pa': 'Staci Cownover, PA-C',
  'staci cownover, pa-c': 'Staci Cownover, PA-C',
  
  'stacye hopper': 'Stacye Hopper, FNP',
  'stacye hopper, fnp': 'Stacye Hopper, FNP',
  
  'stefan scheidler': 'Stefan Scheidler',
  
  'stella white-day': 'Stella White-Day',
  
  'stephanie boling': 'Stephanie Boling, FNP',
  'stephanie boling, fnp': 'Stephanie Boling, FNP',
  
  'stephanie coleman': 'Stephanie Coleman, FNP',
  'stephanie coleman, fnp': 'Stephanie Coleman, FNP',
  
  'stephanie james': 'Stephanie James',
  
  'stephanie little': 'Stephanie Little, PA-C',
  'stephanie little, -c, pa': 'Stephanie Little, PA-C',
  'stephanie little, pa-c': 'Stephanie Little, PA-C',
  
  'stephanie sells': 'Stephanie Sells, FNP',
  'stephanie sells, fnp': 'Stephanie Sells, FNP',
  
  'stephanie southall': 'Stephanie Southall, FNP',
  'stephanie southall, fnp': 'Stephanie Southall, FNP',
  
  'steven buckles': 'Steven Buckles',
  
  'steven gubin': 'Steven Gubin',
  
  'steven weaver': 'Steven Weaver',
  
  'summer alexander': 'Summer Alexander, FNP',
  'summer alexander, fnp': 'Summer Alexander, FNP',
  
  'susan lowry': 'Susan Lowry, MD',
  'susan lowry, md': 'Susan Lowry, MD',
  
  'susan nunez': 'Susan Nunez',
  
  'suzanne morris': 'Suzanne Morris, FNP',
  'suzanne morris, fnp': 'Suzanne Morris, FNP',
  
  'suzette stanley': 'Suzette Stanley, FNP',
  'suszette stanley': 'Suzette Stanley, FNP',
  'suzette stanley, aprn': 'Suzette Stanley, FNP',
  'suzette stanley, fnp': 'Suzette Stanley, FNP',
  'suzette stsnley': 'Suzette Stanley, FNP',
  'suzette stsnley, aprn': 'Suzette Stanley, FNP',
  
  'syble carter': 'Syble Carter, FNP',
  'syble carter, fnp': 'Syble Carter, FNP',
  
  'syed mohsin raza': 'Syed Mohsin Raza',
  
  'syed zaidi': 'Syed Zaidi, MD',
  'syed zaidi, md': 'Syed Zaidi, MD',
  
  'sylvia moore': 'Sylvia Moore',
  
  'tabitha woodard': 'Tabitha Woodard, FNP',
  'tabitha woodard, fnp': 'Tabitha Woodard, FNP',
  
  'tammi ferguson': 'Tammi Ferguson, FNP',
  'tammi ferguson, fnp': 'Tammi Ferguson, FNP',
  
  'tammi martinez': 'Tammi Martinez',
  
  'tammy griffis': 'Tammy Griffis',
  
  'tammy holcomb': 'Tammy Holcomb, FNP',
  'tammy holcomb, fnp': 'Tammy Holcomb, FNP',
  
  'tammy milholen': 'Tammy Milholen',
  
  'tamunoinemi bob-manuel': 'Tamunoinemi Bob-Manuel',
  
  'tanveer aslam': 'Tanveer Aslam, MD',
  'tanveer aslam, md': 'Tanveer Aslam, MD',
  
  'tanya arnold': 'Tanya Arnold, FNP',
  'tanya l arnold': 'Tanya Arnold, FNP',
  'tanya lynn arnold': 'Tanya Arnold, FNP',
  'tanya arnold, fnp': 'Tanya Arnold, FNP',
  'tanya l arnold, aprn': 'Tanya Arnold, FNP',
  'tanya lynn arnold, fnp': 'Tanya Arnold, FNP',
  
  'tanya jackson': 'Tanya Lynn Jackson',
  'tanya lynn jackson': 'Tanya Lynn Jackson',
  
  'tanya mccaskill': 'Tanya McCaskill',
  
  'tara hendrix': 'Tara Hendrix, FNP',
  'tara hendrix, fnp': 'Tara Hendrix, FNP',
  
  'taran coleman': 'Taran Coleman, FNP',
  'taran coleman, fnp': 'Taran Coleman, FNP',
  
  'tarebiye pela': 'Tarebiye Pela',
  
  'tayler johnston': 'Tayler Johnston, APRN',
  'tayler johnston, aprn': 'Tayler Johnston, APRN',
  
  'taylor smith': 'Taylor Smith, PA-C',
  'taylor smith, -c, pa': 'Taylor Smith, PA-C',
  'taylor smith, pa-c': 'Taylor Smith, PA-C',
  
  'teresa cox': 'Teresa Cox, FNP',
  'teresa cox, fnp': 'Teresa Cox, FNP',
  
  'teresa wade': 'Teresa Wade',
  
  'terra micah king': 'Terra Micah King, FNP',
  'terra micah king-': 'Terra Micah King, FNP',
  'terra micah king, fnp': 'Terra Micah King, FNP',
  'terra micah king-, fnp': 'Terra Micah King, FNP',
  
  'terry colotta': 'Terry Colotta, MD',
  'terry colotta, md': 'Terry Colotta, MD',
  
  'terry howel': 'Terry Howell, FNP',
  'terry howell': 'Terry Howell, FNP',
  'terry howel, fnp': 'Terry Howell, FNP',
  'terry howell, fnp': 'Terry Howell, FNP',
  
  'terry o harrison': 'Terry O. Harrison',
  
  'the waters': 'The Waters',
  
  'thomas adams': 'Thomas Adams',
  
  'thomas sanders': 'Thomas Sanders',
  
  'tiffani white': 'Tiffani White, FNP',
  'tiffani white, fnp': 'Tiffani White, FNP',
  
  'tiffany gray': 'Tiffany Gray, FNP',
  'tiffany gray, fnp': 'Tiffany Gray, FNP',
  
  'tiffany simpson': 'Tiffany Simpson, FNP',
  'tiffany simpson, fnp': 'Tiffany Simpson, FNP',
  
  'timothy hayden': 'Timothy Hayden',
  
  'timothy mcpherson': 'Timothy McPherson, DO',
  'timothy mcpherson, do': 'Timothy McPherson, DO',
  
  'timothy pickens': 'Timothy Pickens',
  
  'tke': 'TKE',
  
  'toby hampton': 'Toby Hampton, MD',
  'toby hampton, md': 'Toby Hampton, MD',
  
  'tommy miller, iii': 'Tommy Miller III',
  
  'toni reed': 'Toni Reed, APRN',
  'toni reed, aprn': 'Toni Reed, APRN',
  
  'tonya creasy': 'Tonya Creasy, FNP',
  'tonya creasy.': 'Tonya Creasy, FNP',
  'tonya creasy, fnp': 'Tonya Creasy, FNP',
  
  'tonya freeman': 'Tonya Freeman',
  
  'total life care': 'Total Life Care',
  
  'tracey kizer': 'Tracey Kizer, FNP',
  'traxcey kizer': 'Tracey Kizer, FNP',
  'tracey kizer, fnp': 'Tracey Kizer, FNP',
  
  'traci hill': 'Traci Hill, FNP',
  'traci hill, fnp': 'Traci Hill, FNP',
  
  'tracy little': 'Tracy Little, ANP-BC',
  'tracy little, anp-bc': 'Tracy Little, ANP-BC',
  
  'tracy townes-bougard': 'Tracy Townes-Bougard',
  
  'trent theriac': 'Trent Theriac, FNP',
  'thrent theriac': 'Trent Theriac, FNP',
  'trent theriac, fnp': 'Trent Theriac, FNP',
  
  'tri m.nguyen': 'Tri M. Nguyen, MD',
  'tri m.nguyen, md': 'Tri M. Nguyen, MD',
  
  'tyler parris': 'Tyler Parris',
  
  'tyler sherwood': 'Tyler Sherwood, PA-C',
  'tyler sherwood, -c, pa': 'Tyler Sherwood, PA-C',
  'tyler sherwood, pa-c': 'Tyler Sherwood, PA-C',
  
  'tyler stanfield': 'Tyler Stanfield, PA-C',
  'tyler stanfield, -c, pa': 'Tyler Stanfield, PA-C',
  'tyler stanfield, pa-c': 'Tyler Stanfield, PA-C',
  
  'verneda herring': 'Verneda Herring, FNP',
  'verenda herring': 'Verneda Herring, FNP',
  'verneda herring, fnp': 'Verneda Herring, FNP',
  
  'victoria watson': 'Victoria Watson',
  
  'vincent fry': 'Vincent Fry',
  
  'virginia peebles': 'Virginia Peebles, FNP',
  'virginia peebles, fnp': 'Virginia Peebles, FNP',
  
  'virginia smith': 'Virginia Smith, FNP',
  'virginia c smith': 'Virginia Smith, FNP',
  'virginia smith, fnp': 'Virginia Smith, FNP',
  
  'vivian stokes': 'Vivian Stokes, FNP',
  'vivian stokes, fnp': 'Vivian Stokes, FNP',
  
  'walker-milby jamie': 'Jamie Walker-Milby',
  
  'walter rayford': 'Walter Rayford',
  
  'westtennesseehealthcare': 'West Tennessee Healthcare',
  
  'whitney millican': 'Whitney Millican, FNP',
  'whitney millican, fnp': 'Whitney Millican, FNP',
  
  'whitney moore': 'Whitney Moore, FNP',
  'whitney moore, fnp': 'Whitney Moore, FNP',
  
  'whitney wright': 'Whitney Wright, FNP',
  'whitney wright, fnp': 'Whitney Wright, FNP',
  
  'whitney young': 'Whitney Young, FNP',
  'whitney young, fnp': 'Whitney Young, FNP',
  
  'will merrick': 'William Merrick',
  'william merrick': 'William Merrick',
  
  'william adkins': 'William Adkins',
  
  'william andrew eason': 'William Andrew Eason, MD',
  'william andrew eason, md': 'William Andrew Eason, MD',
  
  'william caice': 'William Caice, DO',
  'william caice, do': 'William Caice, DO',
  'william calce': 'William Caice, DO',
  'william calce, do': 'William Caice, DO',
  
  'william caicedo': 'William Caicedo, FNP',
  'william caicedo, fnp': 'William Caicedo, FNP',
  
  'william carney': 'William Carney, MD',
  'william carney, md': 'William Carney, MD',
  
  'william dement': 'William Dement',
  
  'william gower': 'William Gower, FNP',
  'william gower, fnp': 'William Gower, FNP',
  
  'william mckee': 'William McKee, MD',
  'neil mckee': 'William McKee, MD',
  'william mckee, md': 'William McKee, MD',
  
  'william mcmahon': 'William McMahon',
  
  'william shaw': 'William Shaw, FNP',
  'william shaw, fnp': 'William Shaw, FNP',
  
  'william stone': 'William Stone, MD',
  'william k.stone': 'William Stone, MD',
  'william stone, md': 'William Stone, MD',
  
  'william turner': 'William Turner, MD',
  'william turner, md': 'William Turner, MD',
  
  'william white': 'William White, FNP',
  'william white, fnp': 'William White, FNP',
  
  'yamini menon': 'Yamini Menon, MD',
  'yamini menon, md': 'Yamini Menon, MD',
  
  'yaohui chai': 'Yaohui Chai, MD',
  'yaohui chai, md': 'Yaohui Chai, MD',
  
  'zaher al-shallah': 'Zaher Al-Shallah',
  
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

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Main entry point for V4 provider normalization
 * Call this from your menu
 */
function runProviderNormalizationV4() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '👨‍⚕️ Provider Normalization V4',
    'This will:\n' +
    '• Deduplicate all provider names\n' +
    '• Standardize credentials (MD, DO, NP, etc.)\n' +
    '• Identify self-referrals and VA referrals\n' +
    '• Create a backup before processing\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    
    // Create backup if enabled
    if (PROVIDER_V4_CONFIG.CREATE_BACKUP) {
      createProviderBackup();
    }
    
    const results = processProvidersV4(sheet);
    
    ui.alert(
      '✅ Provider Normalization Complete',
      `Processed: ${results.processed}\n` +
      `Corrected: ${results.corrected}\n` +
      `Duplicates consolidated: ${results.duplicatesFixed}\n` +
      `Self-referrals: ${results.selfReferrals}\n` +
      `VA referrals: ${results.vaReferrals}\n` +
      `Unknown: ${results.unknown}\n` +
      `Unique providers: ${results.uniqueProviders}\n\n` +
      `Check "Provider V4 Report" sheet for details.`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('Error', 'Provider normalization failed: ' + error.message, ui.ButtonSet.OK);
    console.error('Provider normalization V4 error:', error);
  }
}

/**
 * Process all providers with V4 normalization
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to process
 * @returns {Object} Processing statistics
 */
function processProvidersV4(sheet) {
  const startTime = new Date();
  console.log('Starting Provider Normalization V4...');
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    throw new Error('No data to process');
  }
  
  // Get all provider data
  const range = sheet.getRange(2, PROVIDER_V4_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  const backgrounds = [];
  const notes = [];
  
  // Statistics tracking
  const stats = {
    processed: 0,
    corrected: 0,
    duplicatesFixed: 0,
    selfReferrals: 0,
    vaReferrals: 0,
    unknown: 0,
    providerMap: new Map(),
    duplicateMap: new Map()
  };
  
  // First pass: count duplicates
  values.forEach(row => {
    const provider = row[0];
    if (provider && provider !== '') {
      const normalized = normalizeProviderV4(provider.toString());
      const key = normalized.normalized.toLowerCase();
      
      if (!stats.duplicateMap.has(key)) {
        stats.duplicateMap.set(key, []);
      }
      stats.duplicateMap.get(key).push(provider);
    }
  });
  
  // Count duplicates fixed
  stats.duplicateMap.forEach((variations, key) => {
    if (variations.length > 1) {
      stats.duplicatesFixed += variations.length - 1;
    }
  });
  
  // Process each row
  for (let i = 0; i < values.length; i++) {
    const originalValue = values[i][0];
    
    if (originalValue && originalValue !== '') {
      stats.processed++;
      
      const result = normalizeProviderV4(originalValue.toString());
      
      values[i][0] = result.normalized;
      backgrounds[i] = [result.backgroundColor];
      
      // Track statistics
      if (result.category === 'self-referral') stats.selfReferrals++;
      if (result.category === 'va') stats.vaReferrals++;
      if (result.category === 'unknown') stats.unknown++;
      if (result.wasNormalized) stats.corrected++;
      
      // Track unique providers
      stats.providerMap.set(result.normalized, 
        (stats.providerMap.get(result.normalized) || 0) + 1);
      
      // Add note if significant change
      if (result.note && result.wasNormalized) {
        notes.push({
          row: i + 2,
          col: PROVIDER_V4_CONFIG.COLUMN.INDEX,
          message: result.note
        });
      }
    } else {
      backgrounds[i] = ['#FFFFFF'];
    }
  }
  
  // Apply changes in batch
  range.setValues(values);
  range.setBackgrounds(backgrounds);
  
  // Add notes (limit to prevent quota issues)
  const maxNotes = 100;
  notes.slice(0, maxNotes).forEach(note => {
    sheet.getRange(note.row, note.col).setNote(note.message);
  });
  
  const endTime = new Date();
  const processingTime = (endTime - startTime) / 1000;
  
  console.log(`Provider Normalization V4 complete in ${processingTime} seconds`);
  
  // Generate report
  stats.uniqueProviders = stats.providerMap.size;
  generateProviderReportV4(stats);
  
  // Save timestamp
  PropertiesService.getDocumentProperties()
    .setProperty('LAST_PROVIDER_V4_RUN', new Date().toISOString());
  
  return stats;
}

/**
 * Normalize a single provider name using V4 logic
 * @param {string} providerInput - Raw provider name
 * @returns {Object} Normalization result
 */
function normalizeProviderV4(providerInput) {
  if (!providerInput) {
    return {
      normalized: '',
      original: '',
      wasNormalized: false,
      backgroundColor: '#FFFFFF',
      category: 'empty'
    };
  }
  
  const original = providerInput.toString().trim();
  let cleaned = cleanProviderNameV4(original);
  
  // Check dictionary first
  const lowerCleaned = cleaned.toLowerCase();
  
  if (PROVIDER_V4_DICTIONARY[lowerCleaned]) {
    const standardized = PROVIDER_V4_DICTIONARY[lowerCleaned];
    
    // Determine category and color
    let category = 'standard';
    let backgroundColor = PROVIDER_V4_CONFIG.FORMATTING.CORRECTED_COLOR;
    
    if (standardized === 'Self Referral') {
      category = 'self-referral';
      backgroundColor = PROVIDER_V4_CONFIG.FORMATTING.SELF_REFERRAL_COLOR;
    } else if (standardized === 'VA Medical Center' || standardized.includes('VA ')) {
      category = 'va';
      backgroundColor = PROVIDER_V4_CONFIG.FORMATTING.VA_COLOR;
    } else if (standardized === 'Unknown Provider') {
      category = 'unknown';
      backgroundColor = PROVIDER_V4_CONFIG.FORMATTING.UNKNOWN_COLOR;
    } else if (original !== standardized) {
      backgroundColor = PROVIDER_V4_CONFIG.FORMATTING.DUPLICATE_COLOR;
    }
    
    return {
      normalized: standardized,
      original: original,
      wasNormalized: original !== standardized,
      backgroundColor: backgroundColor,
      category: category,
      note: original !== standardized ? `Was: ${original}` : null
    };
  }
  
  // If not in dictionary, apply intelligent normalization
  const intelligentNormalized = intelligentNormalizeV4(cleaned);
  
  return {
    normalized: intelligentNormalized,
    original: original,
    wasNormalized: original !== intelligentNormalized,
    backgroundColor: original !== intelligentNormalized ? 
      PROVIDER_V4_CONFIG.FORMATTING.CORRECTED_COLOR : '#FFFFFF',
    category: 'new',
    note: original !== intelligentNormalized ? 
      `Auto-normalized: ${original}` : null
  };
}

/**
 * Clean provider name - V4 version
 * @private
 */
function cleanProviderNameV4(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')              // Multiple spaces to single
    .replace(/\s*,\s*/g, ', ')         // Clean commas
    .replace(/\s*-\s*/g, '-')          // Clean hyphens
    .replace(/\s*\.\s*/g, '.')         // Clean periods
    .replace(/['']s\s/g, "'s ")        // Standardize apostrophes
    .replace(/\s+$/, '')               // Remove trailing spaces
    .replace(/^\.+|\.+$/g, '');        // Remove leading/trailing dots
}

/**
 * Intelligent normalization for providers not in dictionary
 * @private
 */
function intelligentNormalizeV4(name) {
  // Extract credentials
  const credentialMap = {
    'md': 'MD',
    'm.d.': 'MD',
    'm.d': 'MD',
    'do': 'DO',
    'd.o.': 'DO',
    'd.o': 'DO',
    'np': 'NP',
    'n.p.': 'NP',
    'n.p': 'NP',
    'fnp': 'FNP',
    'fnp-c': 'FNP-C',
    'fnp-bc': 'FNP-BC',
    'pa': 'PA',
    'pa-c': 'PA-C',
    'p.a.': 'PA',
    'p.a.-c': 'PA-C',
    'aprn': 'APRN',
    'apn': 'APN',
    'dnp': 'DNP',
    'cnm': 'CNM',
    'anp-bc': 'ANP-BC',
    'acnp': 'ACNP',
    'cfnp': 'CFNP',
    'lpn': 'LPN',
    'rn': 'RN',
    'msn': 'MSN',
    'facc': 'FACC',
    'phd': 'PhD',
    'dpm': 'DPM'
  };
  
  let normalized = name;
  let extractedCredential = '';
  
  // Find and extract credential
  for (const [pattern, replacement] of Object.entries(credentialMap)) {
    const regex = new RegExp(`\\b${pattern.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(normalized)) {
      extractedCredential = replacement;
      normalized = normalized.replace(regex, '').trim();
      normalized = normalized.replace(/,$/, '').trim(); // Remove trailing comma
      break;
    }
  }
  
  // Proper case the name
  normalized = properCaseProviderV4(normalized);
  
  // Add credential back
  if (extractedCredential) {
    normalized = `${normalized}, ${extractedCredential}`;
  }
  
  return normalized;
}

/**
 * Proper case provider name - V4 version
 * @private
 */
function properCaseProviderV4(name) {
  const specialCases = {
    'mccarver': 'McCarver',
    'mccann': 'McCann',
    'mccaskill': 'McCaskill',
    'mccollum': 'McCollum',
    'mcfarland': 'McFarland',
    'mcintosh': 'McIntosh',
    'mckee': 'McKee',
    'mckinney': 'McKinney',
    'mcmahon': 'McMahon',
    'mcneill': 'McNeill',
    'mcpherson': 'McPherson',
    'mcswain': 'McSwain',
    'mcwilliams': 'McWilliams',
    'lebonheur': 'LeBonheur',
    'larue': 'LaRue',
    'delones': 'DeLones',
    'va': 'VA',
    'ii': 'II',
    'iii': 'III',
    'jr': 'Jr',
    'sr': 'Sr'
  };
  
  return name.split(' ').map((word, index) => {
    const lower = word.toLowerCase();
    
    // Check special cases
    if (specialCases[lower]) {
      return specialCases[lower];
    }
    
    // Handle hyphenated names
    if (word.includes('-')) {
      return word.split('-').map(part => {
        const partLower = part.toLowerCase();
        return specialCases[partLower] || 
               (part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
      }).join('-');
    }
    
    // Handle O'Names
    if (word.toLowerCase().startsWith("o'")) {
      return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    
    // Standard proper case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

/**
 * Generate comprehensive provider report V4
 * @param {Object} stats - Processing statistics
 */
function generateProviderReportV4(stats) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let reportSheet = ss.getSheetByName('Provider V4 Report');
  
  if (!reportSheet) {
    reportSheet = ss.insertSheet('Provider V4 Report');
  } else {
    reportSheet.clear();
  }
  
  // Get top providers
  const topProviders = Array.from(stats.providerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  
  // Get duplicate summary
  const duplicateSummary = Array.from(stats.duplicateMap.entries())
    .filter(([key, variations]) => variations.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);
  
  // Build report content
  const reportData = [];
  
  // Header
  reportData.push(['Provider Normalization V4 Report']);
  reportData.push(['Generated:', new Date().toLocaleString()]);
  reportData.push(['']);
  
  // Summary Statistics
  reportData.push(['SUMMARY STATISTICS']);
  reportData.push(['Total Processed:', stats.processed]);
  reportData.push(['Names Corrected:', stats.corrected]);
  reportData.push(['Duplicates Consolidated:', stats.duplicatesFixed]);
  reportData.push(['Self Referrals:', stats.selfReferrals]);
  reportData.push(['VA Referrals:', stats.vaReferrals]);
  reportData.push(['Unknown Providers:', stats.unknown]);
  reportData.push(['Unique Providers After Deduplication:', stats.uniqueProviders]);
  reportData.push(['']);
  
  // Top Providers
  reportData.push(['TOP 30 REFERRING PROVIDERS']);
  reportData.push(['Provider Name', 'Referral Count', 'Percentage']);
  
  const totalReferrals = stats.processed;
  topProviders.forEach(([provider, count]) => {
    const percentage = ((count / totalReferrals) * 100).toFixed(2) + '%';
    reportData.push([provider, count, percentage]);
  });
  
  reportData.push(['']);
  
  // Duplicate Consolidation Examples
  reportData.push(['TOP DUPLICATE CONSOLIDATIONS']);
  reportData.push(['Standardized Name', 'Variation Count', 'Original Variations (Sample)']);
  
  duplicateSummary.forEach(([standardized, variations]) => {
    const sampleVariations = variations.slice(0, 3).join('; ') + 
                            (variations.length > 3 ? '...' : '');
    reportData.push([
      PROVIDER_V4_DICTIONARY[standardized] || standardized,
      variations.length,
      sampleVariations
    ]);
  });
  
  // Write to sheet
  reportSheet.getRange(1, 1, reportData.length, 3).setValues(reportData);
  
  // Format the report
  reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  reportSheet.getRange(4, 1).setFontSize(12).setFontWeight('bold').setBackground('#E8E8E8');
  reportSheet.getRange(13, 1).setFontSize(12).setFontWeight('bold').setBackground('#E8E8E8');
  reportSheet.getRange(14, 1, 1, 3).setFontWeight('bold').setBackground('#F0F0F0');
  
  const duplicateHeaderRow = 13 + topProviders.length + 3;
  reportSheet.getRange(duplicateHeaderRow, 1).setFontSize(12).setFontWeight('bold').setBackground('#E8E8E8');
  reportSheet.getRange(duplicateHeaderRow + 1, 1, 1, 3).setFontWeight('bold').setBackground('#F0F0F0');
  
  // Auto-resize columns
  reportSheet.autoResizeColumns(1, 3);
  
  // Add color legend
  const legendRow = reportData.length + 2;
  reportSheet.getRange(legendRow, 1).setValue('COLOR LEGEND').setFontWeight('bold');
  reportSheet.getRange(legendRow + 1, 1).setBackground(PROVIDER_V4_CONFIG.FORMATTING.CORRECTED_COLOR);
  reportSheet.getRange(legendRow + 1, 2).setValue('Corrected/Standardized');
  reportSheet.getRange(legendRow + 2, 1).setBackground(PROVIDER_V4_CONFIG.FORMATTING.DUPLICATE_COLOR);
  reportSheet.getRange(legendRow + 2, 2).setValue('Duplicate Consolidated');
  reportSheet.getRange(legendRow + 3, 1).setBackground(PROVIDER_V4_CONFIG.FORMATTING.SELF_REFERRAL_COLOR);
  reportSheet.getRange(legendRow + 3, 2).setValue('Self Referral');
  reportSheet.getRange(legendRow + 4, 1).setBackground(PROVIDER_V4_CONFIG.FORMATTING.VA_COLOR);
  reportSheet.getRange(legendRow + 4, 2).setValue('VA/Government');
  reportSheet.getRange(legendRow + 5, 1).setBackground(PROVIDER_V4_CONFIG.FORMATTING.UNKNOWN_COLOR);
  reportSheet.getRange(legendRow + 5, 2).setValue('Unknown Provider');
  
  console.log('Provider V4 report generated successfully');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create backup before processing
 * @private
 */
function createProviderBackup() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName('Form Responses 1');
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    const backupName = `Backup_Providers_${timestamp}`;
    
    // Check if backup exists
    let backupSheet = ss.getSheetByName(backupName);
    if (backupSheet) {
      ss.deleteSheet(backupSheet);
    }
    
    // Create new backup
    sourceSheet.copyTo(ss).setName(backupName);
    console.log(`Provider backup created: ${backupName}`);
    
    // Clean old backups (keep only last 5)
    const sheets = ss.getSheets();
    const backups = sheets.filter(s => s.getName().startsWith('Backup_Providers_'))
                          .sort((a, b) => b.getName().localeCompare(a.getName()));
    
    if (backups.length > 5) {
      backups.slice(5).forEach(oldBackup => {
        ss.deleteSheet(oldBackup);
        console.log(`Deleted old backup: ${oldBackup.getName()}`);
      });
    }
    
  } catch (error) {
    console.error('Backup creation failed:', error);
    // Continue anyway - backup is not critical
  }
}

/**
 * Analyze current provider data without modifying
 */
function analyzeProvidersV4() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to analyze');
    return;
  }
  
  const range = sheet.getRange(2, PROVIDER_V4_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  const analysis = {
    total: 0,
    empty: 0,
    needsNormalization: 0,
    selfReferrals: 0,
    vaReferrals: 0,
    unknown: 0,
    uniqueBeforeNorm: new Set(),
    uniqueAfterNorm: new Set()
  };
  
  values.forEach(row => {
    const provider = row[0];
    if (!provider || provider === '') {
      analysis.empty++;
    } else {
      analysis.total++;
      const original = provider.toString();
      analysis.uniqueBeforeNorm.add(original);
      
      const normalized = normalizeProviderV4(original);
      analysis.uniqueAfterNorm.add(normalized.normalized);
      
      if (normalized.wasNormalized) {
        analysis.needsNormalization++;
      }
      
      if (normalized.category === 'self-referral') analysis.selfReferrals++;
      if (normalized.category === 'va') analysis.vaReferrals++;
      if (normalized.category === 'unknown') analysis.unknown++;
    }
  });
  
  const reductionPercent = analysis.uniqueBeforeNorm.size > 0 ? 
    Math.round((1 - (analysis.uniqueAfterNorm.size / analysis.uniqueBeforeNorm.size)) * 100) : 0;
  
  const message = `Provider Data Analysis\n\n` +
                 `Total entries: ${analysis.total}\n` +
                 `Empty fields: ${analysis.empty}\n` +
                 `Needs normalization: ${analysis.needsNormalization}\n\n` +
                 `Unique providers before: ${analysis.uniqueBeforeNorm.size}\n` +
                 `Unique providers after: ${analysis.uniqueAfterNorm.size}\n` +
                 `Reduction: ${reductionPercent}%\n\n` +
                 `Self-referrals: ${analysis.selfReferrals}\n` +
                 `VA referrals: ${analysis.vaReferrals}\n` +
                 `Unknown providers: ${analysis.unknown}`;
  
  SpreadsheetApp.getUi().alert('Provider Analysis', message, SpreadsheetApp.getUi().ButtonSet.OK);
  
  return analysis;
}

/**
 * Find providers not in dictionary (for maintenance)
 */
function findNewProvidersV4() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to analyze');
    return [];
  }
  
  const range = sheet.getRange(2, PROVIDER_V4_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  const newProviders = new Set();
  const providerOccurrences = new Map();
  
  values.forEach(row => {
    const provider = row[0];
    if (provider && provider !== '') {
      const cleaned = cleanProviderNameV4(provider.toString());
      const lower = cleaned.toLowerCase();
      
      if (!PROVIDER_V4_DICTIONARY[lower]) {
        const original = provider.toString();
        newProviders.add(original);
        
        // Count occurrences
        providerOccurrences.set(original, (providerOccurrences.get(original) || 0) + 1);
      }
    }
  });
  
  // Sort by frequency
  const newProvidersList = Array.from(newProviders)
    .map(p => ({ name: p, count: providerOccurrences.get(p) }))
    .sort((a, b) => b.count - a.count);
  
  if (newProvidersList.length > 0) {
    console.log('Providers not in dictionary:', newProvidersList);
    
    // Create a sheet with new providers for review
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let newSheet = ss.getSheetByName('New Providers V4');
    
    if (!newSheet) {
      newSheet = ss.insertSheet('New Providers V4');
    } else {
      newSheet.clear();
    }
    
    // Build report data with consistent columns
    const reportData = [];
    reportData.push(['New Providers Not in Dictionary', '']);
    reportData.push(['Generated:', new Date().toLocaleString()]);
    reportData.push(['Total Found:', newProvidersList.length]);
    reportData.push(['', '']);
    reportData.push(['Provider Name', 'Occurrences']);
    
    // Add provider data
    newProvidersList.forEach(provider => {
      reportData.push([provider.name, provider.count]);
    });
    
    // Write data
    newSheet.getRange(1, 1, reportData.length, 2).setValues(reportData);
    
    // Format
    newSheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');
    newSheet.getRange(5, 1, 1, 2).setFontWeight('bold').setBackground('#E8E8E8');
    newSheet.autoResizeColumns(1, 2);
    
    SpreadsheetApp.getUi().alert(
      'New Providers Found',
      `Found ${newProvidersList.length} providers not in dictionary.\n\n` +
      `Top 5 most frequent:\n` +
      newProvidersList.slice(0, 5).map((p, i) => 
        `${i + 1}. ${p.name} (${p.count} times)`
      ).join('\n') +
      '\n\nCheck "New Providers V4" sheet for complete list.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert(
      'All Providers in Dictionary',
      'All providers are already in the normalization dictionary!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
  
  return newProvidersList.map(p => p.name);
}

// ============================================
// MENU INTEGRATION HELPER
// ============================================

/**
 * Add V4 provider functions to your existing menu
 * Call this from your onOpen() function
 */
function addProviderV4MenuItems(ui) {
  // This creates a submenu for V4 provider operations
  return ui.createMenu('👨‍⚕️ Providers V4')
    .addItem('Run Complete Deduplication', 'runProviderNormalizationV4')
    .addItem('Analyze Provider Data', 'analyzeProvidersV4')
    .addItem('Find New Providers', 'findNewProvidersV4')
    .addSeparator()
    .addItem('Generate V4 Report', 'generateProviderReportV4Manual');
}

/**
 * Manual report generation
 */
function generateProviderReportV4Manual() {
  const stats = analyzeProvidersV4();
  if (stats) {
    generateProviderReportV4({
      processed: stats.total,
      corrected: stats.needsNormalization,
      duplicatesFixed: stats.uniqueBeforeNorm.size - stats.uniqueAfterNorm.size,
      selfReferrals: stats.selfReferrals,
      vaReferrals: stats.vaReferrals,
      unknown: stats.unknown,
      uniqueProviders: stats.uniqueAfterNorm.size,
      providerMap: new Map(),
      duplicateMap: new Map()
    });
    
    SpreadsheetApp.getUi().alert('Report generated in "Provider V4 Report" sheet');
  }
}