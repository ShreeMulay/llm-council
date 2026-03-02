-- ============================================================
-- MASTER SCORING QUERY v1.1
-- 10-dimension acquisition target scoring for nephrology providers
--
-- Changes from v1.0:
--   - Added independence_likelihood dimension (Council recommendation)
--   - Added MA penetration adjustment for revenue estimates
--   - Added practice_archetype classification
--   - Rebalanced weights to sum to 1.0 with new dimension
-- ============================================================

CREATE OR REPLACE TABLE `${PROJECT_ID}.${DATASET}.scores` AS

WITH
-- ============================================================
-- DIMENSION 1: Estimated Age (weight: 0.18)
-- ============================================================
age_dim AS (
  SELECT
    npi,
    estimated_age,
    CASE
      WHEN estimated_age IS NULL THEN 50
      WHEN estimated_age >= 70 THEN 100
      WHEN estimated_age >= 65 THEN 90
      WHEN estimated_age >= 60 THEN 70
      WHEN estimated_age >= 55 THEN 40
      WHEN estimated_age >= 50 THEN 20
      ELSE 5
    END AS age_score
  FROM `${PROJECT_ID}.${DATASET}.providers`
  WHERE entity_type = 1
),

-- ============================================================
-- DIMENSION 2: Solo Practice (weight: 0.13)
-- ============================================================
solo_dim AS (
  SELECT
    npi,
    CASE
      WHEN is_solo_practice = TRUE AND (group_practice_size IS NULL OR group_practice_size <= 1) THEN 100
      WHEN is_solo_practice = TRUE THEN 95
      WHEN group_practice_size = 2 THEN 80
      WHEN group_practice_size BETWEEN 3 AND 5 THEN 50
      WHEN group_practice_size BETWEEN 6 AND 10 THEN 20
      WHEN group_practice_size > 10 THEN 5
      ELSE 60  -- Unknown defaults to moderate
    END AS solo_practice_score
  FROM `${PROJECT_ID}.${DATASET}.providers`
  WHERE entity_type = 1
),

-- ============================================================
-- DIMENSION 3: Volume Trend 3yr (weight: 0.18)
-- ============================================================
yearly_totals AS (
  SELECT npi, year,
    SUM(total_medicare_payment) AS total_payment,
    SUM(total_unique_beneficiaries) AS total_benes,
    SUM(total_services) AS total_services
  FROM `${PROJECT_ID}.${DATASET}.utilization`
  GROUP BY npi, year
),
max_util_year AS (SELECT MAX(year) AS my FROM `${PROJECT_ID}.${DATASET}.utilization`),
volume_dim AS (
  SELECT
    yt1.npi,
    yt1.total_payment AS current_payment,
    yt2.total_payment AS prior_payment,
    SAFE_DIVIDE(yt1.total_payment - yt2.total_payment, yt2.total_payment) AS payment_change_pct,
    CASE
      WHEN yt1.total_payment IS NULL AND yt2.total_payment IS NOT NULL THEN 100
      WHEN SAFE_DIVIDE(yt1.total_payment - yt2.total_payment, yt2.total_payment) <= -0.30 THEN 100
      WHEN SAFE_DIVIDE(yt1.total_payment - yt2.total_payment, yt2.total_payment) <= -0.15 THEN 80
      WHEN SAFE_DIVIDE(yt1.total_payment - yt2.total_payment, yt2.total_payment) <= -0.05 THEN 50
      WHEN SAFE_DIVIDE(yt1.total_payment - yt2.total_payment, yt2.total_payment) <= 0.05 THEN 30
      WHEN SAFE_DIVIDE(yt1.total_payment - yt2.total_payment, yt2.total_payment) > 0.05 THEN 10
      ELSE 40
    END AS volume_trend_score
  FROM yearly_totals yt1
  CROSS JOIN max_util_year m
  LEFT JOIN yearly_totals yt2 ON yt1.npi = yt2.npi AND yt2.year = m.my - 3
  WHERE yt1.year = m.my
),

