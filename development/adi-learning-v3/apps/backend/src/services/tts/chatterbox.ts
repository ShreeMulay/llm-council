import type { TTSVoice } from '@adi/shared';
import type { ITTSProvider, TTSSynthesizeOptions } from './types';

// Resemble.ai cloud API (Chatterbox model)
// Synthesis: POST https://f.cluster.resemble.ai/synthesize
// Voices:    GET  https://app.resemble.ai/api/v2/voices
const SYNTH_ENDPOINT = 'https://f.cluster.resemble.ai/synthesize';
const VOICES_ENDPOINT = 'https://app.resemble.ai/api/v2/voices';
const DEFAULT_VOICE_UUID = 'fb2d2858'; // Lucy (friendly female)

export class ChatterboxProvider implements ITTSProvider {
  readonly name = 'chatterbox' as const;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.LINGUALEAP_CHATTERBOX_API_KEY || '';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultVoice(): string {
    return DEFAULT_VOICE_UUID;
  }

  async synthesize(text: string, options?: TTSSynthesizeOptions): Promise<Buffer> {
    const voiceUuid = options?.voice || DEFAULT_VOICE_UUID;

    const response = await fetch(SYNTH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_uuid: voiceUuid,
        data: text,
        output_format: 'mp3',
        sample_rate: 44100,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Chatterbox API error (${response.status}): ${err}`);
    }

    const result = await response.json() as {
      success: boolean;
      audio_content: string;
      duration: number;
      issues?: string[];
    };

    if (!result.success || !result.audio_content) {
      throw new Error(`Chatterbox synthesis failed: ${JSON.stringify(result.issues || [])}`);
    }

    // audio_content is base64-encoded MP3
    return Buffer.from(result.audio_content, 'base64');
  }

  async listVoices(): Promise<TTSVoice[]> {
    try {
      const response = await fetch(`${VOICES_ENDPOINT}?page=1&page_size=50`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Voice list error: ${response.status}`);
      }

      const data = await response.json() as {
        success: boolean;
        items: Array<{
          uuid: string;
          name: string;
          default_language: string;
          voice_type: string;
          voice_status: string;
        }>;
      };

      if (!data.success || !data.items) {
        return this.fallbackVoices();
      }

      // Filter to ready English voices
      return data.items
        .filter((v) => v.voice_status === 'Ready' && v.default_language?.includes('en'))
        .map((v) => ({
          id: v.uuid,
          name: `${v.name} (${v.voice_type})`,
        }));
    } catch (err) {
      console.warn('[chatterbox] Failed to fetch voices, using fallback:', err);
      return this.fallbackVoices();
    }
  }

  private fallbackVoices(): TTSVoice[] {
    return [
      { id: 'fb2d2858', name: 'Lucy (friendly)' },
      { id: '91b49260', name: 'Abigail (warm)' },
      { id: '08975946', name: 'Meera (clear)' },
      { id: 'cfb9967c', name: 'Fiona (bright)' },
      { id: '7c4296be', name: 'Grant (male)' },
      { id: 'c1faa6af', name: 'Chloe (gentle)' },
    ];
  }
}
