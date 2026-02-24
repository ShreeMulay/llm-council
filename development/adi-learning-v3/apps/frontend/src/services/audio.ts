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

/**
 * Resolve text to a pre-generated audio file ID, or null if no match.
 */
function resolveToFileId(text: string): string | null {
  // 1. Exact UI prompt match
  const uiId = PREGEN_UI[text];
  if (uiId) return uiId;

  // 2. Single word — might be a rhyme word or number word
  const trimmed = text.trim().toLowerCase();

  if (PREGEN_WORDS.has(trimmed)) {
    return `word-${trimmed}`;
  }

  if (NUMBER_WORDS[trimmed] !== undefined) {
    return `number-${NUMBER_WORDS[trimmed]}`;
  }

  // 3. Letter sound pattern
  const soundMatch = text.match(LETTER_SOUND_RE);
  if (soundMatch) {
    return `letter-${soundMatch[1]}-sound`;
  }

  const nameMatch = text.match(LETTER_NAME_RE);
  if (nameMatch) {
    return `letter-${nameMatch[1]}-name`;
  }

  return null;
}

/**
 * Get the URL for a pre-generated audio file.
 * Engine is read from the settings store.
 */
function getPregenUrl(fileId: string): string {
  const engine = useSettingsStore.getState().ttsEngine;
  return `/audio/${engine}/${fileId}.mp3`;
}

// ─── Speech Queue Item ─────────────────────────────────

interface QueueItem {
  /** Pre-generated file ID (e.g. 'number-42') */
  fileId?: string;
  /** Raw text to speak via API/fallback */
  text?: string;
  /** Fallback text if fileId fails */
  fallbackText?: string;
  /** Resolve when this item finishes playing */
  resolve: () => void;
  /** Reject on error */
  reject: (err: Error) => void;
}

/** Gap between queued speech items in ms */
const QUEUE_GAP_MS = 200;

// ─── Audio Service ─────────────────────────────────────

class AudioService {
  private sparkleSynth: Tone.PolySynth | null = null;
  private drumSynth: Tone.MembraneSynth | null = null;
  private isInitialized = false;
  private currentAudio: HTMLAudioElement | null = null;

  // ─── Speech Queue ────────────────────────────────
  private queue: QueueItem[] = [];
  private isDraining = false;

  // ─── Background Music ────────────────────────────
  private bgSynth: Tone.PolySynth | null = null;
  private bgLoop: Tone.Loop | null = null;
  private bgGain: Tone.Gain | null = null;
  private bgPlaying = false;
  private normalBgVolume = -28; // dB
  private duckedBgVolume = -40; // dB when speech is playing

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

