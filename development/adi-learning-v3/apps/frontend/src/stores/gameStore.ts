import { create } from 'zustand';
import { useBadgeStore } from './badgeStore';

interface GameState {
  score: number;
  streak: number;
  bestStreak: number;
  showCelebration: boolean;
  addCorrect: () => void;
  addWrong: () => void;
  resetGame: () => void;
  triggerCelebration: () => void;
  dismissCelebration: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  showCelebration: false,

  addCorrect: () => {
    const s = get();
    const newStreak = s.streak + 1;
    const newBest = Math.max(s.bestStreak, newStreak);
    set({
      score: s.score + 1,
      streak: newStreak,
      bestStreak: newBest,
    });
    // Update badge stats for streaks and total correct
    useBadgeStore.getState().checkAndAward({
      totalCorrect: 1,
      currentStreak: newStreak,
      bestStreak: newBest,
    });
  },

  addWrong: () => set({ streak: 0 }),

  resetGame: () => set({ score: 0, streak: 0, bestStreak: 0, showCelebration: false }),

  triggerCelebration: () => set({ showCelebration: true }),

  dismissCelebration: () => set({ showCelebration: false }),
}));