-- ============================================================
-- DIMENSION 4: Prescribing Trend (weight: 0.08)
-- ============================================================
yearly_rx AS (
  SELECT npi, year, SUM(total_claims) AS total_claims
  FROM `${PROJECT_ID}.${DATASET}.prescribing`
  GROUP BY npi, year
),
max_rx_year AS (SELECT MAX(year) AS my FROM `${PROJECT_ID}.${DATASET}.prescribing`),
rx_dim AS (
  SELECT
    rx1.npi,
    CASE
      WHEN rx1.total_claims IS NULL AND rx2.total_claims IS NOT NULL THEN 100
      WHEN SAFE_DIVIDE(rx1.total_claims - rx2.total_claims, rx2.total_claims) <= -0.30 THEN 100
      WHEN SAFE_DIVIDE(rx1.total_claims - rx2.total_claims, rx2.total_claims) <= -0.15 THEN 75
      WHEN SAFE_DIVIDE(rx1.total_claims - rx2.total_claims, rx2.total_claims) <= -0.05 THEN 40
      ELSE 10
    END AS prescribing_trend_score
  FROM yearly_rx rx1
  CROSS JOIN max_rx_year m
  LEFT JOIN yearly_rx rx2 ON rx1.npi = rx2.npi AND rx2.year = m.my - 2
  WHERE rx1.year = m.my
),

-- ============================================================
-- DIMENSION 5: Open Payments Trend (weight: 0.04)
-- ============================================================
yearly_op AS (
  SELECT npi, year, SUM(payment_amount) AS total_payments
  FROM `${PROJECT_ID}.${DATASET}.open_payments`
  WHERE NOT is_research
  GROUP BY npi, year
),
max_op_year AS (SELECT MAX(year) AS my FROM `${PROJECT_ID}.${DATASET}.open_payments`),
op_dim AS (
  SELECT
    op2.npi,
    CASE
      WHEN op1.total_payments IS NULL AND op2.total_payments > 1000 THEN 90
      WHEN op1.total_payments IS NULL AND op2.total_payments IS NOT NULL THEN 70
      WHEN SAFE_DIVIDE(op1.total_payments - op2.total_payments, op2.total_payments) <= -0.50 THEN 80
      ELSE 20
    END AS open_payments_trend_score
  FROM yearly_op op2
  CROSS JOIN max_op_year m
  LEFT JOIN yearly_op op1 ON op2.npi = op1.npi AND op1.year = m.my
  WHERE op2.year = m.my - 2
),

-- ============================================================
-- DIMENSION 6: License Status (weight: 0.08)
-- ============================================================
license_dim AS (
  SELECT
    npi,
    CASE
      WHEN status IN ('Expired', 'Inactive', 'Retired') THEN 100
      WHEN expiration_date < CURRENT_DATE() THEN 100
      WHEN DATE_DIFF(expiration_date, CURRENT_DATE(), DAY) < 90 THEN 80
      WHEN DATE_DIFF(expiration_date, CURRENT_DATE(), DAY) < 365 THEN 50
      WHEN has_disciplinary_action = TRUE THEN 40
      ELSE 10
    END AS license_status_score
  FROM `${PROJECT_ID}.${DATASET}.licenses`
  WHERE state = 'TN'
),

-- ============================================================
-- DIMENSION 7: Business Filing Status (weight: 0.04)
-- ============================================================
biz_dim AS (
  SELECT
    associated_npi AS npi,
    CASE
      WHEN status IN ('Dissolved', 'Revoked') THEN 100
      WHEN standing = 'Not in Good Standing' THEN 80
      WHEN status = 'Inactive' THEN 70
      WHEN last_annual_report_date < DATE_SUB(CURRENT_DATE(), INTERVAL 2 YEAR) THEN 60
      ELSE 10
    END AS business_filing_score
  FROM `${PROJECT_ID}.${DATASET}.business_filings`
  WHERE associated_npi IS NOT NULL
),

