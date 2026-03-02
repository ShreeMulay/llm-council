-- ============================================================
-- Nephrology M&A Intelligence Platform — BigQuery Schema
-- Project: tke-ma-intelligence
-- Dataset: nephrology_ma
--
-- Incorporates LLM Council recommendations:
--   - Added independence_likelihood scoring dimension
--   - Added ma_penetration table for Medicare Advantage adjustment
--   - Added practice_entities table for entity resolution
--   - Added cost_reports table for dialysis facility financials
-- ============================================================

-- ============================================================
-- PROVIDERS: Core provider registry (from NPPES + Physician Compare)
-- The foundational table — every NPI of interest lands here.
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.providers` (
  npi STRING NOT NULL,
  entity_type INT64,                    -- 1=individual, 2=organization
  last_name STRING,
  first_name STRING,
  middle_name STRING,
  credential STRING,
  gender STRING,

  -- From Physician Compare
  graduation_year INT64,
  medical_school STRING,

  -- Taxonomy
  primary_taxonomy STRING,
  all_taxonomies ARRAY<STRING>,
  primary_specialty STRING,

  -- Practice location
  practice_address_line1 STRING,
  practice_address_line2 STRING,
  practice_city STRING,
  practice_state STRING,
  practice_zip STRING,
  practice_phone STRING,

  -- Mailing address
  mail_address_line1 STRING,
  mail_city STRING,
  mail_state STRING,
  mail_zip STRING,

  -- NPPES metadata
  enumeration_date DATE,
  last_update_date DATE,
  is_sole_proprietor STRING,
  is_organization_subpart STRING,
  deactivation_date DATE,
  reactivation_date DATE,

  -- Derived fields
  estimated_age INT64,                  -- current_year - graduation_year + 26
  is_solo_practice BOOL,               -- derived from PECOS reassignment
  group_practice_pac_id STRING,
  group_practice_name STRING,
  group_practice_size INT64,

  -- Hospital affiliations (from Physician Compare)
  hospital_affiliation_ccn_1 STRING,
  hospital_affiliation_ccn_2 STRING,
  hospital_affiliation_ccn_3 STRING,

  -- MIPS (from Physician Compare)
  mips_participation_status STRING,

  -- Metadata
  last_refreshed TIMESTAMP,
  data_sources ARRAY<STRING>
)
CLUSTER BY practice_state, npi;


-- ============================================================
-- PRACTICE_ENTITIES: Resolved practice entities (Council recommendation)
-- Groups individual NPIs into practice-level entities for scoring.
-- This is the critical entity resolution layer.
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.practice_entities` (
  entity_id STRING NOT NULL,            -- Generated UUID
  entity_name STRING,
  entity_type STRING,                   -- 'solo', 'group', 'hospital_employed', 'pe_backed', 'unknown'

  -- Primary identifiers
  org_npi STRING,                       -- Type 2 NPI if available
  org_pac_id STRING,
  tin STRING,                           -- From PECOS (Tax ID, for grouping)

  -- Member physicians
  member_npis ARRAY<STRING>,
  member_count INT64,
  nephrology_member_count INT64,

  -- Location
  primary_city STRING,
  primary_state STRING,
  primary_zip STRING,

  -- Ownership signals (Council: independence detection)
  likely_independent BOOL,              -- No large-system affiliation detected
  pe_ownership_signals ARRAY<STRING>,   -- Evidence of PE/MSO ownership
  large_system_affiliation STRING,      -- 'DaVita', 'Fresenius', 'hospital_system', etc.

  -- Business entity link
  tn_sos_control_number STRING,
  tn_sos_status STRING,
  tn_sos_formation_date DATE,

  -- Aggregate metrics (from latest scoring run)
  total_annual_medicare_revenue FLOAT64,
  avg_physician_age FLOAT64,

  last_refreshed TIMESTAMP,
  resolution_confidence FLOAT64         -- 0.0 to 1.0
)
CLUSTER BY primary_state, entity_type;


