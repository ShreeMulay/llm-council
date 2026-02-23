import { create } from 'zustand';
import type { SkillId } from '@adi/shared';
import { getProgressSummary } from '@/services/api';

interface SkillSummary {
  mastered?: number;
  target?: number;
  mastery: number;
}

interface ProgressState {
  skills: Record<string, SkillSummary>;
  loading: boolean;
  fetchProgress: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set) => ({
  skills: {},
  loading: false,
  fetchProgress: async () => {
    set({ loading: true });
    try {
      const res = await getProgressSummary();
      if (res.ok && res.data) {
        set({ skills: res.data });
      }
    } catch (err) {
      console.warn('[progress] Failed to fetch:', err);
    } finally {
      set({ loading: false });
    }
  },
}));