-- ============================================================
-- DIMENSION 8: Geographic Proximity (weight: 0.09)
-- ============================================================
geo_dim AS (
  SELECT
    npi,
    CASE
      WHEN practice_state = 'TN' AND practice_city IN (
        'Nashville', 'Murfreesboro', 'Franklin', 'Hendersonville', 'Gallatin',
        'Lebanon', 'Cookeville', 'Clarksville', 'Columbia', 'Smyrna',
        'Brentwood', 'Spring Hill', 'Mount Juliet', 'La Vergne', 'Shelbyville',
        'Tullahoma', 'McMinnville', 'Crossville'
      ) THEN 100
      WHEN practice_state = 'TN' AND practice_zip LIKE '37%' THEN 80
      WHEN practice_state = 'TN' THEN 60
      WHEN practice_state IN ('KY', 'GA', 'AL', 'VA', 'NC') THEN 30
      ELSE 5
    END AS geographic_score
  FROM `${PROJECT_ID}.${DATASET}.providers`
  WHERE entity_type = 1
),

-- ============================================================
-- DIMENSION 9: Practice Value (weight: 0.05)
-- ============================================================
latest_rev AS (
  SELECT npi, SUM(total_medicare_payment) AS annual_medicare
  FROM `${PROJECT_ID}.${DATASET}.utilization`
  WHERE year = (SELECT MAX(year) FROM `${PROJECT_ID}.${DATASET}.utilization`)
  GROUP BY npi
),
value_dim AS (
  SELECT
    npi,
    annual_medicare,
    CASE
      WHEN annual_medicare >= 1000000 THEN 100
      WHEN annual_medicare >= 500000 THEN 85
      WHEN annual_medicare >= 250000 THEN 70
      WHEN annual_medicare >= 100000 THEN 50
      WHEN annual_medicare >= 50000 THEN 30
      ELSE 10
    END AS practice_value_score
  FROM latest_rev
),

-- ============================================================
-- DIMENSION 10: Independence Likelihood (weight: 0.13)
-- NEW — Council recommendation
-- Detects whether a practice is likely still independent vs
-- already acquired by PE, hospital system, or large dialysis org
-- ============================================================
independence_dim AS (
  SELECT
    p.npi,
    CASE
      -- Hospital-employed: bills under hospital NPI or has hospital affiliations
      WHEN p.group_practice_size > 50 THEN 5   -- Large system
      WHEN p.group_practice_name LIKE '%Hospital%' THEN 10
      WHEN p.group_practice_name LIKE '%Health System%' THEN 10
      WHEN p.group_practice_name LIKE '%Medical Center%' THEN 15
      WHEN p.group_practice_name LIKE '%University%' THEN 5  -- Academic

      -- Large dialysis corporate
      WHEN p.group_practice_name LIKE '%DaVita%' THEN 5
      WHEN p.group_practice_name LIKE '%Fresenius%' THEN 5
      WHEN p.group_practice_name LIKE '%Dialysis Clinic%' THEN 10

      -- Signals of independence
      WHEN p.is_solo_practice = TRUE THEN 100
      WHEN p.group_practice_size <= 5 THEN 90
      WHEN p.group_practice_size BETWEEN 6 AND 15 THEN 70
      WHEN p.group_practice_size BETWEEN 16 AND 30 THEN 40

      -- Unknown — moderate signal
      ELSE 60
    END AS independence_likelihood_score
  FROM `${PROJECT_ID}.${DATASET}.providers` p
  WHERE p.entity_type = 1
),

-- ============================================================
-- MA PENETRATION ADJUSTMENT
-- Adjust FFS-only Medicare revenue for MA blind spot
-- ============================================================
ma_adjustment AS (
  SELECT
    p.npi,
    vl.annual_medicare,
    COALESCE(ma.ma_penetration_rate, 0.35) AS ma_rate,  -- Default 35% if unknown
    CASE
      WHEN ma.ma_penetration_rate IS NOT NULL
      THEN SAFE_DIVIDE(vl.annual_medicare, (1.0 - ma.ma_penetration_rate))
      ELSE vl.annual_medicare / 0.65  -- Default adjustment
    END AS ma_adjusted_revenue
  FROM `${PROJECT_ID}.${DATASET}.providers` p
  LEFT JOIN latest_rev vl ON p.npi = vl.npi
  LEFT JOIN (
    SELECT county_fips, state, ma_penetration_rate
    FROM `${PROJECT_ID}.${DATASET}.ma_penetration`
    WHERE year = (SELECT MAX(year) FROM `${PROJECT_ID}.${DATASET}.ma_penetration`)
  ) ma ON p.practice_state = ma.state  -- Simplified: state-level; upgrade to county later
  WHERE p.entity_type = 1
),

