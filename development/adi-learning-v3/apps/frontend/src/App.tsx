import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeHub from '@/components/hub/HomeHub';

// Lazy-load game routes — each becomes its own chunk
const CountingGame = lazy(() => import('@/components/games/counting/CountingGame'));
const CompareGame = lazy(() => import('@/components/games/math/CompareGame'));
const LetterSoundsGame = lazy(() => import('@/components/games/phonics/LetterSoundsGame'));
const RhymeGame = lazy(() => import('@/components/games/phonics/RhymeGame'));
const StorySequencingGame = lazy(() => import('@/components/games/stories/StorySequencingGame'));
const NameWritingGame = lazy(() => import('@/components/games/writing/NameWritingGame'));

function GameLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        <p className="text-white text-lg font-medium">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-full w-full">
        <Suspense fallback={<GameLoader />}>
          <Routes>
            <Route path="/" element={<HomeHub />} />
            <Route path="/game/counting" element={<CountingGame />} />
            <Route path="/game/compare" element={<CompareGame />} />
            <Route path="/game/letter-sounds" element={<LetterSoundsGame />} />
            <Route path="/game/rhymes" element={<RhymeGame />} />
            <Route path="/game/stories" element={<StorySequencingGame />} />
            <Route path="/game/name-writing" element={<NameWritingGame />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
