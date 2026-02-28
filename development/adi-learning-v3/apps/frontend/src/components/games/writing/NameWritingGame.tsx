import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '@/components/ui/GameShell';
import { Button } from '@/components/ui/button';
import { audio } from '@/services/audio';
import { useGameStore } from '@/stores/gameStore';
import { recordWritingProgress } from '@/services/api';
import {
  LETTER_DATA,
  STROKE_COLORS,
  type CharacterData,
  type Stroke,
} from '@/data/strokeData';
import { useBadgeStore } from '@/stores/badgeStore';

const FIRST_NAME = 'Adalyn';
const LAST_NAME = 'Mulay';

// ─── Types ─────────────────────────────────────────────

type TracePhase = 'watch' | 'guided' | 'free';

// ─── SVG Path Helpers ──────────────────────────────────

/** Create an off-screen SVG path element to measure / sample */
function createMeasurePath(pathData: string, scale: number): {
  path: SVGPathElement;
  svg: SVGSVGElement;
} {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const path = document.createElementNS(ns, 'path');
  const scaled = scalePathData(pathData, scale);
  path.setAttribute('d', scaled);
  svg.appendChild(path);
  svg.style.position = 'absolute';
  svg.style.left = '-9999px';
  document.body.appendChild(svg);
  return { path, svg };
}

/** Scale all numbers in an SVG path string */
function scalePathData(pathStr: string, scale: number): string {
  return pathStr.replace(/(\d+\.?\d*)/g, (m) =>
    String(parseFloat(m) * scale),
  );
}

/** Sample equidistant points along a path */
function samplePathPoints(
  pathData: string,
  scale: number,
  numSamples = 30,
): Array<{ x: number; y: number }> {
  const { path, svg } = createMeasurePath(pathData, scale);
  const totalLen = path.getTotalLength();
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= numSamples; i++) {
    const pt = path.getPointAtLength((i / numSamples) * totalLen);
    points.push({ x: pt.x, y: pt.y });
  }
  document.body.removeChild(svg);
  return points;
}

/** Get the total length of a path */
function getPathLength(pathData: string, scale: number): number {
  const { path, svg } = createMeasurePath(pathData, scale);
  const len = path.getTotalLength();
  document.body.removeChild(svg);
  return len;
}

/** Get the point at a given fraction (0–1) along a path */
function getPointAtFraction(
  pathData: string,
  scale: number,
  fraction: number,
): { x: number; y: number } {
  const { path, svg } = createMeasurePath(pathData, scale);
  const totalLen = path.getTotalLength();
  const pt = path.getPointAtLength(fraction * totalLen);
  document.body.removeChild(svg);
  return { x: pt.x, y: pt.y };
}

