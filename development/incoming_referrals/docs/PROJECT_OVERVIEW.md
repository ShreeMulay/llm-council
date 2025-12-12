# TKE Medical Referral System - Project Overview

## What Is This System?

The **TKE Medical Referral System** is a comprehensive **Google Apps Script** application that integrates with **Google Sheets** to manage, clean, validate, and report on medical referral data for **The Kidney Experts, PLLC**.

The system processes incoming patient referrals submitted via Google Forms, automatically normalizing and standardizing the data to ensure consistency, accuracy, and usability for healthcare operations.

---

## Core Purpose

**Problem Solved:** Medical referral data often arrives messy:
- Provider names spelled inconsistently ("Dr Smith", "Smith, John MD", "John Smith M.D.")
- Phone numbers in various formats
- City names misspelled
- Clinic names with multiple variations
- Missing or incomplete required fields

**Solution:** This system automatically cleans, normalizes, and validates all referral data, ensuring:
- Consistent provider names for accurate referral tracking
- Standardized phone number formats
- Corrected city/state/address information
- Unified clinic names
- Data quality reporting and analytics

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│          Data Entry: Google Form + AppSheet App                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Sheet: "Form Responses 1"                    │
│                    (33+ columns of referral data)                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TKE Referral System (Apps Script)                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Centralized Dictionaries                     │   │
│  │  Dict_Providers.js │ Dict_Clinics.js │ Dict_Cities.js    │   │
│  │  Dict_States.js                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Normalization Modules                        │   │
│  │  • ProviderNormalization.js    • CityNormalization.js    │   │
│  │  • ClinicNormalization.js      • StateNormalization.js   │   │
│  │  • PhoneNormalization.js                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Core System Files                            │   │
│  │  • Code.js (Main orchestrator + menus + utilities)       │   │
│  │  • OnFormSubmit.js (Real-time normalization trigger)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Data Normalization (7 Modules)

| Module | Column | What It Does |
|--------|--------|--------------|
| **Provider Normalization** | E | Standardizes 1,500+ referring provider names, credentials (MD, DO, NP), handles variations |
| **Provider Deduplication** | E | Merges duplicate provider entries ("John Smith MD" = "Smith, John M.D.") |
| **Clinic Normalization** | D | Unifies 500+ clinic name variations, identifies self-referrals & government facilities |
| **City Normalization** | U | Corrects 200+ city misspellings, standardizes formatting |
| **State Normalization** | V | Expands abbreviations (TN → Tennessee), fixes typos |
| **Phone Normalization** | G,H,X,AD | Formats to (XXX) XXX-XXXX, validates area codes |
| **Name/Address Normalization** | F,I,J,T | Proper capitalization, standardizes street types |

### 2. Automated Processing

- **Real-Time Normalization:** OnFormSubmit trigger normalizes data instantly when submitted
- **Self-Referral Standardization:** Normalizes Column B (`TRUE`/`FALSE` → `Yes`/`No`)
- **Hourly Auto-Sort:** Keeps referrals sorted by timestamp (oldest first, newest last)
- **Batch Processing:** Handles large datasets (1000+ rows) efficiently
- **Automatic Backups:** Creates backups before major operations

### 3. Data Validation

- Validates required fields (patient name, DOB, phone, provider, clinic)
- Identifies duplicate patient referrals
- Flags invalid phone numbers
- Marks unknown/unrecognized entries for manual review

### 4. Reporting & Analytics

- **Master Report:** Comprehensive data quality overview
- **Daily Report:** Today's referral count, completion rate
- **Weekly Report:** 7-day trends and statistics
- **Provider Report:** Top referring providers, duplicates found
- **Data Quality Dashboard:** Overall quality score

### 5. Color-Coded Visual Feedback