-- ============================================================
-- UTILIZATION: Medicare billing data per NPI per HCPCS per year
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.utilization` (
  npi STRING NOT NULL,
  year INT64 NOT NULL,
  hcpcs_code STRING NOT NULL,
  hcpcs_description STRING,

  -- Place of service
  place_of_service STRING,              -- 'F' = facility, 'O' = office

  -- Volume metrics
  total_services INT64,
  total_unique_beneficiaries INT64,
  total_submitted_charges FLOAT64,
  total_medicare_allowed_amount FLOAT64,
  total_medicare_payment FLOAT64,
  average_medicare_allowed_amount FLOAT64,
  average_submitted_charge FLOAT64,
  average_medicare_payment FLOAT64,

  -- Provider context (denormalized for query speed)
  provider_type STRING,
  provider_state STRING,

  last_refreshed TIMESTAMP
)
PARTITION BY RANGE_BUCKET(year, GENERATE_ARRAY(2013, 2032, 1))
CLUSTER BY npi, hcpcs_code;


-- ============================================================
-- PRESCRIBING: Part D prescribing data per NPI per drug per year
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.prescribing` (
  npi STRING NOT NULL,
  year INT64 NOT NULL,
  drug_name STRING NOT NULL,
  generic_name STRING,

  total_claims INT64,
  total_drug_cost FLOAT64,
  total_day_supply INT64,
  total_beneficiaries INT64,

  -- Beneficiary demographics
  ge65_total_claims INT64,
  ge65_total_drug_cost FLOAT64,

  -- Brand vs generic
  is_brand BOOL,

  provider_state STRING,
  last_refreshed TIMESTAMP
)
PARTITION BY RANGE_BUCKET(year, GENERATE_ARRAY(2013, 2032, 1))
CLUSTER BY npi, generic_name;


-- ============================================================
-- ORGANIZATIONS: Group practice / org structure (from PECOS + NPPES)
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.organizations` (
  org_npi STRING NOT NULL,
  org_name STRING,
  org_pac_id STRING,

  -- PECOS enrollment
  enrollment_id STRING,
  enrollment_status STRING,
  enrollment_state STRING,

  -- Member NPIs (physicians billing through this org)
  member_npis ARRAY<STRING>,
  member_count INT64,

  -- Derived
  has_nephrology_members BOOL,
  nephrology_member_count INT64,

  -- Address
  address_line1 STRING,
  address_city STRING,
  address_state STRING,
  address_zip STRING,

  last_refreshed TIMESTAMP
)
CLUSTER BY org_npi;


-- ============================================================
-- FACILITIES: Dialysis facility data (from Dialysis Facility Compare)
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.facilities` (
  ccn STRING NOT NULL,                  -- CMS Certification Number
  facility_name STRING,

  address STRING,
  city STRING,
  state STRING,
  zip STRING,
  county STRING,
  phone STRING,

  profit_status STRING,                 -- 'Profit' or 'Non-Profit'
  chain_organization STRING,            -- 'DaVita', 'Fresenius', 'Independent', etc.
  chain_owned BOOL,

  -- Capacity
  num_dialysis_stations INT64,
  total_patients INT64,
  total_hd_patients INT64,
  total_pd_patients INT64,
  total_hd_home_patients INT64,

  -- Quality
  star_rating FLOAT64,                  -- 1-5
  patient_survival_category STRING,
  hospitalization_category STRING,
  patient_infection_category STRING,
  transfusion_category STRING,
  fistula_category STRING,

  -- Medical director
  medical_director_name STRING,
  medical_director_npi STRING,

  last_refreshed TIMESTAMP
)
CLUSTER BY state, chain_organization;


-- ============================================================
-- COST_REPORTS: Dialysis facility financials (Council recommendation)
-- CMS Form 265-11 — actual revenue/cost data for dialysis facilities
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.cost_reports` (
  ccn STRING NOT NULL,
  fiscal_year_begin DATE,
  fiscal_year_end DATE,
  report_year INT64,

  -- Revenue
  total_revenue FLOAT64,
  net_patient_revenue FLOAT64,
  medicare_revenue FLOAT64,
  medicaid_revenue FLOAT64,

  -- Costs
  total_costs FLOAT64,
  total_salary_costs FLOAT64,

  -- Operations
  total_treatments INT64,
  total_patients_served INT64,
  total_ftes FLOAT64,
  dialysis_stations INT64,

  -- Derived
  revenue_per_treatment FLOAT64,
  cost_per_treatment FLOAT64,
  operating_margin FLOAT64,

  last_refreshed TIMESTAMP
)
PARTITION BY RANGE_BUCKET(report_year, GENERATE_ARRAY(2015, 2032, 1))
CLUSTER BY ccn;


-- ============================================================
-- OPEN_PAYMENTS: Industry payments to physicians (Sunshine Act)
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.open_payments` (
  record_id STRING,
  npi STRING NOT NULL,
  physician_name STRING,
  physician_specialty STRING,

  year INT64 NOT NULL,
  payment_date DATE,

  payer_name STRING,                    -- Manufacturer or GPO
  payment_amount FLOAT64,
  payment_nature STRING,                -- Food/Beverage, Consulting, Travel, Research
  payment_form STRING,                  -- Cash, In-kind, etc.

  product_name STRING,
  product_category STRING,              -- Drug, Device, Biological, Medical Supply

  is_research BOOL,
  is_ownership BOOL,

  last_refreshed TIMESTAMP
)
PARTITION BY RANGE_BUCKET(year, GENERATE_ARRAY(2013, 2032, 1))
CLUSTER BY npi;


