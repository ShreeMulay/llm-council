# Card Scanning SOP

## Standard Operating Procedure: Card Scanning and Data Entry

**Document ID:** SOP-003  
**Version:** 1.0  
**Effective Date:** [Implementation Date]  
**Owner:** Data Operations Manager  
**Review Cycle:** Quarterly

---

## Purpose

Establish a standardized process for scanning completed visit cards and entering data into the AppSheet system, ensuring data integrity and efficient document management.

---

## Scope

This SOP covers the handling of all TALIA cards after patient visits, including scanning, data entry, quality review, and archival.

---

## Card Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CARD LIFECYCLE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    PATIENT VISIT                                                │
│         │                                                       │
│         ▼                                                       │
│    ┌─────────────┐                                              │
│    │   CARDS     │  Blue, Green, Orange completed              │
│    │  COMPLETED  │  Purple goes HOME with patient              │
│    └──────┬──────┘                                              │
│           │                                                     │
│           ▼                                                     │
│    ┌─────────────┐                                              │
│    │  SCANNING   │  Same day, end of each session              │
│    │   STATION   │                                              │
│    └──────┬──────┘                                              │
│           │                                                     │
│           ▼                                                     │
│    ┌─────────────┐                                              │
│    │    DATA     │  Enter into AppSheet                        │
│    │    ENTRY    │  Verify accuracy                            │
│    └──────┬──────┘                                              │
│           │                                                     │
│           ▼                                                     │
│    ┌─────────────┐                                              │
│    │   QUALITY   │  Spot check for completeness                │
│    │    CHECK    │  Flag issues                                │
│    └──────┬──────┘                                              │
│           │                                                     │
│           ▼                                                     │
│    ┌─────────────┐                                              │
│    │  ARCHIVAL   │  Organized filing                           │
│    │             │  Retention per policy                       │
│    └─────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Equipment Required

### Scanning Station Setup

| Item | Specification | Purpose |
|------|---------------|---------|
| Scanner | Document scanner with ADF | Batch scanning |
| Computer | Workstation with AppSheet access | Data entry |
| Filing System | Labeled folders by date | Physical archival |
| Discard Bin | Secure shredding bin | PHI disposal |

### Scanner Settings

- **Resolution:** 300 DPI (balance quality and file size)
- **Color:** Grayscale (unless color needed for card identification)
- **Format:** PDF (multi-page per patient)
- **Naming Convention:** `YYYY-MM-DD_PatientLastName_FirstName_MRN.pdf`

---

## Procedure

### Phase 1: Card Collection

**Timing:** After each patient visit

#### 1.1 Collect Cards from Pod
After Station 5 completion:
1. Gather completed cards:
   - Measurement Card (Blue)
   - Assessment Card (Green)
   - Intervention Card (Orange)
   - Module Cards (if used)
2. **Note:** Patient Summary Card (Purple) goes HOME with patient

#### 1.2 Initial Review
Before leaving pod, check:
- [ ] All required fields completed
- [ ] Signatures present where needed
- [ ] Writing is legible
- [ ] Patient identifiers on all cards

#### 1.3 Transport to Scanning Station
- Place cards in designated tray/folder
- Organize by patient (all cards for one patient together)
- Handle with care to prevent damage

---

### Phase 2: Scanning

**Timing:** End of each half-day session (morning and afternoon)

#### 2.1 Prepare Cards for Scanning
1. Remove any staples or clips
2. Arrange in order:
   - Measurement Card (front)
   - Assessment Card
   - Intervention Card
   - Module Cards (if any)
3. Align edges
4. Check for tears or damage

#### 2.2 Scan Cards
1. Place stack in scanner ADF (automatic document feeder)
2. Select correct settings:
   - 300 DPI
   - Grayscale
   - Duplex (both sides)
   - PDF output
3. Initiate scan
4. Verify scan quality:
   - All pages captured
   - Text is legible
   - No cut-off edges

#### 2.3 Name and Save File
**Naming Convention:**
```
YYYY-MM-DD_LastName_FirstName_MRN.pdf
```

**Example:**
```
2026-01-15_Johnson_Mary_12345.pdf
```

