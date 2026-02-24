import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordLetterProgress } from '@/services/api';
import { TARGET_LETTERS, type LetterInfo } from '@/data/letterData';
import { shuffle, pickRandom } from '@/lib/utils';

type Mode = 'learn' | 'quiz';

export default function LetterSoundsGame() {
  const [mode, setMode] = useState<Mode>('learn');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizLetter, setQuizLetter] = useState<LetterInfo | null>(null);
  const [quizOptions, setQuizOptions] = useState<LetterInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const { addCorrect, addWrong, score, streak, resetGame, triggerCelebration } = useGameStore();

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const currentLetter = TARGET_LETTERS[currentIndex];

  // ─── Learn Mode ─────────────────────────────────────

  function handleLearnTap() {
    audio.sayByIdAsync(`letter-${currentLetter.upper}-sound`, currentLetter.soundText);
  }

  function nextLetter() {
    const next = (currentIndex + 1) % TARGET_LETTERS.length;
    setCurrentIndex(next);
  }

  function prevLetter() {
    const prev = currentIndex === 0 ? TARGET_LETTERS.length - 1 : currentIndex - 1;
    setCurrentIndex(prev);
  }

  // ─── Quiz Mode ──────────────────────────────────────

  const generateQuiz = useCallback(() => {
    const answer = TARGET_LETTERS[Math.floor(Math.random() * TARGET_LETTERS.length)];
    const wrong = pickRandom(
      TARGET_LETTERS.filter((l) => l.upper !== answer.upper),
      3,
    );
    setQuizLetter(answer);
    setQuizOptions(shuffle([answer, ...wrong]));
    setSelected(null);
    setIsCorrect(null);
  }, []);

  useEffect(() => {
    if (mode === 'quiz') {
      generateQuiz();
    }
  }, [mode, generateQuiz]);

  function handleQuizPick(letter: LetterInfo) {
    if (selected) return;
    setSelected(letter.upper);

    const correct = letter.upper === quizLetter?.upper;
    setIsCorrect(correct);

    if (correct) {
      addCorrect();
      audio.playCorrect();
      recordLetterProgress(letter.upper, true).catch(() => {});
      if ((score + 1) % 5 === 0) triggerCelebration();
    } else {
      addWrong();
      audio.playWrong();
      recordLetterProgress(quizLetter!.upper, false).catch(() => {});
    }

    setTimeout(generateQuiz, 1800);
  }

  function playQuizSound() {
    if (quizLetter) {
      audio.sayByIdAsync(`letter-${quizLetter.upper}-sound`, quizLetter.soundText);
    }
  }

  const progress = mode === 'learn'
    ? ((currentIndex + 1) / TARGET_LETTERS.length) * 100
    : undefined;

  return (
    <GameShell title="Letter Sounds" emoji="🔤" progress={progress} bgClass="bg-gradient-to-br from-cyan-400 via-blue-400 to-indigo-500">
      {/* Mode toggle */}
      <div className="flex justify-center gap-2 mb-6">
        <Button
          variant={mode === 'learn' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('learn')}
          className={mode === 'learn' ? '' : 'bg-white/60'}
        >
          Learn
        </Button>
        <Button
          variant={mode === 'quiz' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('quiz')}
          className={mode === 'quiz' ? '' : 'bg-white/60'}
        >
          Quiz
        </Button>
      </div>

      {mode === 'learn' ? (
        /* ─── Learn View ─────────────────────────── */
        <div className="flex flex-col items-center gap-6">
          <motion.div
            key={currentLetter.upper}
            className="bg-white/30 backdrop-blur rounded-3xl p-8 flex flex-col items-center gap-4 cursor-pointer"
            onClick={handleLearnTap}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-baseline gap-4">
              <span className="text-8xl font-bold text-white drop-shadow-lg">{currentLetter.upper}</span>
              <span className="text-6xl font-bold text-white/70">{currentLetter.lower}</span>
            </div>
            <span className="text-6xl">{currentLetter.emoji}</span>
            <p className="text-2xl font-bold text-white">
              {currentLetter.upper} says <em>"{currentLetter.sound}"</em>
            </p>
            <p className="text-xl text-white/80">like {currentLetter.word}!</p>
            <p className="text-sm text-white/50">Tap to hear the sound</p>
          </motion.div>

          <div className="flex gap-4">
            <Button variant="outline" size="lg" onClick={prevLetter} className="bg-white/60">
              Previous
            </Button>
            <Button variant="default" size="lg" onClick={nextLetter}>
              Next Letter
            </Button>
          </div>

          {/* Letter dots */}
          <div className="flex gap-2">
            {TARGET_LETTERS.map((l, i) => (
              <button
                key={l.upper}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentIndex ? 'bg-white scale-125' : 'bg-white/40'
                }`}
                onClick={() => setCurrentIndex(i)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ─── Quiz View ──────────────────────────── */
        <div className="flex flex-col items-center gap-6">
          {quizLetter && (
            <>
              <motion.button
                className="bg-white/30 backdrop-blur rounded-3xl p-8 flex flex-col items-center gap-4"
                onClick={playQuizSound}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-6xl">{quizLetter.emoji}</span>
                <p className="text-2xl font-bold text-white">
                  Which letter says "{quizLetter.sound}"?
                </p>
                <p className="text-sm text-white/50">Tap to hear again</p>
              </motion.button>

              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                {quizOptions.map((opt) => (
                  <motion.div key={opt.upper} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="xl"
                      className={`w-full text-4xl font-bold ${
                        selected === opt.upper
                          ? isCorrect
                            ? 'bg-green-200 border-green-400 ring-2 ring-green-400'
                            : 'bg-red-200 border-red-400 ring-2 ring-red-400'
                          : selected && opt.upper === quizLetter.upper
                            ? 'bg-green-200 border-green-400'
                            : 'bg-white/80'
                      }`}
                      onClick={() => handleQuizPick(opt)}
                      disabled={!!selected}
                    >
                      {opt.upper}{opt.lower}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          <AnimatePresence>
            {isCorrect !== null && (
              <motion.p
                className={`text-2xl font-bold ${isCorrect ? 'text-green-100' : 'text-red-100'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {isCorrect ? 'Yes! Great job! 🎉' : `It was ${quizLetter?.upper}${quizLetter?.lower}!`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </GameShell>
  );
}