    // Background music synth → gain node → destination
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
  }

  private get isMuted(): boolean {
    return useSettingsStore.getState().volume === 0;
  }

  // ─── SFX (unchanged — Tone.js synths, no conflict with speech queue) ──

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
   * Speak a pre-generated audio clip by file ID. Queued — waits for
   * any previously queued speech to finish before playing.
   *
   * Falls back to speak(text) via API if the file fails to load.
   */
  async speakById(fileId: string, fallbackText?: string): Promise<void> {
    if (this.isMuted) return;
    return this.enqueue({ fileId, fallbackText });
  }

  /** Fire-and-forget queued speakById */
  sayByIdAsync(fileId: string, fallbackText?: string): void {
    this.speakById(fileId, fallbackText).catch(() => {});
  }

  /**
   * Speak text. Queued — waits for any previously queued speech.
   *
   * Flow per item:
   *   1. resolveToFileId(text) -> if found, play /audio/{engine}/{id}.mp3
   *   2. Else, POST /api/tts/speak (live API call)
   *   3. Else, browser SpeechSynthesis fallback
   */
  async speak(text: string): Promise<void> {
    if (this.isMuted) return;
    return this.enqueue({ text });
  }

  /** Fire-and-forget queued speak */
  sayAsync(text: string): void {
    this.speak(text).catch(() => {});
  }

  /**
   * Immediately speak, interrupting any queued/current speech.
   * Use for navigation transitions or explicit user-triggered speech.
   */
  async speakImmediate(text: string): Promise<void> {
    if (this.isMuted) return;
    this.stopSpeaking(); // clears queue + stops current audio

    const fileId = resolveToFileId(text);
    if (fileId) {
      const url = getPregenUrl(fileId);
      try {
        this.duckBgMusic();
        await this.playAudioUrl(url);
        this.unduckBgMusic();
        return;
      } catch {
        // fall through
      }
    }

    this.duckBgMusic();
    await this.speakViaApi(text);
    this.unduckBgMusic();
  }

  /**
   * Immediately speak a file ID, interrupting everything.
   */
  async speakByIdImmediate(fileId: string, fallbackText?: string): Promise<void> {
    if (this.isMuted) return;
    this.stopSpeaking();

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

  /**
   * Stop all speech: cancel current audio, clear the queue.
   */
  stopSpeaking() {
    // Reject all pending queue items
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
      // Start draining if not already in progress
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

      // Remove the item we just processed
      this.queue.shift();

      // Small gap between sequential speech items for natural pacing
      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, QUEUE_GAP_MS));
      }
    }

    this.isDraining = false;
    this.unduckBgMusic();
  }

  private async playQueueItem(item: QueueItem): Promise<void> {
    // Case 1: fileId provided — try static file first
    if (item.fileId) {
      const url = getPregenUrl(item.fileId);
      try {
        await this.playAudioUrl(url);
        return;
      } catch {
        // Static file failed — try fallback text
        if (item.fallbackText) {
          await this.speakViaApi(item.fallbackText);
          return;
        }
        throw new Error(`Failed to play fileId: ${item.fileId}`);
      }
    }

    // Case 2: text provided — resolve to file or API
    if (item.text) {
      const fileId = resolveToFileId(item.text);
      if (fileId) {
        const url = getPregenUrl(fileId);
        try {
          await this.playAudioUrl(url);
          return;
        } catch {
          // Fall through to API
        }
      }
      await this.speakViaApi(item.text);
    }
  }

  // ─── Background Music ────────────────────────────

  /**
   * Start ambient background music. Gentle, looping pad chords.
   * Auto-ducks when speech is playing.
   */
  startBackgroundMusic() {
    if (!this.isInitialized || this.bgPlaying) return;

    // Chord progression: C maj -> Am -> F maj -> G maj (classic calming loop)
    const chords = [
      ['C3', 'E3', 'G3'],  // C major
      ['A2', 'C3', 'E3'],  // A minor
      ['F2', 'A2', 'C3'],  // F major
      ['G2', 'B2', 'D3'],  // G major
    ];

    let chordIndex = 0;

    // Play a chord every 4 seconds (slow, ambient)
    this.bgLoop = new Tone.Loop((time) => {
      const chord = chords[chordIndex % chords.length];
      this.bgSynth?.triggerAttackRelease(chord, '2n', time);
      chordIndex++;
    }, '4n');

    // Slow tempo for ambient feel
    Tone.getTransport().bpm.value = 40;
    this.bgLoop.start(0);
    Tone.getTransport().start();

    this.bgPlaying = true;

    // Apply current volume from settings
    this.updateBgMusicVolume();
  }

  /**
   * Stop background music.
   */
  stopBackgroundMusic() {
    if (this.bgLoop) {
      this.bgLoop.stop();
      this.bgLoop.dispose();
      this.bgLoop = null;
    }
    Tone.getTransport().stop();
    this.bgPlaying = false;
  }

  /**
   * Toggle background music on/off.
   */
  toggleBackgroundMusic(enabled: boolean) {
    if (enabled) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }

  /**
   * Update background music volume from settings store.
   * Called when bgMusicVolume setting changes.
   */
  updateBgMusicVolume() {
    if (!this.bgGain) return;
    const settings = useSettingsStore.getState();
    const vol = settings.bgMusicVolume ?? 0.3;
    // Map 0-1 to a dB range: 0 = -60dB (silent), 1 = -18dB (audible but quiet)
    this.normalBgVolume = vol === 0 ? -60 : -18 - (1 - vol) * 30;
    this.duckedBgVolume = this.normalBgVolume - 12;

    // Only apply normal volume if not currently ducked (i.e., speech not playing)
    if (!this.isDraining) {
      this.bgGain.gain.rampTo(Tone.dbToGain(this.normalBgVolume), 0.3);
    }
  }

  /** Duck background music volume while speech plays */
  private duckBgMusic() {
    if (!this.bgGain || !this.bgPlaying) return;
    this.bgGain.gain.rampTo(Tone.dbToGain(this.duckedBgVolume), 0.3);
  }

  /** Restore background music volume after speech ends */
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
      const blobUrl = await apiSpeak(text);
      await this.playAudioUrl(blobUrl).finally(() => {
        URL.revokeObjectURL(blobUrl);
      });
    } catch {
      // Final fallback: browser TTS
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
