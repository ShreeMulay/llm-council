import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBadgeStore, BADGES, type Badge } from '@/stores/badgeStore';
import { audio } from '@/services/audio';

// ─── Badge Toast (shows when badge unlocked) ──────────

export function BadgeToast() {
  const { newBadges, dismissNewBadges } = useBadgeStore();
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);

  useEffect(() => {
    if (newBadges.length > 0) {
      const badge = BADGES.find((b) => b.id === newBadges[0]);
      if (badge) {
        setCurrentBadge(badge);
        audio.playCelebration();

        const timer = setTimeout(() => {
          setCurrentBadge(null);
          dismissNewBadges();
        }, 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [newBadges, dismissNewBadges]);

  return (
    <AnimatePresence>
      {currentBadge && (
        <motion.div
          className="fixed top-6 left-1/2 z-[60] -translate-x-1/2"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={() => {
            setCurrentBadge(null);
            dismissNewBadges();
          }}
        >
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl border-2 border-yellow-300">
            <motion.span
              className="text-4xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
            >
              {currentBadge.emoji}
            </motion.span>
            <div>
              <p className="text-xs font-bold text-yellow-600 uppercase tracking-wide">Badge Unlocked!</p>
              <p className="text-lg font-bold text-gray-800">{currentBadge.title}</p>
              <p className="text-sm text-gray-500">{currentBadge.description}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Trophy Case (full screen overlay) ─────────────────

export function TrophyCase() {
  const { unlockedBadges, showTrophyCase, toggleTrophyCase, stats } = useBadgeStore();
  const unlockedCount = Object.keys(unlockedBadges).length;

  if (!showTrophyCase) return null;

  const categories = [
    { key: 'general', label: 'General', color: 'bg-yellow-100' },
    { key: 'counting', label: 'Counting', color: 'bg-blue-100' },
    { key: 'letters', label: 'Letters', color: 'bg-cyan-100' },
    { key: 'rhymes', label: 'Rhymes', color: 'bg-pink-100' },
    { key: 'stories', label: 'Stories', color: 'bg-purple-100' },
    { key: 'writing', label: 'Writing', color: 'bg-orange-100' },
    { key: 'math', label: 'Math', color: 'bg-green-100' },
  ] as const;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={toggleTrophyCase} />
      <motion.div
        className="relative z-10 bg-white/95 backdrop-blur-md rounded-3xl p-6 m-4 max-w-lg w-full max-h-[85vh] overflow-auto shadow-2xl"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Trophies</h2>
            <p className="text-sm text-gray-500">
              {unlockedCount} / {BADGES.length} badges earned
            </p>
          </div>
          <button
            onClick={toggleTrophyCase}
            className="text-3xl text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            &times;
          </button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatBox label="Correct" value={stats.totalCorrect} emoji="✅" />
          <StatBox label="Best Streak" value={stats.bestStreak} emoji="🔥" />
          <StatBox label="Games" value={stats.gamesPlayed} emoji="🎮" />
        </div>

        {/* Badge grid by category */}
        {categories.map(({ key, label, color }) => {
          const categoryBadges = BADGES.filter((b) => b.category === key);
          if (categoryBadges.length === 0) return null;
          return (
            <div key={key} className="mb-4">
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">{label}</h3>
              <div className="grid grid-cols-4 gap-2">
                {categoryBadges.map((badge) => {
                  const unlocked = !!unlockedBadges[badge.id];
                  return (
                    <div
                      key={badge.id}
                      className={`flex flex-col items-center p-2 rounded-xl text-center ${
                        unlocked ? color : 'bg-gray-100 opacity-40'
                      }`}
                      title={badge.description}
                    >
                      <span className={`text-3xl ${unlocked ? '' : 'grayscale'}`}>{badge.emoji}</span>
                      <span className="text-[10px] font-semibold text-gray-700 mt-1 leading-tight">
                        {badge.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function StatBox({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2 text-center">
      <span className="text-xl">{emoji}</span>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-[10px] text-gray-500 font-medium">{label}</p>
    </div>
  );
}
