/**
 * Stroke data for letter tracing — Handwriting Without Tears (HWT) pedagogy.
 *
 * Coordinate system: 0–100 normalized grid.
 * All strokes start from the top (non-negotiable HWT principle).
 * Lowercase "Magic C" letters (a, d, g, o, q) start with a counterclockwise arc.
 * Each stroke carries a verbal `cue` matching HWT classroom language.
 */

export interface Stroke {
  /** SVG path data in 0–100 coordinate space */
  path: string;
  /** Visual start-dot position */
  startPoint: { x: number; y: number };
  /** Visual end-dot position */
  endPoint: { x: number; y: number };
  /** HWT verbal cue spoken during demo / tracing */
  cue: string;
}

export interface CharacterData {
  char: string;
  width: number;
  height: number;
  strokes: Stroke[];
}

// ─── Uppercase Letters ──────────────────────────────────

const UPPER_A: CharacterData = {
  char: 'A', width: 100, height: 100,
  strokes: [
    // Stroke 1: Big line down-left
    {
      path: 'M 50 10 L 20 90',
      startPoint: { x: 50, y: 10 },
      endPoint: { x: 20, y: 90 },
      cue: 'Big line down!',
    },
    // Stroke 2: Frog jump back to top, big line down-right
    {
      path: 'M 50 10 L 80 90',
      startPoint: { x: 50, y: 10 },
      endPoint: { x: 80, y: 90 },
      cue: 'Frog jump! Big line down!',
    },
    // Stroke 3: Little line across (crossbar)
    {
      path: 'M 32 55 L 68 55',
      startPoint: { x: 32, y: 55 },
      endPoint: { x: 68, y: 55 },
      cue: 'Little line across!',
    },
  ],
};

const UPPER_M: CharacterData = {
  char: 'M', width: 100, height: 100,
  strokes: [
    // Stroke 1: Big line down (left vertical)
    {
      path: 'M 15 10 L 15 90',
      startPoint: { x: 15, y: 10 },
      endPoint: { x: 15, y: 90 },
      cue: 'Big line down!',
    },
    // Stroke 2: Frog jump, slide down to middle
    {
      path: 'M 15 10 L 50 60',
      startPoint: { x: 15, y: 10 },
      endPoint: { x: 50, y: 60 },
      cue: 'Frog jump! Slide down!',
    },
    // Stroke 3: Climb back up
    {
      path: 'M 50 60 L 85 10',
      startPoint: { x: 50, y: 60 },
      endPoint: { x: 85, y: 10 },
      cue: 'Climb back up!',
    },
    // Stroke 4: Big line down (right vertical)
    {
      path: 'M 85 10 L 85 90',
      startPoint: { x: 85, y: 10 },
      endPoint: { x: 85, y: 90 },
      cue: 'Big line down!',
    },
  ],
};

// Additional uppercase letters used in the app (for Letter Sounds game, etc.)

const UPPER_B: CharacterData = {
  char: 'B', width: 100, height: 100,
  strokes: [
    {
      path: 'M 25 10 L 25 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 90 },
      cue: 'Big line down!',
    },
    {
      path: 'M 25 10 C 65 10 65 50 25 50',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 50 },
      cue: 'Frog jump! Bump around!',
    },
    {
      path: 'M 25 50 C 70 50 70 90 25 90',
      startPoint: { x: 25, y: 50 },
      endPoint: { x: 25, y: 90 },
      cue: 'Bump around again!',
    },
  ],
};

const UPPER_D: CharacterData = {
  char: 'D', width: 100, height: 100,
  strokes: [
    {
      path: 'M 25 10 L 25 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 90 },
      cue: 'Big line down!',
    },
    {
      path: 'M 25 10 C 85 10 85 90 25 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 90 },
      cue: 'Frog jump! Big curve!',
    },
  ],
};

const UPPER_J: CharacterData = {
  char: 'J', width: 100, height: 100,
  strokes: [
    {
      path: 'M 65 10 L 65 70 C 65 90 35 90 25 75',
      startPoint: { x: 65, y: 10 },
      endPoint: { x: 25, y: 75 },
      cue: 'Big line down, hook!',
    },
  ],
};

