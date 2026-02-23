import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import type { TTSEngine } from '@adi/shared';

const CACHE_DIR = join(import.meta.dir, '../../../data/audio-cache');
const MAX_CACHE_SIZE_MB = 500;

export class AudioCache {
  constructor() {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  private getCacheKey(engine: TTSEngine, voice: string, text: string): string {
    return createHash('sha256').update(`${engine}:${voice}:${text}`).digest('hex');
  }

  private getCachePath(key: string): string {
    return join(CACHE_DIR, `${key}.mp3`);
  }

  get(engine: TTSEngine, voice: string, text: string): Buffer | null {
    const key = this.getCacheKey(engine, voice, text);
    const path = this.getCachePath(key);

    if (existsSync(path)) {
      return readFileSync(path);
    }
    return null;
  }

  set(engine: TTSEngine, voice: string, text: string, audio: Buffer): void {
    const key = this.getCacheKey(engine, voice, text);
    const path = this.getCachePath(key);
    writeFileSync(path, audio);
  }

  has(engine: TTSEngine, voice: string, text: string): boolean {
    const key = this.getCacheKey(engine, voice, text);
    return existsSync(this.getCachePath(key));
  }

  /** Get cache size in MB */
  getSize(): number {
    if (!existsSync(CACHE_DIR)) return 0;
    const files = readdirSync(CACHE_DIR);
    let totalBytes = 0;
    for (const file of files) {
      const stat = statSync(join(CACHE_DIR, file));
      totalBytes += stat.size;
    }
    return totalBytes / (1024 * 1024);
  }

  /** Clear all cached audio */
  clear(): number {
    if (!existsSync(CACHE_DIR)) return 0;
    const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith('.mp3'));
    for (const file of files) {
      unlinkSync(join(CACHE_DIR, file));
    }
    return files.length;
  }
}
