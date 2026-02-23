import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TTSEngine } from '@adi/shared';

interface SettingsState {
  ttsEngine: TTSEngine;
  volume: number;
  showSettings: boolean;
  setTTSEngine: (engine: TTSEngine) => void;
  setVolume: (volume: number) => void;
  toggleSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ttsEngine: 'elevenlabs',
      volume: 0.8,
      showSettings: false,
      setTTSEngine: (ttsEngine) => set({ ttsEngine }),
      setVolume: (volume) => set({ volume }),
      toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
    }),
    { name: 'adi-settings' },
  ),
);
