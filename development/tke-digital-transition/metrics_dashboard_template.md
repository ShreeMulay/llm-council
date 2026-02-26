# TKE Metrics Dashboard Template
## Google Sheets Implementation Guide

**Create one Google Sheet named: "TKE Command Center"**
**Share with: Shree, Anna, Brandy Carr, Ashley Carter, Cloe Leal, Hope Wheeles, Mary Harris**

---

## TAB 1: CLINICAL QUALITY
**Updated by:** Brandy Carr (Clinical Manager)
**Frequency:** Weekly (Columns A-G), Monthly (Columns H-K)
**Data source:** Digital 12-domain report card submissions + DaVita EHR

### Columns

| Col | Header | Format | Description | How to Populate |
|-----|--------|--------|-------------|-----------------|
| A | Week Ending | Date | Sunday date of reporting week | Manual entry |
| B | Location | Dropdown | Jackson / Dyersburg / Union City / Covington | Select |
| C | Total Encounters | Number | Patient encounters that week at this location | Count from EHR schedule |
| D | Report Cards Completed | Number | Digital forms submitted by MAs | Count from Google Form responses |
| E | Standardization Rate | % (auto) | =D/C | Formula |
| F | BP at Goal (<120) | Number | Patients with systolic <120 mmHg | Count from digital form data |
| G | BP Goal Rate | % (auto) | =F/C | Formula |
| H | Diabetic CKD Patients (Total) | Number | Active diabetic CKD patients at location | Monthly EHR count |
| I | On Quadruple Therapy | Number | Patients on all 4: RAASi + SGLT2i + Finerenone + GLP-1 | Monthly digital form audit |
| J | Quadruple Therapy Rate | % (auto) | =I/H | Formula |
| K | Dialysis Starts (Quarter) | Number | Patients who initiated dialysis this quarter | Manual count from EHR/dialysis unit |
| L | 30-Day Readmissions | Number | Patients readmitted within 30 days of discharge | Hospital notification tracking |
| M | Readmission Rate | % | =L / (total discharges) | Formula |

### Conditional Formatting Rules
- Standardization Rate: GREEN >= 70%, YELLOW 50-69%, RED < 50%
- BP Goal Rate: GREEN >= 60%, YELLOW 40-59%, RED < 40%
- Quadruple Therapy Rate: GREEN >= 50%, YELLOW 30-49%, RED < 30%

---

## TAB 2: FINANCIAL
**Updated by:** Ashley Carter (Billing Manager)
**Frequency:** Weekly (revenue), Monthly (detailed breakdown)
**Data source:** Billing system / DaVita EHR claims

### Columns

| Col | Header | Format | Description |
|-----|--------|--------|-------------|
| A | Month | Date | Reporting month |
| B | Location | Dropdown | Jackson / Dyersburg / Union City / Covington |
| C | Total Revenue | Currency | Gross collections for this location this month |
| D | Provider Count | Number | FTE providers at this location |
| E | Revenue Per Provider | Currency (auto) | =C/D |
| F | Total Encounters | Number | Total patient encounters this month |
| G | Encounters Per Provider Per Day | Number (auto) | =F / (D * working days) |
| H | E/M Revenue | Currency | 99213/99214/99215/99204/99205 collections |
| I | G2211 Revenue | Currency | Complexity add-on collections |
| J | CCM Revenue | Currency | 99490/99439/99487/99489 collections |
| K | TCM Revenue | Currency | 99495/99496 collections |
| L | RPM Revenue | Currency | 99453/99454/99457/99458 collections |
| M | Krystexxa Revenue | Currency | Infusion collections |
| N | Research Revenue | Currency | Clinical trial revenue |
| O | Other Revenue | Currency | All other collections |
| P | % Medicare | % | Medicare revenue / Total |
| Q | % Commercial | % | Commercial revenue / Total |
| R | % Medicaid | % | Medicaid revenue / Total |
| S | Location Overhead | Currency | Rent + staff cost + supplies for this location |
| T | Location Profit | Currency (auto) | =C-S |
| U | Location Margin | % (auto) | =T/C |

### Conditional Formatting Rules
- Revenue Per Provider: GREEN >= $40K/mo, YELLOW $30-39K, RED < $30K
- Location Margin: GREEN >= 20%, YELLOW 10-19%, RED < 10%
- % Commercial: GREEN >= 30%, YELLOW 20-29%, RED < 20%

---

## TAB 3: CCM PIPELINE
**Updated by:** Revenue Capture Coordinator (Gloria Hogan or Layla Loftis)
**Frequency:** Weekly
**Data source:** CCM enrollment records + DaVita EHR patient list

### Columns

| Col | Header | Format | Description |
|-----|--------|--------|-------------|
| A | Week Ending | Date | Sunday date |
| B | Location | Dropdown | Per location |
| C | Total Eligible Patients | Number | CKD 3-5 with 2+ chronic conditions |
| D | Currently Enrolled | Number | Active CCM patients with signed consent |
| E | Enrollment Rate | % (auto) | =D/C |
| F | New Enrollments This Week | Number | New consents signed this week |
| G | Dropped This Month | Number | Patients who exited CCM |
| H | CCM Minutes Logged | Number | Total billable minutes this week |
| I | CCM Revenue (Est.) | Currency (auto) | Based on minutes thresholds |
| J | RPM Eligible | Number | Patients who could qualify for RPM |
| K | RPM Enrolled | Number | Patients with active RPM devices |
| L | RPM Enrollment Rate | % (auto) | =K/J |
| M | TCM Opportunities | Number | Hospital discharges this week |
| N | TCM Captured | Number | Follow-ups completed within 14 days |
| O | TCM Capture Rate | % (auto) | =N/M |