-- ============================================================
-- PRACTICE ARCHETYPE CLASSIFICATION (Council recommendation)
-- ============================================================
archetype_dim AS (
  SELECT
    p.npi,
    CASE
      -- Check if they bill dialysis codes (ESRD MCP or HD procedures)
      WHEN EXISTS (
        SELECT 1 FROM `${PROJECT_ID}.${DATASET}.utilization` u
        WHERE u.npi = p.npi
          AND u.hcpcs_code IN ('90957','90958','90959','90960','90961','90962','90935','90937')
          AND u.year = (SELECT MAX(year) FROM `${PROJECT_ID}.${DATASET}.utilization`)
          AND u.total_services > 10
      ) THEN 'integrated_dialysis'

      -- Check for vascular access procedures
      WHEN EXISTS (
        SELECT 1 FROM `${PROJECT_ID}.${DATASET}.utilization` u
        WHERE u.npi = p.npi
          AND u.hcpcs_code IN ('36818','36819','36820','36821','36831','36832','36833')
          AND u.year = (SELECT MAX(year) FROM `${PROJECT_ID}.${DATASET}.utilization`)
          AND u.total_services > 5
      ) THEN 'interventional_vascular'

      -- Academic / hospital employed
      WHEN p.group_practice_name LIKE '%University%'
        OR p.group_practice_name LIKE '%Medical Center%' THEN 'academic_employed'

      -- Default: office-based with possible medical directorship
      ELSE 'office_med_director'
    END AS practice_archetype
  FROM `${PROJECT_ID}.${DATASET}.providers` p
  WHERE p.entity_type = 1
),

-- ============================================================
-- COMBINE ALL DIMENSIONS
-- ============================================================
combined AS (
  SELECT
    p.npi,
    COALESCE(a.age_score, 50) AS age_score,
    COALESCE(s.solo_practice_score, 60) AS solo_practice_score,
    COALESCE(v.volume_trend_score, 30) AS volume_trend_score,
    COALESCE(r.prescribing_trend_score, 30) AS prescribing_trend_score,
    COALESCE(o.open_payments_trend_score, 30) AS open_payments_trend_score,
    COALESCE(l.license_status_score, 10) AS license_status_score,
    COALESCE(b.business_filing_score, 10) AS business_filing_score,
    COALESCE(g.geographic_score, 5) AS geographic_score,
    COALESCE(vl.practice_value_score, 30) AS practice_value_score,
    COALESCE(ind.independence_likelihood_score, 60) AS independence_likelihood_score,
    COALESCE(ma.ma_adjusted_revenue, 0) AS ma_adjusted_revenue,
    COALESCE(arch.practice_archetype, 'unknown') AS practice_archetype
  FROM `${PROJECT_ID}.${DATASET}.providers` p
  LEFT JOIN age_dim a ON p.npi = a.npi
  LEFT JOIN solo_dim s ON p.npi = s.npi
  LEFT JOIN volume_dim v ON p.npi = v.npi
  LEFT JOIN rx_dim r ON p.npi = r.npi
  LEFT JOIN op_dim o ON p.npi = o.npi
  LEFT JOIN license_dim l ON p.npi = l.npi
  LEFT JOIN biz_dim b ON p.npi = b.npi
  LEFT JOIN geo_dim g ON p.npi = g.npi
  LEFT JOIN value_dim vl ON p.npi = vl.npi
  LEFT JOIN independence_dim ind ON p.npi = ind.npi
  LEFT JOIN ma_adjustment ma ON p.npi = ma.npi
  LEFT JOIN archetype_dim arch ON p.npi = arch.npi
  WHERE p.entity_type = 1
)