const UPPER_K: CharacterData = {
  char: 'K', width: 100, height: 100,
  strokes: [
    {
      path: 'M 25 10 L 25 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 90 },
      cue: 'Big line down!',
    },
    {
      path: 'M 75 10 L 25 50',
      startPoint: { x: 75, y: 10 },
      endPoint: { x: 25, y: 50 },
      cue: 'Kick in!',
    },
    {
      path: 'M 25 50 L 75 90',
      startPoint: { x: 25, y: 50 },
      endPoint: { x: 75, y: 90 },
      cue: 'Kick out!',
    },
  ],
};

const UPPER_L: CharacterData = {
  char: 'L', width: 100, height: 100,
  strokes: [
    {
      path: 'M 25 10 L 25 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 90 },
      cue: 'Big line down!',
    },
    {
      path: 'M 25 90 L 75 90',
      startPoint: { x: 25, y: 90 },
      endPoint: { x: 75, y: 90 },
      cue: 'Little line across!',
    },
  ],
};

const UPPER_N: CharacterData = {
  char: 'N', width: 100, height: 100,
  strokes: [
    // Stroke 1: Big line down (left vertical, top→down)
    {
      path: 'M 25 10 L 25 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 90 },
      cue: 'Big line down!',
    },
    // Stroke 2: Frog jump, diagonal down
    {
      path: 'M 25 10 L 75 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 75, y: 90 },
      cue: 'Frog jump! Slide down!',
    },
    // Stroke 3: Up (right vertical)
    {
      path: 'M 75 90 L 75 10',
      startPoint: { x: 75, y: 90 },
      endPoint: { x: 75, y: 10 },
      cue: 'Back up!',
    },
  ],
};

const UPPER_P: CharacterData = {
  char: 'P', width: 100, height: 100,
  strokes: [
    {
      path: 'M 25 10 L 25 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 90 },
      cue: 'Big line down!',
    },
    {
      path: 'M 25 10 C 75 10 75 50 25 50',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 50 },
      cue: 'Frog jump! Bump around!',
    },
  ],
};

const UPPER_Q: CharacterData = {
  char: 'Q', width: 100, height: 100,
  strokes: [
    {
      path: 'M 50 10 C 80 10 85 40 85 50 C 85 70 70 90 50 90 C 30 90 15 70 15 50 C 15 30 30 10 50 10',
      startPoint: { x: 50, y: 10 },
      endPoint: { x: 50, y: 10 },
      cue: 'Big curve all around!',
    },
    {
      path: 'M 60 70 L 80 95',
      startPoint: { x: 60, y: 70 },
      endPoint: { x: 80, y: 95 },
      cue: 'Little tail!',
    },
  ],
};

const UPPER_R: CharacterData = {
  char: 'R', width: 100, height: 100,
  strokes: [
    {
      path: 'M 25 10 L 25 90',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 90 },
      cue: 'Big line down!',
    },
    {
      path: 'M 25 10 C 70 10 70 50 25 50',
      startPoint: { x: 25, y: 10 },
      endPoint: { x: 25, y: 50 },
      cue: 'Frog jump! Bump around!',
    },
    {
      path: 'M 25 50 L 75 90',
      startPoint: { x: 25, y: 50 },
      endPoint: { x: 75, y: 90 },
      cue: 'Kick out!',
    },
  ],
};

const UPPER_U: CharacterData = {
  char: 'U', width: 100, height: 100,
  strokes: [
    {
      path: 'M 20 10 L 20 65 C 20 90 80 90 80 65 L 80 10',
      startPoint: { x: 20, y: 10 },
      endPoint: { x: 80, y: 10 },
      cue: 'Big line down, curve, back up!',
    },
  ],
};

const UPPER_Y: CharacterData = {
  char: 'Y', width: 100, height: 100,
  strokes: [
    {
      path: 'M 15 10 L 50 50',
      startPoint: { x: 15, y: 10 },
      endPoint: { x: 50, y: 50 },
      cue: 'Slide down!',
    },
    {
      path: 'M 85 10 L 50 50',
      startPoint: { x: 85, y: 10 },
      endPoint: { x: 50, y: 50 },
      cue: 'Frog jump! Slide down!',
    },
    {
      path: 'M 50 50 L 50 90',
      startPoint: { x: 50, y: 50 },
      endPoint: { x: 50, y: 90 },
      cue: 'Big line down!',
    },
  ],
};

