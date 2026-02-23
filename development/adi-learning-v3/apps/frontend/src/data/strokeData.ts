// Normalized coordinate system (0-100) for SVG letter tracing paths
// Each stroke is an SVG path with defined start/end points

export interface Stroke {
  path: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface CharacterData {
  char: string;
  width: number;
  height: number;
  strokes: Stroke[];
}

export const LETTER_DATA: Record<string, CharacterData> = {
  // ─── Uppercase ──────────────────────────────────────

  A: {
    char: 'A', width: 100, height: 100,
    strokes: [
      { path: 'M 50 10 L 15 90', startPoint: { x: 50, y: 10 }, endPoint: { x: 15, y: 90 } },
      { path: 'M 50 10 L 85 90', startPoint: { x: 50, y: 10 }, endPoint: { x: 85, y: 90 } },
      { path: 'M 30 58 L 70 58', startPoint: { x: 30, y: 58 }, endPoint: { x: 70, y: 58 } },
    ],
  },
  B: {
    char: 'B', width: 100, height: 100,
    strokes: [
      { path: 'M 25 10 L 25 90', startPoint: { x: 25, y: 10 }, endPoint: { x: 25, y: 90 } },
      { path: 'M 25 10 C 65 10 65 50 25 50', startPoint: { x: 25, y: 10 }, endPoint: { x: 25, y: 50 } },
      { path: 'M 25 50 C 70 50 70 90 25 90', startPoint: { x: 25, y: 50 }, endPoint: { x: 25, y: 90 } },
    ],
  },
  D: {
    char: 'D', width: 100, height: 100,
    strokes: [
      { path: 'M 25 10 L 25 90', startPoint: { x: 25, y: 10 }, endPoint: { x: 25, y: 90 } },
      { path: 'M 25 10 C 85 10 85 90 25 90', startPoint: { x: 25, y: 10 }, endPoint: { x: 25, y: 90 } },
    ],
  },
  J: {
    char: 'J', width: 100, height: 100,
    strokes: [
      { path: 'M 65 10 L 65 70 C 65 90 35 90 25 75', startPoint: { x: 65, y: 10 }, endPoint: { x: 25, y: 75 } },
    ],
  },
  K: {
    char: 'K', width: 100, height: 100,
    strokes: [
      { path: 'M 25 10 L 25 90', startPoint: { x: 25, y: 10 }, endPoint: { x: 25, y: 90 } },
      { path: 'M 75 10 L 25 50', startPoint: { x: 75, y: 10 }, endPoint: { x: 25, y: 50 } },
      { path: 'M 25 50 L 75 90', startPoint: { x: 25, y: 50 }, endPoint: { x: 75, y: 90 } },
    ],
  },
  L: {
    char: 'L', width: 100, height: 100,
    strokes: [
      { path: 'M 25 10 L 25 90', startPoint: { x: 25, y: 10 }, endPoint: { x: 25, y: 90 } },
      { path: 'M 25 90 L 75 90', startPoint: { x: 25, y: 90 }, endPoint: { x: 75, y: 90 } },
    ],
  },
  M: {
    char: 'M', width: 100, height: 100,
    strokes: [
      { path: 'M 15 90 L 15 10', startPoint: { x: 15, y: 90 }, endPoint: { x: 15, y: 10 } },
      { path: 'M 15 10 L 50 55', startPoint: { x: 15, y: 10 }, endPoint: { x: 50, y: 55 } },
      { path: 'M 50 55 L 85 10', startPoint: { x: 50, y: 55 }, endPoint: { x: 85, y: 10 } },
      { path: 'M 85 10 L 85 90', startPoint: { x: 85, y: 10 }, endPoint: { x: 85, y: 90 } },
    ],
  },
  N: {
    char: 'N', width: 100, height: 100,
    strokes: [
      { path: 'M 25 90 L 25 10', startPoint: { x: 25, y: 90 }, endPoint: { x: 25, y: 10 } },
      { path: 'M 25 10 L 75 90', startPoint: { x: 25, y: 10 }, endPoint: { x: 75, y: 90 } },
      { path: 'M 75 90 L 75 10', startPoint: { x: 75, y: 90 }, endPoint: { x: 75, y: 10 } },
    ],
  },
  P: {
    char: 'P', width: 100, height: 100,
    strokes: [
      { path: 'M 25 90 L 25 10', startPoint: { x: 25, y: 90 }, endPoint: { x: 25, y: 10 } },
      { path: 'M 25 10 C 75 10 75 50 25 50', startPoint: { x: 25, y: 10 }, endPoint: { x: 25, y: 50 } },
    ],
  },
  Q: {
    char: 'Q', width: 100, height: 100,
    strokes: [
      { path: 'M 50 10 C 80 10 85 40 85 50 C 85 70 70 90 50 90 C 30 90 15 70 15 50 C 15 30 30 10 50 10', startPoint: { x: 50, y: 10 }, endPoint: { x: 50, y: 10 } },
      { path: 'M 60 70 L 80 95', startPoint: { x: 60, y: 70 }, endPoint: { x: 80, y: 95 } },
    ],
  },
  R: {
    char: 'R', width: 100, height: 100,
    strokes: [
      { path: 'M 25 90 L 25 10', startPoint: { x: 25, y: 90 }, endPoint: { x: 25, y: 10 } },
      { path: 'M 25 10 C 70 10 70 50 25 50', startPoint: { x: 25, y: 10 }, endPoint: { x: 25, y: 50 } },
      { path: 'M 25 50 L 75 90', startPoint: { x: 25, y: 50 }, endPoint: { x: 75, y: 90 } },
    ],
  },
  U: {
    char: 'U', width: 100, height: 100,
    strokes: [
      { path: 'M 20 10 L 20 65 C 20 90 80 90 80 65 L 80 10', startPoint: { x: 20, y: 10 }, endPoint: { x: 80, y: 10 } },
    ],
  },
  Y: {
    char: 'Y', width: 100, height: 100,
    strokes: [
      { path: 'M 15 10 L 50 50', startPoint: { x: 15, y: 10 }, endPoint: { x: 50, y: 50 } },
      { path: 'M 85 10 L 50 50', startPoint: { x: 85, y: 10 }, endPoint: { x: 50, y: 50 } },
      { path: 'M 50 50 L 50 90', startPoint: { x: 50, y: 50 }, endPoint: { x: 50, y: 90 } },
    ],
  },

  // ─── Lowercase ──────────────────────────────────────

  a: {
    char: 'a', width: 100, height: 100,
    strokes: [
      { path: 'M 70 35 C 70 20 30 20 30 45 C 30 70 70 70 70 45', startPoint: { x: 70, y: 35 }, endPoint: { x: 70, y: 45 } },
      { path: 'M 70 30 L 70 75', startPoint: { x: 70, y: 30 }, endPoint: { x: 70, y: 75 } },
    ],
  },
  b: {
    char: 'b', width: 100, height: 100,
    strokes: [
      { path: 'M 30 10 L 30 75', startPoint: { x: 30, y: 10 }, endPoint: { x: 30, y: 75 } },
      { path: 'M 30 45 C 30 25 70 25 70 50 C 70 75 30 75 30 55', startPoint: { x: 30, y: 45 }, endPoint: { x: 30, y: 55 } },
    ],
  },
  d: {
    char: 'd', width: 100, height: 100,
    strokes: [
      { path: 'M 70 10 L 70 75', startPoint: { x: 70, y: 10 }, endPoint: { x: 70, y: 75 } },
      { path: 'M 70 45 C 70 25 30 25 30 50 C 30 75 70 75 70 55', startPoint: { x: 70, y: 45 }, endPoint: { x: 70, y: 55 } },
    ],
  },
  j: {
    char: 'j', width: 100, height: 100,
    strokes: [
      { path: 'M 55 30 L 55 75 C 55 90 35 90 30 80', startPoint: { x: 55, y: 30 }, endPoint: { x: 30, y: 80 } },
    ],
  },
  k: {
    char: 'k', width: 100, height: 100,
    strokes: [
      { path: 'M 30 10 L 30 75', startPoint: { x: 30, y: 10 }, endPoint: { x: 30, y: 75 } },
      { path: 'M 65 30 L 30 52', startPoint: { x: 65, y: 30 }, endPoint: { x: 30, y: 52 } },
      { path: 'M 30 52 L 65 75', startPoint: { x: 30, y: 52 }, endPoint: { x: 65, y: 75 } },
    ],
  },
  l: {
    char: 'l', width: 100, height: 100,
    strokes: [
      { path: 'M 50 10 L 50 75', startPoint: { x: 50, y: 10 }, endPoint: { x: 50, y: 75 } },
    ],
  },
  n: {
    char: 'n', width: 100, height: 100,
    strokes: [
      { path: 'M 30 75 L 30 30', startPoint: { x: 30, y: 75 }, endPoint: { x: 30, y: 30 } },
      { path: 'M 30 35 C 30 20 70 20 70 40 L 70 75', startPoint: { x: 30, y: 35 }, endPoint: { x: 70, y: 75 } },
    ],
  },
  p: {
    char: 'p', width: 100, height: 100,
    strokes: [
      { path: 'M 30 20 L 30 90', startPoint: { x: 30, y: 20 }, endPoint: { x: 30, y: 90 } },
      { path: 'M 30 35 C 30 15 70 15 70 40 C 70 65 30 65 30 45', startPoint: { x: 30, y: 35 }, endPoint: { x: 30, y: 45 } },
    ],
  },
  q: {
    char: 'q', width: 100, height: 100,
    strokes: [
      { path: 'M 70 35 C 70 15 30 15 30 40 C 30 65 70 65 70 45', startPoint: { x: 70, y: 35 }, endPoint: { x: 70, y: 45 } },
      { path: 'M 70 20 L 70 90', startPoint: { x: 70, y: 20 }, endPoint: { x: 70, y: 90 } },
    ],
  },
  r: {
    char: 'r', width: 100, height: 100,
    strokes: [
      { path: 'M 35 75 L 35 30', startPoint: { x: 35, y: 75 }, endPoint: { x: 35, y: 30 } },
      { path: 'M 35 40 C 45 25 65 25 70 35', startPoint: { x: 35, y: 40 }, endPoint: { x: 70, y: 35 } },
    ],
  },
  u: {
    char: 'u', width: 100, height: 100,
    strokes: [
      { path: 'M 30 30 L 30 55 C 30 75 70 75 70 55 L 70 30', startPoint: { x: 30, y: 30 }, endPoint: { x: 70, y: 30 } },
    ],
  },
  y: {
    char: 'y', width: 100, height: 100,
    strokes: [
      { path: 'M 25 30 L 50 60', startPoint: { x: 25, y: 30 }, endPoint: { x: 50, y: 60 } },
      { path: 'M 75 30 L 40 85', startPoint: { x: 75, y: 30 }, endPoint: { x: 40, y: 85 } },
    ],
  },
};

/** Get stroke data for a name string */
export function getNameStrokes(name: string): CharacterData[] {
  return name.split('').filter((c) => c !== ' ').map((c) => LETTER_DATA[c]).filter(Boolean);
}