/** Get a direction angle at a point along the path (for arrows) */
function getDirectionAtFraction(
  pathData: string,
  scale: number,
  fraction: number,
): number {
  const epsilon = 0.005;
  const f1 = Math.max(0, fraction - epsilon);
  const f2 = Math.min(1, fraction + epsilon);
  const p1 = getPointAtFraction(pathData, scale, f1);
  const p2 = getPointAtFraction(pathData, scale, f2);
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

// ─── Accuracy ──────────────────────────────────────────

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function computeAccuracy(
  userPoints: Array<{ x: number; y: number }>,
  guidePoints: Array<{ x: number; y: number }>,
  canvasSize: number,
): number {
  if (userPoints.length < 3 || guidePoints.length < 2) return 30;
  const threshold = canvasSize * 0.15;
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
  const proximityScore = Math.max(0, 1 - avgDist / threshold) * 100;
  const coverageRatio = coveredCount / guidePoints.length;
  const coverageScore = Math.min(coverageRatio / 0.6, 1) * 100;
  const raw = proximityScore * 0.6 + coverageScore * 0.4;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ─── SVG Guide Overlay ─────────────────────────────────
// Renders guide paths, directional arrows, numbered start dots,
// and the animated demo dot. Sits on top of the canvas with
// pointer-events: none.

interface GuideOverlayProps {
  letterData: CharacterData;
  size: number;
  strokeIndex: number;
  phase: TracePhase;
  /** 0–1 fraction of demo animation progress per stroke */
  animProgress: number[];
  /** Which stroke the demo is currently animating (-1 = not animating) */
  animatingStroke: number;
  showArrows: boolean;
}

function GuideOverlay({
  letterData,
  size,
  strokeIndex,
  phase,
  animProgress,
  animatingStroke,
  showArrows,
}: GuideOverlayProps) {
  const scale = size / 100;

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${size} ${size}`}
    >
      {letterData.strokes.map((stroke, i) => {
        const color = STROKE_COLORS[i % STROKE_COLORS.length];
        const isComplete = i < strokeIndex;
        const isCurrent = i === strokeIndex;
        const isFuture = i > strokeIndex;
        const isAnimating = animatingStroke === i;

        // Determine opacity based on phase and state
        let opacity = 0.15;
        if (phase === 'watch') {
          opacity = isAnimating ? 0.5 : animProgress[i] > 0 ? 0.3 : 0.15;
        } else if (phase === 'guided') {
          opacity = isCurrent ? 0.5 : isComplete ? 0.2 : 0.15;
        } else {
          // free
          opacity = isCurrent ? 0.25 : isComplete ? 0.1 : 0.1;
        }

        const scaledPath = scalePathData(stroke.path, scale);

        return (
          <g key={i}>
            {/* Guide path */}
            <path
              d={scaledPath}
              fill="none"
              stroke={color}
              strokeWidth={phase === 'free' ? 4 : 6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isCurrent || isAnimating ? '8 4' : 'none'}
              opacity={opacity}
            />

            {/* Directional arrows (not in free mode) */}
            {showArrows &&
              (isCurrent || isAnimating || phase === 'watch') &&
              [0.2, 0.5, 0.8].map((frac) => {
                const pt = getPointAtFraction(stroke.path, scale, frac);
                const angle = getDirectionAtFraction(stroke.path, scale, frac);
                return (
                  <polygon
                    key={`arr-${i}-${frac}`}
                    points="-5,-3 5,0 -5,3"
                    fill={color}
                    opacity={opacity + 0.2}
                    transform={`translate(${pt.x},${pt.y}) rotate(${angle})`}
                  />
                );
              })}

            {/* Start dot with stroke number */}
            {(isCurrent || phase === 'watch') && (
              <>
                <circle
                  cx={stroke.startPoint.x * scale}
                  cy={stroke.startPoint.y * scale}
                  r={10}
                  fill={color}
                  opacity={0.9}
                />
                <text
                  x={stroke.startPoint.x * scale}
                  y={stroke.startPoint.y * scale + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {i + 1}
                </text>
              </>
            )}

            {/* End dot (smaller, lighter) */}
            {isCurrent && phase !== 'watch' && (
              <circle
                cx={stroke.endPoint.x * scale}
                cy={stroke.endPoint.y * scale}
                r={6}
                fill={color}
                opacity={0.3}
              />
            )}

            {/* Animated demo dot */}
            {isAnimating && animProgress[i] !== undefined && animProgress[i] < 1 && (
              (() => {
                const pt = getPointAtFraction(
                  stroke.path,
                  scale,
                  animProgress[i],
                );
                return (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={8}
                    fill={color}
                    stroke="white"
                    strokeWidth={3}
                  >
                    <animate
                      attributeName="r"
                      values="8;10;8"
                      dur="0.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })()
            )}

            {/* Guided mode: leader dot */}
            {phase === 'guided' && isCurrent && !isAnimating && (
              (() => {
                // Leader dot sits at a fixed progress point ahead of the user
                // For simplicity, place it at 50% through the current stroke
                // A more advanced version would track user progress
                return null; // Leader dot handled separately in TracingCanvas
              })()
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Letter Demo (Watch Phase) ─────────────────────────

interface LetterDemoProps {
  letterData: CharacterData;
  size: number;
  onComplete: () => void;
}

function LetterDemo({ letterData, size, onComplete }: LetterDemoProps) {
  const [animatingStroke, setAnimatingStroke] = useState(-1);
  const [animProgress, setAnimProgress] = useState<number[]>(
    letterData.strokes.map(() => 0),
  );
  const animRef = useRef<number | null>(null);
  const cueSpokenRef = useRef<Set<number>>(new Set());

  const runDemo = useCallback(() => {
    cueSpokenRef.current.clear();
    let currentStroke = 0;
    let startTime = 0;
    const STROKE_DURATION = 1200; // ms per stroke
    const PAUSE_BETWEEN = 500;

    function animateStroke(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const fraction = Math.min(elapsed / STROKE_DURATION, 1);

      // Speak cue at start of each stroke
      if (!cueSpokenRef.current.has(currentStroke)) {
        cueSpokenRef.current.add(currentStroke);
        const cue = letterData.strokes[currentStroke].cue;
        audio.sayAsync(cue);
      }

      setAnimatingStroke(currentStroke);
      setAnimProgress((prev) => {
        const next = [...prev];
        next[currentStroke] = fraction;
        return next;
      });

      if (fraction < 1) {
        animRef.current = requestAnimationFrame(animateStroke);
      } else {
        // Stroke complete — pause, then next stroke or finish
        currentStroke++;
        if (currentStroke < letterData.strokes.length) {
          startTime = 0;
          setTimeout(() => {
            animRef.current = requestAnimationFrame(animateStroke);
          }, PAUSE_BETWEEN);
        } else {
          // All strokes done
          setAnimatingStroke(-1);
          setTimeout(onComplete, 600);
        }
      }
    }

    // Reset state
    setAnimProgress(letterData.strokes.map(() => 0));
    setAnimatingStroke(0);
    animRef.current = requestAnimationFrame(animateStroke);
  }, [letterData, onComplete]);

  useEffect(() => {
    // Start demo after a brief pause
    const timer = setTimeout(runDemo, 400);
    return () => {
      clearTimeout(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [runDemo]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background canvas (blank white) */}
      <canvas
        width={size}
        height={size}
        className="bg-white/20 rounded-2xl border-2 border-white/30"
      />
      {/* SVG overlay with animated guide */}
      <GuideOverlay
        letterData={letterData}
        size={size}
        strokeIndex={0}
        phase="watch"
        animProgress={animProgress}
        animatingStroke={animatingStroke}
        showArrows={true}
      />
      {/* Label */}
      <div className="absolute -bottom-8 left-0 right-0 text-center">
        <motion.p
          className="text-white/80 text-sm font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Watch how to write it!
        </motion.p>
      </div>
    </div>
  );
}

// ─── Tracing Canvas ────────────────────────────────────

interface TracingCanvasProps {
  letterData: CharacterData;
  onComplete: (accuracy: number) => void;
  size: number;
  phase: TracePhase;
}

function TracingCanvas({
  letterData,
  onComplete,
  size,
  phase,
}: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [completedStrokes, setCompletedStrokes] = useState<
    Array<Array<{ x: number; y: number }>>
  >([]);
  const [strokeAccuracies, setStrokeAccuracies] = useState<number[]>([]);
  const cueSpokenRef = useRef<Set<number>>(new Set());

  // Guided mode: leader dot progress (0–1)
  const [leaderProgress, setLeaderProgress] = useState(0);
  const leaderRef = useRef<number | null>(null);

  const scale = size / 100;

  // Redraw user strokes whenever state changes
  useEffect(() => {
    drawUserStrokes();
  }, [completedStrokes, strokeIndex]);

  // Guided mode: animate leader dot
  useEffect(() => {
    if (phase !== 'guided') return;
    let start = 0;
    const LEADER_DURATION = 3000; // 3 seconds per stroke

    function animateLeader(timestamp: number) {
      if (!start) start = timestamp;
      const fraction = Math.min((timestamp - start) / LEADER_DURATION, 1);
      setLeaderProgress(fraction);
      if (fraction < 1) {
        leaderRef.current = requestAnimationFrame(animateLeader);
      }
    }

    setLeaderProgress(0);
    start = 0;
    leaderRef.current = requestAnimationFrame(animateLeader);

    return () => {
      if (leaderRef.current) cancelAnimationFrame(leaderRef.current);
    };
  }, [phase, strokeIndex]);

  // Speak cue when entering a new stroke
  useEffect(() => {
    if (strokeIndex < letterData.strokes.length && !cueSpokenRef.current.has(strokeIndex)) {
      cueSpokenRef.current.add(strokeIndex);
      const cue = letterData.strokes[strokeIndex].cue;
      audio.sayAsync(cue);
    }
  }, [strokeIndex, letterData.strokes]);

  function drawUserStrokes() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    // Draw completed user strokes
    for (let si = 0; si < completedStrokes.length; si++) {
      const strokePts = completedStrokes[si];
      if (strokePts.length < 2) continue;
      const color = STROKE_COLORS[si % STROKE_COLORS.length];
      ctx.beginPath();
      ctx.moveTo(strokePts[0].x, strokePts[0].y);
      for (let i = 1; i < strokePts.length; i++) {
        ctx.lineTo(strokePts[i].x, strokePts[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  function getPos(
    e: React.TouchEvent | React.MouseEvent,
  ): { x: number; y: number } {
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
    drawLivePoint(pos);
  }

  function handleMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentPoints((prev) => [...prev, pos]);
    drawLiveLine(pos);
  }

  function handleEnd() {
    if (!isDrawing) return;
    setIsDrawing(false);

    const currentStroke = letterData.strokes[strokeIndex];
    if (!currentStroke) return;

    // Sample the guide path for accuracy comparison
    const guidePoints = samplePathPoints(currentStroke.path, scale, 40);
    const accuracy = computeAccuracy(currentPoints, guidePoints, size);
    audio.playSparkle();

    const newCompleted = [...completedStrokes, [...currentPoints]];
    const newAccuracies = [...strokeAccuracies, accuracy];
    setCompletedStrokes(newCompleted);
    setStrokeAccuracies(newAccuracies);

    if (strokeIndex < letterData.strokes.length - 1) {
      setStrokeIndex(strokeIndex + 1);
      setCurrentPoints([]);
    } else {
      // All strokes done — compute average accuracy
      const overall =
        newAccuracies.length > 0
          ? Math.round(
              newAccuracies.reduce((a, b) => a + b, 0) / newAccuracies.length,
            )
          : 50;
      onComplete(overall);
    }
  }

  function drawLivePoint(pos: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const color = STROKE_COLORS[strokeIndex % STROKE_COLORS.length];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawLiveLine(pos: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || currentPoints.length < 1) return;
    const prev = currentPoints[currentPoints.length - 1];
    const color = STROKE_COLORS[strokeIndex % STROKE_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.stroke();
  }

  // For guided mode, render the leader dot in SVG
  const guidedLeaderDot =
    phase === 'guided' && strokeIndex < letterData.strokes.length
      ? getPointAtFraction(
          letterData.strokes[strokeIndex].path,
          scale,
          leaderProgress,
        )
      : null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* User drawing canvas */}
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
      {/* SVG guide overlay */}
      <GuideOverlay
        letterData={letterData}
        size={size}
        strokeIndex={strokeIndex}
        phase={phase}
        animProgress={letterData.strokes.map(() => 1)}
        animatingStroke={-1}
        showArrows={phase !== 'free'}
      />
      {/* Guided mode leader dot */}
      {guidedLeaderDot && (
        <svg
          width={size}
          height={size}
          className="absolute inset-0 pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={guidedLeaderDot.x}
            cy={guidedLeaderDot.y}
            r={10}
            fill={STROKE_COLORS[strokeIndex % STROKE_COLORS.length]}
            stroke="white"
            strokeWidth={3}
            opacity={0.9}
          >
            <animate
              attributeName="r"
              values="10;12;10"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      )}
      {/* Phase label */}
      <div className="absolute -bottom-8 left-0 right-0 text-center">
        <p className="text-white/70 text-xs">
          {phase === 'guided' ? 'Follow the dot!' : 'Your turn — trace it!'}
          {' · '}Stroke {strokeIndex + 1} of {letterData.strokes.length}
        </p>
      </div>
    </div>
  );
}

// ─── Name Writing Game ─────────────────────────────────

export default function NameWritingGame() {
  const [gamePhase, setGamePhase] = useState<'first' | 'last'>('first');
  const [charIndex, setCharIndex] = useState(0);
  const [completedLetters, setCompletedLetters] = useState<string[]>([]);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [tracePhase, setTracePhase] = useState<TracePhase>('watch');
  const { score, addCorrect, resetGame, triggerCelebration } = useGameStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const name = gamePhase === 'first' ? FIRST_NAME : LAST_NAME;
  const currentChar = name[charIndex];
  const letterData = LETTER_DATA[currentChar];

  // Reset on name change
  useEffect(() => {
    resetGame();
    setTracePhase('watch');
    audio.sayAsync(
      `Let's write your ${gamePhase === 'first' ? 'first' : 'last'} name! Start with the letter ${currentChar}.`,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gamePhase]);

  // When charIndex changes, reset to watch phase for new letter
  useEffect(() => {
    setTracePhase('watch');
  }, [charIndex]);

  /** Called when the watch demo finishes — advance to guided */
  function handleDemoComplete() {
    audio.sayAsync('Your turn! Follow the dot.');
    setTracePhase('guided');
  }

  /** Called when a letter trace is complete (guided or free) */
  function handleLetterComplete(accuracy: number) {
    setLastAccuracy(accuracy);
    recordWritingProgress(currentChar, accuracy).catch(() => {});
    addCorrect();
    useBadgeStore.getState().checkAndAward({ writingAccuracy: accuracy });

    if (accuracy >= 70) {
      audio.playSuccess();
    } else {
      audio.playSparkle();
    }

    setCompletedLetters((prev) => [...prev, currentChar]);

    // If guided phase just finished, advance to free trace (same letter)
    if (tracePhase === 'guided') {
      timerRef.current = setTimeout(() => {
        setLastAccuracy(null);
        audio.sayAsync('Great! Now try it on your own.');
        setTracePhase('free');
      }, 1200);
      return;
    }

    // Free phase complete — advance to next letter
    timerRef.current = setTimeout(() => {
      setLastAccuracy(null);

      if (charIndex < name.length - 1) {
        const nextChar = name[charIndex + 1];
        setCharIndex(charIndex + 1);
        audio.sayAsync(`Nice! Now write ${nextChar}.`);
      } else if (gamePhase === 'first') {
        triggerCelebration();
        audio.sayAsync(
          `Amazing! You wrote ${FIRST_NAME}! Now let's write your last name.`,
        );
        timerRef.current = setTimeout(() => {
          setGamePhase('last');
          setCharIndex(0);
          setCompletedLetters([]);
        }, 2500);
      } else {
        triggerCelebration();
        audio.sayAsync(
          `Wonderful! You wrote your whole name: ${FIRST_NAME} ${LAST_NAME}!`,
        );
      }
    }, 1200);
  }

  /** Replay the watch demo for the current letter */
  function handleShowAgain() {
    audio.stopSpeaking();
    setTracePhase('watch');
  }

  /** Skip to the next letter */
  function handleSkip() {
    handleLetterComplete(40);
  }

  const progress = (completedLetters.length / name.length) * 100;

  return (
    <GameShell
      title="Write My Name"
      emoji="✍️"
      progress={progress}
      bgClass="bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Name display */}
        <div className="flex gap-1 text-4xl font-bold">
          {name.split('').map((char, i) => (
            <span
              key={i}
              className={`px-1 transition-colors ${
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

        {/* Phase indicator */}
        <div className="flex items-center gap-2 text-white/80 text-lg">
          <span>
            {gamePhase === 'first' ? 'First Name' : 'Last Name'} —{' '}
            <strong>{currentChar}</strong>
          </span>
          <span className="text-sm px-2 py-0.5 rounded-full bg-white/20">
            {tracePhase === 'watch'
              ? '👀 Watch'
              : tracePhase === 'guided'
                ? '🎯 Guided'
                : '✍️ Free'}
          </span>
        </div>

        {/* Main content area */}
        {letterData ? (
          <AnimatePresence mode="wait">
            {tracePhase === 'watch' ? (
              <motion.div
                key={`watch-${gamePhase}-${charIndex}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <LetterDemo
                  letterData={letterData}
                  size={280}
                  onComplete={handleDemoComplete}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`trace-${gamePhase}-${charIndex}-${tracePhase}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <TracingCanvas
                  letterData={letterData}
                  onComplete={handleLetterComplete}
                  size={280}
                  phase={tracePhase}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
              <p
                className={`text-2xl font-bold ${
                  lastAccuracy >= 80
                    ? 'text-green-100'
                    : lastAccuracy >= 50
                      ? 'text-yellow-100'
                      : 'text-red-100'
                }`}
              >
                {lastAccuracy >= 80
                  ? 'Great tracing!'
                  : lastAccuracy >= 50
                    ? 'Good try!'
                    : 'Keep practicing!'}{' '}
                {lastAccuracy >= 80 ? '🌟' : lastAccuracy >= 50 ? '👍' : '💪'}
              </p>
              <p className="text-white/60 text-sm">
                Accuracy: {lastAccuracy}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3">
          {tracePhase !== 'watch' && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white/60"
              onClick={handleShowAgain}
            >
              Show Me Again
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="bg-white/60"
            onClick={handleSkip}
          >
            Skip Letter
          </Button>
        </div>
      </div>
    </GameShell>
  );
}
