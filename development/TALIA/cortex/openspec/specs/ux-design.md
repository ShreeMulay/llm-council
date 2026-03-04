# CORTEX — UX Design Specification

> **Version**: 1.0
> **Last Updated**: March 4, 2026
> **Screens**: 6
> **Form Factors**: 3 (Scribe Laptop, Provider Phone, Data Entry Chromebook)
> **Design Language**: Unified with TKE CKD note template — same base design system, "hospital mode" adaptation

---

## Design Principles

1. **"Review, Don't Write"** — AI generates, humans verify. The UX is built for reviewing, not composing.
2. **Red Floats to Top** — On constrained screens (phone), low-confidence or flagged sections surface first.
3. **One-Tap for the Common Case** — "Accept All Green" must be achievable in a single tap.
4. **Progressive Disclosure** — Show summary first, details on demand. No information overload.
5. **Scribe + Provider Parity** — Both are first-class users. Either may be unavailable at any time.
6. **Offline-First** — Record locally, sync when connected. Never lose audio.
7. **EPIC Awareness** — Data flows FROM EPIC (paste/screenshot) and TO EPIC (Smart Copy). Never replace EPIC.
8. **Transparent Auth** — No login screen. IAP (Identity-Aware Proxy) handles authentication at the infrastructure level. Users are redirected to Google Sign-In if not already signed in, then land directly on the Census screen. Personal phones and managed Chromebooks both work.

---

## Form Factors

### 1. Scribe Laptop (Primary Workstation)

| Property | Value |
|----------|-------|
| **Device** | Chromebook (TKE fleet) |
| **Screen** | ~14" laptop, landscape |
| **Input** | Keyboard + mouse, paste from EPIC, screenshots |
| **Layout** | Full sidebar + main content + detail panel |
| **User** | Scribe during rounding, note review, data entry |

Full-featured layout. Sidebar navigation, multi-panel views, keyboard shortcuts.

### 2. Provider Phone (Mobile)

| Property | Value |
|----------|-------|
| **Device** | iPhone / Android |
| **Screen** | ~6" phone, portrait |
| **Input** | Touch, voice (quick dictate) |
| **Layout** | Single column, collapsed cards, big tap targets |
| **User** | Provider between patients, end-of-day review, on-call |

Collapsed card layout. Red/flagged sections float to top. Large touch targets (minimum 48px). Swipe gestures for accept/flag. "Accept All Green" prominent.

### 3. Data Entry Chromebook (Citrix VDI)

| Property | Value |
|----------|-------|
| **Device** | TKE-owned Chromebook in Philippines, via Citrix VDI |
| **Screen** | ~14" laptop, landscape |
| **Input** | Keyboard + mouse, paste from EPIC (within Citrix) |
| **Layout** | Paste-focused, minimal UI, sequential patient flow |
| **User** | Data entry team processing census for upcoming rounds |

Simplified UI optimized for the paste-and-confirm workflow. Sequential navigation through census. No audio features. Giant paste area. Parsed result confirmation.

---

## Screen 1: Patient Census (Home)

### Purpose
Daily rounding list. The starting point for every session. Shows all patients assigned to the provider, with at-a-glance status.

### Data Source
Reads from TALIA 1.0 Hospital Census via shared Cloud SQL.

### Layout (Scribe Laptop)