### Conditional Formatting Rules
- CCM Enrollment Rate: GREEN >= 75%, YELLOW 60-74%, RED < 60%
- TCM Capture Rate: GREEN >= 80%, YELLOW 60-79%, RED < 60%

### Weekly Targets (Posted at Top of Tab)
- New CCM Enrollments: >= 10/week across all locations
- TCM Capture Rate: >= 80%
- RPM Deployments: >= 5 new devices/week (once program launches)

---

## TAB 4: SHADOW VBC COHORT
**Updated by:** Data Analyst (once hired) or Brandy Carr (interim)
**Frequency:** Monthly
**Data source:** DaVita EHR labs + digital report card data

### Columns

| Col | Header | Format | Description |
|-----|--------|--------|-------------|
| A | Patient ID | Text | De-identified identifier (TKE-001, TKE-002, etc.) |
| B | Age | Number | Current age |
| C | Primary Payer | Dropdown | Medicare / Medicaid / Commercial / Other |
| D | CKD Stage | Dropdown | 3a / 3b / 4 / 5 |
| E | Baseline eGFR | Number | eGFR at cohort entry |
| F | Current eGFR | Number | Most recent eGFR |
| G | eGFR Change (6mo) | Number (auto) | =F - (eGFR from 6 months ago) |
| H | eGFR Trend | Text (auto) | IF G>0 "Improving", IF G>-5 "Stable", ELSE "Declining" |
| I | KFRE 2yr Risk (%) | Number | Kidney Failure Risk Equation 2-year probability |
| J | KFRE 5yr Risk (%) | Number | KFRE 5-year probability |
| K | On RAASi? | Y/N | ACEi/ARB/ARNI |
| L | On SGLT2i? | Y/N | Dapagliflozin/Empagliflozin/Canagliflozin |
| M | On Finerenone? | Y/N | Kerendia |
| N | On GLP-1 RA? | Y/N | Semaglutide/Dulaglutide/Liraglutide |
| O | Quadruple Therapy? | Y/N (auto) | =AND(K="Y", L="Y", M="Y", N="Y") |
| P | BP at Goal? | Y/N | Systolic <120 mmHg |
| Q | Bicarb >= 22? | Y/N | Metabolic acidosis corrected |
| R | CCM Enrolled? | Y/N | Active CCM |
| S | Dialysis Started? | Y/N | Has this patient initiated dialysis? |
| T | Date of Dialysis Start | Date | If S=Y, when |
| U | Expected Annual Cost | Currency | Based on USRDS stage-matched benchmark |
| V | Actual TKE Annual Cost | Currency | Based on TKE billing data |
| W | Savings Delta | Currency (auto) | =U-V |

### Dashboard Summary (Top of Tab)
- Total Cohort: =COUNTA(A:A)
- Expected Dialysis Starts (annualized from KFRE): =SUMPRODUCT formula
- Actual Dialysis Starts: =COUNTIF(S:S, "Y")
- Dialysis Starts Avoided: Expected - Actual
- Estimated System Savings: =Avoided * $90,000
- % on Quadruple Therapy: =COUNTIF(O:O, "Y") / COUNTA(A:A)

---

## TAB 5: OPERATIONS & PEOPLE
**Updated by:** Brandy Carr + Cloe Leal (Front Office Manager)
**Frequency:** Monthly
**Data source:** Scheduling system, HR records, referral tracking

### Columns

| Col | Header | Format | Description |
|-----|--------|--------|-------------|
| A | Month | Date | Reporting month |
| B | Location | Dropdown | Per location |
| C | Total Headcount | Number | All staff at this location |
| D | MA Headcount | Number | Medical assistants |
| E | MA Departures | Number | MAs who left this month |
| F | MA Turnover Rate | % (auto) | =E/D (annualized: *12) |
| G | Scribe Headcount | Number | Scribes at this location |
| H | Scribe Departures | Number | Scribes who left this month |
| I | APP Headcount | Number | APPs at this location |
| J | APP Departures | Number | APPs who left this month |
| K | Open Positions | Number | Unfilled roles |
| L | Days to Fill (Avg) | Number | Average days open positions remain unfilled |
| M | New Patients (Month) | Number | First-time patients seen |
| N | Top Referral Source 1 | Text | PCP name/practice sending most referrals |
| O | Top Referral Source 2 | Text | Second highest |
| P | Top Referral Source 3 | Text | Third highest |
| Q | No-Show Rate | % | Missed appointments / Scheduled |
| R | Patient Satisfaction Score | Number | If surveyed (1-10 scale) |
| S | Provider Satisfaction Score | Number | Quarterly survey (1-10 scale) |

### Conditional Formatting Rules
- MA Turnover (Annualized): GREEN < 15%, YELLOW 15-25%, RED > 25%
- APP Departures: ANY value > 0 = RED ALERT
- No-Show Rate: GREEN < 10%, YELLOW 10-20%, RED > 20%
- Open Positions: GREEN = 0, YELLOW 1-2, RED > 2
