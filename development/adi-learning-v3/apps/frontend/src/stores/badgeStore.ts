import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: 'counting' | 'writing' | 'rhymes' | 'stories' | 'letters' | 'math' | 'general';
  condition: (stats: BadgeStats) => boolean;
}

export interface BadgeStats {
  totalCorrect: number;
  currentStreak: number;
  bestStreak: number;
  gamesPlayed: number;
  countingHighest: number;
  lettersLearned: number;
  rhymesCorrect: number;
  storiesCompleted: number;
  writingAccuracy: number;
  mathCorrect: number;
}

interface BadgeState {
  unlockedBadges: Record<string, number>; // badge id -> unlock timestamp
  newBadges: string[]; // recently unlocked, not yet seen
  stats: BadgeStats;
  showTrophyCase: boolean;
  checkAndAward: (stats: Partial<BadgeStats>) => string[]; // returns newly awarded badge ids
  dismissNewBadges: () => void;
  toggleTrophyCase: () => void;
}

const BADGES: Badge[] = [
  // General
  { id: 'first-steps', title: 'First Steps', description: 'Complete your first activity', emoji: '👣', category: 'general', condition: (s) => s.totalCorrect >= 1 },
  { id: 'high-five', title: 'High Five!', description: 'Get 5 correct answers', emoji: '🖐️', category: 'general', condition: (s) => s.totalCorrect >= 5 },
  { id: 'super-ten', title: 'Super Ten', description: 'Get 10 correct answers', emoji: '🔟', category: 'general', condition: (s) => s.totalCorrect >= 10 },
  { id: 'fifty-star', title: 'Fifty Star', description: 'Get 50 correct answers', emoji: '💫', category: 'general', condition: (s) => s.totalCorrect >= 50 },
  { id: 'hundred-hero', title: 'Hundred Hero', description: 'Get 100 correct answers', emoji: '💯', category: 'general', condition: (s) => s.totalCorrect >= 100 },

  // Streaks
  { id: 'on-fire', title: 'On Fire!', description: 'Get a 3 streak', emoji: '🔥', category: 'general', condition: (s) => s.bestStreak >= 3 },
  { id: 'unstoppable', title: 'Unstoppable', description: 'Get a 5 streak', emoji: '⚡', category: 'general', condition: (s) => s.bestStreak >= 5 },
  { id: 'legendary', title: 'Legendary', description: 'Get a 10 streak', emoji: '👑', category: 'general', condition: (s) => s.bestStreak >= 10 },

  // Counting
  { id: 'counter-10', title: 'Count to 10', description: 'Count up to 10', emoji: '🔢', category: 'counting', condition: (s) => s.countingHighest >= 10 },
  { id: 'counter-25', title: 'Quarter Way', description: 'Count up to 25', emoji: '🧮', category: 'counting', condition: (s) => s.countingHighest >= 25 },
  { id: 'counter-50', title: 'Halfway There', description: 'Count up to 50', emoji: '🎯', category: 'counting', condition: (s) => s.countingHighest >= 50 },
  { id: 'counter-75', title: 'Number Master', description: 'Count all the way to 75!', emoji: '🏆', category: 'counting', condition: (s) => s.countingHighest >= 75 },

  // Letters
  { id: 'first-letter', title: 'ABC Beginner', description: 'Learn your first letter sound', emoji: '🅰️', category: 'letters', condition: (s) => s.lettersLearned >= 1 },
  { id: 'four-letters', title: 'Letter Explorer', description: 'Learn 4 letter sounds', emoji: '📝', category: 'letters', condition: (s) => s.lettersLearned >= 4 },
  { id: 'all-letters', title: 'Letter Expert', description: 'Learn all 8 letter sounds!', emoji: '🎓', category: 'letters', condition: (s) => s.lettersLearned >= 8 },

  // Rhymes
  { id: 'rhyme-starter', title: 'Rhyme Time', description: 'Get 5 rhymes correct', emoji: '🎵', category: 'rhymes', condition: (s) => s.rhymesCorrect >= 5 },
  { id: 'rhyme-master', title: 'Rhyme Master', description: 'Get 20 rhymes correct', emoji: '🎶', category: 'rhymes', condition: (s) => s.rhymesCorrect >= 20 },

  // Stories
  { id: 'storyteller', title: 'Storyteller', description: 'Complete 3 stories', emoji: '📖', category: 'stories', condition: (s) => s.storiesCompleted >= 3 },
  { id: 'story-master', title: 'Story Master', description: 'Complete all 8 stories', emoji: '📚', category: 'stories', condition: (s) => s.storiesCompleted >= 8 },

  // Writing
  { id: 'first-trace', title: 'First Trace', description: 'Trace a letter with 70%+ accuracy', emoji: '✏️', category: 'writing', condition: (s) => s.writingAccuracy >= 70 },
  { id: 'neat-writer', title: 'Neat Writer', description: 'Trace a letter with 90%+ accuracy', emoji: '✍️', category: 'writing', condition: (s) => s.writingAccuracy >= 90 },

  // Math
  { id: 'math-starter', title: 'Math Whiz', description: 'Get 5 more/less/equal correct', emoji: '⚖️', category: 'math', condition: (s) => s.mathCorrect >= 5 },
  { id: 'math-master', title: 'Math Master', description: 'Get 20 more/less/equal correct', emoji: '🧠', category: 'math', condition: (s) => s.mathCorrect >= 20 },
];