**Save Location:**
- Network drive: `\\server\PatientRecords\Scans\YYYY-MM\`
- Create monthly folder if needed

#### 2.4 Verify Scan
- Open saved PDF
- Confirm all pages present
- Confirm legibility
- Re-scan if issues found

---

### Phase 3: Data Entry

**Timing:** Same day as scan, within 2 hours of visit completion

#### 3.1 Open AppSheet
1. Log in to AppSheet application
2. Navigate to "Visit Data Entry" form
3. Search for patient by MRN

#### 3.2 Enter Visit Data

**From Measurement Card (Blue):**
| Field | AppSheet Field |
|-------|----------------|
| Date | visit_date |
| Weight | weight_lbs |
| Weight change | weight_change (auto-calc) |
| BP Systolic | bp_systolic |
| BP Diastolic | bp_diastolic |
| BP Position | bp_position |
| Heart Rate | heart_rate |
| Rhythm | rhythm |
| Edema Grade | edema_grade |
| Edema Location | edema_location |
| Flags | flags_triggered |

**From Assessment Card (Green):**
| Field | AppSheet Field |
|-------|----------------|
| Visit Type | visit_type |
| Chief Concern | chief_concern |
| Hospitalization | hospitalization, hosp_details |
| ER Visit | er_visit, er_details |
| Symptoms | symptoms |
| Med Adherence | adherence |
| Adherence Barriers | adherence_barriers |
| Modules Activated | modules_activated |

**From Intervention Card (Orange):**
| Field | AppSheet Field |
|-------|----------------|
| Primary Diagnosis | primary_diagnosis |
| CKD Stage | ckd_stage |
| GDMT Status | acei_status, sglt2i_status, mra_status |
| Meds Started | meds_started |
| Meds Stopped | meds_stopped |
| Labs Ordered | labs_ordered |
| Referrals | referrals |
| Follow-up | followup_interval |
| Discussion Points | discussion_points |

**From Module Cards:**
Enter module-specific fields as applicable.

#### 3.3 Save and Verify
1. Review all entered data
2. Save record
3. Confirm save was successful
4. Link scanned PDF to patient record (if system supports)

---

### Phase 4: Quality Check

**Timing:** Daily, before end of business

#### 4.1 Completeness Check
Review day's entries for:
- [ ] All visits entered
- [ ] No missing required fields
- [ ] Data matches scanned cards

#### 4.2 Accuracy Spot Check
Randomly select 10% of entries:
- Compare entered data to scanned card
- Flag any discrepancies
- Correct errors immediately

#### 4.3 Flag Issues
Document any issues found:
- Illegible handwriting → Contact completing staff
- Missing signatures → Follow up for completion
- Incomplete cards → Follow up with staff
- Data entry errors → Correct and document

#### 4.4 Quality Metrics
Track weekly:
| Metric | Target |
|--------|--------|
| Card completion rate | 100% |
| Data entry same-day | 100% |
| Accuracy rate | > 98% |
| Scan quality issues | < 2% |

---

### Phase 5: Archival

**Timing:** After data entry verification

#### 5.1 Physical Card Filing
**Organization:**
```
Filing Cabinet
├── 2026
│   ├── January
│   │   ├── Week 1
│   │   │   ├── 2026-01-06 (Date folders)
│   │   │   ├── 2026-01-07
│   │   │   └── ...
│   │   └── Week 2
│   └── February
└── 2027
```

**Filing Steps:**
1. Organize cards by date
2. Staple all cards for one patient together
3. Place in date folder
4. Ensure folder is labeled clearly

#### 5.2 Digital File Organization
Maintain organized folder structure on network:
```
PatientRecords/
├── Scans/
│   ├── 2026-01/
│   ├── 2026-02/
│   └── ...
└── Archive/
    └── (Older than 1 year)
```

#### 5.3 Retention Policy
| Record Type | Retention Period |
|-------------|------------------|
| Scanned cards (digital) | 7 years minimum |
| Physical cards | 1 year, then shred |
| AppSheet data | Indefinite |

#### 5.4 Secure Disposal
For physical cards after retention period:
1. Collect in secure shredding bin
2. Use cross-cut shredder or shredding service
3. Document disposal date
4. PHI must be destroyed completely

---

## Special Situations

### Illegible Card
1. Attempt to interpret with completing staff
2. If unresolvable, document "Illegible" in AppSheet
3. Follow up with staff for future improvement
4. Consider adding to training feedback

### Missing Card
1. Check pod, scanning station, and common areas
2. If not found, document "Card Missing"
3. Attempt to recreate information from:
   - Staff memory (same day only)
   - Other cards from visit
4. Note incomplete data in system

### Scanning Equipment Failure
1. Continue collecting cards (do not delay patient care)
2. Use backup scanner if available
3. Contact IT for repair
4. Resume scanning when repaired
5. Prioritize oldest unscanned cards

### Large Backlog
If more than 1 day of cards accumulate:
1. Prioritize by date (oldest first)
2. Request additional help if needed
3. Document reason for delay
4. Notify supervisor

---

## Staff Responsibilities

| Role | Responsibilities |
|------|------------------|
| **MA** | Complete cards accurately, transport to scanning station |
| **Scribe** | Ensure Intervention Card is complete and signed |
| **Data Entry Clerk** | Scan, enter data, quality check |
| **Supervisor** | Monitor quality metrics, address issues |

---

## Training Requirements

All staff handling cards must complete:
- [ ] HIPAA training (annual)
- [ ] AppSheet data entry training
- [ ] Scanner operation training
- [ ] Card handling procedures

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Scanner jams | Clear jam, check card condition, re-scan |
| AppSheet won't save | Check internet connection, try again, contact IT |
| Can't find patient in system | Verify MRN, check spelling, create new if truly new |
| Scanned image is dark | Adjust scanner brightness, re-scan |
| PDF file too large | Reduce DPI to 200, compress PDF |

---

## Related Documents

- SOP-001: Patient Arrival SOP
- SOP-002: Pod Workflow SOP
- HIPAA Policies
- AppSheet User Guide
- Record Retention Policy

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Author] | Initial release |

---

*THE KIDNEY EXPERTS, PLLC*  
*"Ridding the world of the need for dialysis"*
