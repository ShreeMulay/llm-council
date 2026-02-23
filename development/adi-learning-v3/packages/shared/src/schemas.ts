import { z } from 'zod';

export const TTSEngineSchema = z.enum(['elevenlabs', 'chatterbox']);

export const TTSRequestSchema = z.object({
  text: z.string().min(1).max(3000),
  engine: TTSEngineSchema.optional(),
  voice: z.string().optional(),
});

export const SettingsSchema = z.object({
  ttsEngine: TTSEngineSchema.default('elevenlabs'),
  ttsVoice: z.string().default(''),
  volume: z.number().min(0).max(1).default(0.8),
  speed: z.number().min(0.5).max(2).default(1),
});

export const ProgressRecordSchema = z.object({
  skillId: z.string(),
  correct: z.boolean(),
  detail: z.string().optional(),
});
