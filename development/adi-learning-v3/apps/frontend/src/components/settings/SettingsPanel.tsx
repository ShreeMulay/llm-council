import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { getTTSProviders, setTTSEngine, getTTSVoices, setTTSVoice } from '@/services/api';
import { audio } from '@/services/audio';
import type { TTSEngine, TTSVoice } from '@adi/shared';

export function SettingsPanel() {
  const { ttsEngine, volume, setTTSEngine: setLocalEngine, setVolume, toggleSettings } = useSettingsStore();
  const [providers, setProviders] = useState<Array<{ name: TTSEngine; active: boolean; available: boolean }>>([]);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [testing, setTesting] = useState(false);

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
      await audio.speakById('ui-welcome', "Welcome to Adi's Learning Adventure!");
    } finally {
      setTesting(false);
    }
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
        className="relative z-10 bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl"
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
            Volume: {Math.round(volume * 100)}%
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
          className="w-full"
          onClick={testVoice}
          disabled={testing}
        >
          <Volume2 size={18} />
          {testing ? 'Playing...' : 'Test Voice'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