// ─── Lowercase Letters ──────────────────────────────────

const LOWER_A: CharacterData = {
  char: 'a', width: 100, height: 100,
  strokes: [
    // Stroke 1: Magic C — counterclockwise circle from ~2 o'clock
    // Sits in the midline zone (y 30–75)
    {
      path: 'M 65 38 C 60 28 40 25 33 35 C 25 48 28 65 38 72 C 48 78 60 75 65 65',
      startPoint: { x: 65, y: 38 },
      endPoint: { x: 65, y: 65 },
      cue: 'Magic C!',
    },
    // Stroke 2: Straight line down (the stem)
    {
      path: 'M 65 30 L 65 75',
      startPoint: { x: 65, y: 30 },
      endPoint: { x: 65, y: 75 },
      cue: 'Down!',
    },
  ],
};

const LOWER_D: CharacterData = {
  char: 'd', width: 100, height: 100,
  strokes: [
    // Stroke 1: Magic C — same circle as 'a'
    {
      path: 'M 65 38 C 60 28 40 25 33 35 C 25 48 28 65 38 72 C 48 78 60 75 65 65',
      startPoint: { x: 65, y: 38 },
      endPoint: { x: 65, y: 65 },
      cue: 'Magic C!',
    },
    // Stroke 2: Up tall, back down — from circle top, up to ascender, straight down
    {
      path: 'M 65 30 L 65 10 L 65 75',
      startPoint: { x: 65, y: 30 },
      endPoint: { x: 65, y: 75 },
      cue: 'Up tall, back down!',
    },
  ],
};

const LOWER_L: CharacterData = {
  char: 'l', width: 100, height: 100,
  strokes: [
    // Stroke 1: Big line down
    {
      path: 'M 50 10 L 50 75',
      startPoint: { x: 50, y: 10 },
      endPoint: { x: 50, y: 75 },
      cue: 'Big line down!',
    },
  ],
};

const LOWER_Y: CharacterData = {
  char: 'y', width: 100, height: 100,
  strokes: [
    // Stroke 1: Little line down (short diagonal)
    {
      path: 'M 25 30 L 50 60',
      startPoint: { x: 25, y: 30 },
      endPoint: { x: 50, y: 60 },
      cue: 'Little line down!',
    },
    // Stroke 2: Frog jump, long line down below the line
    {
      path: 'M 75 30 L 40 88',
      startPoint: { x: 75, y: 30 },
      endPoint: { x: 40, y: 88 },
      cue: 'Frog jump! Long line down!',
    },
  ],
};

const LOWER_N: CharacterData = {
  char: 'n', width: 100, height: 100,
  strokes: [
    // Stroke 1: Down (vertical, top to baseline)
    {
      path: 'M 30 30 L 30 75',
      startPoint: { x: 30, y: 30 },
      endPoint: { x: 30, y: 75 },
      cue: 'Down!',
    },
    // Stroke 2: Back up, over the hump, down
    {
      path: 'M 30 75 L 30 35 C 30 22 70 22 70 40 L 70 75',
      startPoint: { x: 30, y: 75 },
      endPoint: { x: 70, y: 75 },
      cue: 'Back up, over, and down!',
    },
  ],
};

const LOWER_U: CharacterData = {
  char: 'u', width: 100, height: 100,
  strokes: [
    // Stroke 1: Down, curve, up
    {
      path: 'M 30 30 L 30 58 C 30 75 70 75 70 58',
      startPoint: { x: 30, y: 30 },
      endPoint: { x: 70, y: 58 },
      cue: 'Down, curve, up!',
    },
    // Stroke 2: Down
    {
      path: 'M 70 30 L 70 75',
      startPoint: { x: 70, y: 30 },
      endPoint: { x: 70, y: 75 },
      cue: 'Down!',
    },
  ],
};

// Additional lowercase letters for Letter Sounds game

const LOWER_B: CharacterData = {
  char: 'b', width: 100, height: 100,
  strokes: [
    {
      path: 'M 30 10 L 30 75',
      startPoint: { x: 30, y: 10 },
      endPoint: { x: 30, y: 75 },
      cue: 'Big line down!',
    },
    {
      path: 'M 30 45 C 30 25 70 25 70 50 C 70 75 30 75 30 55',
      startPoint: { x: 30, y: 45 },
      endPoint: { x: 30, y: 55 },
      cue: 'Back up, bump around!',
    },
  ],
};

