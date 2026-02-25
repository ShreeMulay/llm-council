import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TTSEngine } from '@adi/shared';

interface SettingsState {
  ttsEngine: TTSEngine;
  selectedVoice: string;
  volume: number;
  backgroundMusic: boolean;
  bgMusicVolume: number;
  showSettings: boolean;
  setTTSEngine: (engine: TTSEngine) => void;
  setSelectedVoice: (voice: string) => void;
  setVolume: (volume: number) => void;
  setBackgroundMusic: (enabled: boolean) => void;
  setBgMusicVolume: (volume: number) => void;
  toggleSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ttsEngine: 'chatterbox',
      selectedVoice: '',
      volume: 0.8,
      backgroundMusic: true,
      bgMusicVolume: 0.3,
      showSettings: false,
      setTTSEngine: (ttsEngine) => set({ ttsEngine, selectedVoice: '' }),
      setSelectedVoice: (selectedVoice) => set({ selectedVoice }),
      setVolume: (volume) => set({ volume }),
      setBackgroundMusic: (backgroundMusic) => set({ backgroundMusic }),
      setBgMusicVolume: (bgMusicVolume) => set({ bgMusicVolume }),
      toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
    }),
    { name: 'adi-settings' },
  ),
);
