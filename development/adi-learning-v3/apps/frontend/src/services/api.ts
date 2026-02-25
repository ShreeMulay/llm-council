import type { TTSEngine, TTSVoice, AppSettings, SkillProgress } from '@adi/shared';

const BASE = '/api';

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

// ─── TTS ──────────────────────────────────────────────

export async function getTTSProviders() {
  return fetchJson<{ ok: boolean; data: Array<{ name: TTSEngine; active: boolean; available: boolean }> }>('/tts/providers');
}

export async function setTTSEngine(engine: TTSEngine) {
  return fetchJson('/tts/provider', {
    method: 'POST',
    body: JSON.stringify({ engine }),
  });
}

export async function getTTSVoices(engine?: TTSEngine) {
  const query = engine ? `?engine=${engine}` : '';
  return fetchJson<{ ok: boolean; data: TTSVoice[] }>(`/tts/voices${query}`);
}

export async function setTTSVoice(engine: TTSEngine, voice: string) {
  return fetchJson('/tts/voice', {
    method: 'POST',
    body: JSON.stringify({ engine, voice }),
  });
}

/** Get speech audio as a blob URL for playback */
export async function speak(text: string, engine?: TTSEngine, voice?: string): Promise<string> {
  const body: Record<string, string> = { text };
  if (engine) body.engine = engine;
  if (voice) body.voice = voice;

  const res = await fetch(`${BASE}/tts/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`TTS speak failed: ${res.status}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ─── Progress ─────────────────────────────────────────

export async function getProgressSummary() {
  return fetchJson<{ ok: boolean; data: Record<string, { mastered?: number; target?: number; mastery: number }> }>('/progress/summary');
}

export async function recordLetterProgress(letter: string, correct: boolean) {
  return fetchJson(`/progress/letters/${letter}`, {
    method: 'POST',
    body: JSON.stringify({ correct }),
  });
}

export async function recordNumberProgress(num: number, correct: boolean) {
  return fetchJson(`/progress/numbers/${num}`, {
    method: 'POST',
    body: JSON.stringify({ correct }),
  });
}

export async function recordMathProgress(skill: string, correct: boolean) {
  return fetchJson(`/progress/math/${skill}`, {
    method: 'POST',
    body: JSON.stringify({ correct }),
  });
}

export async function recordRhymeProgress(wordPair: string, correct: boolean) {
  return fetchJson('/progress/rhymes', {
    method: 'POST',
    body: JSON.stringify({ wordPair, correct }),
  });
}

export async function recordStoryProgress(storyId: string, correct: boolean) {
  return fetchJson(`/progress/stories/${storyId}`, {
    method: 'POST',
    body: JSON.stringify({ correct }),
  });
}

export async function recordWritingProgress(letter: string, accuracy: number) {
  return fetchJson(`/progress/writing/${letter}`, {
    method: 'POST',
    body: JSON.stringify({ accuracy }),
  });
}

// ─── Settings ─────────────────────────────────────────

export async function getSettings() {
  return fetchJson<{ ok: boolean; data: Record<string, string> }>('/settings');
}

export async function updateSetting(key: string, value: string) {
  return fetchJson(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}