-- ============================================================
-- BUSINESS_FILINGS: TN Secretary of State data
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.business_filings` (
  control_number STRING NOT NULL,
  entity_name STRING,
  filing_type STRING,                   -- LLC, Corp, Professional Corp, etc.

  formation_date DATE,
  status STRING,                        -- Active, Inactive, Dissolved, Revoked
  standing STRING,                      -- Good Standing, Not in Good Standing

  registered_agent_name STRING,
  registered_agent_address STRING,

  principal_address STRING,
  principal_city STRING,
  principal_state STRING,
  principal_zip STRING,

  last_annual_report_date DATE,

  -- Link to provider
  associated_npi STRING,                -- Manually or fuzzy-matched
  match_confidence FLOAT64,

  last_refreshed TIMESTAMP
);


-- ============================================================
-- LICENSES: State medical board license data
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.licenses` (
  license_number STRING NOT NULL,
  state STRING NOT NULL,

  provider_name STRING,
  npi STRING,                           -- Cross-referenced

  license_type STRING,                  -- MD, DO, NP, PA
  status STRING,                        -- Active, Inactive, Retired, Expired, Revoked
  issue_date DATE,
  expiration_date DATE,

  has_disciplinary_action BOOL,
  disciplinary_notes STRING,

  address_city STRING,
  address_state STRING,

  last_refreshed TIMESTAMP
);


-- ============================================================
-- MA_PENETRATION: Medicare Advantage enrollment by county
-- (Council recommendation: adjust FFS-only data for MA blind spot)
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.ma_penetration` (
  county_fips STRING NOT NULL,
  county_name STRING,
  state STRING,
  year INT64 NOT NULL,

  total_medicare_beneficiaries INT64,
  ma_beneficiaries INT64,
  ffs_beneficiaries INT64,
  ma_penetration_rate FLOAT64,          -- 0.0 to 1.0

  last_refreshed TIMESTAMP
)
PARTITION BY RANGE_BUCKET(year, GENERATE_ARRAY(2018, 2032, 1))
CLUSTER BY state, county_fips;


-- ============================================================
-- SIGNALS: Time-series tracking of acquisition signals
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.signals` (
  signal_id STRING NOT NULL,            -- UUID
  npi STRING NOT NULL,

  signal_type STRING NOT NULL,
  -- Types: 'volume_decline', 'license_expiry', 'business_dissolved',
  --        'job_posting', 'no_open_payments', 'npi_deactivated',
  --        'negative_reviews', 'age_threshold', 'solo_practice',
  --        'mips_decline', 'prescribing_decline', 'facility_closure',
  --        'succession_posting', 'pe_acquisition', 'manual_intel'

  signal_value STRING,                  -- Human-readable description
  signal_strength FLOAT64,             -- 0.0 to 1.0

  detected_date DATE,
  source STRING,                        -- Which data source detected this
  source_url STRING,

  -- For trend signals
  metric_current FLOAT64,
  metric_previous FLOAT64,
  metric_change_pct FLOAT64,

  is_active BOOL,
  resolved_date DATE,
  notes STRING,

  created_at TIMESTAMP
)
CLUSTER BY npi, signal_type;


