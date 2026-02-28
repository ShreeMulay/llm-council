# OpenSpec: Writing Game Overhaul — Correct Letter Formation

**Change ID**: `writing-overhaul`
**Status**: APPROVED
**Priority**: 1 (High)
**Type**: Feature Enhancement
**Author**: AI + Shree
**Date**: 2026-02-27

---

## Problem Statement

The Name Writing game teaches **incorrect letter formation**. Stroke order, direction, and starting points do not follow standard handwriting pedagogy. A Pre-K child using this app would learn bad habits that conflict with classroom instruction.

### Specific Defects

| Letter | Defect | Correct (HWT) |
|--------|--------|---------------|
| **M** (uppercase) | Stroke 1 starts bottom→up (`M 15 90 L 15 10`) | Must start top→down |
| **N** (uppercase) | Stroke 1 starts bottom→up (`M 25 90 L 25 10`) | Must start top→down |
| **a** (lowercase) | Starts with right-side arc, then stem | Must start with "Magic C" (counterclockwise circle), then stem |
| **d** (lowercase) | Starts with tall stem, then bowl | Must start with "Magic C" (same as `a`), then tall stem |
| **n** (lowercase) | Starts bottom→up (`M 30 75 L 30 30`) | Must start top→down |
| **u** (lowercase) | Single stroke left-to-right, OK direction but should be 2 strokes | Split into down-curve-up + down |

Additionally, the game has **zero instructional scaffolding**:
- No animated demonstration of correct formation
- No directional arrows showing which way to draw
- No verbal cues explaining the strokes
- No progressive difficulty — jumps straight to freehand tracing

## Solution: 5-Part Overhaul

### Part 1: Correct Stroke Data

Rewrite `strokeData.ts` to match **Handwriting Without Tears (HWT)** pedagogy:

- All strokes start from the top (non-negotiable principle)
- Lowercase `a`, `d` use "Magic C" as first stroke (prevents b/d reversal)
- Each stroke gets a `cue` field with HWT verbal instruction
- Each stroke gets a `direction` indicator for arrow rendering

**Letters in "Adalyn Mulay"**: A, d, a, l, y, n, M, u, l, a, y

#### Corrected Formations

**A (uppercase)** — 3 strokes:
1. "Big line down left" — Start top-center, slide to bottom-left
2. "Frog jump, big line down right" — Return to top, slide to bottom-right
3. "Little line across" — Horizontal crossbar at midpoint

**M (uppercase)** — 4 strokes:
1. "Big line down" — Top-left straight down to bottom
2. "Slide down to middle" — Top-left diagonal to bottom-center
3. "Climb back up" — Bottom-center diagonal to top-right
4. "Big line down" — Top-right straight down to bottom

**d (lowercase)** — 2 strokes:
1. "Magic C" — Counterclockwise circle starting at ~2 o'clock
2. "Up tall, back down" — From circle's end, up to ascender line, straight down

**a (lowercase)** — 2 strokes:
1. "Magic C" — Counterclockwise circle starting at ~2 o'clock
2. "Down" — Straight line from top of circle to baseline

**l (lowercase)** — 1 stroke:
1. "Big line down" — Top to bottom, simple vertical

**y (lowercase)** — 2 strokes:
1. "Little line down" — Short diagonal from top-left to center
2. "Long line down" — Long diagonal from top-right through center, below baseline

**n (lowercase)** — 2 strokes:
1. "Down" — Vertical stroke top to bottom
2. "Back up, over, and down" — Retrace up, curve over the hump, down to baseline

**u (lowercase)** — 2 strokes:
1. "Down, curve, up" — Down, curve at baseline, back up to midline
2. "Down" — Straight down to baseline

### Part 2: Stroke Animation Demo

Before tracing, show an animated demonstration:
- A colored dot travels along the guide path at consistent speed
- Each stroke animates sequentially with a 400ms pause between
- SVG-based: render guide paths as `<path>` elements, animate a `<circle>` along them using `getPointAtLength()`
- Display "Watch me!" label during demo
- Transition to "Your turn!" when demo completes
- "Show me again" button to replay

