/**
 * Audio Transcription Service
 * Handles audio-to-text conversion using Whisper or similar APIs
 */

import type {
  TranscriptionResult,
  TranscriptionOptions,
  TranscriptionSegment,
} from "./types"

/**
 * Default transcription options
 */
const DEFAULT_OPTIONS: TranscriptionOptions = {
  language: "en",
  diarization: true,
  temperature: 0,
}

/**
 * Transcribe audio to text
 *
 * In production: Calls Whisper API (OpenAI or local)
 * Currently: Returns mock structure for development
 *
 * @param audioBlob - Audio file as Blob
 * @param options - Transcription options
 * @returns Transcription result with segments
 *
 * @example
 * ```typescript
 * const audio = await fetch("/recording.mp3").then(r => r.blob())
 * const result = await transcribeAudio(audio, { diarization: true })
 * console.log(result.text)
 * ```
 */
export async function transcribeAudio(
  _audioBlob: Blob,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  // Merge options with defaults (used in production implementation)
  void { ...DEFAULT_OPTIONS, ...options }

  // In production: Call Whisper API
  // Example integration with OpenAI Whisper:
  //
  // const formData = new FormData()
  // formData.append("file", audioBlob, "audio.mp3")
  // formData.append("model", "whisper-1")
  // formData.append("language", opts.language ?? "en")
  // formData.append("response_format", "verbose_json")
  // if (opts.prompt) {
  //   formData.append("prompt", opts.prompt)
  // }
  //
  // const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  //   },
  //   body: formData,
  // })
  //
  // const data = await response.json()
  // return {
  //   text: data.text,
  //   segments: data.segments.map(s => ({
  //     text: s.text,
  //     start: s.start,
  //     end: s.end,
  //     speaker: "unknown",
  //   })),
  //   confidence: data.segments.reduce((acc, s) => acc + (1 - s.no_speech_prob), 0) / data.segments.length,
  //   duration: data.duration,
  // }

  // Mock response for development
  return {
    text: "",
    segments: [],
    confidence: 0,
    duration: 0,
  }
}

/**
 * Transcribe audio with speaker diarization
 *
 * Uses a two-pass approach:
 * 1. Whisper for transcription
 * 2. Speaker diarization model for speaker labels
 *
 * @param audioBlob - Audio file as Blob
 * @param options - Transcription options
 * @returns Transcription with speaker labels
 */
export async function transcribeWithDiarization(
  audioBlob: Blob,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> {
  // First pass: Get transcription
  const transcription = await transcribeAudio(audioBlob, {
    ...options,
    diarization: false,
  })

  if (transcription.segments.length === 0) {
    return transcription
  }

  // In production: Run speaker diarization
  // Example with pyannote.audio or similar:
  //
  // const diarizationResult = await runDiarization(audioBlob)
  // const labeledSegments = alignSpeakersToSegments(
  //   transcription.segments,
  //   diarizationResult
  // )
  //
  // return {
  //   ...transcription,
  //   segments: labeledSegments,
  // }

  // For now, return transcription without speaker labels
  return transcription
}

/**
 * Merge consecutive segments from the same speaker
 *
 * @param segments - Transcription segments
 * @returns Merged segments
 */
export function mergeConsecutiveSpeakerSegments(
  segments: TranscriptionSegment[]
): TranscriptionSegment[] {
  if (segments.length === 0) return []

  const merged: TranscriptionSegment[] = []
  let current = { ...segments[0] }

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i]

    if (segment.speaker === current.speaker) {
      // Merge with current segment
      current.text = `${current.text} ${segment.text}`.trim()
      current.end = segment.end
    } else {
      // Push current and start new
      merged.push(current)
      current = { ...segment }
    }
  }

  merged.push(current)
  return merged
}

/**
 * Extract provider statements from transcription
 *
 * @param result - Transcription result
 * @returns Text from provider segments only
 */
export function extractProviderStatements(result: TranscriptionResult): string {
  return result.segments
    .filter((s) => s.speaker === "provider")
    .map((s) => s.text)
    .join(" ")
    .trim()
}

/**
 * Extract patient statements from transcription
 *
 * @param result - Transcription result
 * @returns Text from patient segments only
 */
export function extractPatientStatements(result: TranscriptionResult): string {
  return result.segments
    .filter((s) => s.speaker === "patient")
    .map((s) => s.text)
    .join(" ")
    .trim()
}

/**
 * Get transcription segment at a specific time
 *
 * @param result - Transcription result
 * @param timeSeconds - Time in seconds
 * @returns Segment at that time, or undefined
 */
export function getSegmentAtTime(
  result: TranscriptionResult,
  timeSeconds: number
): TranscriptionSegment | undefined {
  return result.segments.find(
    (s) => timeSeconds >= s.start && timeSeconds <= s.end
  )
}

/**
 * Calculate word count from transcription
 *
 * @param result - Transcription result
 * @returns Total word count
 */
export function getWordCount(result: TranscriptionResult): number {
  return result.text.split(/\s+/).filter((w) => w.length > 0).length
}

/**
 * Calculate speaking time per speaker
 *
 * @param result - Transcription result
 * @returns Map of speaker to total speaking time in seconds
 */
export function getSpeakingTimePerSpeaker(
  result: TranscriptionResult
): Map<string, number> {
  const times = new Map<string, number>()

  for (const segment of result.segments) {
    const speaker = segment.speaker ?? "unknown"
    const duration = segment.end - segment.start
    times.set(speaker, (times.get(speaker) ?? 0) + duration)
  }

  return times
}

/**
 * Format transcription as dialogue
 *
 * @param result - Transcription result
 * @returns Formatted dialogue string
 */
export function formatAsDialogue(result: TranscriptionResult): string {
  const merged = mergeConsecutiveSpeakerSegments(result.segments)

  return merged
    .map((s) => {
      const speaker = s.speaker ?? "Unknown"
      const label = speaker.charAt(0).toUpperCase() + speaker.slice(1)
      return `${label}: ${s.text}`
    })
    .join("\n\n")
}
