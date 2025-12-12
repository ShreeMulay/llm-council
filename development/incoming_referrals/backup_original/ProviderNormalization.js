/**
 * Provider Normalization Module - Complete Version
 * @module ProviderNormalization
 * @description Handles standardization, validation, and normalization of referring provider names
 * @author Medical Referral System
 * @version 3.0 - Unified from Series 1-3
 */

/**
 * Configuration for provider normalization
 */
const PROVIDER_CONFIG = {
  COLUMN: {
    INDEX: 5,  // Column E - Referring Provider
    LETTER: 'E'
  },
  FORMATTING: {
    CORRECTED_COLOR: '#E6F3FF',      // Light blue for corrected entries
    UNKNOWN_COLOR: '#FFE6E6',        // Light red for unknown
    SELF_REFERRAL_COLOR: '#FFF3CD',  // Light yellow for self-referrals
    VA_COLOR: '#E8F5E9',             // Light green for VA referrals
    DUPLICATE_COLOR: '#FFE6CC',      // Light orange for duplicates
    DEFAULT_COLOR: '#FFFFFF'          // White for unchanged
  },
  VALIDATION: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    REQUIRE_LETTERS: true
  }
};

/**
 * Provider name standardization dictionary
 * Maps common variations to standardized names
 */
const PROVIDER_STANDARDIZATION_SERIES = {
  // ========== A ==========
  'abdullah arshad': 'Abdullah Arshad, MD',
  'abdullah arshad, md': 'Abdullah Arshad, MD',
  'arshad': 'Abdullah Arshad, MD',
  
  'adam english': 'Adam English, DO',
  'adam english, do': 'Adam English, DO',
  
  'adeyinka agbetoyin': 'Adeyinka Agbetoyin, MD',
  'adeyinka agbetoyin, md': 'Adeyinka Agbetoyin, MD',
  'adey agbetoyin': 'Adeyinka Agbetoyin, MD',
  'adey agbetoyin, md': 'Adeyinka Agbetoyin, MD',
  
  'alexandra buckland': 'Alexandra Buckland, NP',
  'alexandra buckland, np': 'Alexandra Buckland, NP',
  
  'alexandra burns': 'Alexandra Burns, FNP',
  'alexandra burns, fnp': 'Alexandra Burns, FNP',
  'alexandra burns, np': 'Alexandra Burns, FNP',
  
  'alicia graden': 'Alicia Graden, FNP',
  'alicia graden, fnp': 'Alicia Graden, FNP',
  'aleica graden': 'Alicia Graden, FNP',
  
  'alicia springer': 'Alicia Springer, NP',
  'alicia springer, np': 'Alicia Springer, NP',
  'alicia springer n. p': 'Alicia Springer, NP',
  
  'allison jowers': 'Allison Jowers, PA',
  'allison jowers, pa': 'Allison Jowers, PA',
  'allison jowers, pa-c': 'Allison Jowers, PA-C',
  
  'amber fern': 'Amber Fern, FNP',
  'amber steele': 'Amber Steele, FNP',
  'amber steele, fnp': 'Amber Steele, FNP',
  'amber steele, fnp-c': 'Amber Steele, FNP-C',
  
  'amanda fuller': 'Amanda Fuller, FNP-BC',
  'amanda fuller, fnp-bc': 'Amanda Fuller, FNP-BC',
  'amanda fuller fnp bc': 'Amanda Fuller, FNP-BC',
  'amanda fuller fnp-bc': 'Amanda Fuller, FNP-BC',
  
  'amanda hearn': 'Amanda Hearn, NP',
  'amanda hearn, np': 'Amanda Hearn, NP',
  
  'amanda keown': 'Amanda Keown, NP',
  
  'amanda nold': 'Amanda Nold, PA',
  'amanda nold, pa': 'Amanda Nold, PA',
  
  'amanda polman': 'Amanda Polman, FNP-C',
  'amanda polman, fnp-c': 'Amanda Polman, FNP-C',
  'amanda polman, fnp-b': 'Amanda Polman, FNP-C',
  
  'amanda russell': 'Amanda Russell, NP',
  'amanda russell, np': 'Amanda Russell, NP',
  'amanda e russell, np': 'Amanda Russell, NP',
  'mandy russell': 'Amanda Russell, NP',
  'mandy russell, np': 'Amanda Russell, NP',
  'mandy russell, fnp': 'Amanda Russell, FNP',
  
  'amanda taylor': 'Amanda Taylor, NP',
  'amanda tuner': 'Amanda Turner, FNP',
  'amanda tuner, np': 'Amanda Turner, FNP',
  'amanda tuner, fnp': 'Amanda Turner, FNP',
  'amanda turner': 'Amanda Turner, FNP',
  'amanda turner, fnp': 'Amanda Turner, FNP',
  
  'amiee stooksberry': 'Amiee Stooksberry, APRN',
  'amiee stooksberry, aprn': 'Amiee Stooksberry, APRN',
  'amiee stooksberry, np': 'Amiee Stooksberry, NP',
  'aimee stooksberry': 'Amiee Stooksberry, APRN',
  
  'amie roland': 'Amie Roland, FNP',
  'amie roland, fnp': 'Amie Roland, FNP',
  
  'amy medford': 'Amy Medford, FNP',
  'amy medford, fnp': 'Amy Medford, FNP',
  'amy medford, apn-fnp': 'Amy Medford, FNP',
  
  'amy myers': 'Amy Myers, NP',
  'amy myers, np': 'Amy Myers, NP',
  
  'amy smith': 'Amy Smith, PA',
  'amy smith, pa': 'Amy Smith, PA',
  'amy jackson smith': 'Amy Smith, PA-C',
  'amy jackson smith, pa': 'Amy Smith, PA-C',
  'amy jackson smith, pa-c': 'Amy Smith, PA-C',
  
  'amy wynn': 'Amy Wynn, NP',
  
  'andrea hay': 'Andrea Hay, FNP',
  'andrea hay, fnp': 'Andrea Hay, FNP',
  
  'andrea melvin': 'Andrea Melvin, NP',
  
  'andrea swain': 'Andrea Swain, NP',
  'andria swain': 'Andrea Swain, NP',
  
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
  
  'angela uta': 'Angela Uta, NP',
  'angela uta, np': 'Angela Uta, NP',
  
  'angela warren': 'Angela Warren, FNP',
  'angel warren': 'Angel Warren, FNP',
  'angel warren, fnp': 'Angel Warren, FNP',
  
  'angeli jain': 'Angeli Jain, MD',
  'angeli jain, md': 'Angeli Jain, MD',
  'angela jain': 'Angeli Jain, MD',
  
  'annie kate massey': 'Annie Kate Massey, PA-C',
  'annie kate massey, pa': 'Annie Kate Massey, PA-C',
  'annie kate massey, pa-c': 'Annie Kate Massey, PA-C',
  'annie k. massey, pa-c': 'Annie Kate Massey, PA-C',
  
  'april mckinney': 'April McKinney, FNP',
  
  'april nichols': 'April Nichols, NP',
  
  'april walker': 'April Walker, FNP',
  'april walker, fnp': 'April Walker, FNP',
  
  'archie wright': 'Archie Wright, MD',
  'archie wright, md': 'Archie Wright, MD',
  
  'arun rao': 'Arun Rao, MD',
  
  'ashleigh mcintosh': 'Ashleigh McIntosh, NP',
  'ashleigh mcintosh, np': 'Ashleigh McIntosh, NP',
  'ashleigh mcintosh, fnp': 'Ashleigh McIntosh, FNP',
  
  'ashleigh melvin': 'Ashleigh Melvin, NP',
  'ashleigh melvin, np': 'Ashleigh Melvin, NP',
  
  'ashley baker': 'Ashley Baker, FNP',
  'ashley baker, fnp': 'Ashley Baker, FNP',
  'ashley baker, np': 'Ashley Baker, FNP',
  
  'ashley caldwell': 'Ashley Caldwell, FNP',
  'ashley caldwell, fnp': 'Ashley Caldwell, FNP',
  
  'ashley freeman': 'Ashley Freeman, FNP',
  'ashley freeman, fnp': 'Ashley Freeman, FNP',
  'ashley freemand': 'Ashley Freeman, FNP',
  
  'ashley gullett': 'Ashley Gullett, FNP',
  
  'ashley pennington': 'Ashley Pennington, NP',
  'ashley pennington, np': 'Ashley Pennington, NP',
  
  'ashley shaw': 'Ashley Shaw, FNP',
  'ashley shaw, fnp': 'Ashley Shaw, FNP',
  
  'ashraf alqaqa': 'Ashraf Alqaqa, MD',
  'ashraf alqaqa, md': 'Ashraf Alqaqa, MD',
  
  'autumn ellis': 'Autumn Ellis, FNP',
  'autun ellis': 'Autumn Ellis, FNP',
  
  'ayesha jaleel': 'Ayesha Jaleel, MD',
  'ayesha tribble': 'Ayesha Tribble, NP',
  
  // ========== B ==========
  'barry wall': 'Barry Wall, MD',
  
  'beatrice concepcion': 'Beatrice Concepcion, NP',
  
  'becky bruce': 'Becky Bruce, FNP',
  'becky bruce, fnp': 'Becky Bruce, FNP',
  'beckie johnson': 'Becky Johnson, CNM',
  
  'belinda hilliard': 'Belinda Presley, DNP',
  'belinda hillliard presley': 'Belinda Presley, DNP',
  'belinda hilliard presley': 'Belinda Presley, DNP',
  'belinda hilliard (presley)': 'Belinda Presley, DNP',
  'belinda presley': 'Belinda Presley, DNP',
  'belinda presley, dnp': 'Belinda Presley, DNP',
  'beninda presley': 'Belinda Presley, DNP',
  'belinda presley hilliard': 'Belinda Presley, DNP',
  
  'ben reese': 'Benjamin Reese, PA-C',
  'ben reese, pa-c': 'Benjamin Reese, PA-C',
  'ben reese., pa-c': 'Benjamin Reese, PA-C',
  'ben reese pacq': 'Benjamin Reese, PA-C',
  'benjamin reese': 'Benjamin Reese, PA-C',
  'benjamin reese, pa-c': 'Benjamin Reese, PA-C',
  'benjamin reeese': 'Benjamin Reese, PA-C',
  
  'beth graves': 'Elizabeth Graves, NP',
  'beth graves, np': 'Elizabeth Graves, NP',
  
  'beth henson': 'Beth Henson, NP',
  'beth hinson': 'Beth Hinson, NP',
  
  'beth ruiz': 'Beth Ruiz, PA',
  'beth ruiz, pa': 'Beth Ruiz, PA',
  'beth ruiz, pa-c': 'Beth Ruiz, PA-C',
  
  'bethany jackson': 'Bethany Jackson, MD',
  'bethany jackson, md': 'Bethany Jackson, MD',
  
  'bethany kelley': 'Bethany Kelley, NP',
  'bethany kelley, np': 'Bethany Kelley, NP',
  
  'bethany mcswain': 'Bethany McSwain, NP',
  
  'bethany russell': 'Bethany Russell, NP',
  
  'betsy akin': 'Betsy Akin, FNP',
  'betsy akin, fnp': 'Betsy Akin, FNP',
  'betsy akin, np': 'Betsy Akin, NP',
  
  'betty roe': 'Betty Roe, FNP',
  'betty roe, fnp': 'Betty Roe, FNP',
  
  'beverly mccann': 'Beverly McCann, FNP',
  'beverly mccann, fnp': 'Beverly McCann, FNP',
  
  'brad adkins': 'Brad Adkins, NP',
  'brad creekmore': 'Brad Creekmore, NP',
  
  'bradley gatlin': 'Bradley Gatlin, FNP-C',
  'bradley gatlin, fnp-c': 'Bradley Gatlin, FNP-C',
  
  'brandon churchill': 'Brandon Churchill, NP',
  'brandon churchill ssd': 'Brandon Churchill, NP',
  
  'brandon pate': 'Brandon Pate, FNP',
  'brandon pate, fnp': 'Brandon Pate, FNP',
  'brandon pate, np': 'Brandon Pate, NP',
  
  'brandi rose': 'Brandi Rose, FNP',
  'brandi rose, fnp': 'Brandi Rose, FNP',
  'brandi rose, np': 'Brandi Rose, NP',
  
  'brandy latham steelman': 'Brandy Latham Steelman, NP',
  'brandy latham steelman, np': 'Brandy Latham Steelman, NP',
  'brandy steelman': 'Brandy Latham Steelman, NP',
  'brandy steelman, np': 'Brandy Latham Steelman, NP',
  'steelman': 'Brandy Latham Steelman, NP',
  
  'brandy rogers': 'Brandy Rogers, FNP-C',
  'brandy rogers, fnp': 'Brandy Rogers, FNP-C',
  'brandy rogers, fnp-c': 'Brandy Rogers, FNP-C',
  
  'bran mccarver': 'Brian McCarver, MD',
  'brian mccarver': 'Brian McCarver, MD',
  'brian mccarver, md': 'Brian McCarver, MD',
  
  'brian fullwood': 'Brian Fullwood, NP',
  
  'brian qualls': 'Brian Qualls, NP',
  
  'brent amzow': 'Brent Zamzow, MD',
  'brent zamzow': 'Brent Zamzow, MD',
  'zamzow': 'Brent Zamzow, MD',
  
  'brent rudder': 'Michiel Rudder, FNP',
  'michiel brent rudder': 'Michiel Rudder, FNP',
  'michiel brent rudder, fnp': 'Michiel Rudder, FNP',
  'michiel rudder': 'Michiel Rudder, FNP',
  'michiel rudder, fnp': 'Michiel Rudder, FNP',
  'michael rudder': 'Michiel Rudder, FNP',
  
  'brittany bennett': 'Brittany Bennett, NP',
  
  'brittany lynch': 'Brittany Lynch, APRN',
  'brittany lynch, aprn': 'Brittany Lynch, APRN',
  'brittany lynch aprn and dr. charlotte coleman, md': 'Brittany Lynch, APRN',
  
  'brittany proudfit': 'Brittany Proudfit, FNP-C',
  'brittany proudfit, fnp-c': 'Brittany Proudfit, FNP-C',
  
  'brittany rauchle': 'Brittany Rauchle, FNP',
  'brittany rauchle, fnp': 'Brittany Rauchle, FNP',
  
  'brooke bedwell': 'Brooke Bedwell, FNP',
  'brooke bedwell, fnp': 'Brooke Bedwell, FNP',
  
  'brooke creasy': 'Brooke Creasy, NP',
  
  'brooke garner': 'Brooke Garner, FNP',
  'brooke garner, fnp': 'Brooke Garner, FNP',
  'brooke garner, fnp-c': 'Brooke Garner, FNP-C',
  
  'bruce brown': 'Bruce Brown, MD',
  
  'bryan merrick': 'Bryan Merrick, NP',
  'bryan tygart': 'Bryan Tygart, MD',
  'md bryan tygart': 'Bryan Tygart, MD',
  
  'buffy cook': 'Buffy Cook, MD',
  'buffy cook, md': 'Buffy Cook, MD',
  'buffy jay cook': 'Buffy Cook, MD',
  
  'byron breeding': 'Byron Breeding, PA-C',
  'byron breeding, pa-c': 'Byron Breeding, PA-C',
  'byron breeeding': 'Byron Breeding, PA-C',
  
  // ========== C ==========
  'caitlin hawkins': 'Caitlin Hawkins, PA-C',
  'caitlin hawkins, pa-c': 'Caitlin Hawkins, PA-C',
  
  'caitlin wamble': 'Caitlin Wamble, NP',
  
  'caitlyn trostel': 'Caitlyn Trostel, NP',
  
  'candace rowland': 'Candace Rowland, NP',
  
  'candice jones': 'Candice Jones, DO',
  'candice jones, do': 'Candice Jones, DO',
  'candice l jones, do': 'Candice Jones, DO',
  
  'cara roberson': 'Cara Roberson, FNP',
  'cara roberson, fnp': 'Cara Roberson, FNP',
  
  'care rite pllc': 'CareRite, PLLC',
  'carerite, pllc': 'CareRite, PLLC',
  
  'carey frix': 'Carey Frix, MD',
  'carey frix, md': 'Carey Frix, MD',
  
  'carie cox': 'Carie Cox, FNP-C',
  'carie cox, fnp-c': 'Carie Cox, FNP-C',
  
  'carla': 'Carla, NP',
  
  'carmel verrier': 'Carmel Verrier, NP',
  
  'carol guess': 'Carol Guess, MD',
  'carol guess, md': 'Carol Guess, MD',
  'cw guess': 'Carol Guess, MD',
  'guess': 'Carol Guess, MD',
  
  'carol newman': 'Carolyn Newman, FNP',
  'carolyn m. newman, fnp': 'Carolyn Newman, FNP',
  
  'carolyn marcum': 'Carolyn Marcum, NP',
  
  'carr': 'Carr, MD',
  
  'carter': 'Carter, NP',
  
  'cassidy belew': 'Cassidy Belew, FNP',
  'cassidy belew, fnp': 'Cassidy Belew, FNP',
  'cassidy belew, fnp-c': 'Cassidy Belew, FNP-C',
  'cassidy belew, np': 'Cassidy Belew, FNP',
  
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
  'clarey r dowling m. d': 'Clarey R. Dowling, MD',
  'clarey r. dowling m. d': 'Clarey R. Dowling, MD',
  'clarry dowling': 'Clarey R. Dowling, MD',
  
  'claude pirtle': 'Claude Pirtle, MD',
  'claude pirtle, md': 'Claude Pirtle, MD',
  
  'clay marvin': 'Clay Marvin, FNP-C',
  'clay marvin, fnp': 'Clay Marvin, FNP-C',
  'clay marvin, fnp-c': 'Clay Marvin, FNP-C',
  
  'colton gramse': 'Colton Gramse, NP',
  
  'connie griffin': 'Connie Griffin, NP',
  'connie griffin, np': 'Connie Griffin, NP',
  
  'connie reaves': 'Connie Reaves, FNP',
  'connie reaves, fnp': 'Connie Reaves, FNP',
  'connie reaves, np': 'Connie Reaves, NP',
  
  'conrado': 'Conrado Sioson, MD',
  'conrado sioson': 'Conrado Sioson, MD',
  'conrado sioson, md': 'Conrado Sioson, MD',
  
  'corey page': 'Corey Page, FNP',
  'corey page, fnp': 'Corey Page, FNP',
  'corey paige': 'Corey Page, FNP',
  
  'courtney faught': 'Courtney Faught, APRN',
  'courtney faught, aprn': 'Courtney Faught, APRN',
  'courtney faught, fnp': 'Courtney Faught, FNP',
  
  'courtney shires': 'Courtney Shires, NP',
  
  'cristie vibbert': 'Cristie Vibbert, FNP',
  'cristie vibbert, fnp': 'Cristie Vibbert, FNP',
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
  
  // ========== D ==========
  'dafnis carranza': 'Dafnis Carranza, MD',
  
  'dalton weaver': 'Dalton Weaver, NP',
  
  'daniel crall': 'Daniel Crall, PA',
  'daniel crall, pa': 'Daniel Crall, PA',
  
  'daniel hoit': 'Daniel Hoit, MD',
  'daniel hoit, md': 'Daniel Hoit, MD',
  
  'daniel otten': 'Daniel Otten, MD',
  
  'darren perry': 'Darren Perry, CFNP',
  'darren perry, cfnp': 'Darren Perry, CFNP',
  'darren perry, fnp': 'Darren Perry, FNP',
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
  'david wilbert': 'David J. Wilbert, PA-C',
  'david wilbert, pa-c': 'David J. Wilbert, PA-C',
  
  'david krapf': 'David Krapf, DO',
  'david krapf, do': 'David Krapf, DO',
  'david scott krapf': 'David Krapf, DO',
  'david scott krapf, do': 'David Krapf, DO',
  
  'david l seaton': 'David L. Seaton, MD',
  'david l. seaton': 'David L. Seaton, MD',
  'david l. seaton, md': 'David L. Seaton, MD',
  'david l. steaton': 'David L. Seaton, MD',
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
  
  'davis': 'Davis, NP',
  'davis matthew l': 'Matthew L. Davis, MD',
  
  'day': 'Day, MD',
  
  'd. gregory franz': 'Gregory Franz, MD',
  
  'deb graves': 'Deborah Graves, FNP',
  
  'debbie delones': 'Debra Delones, FNP-C',
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
  'deborah lampley, np': 'Deborah Lampley, NP',
  
  'deborah leggett': 'Deborah Leggett, FNP',
  'deborah leggett, fnp': 'Deborah Leggett, FNP',
  'deborah legett': 'Deborah Leggett, FNP',
  
  'deborah p. jones': 'Deborah P. Jones, NP',
  
  'deborah sherer': 'Deborah Sherer, NP',
  
  'deborah smothers': 'Deborah T. Smothers, FNP',
  'deborah t. smothers': 'Deborah T. Smothers, FNP',
  'deborah t. smothers, fnp': 'Deborah T. Smothers, FNP',
  
  'debra cannon': 'Debra S. Cannon, FNP',
  'debra cannon, fnp': 'Debra S. Cannon, FNP',
  'debra s cannon, fnp': 'Debra S. Cannon, FNP',
  'debra s. cannon, fnp': 'Debra S. Cannon, FNP',
  
  'debra grace': 'Debra Grace, NP',
  
  'dee blakney': 'Dee Blakney, DNP',
  'dee blakney, dnp': 'Dee Blakney, DNP',
  
  'demetria davis': 'Demetria Davis, PA',
  'demetria davis, pa': 'Demetria Davis, PA',
  
  'denean hendren': 'Denean Hendren, NP',
  
  'denise': 'Denise, NP',
  
  'denise shok': 'Denise Shook, NP',
  'denise shok, np': 'Denise Shook, NP',
  'denise shook': 'Denise Shook, NP',
  'denise shook, np': 'Denise Shook, NP',
  
  'derek moeller': 'Derek Moeller, NP',
  
  'derek wakefield': 'Ray Wakefield, FNP',
  
  'deseray melton': 'Deseray Melton, NP',
  
  'desiree holland': 'Desiree Holland, NP',
  'desiree holland, np': 'Desiree Holland, NP',
  'desiree hollland': 'Desiree Holland, NP',
  
  'devin beck': 'Devin Beck, FNP',
  'devin beck, fnp': 'Devin Beck, FNP',
  
  'diane maxwell': 'Diane Maxwell, FNP-BC',
  'diane maxwell, fnp': 'Diane Maxwell, FNP-BC',
  'diane maxwell, fnp-bc': 'Diane Maxwell, FNP-BC',
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
  
  'dr gravenor': 'Gravenor, MD',
  'gravenor': 'Gravenor, MD',
  
  'dr gregory franz @ kirkland cancer center': 'Gregory Franz, MD',
  
  'dr hale in union city': 'John W. Hale, MD',
  
  'dr mckee': 'William N. McKee, MD',
  
  'dr mulay covington': 'Shree Mulay, MD',
  'dr shree mulay': 'Shree Mulay, MD',
  
  'dr naifeh': 'Naifeh, MD',
  
  'dr otten': 'Daniel Otten, MD',
  'otten': 'Daniel Otten, MD',
  
  'dr rhodes': 'Rhodes, MD',
  'rhodes': 'Rhodes, MD',
  
  'dr steven weaver': 'Steven Weaver, MD',
  
  'dr. kumar yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh, md': 'Kumar Yogesh, MD',
  'yogesh': 'Kumar Yogesh, MD',
  
  'dr. machra': 'Ravinder MacHra, MD',
  
  'dr. ronald smith, md': 'Ronald Smith, MD',
  
  'dum piawa': 'Dum Piawa, DO',
  'dum piawa, do': 'Dum Piawa, DO',
  
  // ========== E ==========
  'earl stewart': 'Earl Stewart, MD',
  'earl stewart, md': 'Earl Stewart, MD',
  'earl stewart,, md': 'Earl Stewart, MD',
  'earl l. stewart, md': 'Earl Stewart, MD',
  'earl stewart m. d': 'Earl Stewart, MD',
  'earl swetward, md': 'Earl Stewart, MD',
  
  'edward leichner': 'Edward Leichner, MD',
  
  'elesa miller': 'Elesa Miller, FNP',
  
  'elizabeth anderson': 'Elizabeth Anderson, FNP-C',
  'elizabeth anderson, fnp': 'Elizabeth Anderson, FNP-C',
  'elizabeth anderson, fnp-c': 'Elizabeth Anderson, FNP-C',
  
  'elizabeth frazier': 'Elizabeth Frazier, NP',
  'elizabeth frazier, np': 'Elizabeth Frazier, NP',
  
  'elizabeth graves': 'Elizabeth Graves, FNP',
  'elizabeth graves, fnp': 'Elizabeth Graves, FNP',
  'elizabeth graves, np': 'Elizabeth Graves, NP',
  
  'elizabeth james': 'Elizabeth James, NP',
  
  'elizabeth jones': 'Elizabeth R. Jones, NP',
  'elizabeth jones, np': 'Elizabeth R. Jones, NP',
  'elizabeth r jones, np': 'Elizabeth R. Jones, NP',
  
  'elizabeth londino': 'Elizabeth Londino, NP',
  'londino': 'Elizabeth Londino, NP',
  
  'elizabeth lu': 'Elizabeth Lu, NP',
  
  'elizabeth martin': 'Elizabeth Martin, APN',
  'elizabeth martin, apn': 'Elizabeth Martin, APN',
  
  'elizabeth roberson': 'Elizabeth Roberson, NP',
  
  'elizabeth roberts': 'Elizabeth Wade Roberts, NP',
  'elizabeth roberts, cfnp': 'Elizabeth Wade Roberts, CFNP',
  'elizabeth roberts, np': 'Elizabeth Wade Roberts, NP',
  'elizabeth wade roberts': 'Elizabeth Wade Roberts, NP',
  'elizabeth wade roberts, np': 'Elizabeth Wade Roberts, NP',
  
  'elizabeth rodriguez': 'Elizabeth Rodriguez, MD',
  'elizabeth rodriguez, md': 'Elizabeth Rodriguez, MD',
  
  'elliot kurban': 'Elliot Kurban, MD',
  'elliot kurban, md': 'Elliot Kurban, MD',
  'elliot kurban md/holly bunch, np': 'Elliot Kurban, MD',
  'kurban': 'Elliot Kurban, MD',
  
  'elly riley': 'Elly Riley, NP',
  
  'emily': 'Emily, NP',
  
  'emily bullock': 'Emily K. Bullock, FNP',
  'emily k. bullock, fnp': 'Emily K. Bullock, FNP',
  
  'emily ezell': 'Emily Smothers Ezell, NP',
  'emily smothers ezell': 'Emily Smothers Ezell, NP',
  
  'emily garner': 'Emily Garner, NP',
  'emily garner, np': 'Emily Garner, NP',
  'emily garner., np': 'Emily Garner, NP',
  
  'emily miller': 'Emily Miller, APRN',
  'emily miller, aprn': 'Emily Miller, APRN',
  'emilly miller': 'Emily Miller, APRN',
  
  'emmanuel obi': 'Emmanuel Obi, MD',
  'obi': 'Emmanuel Obi, MD',
  
  'eric hart': 'Eric Hart, PA',
  'eric hart, pa': 'Eric Hart, PA',
  'eric hart, pa-c': 'Eric Hart, PA-C',
  
  'eric sievers': 'Eric Sievers, NP',
  'eric sievrs': 'Eric Sievers, NP',
  
  'erica scheffer': 'Erica Scheffer, MD',
  'erica scheffer, md': 'Erica Scheffer, MD',
  
  'erick stafford': 'Erick Stafford, PA',
  'erick stafford, pa': 'Erick Stafford, PA',
  
  'erin peeden': 'Erin Peeden, NP',
  
  'erin williams': 'Erin Williams, NP',
  
  'esden': 'Esden, MD',
  
  'ethan loeb': 'Ethan Loeb, MD',
  
  'ethel spivey': 'Ethel Spivey, ANP',
  'ethel spivey, anp': 'Ethel Spivey, ANP',
  
  'evelyn jackson': 'Evelyn Nicole Jackson, APN',
  'evelyn jackson, apn': 'Evelyn Nicole Jackson, APN',
  'evelyn n. jackson, fnp': 'Evelyn Nicole Jackson, FNP',
  'evelyn nicole jackson, apn': 'Evelyn Nicole Jackson, APN',
  
  'ezekiel adetunji': 'Ezekiel Adetunji, NP',
  
  // ========== F ==========
  'f. gregory cox': 'F. Gregory Cox, MD',
  'f. gregory cox, md': 'F. Gregory Cox, MD',
  'f. gregory cox,, md': 'F. Gregory Cox, MD',
  'fred cox': 'F. Gregory Cox, MD',
  'fred cox, md': 'F. Gregory Cox, MD',
  'fred g cox, md': 'F. Gregory Cox, MD',
  'fred g. cox, md': 'F. Gregory Cox, MD',
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
  'festus arinze m. d': 'Festus Arinze, MD',
  
  'finley leslie': 'Finley Leslie, NP',
  
  'frank': 'Frank, MD',
  
  'franz': 'Gregory Franz, MD',
  
  'fred sesti': 'Fred Sesti, MD',
  
  // ========== G ==========
  'gary blount': 'Gary Blount, PA-C',
  'gary blount, pa': 'Gary Blount, PA-C',
  'gary blount, pa-c': 'Gary Blount, PA-C',
  'gary christopher blount': 'Gary Blount, PA-C',
  
  'gaudam md nithyalakshmi': 'Nithyalakshmi Gaudam, MD',
  
  'george mangle': 'George Mangle, MD',
  
  'grant jackson': 'Grant Jackson, NP',
  
  'grant studebaker': 'Grant Studebaker, MD',
  
  'gregary byers': 'Gregary C. Byers, FNP-C',
  'gregary byers, fnp-c': 'Gregary C. Byers, FNP-C',
  'gregary c. byers, fnp-c': 'Gregary C. Byers, FNP-C',
  
  'gregg mitchell': 'Gregg Mitchell, NP',
  'mitchell': 'Gregg Mitchell, NP',
  
  'gregory b. franz': 'Gregory Franz, MD',
  'gregory franz': 'Gregory Franz, MD',
  
  'gregory jenkins': 'Gregory Jenkins, MD',
  
  // ========== H ==========
  'hailee tillery': 'Hailee Tillery, FNP',
  'hailee tillery, fnp': 'Hailee Tillery, FNP',
  'hailee tillery, np': 'Hailee Tillery, NP',
  'haille tillery': 'Hailee Tillery, FNP',
  
  'haley sanders': 'Haley Sanders, PA',
  'haley sanders, pa': 'Haley Sanders, PA',
  'haylie sanders': 'Haley Sanders, PA',
  
  'haley scillion': 'Haley Scillion, FNP',
  'haley scillion, fnp': 'Haley Scillion, FNP',
  
  'hans hinterkopf': 'Hans Hinterkopf, PA-C',
  'hans hinterkopf, pa-c': 'Hans Hinterkopf, PA-C',
  
  'harborview': 'Harborview Health Systems',
  'haborveiw': 'Harborview Health Systems',
  
  'haris zafarullah': 'Haris Zafarullah, MD',
  
  'hayti': 'Hayti Medical Center',
  
  'heather a garrett': 'Heather Garrett, FNP',
  'heather garrett': 'Heather Garrett, FNP',
  'heather garrett, fnp': 'Heather Garrett, FNP',
  
  'heather haddock': 'Heather Haddock, FNP',
  'heather haddock, fnp': 'Heather Haddock, FNP',
  'heather haddock, np': 'Heather Haddock, NP',
  'h. haddock, fnp': 'Heather Haddock, FNP',
  'hearther haddock': 'Heather Haddock, FNP',
  
  'heather hobbs': 'Heather Hobbs, FNP',
  'heather hobbs, fnp': 'Heather Hobbs, FNP',
  
  'heather mcfarland': 'Heather McFarland, FNP',
  'heather mcfarland, fnp': 'Heather McFarland, FNP',
  
  'heather mckee': 'Heather McKee, NP',
  
  'heidi hill': 'Heidi Hill, NP',
  'heidi hill, np': 'Heidi Hill, NP',
  
  'hetal patel': 'Hetal Patel, MD',
  'hetal patel, md': 'Hetal Patel, MD',
  
  'hill': 'Hill, NP',
  
  'hillary blankenship': 'Hillary Blankenship, APRN-BC',
  'hillary blankenship, aprn': 'Hillary Blankenship, APRN-BC',
  'hillary blankenship, aprn-bc': 'Hillary Blankenship, APRN-BC',
  
  'hinds': 'Michael Hinds, MD',
  
  'hollie frazier': 'Hollie Frazier, NP',
  'hollie frazier, np': 'Hollie Frazier, NP',
  'hollie fraier, np': 'Hollie Frazier, NP',
  
  'holly bunch': 'Holly Bunch, NP',
  'holly bunch, np': 'Holly Bunch, NP',
  
  'holly sanders': 'Holly Sanders, NP',
  
  'holly shourd': 'Holly Shourd, FNP',
  'holly shourd, fnp': 'Holly Shourd, FNP',
  
  // ========== I ==========
  'ihsan haq': 'Ihsan Haq, MD',
  
  'in epic': 'In Epic System',
  
  'ionela halke': 'Ionela Halke, NP',
  
  'ivy hardin': 'Ivy Hardin, NP',

  // ========== J ==========
  // Jackson
  'jackson': 'Jackson, NP',
  'bethany jackson, md': 'Jackson, Bethany, MD',
  'evelyn jackson, apn': 'Jackson, Evelyn N., APN',
  'evelyn n. jackson, fnp': 'Jackson, Evelyn N., FNP',
  'evelyn nicole jackson, apn': 'Jackson, Evelyn N., APN',
  'grant jackson': 'Jackson, Grant, NP',
  'kenneth scott jackson, np': 'Jackson, Kenneth Scott, NP',
  'lawrence jackson': 'Jackson, Lawrence, NP',
  'sara jackson': 'Jackson, Sara, NP',
  'tanya jackson': 'Jackson, Tanya Lynn, NP',
  'amy jackson smith, pa-c': 'Jackson-Smith, Amy, PA-C',
  
  // Jacobs
  'rosemary jacobs': 'Jacobs, Rosemary, APRN',
  'rosemary jacobs, aprn': 'Jacobs, Rosemary, APRN',
  
  // Jain
  'angeli jain, md': 'Jain, Angeli, MD',
  'angeli jain': 'Jain, Angeli, MD',
  'jain': 'Jain, Angeli, MD',
  'dave jain': 'Jain, Dave, DO',
  'dave jain, do': 'Jain, Dave, DO',
  
  // Jaleel
  'ayesha jaleel': 'Jaleel, Ayesha, MD',
  
  // James
  'stephanie james': 'James, Stephanie, FNP',
  'james l. williams, ii': 'James, L. Williams II, MD',
  'james l williams ii, md': 'James, L. Williams II, MD',
  'katherine james': 'James, Katherine, NP',
  'katherine james, np': 'James, Katherine, NP',
  'alvin james miller': 'James Miller, Alvin, MD',
  
  // Jennings
  'jennifer jennings': 'Jennings, Jennifer, FNP-BC',
  'jennifer jennings, fnp-bc': 'Jennings, Jennifer, FNP-BC',
  'nicole jennings': 'Jennings, Nicole, MD',
  'nicole jennings, md': 'Jennings, Nicole, MD',
  
  // Jenkins
  'gregory jenkins': 'Jenkins, Gregory, MD',
  
  // Jethwani
  'priyanka jethwani': 'Jethwani, Priyanka, MD',
  
  // Johnson/Johnston
  'bethany jackson, md': 'Jackson, Bethany, MD',
  'clara johnson': 'Johnson, Clara, NP',
  'katie johnson, np': 'Johnson, Katie, NP',
  'robert johnson': 'Johnson, Robert, MD',
  'samuel bradberry': 'Johnson, Samuel T. Jr., MD',
  'samuel t johnson jr., md': 'Johnson, Samuel T. Jr., MD',
  'samuel johnson jr., md': 'Johnson, Samuel T. Jr., MD',
  'tayler johnston, aprn': 'Johnston, Tayler, APRN',
  
  // Jones
  'candice jones': 'Jones, Candice, DO',
  'candice jones, do': 'Jones, Candice, DO',
  'candice l jones, do': 'Jones, Candice L., DO',
  'deborah p. jones': 'Jones, Deborah P., NP',
  'elizabeth jones': 'Jones, Elizabeth R., NP',
  'elizabeth jones, np': 'Jones, Elizabeth R., NP',
  'elizabeth r jones, np': 'Jones, Elizabeth R., NP',
  'patti jones': 'Jones, Patti, FNP',
  'patti jones, fnp': 'Jones, Patti, FNP',
  'patti jones, fnp-c': 'Jones, Patti, FNP-C',
  'rebecca jones': 'Jones, Rebecca, NP',
  'rebecca jones, np': 'Jones, Rebecca, NP',
  
  // Jordan
  'jordan daniels': 'Jordan, Daniels, NP',
  'jordan daniels, fnp': 'Jordan, Daniels, FNP',
  'jordan daniels, np': 'Jordan, Daniels, NP',
  'jordan daniels (dr zamzows office)': 'Jordan, Daniels, NP',
  'j daniels': 'Jordan, Daniels, NP',
  'oakley jordan': 'Jordan, Oakley, MD',
  'oakley jordan, md': 'Jordan, Oakley, MD',
  
  // Jowers
  'allison jowers': 'Jowers, Allison, PA',
  'allison jowers, pa': 'Jowers, Allison, PA',
  'allison jowers, pa-c': 'Jowers, Allison, PA-C',
  
  // ==================== K ====================
  // Karri
  'kamala karri, dnp': 'Karri, Kamala, DNP',
  
  // Kaur
  'jasreen kaur': 'Kaur, Jasreen, MD',
  
  // Kee
  'kathy kee': 'Kee, Kathy, FNP-BC',
  'kathy kee, fnp-bc': 'Kee, Kathy, FNP-BC',
  'kathy kee, np': 'Kee, Kathy, NP',
  
  // Kelley
  'bethany kelley, np': 'Kelley, Bethany, NP',
  'kelley': 'Kelley, NP',
  
  // Keown
  'amanda keown': 'Keown, Amanda, NP',
  
  // Kim
  'seunghyun kim': 'Kim, Seunghyun, MD',
  
  // King
  'christie king patterson, np': 'King Patterson, Christie, NP',
  'james king': 'King, James, MD',
  'lisa d king, np': 'King, Lisa D., NP',
  'lisa king': 'King, Lisa, NP',
  'lisa king, np': 'King, Lisa, NP',
  'loretta king': 'King, Loretta, NP',
  'matthew king, fnp': 'King, Matthew, FNP',
  'terra micah king-fnp': 'King, Terra Micah, FNP',
  
  // Kirk
  'jessica kirk': 'Kirk, Jessica, FNP',
  'jessica kirk, fnp': 'Kirk, Jessica, FNP',
  
  // Kizer/Kiezer
  'tracey kizer': 'Kizer, Tracey, NP',
  'tracy kiezer': 'Kizer, Tracey, NP',
  'tracey kizer, np': 'Kizer, Tracey, NP',
  'traxcey kizer, np': 'Kizer, Tracey, NP',
  
  // Knight
  'christopher knight': 'Knight, Christopher, MD',
  'christopher knight, md': 'Knight, Christopher, MD',
  
  // Koon
  'rita koon': 'Koon, Rita, FNP',
  'rita koon, fnp': 'Koon, Rita, FNP',
  
  // Korshun
  'alexandra korshun, md': 'Korshun, Alexandra, MD',
  
  // Krapf
  'david krapf, do': 'Krapf, David Scott, DO',
  'david scott krapf, do': 'Krapf, David Scott, DO',
  
  // Kulpeksa
  'joseph m. kulpeksa m. d': 'Kulpeksa, Joseph M., MD',
  
  // Kumar
  'kumar yogesh': 'Kumar, Yogesh, MD',
  'kumar yogesh, md': 'Kumar, Yogesh, MD',
  'yogesh': 'Kumar, Yogesh, MD',
  
  // Kurban
  'elliot kurban': 'Kurban, Elliot, MD',
  'elliot kurban, md': 'Kurban, Elliot, MD',
  'elliot kurban md/holly bunch, np': 'Kurban, Elliot, MD',
  'kurban': 'Kurban, Elliot, MD',
  
  // ==================== L ====================
  // Laman
  'lori laman, np': 'Laman, Lori, APN',
  'lori laman, apn': 'Laman, Lori, APN',
  'lori f. laman, apn': 'Laman, Lori F., APN',
  
  // Lamb
  'joseph lamb': 'Lamb, Joseph, MD',
  
  // Lamar
  'madison lamar': 'Lamar, Madison, NP-C',
  'madison lamar, np-c': 'Lamar, Madison, NP-C',
  
  // Lambert
  'somer lambert, np': 'Lambert, Somer, NP',
  
  // Lampley
  'deborah lampley, fnp': 'Lampley, Deborah, FNP',
  'deborah lampley, np': 'Lampley, Deborah, NP',
  
  // Lancaster
  'laura lancaster': 'Lancaster, Laura, FNP',
  
  // Landers
  'alicia landers, np': 'Landers, Alicia, NP',
  
  // Langdon
  'laura langdon, pa': 'Langdon, Laura, PA',
  
  // Larsen
  'david larsen': 'Larsen, David, MD',
  'david larsen, md': 'Larsen, David, MD',
  'larsen': 'Larsen, David, MD',
  
  // Latham Steelman (compound name)
  'brandy latham steelman, np': 'Latham Steelman, Brandy, NP',
  'brandy steelman': 'Latham Steelman, Brandy, NP',
  'brandy steelman, np': 'Latham Steelman, Brandy, NP',
  'steelman': 'Latham Steelman, Brandy, NP',
  
  // Lawrence
  'amy lawrence': 'Lawrence, Amy, NP',
  'lawrence': 'Lawrence, Peter, MD',
  'peter lawrence': 'Lawrence, Peter, MD',
  
  // Lawson
  'jeremy lawson, fnp': 'Lawson, Jeremy, FNP',
  
  // Lax
  'kasey lax, fnp': 'Lax, Kasey, FNP',
  
  // Ledbetter
  'chris ledbetter': 'Ledbetter, Chris, MD',
  
  // Ledford
  'mindy ledford': 'Ledford, Mindy, FNP',
  'mindy ledford, fnp': 'Ledford, Mindy, FNP',
  'mindy ledford, np': 'Ledford, Mindy, NP',
  'mindt ledford': 'Ledford, Mindy, FNP',
  'minfy ledford': 'Ledford, Mindy, FNP',
  'mindy ledforf': 'Ledford, Mindy, FNP',
  
  // Lee
  'joon lee, md': 'Lee, Joon, MD',
  'joon lee,, md': 'Lee, Joon, MD',
  'lee': 'Lee, Joon, MD',
  'lee carter': 'Lee Carter, MD',
  
  // Leggett
  'deborah leggett': 'Leggett, Deborah, NP',
  'deborah legett': 'Leggett, Deborah, NP',
  
  // Leichner
  'edward leichner': 'Leichner, Edward, MD',
  
  // Leitherland
  'leitherland family care': 'Leitherland Family Care',
  'leitherland family care clinic': 'Leitherland Family Care',
  
  // Leslie
  'finley leslie': 'Leslie, Finley, NP',
  'leslie ary, acnp': 'Leslie Ary, ACNP',
  'old leslie ary': 'Leslie Ary, ACNP',
  
  // Levesque
  'mary kathryn lunceford-levesque': 'Levesque, Mary Kathryn Lunceford, NP',
  
  // Little
  'russell little': 'Little, Russell, MD',
  'stephanie little, pa-c': 'Little, Stephanie, PA-C',
  'tracy little, anp-bc': 'Little, Tracy, ANP-BC',
  'tracy little': 'Little, Tracy, ANP-BC',
  
  // Loeb
  'ethan loeb': 'Loeb, Ethan, MD',
  
  // Londino
  'elizabeth londino': 'Londino, Elizabeth, MD',
  'londino': 'Londino, Elizabeth, MD',
  
  // Lovette
  'kevin lovette': 'Lovette, Kevin, MD',
  
  // Lowe
  'alisha lowe': 'Lowe, Alisha, NP',
  
  // Lowry
  'susan lowry': 'Lowry, Susan, MD',
  'susan lowry, md': 'Lowry, Susan, MD',
  
  // Lu
  'elizabeth lu': 'Lu, Elizabeth, MD',
  
  // Lunceford
  'mary kathryn lunceford-levesque': 'Lunceford-Levesque, Mary Kathryn, NP',
  
  // Lynch
  'brittany lynch': 'Lynch, Brittany, APRN',
  'brittany lynch, aprn': 'Lynch, Brittany, APRN',
  'brittany lynch aprn and dr. charlotte coleman, md': 'Lynch, Brittany, APRN',
  
  // ==================== M ====================
  // MacHra/Machara
  'ravinder machra': 'MacHra, Ravinder, MD',
  'ravinder machra, md': 'MacHra, Ravinder, MD',
  'ravinder machra,, md': 'MacHra, Ravinder, MD',
  'r machra': 'MacHra, Ravinder, MD',
  'machara': 'MacHra, Ravinder, MD',
  
  // Madrid
  'madrid': 'Madrid, MD',
  
  // Malone (not seen but placeholder)
  
  // Maness
  'david maness': 'Maness, David, DO',
  'david maness, do': 'Maness, David, DO',
  
  // Mangle
  'george mangle': 'Mangle, George, MD',
  
  // Maranto
  'melinda maranto': 'Maranto, Melinda, NP',
  
  // Marcum
  'carolyn marcum': 'Marcum, Carolyn, NP',
  
  // Marshall
  'christopher marshall': 'Marshall, Christopher, MD',
  'christopher marshall, md': 'Marshall, Christopher, MD',
  'christopher d marshall': 'Marshall, Christopher D., MD',
  
  // Martin
  'james martin': 'Martin, James, MD',
  'james w martin, md, llc': 'Martin, James W., MD',
  'karen martin, fnp-c': 'Martin, Karen, FNP-C',
  'kristen martin, pa-c': 'Martin, Kristen, PA-C',
  'madison martin, pa': 'Martin, Madison, PA',
  'michael martin': 'Martin, Michael, MD',
  
  // Martinez
  'tammi martinez': 'Martinez, Tammi, NP',
  
  // Marvin
  'clay marvin, fnp-c': 'Marvin, Clay, FNP-C',
  'clay marvin': 'Marvin, Clay, FNP-C',
  'clay marvin, np': 'Marvin, Clay, FNP-C',
  
  // Mashburn
  'cynthia mashburn': 'Mashburn, Cynthia, FNP',
  'cynthia mashburn, fnp': 'Mashburn, Cynthia, FNP',
  
  // Massey
  'annie kate massey, pa-c': 'Massey, Annie Kate, PA-C',
  'annie k. massey, pa-c': 'Massey, Annie Kate, PA-C',
  
  // Matthews
  'rachel matthews, fnp-bc': 'Matthews, Rachel, FNP-BC',
  
  // Maxwell
  'diane maxwell': 'Maxwell, Diane, FNP-C',
  'diane maxwell, fnp-c': 'Maxwell, Diane, FNP-C',
  'diane maxwell, fnp-bc': 'Maxwell, Diane, FNP-BC',
  'diane maxell, fnp-c': 'Maxwell, Diane, FNP-C',
  
  // May
  'katie may': 'May, Katie, NP',
  'katie may, np': 'May, Katie, NP',
  'katie may, fnp': 'May, Katie, FNP',
  
  // McCallum
  'kelly mccallum, fnp': 'McCallum, Kelly, FNP',
  
  // McCann
  'beverly mccann, fnp': 'McCann, Beverly, FNP',
  
  // McCarver
  'brian mccarver': 'McCarver, Brian, MD',
  'brian mccarver, md': 'McCarver, Brian, MD',
  'bran mccarver, md': 'McCarver, Brian, MD',
  
  // McCaskill
  'tanya mccaskill': 'McCaskill, Tanya, NP',
  
  // McCollum Taylor (compound name)
  'rachel mccollum taylor': 'McCollum Taylor, Rachel, NP',
  'rachel taylor': 'McCollum Taylor, Rachel, NP',
  'rachel taylor, np': 'McCollum Taylor, Rachel, NP',
  
  // McFarland
  'heather mcfarland': 'McFarland, Heather, FNP',
  'heather mcfarland, fnp': 'McFarland, Heather, FNP',
  
  // McIntosh
  'ashleigh mcintosh': 'McIntosh, Ashleigh, FNP',
  'ashleigh mcintosh, fnp': 'McIntosh, Ashleigh, FNP',
  'ashleigh mcintosh, np': 'McIntosh, Ashleigh, NP',
  
  // McKee
  'heather mckee': 'McKee, Heather, NP',
  'mckee': 'McKee, William N., MD',
  'neil mckee': 'McKee, Neil, MD',
  'william mckee': 'McKee, William N., MD',
  'william mckee, md': 'McKee, William N., MD',
  'william n. mckee': 'McKee, William N., MD',
  'william d white': 'McKee, William D., FNP',
  'william white, fnp': 'McKee, William D., FNP',
  
  // McKinney
  'april mckinney': 'McKinney, April, NP',
  
  // McMahon
  'william mcmahon': 'McMahon, William, MD',
  
  // McNeill
  'sandra mcneill': 'McNeill, Sandra, FNP',
  'sandra mcneill, fnp': 'McNeill, Sandra, FNP',
  'sandra mcneill, np': 'McNeill, Sandra, NP',
  'sandra elder mcneill': 'McNeill, Sandra Elder, NP',
  
  // McPherson
  'timothy mcpherson': 'McPherson, Timothy, DO',
  'timothy mcpherson d. o': 'McPherson, Timothy, DO',
  'timothy mcpherson, do': 'McPherson, Timothy, DO',
  
  // McSwain
  'bethany mcswain': 'McSwain, Bethany, NP',
  
  // McWilliams
  'jennifer mcwilliams': 'McWilliams, Jennifer, NP',
  'jennifer mcwilliams, np': 'McWilliams, Jennifer, NP',
  'jennifer mcwillaims': 'McWilliams, Jennifer, NP',
  'jennifer mcwiliams, np': 'McWilliams, Jennifer, NP',
  
  // Mealer
  'angela mealer, fnp': 'Mealer, Angela, FNP',
  'angela mealer, np': 'Mealer, Angela, NP',
  
  // Medford
  'amy medford, fnp': 'Medford, Amy, FNP',
  'amy medford, apn-fnp': 'Medford, Amy, APN-FNP',
  
  // Medlin
  'lisa medlin': 'Medlin, Lisa, NP',
  
  // Melton
  'deseray melton': 'Melton, Deseray, NP',
  
  // Melvin
  'andrea melvin': 'Melvin, Andrea, NP',
  'ashleigh melvin': 'Melvin, Ashleigh, NP',
  'ashleigh melvin, np': 'Melvin, Ashleigh, NP',
  
  // Menon
  'yamini menon, md': 'Menon, Yamini, MD',
  
  // Merriman
  'sere merriman': 'Merriman, Sere, NP',
  
  // Merrick
  'bryan merrick': 'Merrick, Bryan, NP',
  'will merrick': 'Merrick, William, NP',
  'william merrick': 'Merrick, William, NP',
  
  // Middleton
  'cheryl middleton, fnp': 'Middleton, Cheryl, FNP',
  
  // Milholen
  'tammy milholen': 'Milholen, Tammy, NP',
  
  // Miller
  'alvin james miller': 'Miller, Alvin James, MD',
  'elesa miller': 'Miller, Elesa, NP',
  'emily miller': 'Miller, Emily, APRN',
  'emily miller, aprn': 'Miller, Emily, APRN',
  'emilly miller': 'Miller, Emily, APRN',
  'tommy miller, iii': 'Miller, Tommy III, MD',
  
  // Millican
  'whitney millican': 'Millican, Whitney, FNP',
  'whitney millican, fnp': 'Millican, Whitney, FNP',
  'whitney millican, fnp-bc': 'Millican, Whitney, FNP-BC',
  
  // Mineo
  'mineo': 'Mineo, MD',
  
  // Miskelly
  'r scott miskelly, fnp': 'Miskelly, R. Scott, FNP',
  'r. scott miskelly, fnp': 'Miskelly, R. Scott, FNP',
  'randle scott miskelly': 'Miskelly, R. Scott, FNP',
  'randle scott miskelly, fnp': 'Miskelly, R. Scott, FNP',
  'randle miskelly': 'Miskelly, R. Scott, FNP',
  'r scott miskelly tnp': 'Miskelly, R. Scott, FNP',
  'scott miskelly': 'Miskelly, R. Scott, FNP',
  
  // Mitchell
  'gregg mitchell': 'Mitchell, Gregg, NP',
  'mitchell': 'Mitchell, Gregg, NP',
  
  // Mobley
  'joe mobley, md': 'Mobley, Joe, MD',
  
  // Moeller
  'derek moeller': 'Moeller, Derek, MD',
  
  // Montgomery
  'joseph montgomery': 'Montgomery, Joseph, MD',
  
  // Montoya
  'montoya': 'Montoya, MD',
  
  // Moore
  'alison moore, np': 'Moore, Alison, NP',
  'alison moore': 'Moore, Alison, NP',
  'amanda moore, np': 'Moore, Amanda, NP',
  'sherry moore, fnp': 'Moore, Sherry, FNP',
  'sylvia moore': 'Moore, Sylvia, NP',
  'whitney moore, fnp': 'Moore, Whitney, FNP',
  'whitney moore, np': 'Moore, Whitney, NP',
  
  // Moragne (Taylor-Moragne compound)
  'mechelle taylor moragne': 'Taylor-Moragne, Mechelle, MD',
  'mechelle taylor-moragne, md': 'Taylor-Moragne, Mechelle, MD',
  'taylor moragne': 'Taylor-Moragne, Mechelle, MD',
  
  // Morris
  'lisa morris': 'Morris, Lisa, FNP',
  'lisa morris, fnp': 'Morris, Lisa, FNP',
  'lisa morris, fnp-bc': 'Morris, Lisa, FNP-BC',
  'lisa morris, fnp-c': 'Morris, Lisa, FNP-C',
  'suzanne morris, fnp': 'Morris, Suzanne, FNP',
  'suzanne morris, fnp-c': 'Morris, Suzanne, FNP-C',
  
  // Mosher
  'keith mosher': 'Mosher, Keith, MD',
  'keith mosher, md': 'Mosher, Keith, MD',
  
  // Moughrabieh
  'mohammad moughrabieh': 'Moughrabieh, Mohammad, MD',
  'moughrabieh': 'Moughrabieh, Mohammad, MD',
  
  // Mulay
  'dr mulay covington': 'Mulay, Shree, MD',
  'dr shree mulay': 'Mulay, Shree, MD',
  
  // Murphy
  'andrew murphy, md': 'Murphy, Andrew, MD',
  
  // Murtaza
  'malik murtaza': 'Murtaza, Malik, MD',
  
  // Myatt
  'jason myatt': 'Myatt, Jason, NP',
  
  // Myers
  'amy myers, np': 'Myers, Amy, NP',
  'andrew myers, md': 'Myers, Andrew, MD',
  
  // ==================== N ====================
  // Naifeh
  'dr naifeh': 'Naifeh, MD',
  
  // Neal
  'charles neal': 'Neal, Charles, MD',
  
  // Nelson
  'lindsey nelson': 'Nelson, Lindsey, FNP',
  'lindsey nelson, fnp': 'Nelson, Lindsey, FNP',
  'lyndsey nelson': 'Nelson, Lindsey, FNP',
  'rachel nelson, do': 'Nelson, Rachel, DO',
  
  // Newman
  'carol newman': 'Newman, Carol, FNP',
  'carolyn m. newman, fnp': 'Newman, Carolyn M., FNP',
  
  // Nguyen
  'tri m. nguyen, md': 'Nguyen, Tri M., MD',
  
  // Nichols
  'april nichols': 'Nichols, April, NP',
  
  // Nold
  'amanda nold': 'Nold, Amanda, PA',
  'amanda nold, pa': 'Nold, Amanda, PA',
  
  // Nord
  'keith nord, md': 'Nord, Keith, MD',
  
  // Norment
  'norment': 'Norment, NP',
  
  // Norris
  'scott norris': 'Norris, Scott, NP',
  'scott norris, fnp': 'Norris, Scott, FNP',
  'scott norris, np': 'Norris, Scott, NP',
  'scot norris': 'Norris, Scott, NP',
  
  // Northcutt
  'madison northcutt, fnp': 'Northcutt, Madison, FNP',
  'madison northcutt, fnp-c': 'Northcutt, Madison, FNP-C',
  
  // Nuako
  'kofi nuako': 'Nuako, Kofi, MD',
  
  // Nunez
  'susan nunez': 'Nunez, Susan, NP',
  
  // Nwokolo
  'chibuzo nwokolo': 'Nwokolo, Chibuzo, MD',
  'chibuzo nwokolo, md': 'Nwokolo, Chibuzo, MD',
  'lisa alexander nwokolo, np': 'Nwokolo, Lisa Alexander, NP',
  
  // ==================== O ====================
  // Obi
  'emmanuel obi': 'Obi, Emmanuel, MD',
  'obi': 'Obi, Emmanuel, MD',
  
  // Odell
  'angela odell': 'Odell, Angela, NP',
  
  // Odeh
  'osayawe odeh': 'Odeh, Osayawe, MD',
  
  // Odle
  'michael chad odle, fnp': 'Odle, Michael Chad, FNP',
  'michael odle, fnp': 'Odle, Michael Chad, FNP',
  
  // Okewole
  'okewole': 'Okewole, Simon, MD',
  'simon okewole': 'Okewole, Simon, MD',
  
  // Olds
  'melinda olds': 'Olds, Melinda, DNP',
  'melinda olds, dnp': 'Olds, Melinda, DNP',
  
  // Olusanya
  'ayodele olusanya': 'Olusanya, Ayodele, MD',
  
  // Ophelps
  'ophelps': 'Ophelps, NP',
  
  // Otten
  'daniel otten': 'Otten, Daniel, MD',
  'dr otten': 'Otten, Daniel, MD',
  'otten': 'Otten, Daniel, MD',
  
  // Owen
  'mikayla owen': 'Owen, Mikayla, NP',
  'mikayla owen, np': 'Owen, Mikayla, NP',
  
  // ==================== P ====================
  // Page
  'corey page, fnp': 'Page, Corey, FNP',
  'sherry page dnp cpnp pmhs': 'Page, Sherry, DNP',
  'paige': 'Page, NP',
  
  // Palomino
  'sara palomino': 'Palomino, Sara, NP',
  'sara palomino, np': 'Palomino, Sara, NP',
  'sara palominio, np': 'Palomino, Sara, NP',
  
  // Park
  'paul park, md': 'Park, Paul, MD',
  
  // Parker
  'robert scott parker ii, md': 'Parker, Robert Scott II, MD',
  'robert scott parker, ii': 'Parker, Robert Scott II, MD',
  'robert parker': 'Parker, Robert Scott II, MD',
  
  // Parks
  'chelsey parks': 'Parks, Chelsey, DNP',
  'chelsey parks, dnp': 'Parks, Chelsey, DNP',
  'chelsey sparks, np': 'Parks, Chelsey, NP',
  'mary beth parks': 'Parks, Mary Beth, NP',
  
  // Parris
  'tyler parris': 'Parris, Tyler, NP',
  
  // Pate
  'brandon pate': 'Pate, Brandon, FNP',
  'brandon pate, fnp': 'Pate, Brandon, FNP',
  'brandon pate, np': 'Pate, Brandon, NP',
  'mallory pate': 'Pate, Mallory, FNP',
  'mallory pate, fnp': 'Pate, Mallory, FNP',
  
  // Patel
  'hetal patel': 'Patel, Hetal, MD',
  'hetal patel, md': 'Patel, Hetal, MD',
  'kandarp patel': 'Patel, Kandarp, MD',
  'mit patel': 'Patel, Mit, MD',
  'nirav patel': 'Patel, Nirav, MD',
  
  // Patterson
  'christie king patterson, np': 'Patterson, Christie King, NP',
  
  // Payne
  'james payne': 'Payne, James, MD',
  
  // Peacock
  'mackey peacock': 'Peacock, MacKey, MD',
  
  // Peebles
  'virginia peebles': 'Peebles, Virginia, NP',
  'virginia peebles, np': 'Peebles, Virginia, NP',
  
  // Peeden
  'erin peeden': 'Peeden, Erin, NP',
  
  // Peery
  'linda peery, pa': 'Peery, Linda D., PA-C',
  'linda d. peery, pa-c': 'Peery, Linda D., PA-C',
  'linda denise peery, pa-c': 'Peery, Linda D., PA-C',
  
  // Pela
  'tarebiye pela': 'Pela, Tarebiye, MD',
  
  // Pelster
  'meredith pelster': 'Pelster, Meredith, NP',
  
  // Pennington
  'ashley pennington, np': 'Pennington, Ashley, NP',
  
  // Perkins
  'keith l. perkins jr. m. d': 'Perkins, Keith L. Jr., MD',
  
  // Perry
  'darren perry': 'Perry, Darren, CFNP',
  'darren perry, cfnp': 'Perry, Darren, CFNP',
  'darren perry, fnp': 'Perry, Darren, FNP',
  'darren pery': 'Perry, Darren, CFNP',
  'mechelle perry': 'Perry, Mechelle, CFNP',
  'mechelle perry, cfnp': 'Perry, Mechelle, CFNP',
  'mechelle perry, fnp': 'Perry, Mechelle, FNP',
  
  // Peters
  'joseph peters': 'Peters, Joseph, MD',
  'joseph peters, md': 'Peters, Joseph, MD',
  'dr joseph peters': 'Peters, Joseph, MD',
  'dr. joseph peters': 'Peters, Joseph, MD',
  'dr. joseph peters, md': 'Peters, Joseph, MD',
  'dr. joseph peters family practice': 'Peters, Joseph, MD',
  
  // Piawa
  'dum piawa': 'Piawa, Dum, DO',
  'dum piawa, do': 'Piawa, Dum, DO',
  
  // Pickens
  'timothy pickens': 'Pickens, Timothy, MD',
  
  // Pigue
  'meagan pigue, np': 'Pigue, Meagan, NP',
  
  // Pirtle
  'claude pirtle': 'Pirtle, Claude, MD',
  'claude pirtle, md': 'Pirtle, Claude, MD',
  
  // Poindexter
  'jamesa poindexter': 'Poindexter, Jamesa, NP',
  
  // Polman
  'amanda polman, fnp-b': 'Polman, Amanda, FNP-B',
  'amanda polman, fnp-c': 'Polman, Amanda, FNP-C',
  'amanda polman': 'Polman, Amanda, FNP-C',
  
  // Pope
  'penny pope': 'Pope, Penny, FNP',
  'penny pope, fnp': 'Pope, Penny, FNP',
  'penny pope, fnp-c': 'Pope, Penny, FNP-C',
  'penny pope, np': 'Pope, Penny, NP',
  
  // Pratt
  'katelyn pratt, fnp': 'Pratt, Katelyn, FNP',
  'katelyn pratt, np': 'Pratt, Katelyn, NP',
  'mary katelyn pratt, fnp': 'Pratt, Mary Katelyn, FNP',
  'mary katelyn pratt, np': 'Pratt, Mary Katelyn, NP',
  
  // Presley
  'belinda presley': 'Presley, Belinda, DNP',
  'belinda presley, dnp': 'Presley, Belinda, DNP',
  'belinda hillard': 'Presley, Belinda, DNP',
  'belinda hilliard': 'Presley, Belinda, DNP',
  'belinda hilliard (presley)': 'Presley, Belinda, DNP',
  'belinda hilliard presley': 'Presley, Belinda, DNP',
  'beninda presley': 'Presley, Belinda, DNP',
  
  // Proudfit
  'brittany proudfit, fnp': 'Proudfit, Brittany, FNP-C',
  'brittany proudfit, fnp-c': 'Proudfit, Brittany, FNP-C',
  
  // Pulley
  'kelly pulley, fnp': 'Pulley, Kelly, FNP',
  'pulley kelly, np': 'Pulley, Kelly, FNP',
  
  // Putman
  'lauren putman': 'Putman, Lauren, NP',
  
  // ==================== Q ====================
  // Qualls
  'brian qualls': 'Qualls, Brian, MD',
  'qualls harbin family medicine': 'Qualls Harbin Family Medicine',
  
  // Quick
  'angela quick': 'Quick, Angela, NP',
  
  // ==================== R ====================
  // Rains
  'jessica rains': 'Rains, Jessica, PA-C',
  'jessica rains, pa-c': 'Rains, Jessica, PA-C',
  'jessica rains pa_c': 'Rains, Jessica, PA-C',
  
  // Rao
  'arun rao': 'Rao, Arun, MD',
  'rao': 'Rao, Arun, MD',
  
  // Rauchle
  'brittany rauchle': 'Rauchle, Brittany, FNP',
  'brittany rauchle, fnp': 'Rauchle, Brittany, FNP',
  
  // Ray
  'kathy o\'connor wray': 'Ray, Kathy O\'Connor, NP',
  
  // Rayborn
  'lindsey rayborn': 'Rayborn, Lindsey, FNP',
  'lindsey rayborn, fnp': 'Rayborn, Lindsey, FNP',
  
  // Rayford
  'walter rayford': 'Rayford, Walter, MD',
  
  // Reaves
  'connie reaves': 'Reaves, Connie, FNP',
  'connie reaves, fnp': 'Reaves, Connie, FNP',
  'connie reaves, np': 'Reaves, Connie, NP',
  'melanie reaves': 'Reaves, Melanie, FNP',
  'melanie reaves, fnp': 'Reaves, Melanie, FNP',
  
  // Reed
  'toni reed, aprn': 'Reed, Toni, APRN',
  
  // Reese
  'benjamin reese, pa-c': 'Reese, Benjamin, PA-C',
  'ben reese, pa-c': 'Reese, Benjamin, PA-C',
  'ben reese., pa-c': 'Reese, Benjamin, PA-C',
  'ben reeese': 'Reese, Benjamin, PA-C',
  'ben reese pacq': 'Reese, Benjamin, PA-C',
  'benjamin reeese': 'Reese, Benjamin, PA-C',
  'jessica reese, np': 'Reese, Jessica, NP',
  
  // Rhodes
  'dr rhodes': 'Rhodes, MD',
  'rhodes': 'Rhodes, MD',
  
  // Rhoads
  'mary rhoads': 'Rhoads, Mary, NP',
  'mary sue rhoads': 'Rhoads, Mary Sue, NP',
  
  // Richardson
  'brenda richardson': 'Richardson, Brenda, NP',
  
  // Riddick
  'john riddick, md': 'Riddick, John, MD',
  
  // Riels
  'madelyn riels, do': 'Riels, Madelyn, DO',
  
  // Riley
  'elly riley': 'Riley, Elly, NP',
  
  // Rinks
  'makiya rinks': 'Rinks, Makiya, FNP-C',
  'makiya rinks, fnp-c': 'Rinks, Makiya, FNP-C',
  
  // Roberson
  'cara roberson, fnp': 'Roberson, Cara, FNP',
  'elizabeth roberson': 'Roberson, Elizabeth, NP',
  'kately roberson': 'Roberson, Kately, FNP',
  'katelyn roberson': 'Roberson, Katelyn, FNP',
  'katelyn robertson': 'Roberson, Katelyn, FNP',
  'katelyn robertson, fnp': 'Roberson, Katelyn, FNP',
  'kate robertson': 'Roberson, Katelyn, FNP',
  
  // Roberts
  'dave roberts': 'Roberts, David, PA-C',
  'david roberts, pa-c': 'Roberts, David, PA-C',
  'elizabeth roberts': 'Roberts, Elizabeth Wade, NP',
  'elizabeth roberts, np': 'Roberts, Elizabeth Wade, NP',
  'elizabeth wade roberts, np': 'Roberts, Elizabeth Wade, NP',
  'elizabeth roberts, cfnp': 'Roberts, Elizabeth Wade, CFNP',
  'jacqueline roberts': 'Roberts, Jacqueline, NP',
  'kimberly roberts, fnp': 'Roberts, Kimberly, FNP',
  'matthew roberts': 'Roberts, Matthew W., FNP-C',
  'matthew roberts, fnp-c': 'Roberts, Matthew W., FNP-C',
  'matthew w. roberts': 'Roberts, Matthew W., FNP-C',
  'matthew w. roberts, fnp-c': 'Roberts, Matthew W., FNP-C',
  'matthew roberts fnp c': 'Roberts, Matthew W., FNP-C',
  'matthew roberts, np': 'Roberts, Matthew W., FNP-C',
  'michelle roberts': 'Roberts, Michelle, NP',
  'michelle roberts, np': 'Roberts, Michelle, NP',
  'robert burns': 'Roberts, Robert Burns, MD',
  'robertd turner': 'Roberts, Turner, MD',
  
  // Robinson
  'myk robinson': 'Robinson, Myk, MD',
  
  // Rodriguez
  'elizabeth rodriguez, md': 'Rodriguez, Elizabeth, MD',
  
  // Roe
  'betty roe, fnp': 'Roe, Betty, FNP',
  
  // Rogers
  'brandy rogers': 'Rogers, Brandy, FNP',
  'brandy rogers, fnp': 'Rogers, Brandy, FNP',
  'brandy rogers, fnp-c': 'Rogers, Brandy, FNP-C',
  
  // Roland
  'amie roland': 'Roland, Amie, FNP',
  'amie roland, fnp': 'Roland, Amie, FNP',
  
  // Rongey
  'amanda rongey': 'Rongey, Amanda, NP',
  
  // Rose
  'brandi rose': 'Rose, Brandi, FNP',
  'brandi rose, fnp': 'Rose, Brandi, FNP',
  'brandi rose, np': 'Rose, Brandi, NP',
  
  // Rowland
  'candace rowland': 'Rowland, Candace, NP',
  
  // Rudder
  'michiel rudder': 'Rudder, Michiel Brent, FNP',
  'michiel rudder, fnp': 'Rudder, Michiel Brent, FNP',
  'michiel brent rudder, fnp': 'Rudder, Michiel Brent, FNP',
  'brent rudder, fnp': 'Rudder, Michiel Brent, FNP',
  
  // Ruiz
  'beth ruiz, pa': 'Ruiz, Beth, PA',
  'beth ruiz, pa-c': 'Ruiz, Beth, PA-C',
  
  // Rummells
  'logan rummells': 'Rummells, Logan, FNP',
  'logan rummells, fnp': 'Rummells, Logan, FNP',
  'logan rammells': 'Rummells, Logan, FNP',
  
  // Russell
  'amanda russell': 'Russell, Amanda, NP',
  'amanda russell, np': 'Russell, Amanda, NP',
  'amanda russell, fnp': 'Russell, Amanda, FNP',
  'amanda e russell, np': 'Russell, Amanda E., NP',
  'bethany russell': 'Russell, Bethany, NP',
  'laura russell': 'Russell, Laura, CFNP',
  'laura russell, cfnp': 'Russell, Laura, CFNP',
  'laura russell, fnp': 'Russell, Laura, FNP',
  'mandy russell': 'Russell, Mandy, FNP',
  'mandy russell, np': 'Russell, Mandy, NP',
  'mandy russell, fnp': 'Russell, Mandy, FNP',
  
  // Russom
  'kimberly russom, fnp': 'Russom, Kimberly, FNP',
  
  // Rybacki
  'diane rybacki': 'Rybacki, Diane, NP',

  // ========== S PROVIDERS ==========
  'samuel t johnson jr., md': 'Samuel T. Johnson Jr., MD',
  'samuel t johnson jr, md': 'Samuel T. Johnson Jr., MD',
  'samuel johnson jr., md': 'Samuel T. Johnson Jr., MD',
  'samuel johnson jr, md': 'Samuel T. Johnson Jr., MD',
  'samuel bradberry': 'Samuel Bradberry, MD',
  'samuel bradberry, md': 'Samuel Bradberry, MD',
  'samuel bada': 'Samuel Bada, MD',
  'sarah e. huffstetler, aprn': 'Sarah E. Huffstetler, APRN',
  'sarah e huffstetler, aprn': 'Sarah E. Huffstetler, APRN',
  'sarah huffstetler, aprn': 'Sarah E. Huffstetler, APRN',
  'sarah huffsteler': 'Sarah E. Huffstetler, APRN',
  'sarah e. huffstetler': 'Sarah E. Huffstetler, APRN',
  'sarah crawford': 'Sarah Crawford, NP',
  'sarah crawford, np': 'Sarah Crawford, NP',
  'sarah bridges': 'Sarah Bridges, FNP',
  'sarah bridges, fnp': 'Sarah Bridges, FNP',
  'sarah benson, fnp': 'Sarah Benson, FNP',
  'sara palomino': 'Sara Palomino, NP',
  'sara palomino, np': 'Sara Palomino, NP',
  'sara palominio, np': 'Sara Palomino, NP',
  'sara hodge': 'Sara Hodge, NP',
  'sara ward, fnp': 'Sara Ward, FNP',
  'sandra mcneill, fnp': 'Sandra McNeill, FNP',
  'sandra mcneill, np': 'Sandra McNeill, FNP',
  'sandra mcneill': 'Sandra McNeill, FNP',
  'sandra tharpe, fnp': 'Sandra Tharpe, FNP',
  'sandra tharpe-fnp': 'Sandra Tharpe, FNP',
  'sandra trharpe, fnp': 'Sandra Tharpe, FNP',
  'sandra dennis, np': 'Sandra Dennis, NP',
  'sandra elder mcneill': 'Sandra McNeill, FNP',
  'sandra freeman': 'Sandra Freeman, NP',
  'scott sadler, md': 'Scott Sadler, MD',
  'scott sadler': 'Scott Sadler, MD',
  'scott norris': 'Scott Norris, NP',
  'scott norris, np': 'Scott Norris, NP',
  'scott norris, fnp': 'Scott Norris, FNP',
  'r scott miskelly, fnp': 'R. Scott Miskelly, FNP',
  'r. scott miskelly, fnp': 'R. Scott Miskelly, FNP',
  'randle scott miskelly': 'R. Scott Miskelly, FNP',
  'randle scott miskelly, fnp': 'R. Scott Miskelly, FNP',
  'r scott miskelly tnp': 'R. Scott Miskelly, FNP',
  'scott miskelly': 'R. Scott Miskelly, FNP',
  'scates paul e, md': 'Paul E. Scates, MD',
  'paul scates, md': 'Paul E. Scates, MD',
  'salman saeed, md': 'Salman Saeed, MD',
  'shant garabedian': 'Shant Garabedian, DO',
  'shant garabedian d. o': 'Shant Garabedian, DO',
  'shant garabedian, do': 'Shant Garabedian, DO',
  'shannon atchison, fnp': 'Shannon Atchison, FNP',
  'shannon atchison': 'Shannon Atchison, FNP',
  'shanea hines, fnp': 'Shanea Hines, FNP',
  'shanea hines, np': 'Shanea Hines, FNP',
  'shanea hines, dnp': 'Shanea Hines, DNP',
  'shanea hines, cfnp': 'Shanea Hines, FNP',
  'shanea hines': 'Shanea Hines, FNP',
  'shari tidwell': 'Shari Tidwell, FNP',
  'sheryl wright': 'Sheryl Wright, FNP',
  'sheryl bryant': 'Sheryl Bryant, FNP',
  'sherry page dnp cpnp pmhs': 'Sherry Page, DNP',
  'sherry whitby, aprn': 'Sherry Whitby, APRN',
  'sherry whitby, np': 'Sherry Whitby, APRN',
  'whitby sherry, np': 'Sherry Whitby, APRN',
  'sherry whitby': 'Sherry Whitby, APRN',
  'sherry moore, fnp': 'Sherry Moore, FNP',
  'sherry eubank': 'Sherry Eubank, FNP',
  'shellie hendren, aprn': 'Shellie Hendren, APRN',
  'shennlie hendren, aprn': 'Shellie Hendren, APRN',
  'stephanie little, pa-c': 'Stephanie Little, PA-C',
  'stephanie sells, fnp': 'Stephanie Sells, FNP',
  'stephanie sells': 'Stephanie Sells, FNP',
  'stephanie boling': 'Stephanie Boling, FNP-C',
  'stephanie boling, fnp-c': 'Stephanie Boling, FNP-C',
  'stephanie boling, fnp': 'Stephanie Boling, FNP-C',
  'stephanie coleman': 'Stephanie Coleman, FNP',
  'stephanie coleman, fnp': 'Stephanie Coleman, FNP',
  'stephanie coleman, np': 'Stephanie Coleman, FNP',
  'stephanie james': 'Stephanie James, FNP',
  'stephanie southall, fnp-c': 'Stephanie Southall, FNP-C',
  'steven buckles': 'Steven Buckles, MD',
  'steven gubin': 'Steven Gubin, MD',
  'steven weaver': 'Steven Weaver, MD',
  'suzette stanley, np': 'Suzette Stanley, NP',
  'suzette stanley, apn': 'Suzette Stanley, APN',
  'suszette stanley, np': 'Suzette Stanley, NP',
  'suzette stsnley, apn': 'Suzette Stanley, APN',
  'suzanne morris, fnp': 'Suzanne Morris, FNP',
  'suzanne morris, fnp-c': 'Suzanne Morris, FNP-C',
  'suzanne morris': 'Suzanne Morris, FNP',
  'syble carter': 'Syble Carter, FNP',
  'syble carter, fnp': 'Syble Carter, FNP',
  'syble carter, np': 'Syble Carter, FNP',
  'cyble carter': 'Syble Carter, FNP',
  'simon okewole': 'Simon Okewole, MD',
  'okewole': 'Simon Okewole, MD',
  'summer alexander, np': 'Summer Alexander, NP',
  'summer alexander, fnp': 'Summer Alexander, NP',
  'somer lambert, np': 'Somer Lambert, NP',
  'samantha french, fnp': 'Samantha French, FNP',
  'samantha french, anp': 'Samantha French, ANP',
  'samantha french fnp - tiffany simpson, fnp': 'Samantha French, FNP',
  'samantha ivy, np': 'Samantha Ivy, NP',
  'sierra clary': 'Sierra Clary, FNP',
  'sierra clary, fnp': 'Sierra Clary, FNP',
  'seirra clary': 'Sierra Clary, FNP',
  'susan lowry': 'Susan Lowry, MD',
  'susan lowry, md': 'Susan Lowry, MD',
  'susan nunez': 'Susan Nunez, FNP',
  'staci cownover': 'Staci Cownover, PA',
  'staci cownover, pa': 'Staci Cownover, PA',
  'somer lambert': 'Somer Lambert, NP',
  
  // ========== T PROVIDERS ==========
  'tracy little, anp-bc': 'Tracy Little, ANP-BC',
  'tracy little': 'Tracy Little, ANP-BC',
  'tracey kizer': 'Tracey Kizer, NP',
  'tracey kizer, np': 'Tracey Kizer, NP',
  'traxcey kizer, np': 'Tracey Kizer, NP',
  'tracy kiezer': 'Tracey Kizer, NP',
  'taran coleman, fnp': 'Taran Coleman, FNP',
  'tanveer aslam': 'Tanveer Aslam, MD',
  'tanveer aslam, md': 'Tanveer Aslam, MD',
  'aslam': 'Tanveer Aslam, MD',
  'tanya arnold, np': 'Tanya L. Arnold, NP',
  'tanya l arnold, apn': 'Tanya L. Arnold, NP',
  'tanya lynn arnold, np': 'Tanya L. Arnold, NP',
  'tammy holcomb, fnp': 'Tammy Holcomb, FNP',
  'tammy holcomb': 'Tammy Holcomb, FNP',
  'tammy milholen': 'Tammy Milholen, FNP',
  'tammy griffis': 'Tammy Griffis, FNP',
  'tammi ferguson': 'Tammi Ferguson, FNP',
  'tammi ferguson, fnp': 'Tammi Ferguson, FNP',
  'tammi ferguson, np': 'Tammi Ferguson, FNP',
  'tammi martinez': 'Tammi Martinez, FNP',
  'tiffany simpson, fnp': 'Tiffany Simpson, FNP',
  'tiffany simpson': 'Tiffany Simpson, FNP',
  'tiffani white, np': 'Tiffani White, NP',
  'tiffani white': 'Tiffani White, NP',
  'tiffany gray, fnp': 'Tiffany Gray, FNP',
  'tri m. nguyen, md': 'Tri M. Nguyen, MD',
  'tri m nguyen, md': 'Tri M. Nguyen, MD',
  'traci hill, fnp': 'Traci Hill, FNP',
  'tracy townes-bougard': 'Tracy Townes-Bougard, FNP',
  'trent theriac': 'Trent Theriac, FNP',
  'trent theriac, fnp': 'Trent Theriac, FNP',
  'thrent theriac': 'Trent Theriac, FNP',
  'trish blasick': 'Patricia Blasick, FNP',
  'patricia blasick': 'Patricia Blasick, FNP',
  'terry colotta, md': 'Terry Colotta, MD',
  'terry howell, fnp': 'Terry Howell, FNP',
  'terry howell': 'Terry Howell, FNP',
  'teresa wade': 'Teresa Wade, FNP',
  'teresa cox': 'Teresa Cox, NP',
  'teresa cox n. p': 'Teresa Cox, NP',
  'terra micah king-fnp': 'Terra Micah King, FNP',
  'tyler sherwood, pa-c': 'Tyler Sherwood, PA-C',
  'tyler sherwood': 'Tyler Sherwood, PA-C',
  'tyler stanfield, pa-c': 'Tyler Stanfield, PA-C',
  'tyler parris': 'Tyler Parris, PA',
  'taylor smith, pa': 'Taylor Smith, PA',
  'taylor smith, pa-c': 'Taylor Smith, PA-C',
  'tonya arnold': 'Tanya L. Arnold, NP',
  'tonya freeman': 'Tonya Freeman, FNP',
  'tonya creasy, fnp': 'Tonya Creasy, FNP',
  'tonya creasy., fnp': 'Tonya Creasy, FNP',
  'tonya creasy, np': 'Tonya Creasy, NP',
  'toby hampton': 'Toby Hampton, MD',
  'toby hampton, md': 'Toby Hampton, MD',
  'timothy mcpherson d. o': 'Timothy McPherson, DO',
  'timothy mcpherson, do': 'Timothy McPherson, DO',
  'timothy hayden': 'Timothy Hayden, MD',
  'timothy pickens': 'Timothy Pickens, MD',
  'thomas adams': 'Thomas Adams, MD',
  'thomas sanders': 'Thomas Sanders, MD',
  'tommy miller, iii': 'Tommy Miller III, MD',
  'toni reed, aprn': 'Toni Reed, APRN',
  'tabitha woodard, fnp-c': 'Tabitha Woodard, FNP-C',
  'tabitha woodward': 'Tabitha Woodard, FNP-C',
  'tamunoinemi bob-manuel': 'Tamunoinemi Bob-Manuel, MD',
  'talwar': 'Manish Talwar, MD',
  'manish talwar': 'Manish Talwar, MD',
  'tanya mccaskill': 'Tanya McCaskill, FNP',
  'tanya jackson': 'Tanya Jackson, FNP',
  'tanya lynn jackson': 'Tanya Jackson, FNP',
  'tara hendrix': 'Tara Hendrix, NP',
  'tara hendrix, np': 'Tara Hendrix, NP',
  'tayler johnston, aprn': 'Tayler Johnston, APRN',
  'terrell': 'Terrell, MD',
  'renea terrell': 'Renea Terrell, FNP',
  
  // ========== U PROVIDERS ==========
  'unknown provider': 'Unknown Provider',
  'unknown': 'Unknown Provider',
  'no provider': 'Unknown Provider',
  
  // ========== V PROVIDERS ==========
  'va': 'VA Referral',
  'va referral': 'VA Referral',
  'veterans administration': 'VA Referral',
  'veterans administration referral': 'VA Referral',
  'veterans administration referred': 'VA Referral',
  'veterans administration medical center': 'VA Medical Center',
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
  'virginia smith': 'Virginia C. Smith, NP',
  'virginia c smith, np': 'Virginia C. Smith, NP',
  'virginia peebles': 'Virginia Peebles, NP',
  'virginia peebles, np': 'Virginia Peebles, NP',
  'vivian stokes, fnp-c': 'Vivian Stokes, FNP-C',
  'victoria watson': 'Victoria Watson, FNP',
  'verneda herring': 'Verneda Herring, FNP-BC',
  'verneda herring, fnp-bc': 'Verneda Herring, FNP-BC',
  'verenda herring': 'Verneda Herring, FNP-BC',
  'verenda herring, fnp-bc': 'Verneda Herring, FNP-BC',
  'vincent fry': 'Vincent Fry, MD',
  
  // ========== W PROVIDERS ==========
  'william turner, md': 'William Turner, MD',
  'william turner,, md': 'William Turner, MD',
  'w. turner': 'William Turner, MD',
  'will turner': 'William Turner, MD',
  'william n. mckee': 'William N. McKee, MD',
  'william mckee': 'William N. McKee, MD',
  'william mckee, md': 'William N. McKee, MD',
  'neil mckee': 'William N. McKee, MD',
  'mckee': 'William N. McKee, MD',
  'william mcmahon': 'William McMahon, MD',
  'william eason': 'William A. Eason, MD',
  'william a eason': 'William A. Eason, MD',
  'william andrew eason, md': 'William A. Eason, MD',
  'william d white': 'William D. White, FNP',
  'william white, fnp': 'William D. White, FNP',
  'william stone': 'William K. Stone, MD',
  'william stone, md': 'William K. Stone, MD',
  'william k stone': 'William K. Stone, MD',
  'william k. stone': 'William K. Stone, MD',
  'william shaw': 'William Shaw, FNP',
  'william shaw, fnp': 'William Shaw, FNP',
  'william shaw, np': 'William Shaw, FNP',
  'william caicedo': 'William Caicedo, FNP-C',
  'william caicedo, fnp-c': 'William Caicedo, FNP-C',
  'william calcedo': 'William Caicedo, FNP-C',
  'william carney m. d': 'William Carney, MD',
  'william gower': 'William Gower, FNP',
  'william gower, fnp': 'William Gower, FNP',
  'william merrick': 'William Merrick, MD',
  'will merrick': 'William Merrick, MD',
  'william adkins': 'William Adkins, MD',
  'william dement': 'William Dement, MD',
  'whitney wright': 'Whitney Wright, FNP',
  'whitney wright, fnp': 'Whitney Wright, FNP',
  'whitney moore, fnp': 'Whitney Moore, FNP',
  'whitney moore, np': 'Whitney Moore, FNP',
  'whitney millican': 'Whitney Millican, FNP',
  'whitney millican, fnp': 'Whitney Millican, FNP',
  'whitney millican, fnp-bc': 'Whitney Millican, FNP-BC',
  'whitney young': 'Whitney Young, NP',
  'whitney young, np': 'Whitney Young, NP',
  'wanda graupman, np-c': 'Wanda Graupman, NP-C',
  'wanda graupman': 'Wanda Graupman, NP-C',
  'graupman eanda, np': 'Wanda Graupman, NP-C',
  'walter rayford': 'Walter Rayford, MD',
  'whitledge': 'Joshua Whitledge, DO',
  'joshua whitledge': 'Joshua Whitledge, DO',
  'joshua whitledge, do': 'Joshua Whitledge, DO',
  
  // ========== X PROVIDERS ==========
  // (No X providers in the data)
  
  // ========== Y PROVIDERS ==========
  'yaohui chai, md': 'Yaohui Chai, MD',
  'yamini menon, md': 'Yamini Menon, MD',
  'yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh': 'Kumar Yogesh, MD',
  'kumar yogesh, md': 'Kumar Yogesh, MD',
  'dr. kumar yogesh': 'Kumar Yogesh, MD',
  'yousuf': 'Mohammad Yousuf, MD',
  'mohammad yousuf': 'Mohammad Yousuf, MD',
  'mohammad yousuf, md': 'Mohammad Yousuf, MD',
  'mohammed yousuf': 'Mohammad Yousuf, MD',
  'mohommad yousuf, md': 'Mohammad Yousuf, MD',
  
  // ========== Z PROVIDERS ==========
  'zamzow': 'Brent Zamzow, FNP',
  'brent zamzow': 'Brent Zamzow, FNP',
  'brent amzow': 'Brent Zamzow, FNP',
  'zaher al- shallah': 'Zaher Al-Shallah, MD',
  'zaher al-shallah': 'Zaher Al-Shallah, MD',
  'syed zaidi': 'Syed Zaidi, MD',
  'zaidi': 'Syed Zaidi, MD',
  'dr zaidi & associates': 'Dr. Zaidi and Associates',
  'dr zaidi and assoc': 'Dr. Zaidi and Associates',
  'dr. zaidi and associates': 'Dr. Zaidi and Associates',
  'zaidi and assoc': 'Dr. Zaidi and Associates',
  
  // ========== SELF REFERRALS ==========
  'self referral': 'Self Referral',
  'self': 'Self Referral',
  'patient referral': 'Self Referral',
  'family referral': 'Family Referral',
  
  // ========== SPECIAL CASES ==========
  'provider change': 'Provider Change',
  'sent through fax que': 'Sent Through Fax Queue',
  'in epic': 'In Epic',
  'in chart': 'In Chart',
  'westtennesseehealthcare': 'West Tennessee Healthcare',
  'selmer wth': 'West Tennessee Healthcare - Selmer',
  'prime care selmer': 'West Tennessee Healthcare - Selmer',
  
  // Special Cases/System Referrals
  'va': 'VA Referral',
  'veterans administration referral': 'VA Referral',
  'va referral': 'VA Referral',
  'memphis va': 'Memphis VA Medical Center',
  'marion va': 'Marion VA Medical Center',
  'poplar bluff va': 'Poplar Bluff VA Medical Center',
  
  // Self/Provider Change
  'self referral': 'Self Referral',
  'patient self referred': 'Self Referral',
  'family referral': 'Family Referral',
  'provider change': 'Provider Change',
  
  // Unknown/Missing
  'unknown provider': 'Unknown Provider',
  'no provider': 'No Provider',
  'sent through fax que': 'Sent Through Fax Queue'
};