```
┌────────────────────────────────────────────────────────────────────┐
│ CORTEX                                    Dr. Mulay  🔵 Online    │
│ "The intelligence behind the encounter"                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  NEW CONSULTS (3)                              [+ New Encounter]   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🔴 Smith, John       MRN 12345    ICU Bed 4A-12             │  │
│  │    AKI Stage 3 | Hyperkalemia | Day 0 (New)                 │  │
│  │    ▰▰▰▰▰▰▰▰▱▱ Acuity: High                                 │  │
│  │    Consult: "Oliguric AKI, K 6.8, possible need for HD"     │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 🟡 Garcia, Maria     MRN 67890    4B-8                      │  │
│  │    CKD G4 | HF | Day 0 (New)                                │  │
│  │    ▰▰▰▰▰▰▱▱▱▱ Acuity: Medium                               │  │
│  │    Consult: "CKD progression, volume overload"               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ACTIVE PATIENTS (12)                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🟢 Williams, Robert  MRN 11111    3A-5     Day 4            │  │
│  │    AKI (recovering) | Electrolytes                           │  │
│  │    ▰▰▰▰▱▱▱▱▱▱ Acuity: Low  |  Note: ✅ Signed              │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ 🟡 Johnson, Patricia MRN 22222    ICU 2B-1  Day 7           │  │
│  │    CRRT | Critical Care | HF                                 │  │
│  │    ▰▰▰▰▰▰▰▰▰▱ Acuity: High  |  Note: 📝 Draft             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ⚠️ ALERTS: 2 unsigned notes | 1 critical lab (K 6.2, Room 4A) │
└────────────────────────────────────────────────────────────────────┘
```

### Key Elements

| Element | Description |
|---------|-------------|
| **New Consults Section** | Floats to top, distinct visual treatment. Shows consult reason verbatim. |
| **Patient Card** | Name, MRN, room, active domains (color-coded tags), day counter, acuity bar |
| **Acuity Bar** | 10-segment bar, color-filled. Derived from active domains + labs + ICU status. |
| **Domain Tags** | Color-coded chips matching domain colors from `inpatient-domains.md` |
| **Day Counter** | "Day 0" = new consult, "Day 4" = 4th day on service |
| **Note Status** | Draft, Ready for Review, Signed, Addendum |
| **One-Line Snapshot** | AI-generated summary of most pressing issue |
| **Bottom Alerts Bar** | Unsigned notes, critical labs, overdue tasks |

### Layout (Provider Phone)

Single column. Patient cards are compressed (name + room + domain tags + note status). Tap to expand. New consults section pinned at top with distinct background color. Pull-to-refresh.

### Layout (Data Entry Chromebook)

Same as laptop but with "Next Patient" sequential navigation. Each patient card shows data entry status (No Data / Partial / Complete). Filter to show only patients needing data entry.

---

## Screen 2: Patient Encounter (3-Phase Workflow)

### Purpose
The core workflow screen. Three sequential phases for each patient encounter during rounding.

### Phase 2A: Hallway Huddle (Pre-Room)

**When**: Before entering patient room. Provider and scribe review what's known.

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Census    Smith, John (MRN 12345)    ICU 4A-12    Day 2        │
│ Phase: HALLWAY HUDDLE                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  📋 AI PRE-ROUND BRIEF                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ AKI Stage 2 → 1 (improving). Cr 3.2 → 2.8 → 2.4.          │  │
│  │ K normalized (6.8 → 5.1 → 4.8). UOP trending up (45→65→    │  │
│  │ 80 mL/hr). Off pressors since yesterday. HD held today.     │  │
│  │                                                               │  │
│  │ ⚠️ Yesterday's Plan Tracking:                                │  │
│  │   ✅ Renal ultrasound — completed, no obstruction            │  │
│  │   ✅ Discontinue vancomycin — done per pharmacy              │  │
│  │   ⏳ Urology consult for foley removal — pending             │  │
│  │   ❌ 24h urine protein — not collected (nursing note)        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  📊 3-DAY TREND SPARKLINES                                        │
│  Cr:  3.2 → 2.8 → 2.4  ↓                                        │
│  K:   6.8 → 5.1 → 4.8  ↓                                        │
│  UOP: 45  → 65  → 80   ↑ mL/hr                                  │
│  BP:  148/92 → 135/84 → 128/78  ↓                               │
│                                                                    │
│  📝 EPIC DATA (Pasted by scribe/data entry)                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [Paste area — or view already-parsed EPIC data]              │  │
│  │ Last updated: 6:15 AM by data entry team                     │  │
│  │ Labs ✅ | Vitals ✅ | Meds ✅ | Notes ✅                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [Enter Room →]                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **AI Pre-Round Brief**: Auto-generated summary of overnight changes, pending tasks, key lab trends
- **Yesterday's Plan Tracking**: Each item from yesterday's plan checked against overnight orders, nursing notes, results
- **3-Day Trend Sparklines**: Key vitals and labs with directional arrows
- **EPIC Data Section**: Shows parsed data from paste/screenshot. Scribe or data entry team may have pre-loaded this.
- **Hallway Huddle PHI Bleed Prevention**: Data displayed requires patient identity confirmation. If scribe opens wrong patient, mismatched MRN triggers alert.

