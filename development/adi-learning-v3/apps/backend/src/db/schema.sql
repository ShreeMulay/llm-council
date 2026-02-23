-- =============================================================================
-- Adi's Learning Adventure v3 - Database Schema
-- =============================================================================

-- Users (single user: Adi)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App settings (TTS engine, voice, etc.)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Letter progress (tracing + sounds)
CREATE TABLE IF NOT EXISTS letter_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    letter TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    correct INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    last_practiced DATETIME,
    UNIQUE(user_id, letter)
);

-- Number progress (counting)
CREATE TABLE IF NOT EXISTS number_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    number INTEGER NOT NULL CHECK(number BETWEEN 1 AND 75),
    attempts INTEGER DEFAULT 0,
    correct INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    last_practiced DATETIME,
    UNIQUE(user_id, number)
);

-- Writing progress (name tracing accuracy)
CREATE TABLE IF NOT EXISTS writing_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    letter TEXT NOT NULL,
    stroke_accuracy REAL DEFAULT 0,
    trace_count INTEGER DEFAULT 0,
    last_traced DATETIME,
    UNIQUE(user_id, letter)
);

-- Math comparison progress (more/less/equal)
CREATE TABLE IF NOT EXISTS math_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL CHECK(skill IN ('more', 'less', 'equal')),
    attempts INTEGER DEFAULT 0,
    correct INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    last_practiced DATETIME,
    UNIQUE(user_id, skill)
);

-- Rhyme progress
CREATE TABLE IF NOT EXISTS rhyme_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_pair TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    correct INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    last_practiced DATETIME,
    UNIQUE(user_id, word_pair)
);

-- Story sequencing progress
CREATE TABLE IF NOT EXISTS story_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    correct INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    last_practiced DATETIME,
    UNIQUE(user_id, story_id)
);

-- Learning sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    duration_seconds INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_letter_progress_user ON letter_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_number_progress_user ON number_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_progress_user ON writing_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_math_progress_user ON math_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_rhyme_progress_user ON rhyme_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_story_progress_user ON story_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
