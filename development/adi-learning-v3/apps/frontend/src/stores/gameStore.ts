import { create } from 'zustand';

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

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  showCelebration: false,

  addCorrect: () =>
    set((s) => ({
      score: s.score + 1,
      streak: s.streak + 1,
      bestStreak: Math.max(s.bestStreak, s.streak + 1),
    })),

  addWrong: () => set({ streak: 0 }),

  resetGame: () => set({ score: 0, streak: 0, bestStreak: 0, showCelebration: false }),

  triggerCelebration: () => set({ showCelebration: true }),

  dismissCelebration: () => set({ showCelebration: false }),
}));
