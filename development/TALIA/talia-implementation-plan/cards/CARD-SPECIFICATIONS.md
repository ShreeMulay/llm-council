# TALIA Card System Specifications

## Physical Specifications

| Attribute | Specification |
|-----------|---------------|
| **Size** | 5" × 7" (half letter) |
| **Paper** | 80-100 lb cardstock |
| **Finish** | Matte (better for writing with pen) |
| **Printing** | In-house, 2-sided |
| **Production** | The Kidney Experts internal |

## Design Standards

### Front of Card (Clinical Side)
- Header: Card name, color bar, logo
- Patient info line: Name, Date, MRN fields
- Sections: Clear boxes with headers
- Checkboxes: Filled circles (○) for OCR compatibility
- Fill areas: Adequate space for handwriting
- Footer: Completed by, Time fields

### Back of Card (Education Side)
- 6th-grade reading level
- Plain language explanations
- Key points in bullet format
- "When to call us" section
- QR code for video content (future)
- The Kidney Experts branding

## Color Coding

| Card Type | Header Color | Hex Code |
|-----------|--------------|----------|
| MEASUREMENT | Blue | #4A90D9 |
| ASSESSMENT | Green | #50C878 |
| INTERVENTION | Orange | #FFB347 |
| PATIENT SUMMARY | Purple | #9B59B6 |
| Diabetes Module | Yellow | #F1C40F |
| Heart Failure Module | Red | #E74C3C |
| Transplant Module | Teal | #1ABC9C |
| Pre-Dialysis Module | Navy | #34495E |
| Gout/Krystexxa Module | Burgundy | #922B21 |
| NSAIDs Module | Coral | #FF6F61 |
| Anemia Module | Pink | #FF69B4 |
| BP Control Module | Dark Blue | #2C3E50 |

## OCR Optimization
- Checkboxes: Filled circles, not squares
- Font: Sans-serif, minimum 10pt
- Contrast: Black on white
- No watermarks over data areas
- Target accuracy: 98%+

## Inventory Management
- Initial print run: 500 Core cards each, 200 Module cards each
- Reorder trigger: 25% remaining
- Storage: Card organizers at each pod

## Card Set Assembly
Pre-visit, MA assembles patient-specific card set based on:
- All patients: Core 4 cards
- Diabetic: + Diabetes Module
- Heart Failure: + HF Module
- eGFR <25: + Transplant Module
- eGFR <20: + Pre-Dialysis Module
- Gout/Krystexxa patient: + Gout Module
- NSAID user: + NSAIDs Module
- Anemia management: + Anemia Module
- Uncontrolled BP: + BP Control Module
