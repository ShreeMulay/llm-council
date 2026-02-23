export interface RhymePair {
  words: [string, string];
  rhymes: boolean;
  emoji1: string;
  emoji2: string;
}

export const RHYME_PAIRS: RhymePair[] = [
  // Rhyming pairs
  { words: ['cat', 'hat'], rhymes: true, emoji1: '🐱', emoji2: '🎩' },
  { words: ['dog', 'log'], rhymes: true, emoji1: '🐕', emoji2: '🪵' },
  { words: ['sun', 'fun'], rhymes: true, emoji1: '☀️', emoji2: '🎢' },
  { words: ['bee', 'tree'], rhymes: true, emoji1: '🐝', emoji2: '🌳' },
  { words: ['fish', 'dish'], rhymes: true, emoji1: '🐟', emoji2: '🍽️' },
  { words: ['cake', 'lake'], rhymes: true, emoji1: '🎂', emoji2: '🏞️' },
  { words: ['star', 'car'], rhymes: true, emoji1: '⭐', emoji2: '🚗' },
  { words: ['moon', 'spoon'], rhymes: true, emoji1: '🌙', emoji2: '🥄' },
  { words: ['bear', 'chair'], rhymes: true, emoji1: '🐻', emoji2: '🪑' },
  { words: ['bed', 'red'], rhymes: true, emoji1: '🛏️', emoji2: '🔴' },
  { words: ['pig', 'big'], rhymes: true, emoji1: '🐷', emoji2: '🏔️' },
  { words: ['ring', 'king'], rhymes: true, emoji1: '💍', emoji2: '👑' },
  { words: ['boat', 'goat'], rhymes: true, emoji1: '⛵', emoji2: '🐐' },
  { words: ['rock', 'sock'], rhymes: true, emoji1: '🪨', emoji2: '🧦' },
  { words: ['bug', 'hug'], rhymes: true, emoji1: '🐛', emoji2: '🤗' },
  { words: ['ball', 'tall'], rhymes: true, emoji1: '⚽', emoji2: '🦒' },
  { words: ['mice', 'rice'], rhymes: true, emoji1: '🐭', emoji2: '🍚' },
  { words: ['fox', 'box'], rhymes: true, emoji1: '🦊', emoji2: '📦' },
  { words: ['rain', 'train'], rhymes: true, emoji1: '🌧️', emoji2: '🚂' },
  { words: ['hen', 'pen'], rhymes: true, emoji1: '🐔', emoji2: '🖊️' },

  // Non-rhyming pairs
  { words: ['cat', 'dog'], rhymes: false, emoji1: '🐱', emoji2: '🐕' },
  { words: ['sun', 'moon'], rhymes: false, emoji1: '☀️', emoji2: '🌙' },
  { words: ['fish', 'bird'], rhymes: false, emoji1: '🐟', emoji2: '🐦' },
  { words: ['tree', 'rock'], rhymes: false, emoji1: '🌳', emoji2: '🪨' },
  { words: ['cake', 'ball'], rhymes: false, emoji1: '🎂', emoji2: '⚽' },
  { words: ['bear', 'frog'], rhymes: false, emoji1: '🐻', emoji2: '🐸' },
  { words: ['pig', 'cow'], rhymes: false, emoji1: '🐷', emoji2: '🐄' },
  { words: ['boat', 'duck'], rhymes: false, emoji1: '⛵', emoji2: '🦆' },
  { words: ['ring', 'hat'], rhymes: false, emoji1: '💍', emoji2: '🎩' },
  { words: ['star', 'bed'], rhymes: false, emoji1: '⭐', emoji2: '🛏️' },
];
