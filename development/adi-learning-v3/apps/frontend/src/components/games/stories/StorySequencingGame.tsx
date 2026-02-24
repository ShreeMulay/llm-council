import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordStoryProgress } from '@/services/api';
import { STORIES, type Story, type StoryCard } from '@/data/storyData';
import { StoryIllustration } from './StoryIllustration';
import { shuffle } from '@/lib/utils';
import { useBadgeStore } from '@/stores/badgeStore';

export default function StorySequencingGame() {
  const [storyIndex, setStoryIndex] = useState(0);
  const [shuffledCards, setShuffledCards] = useState<StoryCard[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const { addCorrect, addWrong, score, resetGame, triggerCelebration } = useGameStore();

  const story = STORIES[storyIndex];

  const setupStory = useCallback(() => {
    setShuffledCards(shuffle([...STORIES[storyIndex].cards]));
    setSubmitted(false);
    setIsCorrect(null);
  }, [storyIndex]);

  useEffect(() => {
    resetGame();
    setupStory();
  }, [resetGame, setupStory]);

  function handleCheck() {
    if (submitted) return;
    setSubmitted(true);

    const correct = shuffledCards.every((card, i) => card.order === i + 1);
    setIsCorrect(correct);

    if (correct) {
      addCorrect();
      audio.playSuccess();
      recordStoryProgress(story.id, true).catch(() => {});
      useBadgeStore.getState().checkAndAward({ storiesCompleted: 1 });

      // Narrate the story in order
      const narration = story.cards.map((c) => c.text).join('. ');
      audio.sayAsync(narration);

      if ((score + 1) % 3 === 0) triggerCelebration();
    } else {
      addWrong();
      audio.playWrong();
      recordStoryProgress(story.id, false).catch(() => {});
      audio.sayAsync('Not quite! Try to put the cards in order.');

      // Reset after delay so they can try again
      setTimeout(() => {
        setSubmitted(false);
        setIsCorrect(null);
      }, 2000);
    }
  }

  function nextStory() {
    setStoryIndex((i) => (i + 1) % STORIES.length);
  }

  const progress = ((storyIndex + 1) / STORIES.length) * 100;

  return (
    <GameShell title="Story Cards" emoji="📖" progress={progress} bgClass="bg-gradient-to-br from-purple-400 via-fuchsia-400 to-pink-400">
      <div className="flex flex-col items-center gap-4 mt-2">
        {/* Story title */}
        <motion.h2
          key={story.id}
          className="text-2xl font-bold text-white text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {story.title}
        </motion.h2>
        <p className="text-white/70 text-sm">Drag the cards into the right order!</p>

        {/* Reorderable cards */}
        <Reorder.Group
          axis="y"
          values={shuffledCards}
          onReorder={setShuffledCards}
          className="flex flex-col gap-3 w-full max-w-md"
        >
          {shuffledCards.map((card, i) => (
            <Reorder.Item
              key={card.order}
              value={card}
              className={`flex items-center gap-4 p-4 rounded-2xl cursor-grab active:cursor-grabbing transition-colors ${
                submitted
                  ? card.order === i + 1
                    ? 'bg-green-200/80 border-2 border-green-400'
                    : 'bg-red-200/80 border-2 border-red-400'
                  : 'bg-white/40 backdrop-blur border-2 border-white/30'
              }`}
              whileDrag={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
            >
              <span className="text-xs text-white/50 font-bold w-6">{i + 1}.</span>
              <StoryIllustration storyId={story.id} order={card.order} size={56} />
              <span className="text-lg font-semibold text-white flex-1">{card.text}</span>
              <span className="text-white/30 text-2xl">&#x283F;</span>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* Action buttons */}
        <div className="flex gap-4 mt-2">
          {!submitted ? (
            <Button variant="default" size="lg" onClick={handleCheck} className="text-xl">
              Check Order! ✓
            </Button>
          ) : isCorrect ? (
            <Button variant="success" size="lg" onClick={nextStory} className="text-xl">
              Next Story →
            </Button>
          ) : null}

          <Button variant="outline" size="lg" onClick={setupStory} className="bg-white/60">
            Shuffle
          </Button>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {isCorrect !== null && (
            <motion.p
              className={`text-2xl font-bold ${isCorrect ? 'text-green-100' : 'text-red-100'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {isCorrect ? 'Perfect order! 📖✨' : 'Try again! You can do it! 💪'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </GameShell>
  );
}
