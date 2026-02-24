import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordRhymeProgress } from '@/services/api';
import { RHYME_PAIRS, type RhymePair } from '@/data/rhymeData';
import { shuffle } from '@/lib/utils';
import { useBadgeStore } from '@/stores/badgeStore';

export default function RhymeGame() {
  const [pairs, setPairs] = useState<RhymePair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const { addCorrect, addWrong, score, resetGame, triggerCelebration } = useGameStore();

  useEffect(() => {
    resetGame();
    setPairs(shuffle([...RHYME_PAIRS]));
  }, [resetGame]);

  const current = pairs[currentIndex];

  const playWords = useCallback(async () => {
    if (!current || playing) return;
    setPlaying(true);
    await audio.speakById(`word-${current.words[0].toLowerCase()}`, current.words[0]);
    await new Promise((r) => setTimeout(r, 400));
    await audio.speakById(`word-${current.words[1].toLowerCase()}`, current.words[1]);
    setPlaying(false);
  }, [current, playing]);

  useEffect(() => {
    if (current && answered === null) {
      // Small delay before auto-playing words
      const timer = setTimeout(playWords, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, current]);

  function handleAnswer(userSaysRhymes: boolean) {
    if (answered !== null || !current) return;

    const correct = userSaysRhymes === current.rhymes;
    setAnswered(userSaysRhymes);
    setIsCorrect(correct);

    const pairKey = current.words.join('-');

    if (correct) {
      addCorrect();
      audio.playCorrect();
      recordRhymeProgress(pairKey, true).catch(() => {});
      useBadgeStore.getState().checkAndAward({ rhymesCorrect: 1 });

      if (current.rhymes) {
        audio.sayAsync(`Yes! ${current.words[0]} and ${current.words[1]} rhyme!`);
      } else {
        audio.sayAsync(`Right! ${current.words[0]} and ${current.words[1]} don't rhyme.`);
      }

      if ((score + 1) % 5 === 0) triggerCelebration();
    } else {
      addWrong();
      audio.playWrong();
      recordRhymeProgress(pairKey, false).catch(() => {});

      if (current.rhymes) {
        audio.sayAsync(`Oops! ${current.words[0]} and ${current.words[1]} do rhyme!`);
      } else {
        audio.sayAsync(`Oops! ${current.words[0]} and ${current.words[1]} don't rhyme.`);
      }
    }

    setTimeout(() => {
      setAnswered(null);
      setIsCorrect(null);
      setCurrentIndex((i) => {
        const next = i + 1;
        if (next >= pairs.length) {
          // Reshuffle when we run out
          setPairs(shuffle([...RHYME_PAIRS]));
          return 0;
        }
        return next;
      });
    }, 2500);
  }

  if (!current) return null;

  const progress = pairs.length > 0 ? ((currentIndex + 1) / pairs.length) * 100 : 0;

  return (
    <GameShell title="Rhyme Time" emoji="🎵" progress={progress} bgClass="bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-400">
      <div className="flex flex-col items-center gap-6 mt-4">
        {/* Word cards */}
        <div className="flex gap-6 items-center">
          <motion.div
            key={`${currentIndex}-1`}
            className="bg-white/30 backdrop-blur rounded-3xl p-6 flex flex-col items-center gap-3 min-w-[130px]"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-5xl">{current.emoji1}</span>
            <span className="text-2xl font-bold text-white">{current.words[0]}</span>
          </motion.div>

          <span className="text-3xl text-white/60">&</span>

          <motion.div
            key={`${currentIndex}-2`}
            className="bg-white/30 backdrop-blur rounded-3xl p-6 flex flex-col items-center gap-3 min-w-[130px]"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-5xl">{current.emoji2}</span>
            <span className="text-2xl font-bold text-white">{current.words[1]}</span>
          </motion.div>
        </div>

        {/* Play again button */}
        <Button variant="ghost" size="sm" onClick={playWords} disabled={playing} className="text-white/80">
          {playing ? 'Playing...' : '🔊 Hear again'}
        </Button>

        {/* Question */}
        <p className="text-2xl font-bold text-white text-center">
          Do these words rhyme?
        </p>

        {/* Answer buttons */}
        <div className="flex gap-6">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant={answered === true ? (isCorrect ? 'success' : 'destructive') : 'default'}
              size="xl"
              onClick={() => handleAnswer(true)}
              disabled={answered !== null}
              className="text-2xl px-10"
            >
              Yes! 🎵
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant={answered === false ? (isCorrect ? 'success' : 'destructive') : 'secondary'}
              size="xl"
              onClick={() => handleAnswer(false)}
              disabled={answered !== null}
              className="text-2xl px-10"
            >
              No! 🚫
            </Button>
          </motion.div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {isCorrect !== null && (
            <motion.p
              className={`text-2xl font-bold text-center ${isCorrect ? 'text-green-100' : 'text-red-100'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {isCorrect ? 'You got it! 🎉' : 'Not quite! 💪'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </GameShell>
  );
}
