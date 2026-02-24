import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordWritingProgress } from '@/services/api';
import { LETTER_DATA, type CharacterData, type Stroke } from '@/data/strokeData';

const FIRST_NAME = 'Adalyn';
const LAST_NAME = 'Mulay';

// ─── SVG Path Sampling ─────────────────────────────────
// Uses an offscreen SVG <path> element + getPointAtLength() to
// sample equidistant points along a guide path for comparison.

function samplePathPoints(
  pathData: string,
  scale: number,
  numSamples: number = 30,
): Array<{ x: number; y: number }> {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const path = document.createElementNS(ns, 'path');

  // Scale the path coordinates
  const scaledPath = pathData.replace(/(\d+\.?\d*)/g, (m) =>
    String(parseFloat(m) * scale),
  );
  path.setAttribute('d', scaledPath);
  svg.appendChild(path);
  // Must be in DOM briefly for getPointAtLength to work
  svg.style.position = 'absolute';
  svg.style.left = '-9999px';
  document.body.appendChild(svg);

  const totalLen = path.getTotalLength();
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= numSamples; i++) {
    const pt = path.getPointAtLength((i / numSamples) * totalLen);
    points.push({ x: pt.x, y: pt.y });
  }

  document.body.removeChild(svg);
  return points;
}

// ─── Accuracy Calculation ──────────────────────────────

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Compare user-drawn points against the guide path.
 *
 * Score is based on two factors:
 *   1. Proximity: average nearest-neighbor distance from guide points to user points
 *   2. Coverage: what fraction of the guide path has at least one user point nearby
 *
 * Both are combined into a 0-100 score.
 */