const LOWER_J: CharacterData = {
  char: 'j', width: 100, height: 100,
  strokes: [
    {
      path: 'M 55 30 L 55 75 C 55 92 35 92 28 80',
      startPoint: { x: 55, y: 30 },
      endPoint: { x: 28, y: 80 },
      cue: 'Down, hook!',
    },
  ],
};

const LOWER_K: CharacterData = {
  char: 'k', width: 100, height: 100,
  strokes: [
    {
      path: 'M 30 10 L 30 75',
      startPoint: { x: 30, y: 10 },
      endPoint: { x: 30, y: 75 },
      cue: 'Big line down!',
    },
    {
      path: 'M 65 30 L 30 52',
      startPoint: { x: 65, y: 30 },
      endPoint: { x: 30, y: 52 },
      cue: 'Kick in!',
    },
    {
      path: 'M 30 52 L 65 75',
      startPoint: { x: 30, y: 52 },
      endPoint: { x: 65, y: 75 },
      cue: 'Kick out!',
    },
  ],
};

const LOWER_P: CharacterData = {
  char: 'p', width: 100, height: 100,
  strokes: [
    {
      path: 'M 30 25 L 30 92',
      startPoint: { x: 30, y: 25 },
      endPoint: { x: 30, y: 92 },
      cue: 'Big line down!',
    },
    {
      path: 'M 30 35 C 30 18 70 18 70 42 C 70 65 30 65 30 48',
      startPoint: { x: 30, y: 35 },
      endPoint: { x: 30, y: 48 },
      cue: 'Back up, bump around!',
    },
  ],
};

const LOWER_Q: CharacterData = {
  char: 'q', width: 100, height: 100,
  strokes: [
    // Magic C
    {
      path: 'M 65 38 C 60 28 40 25 33 35 C 25 48 28 65 38 72 C 48 78 60 75 65 65',
      startPoint: { x: 65, y: 38 },
      endPoint: { x: 65, y: 65 },
      cue: 'Magic C!',
    },
    // Down below the line
    {
      path: 'M 65 30 L 65 92',
      startPoint: { x: 65, y: 30 },
      endPoint: { x: 65, y: 92 },
      cue: 'Down, down below!',
    },
  ],
};

const LOWER_R: CharacterData = {
  char: 'r', width: 100, height: 100,
  strokes: [
    {
      path: 'M 35 30 L 35 75',
      startPoint: { x: 35, y: 30 },
      endPoint: { x: 35, y: 75 },
      cue: 'Down!',
    },
    {
      path: 'M 35 75 L 35 42 C 45 28 62 28 70 38',
      startPoint: { x: 35, y: 75 },
      endPoint: { x: 70, y: 38 },
      cue: 'Back up, little curve!',
    },
  ],
};

// ─── Export Map ──────────────────────────────────────────

export const LETTER_DATA: Record<string, CharacterData> = {
  // Uppercase
  A: UPPER_A,
  B: UPPER_B,
  D: UPPER_D,
  J: UPPER_J,
  K: UPPER_K,
  L: UPPER_L,
  M: UPPER_M,
  N: UPPER_N,
  P: UPPER_P,
  Q: UPPER_Q,
  R: UPPER_R,
  U: UPPER_U,
  Y: UPPER_Y,
  // Lowercase
  a: LOWER_A,
  b: LOWER_B,
  d: LOWER_D,
  j: LOWER_J,
  k: LOWER_K,
  l: LOWER_L,
  n: LOWER_N,
  p: LOWER_P,
  q: LOWER_Q,
  r: LOWER_R,
  u: LOWER_U,
  y: LOWER_Y,
};

/** Get stroke data for a name string */
export function getNameStrokes(name: string): CharacterData[] {
  return name
    .split('')
    .filter((c) => c !== ' ')
    .map((c) => LETTER_DATA[c])
    .filter(Boolean);
}

/** Colors for stroke differentiation (index-based) */
export const STROKE_COLORS = [
  '#a855f7', // purple (stroke 1)
  '#3b82f6', // blue (stroke 2)
  '#22c55e', // green (stroke 3)
  '#f59e0b', // amber (stroke 4)
  '#ef4444', // red (stroke 5, rare)
];