### Phase 2B: In-Room (During Encounter)

**When**: Inside patient room. Recording active.

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Huddle    Smith, John    ICU 4A-12    🔴 RECORDING  00:04:32   │
│ Phase: IN-ROOM                                          [⏸ Pause] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  🎙️ LIVE TRANSCRIPTION                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Dr. Mulay: "Good morning Mr. Smith. How are you feeling     │  │
│  │ today? Any shortness of breath?"                             │  │
│  │                                                               │  │
│  │ Patient: "Much better doc. I was able to walk to the         │  │
│  │ bathroom this morning without getting winded."               │  │
│  │                                                               │  │
│  │ Dr. Mulay: "That's great progress. Let me listen to your    │  │
│  │ lungs..."                                                    │  │
│  │                                                               │  │
│  │ [Live transcription continues...]                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  🏷️ EXTRACTED ENTITIES (Real-Time)                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Symptom: dyspnea — improved                                  │  │
│  │ Functional: ambulating to bathroom independently             │  │
│  │ Exam: lung auscultation (pending finding)                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  🩺 QUICK EXAM ENTRY                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Lungs: [Clear ✓] [Crackles] [Rhonchi] [Wheezes]             │  │
│  │ Edema: [None ✓] [Trace] [1+] [2+] [3+] [4+]                │  │
│  │ JVP:   [Normal ✓] [Elevated] [Not assessed]                 │  │
│  │ AV Fistula: [N/A] [Thrill+] [Bruit+] [No thrill/bruit]     │  │
│  │ [+ Add Finding]                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [⏹ End Recording + Exit Room →]                                  │
└────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **Recording Indicator**: Prominent red dot + timer. Always visible.
- **Pause Button**: For sensitive conversations (family discussions, non-patient topics). Shows "Recording Paused" state clearly.
- **Live Transcription**: Streaming text with speaker diarization (Dr. Mulay / Patient / Nurse / Family).
- **Entity Extraction**: Real-time extraction of symptoms, findings, meds mentioned, labs discussed. Feeds into note generation.
- **Quick Exam Entry**: Tap-based physical exam finding entry. Context-aware — shows relevant exam components based on active domains (e.g., AV fistula exam for dialysis patients, fundoscopy for hypertensive emergency).
- **Manual Trigger**: Recording starts/stops with explicit button press. NOT ambient.

### Phase 2C: Post-Room

**When**: After leaving patient room. Provider may dictate additional thoughts. Note generation begins.