function computeAccuracy(
  userPoints: Array<{ x: number; y: number }>,
  guidePoints: Array<{ x: number; y: number }>,
  canvasSize: number,
): number {
  if (userPoints.length < 3 || guidePoints.length < 2) return 30;

  // 1. Proximity: for each guide point, find nearest user point
  const threshold = canvasSize * 0.15; // 15% of canvas = "close enough"
  let totalDist = 0;
  let coveredCount = 0;

  for (const gp of guidePoints) {
    let minD = Infinity;
    for (const up of userPoints) {
      const d = dist(gp, up);
      if (d < minD) minD = d;
    }
    totalDist += Math.min(minD, threshold);
    if (minD < threshold) coveredCount++;
  }

  const avgDist = totalDist / guidePoints.length;
  // Proximity score: 0 dist = 100, threshold dist = 0
  const proximityScore = Math.max(0, 1 - avgDist / threshold) * 100;

  // 2. Coverage: fraction of guide points that had a nearby user point
  const coverageRatio = coveredCount / guidePoints.length;
  const coverageScore = Math.min(coverageRatio / 0.6, 1) * 100; // 60% coverage = full marks

  // Weighted combination: 60% proximity, 40% coverage
  const raw = proximityScore * 0.6 + coverageScore * 0.4;

  // Clamp to 0-100 and round
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ─── Tracing Canvas ────────────────────────────────────

interface TracingCanvasProps {
  letterData: CharacterData;
  onComplete: (accuracy: number) => void;
  size: number;
}

function TracingCanvas({ letterData, onComplete, size }: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [completedStrokes, setCompletedStrokes] = useState<
    Array<Array<{ x: number; y: number }>>
  >([]);
  const [strokeAccuracies, setStrokeAccuracies] = useState<number[]>([]);
  const scale = size / 100;

  // Redraw canvas whenever state changes
  useEffect(() => {
    drawCanvas();
  }, [letterData, strokeIndex, completedStrokes]);

  function drawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw all guide strokes
    letterData.strokes.forEach((stroke, i) => {
      const path = new Path2D(scalePathData(stroke.path));
      if (i < strokeIndex) {
        // Already completed — faint
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
      } else if (i === strokeIndex) {
        // Current stroke — dashed purple guide
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 8;
        ctx.setLineDash([10, 5]);
      } else {
        // Future stroke — very faint
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.15)';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    });
    ctx.setLineDash([]);

    // 2. Draw user's completed strokes (solid purple)
    for (const strokePts of completedStrokes) {
      if (strokePts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(strokePts[0].x, strokePts[0].y);
      for (let i = 1; i < strokePts.length; i++) {
        ctx.lineTo(strokePts[i].x, strokePts[i].y);
      }
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // 3. Draw start dot for current stroke
    if (strokeIndex < letterData.strokes.length) {
      const start = letterData.strokes[strokeIndex].startPoint;
      ctx.beginPath();
      ctx.arc(start.x * scale, start.y * scale, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7';
      ctx.fill();

      // End dot (lighter)
      const end = letterData.strokes[strokeIndex].endPoint;
      ctx.beginPath();
      ctx.arc(end.x * scale, end.y * scale, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.fill();
    }
  }

  function scalePathData(path: string): string {
    return path.replace(/(\d+\.?\d*)/g, (match) =>
      String(parseFloat(match) * scale),
    );
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
    setCurrentPoints([pos]);
    drawUserDot(pos);
  }

  function handleMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentPoints((prev) => [...prev, pos]);
    drawUserLine(pos);
  }

  function handleEnd() {
    if (!isDrawing) return;
    setIsDrawing(false);

    const currentStroke = letterData.strokes[strokeIndex];
    if (!currentStroke) return;

    // Sample the guide path
    const guidePoints = samplePathPoints(currentStroke.path, scale, 40);

    // Compute accuracy for this stroke
    const accuracy = computeAccuracy(currentPoints, guidePoints, size);
    audio.playSparkle();

    // Save this stroke's points and accuracy
    const newCompleted = [...completedStrokes, [...currentPoints]];
    const newAccuracies = [...strokeAccuracies, accuracy];
    setCompletedStrokes(newCompleted);
    setStrokeAccuracies(newAccuracies);

    if (strokeIndex < letterData.strokes.length - 1) {
      // More strokes to go
      setStrokeIndex(strokeIndex + 1);
      setCurrentPoints([]);
    } else {
      // All strokes done — compute overall accuracy as weighted average by stroke length
      const overall = newAccuracies.length > 0
        ? Math.round(newAccuracies.reduce((a, b) => a + b, 0) / newAccuracies.length)
        : 50;
      onComplete(overall);
    }
  }

  function drawUserDot(pos: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();
  }

  function drawUserLine(pos: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || currentPoints.length < 1) return;
    const prev = currentPoints[currentPoints.length - 1];
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.stroke();
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

// ─── Name Writing Game ─────────────────────────────────

export default function NameWritingGame() {
  const [phase, setPhase] = useState<'first' | 'last'>('first');
  const [charIndex, setCharIndex] = useState(0);
  const [completedLetters, setCompletedLetters] = useState<string[]>([]);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const { score, addCorrect, resetGame, triggerCelebration } = useGameStore();

  const name = phase === 'first' ? FIRST_NAME : LAST_NAME;
  const currentChar = name[charIndex];
  const letterData = LETTER_DATA[currentChar];

  useEffect(() => {
    resetGame();
    audio.sayAsync(`Let's write your ${phase === 'first' ? 'first' : 'last'} name! Start with the letter ${currentChar}.`);
  }, [phase]);

  function handleLetterComplete(accuracy: number) {
    setLastAccuracy(accuracy);
    recordWritingProgress(currentChar, accuracy).catch(() => {});
    addCorrect();

    if (accuracy >= 70) {
      audio.playSuccess();
    } else {
      audio.playSparkle();
    }

    setCompletedLetters((prev) => [...prev, currentChar]);

    // Brief delay to show accuracy, then advance
    setTimeout(() => {
      setLastAccuracy(null);

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
        }, 2500);
      } else {
        triggerCelebration();
        audio.sayAsync(`Wonderful! You wrote your whole name: ${FIRST_NAME} ${LAST_NAME}!`);
      }
    }, 1200);
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

        {/* Accuracy feedback */}
        <AnimatePresence>
          {lastAccuracy !== null && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className={`text-2xl font-bold ${
                lastAccuracy >= 80 ? 'text-green-100' :
                lastAccuracy >= 50 ? 'text-yellow-100' :
                'text-red-100'
              }`}>
                {lastAccuracy >= 80 ? 'Great tracing!' :
                 lastAccuracy >= 50 ? 'Good try!' :
                 'Keep practicing!'}{' '}
                {lastAccuracy >= 80 ? '🌟' : lastAccuracy >= 50 ? '👍' : '💪'}
              </p>
              <p className="text-white/60 text-sm">Accuracy: {lastAccuracy}%</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip/Redo */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/60"
            onClick={() => handleLetterComplete(40)}
          >
            Skip Letter
          </Button>
        </div>
      </div>
    </GameShell>
  );
}