export { BADGES };

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      unlockedBadges: {},
      newBadges: [],
      stats: {
        totalCorrect: 0,
        currentStreak: 0,
        bestStreak: 0,
        gamesPlayed: 0,
        countingHighest: 0,
        lettersLearned: 0,
        rhymesCorrect: 0,
        storiesCompleted: 0,
        writingAccuracy: 0,
        mathCorrect: 0,
      },
      showTrophyCase: false,

      checkAndAward: (partial) => {
        const state = get();
        // Merge partial stats
        const newStats = { ...state.stats };
        for (const [key, val] of Object.entries(partial)) {
          const k = key as keyof BadgeStats;
          if (typeof val === 'number') {
            // For most stats, take the max (don't go backwards)
            newStats[k] = Math.max(newStats[k], val);
          }
        }
        // For cumulative stats, add instead of max
        if (partial.totalCorrect !== undefined && partial.totalCorrect > 0) {
          newStats.totalCorrect = state.stats.totalCorrect + partial.totalCorrect;
        }
        if (partial.rhymesCorrect !== undefined && partial.rhymesCorrect > 0) {
          newStats.rhymesCorrect = state.stats.rhymesCorrect + partial.rhymesCorrect;
        }
        if (partial.mathCorrect !== undefined && partial.mathCorrect > 0) {
          newStats.mathCorrect = state.stats.mathCorrect + partial.mathCorrect;
        }
        if (partial.storiesCompleted !== undefined && partial.storiesCompleted > 0) {
          newStats.storiesCompleted = state.stats.storiesCompleted + partial.storiesCompleted;
        }
        if (partial.gamesPlayed !== undefined && partial.gamesPlayed > 0) {
          newStats.gamesPlayed = state.stats.gamesPlayed + partial.gamesPlayed;
        }

        // Check all badges
        const newlyAwarded: string[] = [];
        const now = Date.now();
        const unlocked = { ...state.unlockedBadges };

        for (const badge of BADGES) {
          if (!unlocked[badge.id] && badge.condition(newStats)) {
            unlocked[badge.id] = now;
            newlyAwarded.push(badge.id);
          }
        }

        set({
          stats: newStats,
          unlockedBadges: unlocked,
          newBadges: [...state.newBadges, ...newlyAwarded],
        });

        return newlyAwarded;
      },

      dismissNewBadges: () => set({ newBadges: [] }),

      toggleTrophyCase: () => set((s) => ({ showTrophyCase: !s.showTrophyCase })),
    }),
    { name: 'adi-badges' },
  ),
);
