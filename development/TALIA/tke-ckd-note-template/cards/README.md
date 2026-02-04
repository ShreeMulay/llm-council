# TKE CKD Note Template - Clinical Cards

42 physical report cards for comprehensive CKD clinic workflow management.

## Quick Start

1. Open `index.html` in a browser to view the card gallery
2. Click "View" to preview any card
3. Click "Print" to print individual cards
4. Use `print-all.html` for batch printing

## Card Inventory (42 cards)

### Kidney Core (Blue #3B82F6) - 8 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-PROT | Proteinuria | UACR/UPCR tracking, albuminuria staging |
| TKE-KFRE | KFRE Risk | Kidney Failure Risk Equation calculator |
| TKE-RNLX | Renal Labs Extended | Comprehensive renal panel |
| TKE-RNAS | Renal Assessment | Overall kidney function assessment |
| TKE-BIOP | Kidney Biopsy | Biopsy results and pathology |
| TKE-HEMA | Hematuria | Hematuria workup and monitoring |
| TKE-STONE | Kidney Stones | Nephrolithiasis management |
| TKE-GU | GU Symptoms | Urological symptoms and referrals |

### Cardiovascular (Red #EF4444) - 4 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-BPFL | BP & Fluid | Blood pressure and volume status |
| TKE-DAXR | Daxor | Blood volume analysis results |
| TKE-HF | Heart Failure | HF management in CKD |
| TKE-STAT | Statin | Lipid management and statin therapy |

### Pharmacotherapy - 4 Pillars (Purple #8B5CF6) - 4 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-RAAS | RAAS Inhibition | ACEi/ARB/ARNi optimization |
| TKE-SGLT | SGLT2i | SGLT2 inhibitor management |
| TKE-FINE | Finerenone | ns-MRA therapy |
| TKE-GLP1 | GLP-1 RA | GLP-1 receptor agonist |

### Metabolic (Orange #F97316) - 3 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-DM | Diabetes | Glycemic control in CKD |
| TKE-GOUT | Gout | Uric acid and Krystexxa |
| TKE-OBES | Obesity | Weight management |

### CKD Complications (Dark Blue #1E40AF) - 3 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-ANEM | Anemia | CKD anemia management |
| TKE-MBD | MBD | Mineral bone disease |
| TKE-ELEC | Electrolytes | Electrolyte and acid-base |

### Risk Mitigation (Green #22C55E) - 6 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-SMOK | Tobacco | Smoking cessation |
| TKE-NSAI | NSAID | NSAID avoidance counseling |
| TKE-PPI | PPI Review | PPI deprescribing |
| TKE-SICK | Sick Day | Sick day rules education |
| TKE-CONT | Contrast | Contrast precautions |
| TKE-SODM | Sodium | Sodium restriction |

### Planning & Transitions (Gray #6B7280) - 4 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-TXPL | Transplant | Transplant readiness |
| TKE-DIAL | Dialysis | Dialysis planning |
| TKE-ACP | ACP | Advance care planning |
| TKE-CCM | CCM | Chronic care management enrollment |

### Screening & Prevention (Teal #14B8A6) - 8 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-VACC | Immunizations | Vaccine status and due dates |
| TKE-PHQ | Depression | PHQ-2/PHQ-9 screening |
| TKE-FALL | Fall Risk | Fall risk assessment |
| TKE-SLAP | Sleep Apnea | OSA screening and CPAP |
| TKE-SDOH | SDOH | Social determinants of health |
| TKE-GRIP | Grip Strength | Grip strength measurement |
| TKE-FUNC | Functional | Functional assessment (gait, TUG, SPPB) |
| TKE-NUTR | Nutrition | Dietary assessment |

### Care Coordination (Pink #EC4899) - 2 cards
| Code | Name | Purpose |
|------|------|---------|
| TKE-CRM | CRM Clinic | Cardiorenal Metabolic Clinic enrollment |
| TKE-LONG | Longevity | Longevity Clinic enrollment |

## Printing Instructions

### Paper Size
- **Card size**: 5.5" x 8.5" (half-letter)
- **Print setting**: Select "5.5 x 8.5" or "Statement" paper size
- **Duplex**: Print double-sided (flip on short edge)

### Individual Cards
1. Open the card HTML file (e.g., `TKE-RAAS.html`)
2. Press Ctrl+P (or Cmd+P on Mac)
3. Set paper size to 5.5" x 8.5"
4. Enable "Background graphics" for colors
5. Print

### Batch Printing
1. Open `print-all.html`
2. Click "Print All Cards"
3. Same settings as above
4. Cards will print in domain order

### Recommended Paper
- **Weight**: 80-100 lb cardstock for durability
- **Finish**: Matte (easier to write on)
- **Color**: White or light cream

## Card Design

### Front (Clinical Side)
- Domain-colored header with card code
- Patient info fields (name, DOB, date)
- Clinical data fields with target ranges
- Checkboxes for status and plan options
- Footer with version and domain

### Back (Patient Education)
- "What This Means For You" header
- Plain-language explanation (6th grade reading level)
- YOUR TARGETS section
- WHAT YOU CAN DO section
- WHEN TO CALL US section
- QR code placeholder for resources
- TKE contact: (731) 660-0014

## File Structure

```
cards/
├── index.html          # Card gallery with filtering
├── print-all.html      # Batch print layout
├── README.md           # This file
├── TKE-PROT.html       # Individual card files...
├── TKE-KFRE.html
├── ... (42 card files)
└── TKE-LONG.html
```

## Version History

- **v1.0** (2026-02-03): Initial release of all 42 cards

## Related Files

- `../schemas/section-registry.json` - Field definitions for all sections
- `../schemas/field-types.json` - Domain colors and enum values
- `../openspec/specs/card-inventory.md` - Card specifications

---

**The Kidney Experts**  
"Ridding the World of the Need for Dialysis!"  
(731) 660-0014
