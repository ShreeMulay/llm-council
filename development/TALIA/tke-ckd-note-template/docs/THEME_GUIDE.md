# TKE CKD Note Template - Theme Guide

## Quick Reference

| Theme | Icon | Best For | Key Visual |
|-------|------|----------|------------|
| Clinical Light | ☀️ | Daytime clinic shifts | Warm white background, soft shadows |
| Clinical Dark | 🌙 | Night shifts, reading rooms | Deep navy, bright accents |
| High Contrast | 👁 | Visual accessibility | Black/white, thick borders |
| Compact | 📐 | Power users, small screens | Tighter spacing, smaller text |

---

## Screen-by-Screen Theme Mapping

### 1. Clinical Ribbon (Top Bar)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TKE │ John Smith, 68M │ G3b/A3 │ GDMT 2/4 │ ⚠3 │ [Baseline] [Prog] │
│     │                 │        │          │    │ [Theme] [Mic] [♥] │
└─────────────────────────────────────────────────────────────────────┘
```

| Element | Light | Dark | High Contrast | Compact |
|---------|-------|------|---------------|---------|
| Background | White | Navy #161B2B | White | Light gray |
| Text | Dark gray | Light gray | Black | Same as Light |
| Dividers | Light gray | Slate | Black | Same as Light |
| CKD Stage | Blue | Bright blue | Deep blue | Same as Light |
| GDMT Score | Purple | Light purple | Deep purple | Same as Light |
| Height | 40px | 40px | 40px | 32px |

---

### 2. Sidebar (Domain Navigation)

```
┌──────────────┐
│ Kidney Core 5│
│ Cardio-Rn   3│
│ 4 Pillars   4│
│ Metabolic   2│
│ ...         │
└──────────────┘
```

| Element | Light | Dark | High Contrast | Compact |
|---------|-------|------|---------------|---------|
| Background | White | Navy | White | Light gray |
| Domain dots | Standard colors | Brighter variants | Deeper variants | Standard |
| Hover state | Light gray bg | Slate bg | Black border | Tighter padding |
| Font size | 12px | 12px | 14px | 11px |

---

### 3. Needs Attention Queue

```
┌─────────────────────────────────────────────────────────────────────┐
│ Needs Attention (3)                                                 │
│ [🔴 K+ 6.2 critical] [🟠 eGFR -12.5%] [🟡 GDMT gap: MRA]           │
└─────────────────────────────────────────────────────────────────────┘
```

| Alert Type | Light | Dark | High Contrast |
|------------|-------|------|---------------|
| Critical (red) | #FEF2F2 bg, #991B1B text | rgba red, bright text | White bg, red border |
| Changed (orange) | #FFFBEB bg, #92400E text | rgba amber, bright text | White bg, orange border |
| Gap (yellow) | #FFFBEB bg, #92400E text | rgba amber, bright text | White bg, yellow border |

---

### 4. Section Cards

```
┌─ Kidney Function ─────────────────────────────────────────┐
│ ▌ [AI Ready]                                              │
│ ▌                                                         │
│ ▌ 🤖 AI Interpretation                     [High conf]    │
│ ▌ ┌─────────────────────────────────────────────────┐    │
│ ▌ │ eGFR declined from 32 to 28 mL/min (12.5%      │    │
│ ▌ │ decline), now CKD Stage 3b...                   │    │
│ ▌ └─────────────────────────────────────────────────┘    │
│ ▌ [✓ Accept] [✏️ Edit] [⚠️ Flag]                          │
└───────────────────────────────────────────────────────────┘
```

#### Card Background

| State | Light | Dark | High Contrast |
|-------|-------|------|---------------|
| Default | White | #161B2B | White |
| AI Draft | Blue tint | Blue/10 | White + blue border |
| Accepted | Green tint | Green/10 | White + green border |
| Edited | Purple tint | Purple/10 | White + purple border |
| Critical | Red tint + pulse | Red/10 + pulse | White + red 2px border |

#### Left Border (State Indicator)

| State | All Themes |
|-------|------------|
| AI Ready | `--accent-primary` (blue) |
| Accepted | `--color-success` (green) |
| Edited | `--color-domain-pharmacotherapy` (purple) |
| Needs Review | `--color-warning` (yellow/amber) |
| Critical | `--color-error` (red) + pulse |
| Conflict | `--color-warning` (orange) |

---

### 5. AI Interpretation Box

```
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  ← Dashed = Draft
╎ 🤖 AI Interpretation          ○ High conf   ╎
╎                                              ╎
╎ eGFR declined from 32 to 28 mL/min...       ╎
╎                                              ╎
╎ — Suggested Actions —                        ╎
╎ - Calculate KFRE 5-year risk                ╎
╎ - Consider AV fistula referral              ╎
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘

