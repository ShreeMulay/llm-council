import * as Tone from 'tone';
import { speak as apiSpeak } from './api';
import { useSettingsStore } from '@/stores/settingsStore';

class AudioService {
  private sparkleSynth: Tone.PolySynth | null = null;
  private drumSynth: Tone.MembraneSynth | null = null;
  private isInitialized = false;
  private currentAudio: HTMLAudioElement | null = null;

  async init() {
    if (this.isInitialized) return;
    await Tone.start();

    this.sparkleSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 1 },
    }).toDestination();
    this.sparkleSynth.volume.value = -10;

    this.drumSynth = new Tone.MembraneSynth().toDestination();
    this.drumSynth.volume.value = -5;

    this.isInitialized = true;
  }

  private get isMuted(): boolean {
    return useSettingsStore.getState().volume === 0;
  }

  // ─── SFX ──────────────────────────────────────────

  playSuccess() {
    if (!this.isInitialized || this.isMuted) return;
    const now = Tone.now();
    this.sparkleSynth?.triggerAttackRelease('C5', '8n', now);
    this.sparkleSynth?.triggerAttackRelease('E5', '8n', now + 0.1);
    this.sparkleSynth?.triggerAttackRelease('G5', '8n', now + 0.2);
    this.sparkleSynth?.triggerAttackRelease('C6', '4n', now + 0.3);
  }

  playSparkle() {
    if (!this.isInitialized || this.isMuted) return;
    const notes = ['C6', 'D6', 'E6', 'G6', 'A6'];
    const note = notes[Math.floor(Math.random() * notes.length)];
    this.sparkleSynth?.triggerAttackRelease(note, '16n');
  }

  playError() {
    if (!this.isInitialized || this.isMuted) return;
    this.drumSynth?.triggerAttackRelease('C2', '8n');
  }

  playClick() {
    if (!this.isInitialized || this.isMuted) return;
    this.drumSynth?.triggerAttackRelease('G3', '32n');
  }

  playCorrect() {
    if (!this.isInitialized || this.isMuted) return;
    const now = Tone.now();
    this.sparkleSynth?.triggerAttackRelease('E5', '16n', now);
    this.sparkleSynth?.triggerAttackRelease('G5', '16n', now + 0.08);
  }

  playWrong() {
    if (!this.isInitialized || this.isMuted) return;
    const now = Tone.now();
    this.drumSynth?.triggerAttackRelease('E2', '8n', now);
    this.drumSynth?.triggerAttackRelease('C2', '8n', now + 0.15);
  }

  playCelebration() {
    if (!this.isInitialized || this.isMuted) return;
    const now = Tone.now();
    const melody = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'];
    melody.forEach((note, i) => {
      this.sparkleSynth?.triggerAttackRelease(note, '16n', now + i * 0.08);
    });
  }

  // ─── Voice (TTS via backend) ──────────────────────

  async speak(text: string): Promise<void> {
    if (this.isMuted) return;

    // Stop any currently playing audio
    this.stopSpeaking();

    try {
      const blobUrl = await apiSpeak(text);
      const audio = new Audio(blobUrl);
      audio.volume = useSettingsStore.getState().volume;
      this.currentAudio = audio;

      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(blobUrl);
          this.currentAudio = null;
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          this.currentAudio = null;
          // Fallback to browser TTS
          this.speakFallback(text);
          resolve();
        };
        audio.play().catch(() => {
          this.speakFallback(text);
          resolve();
        });
      });
    } catch {
      // Fallback to browser TTS if backend unavailable
      this.speakFallback(text);
    }
  }

  /** Fire-and-forget speak (don't await) */
  sayAsync(text: string): void {
    this.speak(text).catch(() => {});
  }

  stopSpeaking() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    window.speechSynthesis?.cancel();
  }

  private speakFallback(text: string) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

export const audio = new AudioService();
