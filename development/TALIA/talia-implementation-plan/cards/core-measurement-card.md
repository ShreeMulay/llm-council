# MEASUREMENT CARD

## Card Overview

| Attribute | Value |
|-----------|-------|
| **Type** | Core Card |
| **Color** | Blue (#4A90D9) |
| **Size** | 5" × 7" |
| **Paper** | 80-100 lb cardstock, matte |
| **Used By** | MA at Station 1 |
| **Timing** | Minutes 3-7 of 40-minute visit |

## Purpose

Capture objective clinical measurements including vital signs, weight, and physical findings. This card documents the "numbers" that drive clinical decisions.

---

## FRONT OF CARD (Clinical Side)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ███████████████████████████████████████████████████████████████████ │
│ █                    MEASUREMENT CARD                             █ │
│ █                   THE KIDNEY EXPERTS                            █ │
│ ███████████████████████████████████████████████████████████████████ │
├─────────────────────────────────────────────────────────────────────┤
│ Date: ___/___/______  Patient: ________________________________    │
│ MRN: ______________   DOB: ___/___/______                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ WEIGHT                                                              │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Today: _______ lbs    Last Visit: _______ lbs                   ││
│ │ Change: _______ lbs   ○ Gain  ○ Loss  ○ No Change               ││
│ │                                                                  ││
│ │ ⚠ ALERT if change > 5 lbs: ___________________________________ ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ BLOOD PRESSURE                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Systolic: _______ mmHg     Diastolic: _______ mmHg              ││
│ │                                                                  ││
│ │ Position: ○ Seated  ○ Standing  ○ Lying                         ││
│ │ Arm:      ○ Right   ○ Left                                      ││
│ │                                                                  ││
│ │ ⚠ URGENT if >180/110 or <90/60: ______________________________ ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ HEART RATE & RHYTHM                                                 │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Heart Rate: _______ bpm     Rhythm: ○ Regular  ○ Irregular      ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ OTHER VITALS (if indicated)                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Temperature: _______ °F     O2 Saturation: _______ %            ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ EDEMA ASSESSMENT                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Grade: ○ None  ○ Trace  ○ 1+  ○ 2+  ○ 3+  ○ 4+                  ││
│ │                                                                  ││
│ │ Location: ○ Ankles  ○ Legs  ○ Sacral  ○ Periorbital  ○ Other    ││
│ │ Other: ________________________________________________         ││
│ │                                                                  ││
│ │ Change from last visit: ○ Better  ○ Same  ○ Worse               ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ PAIN (if applicable)                                                │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Level: ___/10     Location: ________________________________    ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Completed by: _____________ (initials)  Time: _______              │
│                                                                     │
│ ⚠ FLAGS TRIGGERED: ○ Weight  ○ BP High  ○ BP Low  ○ Edema Change  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Date | Yes | Today's date |
| Patient Name | Text | Yes | Pre-printed or written |
| MRN | Text | Yes | Medical record number |
| DOB | Date | Yes | Date of birth |
| Weight (Today) | Number (lbs) | Yes | From scale |
| Weight (Last Visit) | Number (lbs) | Auto-filled | Reference |
| Weight Change | Number | Auto-calc | Difference |
| BP Systolic | Number | Yes | mmHg |
| BP Diastolic | Number | Yes | mmHg |
| BP Position | Select | Yes | Seated/Standing/Lying |
| BP Arm | Select | Yes | Right/Left |
| Heart Rate | Number | Yes | bpm |
| Rhythm | Select | Yes | Regular/Irregular |
| Temperature | Number | If indicated | °F |
| O2 Saturation | Number | If indicated | % |
| Edema Grade | Select | Yes | None/Trace/1+/2+/3+/4+ |
| Edema Location | Multi-select | If edema | Checkboxes |
| Edema Change | Select | Yes | Better/Same/Worse |
| Pain Level | Number 0-10 | If applicable | |
| Pain Location | Text | If pain | |
| MA Initials | Text | Yes | Accountability |
| Time Completed | Time | Yes | |

### Quality Checks / Alerts

Built-in triggers that flag attention:

| Trigger | Condition | Action |
|---------|-----------|--------|
| Weight Alert | Change > 5 lbs | Document reason, flag for provider |
| BP High Urgent | >180/110 | Immediate provider notification |
| BP Low Urgent | <90/60 | Immediate provider notification |
| Edema Change | Worse than last visit | Flag for provider |

---

## BACK OF CARD (Patient Education Side)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│              UNDERSTANDING YOUR NUMBERS                             │
│                                                                     │
│  WHY WE CHECK THESE THINGS                                          │
│  ─────────────────────────────                                      │
│                                                                     │
│  • WEIGHT tells us about fluid in your body                         │
│    - Quick weight gain often means extra fluid                      │
│    - Quick weight loss might mean you need to drink more            │
│    - Aim for steady weight, not big swings                          │
│                                                                     │
│  • BLOOD PRESSURE affects your kidneys AND heart                    │
│    - High blood pressure damages your kidneys over time             │
│    - Your goal is usually below 130/80                              │
│    - Take your BP medications every day, same time                  │
│                                                                     │
│  • SWELLING (EDEMA) shows where fluid is building up                │
│    - Check your ankles each morning                                 │
│    - Press on your shin - does it leave a dent?                     │
│    - Tell us if your shoes feel tight                               │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WHAT YOU CAN DO AT HOME                                            │
│  ─────────────────────────────                                      │
│                                                                     │
│  ○ Weigh yourself every morning, same time, same clothes            │
│  ○ Keep a log of your weight                                        │
│  ○ Limit salt to help control fluid and blood pressure              │
│  ○ Take all medications as prescribed                               │
│  ○ Check your ankles for swelling each day                          │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WHEN TO CALL US                                                    │
│  ─────────────────                                                  │
│                                                                     │
│  Call (731) 300-6155 right away if:                                 │
│                                                                     │
│  • Weight gain of 3+ pounds in one day or 5+ pounds in one week     │
│  • Blood pressure over 180/110 or under 90/60                       │
│  • Sudden increase in swelling                                      │
│  • Trouble breathing, especially when lying down                    │
│  • Dizziness or feeling faint                                       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│                    THE KIDNEY EXPERTS, PLLC                         │
│           "Ridding the world of the need for dialysis"              │
│                                                                     │
│                    Phone: (731) 300-6155                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AppSheet Data Entry

Fields captured for digital record:

| AppSheet Field | Source | Data Type |
|----------------|--------|-----------|
| visit_date | Card | Date |
| patient_id | Card/Lookup | Text |
| weight_lbs | Card | Number |
| weight_change_lbs | Calculated | Number |
| bp_systolic | Card | Number |
| bp_diastolic | Card | Number |
| bp_position | Card | Enum |
| heart_rate | Card | Number |
| rhythm | Card | Enum |
| temperature | Card | Number |
| o2_sat | Card | Number |
| edema_grade | Card | Enum |
| edema_location | Card | EnumList |
| edema_change | Card | Enum |
| pain_level | Card | Number |
| pain_location | Card | Text |
| ma_initials | Card | Text |
| flags_triggered | Card | EnumList |

---

## Print Specifications

| Attribute | Specification |
|-----------|---------------|
| Orientation | Portrait |
| Margins | 0.5" all sides |
| Paper | 80-100 lb cardstock |
| Finish | Matte (writable) |
| Color | Full color front, full color back |
| Header Bar | Blue #4A90D9 |
| Quantity | Initial run: 500 cards |
| Reorder Point | 125 cards remaining |

---

## Training Notes

**For MAs:**
1. Complete weight FIRST - patient should step on scale immediately
2. Use proper BP technique - patient seated 5 minutes, feet flat, arm supported
3. Check both ankles for edema - compare to each other and to last visit
4. Document any flags immediately - don't wait for provider
5. Time target: 4 minutes to complete this card

**Common Errors to Avoid:**
- Forgetting to note BP position
- Not calculating weight change
- Missing edema in unexpected locations (sacral, periorbital)
- Not flagging urgent BP readings immediately