-- ============================================================
-- FINAL OUTPUT: Weighted composite scores
-- Weights from config.yaml (must sum to 1.0):
--   age=0.18, solo=0.13, volume=0.18, rx=0.08, payments=0.04,
--   license=0.08, business=0.04, geo=0.09, value=0.05, independence=0.13
-- ============================================================
SELECT
  GENERATE_UUID() AS score_id,
  npi,
  age_score,
  solo_practice_score,
  volume_trend_score,
  prescribing_trend_score,
  open_payments_trend_score,
  license_status_score,
  business_filing_score,
  geographic_score,
  practice_value_score,
  independence_likelihood_score,

  -- Weighted composite
  ROUND(
    age_score * 0.18 +
    solo_practice_score * 0.13 +
    volume_trend_score * 0.18 +
    prescribing_trend_score * 0.08 +
    open_payments_trend_score * 0.04 +
    license_status_score * 0.08 +
    business_filing_score * 0.04 +
    geographic_score * 0.09 +
    practice_value_score * 0.05 +
    independence_likelihood_score * 0.13
  , 1) AS total_weighted_score,

  -- Tier assignment
  CASE
    WHEN ROUND(
      age_score * 0.18 + solo_practice_score * 0.13 + volume_trend_score * 0.18 +
      prescribing_trend_score * 0.08 + open_payments_trend_score * 0.04 +
      license_status_score * 0.08 + business_filing_score * 0.04 +
      geographic_score * 0.09 + practice_value_score * 0.05 +
      independence_likelihood_score * 0.13
    , 1) >= 75 THEN 'HOT'
    WHEN ROUND(
      age_score * 0.18 + solo_practice_score * 0.13 + volume_trend_score * 0.18 +
      prescribing_trend_score * 0.08 + open_payments_trend_score * 0.04 +
      license_status_score * 0.08 + business_filing_score * 0.04 +
      geographic_score * 0.09 + practice_value_score * 0.05 +
      independence_likelihood_score * 0.13
    , 1) >= 55 THEN 'WARM'
    WHEN ROUND(
      age_score * 0.18 + solo_practice_score * 0.13 + volume_trend_score * 0.18 +
      prescribing_trend_score * 0.08 + open_payments_trend_score * 0.04 +
      license_status_score * 0.08 + business_filing_score * 0.04 +
      geographic_score * 0.09 + practice_value_score * 0.05 +
      independence_likelihood_score * 0.13
    , 1) >= 35 THEN 'WATCH'
    ELSE 'LOW'
  END AS tier,

  -- Top signals
  ARRAY(
    SELECT signal FROM UNNEST([
      STRUCT('age' AS signal, age_score AS score),
      STRUCT('solo', solo_practice_score),
      STRUCT('volume_decline', volume_trend_score),
      STRUCT('rx_decline', prescribing_trend_score),
      STRUCT('payments_drop', open_payments_trend_score),
      STRUCT('license', license_status_score),
      STRUCT('business', business_filing_score),
      STRUCT('geography', geographic_score),
      STRUCT('practice_value', practice_value_score),
      STRUCT('independent', independence_likelihood_score)
    ])
    WHERE score >= 70
    ORDER BY score DESC
    LIMIT 5
  ) AS top_signals,

  CAST(NULL AS FLOAT64) AS previous_score,
  CAST(NULL AS FLOAT64) AS score_change,

  CURRENT_DATE() AS calculated_date,
  'v1.1' AS calculation_version,

  ma_adjusted_revenue,
  practice_archetype,

  -- Human overlay (preserved from previous run via separate merge)
  CAST(NULL AS STRING) AS manual_override_tier,
  CAST(NULL AS STRING) AS manual_notes,
  CAST(NULL AS DATE) AS last_contacted_date,
  'not_contacted' AS contact_status,

  CURRENT_TIMESTAMP() AS created_at
FROM combined;
