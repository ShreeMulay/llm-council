import * as Tone from 'tone';
import { speak as apiSpeak } from './api';
import { useSettingsStore } from '@/stores/settingsStore';

// ─── Pre-generated audio lookup ────────────────────────
// Maps known text patterns to static file IDs in /audio/{engine}/{id}.mp3

const PREGEN_UI: Record<string, string> = {
  "Welcome to Adi's Learning Adventure!": 'ui-welcome',
  'Great job, Adi!': 'ui-great-job',
  'Oops! Try again!': 'ui-try-again',
  'Amazing! You did it!': 'ui-amazing',
  'Keep going! You are doing great!': 'ui-keep-going',
  "Let's write your first name! Start with the letter A.": 'ui-first-name',
  "Now let's write your last name!": 'ui-last-name',
  'Wonderful! You wrote your whole name: Adalyn Mulay!': 'ui-full-name',
  'Yes! They rhyme!': 'ui-rhyme-yes',
  "No, they don't rhyme.": 'ui-rhyme-no',
  'Which group has more?': 'ui-more',
  'Which group has less?': 'ui-less',
  'Are they the same?': 'ui-equal',
  'Tap each one to count!': 'ui-count-tap',
  'Put the cards in the right order!': 'ui-story-order',
};

// Rhyme words that have pre-generated clips
const PREGEN_WORDS = new Set([
  'cat', 'hat', 'dog', 'log', 'sun', 'fun', 'bee', 'tree',
  'fish', 'dish', 'cake', 'lake', 'star', 'car', 'moon', 'spoon',
  'bear', 'chair', 'bed', 'red', 'pig', 'big', 'ring', 'king',
  'boat', 'goat', 'rock', 'sock', 'bug', 'hug', 'ball', 'tall',
  'mice', 'rice', 'fox', 'box', 'rain', 'train', 'hen', 'pen',
  'bird', 'frog', 'cow', 'duck',
]);

// Letter sound patterns: "J says juh, like Jump!" -> letter-J-sound
const LETTER_SOUND_RE = /^([A-Z]) says \w+, like \w+!$/;
const LETTER_NAME_RE = /^This is the letter ([A-Z]).$/;

// Number words (1-75)
const NUMBER_WORDS: Record<string, number> = {};
{
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy'];
  for (let n = 1; n <= 75; n++) {
    let word: string;
    if (n < 20) {
      word = ones[n];
    } else {
      const t = Math.floor(n / 10);
      const o = n % 10;
      word = tens[t] + (o ? '-' + ones[o] : '');
    }
    NUMBER_WORDS[word] = n;
  }
}

// Default voice IDs for pre-generated audio (must match what was used in generate-audio.ts)
const DEFAULT_VOICES: Record<string, string> = {
  chatterbox: 'fb2d2858',     // Lucy
  elevenlabs: '21m00Tcm4TlvDq8ikWAM', // Rachel
};

/**
 * Resolve text to a pre-generated audio file ID, or null if no match.
 */
function resolveToFileId(text: string): string | null {
  const uiId = PREGEN_UI[text];
  if (uiId) return uiId;

  const trimmed = text.trim().toLowerCase();

  if (PREGEN_WORDS.has(trimmed)) return `word-${trimmed}`;
  if (NUMBER_WORDS[trimmed] !== undefined) return `number-${NUMBER_WORDS[trimmed]}`;

  const soundMatch = text.match(LETTER_SOUND_RE);
  if (soundMatch) return `letter-${soundMatch[1]}-sound`;

  const nameMatch = text.match(LETTER_NAME_RE);
  if (nameMatch) return `letter-${nameMatch[1]}-name`;

  return null;
}

function getPregenUrl(fileId: string): string {
  const engine = useSettingsStore.getState().ttsEngine;
  return `/audio/${engine}/${fileId}.mp3`;
}

/**
 * Check if the currently selected voice is the default for this engine.
 * If it IS the default (or empty), we can use pre-gen files. Otherwise, we must use the live API.
 */
function isUsingDefaultVoice(): boolean {
  const { ttsEngine, selectedVoice } = useSettingsStore.getState();
  if (!selectedVoice) return true;
  const defaultId = DEFAULT_VOICES[ttsEngine] || '';
  return selectedVoice === defaultId;
}

// ─── Speech Queue Item ─────────────────────────────────

interface QueueItem {
  fileId?: string;
  text?: string;
  fallbackText?: string;
  resolve: () => void;
  reject: (err: Error) => void;
}

const QUEUE_GAP_MS = 200;

