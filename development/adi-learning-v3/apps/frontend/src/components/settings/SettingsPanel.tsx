import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Volume2, Music, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { useBadgeStore } from '@/stores/badgeStore';
import { getTTSProviders, setTTSEngine, getTTSVoices, setTTSVoice } from '@/services/api';
import { audio } from '@/services/audio';
import type { TTSEngine, TTSVoice } from '@adi/shared';

export function SettingsPanel() {
  const {
    ttsEngine,
    volume,
    backgroundMusic,
    bgMusicVolume,
    setTTSEngine: setLocalEngine,
    setVolume,
    setBackgroundMusic,
    setBgMusicVolume,
    toggleSettings,
  } = useSettingsStore();

  const resetAllProgress = useBadgeStore((s) => s.resetAllProgress);

  const [providers, setProviders] = useState<Array<{ name: TTSEngine; active: boolean; available: boolean }>>([]);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [testing, setTesting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadProviders();
    loadVoices(ttsEngine);
  }, [ttsEngine]);

  async function loadProviders() {
    try {
      const res = await getTTSProviders();
      if (res.ok) setProviders(res.data);
    } catch { /* ignore */ }
  }

  async function loadVoices(engine: TTSEngine) {
    try {
      const res = await getTTSVoices(engine);
      if (res.ok) setVoices(res.data);
    } catch { /* ignore */ }
  }

  async function handleEngineSwitch(engine: TTSEngine) {
    try {
      await setTTSEngine(engine);
      setLocalEngine(engine);
      loadVoices(engine);
    } catch { /* ignore */ }
  }

  async function handleVoiceChange(voiceId: string) {
    setSelectedVoice(voiceId);
    try {
      await setTTSVoice(ttsEngine, voiceId);
    } catch { /* ignore */ }
  }

  async function testVoice() {
    setTesting(true);
    try {
      await audio.speakByIdImmediate('ui-welcome', "Welcome to Adi's Learning Adventure!");
    } finally {
      setTesting(false);
    }
  }

  function handleBgMusicToggle() {
    const next = !backgroundMusic;
    setBackgroundMusic(next);
    audio.toggleBackgroundMusic(next);
  }

  function handleBgMusicVolume(val: number) {
    setBgMusicVolume(val);
    audio.updateBgMusicVolume();
  }

  function handleResetProgress() {
    resetAllProgress();
    setShowResetConfirm(false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={toggleSettings} />

      {/* Panel */}
      <motion.div
        className="relative z-10 bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl max-h-[85vh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Settings</h2>
          <Button variant="ghost" size="icon" onClick={toggleSettings}>
            <X size={20} />
          </Button>
        </div>

        {/* TTS Engine */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">Voice Engine</label>
          <div className="flex gap-2">
            {(['elevenlabs', 'chatterbox'] as TTSEngine[]).map((engine) => {
              const provider = providers.find((p) => p.name === engine);
              return (
                <Button
                  key={engine}
                  variant={ttsEngine === engine ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleEngineSwitch(engine)}
                  disabled={provider && !provider.available}
                  className="flex-1 capitalize"
                >
                  {engine === 'elevenlabs' ? 'ElevenLabs' : 'Chatterbox'}
                  {provider && !provider.available && ' (N/A)'}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Voice selector */}
        {voices.length > 0 && (
          <div className="mb-6">
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">Voice</label>
            <select
              className="w-full rounded-xl border-2 border-border p-3 text-sm bg-white"
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
            >
              <option value="">Default</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Volume */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">
            <Volume2 size={14} className="inline mr-1" />
            Voice Volume: {Math.round(volume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {/* Test button */}
        <Button
          variant="secondary"
          className="w-full mb-6"
          onClick={testVoice}
          disabled={testing}
        >
          <Volume2 size={18} />
          {testing ? 'Playing...' : 'Test Voice'}
        </Button>

        {/* Divider */}
        <hr className="border-border mb-6" />

        {/* Background Music */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Music size={14} />
              Background Music
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={backgroundMusic}
              onClick={handleBgMusicToggle}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                backgroundMusic ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  backgroundMusic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {backgroundMusic && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Music Volume: {Math.round(bgMusicVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bgMusicVolume}
                onChange={(e) => handleBgMusicVolume(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="border-border mb-6" />

        {/* Reset Progress */}
        <div className="mb-2">
          {!showResetConfirm ? (
            <Button
              variant="outline"
              className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => setShowResetConfirm(true)}
            >
              <RotateCcw size={16} />
              Reset All Progress
            </Button>
          ) : (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700 mb-3 font-medium">
                Are you sure? This will erase all badges, streaks, and progress. This cannot be undone!
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={handleResetProgress}
                >
                  Yes, Reset Everything
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