### Part 3: Directional Arrows

Visual cues on the guide path:
- Small triangle arrows sampled at 3-4 points along each stroke
- Arrows point in the stroke's drawing direction
- Each stroke has a different color (stroke 1 = purple, 2 = blue, 3 = green, 4 = amber)
- Numbered circles at each stroke's start point (1, 2, 3...)
- Green "START" dot on stroke 1, red "END" dot on final stroke's end

### Part 4: Voice Cues Per Stroke

Audio guidance using HWT verbal cues:
- During **demo**: speak the `cue` text as each stroke animates
- During **tracing**: speak the `cue` when user begins each stroke
- Use `audio.sayAsync()` for speech (falls back through pre-gen → API → browser TTS)
- Cues are short phrases: "Magic C!", "Big line down!", "Little line across!"

### Part 5: Progressive Difficulty

Three levels per letter, auto-advancing:

| Level | Name | Guide | Animation | Arrows | Accuracy Req |
|-------|------|-------|-----------|--------|-------------|
| 1 | **Watch** | Full | Auto-plays | Yes | N/A (just watch) |
| 2 | **Guided** | Full + leader dot | On request | Yes | Any completion |
| 3 | **Free** | Faint + start dots only | On request | No | Score tracked |

- New letters start at Level 1 (Watch), auto-advance to Level 2 (Guided)
- After completing Guided, advance to Level 3 (Free Trace)
- If Free Trace accuracy < 50%, offer to drop back to Guided
- "Show me again" button available at any level

## Technical Design

### Data Schema Changes (`strokeData.ts`)

```typescript
export interface Stroke {
  path: string;                          // SVG path data (0-100 coordinate space)
  startPoint: { x: number; y: number };  // Where to place start dot
  endPoint: { x: number; y: number };    // Where to place end dot
  cue: string;                           // HWT verbal cue (e.g., "Magic C!")
}
```

### Component Architecture

```
NameWritingGame (orchestrator)
├── LetterDemo (SVG animation of correct formation)
│   ├── SVG guide paths
│   ├── Animated traveling dot
│   └── Stroke number labels
├── TracingCanvas (user draws here)
│   ├── Guide paths with directional arrows
│   ├── Numbered start dots
│   ├── Leader dot (guided mode)
│   └── User stroke rendering
└── AccuracyFeedback (score + encouragement)
```

### Canvas → SVG Migration

The current implementation uses `<canvas>` for both guides and user drawing. This makes animation difficult. The overhaul will:

- **Guide paths + arrows + animation**: Rendered in SVG (overlay)
- **User drawing**: Remains on `<canvas>` (better for freehand input)
- **Layering**: SVG sits on top of canvas with `pointer-events: none`

### State Machine

```
WATCH → GUIDED → FREE_TRACE → (next letter or GUIDED if low accuracy)
```

Each letter cycles through these phases. The game tracks which phase each letter is in.

## Files Changed

| File | Change |
|------|--------|
| `apps/frontend/src/data/strokeData.ts` | Rewrite all strokes, add `cue` field |
| `apps/frontend/src/components/games/writing/NameWritingGame.tsx` | Major rewrite: animation, guided mode, progressive levels, voice cues, arrows |

## Acceptance Criteria

1. All letter strokes follow HWT formation order and direction
2. Animated demo plays before first trace of each letter
3. Directional arrows visible on guide paths
4. Voice cues speak during demo and tracing
5. Three difficulty levels work correctly with auto-advancement
6. Accuracy scoring still functions on Free Trace level
7. Touch input works on iPad (primary device)
8. Deployed to Cloud Run and accessible

## Out of Scope

- Teaching letter sounds during writing (handled by LetterSoundsGame)
- Cursive or D'Nealian letter forms
- Left-handed mode
- Custom name input (hardcoded to Adalyn Mulay)
