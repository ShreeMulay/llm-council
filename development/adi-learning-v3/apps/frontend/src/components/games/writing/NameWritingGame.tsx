import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordWritingProgress } from '@/services/api';
import { LETTER_DATA, type CharacterData } from '@/data/strokeData';

const FIRST_NAME = 'Adalyn';
const LAST_NAME = 'Mulay';

interface TracingCanvasProps {
  letterData: CharacterData;
  onComplete: (accuracy: number) => void;
  size: number;
}

function TracingCanvas({ letterData, onComplete, size }: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const scale = size / 100;

  useEffect(() => {
    drawGuide();
  }, [letterData, strokeIndex]);

  function drawGuide() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // Draw all strokes as light guides
    letterData.strokes.forEach((stroke, i) => {
      const path = new Path2D(scalePathData(stroke.path));
      ctx.strokeStyle = i === strokeIndex ? 'rgba(168, 85, 247, 0.4)' : 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = i === strokeIndex ? 8 : 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(i === strokeIndex ? [10, 5] : []);
      ctx.stroke(path);
    });

    // Draw start dot for current stroke
    if (strokeIndex < letterData.strokes.length) {
      const start = letterData.strokes[strokeIndex].startPoint;
      ctx.beginPath();
      ctx.arc(start.x * scale, start.y * scale, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7';
      ctx.fill();
      ctx.setLineDash([]);
    }

    // Draw user's previous completed strokes
    // (Stored strokes would go here in a full implementation)
  }

  function scalePathData(path: string): string {
    return path.replace(/(\d+\.?\d*)/g, (match) => {
      return String(parseFloat(match) * scale);
    });
  }

  function getPos(e: React.TouchEvent | React.MouseEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }

  function handleStart(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    setPoints([pos]);
    drawDot(pos);
  }

  function handleMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setPoints((prev) => [...prev, pos]);
    drawLine(pos);
  }

  function handleEnd() {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Calculate simple accuracy based on proximity to guide
    const accuracy = calculateAccuracy();
    audio.playSparkle();

    if (strokeIndex < letterData.strokes.length - 1) {
      setStrokeIndex(strokeIndex + 1);
      setPoints([]);
    } else {
      // All strokes done
      onComplete(accuracy);
    }
  }

  function drawDot(pos: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();
  }

  function drawLine(pos: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || points.length < 1) return;
    const prev = points[points.length - 1];
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.stroke();
  }

  function calculateAccuracy(): number {
    // Simplified accuracy: check if user traced in roughly the right direction
    if (points.length < 5) return 50;
    return Math.min(100, 60 + Math.random() * 30); // Placeholder - real impl would compare to path
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="bg-white/20 rounded-2xl border-2 border-white/30 touch-none"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    />
  );
}

export default function NameWritingGame() {
  const [phase, setPhase] = useState<'first' | 'last'>('first');
  const [charIndex, setCharIndex] = useState(0);
  const [completedLetters, setCompletedLetters] = useState<string[]>([]);
  const { score, addCorrect, resetGame, triggerCelebration } = useGameStore();

  const name = phase === 'first' ? FIRST_NAME : LAST_NAME;
  const currentChar = name[charIndex];
  const letterData = LETTER_DATA[currentChar];

  useEffect(() => {
    resetGame();
    audio.sayAsync(`Let's write your ${phase === 'first' ? 'first' : 'last'} name! Start with the letter ${currentChar}.`);
  }, [phase]);

  function handleLetterComplete(accuracy: number) {
    recordWritingProgress(currentChar, accuracy).catch(() => {});
    addCorrect();
    audio.playSuccess();

    setCompletedLetters((prev) => [...prev, currentChar]);

    if (charIndex < name.length - 1) {
      setCharIndex(charIndex + 1);
      const nextChar = name[charIndex + 1];
      audio.sayAsync(`Great! Now write ${nextChar}.`);
    } else if (phase === 'first') {
      triggerCelebration();
      audio.sayAsync(`Amazing! You wrote ${FIRST_NAME}! Now let's write your last name.`);
      setTimeout(() => {
        setPhase('last');
        setCharIndex(0);
        setCompletedLetters([]);
      }, 3000);
    } else {
      triggerCelebration();
      audio.sayAsync(`Wonderful! You wrote your whole name: ${FIRST_NAME} ${LAST_NAME}!`);
    }
  }

  const progress = ((completedLetters.length) / name.length) * 100;

  return (
    <GameShell title="Write My Name" emoji="✍️" progress={progress} bgClass="bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500">
      <div className="flex flex-col items-center gap-4">
        {/* Name display */}
        <div className="flex gap-1 text-4xl font-bold">
          {name.split('').map((char, i) => (
            <span
              key={i}
              className={`px-1 ${
                i < charIndex
                  ? 'text-green-200'
                  : i === charIndex
                    ? 'text-white underline decoration-4 underline-offset-4'
                    : 'text-white/40'
              }`}
            >
              {char}
            </span>
          ))}
        </div>

        <p className="text-white/80 text-lg">
          {phase === 'first' ? 'First Name' : 'Last Name'} - Trace the letter <strong>{currentChar}</strong>
        </p>

        {/* Tracing canvas */}
        {letterData ? (
          <TracingCanvas
            key={`${phase}-${charIndex}`}
            letterData={letterData}
            onComplete={handleLetterComplete}
            size={280}
          />
        ) : (
          <div className="w-[280px] h-[280px] bg-white/20 rounded-2xl flex items-center justify-center">
            <span className="text-8xl text-white/60">{currentChar}</span>
          </div>
        )}

        {/* Skip/Redo */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/60"
            onClick={() => handleLetterComplete(50)}
          >
            Skip Letter
          </Button>
        </div>
      </div>
    </GameShell>
  );
}
