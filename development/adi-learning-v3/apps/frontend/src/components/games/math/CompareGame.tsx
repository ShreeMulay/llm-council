import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordMathProgress } from '@/services/api';
import { randInt, numberToWords } from '@/lib/utils';
import { useBadgeStore } from '@/stores/badgeStore';
import { Volume2, MessageSquare, MessageSquareMore } from 'lucide-react';

type CompareAnswer = 'more' | 'less' | 'equal';
type Verbosity = 'light' | 'medium' | 'full';

const GROUP_EMOJIS = ['⭐', '🍎', '🌸', '💎', '🦋', '🐟', '🌈', '🎈'];

const PRAISE = ['Great job, Adi!', 'Amazing! You did it!', 'Keep going! You are doing great!'];
const PRAISE_IDS = ['ui-great-job', 'ui-amazing', 'ui-keep-going'];

interface Round {
  leftCount: number;
  rightCount: number;
  answer: CompareAnswer;
  question: string;
  emoji: string;
}

function generateRound(difficulty: number): Round {
  const emoji = GROUP_EMOJIS[Math.floor(Math.random() * GROUP_EMOJIS.length)];
  const maxVal = Math.min(5 + difficulty * 3, 20);

  const roll = Math.random();
  let leftCount: number;
  let rightCount: number;
  let answer: CompareAnswer;
  let question: string;

  if (roll < 0.33) {
    // Equal
    leftCount = randInt(1, maxVal);
    rightCount = leftCount;
    answer = 'equal';
    question = 'Are they the same?';
  } else if (roll < 0.66) {
    // More on left
    leftCount = randInt(2, maxVal);
    rightCount = randInt(1, leftCount - 1);
    answer = Math.random() > 0.5 ? 'more' : 'less';
    question = answer === 'more' ? 'Which side has MORE?' : 'Which side has LESS?';
  } else {
    // More on right
    rightCount = randInt(2, maxVal);
    leftCount = randInt(1, rightCount - 1);
    answer = Math.random() > 0.5 ? 'more' : 'less';
    question = answer === 'more' ? 'Which side has MORE?' : 'Which side has LESS?';
  }

  return { leftCount, rightCount, answer, question, emoji };
}

/** Map answer type to the pre-gen clip ID for the question */
function questionClipId(answer: CompareAnswer): string {
  if (answer === 'equal') return 'ui-equal';
  if (answer === 'more') return 'ui-more';
  return 'ui-less';
}

/** Build a spoken relationship string, e.g. "5 is more than 3" */
function relationship(left: number, right: number): string {
  if (left === right) return `Both sides have ${numberToWords(left)}. They are equal!`;
  if (left > right) return `${numberToWords(left)} is more than ${numberToWords(right)}.`;
  return `${numberToWords(left)} is less than ${numberToWords(right)}.`;
}