-- ============================================================
-- SCORES: Composite acquisition target scores
-- 10 dimensions per Council recommendations
-- ============================================================
CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.scores` (
  score_id STRING NOT NULL,             -- UUID
  npi STRING NOT NULL,

  -- Individual dimension scores (0-100 each)
  age_score FLOAT64,
  solo_practice_score FLOAT64,
  volume_trend_score FLOAT64,
  prescribing_trend_score FLOAT64,
  open_payments_trend_score FLOAT64,
  license_status_score FLOAT64,
  business_filing_score FLOAT64,
  geographic_score FLOAT64,
  practice_value_score FLOAT64,
  independence_likelihood_score FLOAT64, -- NEW: Council recommendation

  -- Composite
  total_weighted_score FLOAT64,         -- 0-100
  tier STRING,                          -- 'HOT', 'WARM', 'WATCH', 'LOW'

  -- Context
  top_signals ARRAY<STRING>,            -- Top contributing signal types

  -- For change detection
  previous_score FLOAT64,
  score_change FLOAT64,

  calculated_date DATE,
  calculation_version STRING,           -- Track scoring algorithm changes

  -- MA adjustment
  ma_adjusted_revenue FLOAT64,          -- Revenue adjusted for MA penetration

  -- Practice archetype (Council recommendation)
  practice_archetype STRING,            -- 'integrated_dialysis', 'office_med_director',
                                        -- 'interventional_vascular', 'academic_employed'

  -- Human overlay
  manual_override_tier STRING,
  manual_notes STRING,
  last_contacted_date DATE,
  contact_status STRING,                -- 'not_contacted', 'initial_outreach',
                                        -- 'in_discussion', 'rejected', 'acquired'

  created_at TIMESTAMP
)
PARTITION BY DATE_TRUNC(calculated_date, MONTH)
CLUSTER BY tier, npi;


-- ============================================================
-- VIEWS
-- ============================================================

-- Provider master view with latest score
CREATE OR REPLACE VIEW `${PROJECT_ID}.${DATASET}.v_provider_dashboard` AS
SELECT
  p.npi,
  p.first_name,
  p.last_name,
  p.credential,
  p.graduation_year,
  p.estimated_age,
  p.is_sole_proprietor,
  p.is_solo_practice,
  p.group_practice_name,
  p.group_practice_size,
  p.practice_city,
  p.practice_state,
  p.practice_zip,
  p.practice_phone,
  s.total_weighted_score,
  s.tier,
  s.age_score,
  s.solo_practice_score,
  s.volume_trend_score,
  s.independence_likelihood_score,
  s.practice_archetype,
  s.ma_adjusted_revenue,
  s.top_signals,
  s.calculated_date,
  s.manual_notes,
  s.contact_status
FROM `${PROJECT_ID}.${DATASET}.providers` p
LEFT JOIN (
  SELECT * FROM `${PROJECT_ID}.${DATASET}.scores`
  WHERE calculated_date = (SELECT MAX(calculated_date) FROM `${PROJECT_ID}.${DATASET}.scores`)
) s ON p.npi = s.npi
WHERE p.entity_type = 1
ORDER BY s.total_weighted_score DESC;


-- Data freshness monitoring view
CREATE OR REPLACE VIEW `${PROJECT_ID}.${DATASET}.v_data_freshness` AS
SELECT 'providers' AS table_name,
  COUNT(*) AS row_count,
  MAX(last_refreshed) AS last_refreshed
FROM `${PROJECT_ID}.${DATASET}.providers`
UNION ALL
SELECT 'utilization', COUNT(*), MAX(last_refreshed)
FROM `${PROJECT_ID}.${DATASET}.utilization`
UNION ALL
SELECT 'prescribing', COUNT(*), MAX(last_refreshed)
FROM `${PROJECT_ID}.${DATASET}.prescribing`
UNION ALL
SELECT 'organizations', COUNT(*), MAX(last_refreshed)
FROM `${PROJECT_ID}.${DATASET}.organizations`
UNION ALL
SELECT 'facilities', COUNT(*), MAX(last_refreshed)
FROM `${PROJECT_ID}.${DATASET}.facilities`
UNION ALL
SELECT 'open_payments', COUNT(*), MAX(last_refreshed)
FROM `${PROJECT_ID}.${DATASET}.open_payments`
UNION ALL
SELECT 'signals', COUNT(*), MAX(created_at)
FROM `${PROJECT_ID}.${DATASET}.signals`
UNION ALL
SELECT 'scores', COUNT(*), MAX(created_at)
FROM `${PROJECT_ID}.${DATASET}.scores`;