┌──────────────────────────────────────────────┐  ← Solid = Accepted
│ 🤖 AI Interpretation          ✓ Accepted    │
│ ...                                          │
└──────────────────────────────────────────────┘
```

| State | Border Style | Background |
|-------|--------------|------------|
| Draft (ai_ready) | Dashed blue | `--color-info-light` |
| Accepted | Solid green | `--color-success-light` |
| Edited | Solid purple | `--color-domain-pharmacotherapy`/10 |
| Critical | Solid red | `--color-error-light` |

---

### 6. Dashboard Drawer (Right Panel)

```
                              ┌────────────────────┐
                              │ Clinical Dashboard │
                              ├────────────────────┤
                              │ CKD Stage: G3b     │
                              │ Albuminuria: A3    │
                              ├────────────────────┤
                              │ Key Trends         │
                              │ eGFR    28 ↓ ~~~   │
                              │ UACR   420 ↑ ~~~   │
                              │ K+     6.2   ~~~   │
                              ├────────────────────┤
                              │ GDMT: [R][S][M][G] │
                              │       2/4 Pillars  │
                              ├────────────────────┤
                              │ [Generate Epic]    │
                              │ [Patient Summary]  │
                              │ [Care Team Tasks]  │
                              └────────────────────┘
```

| Element | Light | Dark | High Contrast |
|---------|-------|------|---------------|
| Panel bg | White | #161B2B | White |
| Section dividers | Light gray | Slate | Black |
| Trend sparklines | Blue line | Bright blue | Blue line |
| Out-of-range | Red line | Bright red | Red line |

---

### 7. Pre-Flight Check Dialog

```
┌─────────────────────────────────────────────────────────┐
│ 🛡️ Pre-Flight Check                                     │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│ │   12    │ │    8    │ │    2    │                    │
│ │Finalized│ │ Pending │ │Blockers │                    │
│ └─────────┘ └─────────┘ └─────────┘                    │
├─────────────────────────────────────────────────────────┤
│ ⚠️ 2 critical sections must be resolved                 │
├─────────────────────────────────────────────────────────┤
│ Section Review                                          │
│ ├─ Kidney Core                                          │
│ │  ├─ ✓ Kidney Function [Accepted]                     │
│ │  └─ ✓ BP/Fluid [Accepted]                            │
│ ├─ Pharmacotherapy                                      │
│ │  ├─ ✓ RAAS [Accepted]                                │
│ │  └─ ✗ Electrolytes [Critical]  ← Jump               │
└─────────────────────────────────────────────────────────┘
```

| Element | Light | Dark | High Contrast |
|---------|-------|------|---------------|
| Stats boxes | Green/Blue/Red tints | Darker tints | White + colored borders |
| Blocker warning | Red bg + border | Dark red | White + thick red border |
| Section rows | Subtle hover | Slate hover | Black border on hover |

---

### 8. Patient View

```
┌─────────────────────────────────────────────────────────┐
│ Hi John! Here's your health snapshot.                   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ Kidney Function │ │ Protein in Urine│                │
│ │ ████████░░ Good │ │ ██████████ High │                │
│ └─────────────────┘ └─────────────────┘                │
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ Potassium       │ │ Blood Pressure  │                │
│ │ ██████████ High │ │ ████████░░ High │                │
│ └─────────────────┘ └─────────────────┘                │
├─────────────────────────────────────────────────────────┤
│ Pre-Visit Questions                                     │
│ Step 1 of 3: Medication Check                          │
│ ○ Losartan 100mg - still taking? [Yes] [No]           │
└─────────────────────────────────────────────────────────┘
```

| Element | Light | Dark | High Contrast |
|---------|-------|------|---------------|
| Greeting box | Blue tint | Dark blue | White + blue border |
| Health gauges | Green/Yellow/Red | Brighter variants | Solid colors |
| Questionnaire | White cards | Dark cards | White + black borders |

---

### 9. Command Palette (⌘K)

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search sections...                                   │
├─────────────────────────────────────────────────────────┤
│ Kidney Core                                             │
│   ● 1. Kidney Function                                  │
│   ● 2. BP & Fluid Status                               │
│ Pharmacotherapy                                         │
│   ● 4. RAAS Inhibition                                 │
│   ● 5. SGLT2i                                          │
└─────────────────────────────────────────────────────────┘
```

