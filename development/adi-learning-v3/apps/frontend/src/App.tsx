import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeHub from '@/components/hub/HomeHub';
import CountingGame from '@/components/games/counting/CountingGame';
import CompareGame from '@/components/games/math/CompareGame';
import LetterSoundsGame from '@/components/games/phonics/LetterSoundsGame';
import RhymeGame from '@/components/games/phonics/RhymeGame';
import StorySequencingGame from '@/components/games/stories/StorySequencingGame';
import NameWritingGame from '@/components/games/writing/NameWritingGame';

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-full w-full">
        <Routes>
          <Route path="/" element={<HomeHub />} />
          <Route path="/game/counting" element={<CountingGame />} />
          <Route path="/game/compare" element={<CompareGame />} />
          <Route path="/game/letter-sounds" element={<LetterSoundsGame />} />
          <Route path="/game/rhymes" element={<RhymeGame />} />
          <Route path="/game/stories" element={<StorySequencingGame />} />
          <Route path="/game/name-writing" element={<NameWritingGame />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
