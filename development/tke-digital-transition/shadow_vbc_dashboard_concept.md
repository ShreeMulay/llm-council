# Shadow VBC Dashboard (Conceptual Data Model)

This dashboard proves to payers and self-insured employers that TKE is saving them money by keeping patients off dialysis. It is the core of Phase 3 (Compressing the Bridge).

## Core Philosophy
We must track our high-risk patients (CKD Stages 4 & 5, or KFRE > 20% over 2 years) and demonstrate how our 12-domain protocol deviates them from the expected (expensive) trajectory.

## The Data Entities

### 1. The High-Risk Cohort (Top 200 Patients)
This is the denominator. We don't need to track every stage 2 patient yet. We need to track the ones who are statistically close to "crashing" onto dialysis.
*   **Data Points:** Patient ID, Age, Primary Payer, CKD Stage, Baseline eGFR, UACR.
*   **Key Metric:** **KFRE Score (Kidney Failure Risk Equation)** - The 2-year and 5-year probability of needing dialysis.

### 2. The Intervention Tracking (The 12-Domain Application)
We must prove *why* the trajectory changed. It wasn't luck; it was our standardized care.
*   **Data Points:** % of Cohort on Quadruple Therapy (SGLT2i, GLP-1, Finerenone, RAASi).
*   **Data Points:** % of Cohort at BP Goal (<120 mmHg).
*   **Data Points:** % of Cohort with controlled metabolic acidosis (Bicarb > 22).

### 3. The Outcomes (The "Delta")
This is the numerator. What actually happened?
*   **Expected Dialysis Starts (per 100 patient-years):** Based on KFRE and national USRDS (United States Renal Data System) averages for the matched cohort.
*   **Actual Dialysis Starts (per 100 patient-years):** How many of our Top 200 actually crashed?
*   **The Difference:** The raw number of "Dialysis Starts Avoided."

### 4. The Financial Translation (The Pitch)
This is how you get a VBC contract.
*   **Average Cost of ESRD/Dialysis per patient per year:** ~$90,000 (Medicare) to $120,000+ (Commercial).
*   **Average Cost of TKE Preventive Care (including expensive drugs):** ~$15,000 - $25,000.
*   **System Savings per Patient Avoided:** ~$70,000/year.
*   **Total Cohort Savings:** (Dialysis Starts Avoided) x $70,000. 

## The Dashboard Views

### View 1: The Payer/Employer Pitch (The Executive Summary)
*   "In the last 12 months, TKE managed a cohort of 200 high-risk CKD patients."
*   "Based on standard KFRE risk models, 25 of these patients were expected to initiate dialysis."
*   "Under TKE's 12-domain standardized protocol, only 5 patients initiated dialysis."
*   "We prevented 20 dialysis transitions, generating an estimated **$1.4 Million** in gross savings to the healthcare system."
*   "Our Ask: A shared savings arrangement where TKE captures 30% of that delta ($420k)."

### View 2: The Internal Clinical Dashboard (The "Are We Working?" View)
*   **KFRE Velocity:** Is the risk score going up or down over 6-month intervals?
*   **Standardization Adherence:** Which of the 12 domains are we failing on the most often across the Top 200 cohort? (e.g., "Only 45% are on GLP-1s due to prior auth denials.")
*   **CCM Enrollment % of Cohort:** Are we capturing the $90/month on these 200 patients while we wait for the VBC contract? (If not, we are bleeding cash for no reason.)