| Element | Light | Dark | High Contrast |
|---------|-------|------|---------------|
| Overlay | Black/50 | Black/70 | Black/75 |
| Dialog bg | White | #161B2B | White |
| Domain dots | Domain colors | Brighter variants | Deeper variants |
| Selected item | Light gray bg | Slate bg | Black border |

---

## Domain Colors by Theme

| Domain | Light | Dark | High Contrast |
|--------|-------|------|---------------|
| Kidney Core | #3B82F6 | #60A5FA | #0052CC |
| Cardiovascular | #EF4444 | #F87171 | #CC0000 |
| Pharmacotherapy | #8B5CF6 | #A78BFA | #6B21A8 |
| Metabolic | #F97316 | #FB923C | #C2410C |
| CKD Complications | #1E40AF | #3B82F6 | #1E3A8A |
| Risk Mitigation | #22C55E | #4ADE80 | #166534 |
| Planning | #6B7280 | #94A3B8 | #374151 |
| Screening | #14B8A6 | #2DD4BF | #0D9488 |
| Care Coordination | #EC4899 | #F472B6 | #BE185D |

---

## Compact Theme Differences

| Element | Standard | Compact |
|---------|----------|---------|
| Ribbon height | 40px | 32px |
| Footer height | 48px | 36px |
| Base font size | 14px | 13px |
| Card padding | 16px | 10px |
| Section gap | 16px | 10px |
| Border radius | 8px | 6px |

---

## How to Switch Themes

1. **Quick cycle**: Click the theme icon in the Clinical Ribbon (between role switcher and mic)
2. **Theme persists**: Saved to localStorage, survives page refresh
3. **Keyboard**: No shortcut yet (could add ⌘+Shift+T in future)

---

## CSS Variable Reference

All theme values are set on `:root` via JavaScript (`applyTheme()`). Key variables:

```css
/* Surfaces */
--bg-app              /* Main page background */
--bg-surface          /* Cards, panels */
--bg-surface-raised   /* Popovers, dialogs */
--bg-surface-sunken   /* Inset areas, inputs */

/* Text */
--text-primary        /* Main text */
--text-secondary      /* Labels, descriptions */
--text-muted          /* Placeholders, hints */

/* Borders */
--border-default      /* Standard borders */
--border-subtle       /* Light dividers */
--border-strong       /* Emphasized borders */

/* Accent */
--accent-primary      /* Main action color (blue) */
--accent-primary-hover
--accent-primary-text /* Text on accent bg */

/* Status */
--color-success       /* Green */
--color-warning       /* Yellow/Amber */
--color-error         /* Red */
--color-info          /* Blue */

/* Each has -light and -text variants */
--color-success-light
--color-success-text
```

---

*Last updated: Phase 18 Theme System*
