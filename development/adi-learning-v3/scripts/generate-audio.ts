#!/usr/bin/env bun
/**
 * Audio Pre-Generation Script
 *
 * Generates TTS audio for both ElevenLabs and Chatterbox engines.
 * Audio files are saved to apps/frontend/public/audio/{engine}/
 *
 * Usage:
 *   bun run scripts/generate-audio.ts                     # Generate for both engines
 *   bun run scripts/generate-audio.ts --engine elevenlabs # Only ElevenLabs
 *   bun run scripts/generate-audio.ts --engine chatterbox # Only Chatterbox
 *   bun run scripts/generate-audio.ts --dry-run           # Show what would be generated
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const AUDIO_DIR = join(ROOT, 'apps/frontend/public/audio');

// ─── Audio Manifest ────────────────────────────────────

function numberToWords(n: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy'];
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? '-' + ones[o] : '');
}

interface AudioItem {
  id: string;
  text: string;
  category: string;
}

function buildManifest(): AudioItem[] {
  const items: AudioItem[] = [];

  // Letter sounds
  const letters = [
    { letter: 'J', sound: 'juh', word: 'Jump' },
    { letter: 'K', sound: 'kuh', word: 'Kite' },
    { letter: 'R', sound: 'rr', word: 'Rainbow' },
    { letter: 'P', sound: 'puh', word: 'Pizza' },
    { letter: 'B', sound: 'buh', word: 'Ball' },
    { letter: 'D', sound: 'duh', word: 'Dog' },
    { letter: 'Q', sound: 'kwuh', word: 'Queen' },
    { letter: 'U', sound: 'uh', word: 'Umbrella' },
  ];

  for (const l of letters) {
    items.push({ id: `letter-${l.letter}-name`, text: `This is the letter ${l.letter}.`, category: 'letters' });
    items.push({ id: `letter-${l.letter}-sound`, text: `${l.letter} says ${l.sound}, like ${l.word}!`, category: 'letters' });
  }

  // Numbers 1-75
  for (let i = 1; i <= 75; i++) {
    items.push({ id: `number-${i}`, text: numberToWords(i), category: 'numbers' });
  }

  // Rhyme words
  const words = new Set<string>();
  const rhymePairs = [
    ['cat', 'hat'], ['dog', 'log'], ['sun', 'fun'], ['bee', 'tree'],
    ['fish', 'dish'], ['cake', 'lake'], ['star', 'car'], ['moon', 'spoon'],
    ['bear', 'chair'], ['bed', 'red'], ['pig', 'big'], ['ring', 'king'],
    ['boat', 'goat'], ['rock', 'sock'], ['bug', 'hug'], ['ball', 'tall'],
    ['mice', 'rice'], ['fox', 'box'], ['rain', 'train'], ['hen', 'pen'],
    ['bird', 'frog', 'cow', 'duck'],
  ];
  for (const pair of rhymePairs) {
    for (const w of pair) words.add(w);
  }
  for (const w of words) {
    items.push({ id: `word-${w}`, text: w, category: 'rhymes' });
  }

  // UI prompts
  const uiPrompts = [
    { id: 'ui-welcome', text: "Welcome to Adi's Learning Adventure!" },
    { id: 'ui-great-job', text: 'Great job, Adi!' },
    { id: 'ui-try-again', text: 'Oops! Try again!' },
    { id: 'ui-amazing', text: 'Amazing! You did it!' },
    { id: 'ui-keep-going', text: 'Keep going! You are doing great!' },
    { id: 'ui-first-name', text: "Let's write your first name! Start with the letter A." },
    { id: 'ui-last-name', text: "Now let's write your last name!" },
    { id: 'ui-full-name', text: 'Wonderful! You wrote your whole name: Adalyn Mulay!' },
    { id: 'ui-rhyme-yes', text: 'Yes! They rhyme!' },
    { id: 'ui-rhyme-no', text: "No, they don't rhyme." },
    { id: 'ui-more', text: 'Which group has more?' },
    { id: 'ui-less', text: 'Which group has less?' },
    { id: 'ui-equal', text: 'Are they the same?' },
    { id: 'ui-count-tap', text: 'Tap each one to count!' },
    { id: 'ui-story-order', text: 'Put the cards in the right order!' },
  ];

  for (const p of uiPrompts) {
    items.push({ ...p, category: 'ui' });
  }

  return items;
}

// ─── TTS API Calls ─────────────────────────────────────

async function generateElevenLabs(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      output_format: 'mp3_44100_128',
      voice_settings: { stability: 0.65, similarity_boost: 0.75, speed: 0.92 },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs error ${response.status}: ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateChatterbox(text: string): Promise<Buffer> {
  const apiKey = process.env.LINGUALEAP_CHATTERBOX_API_KEY;
  const endpoint = process.env.LINGUALEAP_CHATTERBOX_ENDPOINT || 'https://api.resemble.ai';
  if (!apiKey) throw new Error('LINGUALEAP_CHATTERBOX_API_KEY not set');

  const response = await fetch(`${endpoint}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      voice: 'alloy',
      model: 'chatterbox',
      exaggeration: 0.6,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chatterbox error ${response.status}: ${await response.text()}`);
  }

  const wavBuffer = Buffer.from(await response.arrayBuffer());

  // Convert WAV to MP3 using ffmpeg
  const proc = Bun.spawn(['ffmpeg', '-i', 'pipe:0', '-f', 'mp3', '-ab', '128k', '-ar', '44100', '-y', 'pipe:1'], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const writer = proc.stdin.getWriter();
  await writer.write(wavBuffer);
  await writer.close();

  const mp3 = Buffer.from(await new Response(proc.stdout).arrayBuffer());
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.warn('ffmpeg failed, returning WAV');
    return wavBuffer;
  }

  return mp3;
}

// ─── Main ──────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const engineArg = args.find((a) => a.startsWith('--engine='))?.split('=')[1];

  const engines: Array<'elevenlabs' | 'chatterbox'> = engineArg
    ? [engineArg as 'elevenlabs' | 'chatterbox']
    : ['elevenlabs', 'chatterbox'];

  const manifest = buildManifest();
  console.log(`\n📋 Audio manifest: ${manifest.length} items`);
  console.log(`🔊 Engines: ${engines.join(', ')}`);

  if (dryRun) {
    const byCategory = manifest.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    console.log('\nBy category:', byCategory);
    console.log(`Total files to generate: ${manifest.length * engines.length}`);
    return;
  }

  for (const engine of engines) {
    const dir = join(AUDIO_DIR, engine);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    console.log(`\n🎙️  Generating ${engine} audio...`);

    for (const item of manifest) {
      const outPath = join(dir, `${item.id}.mp3`);

      // Skip if already exists
      if (existsSync(outPath)) {
        skipped++;
        continue;
      }

      try {
        const audio = engine === 'elevenlabs'
          ? await generateElevenLabs(item.text)
          : await generateChatterbox(item.text);

        await Bun.write(outPath, audio);
        generated++;
        process.stdout.write(`  ✅ ${item.id} (${item.text.slice(0, 30)}...)\n`);

        // Rate limit: wait between requests
        await new Promise((r) => setTimeout(r, engine === 'elevenlabs' ? 300 : 200));
      } catch (err) {
        failed++;
        console.error(`  ❌ ${item.id}: ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(`\n📊 ${engine}: generated=${generated}, skipped=${skipped}, failed=${failed}`);
  }

  console.log('\n✅ Audio generation complete!');
}

main().catch(console.error);