```
┌────────────────────────────────────────────────────────────────────┐
│ ← In-Room    Smith, John    ICU 4A-12    ✅ Recording Complete    │
│ Phase: POST-ROOM                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  🎤 QUICK DICTATE (Optional)                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [Hold to Dictate]                                             │  │
│  │ "Add your assessment thoughts, plan changes, or anything     │  │
│  │  not captured in-room"                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  🤖 NOTE GENERATION                                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ▰▰▰▰▰▰▱▱▱▱  Generating note...                              │  │
│  │                                                               │  │
│  │ Step 1: Transcription finalized ✅                            │  │
│  │ Step 2: Entity extraction complete ✅                         │  │
│  │ Step 3: RAG context retrieved ✅                              │  │
│  │ Step 4: Council generating... (3 models in parallel) ⏳      │  │
│  │ Step 5: Chairman synthesis — pending                         │  │
│  │ Step 6: Confidence scoring — pending                         │  │
│  │                                                               │  │
│  │ Estimated: ~25 seconds remaining                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  📄 STREAMING PREVIEW                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ SUBJECTIVE:                                                   │  │
│  │ Patient reports improved dyspnea, able to ambulate to        │  │
│  │ bathroom independently. Denies chest pain, nausea...         │  │
│  │ [streaming...]                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [Review Note →]   [Next Patient →]                                │
└────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- **Quick Dictate**: Push-to-talk for assessment/plan additions. Appended to transcript before council generation.
- **Generation Progress**: Step-by-step progress indicator showing council pipeline status.
- **Streaming Preview**: As the chairman synthesizes, sections stream in for early review.
- **Next Patient**: Provider can move to next patient while note generates. Review later.

---

## Screen 3: Note Review

### Purpose
The most critical screen. Where providers review, edit, and approve AI-generated notes.

### Layout (Scribe Laptop — Full View)

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Census    Smith, John    Note Review    Daily Progress Note     │
│ Day 2 | Generated 8:42 AM | Council: Full (3-model)              │
├──────────┬─────────────────────────────────────────────────────────┤
│ DOMAINS  │                                                         │
│          │  AKI (Acute Kidney Injury)                    🟢 High  │
│ 🟢 AKI  │  ─────────────────────────────────────────────────────  │
│ 🟢 Lytes│                                                         │
│ 🟡 Vol  │  Assessment:                                            │
│ 🟢 Meds │  AKI Stage 2 → 1, improving. Etiology: prerenal        │
│ 🔴 Disp │  (sepsis-related ATN with superimposed prerenal         │
│          │  component). Cr trending 3.2 → 2.8 → 2.4.             │
│          │                                                         │
│          │  📎 Source: Lab (verified) | Transcript 4:32            │
│          │                                                         │
│          │  Plan:                                                   │
│          │  1. Continue IV fluids at 75 mL/hr ◀ transcript 5:01   │
│          │  2. Recheck BMP in AM ◀ transcript 5:15                │
│          │  3. Hold HD today — trending well ◀ transcript 5:22    │
│          │  4. F/u urology re: foley removal ◀ transcript 5:30    │
│          │                                                         │
│          │  ⚠️ COUNCIL DISAGREEMENT:                               │
│          │  ┌────────────────────────────────────────────────────┐ │
│          │  │ Gemini: "ATN resolving, likely no further HD"      │ │
│          │  │ Claude: "ATN resolving, recommend one more BMP     │ │
│          │  │          before confirming no HD needed"            │ │
│          │  │ Mistral: "Prerenal + ATN overlap, monitor 48h"    │ │
│          │  │                                                     │ │
│          │  │ Chairman: Included all perspectives. Flagged for   │ │
│          │  │ human decision on HD hold duration.                │ │
│          │  └────────────────────────────────────────────────────┘ │
│          │                                                         │
│          │  [✅ Accept] [✏️ Edit] [🚩 Flag] [🔊 Play Audio]       │
│          │                                                         │
├──────────┼─────────────────────────────────────────────────────────┤
│          │  Electrolytes                                 🟢 High  │
│          │  ─────────────────────────────────────────────────────  │
│          │  ...                                                    │
└──────────┴─────────────────────────────────────────────────────────┘
│  [✅ Accept All Green (3 sections)]  [📋 Sign Note]               │
└────────────────────────────────────────────────────────────────────┘
```

### Key Elements

| Element | Description |
|---------|-------------|
| **Domain Sidebar** | Left sidebar with all active domains. Color-coded confidence: 🟢 High, 🟡 Medium (needs glance), 🔴 Low (needs review). |
| **Section Cards** | Each domain renders as a card with assessment + plan. |
| **Confidence Indicator** | Per-section confidence from council scoring. |
| **Source Provenance** | Every data point tagged: `Lab (verified)`, `Transcript 4:32`, `EPIC paste`, `Provider dictation`. |
| **High-Risk Fields** | Labs, meds, doses, dialysis access — highlighted with source. Must show provenance. |
| **Council Disagreement** | When models disagree, all 3 opinions shown with chairman's synthesis. Provider makes final call. |
| **Audio Playback** | Click timestamp to hear that segment of the recording. |
| **Accept/Edit/Flag** | Per-section actions. Accept locks the section. Edit opens inline editor. Flag marks for follow-up. |
| **Accept All Green** | One button to accept all 🟢 sections. Massive time saver. |
| **Sign Note** | Final action. Locks note, creates audit record. |