| Color | Meaning |
|-------|---------|
| Light Blue (#E6F3FF) | Corrected/Normalized |
| Light Green (#E8F5E9) | VA/Government facility |
| Light Yellow (#FFF3CD) | Self-referral or name issue |
| Light Red (#FFE6E6) | Invalid/Unknown entry |
| Light Orange (#FFE6CC) | Duplicate or address issue |

---

## Data Flow

### When a New Referral Arrives:
1. **Google Form or AppSheet** submission creates new row in "Form Responses 1"
2. **onFormSubmit trigger** fires immediately:
   - Normalizes Column B (`TRUE`/`FALSE` → `Yes`/`No`)
   - Normalizes provider, clinic, city, state, phone, names
   - Sets status to "New"
3. **Hourly auto-sort** keeps chronological order
4. **n8n workflow** can reliably push to Google Chat (data is clean)

### When User Runs "Quick Normalize All":
1. Creates automatic backup
2. Normalizes phone numbers → Formats all phone columns
3. Normalizes providers → Matches to canonical names from dictionary
4. Normalizes names/addresses → Proper capitalization, street types
5. Normalizes cities → Fixes misspellings
6. Normalizes clinics → Unifies variations
7. Normalizes states → Expands abbreviations
8. Generates summary report

---

## Menu Structure

The system adds a custom menu "Referral System" to Google Sheets:

```
🏥 Referral System
├── ⚡ Quick Normalize All          (One-click full cleanup)
├── 🔄 Full Data Cleanup
├── ⚡ Quick Fix Common Issues
│
├── 📞 Phone Numbers
│   ├── Normalize All Phone Numbers
│   ├── Validate Phone Numbers Only
│   └── Generate Phone Report
│
├── 👨‍⚕️ Referring Providers
│   ├── Normalize All Providers
│   ├── Deduplicate All Providers
│   ├── Find Top Referring Providers
│   └── Provider Statistics
│
├── 👤 Names
│   ├── Normalize All Names
│   ├── Validate Name Entries
│   └── Generate Name Report
│
├── 📍 Addresses
│   ├── Normalize All Addresses
│   └── Standardize Street Types
│
├── 🏙️ Cities
│   ├── Normalize All Cities
│   ├── Fix City Misspellings
│   └── Get City Statistics
│
├── 🏥 Clinic Names
│   ├── Normalize All Clinic Names
│   └── Identify Self-Referrals
│
├── 🗺️ States
│   ├── Normalize State Data
│   └── Validate State Entries
│
├── 🔧 Combined Operations
│   ├── Normalize All Location Data
│   └── Validate All Fields
│
├── 🔄 Batch Processing
│   └── Schedule Automatic Processing
│
├── ✓ Validation
│   ├── Check All Data Quality
│   ├── Find Missing Required Fields
│   └── Check for Duplicate Referrals
│
├── 📊 Reports
│   ├── Generate Master Report
│   ├── Daily Summary
│   ├── Weekly Summary
│   └── Data Quality Dashboard
│
├── 💾 Backup Data Now
├── ⚙️ Settings
└── ℹ️ About
```

---

## File Inventory (Simplified Structure)

### Dictionary Files (Single Source of Truth)
| File | Purpose |
|------|---------|
| `Dict_Providers.js` | 1,500+ provider name mappings |
| `Dict_Clinics.js` | 500+ clinic name mappings |
| `Dict_Cities.js` | 200+ city corrections |
| `Dict_States.js` | State abbreviations & variations |

### Normalization Modules (Functions Only - Use Dictionaries)
| File | Purpose |
|------|---------|
| `ProviderNormalization.js` | Provider name standardization & deduplication |
| `ClinicNormalization.js` | Clinic name standardization |
| `CityNormalization.js` | City name corrections |
| `StateNormalization.js` | State name standardization |
| `PhoneNormalization.js` | Phone number formatting |

### Core System Files
| File | Purpose |
|------|---------|
| `Code.js` | Main orchestrator, menus, utilities, reports |
| `OnFormSubmit.js` | Real-time normalization on form/AppSheet submit |

### Configuration
| File | Purpose |
|------|---------|
| `appsscript.json` | Apps Script manifest |
| `.clasp.json` | CLASP deployment config |

### Documentation (in docs/ folder)
| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | This file - system documentation |
| `REFACTORING_SUMMARY.md` | Technical details of refactoring work |

### Backup (in backup_original/ folder)
| Contents | Purpose |
|----------|---------|
| Original .js files | Pre-refactoring backup of all code |

---

## Spreadsheet Structure

The system expects a Google Sheet named **"Form Responses 1"** with these key columns:

| Column | Letter | Field |
|--------|--------|-------|
| 1 | A | Timestamp |
| 2 | B | Is this a self referral? (Yes/No) |
| 4 | D | Clinic Name |
| 5 | E | Referring Provider |
| 6 | F | Staff Member Name |
| 7 | G | Clinic Phone |
| 8 | H | Clinic Fax |
| 9 | I | Patient Last Name |
| 10 | J | Patient First Name |
| 11 | K | Patient Date of Birth |
| 20 | T | Street Address |
| 21 | U | City |
| 22 | V | State |
| 23 | W | ZIP Code |
| 24 | X | Patient Phone |
| 27 | AA | Reason for Referral |
| 30 | AD | Referral Dept Phone |
| 31 | AE | Complete Flag |
| 32 | AF | Status |

**Note:** Column B receives data from both Google Forms (`Yes`/`No`) and AppSheet (`TRUE`/`FALSE`). 
The system normalizes these to consistent `Yes`/`No` values.

---

## Technology Stack

- **Platform:** Google Apps Script (JavaScript runtime)
- **Data Storage:** Google Sheets
- **Data Entry:** Google Forms + AppSheet App
- **Deployment:** CLASP (Command Line Apps Script Projects)
- **Triggers:** 
  - `onFormSubmit` - Real-time normalization when data arrives
  - Time-based - Hourly sorting
- **Integrations:** n8n workflow (pushes referrals to Google Chat)

---

## Usage

### First-Time Setup
1. Open the Google Sheet
2. System auto-initializes on first open
3. Accept permissions when prompted
4. Run "Quick Normalize All" for initial cleanup

### Daily Operations
- New referrals auto-sort hourly
- Run "Quick Normalize All" periodically to clean new data
- Check "Data Quality Dashboard" for issues
- Review reports for insights

### Maintenance
- Add new providers to `Dict_Providers.js`
- Add new clinics to `Dict_Clinics.js`
- Add city corrections to `Dict_Cities.js`
- Backups auto-created (keeps last 10)

---

## Summary

The TKE Medical Referral System transforms messy, inconsistent referral data into clean, standardized information ready for healthcare operations. With 1,500+ provider mappings, 500+ clinic variations, and comprehensive validation, it ensures data quality while saving hours of manual cleanup work.

**Version:** 4.0  
**Organization:** The Kidney Experts, PLLC  
**Last Updated:** November 2025