export default function CompareGame() {
  const [round, setRound] = useState<Round | null>(null);
  const [selected, setSelected] = useState<'left' | 'right' | 'equal' | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [roundCount, setRoundCount] = useState(0);
  const [verbosity, setVerbosity] = useState<Verbosity>('medium');
  const { addCorrect, addWrong, score, streak, resetGame, triggerCelebration } = useGameStore();
  const verbosityRef = useRef(verbosity);
  verbosityRef.current = verbosity;

  // ─── Voice: announce round ─────────────────────────

  const announceRound = useCallback((r: Round) => {
    const v = verbosityRef.current;

    // All levels: read the question aloud
    const clipId = questionClipId(r.answer);
    const fallback = r.question;
    audio.speakByIdImmediate(clipId, fallback);

    if (v === 'medium' || v === 'full') {
      // Say both numbers: "{left} versus {right}"
      audio.sayByIdAsync(`number-${r.leftCount}`, numberToWords(r.leftCount));
      audio.sayAsync('versus');
      audio.sayByIdAsync(`number-${r.rightCount}`, numberToWords(r.rightCount));
    }

    if (v === 'full') {
      // Explain the concept
      const concept =
        r.answer === 'more' ? 'Find the group with more. More means the bigger number!'
        : r.answer === 'less' ? 'Find the group with less. Less means the smaller number!'
        : 'Check if both groups have the same number!';
      audio.sayAsync(concept);
    }
  }, []);

  // ─── Voice: feedback on answer ─────────────────────

  function announceFeedback(r: Round, correct: boolean) {
    const v = verbosityRef.current;

    if (v === 'light') {
      // SFX only — already played by caller
      return;
    }

    if (v === 'medium') {
      if (correct) {
        const idx = Math.floor(Math.random() * PRAISE.length);
        audio.sayByIdAsync(PRAISE_IDS[idx], PRAISE[idx]);
      } else {
        audio.sayByIdAsync('ui-try-again', 'Oops! Try again!');
      }
      return;
    }

    // Full
    if (correct) {
      const idx = Math.floor(Math.random() * PRAISE.length);
      audio.sayByIdAsync(PRAISE_IDS[idx], PRAISE[idx]);
      audio.sayAsync(relationship(r.leftCount, r.rightCount));
    } else {
      audio.sayAsync(`Not quite! ${relationship(r.leftCount, r.rightCount)}`);
    }
  }

  // ─── Game logic ────────────────────────────────────

  const nextRound = useCallback(() => {
    const r = generateRound(difficulty);
    setRound(r);
    setSelected(null);
    setIsCorrect(null);
    setRoundCount((prev) => prev + 1);
    // Small delay so the UI renders before voice starts
    setTimeout(() => announceRound(r), 300);
  }, [difficulty, announceRound]);

  useEffect(() => {
    resetGame();
    nextRound();
  }, [nextRound, resetGame]);

  function checkAnswer(choice: 'left' | 'right' | 'equal') {
    if (selected || !round) return;
    setSelected(choice);

    let correct = false;

    if (round.answer === 'equal') {
      correct = choice === 'equal';
    } else if (round.answer === 'more') {
      correct = (choice === 'left' && round.leftCount > round.rightCount) ||
                (choice === 'right' && round.rightCount > round.leftCount);
    } else {
      // 'less'
      correct = (choice === 'left' && round.leftCount < round.rightCount) ||
                (choice === 'right' && round.rightCount < round.leftCount);
    }

    setIsCorrect(correct);

    if (correct) {
      addCorrect();
      audio.playCorrect();
      recordMathProgress(round.answer, true).catch(() => {});
      useBadgeStore.getState().checkAndAward({ mathCorrect: 1 });
      if ((score + 1) % 5 === 0) triggerCelebration();
      if (streak > 0 && streak % 3 === 0) setDifficulty((d) => Math.min(d + 1, 5));
    } else {
      addWrong();
      audio.playWrong();
      recordMathProgress(round.answer, false).catch(() => {});
    }

    // Voice feedback after a short beat (let the SFX ring)
    setTimeout(() => announceFeedback(round, correct), 600);

    setTimeout(nextRound, correct ? 2400 : 3000);
  }

  if (!round) return null;

  const renderGroup = (count: number, side: 'left' | 'right') => (
    <motion.button
      className={`flex-1 flex flex-wrap justify-center items-center gap-1 p-4 rounded-3xl min-h-[120px] transition-all ${
        selected === side
          ? isCorrect
            ? 'bg-green-200/80 ring-4 ring-green-400'
            : 'bg-red-200/80 ring-4 ring-red-400'
          : 'bg-white/40 active:bg-white/60'
      }`}
      onClick={() => checkAnswer(side)}
      whileTap={{ scale: 0.97 }}
      disabled={!!selected}
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="text-3xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.03 }}
        >
          {round.emoji}
        </motion.span>
      ))}
      <div className="w-full text-center text-white font-bold text-xl mt-2">
        {count}
      </div>
    </motion.button>
  );

  const VERBOSITY_OPTIONS: { key: Verbosity; icon: React.ReactNode; label: string }[] = [
    { key: 'light', icon: <Volume2 size={14} />, label: 'Quiet' },
    { key: 'medium', icon: <MessageSquare size={14} />, label: 'Medium' },
    { key: 'full', icon: <MessageSquareMore size={14} />, label: 'Chatty' },
  ];

  return (
    <GameShell title="More or Less?" emoji="⚖️" bgClass="bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500">
      {/* Verbosity toggle */}
      <div className="flex justify-center gap-1 mb-3">
        {VERBOSITY_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setVerbosity(opt.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              verbosity === opt.key
                ? 'bg-white/90 text-emerald-700 shadow-md'
                : 'bg-white/20 text-white/80 hover:bg-white/30'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Question */}
      <motion.p
        key={roundCount}
        className="text-center text-2xl font-bold text-white drop-shadow mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {round.question}
      </motion.p>

      {/* Two groups side by side */}
      <div className="flex gap-4 mb-6 max-w-lg mx-auto">
        {renderGroup(round.leftCount, 'left')}
        <div className="flex items-center text-4xl text-white/50 font-bold">vs</div>
        {renderGroup(round.rightCount, 'right')}
      </div>

      {/* Equal button */}
      <div className="flex justify-center mb-4">
        <Button
          variant={selected === 'equal' ? (isCorrect ? 'success' : 'destructive') : 'outline'}
          size="lg"
          onClick={() => checkAnswer('equal')}
          disabled={!!selected}
          className="bg-white/70 text-foreground text-lg"
        >
          They're Equal! =
        </Button>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {isCorrect !== null && (
          <motion.p
            className={`text-center text-2xl font-bold ${isCorrect ? 'text-green-100' : 'text-red-100'}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            {isCorrect ? 'Correct! 🎉' : `Not quite! ${round.leftCount} ${round.leftCount === round.rightCount ? '=' : round.leftCount > round.rightCount ? '>' : '<'} ${round.rightCount}`}
          </motion.p>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
