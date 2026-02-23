-- Default user: Adi
INSERT OR IGNORE INTO users (id, name) VALUES ('adi', 'Adalyn Mulay');

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('tts_engine', 'elevenlabs');
INSERT OR IGNORE INTO settings (key, value) VALUES ('tts_voice_elevenlabs', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('tts_voice_chatterbox', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('volume', '0.8');
INSERT OR IGNORE INTO settings (key, value) VALUES ('speed', '1.0');