// ─── Generative Music Data ─────────────────────────────

// Note name -> semitone offset from C
const NOTE_MAP: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord quality offsets (semitones from root)
const CHORD_TYPES: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
};

// Calming chord progression patterns using Nashville numbers
// [degree, quality] — degree is 0-indexed from root
const PROGRESSIONS: [number, 'major' | 'minor'][][] = [
  [[0, 'major'], [5, 'minor'], [3, 'major'], [4, 'major']],   // I  vi  IV  V
  [[0, 'major'], [3, 'major'], [5, 'minor'], [4, 'major']],   // I  IV  vi  V
  [[0, 'major'], [4, 'major'], [5, 'minor'], [3, 'major']],   // I  V   vi  IV
  [[5, 'minor'], [3, 'major'], [0, 'major'], [4, 'major']],   // vi IV  I   V
  [[0, 'major'], [3, 'major'], [0, 'major'], [4, 'major']],   // I  IV  I   V
  [[0, 'major'], [2, 'minor'], [5, 'minor'], [3, 'major']],   // I  iii vi  IV
  [[0, 'major'], [5, 'minor'], [2, 'minor'], [4, 'major']],   // I  vi  iii V
  [[3, 'major'], [0, 'major'], [4, 'major'], [5, 'minor']],   // IV I   V   vi
];

// Friendly root keys for ambient music
const ROOT_KEYS = ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'];

