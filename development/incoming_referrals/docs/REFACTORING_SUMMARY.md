# TKE Referral System - Refactoring Summary

## Organization
**The Kidney Experts, PLLC**

## Overview

This document tracks the refactoring work to simplify and clean up the TKE Referral System codebase.

---

## Goals

1. **Centralize Dictionaries** - Single source of truth for provider/clinic/city/state lookups
2. **Reduce File Count** - From 23 files down to 13 essential files
3. **Eliminate Redundancy** - Remove duplicate code across multiple files
4. **Add Real-Time Processing** - Normalize data immediately on form submission
5. **Fix Data Consistency** - Standardize Column B values (`TRUE`/`FALSE` → `Yes`/`No`)

---

## File Structure Changes

### Before (23 files - cluttered)
```
incoming_referrals/
├── appsscript.json
├── AutoSort.js
├── CityNormalization.js
├── ClinicNormalization.js
├── Code.js
├── Dict_Cities.js
├── Dict_Clinics.js
├── Dict_Providers.js
├── Dict_States.js
├── functionNames.js              ← REMOVE (unused)
├── NameAddressNormalization.js   ← MERGE into Code.js
├── OnFormSubmit.js
├── PhoneNormalization.js
├── PROJECT_OVERVIEW.md           ← MOVE to docs/
├── ProviderDedupIntegration.js   ← REMOVE (redundant)
├── ProviderDeduplication.js      ← MERGE into ProviderNormalization.js
├── ProviderDeduplicationIntegration.js  ← REMOVE (redundant)
├── ProviderNormalization.js
├── ProviderNormalizationV4.js    ← MERGE into ProviderNormalization.js
├── REFACTORING_SUMMARY.md        ← MOVE to docs/
├── ReportGenerator.js            ← MERGE into Code.js
├── StateNormalization.js
├── utilities.js                  ← MERGE into Code.js
└── backup_original/              ← Keep backups
```

### After (13 files - clean)
```
incoming_referrals/
├── .clasp.json                   ← Config (required)
├── appsscript.json               ← Manifest (required)
├── Dict_Providers.js             ← Dictionary
├── Dict_Clinics.js               ← Dictionary
├── Dict_Cities.js                ← Dictionary
├── Dict_States.js                ← Dictionary
├── ProviderNormalization.js      ← Functions only (uses Dict_Providers.js)
├── ClinicNormalization.js        ← Functions only (uses Dict_Clinics.js)
├── CityNormalization.js          ← Functions only (uses Dict_Cities.js)
├── StateNormalization.js         ← Functions only (uses Dict_States.js)
├── PhoneNormalization.js         ← Phone formatting
├── Code.js                       ← Main (includes utilities, reports, sorting)
├── OnFormSubmit.js               ← Real-time trigger
├── docs/
│   ├── PROJECT_OVERVIEW.md
│   └── REFACTORING_SUMMARY.md
└── backup_original/
    └── (original files before refactoring)
```

---

## Refactoring Steps

### Step 1: Centralize Dictionaries ✅ DONE
Created Dict_*.js files containing all lookup dictionaries:
- `Dict_Providers.js` - Provider name mappings (1,500+ entries)
- `Dict_Clinics.js` - Clinic name mappings (500+ entries)
- `Dict_Cities.js` - City corrections (200+ entries)
- `Dict_States.js` - State abbreviations/variations

### Step 2: Refactor Normalization Files ⏳ IN PROGRESS
Update normalization files to use centralized dictionaries instead of inline definitions:
- [ ] ProviderNormalization.js - Remove PROVIDER_STANDARDIZATION_SERIES, use Dict_Providers.js
- [ ] ClinicNormalization.js - Remove CLINIC_STANDARDIZATION, use Dict_Clinics.js
- [ ] CityNormalization.js - Remove CITY_CORRECTIONS, use Dict_Cities.js
- [ ] StateNormalization.js - Remove STATE_VARIATIONS, use Dict_States.js

### Step 3: Merge Redundant Files ⏳ PENDING
Consolidate functionality:
- [ ] Merge ProviderDeduplication.js + ProviderNormalizationV4.js → ProviderNormalization.js
- [ ] Merge utilities.js + ReportGenerator.js + AutoSort.js → Code.js
- [ ] Merge NameAddressNormalization.js → Code.js or OnFormSubmit.js

### Step 4: Delete Redundant Files ⏳ PENDING
Remove after merging:
- [ ] functionNames.js
- [ ] ProviderDedupIntegration.js
- [ ] ProviderDeduplicationIntegration.js
- [ ] ProviderDeduplication.js (after merge)
- [ ] ProviderNormalizationV4.js (after merge)
- [ ] utilities.js (after merge)
- [ ] ReportGenerator.js (after merge)
- [ ] AutoSort.js (after merge)
- [ ] NameAddressNormalization.js (after merge)

### Step 5: Add Column B Normalization ⏳ PENDING
Add to OnFormSubmit.js:
- [ ] `normalizeRowSelfReferral()` function
- [ ] Convert `TRUE` → `Yes`
- [ ] Convert `FALSE` → `No`

### Step 6: Move Documentation ⏳ PENDING
- [ ] Create docs/ folder
- [ ] Move PROJECT_OVERVIEW.md
- [ ] Move REFACTORING_SUMMARY.md

---

## Key Design Decisions

### Dictionary Keys
All dictionary keys are **lowercase** for case-insensitive matching:
```javascript
const PROVIDERS = {
  'smith, john': 'Smith, John MD',
  'john smith': 'Smith, John MD'
};
```

### Safe Dictionary Access
Use `typeof` checks for safe access:
```javascript
if (typeof PROVIDERS !== 'undefined' && PROVIDERS[key]) {
  return PROVIDERS[key];
}
```

### Color Coding
| Color | Hex | Meaning |
|-------|-----|---------|
| Light Blue | #E6F3FF | Corrected/Normalized |
| Light Green | #E8F5E9 | VA/Government |
| Light Yellow | #FFF3CD | Self-referral |
| Light Red | #FFE6E6 | Invalid/Unknown |
| Light Orange | #FFE6CC | Duplicate |

---

## Google Apps Script Load Order

Files load alphabetically in Apps Script. Our naming ensures correct order:
1. `Dict_*.js` files load first (dictionaries available)
2. `*Normalization.js` files load second (can use dictionaries)
3. `Code.js` and `OnFormSubmit.js` load last (can use everything)

---

## Backup Location

Original files preserved in:
```
backup_original/
├── appsscript.json
├── AutoSort.js
├── CityNormalization.js
├── ClinicNormalization.js
├── Code.js
├── functionNames.js
├── NameAddressNormalization.js
├── PhoneNormalization.js
├── ProviderDedupIntegration.js
├── ProviderDeduplication.js
├── ProviderDeduplicationIntegration.js
├── ProviderNormalization.js
├── ProviderNormalizationV4.js
├── ReportGenerator.js
├── StateNormalization.js
└── utilities.js
```

---

## Date Log

| Date | Action |
|------|--------|
| 2025-11-30 | Created Dict_*.js dictionary files |
| 2025-11-30 | Backed up original files to backup_original/ |
| 2025-11-30 | Updated documentation |
| 2025-11-30 | Beginning normalization file refactoring |

---

## Contact

**Organization:** The Kidney Experts, PLLC