/**
 * Special cases for provider identification
 */
const PROVIDER_SPECIAL_CASES = {
  unknownVariations: [
    'unknown', 'unknown provider', 'n/a', 'na', 'none', 
    'no provider', 'not applicable', 'tbd', 'blank', '--',
    'no referral', 'not available', 'unkown'
  ],
  selfReferralVariations: [
    'self', 'self referral', 'self referred', 'patient self referred',
    'patient referral', 'personal', 'self made', 'walk in',
    'online', 'patient', 'patient called', 'family referral'
  ],
  vaVariations: [
    'va', 'veterans', 'veterans administration', 'va medical',
    'va medical center', 'va hospital', 'veterans admin',
    'veterans administration medical center'
  ]
};

// Note: PROVIDER_STANDARDIZATION constant should be imported from the combined file
// that contains all Series 1-3 mappings

/**
 * Main function to normalize all referring provider names
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The active sheet
 * @returns {Object} Summary of normalization results
 */
function normalizeReferringProviders(sheet) {
  try {
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    }
    
    const startTime = new Date();
    console.log('Starting referring provider normalization...');
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      console.log('No data to process');
      return { processed: 0, corrected: 0 };
    }
    
    // Get provider names from column E
    const range = sheet.getRange(2, PROVIDER_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
    const values = range.getValues();
    const backgrounds = [];
    const notes = [];
    
    // Track statistics
    const stats = {
      processed: 0,
      corrected: 0,
      unknown: 0,
      selfReferrals: 0,
      vaReferrals: 0,
      series1Count: 0,  // A-I
      series2Count: 0,  // J-R
      series3Count: 0,  // S-Z
      providerCounts: new Map(),
      duplicates: new Map()
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
        if (result.category === 'unknown') stats.unknown++;
        if (result.category === 'self-referral') stats.selfReferrals++;
        if (result.category === 'va') stats.vaReferrals++;
        if (result.wasNormalized) stats.corrected++;
        
        // Track series
        if (result.series === 1) stats.series1Count++;
        else if (result.series === 2) stats.series2Count++;
        else if (result.series === 3) stats.series3Count++;
        
        // Track provider counts
        const normalizedKey = result.normalized;
        stats.providerCounts.set(normalizedKey, 
          (stats.providerCounts.get(normalizedKey) || 0) + 1);
        
        // Track duplicates for reporting
        if (!stats.duplicates.has(normalizedKey)) {
          stats.duplicates.set(normalizedKey, []);
        }
        stats.duplicates.get(normalizedKey).push(i + 2); // Row number
        
        // Add note if there was an issue
        if (result.note) {
          notes.push({
            row: i + 2,
            col: PROVIDER_CONFIG.COLUMN.INDEX,
            message: result.note
          });
        }
      } else {
        // Empty field - mark as unknown
        values[i][0] = 'Unknown Provider';
        backgrounds[i] = [PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR];
        stats.unknown++;
        
        notes.push({
          row: i + 2,
          col: PROVIDER_CONFIG.COLUMN.INDEX,
          message: 'Empty provider field - marked as Unknown'
        });
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
    
    console.log(`Provider normalization complete in ${processingTime} seconds`);
    console.log(`Processed: ${stats.processed}, Corrected: ${stats.corrected}`);
    console.log(`Series 1 (A-I): ${stats.series1Count}`);
    console.log(`Series 2 (J-R): ${stats.series2Count}`);
    console.log(`Series 3 (S-Z): ${stats.series3Count}`);
    
    // Generate detailed report
    generateProviderReport(stats);
    
    // Save last normalization timestamp
    PropertiesService.getDocumentProperties()
      .setProperty('LAST_PROVIDER_NORMALIZATION', new Date().toISOString());
    
    return stats;
  } catch (error) {
    console.error('Error in normalizeReferringProviders:', error);
    throw new Error(`Failed to normalize referring providers: ${error.message}`);
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
        normalized: 'Unknown Provider',
        original: '',
        wasNormalized: true,
        backgroundColor: PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR,
        category: 'unknown',
        series: 0,
        note: 'Empty provider field'
      };
    }
    
    let provider = providerInput.toString().trim();
    const originalProvider = provider;
    
    // Step 1: Clean the input
    provider = cleanProviderName(provider);
    
    // Step 2: Check for special cases
    const lowerProvider = provider.toLowerCase();
    
    // Check for unknown variations
    if (PROVIDER_SPECIAL_CASES.unknownVariations.some(pattern => 
        lowerProvider === pattern || lowerProvider.includes(pattern))) {
      return {
        normalized: 'Unknown Provider',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR,
        category: 'unknown',
        series: 0,
        note: 'Unknown or missing provider information'
      };
    }
    
    // Check for self-referrals
    if (PROVIDER_SPECIAL_CASES.selfReferralVariations.some(pattern => 
        lowerProvider === pattern || lowerProvider.includes(pattern))) {
      return {
        normalized: 'Self Referral',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_CONFIG.FORMATTING.SELF_REFERRAL_COLOR,
        category: 'self-referral',
        series: 0,
        note: 'Patient self-referred'
      };
    }
    
    // Check for VA referrals
    if (PROVIDER_SPECIAL_CASES.vaVariations.some(pattern => 
        lowerProvider === pattern || lowerProvider.includes(pattern))) {
      return {
        normalized: 'VA Medical Center',
        original: originalProvider,
        wasNormalized: true,
        backgroundColor: PROVIDER_CONFIG.FORMATTING.VA_COLOR,
        category: 'va',
        series: 0,
        note: 'Veterans Administration referral'
      };
    }
    
    // Step 3: Check standardization dictionary
    // Create normalized lookup key
    const lookupKey = provider.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/,+/g, ',')
      .replace(/\./g, '')
      .replace(/\s*,\s*/g, ', ')
      .trim();
    
    if (typeof PROVIDER_STANDARDIZATION !== 'undefined' && 
        PROVIDER_STANDARDIZATION[lookupKey]) {
      provider = PROVIDER_STANDARDIZATION[lookupKey];
    } else {
      // If not in dictionary, format the name properly
      provider = formatProviderName(provider);
    }
    
    // Step 4: Determine series based on first letter
    let series = 0;
    const firstLetter = provider.charAt(0).toUpperCase();
    if (firstLetter >= 'A' && firstLetter <= 'I') {
      series = 1;
    } else if (firstLetter >= 'J' && firstLetter <= 'R') {
      series = 2;
    } else if (firstLetter >= 'S' && firstLetter <= 'Z') {
      series = 3;
    }
    
    // Step 5: Determine if name was changed
    const wasNormalized = provider !== originalProvider;
    
    return {
      normalized: provider,
      original: originalProvider,
      wasNormalized: wasNormalized,
      backgroundColor: wasNormalized ? 
        PROVIDER_CONFIG.FORMATTING.CORRECTED_COLOR : 
        PROVIDER_CONFIG.FORMATTING.DEFAULT_COLOR,
      category: 'standard',
      series: series,
      note: wasNormalized ? `Standardized from: ${originalProvider}` : null
    };
    
  } catch (error) {
    console.error('Error normalizing provider name:', error);
    return {
      normalized: 'Unknown Provider',
      original: providerInput,
      wasNormalized: true,
      backgroundColor: PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR,
      category: 'error',
      series: 0,
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
    .trim()
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/\s*,\s*/g, ', ')       // Standardize comma spacing
    .replace(/\s*\.\s*/g, '. ')      // Standardize period spacing
    .replace(/\.+/g, '.')            // Remove multiple periods
    .replace(/\s*-\s*/g, '-')        // Remove spaces around hyphens
    .replace(/['`]/g, "'")           // Standardize apostrophes
    .trim();
}

/**
 * Format provider name with proper capitalization and credentials
 * @private
 */
function formatProviderName(name) {
  // Common medical credentials to standardize
  const credentials = {
    'md': 'MD', 'm.d.': 'MD', 'm.d': 'MD', 'medical doctor': 'MD',
    'do': 'DO', 'd.o.': 'DO', 'd.o': 'DO',
    'np': 'NP', 'n.p.': 'NP', 'nurse practitioner': 'NP',
    'fnp': 'FNP', 'fnp-c': 'FNP-C', 'fnp-bc': 'FNP-BC',
    'anp': 'ANP', 'anp-bc': 'ANP-BC',
    'aprn': 'APRN', 'a.p.r.n.': 'APRN', 'aprn-bc': 'APRN-BC',
    'apn': 'APN', 'a.p.n.': 'APN', 'apn-bc': 'APN-BC',
    'pa': 'PA', 'p.a.': 'PA', 'physician assistant': 'PA',
    'pa-c': 'PA-C', 'pac': 'PA-C',
    'dnp': 'DNP', 'd.n.p.': 'DNP',
    'phd': 'PhD', 'ph.d.': 'PhD', 'ph.d': 'PhD',
    'rn': 'RN', 'r.n.': 'RN', 'registered nurse': 'RN',
    'lpn': 'LPN', 'l.p.n.': 'LPN',
    'cnm': 'CNM', 'c.n.m.': 'CNM',
    'cfnp': 'CFNP', 'acnp': 'ACNP', 'pmhnp': 'PMHNP',
    'cnp': 'CNP', 'msn': 'MSN', 'bsn': 'BSN'
  };
  
  // Extract name and credentials
  let mainName = name;
  let extractedCredentials = [];
  
  // Look for credentials (usually after comma or at end)
  const parts = name.split(',');
  if (parts.length > 1) {
    mainName = parts[0].trim();
    const credentialPart = parts.slice(1).join(',').trim();
    
    // Extract individual credentials
    const credWords = credentialPart.split(/[\s,]+/);
    credWords.forEach(word => {
      const lowerWord = word.toLowerCase().replace(/[^a-z-]/g, '');
      if (credentials[lowerWord]) {
        extractedCredentials.push(credentials[lowerWord]);
      } else if (word.match(/^[A-Z]{2,}$/)) {
        extractedCredentials.push(word); // Keep unknown abbreviations as-is
      }
    });
  }
  
  // Format the main name
  const formattedName = properCapitalizeProviderName(mainName);
  
  // Select primary credential if multiple
  let primaryCredential = '';
  if (extractedCredentials.length > 0) {
    primaryCredential = selectPrimaryCredential(extractedCredentials);
  }
  
  // Reconstruct full name
  return primaryCredential ? 
    `${formattedName}, ${primaryCredential}` : 
    formattedName;
}

/**
 * Properly capitalize provider name
 * @private
 */
function properCapitalizeProviderName(name) {
  const words = name.split(/\s+/);
  
  return words.map(word => {
    // Handle special cases
    if (word.toLowerCase() === 'ii') return 'II';
    if (word.toLowerCase() === 'iii') return 'III';
    if (word.toLowerCase() === 'iv') return 'IV';
    if (word.toLowerCase() === 'jr' || word.toLowerCase() === 'jr.') return 'Jr';
    if (word.toLowerCase() === 'sr' || word.toLowerCase() === 'sr.') return 'Sr';
    
    // Handle Mac/Mc prefixes
    if (word.toLowerCase().startsWith('mc') && word.length > 2) {
      return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
    }
    if (word.toLowerCase().startsWith('mac') && word.length > 3) {
      return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
    }
    
    // Handle hyphenated names
    if (word.includes('-')) {
      return word.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join('-');
    }
    
    // Handle names with apostrophes
    if (word.includes("'")) {
      const parts = word.split("'");
      return parts.map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join("'");
    }
    
    // Standard capitalization
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Select the primary credential from a list
 * @private
 */
function selectPrimaryCredential(credentials) {
  // Priority order for credentials (highest to lowest)
  const priority = [
    'MD', 'DO', 'DNP', 'PhD', 
    'PA-C', 'PA', 
    'FNP-BC', 'FNP-C', 'FNP',
    'ANP-BC', 'ANP', 
    'APRN-BC', 'APRN',
    'APN-BC', 'APN',
    'NP', 'CNM', 'CNP',
    'RN', 'LPN',
    'MSN', 'BSN'
  ];
  
  for (const cred of priority) {
    if (credentials.includes(cred)) {
      return cred;
    }
  }
  
  return credentials[0] || '';
}

/**
 * Generate a detailed provider normalization report
 * @param {Object} stats - Statistics from normalization
 */
function generateProviderReport(stats) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = ss.getSheetByName('Provider Normalization Report');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('Provider Normalization Report');
    } else {
      reportSheet.clear();
    }
    
    // Prepare data for report
    const duplicateProviders = [];
    let duplicateCount = 0;
    
    stats.duplicates.forEach((rows, providerName) => {
      if (rows.length > 1) {
        duplicateCount += rows.length - 1;
        duplicateProviders.push([
          providerName,
          rows.length,
          rows.slice(0, 10).join(', ') + (rows.length > 10 ? '...' : '')
        ]);
      }
    });
    
    // Sort by frequency
    duplicateProviders.sort((a, b) => b[1] - a[1]);
    
    // Get top providers by frequency
    const topProviders = Array.from(stats.providerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
    
    // Create report headers - ENSURE CONSISTENT COLUMN COUNT
    const headers = [
      ['Referring Provider Normalization Report', ''],
      ['Generated:', new Date().toLocaleString()],
      ['Version:', '3.0 - Unified Series 1-3'],
      ['', ''],
      ['=== SUMMARY STATISTICS ===', ''],
      ['Total Processed:', stats.processed],
      ['Names Corrected:', stats.corrected],
      ['Unknown Providers:', stats.unknown],
      ['Self Referrals:', stats.selfReferrals],
      ['VA Referrals:', stats.vaReferrals],
      ['Unique Providers:', stats.providerCounts.size],
      ['Potential Duplicates:', duplicateCount],
      ['', ''],
      ['=== SERIES DISTRIBUTION ===', ''],
      ['Series 1 (A-I):', `${stats.series1Count} providers`],
      ['Series 2 (J-R):', `${stats.series2Count} providers`],
      ['Series 3 (S-Z):', `${stats.series3Count} providers`],
      ['Special Cases:', `${stats.unknown + stats.selfReferrals + stats.vaReferrals} entries`],
      ['', ''],
      ['=== TOP 50 PROVIDERS BY FREQUENCY ===', '']
    ];
    
    // Add headers to sheet
    reportSheet.getRange(1, 1, headers.length, 2).setValues(headers);
    
    // Add top providers header
    const providerHeaderRow = headers.length + 1;
    reportSheet.getRange(providerHeaderRow, 1, 1, 3)
      .setValues([['Provider Name', 'Referrals', 'Percentage']]);
    
    // Add top providers data
    if (topProviders.length > 0) {
      const providerData = topProviders.map(([name, count]) => [
        name,
        count,
        `${((count / stats.processed) * 100).toFixed(2)}%`
      ]);
      reportSheet.getRange(providerHeaderRow + 1, 1, providerData.length, 3)
        .setValues(providerData);
    }
    
    // Add duplicates section
    const duplicatesStart = providerHeaderRow + topProviders.length + 3;
    
    // Use 2 columns for the section title to match the header format
    reportSheet.getRange(duplicatesStart, 1, 1, 2)
      .setValues([['=== PROVIDERS WITH MULTIPLE REFERRALS ===', '']]);
    
    reportSheet.getRange(duplicatesStart + 1, 1, 1, 3)
      .setValues([['Provider Name', 'Count', 'Row Numbers']]);
    
    if (duplicateProviders.length > 0) {
      const topDuplicates = duplicateProviders.slice(0, 30);
      reportSheet.getRange(duplicatesStart + 2, 1, topDuplicates.length, 3)
        .setValues(topDuplicates);
    }
    
    // Format the report
    reportSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    reportSheet.getRange(5, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(14, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(20, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(providerHeaderRow, 1, 1, 3)
      .setFontWeight('bold').setBackground('#E8E8E8');
    reportSheet.getRange(duplicatesStart, 1).setFontSize(12).setFontWeight('bold');
    reportSheet.getRange(duplicatesStart + 1, 1, 1, 3)
      .setFontWeight('bold').setBackground('#E8E8E8');
    
    // Auto-resize columns
    reportSheet.autoResizeColumns(1, 3);
    
    // Add color legend at the bottom
    const legendStart = Math.max(duplicatesStart + duplicateProviders.length + 5, 100);
    const legend = [
      ['=== COLOR LEGEND ===', ''],
      ['', 'Corrected/Standardized Names'],
      ['', 'Unknown Providers'],
      ['', 'Self Referrals'],
      ['', 'VA Medical Center'],
      ['', 'Potential Duplicates']
    ];
    
    reportSheet.getRange(legendStart, 1, legend.length, 2).setValues(legend);
    reportSheet.getRange(legendStart, 1).setFontWeight('bold');
    
    // Apply colors to legend
    reportSheet.getRange(legendStart + 1, 1).setBackground(PROVIDER_CONFIG.FORMATTING.CORRECTED_COLOR);
    reportSheet.getRange(legendStart + 2, 1).setBackground(PROVIDER_CONFIG.FORMATTING.UNKNOWN_COLOR);
    reportSheet.getRange(legendStart + 3, 1).setBackground(PROVIDER_CONFIG.FORMATTING.SELF_REFERRAL_COLOR);
    reportSheet.getRange(legendStart + 4, 1).setBackground(PROVIDER_CONFIG.FORMATTING.VA_COLOR);
    reportSheet.getRange(legendStart + 5, 1).setBackground(PROVIDER_CONFIG.FORMATTING.DUPLICATE_COLOR);
    
    console.log('Provider normalization report generated');
    
    // Show toast notification
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Report generated successfully',
      'Provider Normalization Report',
      5
    );
    
  } catch (error) {
    console.error('Error generating provider report:', error);
    throw error;
  }
}

/**
 * Validate provider entries without modifying them
 */
function validateProviders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data to validate');
    return;
  }
  
  const range = sheet.getRange(2, PROVIDER_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  let emptyCount = 0;
  let unknownCount = 0;
  let needsStandardization = 0;
  const issues = [];
  
  values.forEach((row, index) => {
    const provider = row[0];
    
    if (!provider || provider === '') {
      emptyCount++;
      issues.push({
        row: index + 2,
        issue: 'Empty provider field'
      });
    } else {
      const result = normalizeProviderName(provider.toString());
      
      if (result.category === 'unknown') {
        unknownCount++;
        issues.push({
          row: index + 2,
          issue: 'Unknown provider',
          value: provider
        });
      } else if (result.wasNormalized) {
        needsStandardization++;
      }
    }
  });
  
  // Generate validation summary
  const totalIssues = emptyCount + unknownCount + needsStandardization;
  
  if (totalIssues === 0) {
    SpreadsheetApp.getUi().alert(
      'Provider Validation Complete',
      'All provider entries are properly formatted!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    const message = `Provider Validation Results:\n\n` +
                   `Empty fields: ${emptyCount}\n` +
                   `Unknown providers: ${unknownCount}\n` +
                   `Needs standardization: ${needsStandardization}\n\n` +
                   `Total issues: ${totalIssues}\n\n` +
                   `Run "Normalize Referring Providers" to fix these issues.`;
    
    SpreadsheetApp.getUi().alert('Provider Validation', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
    // Log detailed issues for debugging
    console.log('Provider validation issues:', issues.slice(0, 20)); // Log first 20 issues
  }
  
  return {
    emptyCount,
    unknownCount,
    needsStandardization,
    totalIssues,
    issues
  };
}

/**
 * Get provider statistics for reporting
 */
function getProviderStatistics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return null;
  }
  
  const range = sheet.getRange(2, PROVIDER_CONFIG.COLUMN.INDEX, lastRow - 1, 1);
  const values = range.getValues();
  
  const providerCounts = new Map();
  let emptyCount = 0;
  let unknownCount = 0;
  let vaCount = 0;
  let selfCount = 0;
  
  values.forEach(row => {
    const provider = row[0];
    if (!provider || provider === '') {
      emptyCount++;
    } else {
      const result = normalizeProviderName(provider.toString());
      const normalized = result.normalized;
      
      if (result.category === 'unknown') unknownCount++;
      if (result.category === 'va') vaCount++;
      if (result.category === 'self-referral') selfCount++;
      
      providerCounts.set(normalized, (providerCounts.get(normalized) || 0) + 1);
    }
  });
  
  // Sort by count
  const sorted = Array.from(providerCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  return {
    totalEntries: lastRow - 1,
    uniqueProviders: providerCounts.size,
    emptyEntries: emptyCount,
    unknownEntries: unknownCount,
    vaReferrals: vaCount,
    selfReferrals: selfCount,
    topProviders: sorted.slice(0, 20),
    providerCounts: providerCounts
  };
}

/**
 * Find providers with the most referrals
 */
function findTopReferringProviders(limit = 20) {
  const stats = getProviderStatistics();
  
  if (!stats) {
    SpreadsheetApp.getUi().alert('No data available');
    return;
  }
  
  let message = `Top ${limit} Referring Providers:\n\n`;
  
  stats.topProviders.slice(0, limit).forEach((provider, index) => {
    const percentage = ((provider[1] / stats.totalEntries) * 100).toFixed(2);
    message += `${index + 1}. ${provider[0]}: ${provider[1]} referrals (${percentage}%)\n`;
  });
  
  message += `\nTotal unique providers: ${stats.uniqueProviders}`;
  
  SpreadsheetApp.getUi().alert('Top Referring Providers', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Menu function to normalize providers only
 */
function normalizeProvidersOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const stats = normalizeReferringProviders(sheet);
  
  SpreadsheetApp.getUi().alert(
    'Provider Normalization Complete',
    `Processed: ${stats.processed}\n` +
    `Corrected: ${stats.corrected}\n` +
    `Unknown: ${stats.unknown}\n` +
    `Self Referrals: ${stats.selfReferrals}\n` +
    `VA Referrals: ${stats.vaReferrals}\n\n` +
    `Series 1 (A-I): ${stats.series1Count}\n` +
    `Series 2 (J-R): ${stats.series2Count}\n` +
    `Series 3 (S-Z): ${stats.series3Count}\n\n` +
    `Check "Provider Normalization Report" for details.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Process providers in batches for better performance
 */
function batchProcessProviders(batchSize = 500) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
  const lastRow = sheet.getLastRow();
  
  let totalStats = {
    processed: 0,
    corrected: 0,
    unknown: 0,
    selfReferrals: 0,
    vaReferrals: 0,
    series1Count: 0,
    series2Count: 0,
    series3Count: 0
  };
  
  for (let startRow = 2; startRow <= lastRow; startRow += batchSize) {
    const endRow = Math.min(startRow + batchSize - 1, lastRow);
    
    // Process batch
    const numRows = endRow - startRow + 1;
    const range = sheet.getRange(startRow, PROVIDER_CONFIG.COLUMN.INDEX, numRows, 1);
    const values = range.getValues();
    const backgrounds = [];
    
    // Process each row in batch
    values.forEach(row => {
      const provider = row[0];
      if (provider) {
        const result = normalizeProviderName(provider.toString());
        
        // Update statistics
        totalStats.processed++;
        if (result.wasNormalized) totalStats.corrected++;
        if (result.category === 'unknown') totalStats.unknown++;
        if (result.category === 'self-referral') totalStats.selfReferrals++;
        if (result.category === 'va') totalStats.vaReferrals++;
        
        if (result.series === 1) totalStats.series1Count++;
        else if (result.series === 2) totalStats.series2Count++;
        else if (result.series === 3) totalStats.series3Count++;
      }
    });
    
    // Log progress
    console.log(`Processed rows ${startRow} to ${endRow}`);
    
    // Show progress to user
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Processing rows ${startRow} to ${endRow}...`,
      'Provider Normalization',
      2
    );
  }
  
  return totalStats;
}