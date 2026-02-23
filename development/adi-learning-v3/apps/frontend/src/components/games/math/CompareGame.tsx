import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordMathProgress } from '@/services/api';
import { randInt } from '@/lib/utils';

type CompareAnswer = 'more' | 'less' | 'equal';

const GROUP_EMOJIS = ['⭐', '🍎', '🌸', '💎', '🦋', '🐟', '🌈', '🎈'];

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

export default function CompareGame() {
  const [round, setRound] = useState<Round | null>(null);
  const [selected, setSelected] = useState<'left' | 'right' | 'equal' | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [roundCount, setRoundCount] = useState(0);
  const { addCorrect, addWrong, score, streak, resetGame, triggerCelebration } = useGameStore();

  const nextRound = useCallback(() => {
    setRound(generateRound(difficulty));
    setSelected(null);
    setIsCorrect(null);
    setRoundCount((r) => r + 1);
  }, [difficulty]);

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
      if ((score + 1) % 5 === 0) triggerCelebration();
      if (streak > 0 && streak % 3 === 0) setDifficulty((d) => Math.min(d + 1, 5));
    } else {
      addWrong();
      audio.playWrong();
      recordMathProgress(round.answer, false).catch(() => {});
    }

    setTimeout(nextRound, 1800);
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

  return (
    <GameShell title="More or Less?" emoji="⚖️" bgClass="bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500">
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
