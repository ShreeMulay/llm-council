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

// Letter sound patterns: "J says juh, like Jump!" → letter-J-sound
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

// ─── Audio Service ─────────────────────────────────────

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

  // ─── Voice (TTS) ──────────────────────────────────

  /**
   * Play a pre-generated audio clip by its file ID.
   * e.g. speakById('number-42') → /audio/elevenlabs/number-42.mp3
   *
   * Falls back to speak(text) via API if the file fails to load.
   */
  async speakById(fileId: string, fallbackText?: string): Promise<void> {
    if (this.isMuted) return;
    this.stopSpeaking();

    const url = getPregenUrl(fileId);

    try {
      await this.playAudioUrl(url);
    } catch {
      // Static file failed — fall back to API or browser TTS
      if (fallbackText) {
        await this.speakViaApi(fallbackText);
      }
    }
  }

  /** Fire-and-forget speakById */
  sayByIdAsync(fileId: string, fallbackText?: string): void {
    this.speakById(fileId, fallbackText).catch(() => {});
  }

  /**
   * Speak text. Tries pre-generated static files first, then API, then browser TTS.
   *
   * Flow:
   *   1. resolveToFileId(text) → if found, play /audio/{engine}/{id}.mp3
   *   2. Else, POST /api/tts/speak (live API call)
   *   3. Else, browser SpeechSynthesis fallback
   */
  async speak(text: string): Promise<void> {
    if (this.isMuted) return;
    this.stopSpeaking();

    // 1. Try pre-generated clip
    const fileId = resolveToFileId(text);
    if (fileId) {
      const url = getPregenUrl(fileId);
      try {
        await this.playAudioUrl(url);
        return;
      } catch {
        // Static file missing or failed — fall through to API
      }
    }

    // 2. Try backend TTS API
    await this.speakViaApi(text);
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
