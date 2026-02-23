import type { TTSEngine, TTSVoice } from '@adi/shared';

export interface TTSSynthesizeOptions {
  voice?: string;
  speed?: number;
}

export interface ITTSProvider {
  readonly name: TTSEngine;

  /** Generate speech audio from text. Returns MP3 buffer. */
  synthesize(text: string, options?: TTSSynthesizeOptions): Promise<Buffer>;

  /** List available voices for this engine. */
  listVoices(): Promise<TTSVoice[]>;

  /** Get the default voice ID for this engine. */
  getDefaultVoice(): string;

  /** Check if this provider is configured and available. */
  isAvailable(): boolean;
}