### Layout (Provider Phone — Review Mode)

```
┌──────────────────────────┐
│ ← Smith, John    Day 2   │
│ Progress Note             │
├──────────────────────────┤
│                           │
│ 🔴 Consult Disposition   │
│ ┌────────────────────────┐│
│ │ ⚠️ Low confidence      ││
│ │ Discharge timeline     ││
│ │ unclear from transcript││
│ │                         ││
│ │ [Review] [Dictate Fix] ││
│ └────────────────────────┘│
│                           │
│ 🟡 Volume/Hemodynamics   │
│ ┌────────────────────────┐│
│ │ Fluid balance: +800    ││
│ │ mL net. Target: even.  ││
│ │ Continue Lasix 40 IV   ││
│ │ q12h.                  ││
│ │                         ││
│ │ [Accept] [Edit]        ││
│ └────────────────────────┘│
│                           │
│ 🟢 AKI (3 more green)    │
│ ┌────────────────────────┐│
│ │ AKI improving. Cr 2.4  ││
│ │ ↓. Hold HD. F/u BMP AM.││
│ │                         ││
│ │ [Accept]               ││
│ └────────────────────────┘│
│                           │
│ [✅ Accept All Green (3)] │
│ [📋 Sign Note]            │
└──────────────────────────┘
```

**Phone-specific behavior:**
- Red sections float to top (most urgent first)
- Cards are collapsed by default (tap to expand)
- "Dictate Fix" button — hold to speak correction
- Swipe right = Accept, Swipe left = Flag
- Large touch targets (minimum 48px)

---

## Screen 4: Data Entry (Citrix)

