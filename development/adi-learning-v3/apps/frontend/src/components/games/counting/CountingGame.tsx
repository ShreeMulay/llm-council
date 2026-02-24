import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordNumberProgress } from '@/services/api';
import { randInt, numberToWords } from '@/lib/utils';

const TIERS = [
  { label: '1-25', min: 1, max: 25 },
  { label: '26-50', min: 26, max: 50 },
  { label: '51-75', min: 51, max: 75 },
];

const ITEM_EMOJIS = ['⭐', '🌟', '💎', '🎈', '🌸', '🍎', '🦋', '💖'];

export default function CountingGame() {
  const [tier, setTier] = useState(0);
  const [target, setTarget] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [counted, setCounted] = useState(0);
  const [tappedIndices, setTappedIndices] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const { addCorrect, score, streak, resetGame, triggerCelebration } = useGameStore();

  const generateRound = useCallback(() => {
    const { min, max } = TIERS[tier];
    const count = randInt(min, Math.min(min + 15, max)); // Keep items manageable
    const emoji = ITEM_EMOJIS[Math.floor(Math.random() * ITEM_EMOJIS.length)];
    setTarget(count);
    setItems(Array(count).fill(emoji));
    setCounted(0);
    setTappedIndices(new Set());
    setDone(false);
  }, [tier]);

  useEffect(() => {
    resetGame();
    generateRound();
  }, [tier, generateRound, resetGame]);

  function handleTapItem(index: number) {
    if (tappedIndices.has(index) || done) return;

    const newTapped = new Set(tappedIndices);
    newTapped.add(index);
    setTappedIndices(newTapped);

    const newCount = counted + 1;
    setCounted(newCount);
    audio.playSparkle();
    audio.sayByIdAsync(`number-${newCount}`, numberToWords(newCount));

    if (newCount === target) {
      setDone(true);
      addCorrect();
      audio.playSuccess();
      recordNumberProgress(target, true).catch(() => {});

      if ((score + 1) % 5 === 0) {
        triggerCelebration();
      }

      // Auto-advance after a moment
      setTimeout(generateRound, 2000);
    }
  }

  const progress = target > 0 ? (counted / target) * 100 : 0;

  return (
    <GameShell title={`Count to 75 (${TIERS[tier].label})`} emoji="🔢" progress={progress} bgClass="bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-400">
      {/* Tier selector */}
      <div className="flex justify-center gap-2 mb-4">
        {TIERS.map((t, i) => (
          <Button
            key={t.label}
            variant={tier === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTier(i)}
            className={tier === i ? '' : 'bg-white/60'}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Counter display */}
      <div className="text-center mb-4">
        <motion.div
          key={counted}
          className="text-6xl font-bold text-white drop-shadow-lg"
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          {counted}
        </motion.div>
        <p className="text-white/80 text-lg">
          Tap each {items[0] || 'item'} to count! ({target} total)
        </p>
      </div>

      {/* Item grid */}
      <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
        {items.map((emoji, i) => (
          <motion.button
            key={i}
            className={`text-3xl p-2 rounded-xl transition-all ${
              tappedIndices.has(i)
                ? 'bg-white/40 scale-90 opacity-60'
                : 'bg-white/20 hover:bg-white/30 active:scale-95'
            }`}
            onClick={() => handleTapItem(i)}
            whileTap={{ scale: 0.85 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02 }}
          >
            {emoji}
          </motion.button>
        ))}
      </div>

      {/* Done message */}
      <AnimatePresence>
        {done && (
          <motion.div
            className="text-center mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-3xl font-bold text-white">
              You counted {target}! 🎉
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
