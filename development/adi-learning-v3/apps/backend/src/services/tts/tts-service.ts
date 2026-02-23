import type { TTSEngine, TTSVoice } from '@adi/shared';
import type { ITTSProvider } from './types';
import { ElevenLabsProvider } from './elevenlabs';
import { ChatterboxProvider } from './chatterbox';
import { AudioCache } from './cache';
import { getDb } from '../../db/init';

export class TTSService {
  private providers: Map<TTSEngine, ITTSProvider>;
  private cache: AudioCache;

  constructor() {
    this.providers = new Map();
    this.cache = new AudioCache();

    const elevenlabs = new ElevenLabsProvider();
    const chatterbox = new ChatterboxProvider();

    if (elevenlabs.isAvailable()) {
      this.providers.set('elevenlabs', elevenlabs);
      console.log('[tts] ElevenLabs provider loaded');
    }
    if (chatterbox.isAvailable()) {
      this.providers.set('chatterbox', chatterbox);
      console.log('[tts] Chatterbox provider loaded');
    }

    if (this.providers.size === 0) {
      console.warn('[tts] No TTS providers available! Set ELEVENLABS_API_KEY or LINGUALEAP_CHATTERBOX_API_KEY');
    }
  }

  /** Get the currently active TTS engine from settings */
  getActiveEngine(): TTSEngine {
    const db = getDb();
    const row = db.query<{ value: string }, []>('SELECT value FROM settings WHERE key = ?').get('tts_engine');
    return (row?.value as TTSEngine) || 'elevenlabs';
  }

  /** Set the active TTS engine */
  setActiveEngine(engine: TTSEngine): void {
    const db = getDb();
    db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [engine, 'tts_engine']);
  }

  /** Get the voice for a specific engine */
  getVoice(engine: TTSEngine): string {
    const db = getDb();
    const row = db.query<{ value: string }, []>('SELECT value FROM settings WHERE key = ?').get(`tts_voice_${engine}`);
    const voice = row?.value || '';
    if (voice) return voice;

    // Return default voice for engine
    const provider = this.providers.get(engine);
    return provider?.getDefaultVoice() || '';
  }

  /** Set the voice for a specific engine */
  setVoice(engine: TTSEngine, voice: string): void {
    const db = getDb();
    db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [
      `tts_voice_${engine}`,
      voice,
    ]);
  }

  /** Synthesize text to MP3 using the active (or specified) engine */
  async speak(text: string, engine?: TTSEngine, voice?: string): Promise<Buffer> {
    const activeEngine = engine || this.getActiveEngine();
    const activeVoice = voice || this.getVoice(activeEngine);

    // Check cache first
    const cached = this.cache.get(activeEngine, activeVoice, text);
    if (cached) {
      return cached;
    }

    // Generate via provider
    const provider = this.providers.get(activeEngine);
    if (!provider) {
      throw new Error(`TTS provider '${activeEngine}' not available`);
    }

    const audio = await provider.synthesize(text, { voice: activeVoice });

    // Cache the result
    this.cache.set(activeEngine, activeVoice, text, audio);

    return audio;
  }

  /** List voices for a specific engine */
  async listVoices(engine?: TTSEngine): Promise<TTSVoice[]> {
    const activeEngine = engine || this.getActiveEngine();
    const provider = this.providers.get(activeEngine);
    if (!provider) return [];
    return provider.listVoices();
  }

  /** Get available providers and their status */
  getProviders(): Array<{ name: TTSEngine; active: boolean; available: boolean }> {
    const activeEngine = this.getActiveEngine();
    const engines: TTSEngine[] = ['elevenlabs', 'chatterbox'];

    return engines.map((name) => ({
      name,
      active: name === activeEngine,
      available: this.providers.has(name),
    }));
  }

  /** Get cache stats */
  getCacheStats() {
    return {
      sizeMb: Math.round(this.cache.getSize() * 100) / 100,
    };
  }

  /** Clear the audio cache */
  clearCache(): number {
    return this.cache.clear();
  }
}

// Singleton
export const ttsService = new TTSService();
