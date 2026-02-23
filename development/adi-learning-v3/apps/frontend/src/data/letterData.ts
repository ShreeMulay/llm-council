/** Target letters for this quarter with sounds and example words */
export interface LetterInfo {
  upper: string;
  lower: string;
  sound: string;       // Phonetic sound
  word: string;        // Example word
  emoji: string;       // Example word emoji
  soundText: string;   // Full TTS text for teaching
}

export const TARGET_LETTERS: LetterInfo[] = [
  { upper: 'J', lower: 'j', sound: 'juh', word: 'Jump', emoji: '🦘', soundText: 'J says juh, like Jump!' },
  { upper: 'K', lower: 'k', sound: 'kuh', word: 'Kite', emoji: '🪁', soundText: 'K says kuh, like Kite!' },
  { upper: 'R', lower: 'r', sound: 'rr', word: 'Rainbow', emoji: '🌈', soundText: 'R says rr, like Rainbow!' },
  { upper: 'P', lower: 'p', sound: 'puh', word: 'Pizza', emoji: '🍕', soundText: 'P says puh, like Pizza!' },
  { upper: 'B', lower: 'b', sound: 'buh', word: 'Ball', emoji: '⚽', soundText: 'B says buh, like Ball!' },
  { upper: 'D', lower: 'd', sound: 'duh', word: 'Dog', emoji: '🐕', soundText: 'D says duh, like Dog!' },
  { upper: 'Q', lower: 'q', sound: 'kwuh', word: 'Queen', emoji: '👑', soundText: 'Q says kwuh, like Queen!' },
  { upper: 'U', lower: 'u', sound: 'uh', word: 'Umbrella', emoji: '☂️', soundText: 'U says uh, like Umbrella!' },
];

/** All letters needed for name "Adalyn Mulay" + target set */
export const ALL_LETTERS = ['A', 'B', 'D', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'U', 'Y'];
