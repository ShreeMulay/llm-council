import type { TTSVoice } from '@adi/shared';
import type { ITTSProvider, TTSSynthesizeOptions } from './types';

const API_BASE = 'https://api.elevenlabs.io/v1';

// Kid-friendly default voice - "Rachel" (warm, clear female)
const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';

export class ElevenLabsProvider implements ITTSProvider {
  readonly name = 'elevenlabs' as const;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultVoice(): string {
    return DEFAULT_VOICE;
  }

  async synthesize(text: string, options?: TTSSynthesizeOptions): Promise<Buffer> {
    const voiceId = options?.voice || DEFAULT_VOICE;

    const response = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        output_format: 'mp3_44100_128',
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
          speed: options?.speed ?? 0.92,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${err}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async listVoices(): Promise<TTSVoice[]> {
    const response = await fetch(`${API_BASE}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs voices error: ${response.status}`);
    }

    const data = (await response.json()) as { voices: Array<{ voice_id: string; name: string; preview_url?: string }> };

    return data.voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
      preview_url: v.preview_url,
    }));
  }
}
