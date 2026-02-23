# Adi's Learning Adventure v3

Pre-K learning app for Adalyn "Adi" Mulay. iPad-first, single-user (no auth).

## Tech Stack
- **Runtime**: Bun monorepo
- **Frontend**: React 19, Vite, Tailwind CSS v4, Shadcn/ui v4, Zustand, Tone.js
- **Backend**: Hono on Bun.serve(), bun:sqlite
- **TTS**: Dual engine - ElevenLabs + Resemble.ai (switchable)
- **Audio**: Pre-generated MP3s (both engines) + runtime fallback

## Skills Covered (Pre-K Q3)
1. Writing First & Last Name (Adalyn Mulay)
2. Counting to 75
3. More, Less, Equal (math comparison)
4. Hearing Rhymes
5. Story Sequencing (picture cards)
6. Letter Sounds: Jj, Kk, Rr, Pp, Bb, Dd, Qq, Uu

## Commands
```bash
bun install              # Install all deps
bun run dev:frontend     # Start frontend (Vite)
bun run dev:backend      # Start backend (Hono)
bun run dev              # Start both
bun run generate-audio   # Pre-generate TTS audio
```

## Issue Tracking
Uses `bd` (Beads) for task tracking. Run `bd ready` for available work.