### Purpose
Philippines-based data entry team pastes EPIC data into CORTEX via Citrix VDI.

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ CORTEX Data Entry                       User: DataEntry_PH_01     │
│ Census: 15 patients | Completed: 8 | Remaining: 7                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  CURRENT PATIENT: Garcia, Maria (MRN 67890)    Room 4B-8          │
│  Status: ⏳ Needs Data                                             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │                    PASTE EPIC DATA HERE                       │  │
│  │                                                               │  │
│  │  (Ctrl+V to paste labs, vitals, med list, H&P, or notes)    │  │
│  │                                                               │  │
│  │  Or drag & drop screenshot                                   │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  📎 SCREENSHOTS: [Upload Screenshot]                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ screenshot_001.png — Labs panel (parsed ✅)                  │  │
│  │ screenshot_002.png — Med list (parsing... ⏳)                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  📊 PARSED RESULTS                                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Auto-detected: LAB RESULTS                                   │  │
│  │                                                               │  │
│  │ BMP (03/04/2026 05:30):                                      │  │
│  │   Na: 138     [✅ Confirm] [✏️ Correct] [❌ Discard]         │  │
│  │   K:  5.1     [✅ Confirm] [✏️ Correct] [❌ Discard]         │  │
│  │   Cl: 102     [✅ Confirm] [✏️ Correct] [❌ Discard]         │  │
│  │   CO2: 22     [✅ Confirm] [✏️ Correct] [❌ Discard]         │  │
│  │   BUN: 45     [✅ Confirm] [✏️ Correct] [❌ Discard]         │  │
│  │   Cr: 2.4     [✅ Confirm] [✏️ Correct] [❌ Discard]         │  │
│  │                                                               │  │
│  │ [✅ Confirm All] [📸 Add More Data]                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ⚠️ PATIENT IDENTITY CHECK                                        │
│  MRN in paste (12345) does NOT match current patient (67890)!    │
│  [Switch to Correct Patient] [Ignore — Data is Correct]          │
│                                                                    │
│  [← Previous Patient]  [Next Patient →]                            │
└────────────────────────────────────────────────────────────────────┘
```

### Key Elements

| Element | Description |
|---------|-------------|
| **Giant Paste Area** | Large, prominent paste target. Accepts any EPIC text. |
| **Screenshot Upload** | Drag-and-drop or file picker for EPIC screenshots. |
| **Auto-Recognition** | Gemini Flash (text) or Gemini Flash Vision (screenshot) parses data type and extracts structured values. |
| **Parsed Results** | Each extracted value shown with Confirm/Correct/Discard buttons. |
| **Patient Identity Check** | MRN fuzzy matching. If pasted data contains a different MRN, alert fires. |
| **Sequential Navigation** | Previous/Next buttons move through census. Progress bar at top. |
| **Minimal UI** | No audio features, no note review. Just data entry. |

---

## Screen 5: Procedure Note

### Purpose
Document procedures: HD, CVVH, CVVHDF, SLED, PD, PLEX, Aquadex, catheter placement.

### Layout (Scribe Laptop)

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Smith, John    Procedure Note    HD (Hemodialysis)              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  PROCEDURE TYPE: [HD ▾]                                            │
│  (HD | CVVH | CVVHDF | SLED | PD | PLEX | Aquadex | Catheter)   │
│                                                                    │
│  📋 PRE-FILLED FROM CONTEXT                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Indication: AKI Stage 2 with hyperkalemia (K 6.8),          │  │
│  │             refractory to medical management                 │  │
│  │             ◀ AI-generated from encounter context             │  │
│  │             [✅ Accept] [✏️ Edit]                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ⚙️ PRESCRIPTION / PARAMETERS                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Access: [RIJ TDC ▾]  Inserted: [03/01/2026]                 │  │
│  │ Duration: [4 hours ▾]                                        │  │
│  │ Blood Flow: [350 mL/min ▾]                                  │  │
│  │ Dialysate Flow: [500 mL/min ▾]                              │  │
│  │ Dialysate: [K=2, Ca=2.5 ▾]                                  │  │
│  │ UF Goal: [2.0 L ▾]  Dry Weight: [82.0 kg]                  │  │
│  │ Net UF Rate: [500 mL/hr] (auto-calculated)                  │  │
│  │                                                               │  │
│  │ 💊 Anticoagulation: [Heparin ▾]                              │  │
│  │   Bolus: [2000 units]  Maintenance: [1000 units/hr]         │  │
│  │   OR: [None — saline flushes q30min]                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  📊 WEIGHT-BASED CALCULATIONS                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Current Weight: 84.0 kg | Dry Weight: 82.0 kg               │  │
│  │ Estimated fluid excess: 2.0 L                                │  │
│  │ UF Goal matches estimated excess: ✅                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ✅ MONITORING CHECKLIST (auto-selected for HD)                    │
│  ☑ Pre/Post vitals    ☑ Pre/Post weight                          │
│  ☑ Intradialytic BP q30min   ☑ Access site assessment            │
│  ☑ Post-BMP ordered                                               │
│                                                                    │
│  📝 COMPLICATIONS: [None ▾]                                       │
│  (Hypotension | Cramping | Clotting | Access dysfunction | Other) │
│                                                                    │
│  [💾 Save as Template]  [📋 Save Note]                             │
└────────────────────────────────────────────────────────────────────┘
```

### Key Elements

| Element | Description |
|---------|-------------|
| **Smart Defaults** | Based on procedure type, pre-fill common parameters. HD defaults differ from CVVH. |
| **AI Pre-Fill Indication** | Gemini Flash generates indication from encounter context. Provider confirms. |
| **Weight-Based Calculations** | Auto-calculate UF goal, heparin dosing, CRRT replacement fluid rates. |
| **Procedure-Specific Fields** | Each modality shows relevant fields only. PLEX shows replacement fluid (albumin vs FFP), exchange volume. PD shows dwell time, exchanges. |
| **Monitoring Checklist** | Auto-selected based on procedure type. Customizable. |
| **Save as Template** | Provider can save customized defaults for future use. |
| **Catheter Procedures** | Separate section for line placement (type, site, laterality, length, tip position, complications). |

### PLEX-Specific Fields (Example)

```
Exchange Volume: [1.0 plasma volume]
Replacement Fluid: [5% Albumin ▾] (Albumin | FFP | Cryo-poor FFP | Mixed)
ASFA Indication: [TTP — Category I ▾]
Access: [Apheresis catheter, RIJ ▾]
Anticoagulation: [ACD-A ▾] (ACD-A | Heparin | None)
Sessions Completed: [3 of 5 planned]
```

