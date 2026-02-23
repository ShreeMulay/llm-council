// ─── TTS ───────────────────────────────────────────────

export type TTSEngine = 'elevenlabs' | 'chatterbox';

export interface TTSProvider {
  name: TTSEngine;
  active: boolean;
  voices: TTSVoice[];
}

export interface TTSVoice {
  id: string;
  name: string;
  preview_url?: string;
}

export interface TTSRequest {
  text: string;
  engine?: TTSEngine;
  voice?: string;
}

// ─── Skills ────────────────────────────────────────────

export type SkillId =
  | 'name-writing'
  | 'counting'
  | 'compare'
  | 'rhymes'
  | 'stories'
  | 'letter-sounds';

export interface SkillProgress {
  skillId: SkillId;
  attempts: number;
  correct: number;
  mastery: number; // 0-100
  lastPracticed: string | null;
}

// ─── Progress ──────────────────────────────────────────

export interface LetterProgress {
  letter: string;
  attempts: number;
  correct: number;
  mastered: boolean;
}

export interface NumberProgress {
  number: number;
  attempts: number;
  correct: number;
  mastered: boolean;
}

export interface MathProgress {
  skill: 'more' | 'less' | 'equal';
  attempts: number;
  correct: number;
  mastered: boolean;
}

export interface RhymeProgress {
  wordPair: string;
  attempts: number;
  correct: number;
  mastered: boolean;
}

export interface StoryProgress {
  storyId: string;
  attempts: number;
  correct: number;
  mastered: boolean;
}

export interface WritingProgress {
  letter: string;
  strokeAccuracy: number;
  traceCount: number;
}

// ─── Settings ──────────────────────────────────────────

export interface AppSettings {
  ttsEngine: TTSEngine;
  ttsVoice: string;
  volume: number;
  speed: number;
}

// ─── API Responses ─────────────────────────────────────

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
