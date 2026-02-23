import { Hono } from 'hono';
import { TTSRequestSchema, TTSEngineSchema } from '@adi/shared';
import { ttsService } from '../services/tts/tts-service';

const tts = new Hono();

// Get available TTS providers
tts.get('/providers', (c) => {
  return c.json({ ok: true, data: ttsService.getProviders() });
});

// Switch active TTS engine
tts.post('/provider', async (c) => {
  const body = await c.req.json();
  const result = TTSEngineSchema.safeParse(body.engine);
  if (!result.success) {
    return c.json({ ok: false, error: 'Invalid engine. Use "elevenlabs" or "chatterbox"' }, 400);
  }
  ttsService.setActiveEngine(result.data);
  return c.json({ ok: true, data: { engine: result.data } });
});

// Synthesize speech
tts.post('/speak', async (c) => {
  const body = await c.req.json();
  const result = TTSRequestSchema.safeParse(body);
  if (!result.success) {
    return c.json({ ok: false, error: result.error.flatten() }, 400);
  }

  try {
    const audio = await ttsService.speak(result.data.text, result.data.engine, result.data.voice);
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audio.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS synthesis failed';
    return c.json({ ok: false, error: message }, 500);
  }
});

// List voices for current (or specified) engine
tts.get('/voices', async (c) => {
  const engine = c.req.query('engine');
  const parsed = engine ? TTSEngineSchema.safeParse(engine) : null;
  try {
    const voices = await ttsService.listVoices(parsed?.success ? parsed.data : undefined);
    return c.json({ ok: true, data: voices });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list voices';
    return c.json({ ok: false, error: message }, 500);
  }
});

// Set voice for engine
tts.post('/voice', async (c) => {
  const body = await c.req.json();
  const engineResult = TTSEngineSchema.safeParse(body.engine);
  if (!engineResult.success || !body.voice) {
    return c.json({ ok: false, error: 'Provide engine and voice' }, 400);
  }
  ttsService.setVoice(engineResult.data, body.voice);
  return c.json({ ok: true });
});

// Cache stats
tts.get('/cache', (c) => {
  return c.json({ ok: true, data: ttsService.getCacheStats() });
});

// Clear cache
tts.delete('/cache', (c) => {
  const cleared = ttsService.clearCache();
  return c.json({ ok: true, data: { cleared } });
});

export default tts;