---

## Screen 6: Sign-Off & Export

### Purpose
Final review before signing. Billing justification. Export to EPIC.

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Note Review    Smith, John    SIGN-OFF                          │
│ Daily Progress Note — Day 2                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ✅ PRE-SIGN CHECKLIST                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ✅ All sections reviewed (5/5 accepted)                      │  │
│  │ ✅ No 🔴 sections remaining                                  │  │
│  │ ✅ High-risk fields verified (Cr, K, meds, access)           │  │
│  │ ✅ Patient identity confirmed                                 │  │
│  │ ⚠️ 1 council disagreement acknowledged (AKI HD decision)    │  │
│  │ ✅ Billing code reviewed                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  💰 BILLING JUSTIFICATION                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Suggested Code: 99233 (High complexity)                      │  │
│  │                                                               │  │
│  │ Justification:                                                │  │
│  │ ● High complexity medical decision making:                   │  │
│  │   - Multiple acute conditions (AKI, hyperkalemia,            │  │
│  │     volume overload) ◀ transcript 2:15-5:30                 │  │
│  │   - Data reviewed: BMP, CBC, UA, renal US                    │  │
│  │     ◀ EPIC paste (verified)                                  │  │
│  │   - Risk: HD initiation decision, IV heparin dosing          │  │
│  │     ◀ transcript 5:22                                        │  │
│  │                                                               │  │
│  │ ● Time: 35 min total encounter                               │  │
│  │   (Could also support 99233 via time if preferred)           │  │
│  │                                                               │  │
│  │ [✅ Accept 99233] [Change Code ▾]                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  📝 ATTESTATION                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ "I have personally reviewed this AI-assisted note,           │  │
│  │  verified key clinical data points, and confirm it           │  │
│  │  accurately represents today's encounter. All medical        │  │
│  │  decision making is my own."                                 │  │
│  │                                                               │  │
│  │ Provider: Dr. Shree Mulay                                    │  │
│  │ Date/Time: March 4, 2026, 9:15 AM CST                       │  │
│  │                                                               │  │
│  │ [✍️ Sign Note]                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  📤 EXPORT TO EPIC                                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [📋 Smart Copy — Full Note]                                  │  │
│  │ [📋 Copy Assessment & Plan Only]                              │  │
│  │ [📋 Copy Billing Justification]                               │  │
│  │ [🖨️ Print]  [📄 PDF]  [📧 Email to Chart]                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [← Back to Review]  [Next Patient →]                              │
└────────────────────────────────────────────────────────────────────┘
```

### Key Elements

| Element | Description |
|---------|-------------|
| **Pre-Sign Checklist** | Gates signing. All sections must be reviewed. No red sections. High-risk fields verified. |
| **Billing Justification** | AI suggests highest defensible E/M code with transcript-linked evidence for each criterion. Uses MDM complexity OR time-based, recommends whichever yields higher legitimate code. |
| **Attestation Statement** | Required attestation that provider reviewed AI-generated content and takes responsibility. |
| **Smart Copy** | Copies formatted note to clipboard for pasting into EPIC. Strips CORTEX-specific metadata (confidence scores, source tags). Clean clinical text. |
| **Export Options** | Full note, A&P only, billing justification, print, PDF, email to chart (if EPIC supports). |
| **Addendum Support** | After signing, provider can add addendum. Creates new version, preserves original. |

---

## Cross-Cutting UX Patterns

### Offline Mode

```
┌──────────────────────────────────────┐
│ ⚠️ OFFLINE MODE                      │
│ Recording locally. Will sync when    │
│ connection restored.                  │
│                                       │
│ Available: Record, Quick Exam Entry  │
│ Unavailable: Note Generation, EPIC   │
│              data, Census sync        │
│                                       │
│ 🔒 Audio encrypted with session key  │
│ 📦 3 recordings queued for upload     │
└──────────────────────────────────────┘
```

- Audio records to IndexedDB with session-derived encryption key
- Exam entries cached locally
- Sync queue shows pending uploads
- Note generation queues when online returns

### Consent Capture

```
┌──────────────────────────────────────┐
│ 📋 RECORDING CONSENT                 │
│                                       │
│ Patient: Smith, John (MRN 12345)     │
│                                       │
│ ☑ Verbal consent obtained            │
│ ○ Patient declined recording         │
│ ○ Patient unable to consent          │
│   (specify: ________________)        │
│                                       │
│ Consented by: [Patient ▾]            │
│ (Patient | Legal Rep | POA)          │
│                                       │
│ [✅ Proceed with Recording]           │
│ [📝 Proceed Without Recording]        │
└──────────────────────────────────────┘
```

- Hard gate before recording starts
- Refusal documented and encounter continues without audio
- Non-consent encounter uses manual entry only

### Error & Fallback States

| State | Behavior |
|-------|----------|
| **STT timeout** | Show "Transcription delayed" banner. Queue for retry. Allow manual dictation. |
| **Council timeout** | Show partial results from fastest model. Flag as "Single model — not council reviewed." |
| **Connection lost** | Switch to offline mode. Banner with sync status. |
| **Wrong patient data** | MRN mismatch alert. Block data save until resolved. |
| **Recording failure** | Red alert. Offer restart. Log incident for QA. |

### Keyboard Shortcuts (Scribe Laptop)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Accept section |
| `Ctrl+Shift+Enter` | Accept all green |
| `Ctrl+E` | Edit current section |
| `Ctrl+F` | Flag current section |
| `Ctrl+S` | Save/sign note |
| `Ctrl+R` | Start/stop recording |
| `Space` | Pause/resume recording (when recording active) |
| `Ctrl+D` | Quick dictate (hold) |
| `↑ / ↓` | Navigate sections |
| `Ctrl+P` | Print/export |

### Animations & Transitions

| Trigger | Animation |
|---------|-----------|
| Recording start | Pulse animation on red dot |
| Section accepted | Green checkmark slide-in, card collapses slightly |
| Council generating | Shimmer loading state on note preview |
| Confidence change | Smooth color transition on domain sidebar |
| Offline → Online | Green "Connected" toast notification |
| Error | Shake animation on affected element |

### Accessibility

- All interactive elements have ARIA labels
- Color is never the sole indicator (always paired with icon or text)
- Minimum 48px touch targets on mobile
- Screen reader support for note review flow
- High contrast mode available
- Keyboard-navigable on desktop

---

## Design Tokens (Inherited from TKE Theme)

| Token | Value | Usage |
|-------|-------|-------|
| `--tke-primary` | `#1B4D7A` | Headers, primary actions |
| `--tke-secondary` | `#2E86AB` | Links, secondary elements |
| `--tke-accent` | `#E8963E` | Warnings, highlights |
| `--tke-success` | `#22C55E` | Accepted, verified |
| `--tke-warning` | `#F59E0B` | Medium confidence, caution |
| `--tke-danger` | `#EF4444` | Low confidence, errors, recording |
| `--tke-bg` | `#F8FAFC` | Page background |
| `--tke-surface` | `#FFFFFF` | Card surfaces |
| `--tke-text` | `#1E293B` | Body text |
| `--tke-text-muted` | `#64748B` | Secondary text |
| `--font-family` | `'Nunito Sans', sans-serif` | All text |
| `--radius` | `8px` | Card and button border radius |

### Domain Colors (from `inpatient-domains.md`)

All 18 domain colors are used for domain tags, sidebar indicators, and confidence badges. See `inpatient-domains.md` for the complete color map.

---

## Open Questions (Pending Hospital Note Templates)

1. **Note output format** — What does a final signed note look like in EPIC? Need templates to design Smart Copy output.
2. **EPIC field mapping** — Which EPIC fields receive which parts of the note?
3. **Addendum format** — How are addenda structured in EPIC?
4. **Co-signature workflow** — Do scribes draft and providers co-sign? Or direct sign?
5. **Note versioning display** — How many prior versions to show in review?