// Oscillator types that sound gentle/ambient
const TIMBRES: OscillatorType[] = ['sine', 'triangle'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Build a chord: [rootNote, octave, quality] -> ['C3', 'E3', 'G3']
 */
function buildChord(rootSemitone: number, octave: number, quality: 'major' | 'minor'): string[] {
  const offsets = CHORD_TYPES[quality];
  return offsets.map((offset) => {
    const semi = (rootSemitone + offset) % 12;
    const oct = octave + Math.floor((rootSemitone + offset) / 12);
    return `${ALL_NOTES[semi]}${oct}`;
  });
}

/**
 * Generate a random chord progression for a given key.
 * Returns an array of chord arrays (each chord = array of note strings).
 */
function generateProgression(rootKey: string): string[][] {
  const rootSemi = NOTE_MAP[rootKey] ?? 0;
  const pattern = pick(PROGRESSIONS);
  const octave = pick([2, 3]); // Low octaves for ambient feel

  // Major scale intervals in semitones: W W H W W W H
  const majorScale = [0, 2, 4, 5, 7, 9, 11];

  return pattern.map(([degree, quality]) => {
    const scaleSemi = (rootSemi + majorScale[degree]) % 12;
    return buildChord(scaleSemi, octave, quality);
  });
}

// ─── Audio Service ─────────────────────────────────────

class AudioService {
  private sparkleSynth: Tone.PolySynth | null = null;
  private drumSynth: Tone.MembraneSynth | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  // ─── Speech Queue ────────────────────────────────
  private queue: QueueItem[] = [];
  private isDraining = false;

  // ─── Background Music ────────────────────────────
  private bgSynth: Tone.PolySynth | null = null;
  private bgLoop: Tone.Loop | null = null;
  private bgGain: Tone.Gain | null = null;
  private bgPlaying = false;
  private normalBgVolume = -28;
  private duckedBgVolume = -40;

  constructor() {
    // Register a one-time click listener to initialize audio on first user gesture.
    // This is required by Chrome/Safari for Web Audio API (AudioContext).
    if (typeof document !== 'undefined') {
      const initOnGesture = () => {
        this.init();
        document.removeEventListener('click', initOnGesture);
        document.removeEventListener('touchstart', initOnGesture);
      };
      document.addEventListener('click', initOnGesture, { once: false });
      document.addEventListener('touchstart', initOnGesture, { once: false });
    }
  }

  /**
   * Initialize Tone.js AudioContext and synths.
   * Safe to call multiple times — only runs once.
   * MUST be called from a user gesture (click/tap) for Chrome/Safari.
   */
  async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit() {
    try {
      await Tone.start();

      this.sparkleSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 1 },
      }).toDestination();
      this.sparkleSynth.volume.value = -10;

      this.drumSynth = new Tone.MembraneSynth().toDestination();
      this.drumSynth.volume.value = -5;

      // Background music synth -> gain node -> destination
      this.bgGain = new Tone.Gain(1).toDestination();
      this.bgGain.gain.value = Tone.dbToGain(this.normalBgVolume);

      this.bgSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 2 },
      }).connect(this.bgGain);

      this.isInitialized = true;

      // Auto-start background music if enabled
      const settings = useSettingsStore.getState();
      if (settings.backgroundMusic) {
        this.startBackgroundMusic();
      }
    } catch (err) {
      console.warn('[audio] Failed to initialize Tone.js:', err);
      this.initPromise = null; // Allow retry
    }
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

  // ─── Voice (TTS) — Queue-based ───────────────────

  /**
   * Speak a pre-generated audio clip by file ID. Queued.
   * If a non-default voice is selected, skips pre-gen and uses live API.
   */
  async speakById(fileId: string, fallbackText?: string): Promise<void> {
    if (this.isMuted) return;
    // If using a non-default voice, skip pre-gen and use live API instead
    if (!isUsingDefaultVoice() && fallbackText) {
      return this.enqueue({ text: fallbackText });
    }
    return this.enqueue({ fileId, fallbackText });
  }

  sayByIdAsync(fileId: string, fallbackText?: string): void {
    this.speakById(fileId, fallbackText).catch(() => {});
  }

  /**
   * Speak text. Queued.
   * If using default voice, tries pre-gen first, then API, then browser TTS.
   * If using non-default voice, skips pre-gen and goes straight to API.
   */
  async speak(text: string): Promise<void> {
    if (this.isMuted) return;
    return this.enqueue({ text });
  }

  sayAsync(text: string): void {
    this.speak(text).catch(() => {});
  }

  async speakImmediate(text: string): Promise<void> {
    if (this.isMuted) return;
    this.stopSpeaking();

    // If default voice and has pre-gen, use it
    if (isUsingDefaultVoice()) {
      const fileId = resolveToFileId(text);
      if (fileId) {
        const url = getPregenUrl(fileId);
        try {
          this.duckBgMusic();
          await this.playAudioUrl(url);
          this.unduckBgMusic();
          return;
        } catch { /* fall through */ }
      }
    }

    this.duckBgMusic();
    await this.speakViaApi(text);
    this.unduckBgMusic();
  }

  async speakByIdImmediate(fileId: string, fallbackText?: string): Promise<void> {
    if (this.isMuted) return;
    this.stopSpeaking();

    // If using non-default voice, skip pre-gen
    if (!isUsingDefaultVoice() && fallbackText) {
      this.duckBgMusic();
      await this.speakViaApi(fallbackText);
      this.unduckBgMusic();
      return;
    }

    const url = getPregenUrl(fileId);
    try {
      this.duckBgMusic();
      await this.playAudioUrl(url);
      this.unduckBgMusic();
    } catch {
      if (fallbackText) {
        this.duckBgMusic();
        await this.speakViaApi(fallbackText);
        this.unduckBgMusic();
      }
    }
  }

  stopSpeaking() {
    for (const item of this.queue) {
      item.reject(new Error('Speech stopped'));
    }
    this.queue = [];
    this.isDraining = false;

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    window.speechSynthesis?.cancel();
    this.unduckBgMusic();
  }

  // ─── Speech Queue internals ──────────────────────

  private enqueue(item: Omit<QueueItem, 'resolve' | 'reject'>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ ...item, resolve, reject });
      if (!this.isDraining) {
        this.drainQueue();
      }
    });
  }

  private async drainQueue(): Promise<void> {
    if (this.isDraining) return;
    this.isDraining = true;
    this.duckBgMusic();

    while (this.queue.length > 0) {
      const item = this.queue[0];

      try {
        await this.playQueueItem(item);
        item.resolve();
      } catch (err) {
        item.reject(err instanceof Error ? err : new Error(String(err)));
      }

      this.queue.shift();

      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, QUEUE_GAP_MS));
      }
    }

    this.isDraining = false;
    this.unduckBgMusic();
  }

  private async playQueueItem(item: QueueItem): Promise<void> {
    const useDefault = isUsingDefaultVoice();

    // Case 1: fileId provided
    if (item.fileId) {
      // Only use pre-gen if on default voice
      if (useDefault) {
        const url = getPregenUrl(item.fileId);
        try {
          await this.playAudioUrl(url);
          return;
        } catch { /* fall through */ }
      }
      // Non-default voice or pre-gen failed: use API with fallback text
      if (item.fallbackText) {
        await this.speakViaApi(item.fallbackText);
        return;
      }
      if (useDefault) {
        throw new Error(`Failed to play fileId: ${item.fileId}`);
      }
      return; // No fallback text and non-default voice, skip silently
    }

    // Case 2: text provided
    if (item.text) {
      // Try pre-gen only if on default voice
      if (useDefault) {
        const fileId = resolveToFileId(item.text);
        if (fileId) {
          const url = getPregenUrl(fileId);
          try {
            await this.playAudioUrl(url);
            return;
          } catch { /* fall through to API */ }
        }
      }
      await this.speakViaApi(item.text);
    }
  }

  // ─── Background Music (Generative) ──────────────

  /**
   * Start generative ambient background music.
   * Each call generates a new random chord progression, tempo, and timbre.
   * Call this when entering a game for fresh music each time.
   */
  startBackgroundMusic() {
    if (!this.isInitialized) return;

    // Stop any existing music first
    if (this.bgPlaying) {
      this.stopBackgroundMusic();
    }

    // Generate random music parameters
    const rootKey = pick(ROOT_KEYS);
    const chords = generateProgression(rootKey);
    const bpm = Math.round(randRange(35, 55));
    const timbre = pick(TIMBRES);
    const useArpeggio = Math.random() > 0.5;

    // Apply random timbre to bg synth
    if (this.bgSynth) {
      this.bgSynth.set({ oscillator: { type: timbre } });
    }

    let chordIndex = 0;

    if (useArpeggio) {
      // Gentle arpeggio: play each note of the chord sequentially
      let noteInChord = 0;
      this.bgLoop = new Tone.Loop((time) => {
        const chord = chords[chordIndex % chords.length];
        const note = chord[noteInChord % chord.length];
        this.bgSynth?.triggerAttackRelease(note, '4n', time);
        noteInChord++;
        if (noteInChord >= chord.length) {
          noteInChord = 0;
          chordIndex++;
        }
      }, '8n');
    } else {
      // Block chords: play whole chord at once
      this.bgLoop = new Tone.Loop((time) => {
        const chord = chords[chordIndex % chords.length];
        this.bgSynth?.triggerAttackRelease(chord, '2n', time);
        chordIndex++;
      }, '4n');
    }

    Tone.getTransport().bpm.value = bpm;
    this.bgLoop.start(0);
    Tone.getTransport().start();

    this.bgPlaying = true;
    this.updateBgMusicVolume();
  }

  stopBackgroundMusic() {
    if (this.bgLoop) {
      this.bgLoop.stop();
      this.bgLoop.dispose();
      this.bgLoop = null;
    }
    if (this.bgPlaying) {
      Tone.getTransport().stop();
    }
    this.bgPlaying = false;
  }

  /**
   * Regenerate background music with new random parameters.
   * Call when entering a new game for variety.
   */
  regenerateMusic() {
    const settings = useSettingsStore.getState();
    if (!settings.backgroundMusic) return;
    this.startBackgroundMusic();
  }

  toggleBackgroundMusic(enabled: boolean) {
    // Ensure audio is initialized before toggling
    if (enabled && !this.isInitialized) {
      this.init().then(() => this.startBackgroundMusic());
      return;
    }
    if (enabled) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }

  updateBgMusicVolume() {
    if (!this.bgGain) return;
    const settings = useSettingsStore.getState();
    const vol = settings.bgMusicVolume ?? 0.3;
    this.normalBgVolume = vol === 0 ? -60 : -18 - (1 - vol) * 30;
    this.duckedBgVolume = this.normalBgVolume - 12;

    if (!this.isDraining) {
      this.bgGain.gain.rampTo(Tone.dbToGain(this.normalBgVolume), 0.3);
    }
  }

  private duckBgMusic() {
    if (!this.bgGain || !this.bgPlaying) return;
    this.bgGain.gain.rampTo(Tone.dbToGain(this.duckedBgVolume), 0.3);
  }

  private unduckBgMusic() {
    if (!this.bgGain || !this.bgPlaying) return;
    this.bgGain.gain.rampTo(Tone.dbToGain(this.normalBgVolume), 0.5);
  }

  // ─── Internal ─────────────────────────────────────

  private playAudioUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.volume = useSettingsStore.getState().volume;
      this.currentAudio = audio;

      audio.onended = () => {
        this.currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        this.currentAudio = null;
        reject(new Error(`Failed to play ${url}`));
      };
      audio.play().catch(reject);
    });
  }

  private async speakViaApi(text: string): Promise<void> {
    try {
      const { ttsEngine, selectedVoice } = useSettingsStore.getState();
      const blobUrl = await apiSpeak(text, ttsEngine, selectedVoice || undefined);
      await this.playAudioUrl(blobUrl).finally(() => {
        URL.revokeObjectURL(blobUrl);
      });
    } catch {
      this.speakFallback(text);
    }
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
