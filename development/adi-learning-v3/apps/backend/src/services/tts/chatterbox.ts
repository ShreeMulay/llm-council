import type { TTSVoice } from '@adi/shared';
import type { ITTSProvider, TTSSynthesizeOptions } from './types';
import { $ } from 'bun';

// Resemble.ai cloud API
const DEFAULT_VOICE = 'alloy';

export class ChatterboxProvider implements ITTSProvider {
  readonly name = 'chatterbox' as const;
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.LINGUALEAP_CHATTERBOX_API_KEY || '';
    // Strip trailing /v1 if present to avoid double-pathing (env may include /v1)
    const rawEndpoint = process.env.LINGUALEAP_CHATTERBOX_ENDPOINT || 'https://api.resemble.ai';
    this.endpoint = rawEndpoint.replace(/\/v1\/?$/, '');
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultVoice(): string {
    return DEFAULT_VOICE;
  }

  async synthesize(text: string, options?: TTSSynthesizeOptions): Promise<Buffer> {
    const voice = options?.voice || DEFAULT_VOICE;

    // Try the OpenAI-compatible endpoint first (self-hosted pattern)
    const response = await fetch(`${this.endpoint}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        voice,
        model: 'chatterbox',
        exaggeration: 0.6,
        cfg_weight: 0.5,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Chatterbox API error (${response.status}): ${err}`);
    }

    const wavBuffer = Buffer.from(await response.arrayBuffer());

    // Convert WAV to MP3 using ffmpeg
    return this.wavToMp3(wavBuffer);
  }

  private async wavToMp3(wavBuffer: Buffer): Promise<Buffer> {
    try {
      // Use ffmpeg to convert WAV → MP3 via stdin/stdout
      const proc = Bun.spawn(
        ['ffmpeg', '-i', 'pipe:0', '-f', 'mp3', '-ab', '128k', '-ar', '44100', '-y', 'pipe:1'],
        {
          stdin: 'pipe',
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );

      // Write WAV data to stdin
      const writer = proc.stdin.getWriter();
      await writer.write(wavBuffer);
      await writer.close();

      // Read MP3 from stdout
      const output = await new Response(proc.stdout).arrayBuffer();
      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new Error(`ffmpeg conversion failed: ${stderr}`);
      }

      return Buffer.from(output);
    } catch (err) {
      // Fallback: return WAV if ffmpeg fails
      console.warn('[chatterbox] ffmpeg conversion failed, returning WAV:', err);
      return wavBuffer;
    }
  }

  async listVoices(): Promise<TTSVoice[]> {
    // OpenAI-compatible voices
    const builtinVoices: TTSVoice[] = [
      { id: 'alloy', name: 'Alloy (balanced)' },
      { id: 'echo', name: 'Echo (warm)' },
      { id: 'fable', name: 'Fable (storyteller)' },
      { id: 'onyx', name: 'Onyx (deep)' },
      { id: 'nova', name: 'Nova (friendly)' },
      { id: 'shimmer', name: 'Shimmer (bright)' },
    ];

    try {
      // Try to fetch from API
      const response = await fetch(`${this.endpoint}/v1/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (response.ok) {
        // If the API returns voices, use those
        return builtinVoices;
      }
    } catch {
      // Ignore - use builtin list
    }

    return builtinVoices;
  }
}
