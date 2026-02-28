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
} from '@/data/strokeData';
import { useBadgeStore } from '@/stores/badgeStore';

const FIRST_NAME = 'Adalyn';
const LAST_NAME = 'Mulay';
const CANVAS_SIZE = 300;

// ─── Types ─────────────────────────────────────────────

type TracePhase = 'watch' | 'guided' | 'free';

// ─── SVG Path Helpers ──────────────────────────────────

function createMeasurePath(pathData: string, scale: number) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', scalePathData(pathData, scale));
  svg.appendChild(path);
  svg.style.position = 'absolute';
  svg.style.left = '-9999px';
  document.body.appendChild(svg);
  return { path, svg };
}

function scalePathData(pathStr: string, scale: number): string {
  return pathStr.replace(/(\d+\.?\d*)/g, (m) =>
    String(parseFloat(m) * scale),
  );
}

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

function getPointAtFraction(
  pathData: string,
  scale: number,
  fraction: number,
): { x: number; y: number } {
  const { path, svg } = createMeasurePath(pathData, scale);
  const totalLen = path.getTotalLength();
  const pt = path.getPointAtLength(Math.min(1, Math.max(0, fraction)) * totalLen);
  document.body.removeChild(svg);
  return { x: pt.x, y: pt.y };
}

function getDirectionAtFraction(
  pathData: string,
  scale: number,
  fraction: number,
): number {
  const eps = 0.005;
  const p1 = getPointAtFraction(pathData, scale, Math.max(0, fraction - eps));
  const p2 = getPointAtFraction(pathData, scale, Math.min(1, fraction + eps));
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

/**
 * Find the fraction (0–1) along a guide path that is nearest to a given point.
 * Used by the smart leader dot to track the child's drawing progress.
 */
function nearestFractionOnPath(
  pathData: string,
  scale: number,
  point: { x: number; y: number },
  steps = 50,
): number {
  const { path, svg } = createMeasurePath(pathData, scale);
  const totalLen = path.getTotalLength();
  let bestFrac = 0;
  let bestDist = Infinity;
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const pt = path.getPointAtLength(frac * totalLen);
    const d = (pt.x - point.x) ** 2 + (pt.y - point.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestFrac = frac;
    }
  }
  document.body.removeChild(svg);
  return bestFrac;
}

// ─── Accuracy ──────────────────────────────────────────

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
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

// ─── Adaptive Phase Logic ──────────────────────────────
// Determines which phase a new letter should start at based on
// the child's running skill level.

function pickStartPhase(
  skillLevel: number,
  isFirstLetterOfName: boolean,
): TracePhase {
  if (isFirstLetterOfName) return 'watch';
  if (skillLevel >= 80) return 'free';
  if (skillLevel >= 50) return 'guided';
  return 'watch';
}

function nextPhaseAfterComplete(
  current: TracePhase,
): TracePhase | 'done' {
  if (current === 'watch') return 'guided';
  if (current === 'guided') return 'free';
  return 'done'; // free → letter complete
}

// ─── SVG Guide Overlay ─────────────────────────────────

interface GuideOverlayProps {
  letterData: CharacterData;
  size: number;
  strokeIndex: number;
  phase: TracePhase;
  animProgress: number[];
  animatingStroke: number;
  showArrows: boolean;
  /** Smart leader dot position (guided mode) */
  leaderDot?: { x: number; y: number } | null;
}

function GuideOverlay({
  letterData,
  size,
  strokeIndex,
  phase,
  animProgress,
  animatingStroke,
  showArrows,
  leaderDot,
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
        const isAnimating = animatingStroke === i;

        let opacity = 0.15;
        if (phase === 'watch') {
          opacity = isAnimating ? 0.5 : animProgress[i] > 0 ? 0.3 : 0.15;
        } else if (phase === 'guided') {
          opacity = isCurrent ? 0.5 : isComplete ? 0.2 : 0.15;
        } else {
          opacity = isCurrent ? 0.25 : isComplete ? 0.1 : 0.1;
        }

        const scaledPath = scalePathData(stroke.path, scale);

        return (
          <g key={i}>
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

            {/* Directional arrows */}
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

            {/* Numbered start dot */}
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

            {/* End dot */}
            {isCurrent && phase !== 'watch' && (
              <circle
                cx={stroke.endPoint.x * scale}
                cy={stroke.endPoint.y * scale}
                r={6}
                fill={color}
                opacity={0.3}
              />
            )}

            {/* Demo animation dot */}
            {isAnimating &&
              animProgress[i] !== undefined &&
              animProgress[i] < 1 &&
              (() => {
                const pt = getPointAtFraction(stroke.path, scale, animProgress[i]);
                return (
                  <circle cx={pt.x} cy={pt.y} r={8} fill={color} stroke="white" strokeWidth={3}>
                    <animate attributeName="r" values="8;10;8" dur="0.6s" repeatCount="indefinite" />
                  </circle>
                );
              })()}
          </g>
        );
      })}

      {/* Smart leader dot for guided mode */}
      {leaderDot && phase === 'guided' && strokeIndex < letterData.strokes.length && (
        <circle
          cx={leaderDot.x}
          cy={leaderDot.y}
          r={10}
          fill={STROKE_COLORS[strokeIndex % STROKE_COLORS.length]}
          stroke="white"
          strokeWidth={3}
          opacity={0.9}
        >
          <animate attributeName="r" values="10;13;10" dur="0.8s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

// ─── Letter Demo (Watch Phase) ─────────────────────────

interface LetterDemoProps {
  letterData: CharacterData;
  size: number;
  onComplete: () => void;
  onSkip: () => void; // B3: touch-to-skip
}

function LetterDemo({ letterData, size, onComplete, onSkip }: LetterDemoProps) {
  const [animatingStroke, setAnimatingStroke] = useState(-1);
  const [animProgress, setAnimProgress] = useState<number[]>(
    letterData.strokes.map(() => 0),
  );
  const animRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueSpokenRef = useRef<Set<number>>(new Set());
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
  }, []);

  const runDemo = useCallback(() => {
    cancelledRef.current = false;
    cueSpokenRef.current.clear();
    let currentStroke = 0;
    let startTime = 0;
    const STROKE_DURATION = 1000;
    const PAUSE_BETWEEN = 400;

    function animateStroke(timestamp: number) {
      if (cancelledRef.current) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const fraction = Math.min(elapsed / STROKE_DURATION, 1);

      if (!cueSpokenRef.current.has(currentStroke)) {
        cueSpokenRef.current.add(currentStroke);
        // B1: Use speakImmediate to cancel any prior audio
        audio.speakImmediate(letterData.strokes[currentStroke].cue).catch(() => {});
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
        currentStroke++;
        if (currentStroke < letterData.strokes.length) {
          startTime = 0;
          pauseTimerRef.current = setTimeout(() => {
            if (!cancelledRef.current) {
              animRef.current = requestAnimationFrame(animateStroke);
            }
          }, PAUSE_BETWEEN);
        } else {
          setAnimatingStroke(-1);
          // B4: shorter end-of-demo pause
          pauseTimerRef.current = setTimeout(() => {
            if (!cancelledRef.current) onComplete();
          }, 300);
        }
      }
    }

    setAnimProgress(letterData.strokes.map(() => 0));
    setAnimatingStroke(0);
    animRef.current = requestAnimationFrame(animateStroke);
  }, [letterData, onComplete]);

  useEffect(() => {
    const timer = setTimeout(runDemo, 300);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [runDemo, cleanup]);

  // B3: Touch-to-skip — touching the canvas during Watch skips to tracing
  function handleTouchSkip(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    cleanup();
    audio.stopSpeaking();
    onSkip();
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Blank canvas background */}
      <canvas
        width={size}
        height={size}
        className="bg-white/20 rounded-2xl border-2 border-white/30"
      />
      {/* SVG guide overlay */}
      <GuideOverlay
        letterData={letterData}
        size={size}
        strokeIndex={0}
        phase="watch"
        animProgress={animProgress}
        animatingStroke={animatingStroke}
        showArrows={true}
      />
      {/* B3: Invisible touch layer to capture skip gesture */}
      <div
        className="absolute inset-0 rounded-2xl touch-none"
        onMouseDown={handleTouchSkip}
        onTouchStart={handleTouchSkip}
      />
      {/* Label */}
      <p className="text-center text-white/70 text-xs mt-2">
        Watch how to write it! <span className="text-white/40">(tap to skip)</span>
      </p>
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

function TracingCanvas({ letterData, onComplete, size, phase }: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [completedStrokes, setCompletedStrokes] = useState<
    Array<Array<{ x: number; y: number }>>
  >([]);
  const [strokeAccuracies, setStrokeAccuracies] = useState<number[]>([]);
  const cueSpokenRef = useRef<Set<number>>(new Set());

  // B5: Smart leader — tracks user progress fraction on the guide path
  const [leaderFraction, setLeaderFraction] = useState(0);
  const leaderTargetRef = useRef(0);
  const leaderAnimRef = useRef<number | null>(null);
  const userPausedRef = useRef(false);
  const lastMoveTimeRef = useRef(0);

  const scale = size / 100;

  // Redraw completed user strokes
  useEffect(() => {
    drawUserStrokes();
  }, [completedStrokes, strokeIndex]);

  // B1: Speak cue immediately on each new stroke (cancels prior audio)
  useEffect(() => {
    if (strokeIndex < letterData.strokes.length && !cueSpokenRef.current.has(strokeIndex)) {
      cueSpokenRef.current.add(strokeIndex);
      audio.stopSpeaking();
      audio.speakImmediate(letterData.strokes[strokeIndex].cue).catch(() => {});
    }
  }, [strokeIndex, letterData.strokes]);

  // B5: Smart leader dot animation loop (guided mode)
  useEffect(() => {
    if (phase !== 'guided') return;
    setLeaderFraction(0);
    leaderTargetRef.current = 0.15; // Start slightly ahead
    lastMoveTimeRef.current = Date.now();
    userPausedRef.current = false;

    function tick() {
      // Smooth lerp toward target
      setLeaderFraction((prev) => {
        const target = leaderTargetRef.current;
        // Lerp speed: fast to catch up, slower when close
        const diff = target - prev;
        const step = diff * 0.08 + 0.002; // base creep + proportional
        const next = Math.min(1, prev + Math.max(0.001, step));

        // Minimum auto-advance: even if user doesn't draw, complete in ~8s
        const timeSinceMove = Date.now() - lastMoveTimeRef.current;
        if (timeSinceMove > 1500) {
          // User paused — don't advance leader
          return prev;
        }
        return next;
      });
      leaderAnimRef.current = requestAnimationFrame(tick);
    }

    leaderAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (leaderAnimRef.current) cancelAnimationFrame(leaderAnimRef.current);
    };
  }, [phase, strokeIndex]);

  function drawUserStrokes() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    for (let si = 0; si < completedStrokes.length; si++) {
      const strokePts = completedStrokes[si];
      if (strokePts.length < 2) continue;
      const color = STROKE_COLORS[si % STROKE_COLORS.length];
      ctx.beginPath();
      ctx.moveTo(strokePts[0].x, strokePts[0].y);
      for (let j = 1; j < strokePts.length; j++) {
        ctx.lineTo(strokePts[j].x, strokePts[j].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  function getPos(e: React.TouchEvent | React.MouseEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function handleStart(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    currentPointsRef.current = [pos];
    drawLivePoint(pos);
    lastMoveTimeRef.current = Date.now();
  }

  function handleMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    currentPointsRef.current.push(pos);
    drawLiveLine(pos);
    lastMoveTimeRef.current = Date.now();

    // B5: Update leader target based on where user is on the guide path
    if (phase === 'guided' && strokeIndex < letterData.strokes.length) {
      const userFrac = nearestFractionOnPath(
        letterData.strokes[strokeIndex].path,
        scale,
        pos,
      );
      // Leader stays 15–20% ahead of user
      leaderTargetRef.current = Math.max(leaderTargetRef.current, Math.min(1, userFrac + 0.18));
    }
  }

  function handleEnd() {
    if (!isDrawing) return;
    setIsDrawing(false);

    const currentStroke = letterData.strokes[strokeIndex];
    if (!currentStroke) return;

    const userPts = currentPointsRef.current;
    const guidePoints = samplePathPoints(currentStroke.path, scale, 40);
    const accuracy = computeAccuracy(userPts, guidePoints, size);
    audio.playSparkle();

    const newCompleted = [...completedStrokes, [...userPts]];
    const newAccuracies = [...strokeAccuracies, accuracy];
    setCompletedStrokes(newCompleted);
    setStrokeAccuracies(newAccuracies);

    // B4: Instant stroke advancement (no delay between strokes)
    if (strokeIndex < letterData.strokes.length - 1) {
      setStrokeIndex(strokeIndex + 1);
      currentPointsRef.current = [];
      // Reset leader for next stroke
      setLeaderFraction(0);
      leaderTargetRef.current = 0.15;
    } else {
      // All strokes done
      const overall =
        newAccuracies.length > 0
          ? Math.round(newAccuracies.reduce((a, b) => a + b, 0) / newAccuracies.length)
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
    const pts = currentPointsRef.current;
    if (!ctx || pts.length < 2) return;
    const prev = pts[pts.length - 2];
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

  // Compute leader dot position for SVG overlay
  const leaderDot =
    phase === 'guided' && strokeIndex < letterData.strokes.length
      ? getPointAtFraction(letterData.strokes[strokeIndex].path, scale, leaderFraction)
      : null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
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
      <GuideOverlay
        letterData={letterData}
        size={size}
        strokeIndex={strokeIndex}
        phase={phase}
        animProgress={letterData.strokes.map(() => 1)}
        animatingStroke={-1}
        showArrows={phase !== 'free'}
        leaderDot={leaderDot}
      />
      <p className="text-center text-white/60 text-xs mt-1">
        {phase === 'guided' ? 'Follow the dot!' : 'Trace it!'} · Stroke{' '}
        {strokeIndex + 1}/{letterData.strokes.length}
      </p>
    </div>
  );
}

// ─── Name Writing Game (Orchestrator) ──────────────────

export default function NameWritingGame() {
  const [gamePhase, setGamePhase] = useState<'first' | 'last'>('first');
  const [charIndex, setCharIndex] = useState(0);
  const [completedLetters, setCompletedLetters] = useState<string[]>([]);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [tracePhase, setTracePhase] = useState<TracePhase>('watch');
  // B2: Running skill level for adaptive phase selection
  const [skillLevel, setSkillLevel] = useState(0);
  const { addCorrect, resetGame, triggerCelebration } = useGameStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const name = gamePhase === 'first' ? FIRST_NAME : LAST_NAME;
  const currentChar = name[charIndex];
  const letterData = LETTER_DATA[currentChar];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset on name change
  useEffect(() => {
    resetGame();
    setSkillLevel(0);
    const startPhase = pickStartPhase(0, true);
    setTracePhase(startPhase);
    // B1: Cancel everything then speak
    audio.stopSpeaking();
    audio.speakImmediate(
      `Let's write your ${gamePhase === 'first' ? 'first' : 'last'} name! Start with the letter ${currentChar}.`,
    ).catch(() => {});
    return clearTimer;
  }, [gamePhase]);

  // B2: When charIndex changes, pick appropriate starting phase
  useEffect(() => {
    const isFirst = charIndex === 0;
    const startPhase = pickStartPhase(skillLevel, isFirst);
    setTracePhase(startPhase);
    setLastAccuracy(null);
  }, [charIndex]);

  // ─── Transition Handlers ─────────────────────────

  /** Watch demo finished naturally — advance to guided */
  function handleDemoComplete() {
    audio.stopSpeaking();
    audio.speakImmediate('Your turn! Follow the dot.').catch(() => {});
    setTracePhase('guided');
  }

  /** B3: Watch demo skipped by touch — advance to guided */
  function handleDemoSkip() {
    audio.stopSpeaking();
    audio.speakImmediate('Your turn!').catch(() => {});
    setTracePhase('guided');
  }

  /** Letter trace complete (guided or free) */
  function handleLetterComplete(accuracy: number) {
    clearTimer();
    setLastAccuracy(accuracy);
    recordWritingProgress(currentChar, accuracy).catch(() => {});
    addCorrect();
    useBadgeStore.getState().checkAndAward({ writingAccuracy: accuracy });

    // B1: Cancel stale audio, play feedback SFX
    audio.stopSpeaking();
    if (accuracy >= 70) {
      audio.playSuccess();
    } else {
      audio.playSparkle();
    }

    // B2: Check if there's a next phase for this letter
    const nextP = nextPhaseAfterComplete(tracePhase);

    if (nextP !== 'done') {
      // Advance to next phase (guided→free) for same letter
      // B4: Short 400ms transition
      timerRef.current = setTimeout(() => {
        setLastAccuracy(null);
        audio.stopSpeaking();
        if (nextP === 'free') {
          audio.speakImmediate('Now try it on your own!').catch(() => {});
        } else {
          audio.speakImmediate('Your turn! Follow the dot.').catch(() => {});
        }
        setTracePhase(nextP);
      }, 400);
      return;
    }

    // Free phase complete — this letter is done.
    // B2: Update skill level (weighted moving average)
    const newSkill = Math.round(skillLevel * 0.4 + accuracy * 0.6);
    setSkillLevel(newSkill);
    setCompletedLetters((prev) => [...prev, currentChar]);

    // B4: Short 400ms then advance to next letter
    timerRef.current = setTimeout(() => {
      setLastAccuracy(null);
      audio.stopSpeaking();

      if (charIndex < name.length - 1) {
        const nextChar = name[charIndex + 1];
        audio.speakImmediate(`Now write ${nextChar}!`).catch(() => {});
        setCharIndex(charIndex + 1);
      } else if (gamePhase === 'first') {
        triggerCelebration();
        audio
          .speakImmediate(`Amazing! You wrote ${FIRST_NAME}! Now your last name.`)
          .catch(() => {});
        timerRef.current = setTimeout(() => {
          setGamePhase('last');
          setCharIndex(0);
          setCompletedLetters([]);
        }, 1500);
      } else {
        triggerCelebration();
        audio
          .speakImmediate(`Wonderful! You wrote your whole name: ${FIRST_NAME} ${LAST_NAME}!`)
          .catch(() => {});
      }
    }, 400);
  }

  function handleShowAgain() {
    clearTimer();
    audio.stopSpeaking();
    setLastAccuracy(null);
    setTracePhase('watch');
  }

  function handleSkip() {
    clearTimer();
    audio.stopSpeaking();
    // Skip = treat as low-accuracy free trace
    setLastAccuracy(null);

    // Update skill down and advance to next letter
    const newSkill = Math.round(skillLevel * 0.4 + 30 * 0.6);
    setSkillLevel(newSkill);
    setCompletedLetters((prev) => [...prev, currentChar]);

    if (charIndex < name.length - 1) {
      const nextChar = name[charIndex + 1];
      audio.speakImmediate(`Now write ${nextChar}!`).catch(() => {});
      setCharIndex(charIndex + 1);
    } else if (gamePhase === 'first') {
      triggerCelebration();
      audio.speakImmediate(`Now your last name!`).catch(() => {});
      timerRef.current = setTimeout(() => {
        setGamePhase('last');
        setCharIndex(0);
        setCompletedLetters([]);
      }, 1500);
    } else {
      triggerCelebration();
      audio
        .speakImmediate(`You wrote your name: ${FIRST_NAME} ${LAST_NAME}!`)
        .catch(() => {});
    }
  }

  const progress = (completedLetters.length / name.length) * 100;

  // ─── Layout ──────────────────────────────────────
  // Part A: Full-height flex column.
  // TOP = name + phase label (shrink-0)
  // MIDDLE = canvas (flex-1, centered)
  // BOTTOM = feedback + buttons (shrink-0, anchored to bottom)

  return (
    <GameShell
      title="Write My Name"
      emoji="✍️"
      progress={progress}
      bgClass="bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500"
    >
      <div className="flex flex-col h-full">
        {/* ── TOP: Name display + phase ── */}
        <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
          <div className="flex gap-1 text-3xl font-bold">
            {name.split('').map((char, i) => (
              <span
                key={i}
                className={`px-0.5 transition-colors ${
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
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-sm">
              {gamePhase === 'first' ? 'First Name' : 'Last Name'} —{' '}
              <strong className="text-base">{currentChar}</strong>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
              {tracePhase === 'watch'
                ? '👀 Watch'
                : tracePhase === 'guided'
                  ? '🎯 Follow'
                  : '✍️ Trace'}
            </span>
          </div>
        </div>

        {/* ── MIDDLE: Canvas (centered) ── */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          {letterData ? (
            <AnimatePresence mode="wait">
              {tracePhase === 'watch' ? (
                <motion.div
                  key={`watch-${gamePhase}-${charIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <LetterDemo
                    letterData={letterData}
                    size={CANVAS_SIZE}
                    onComplete={handleDemoComplete}
                    onSkip={handleDemoSkip}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`trace-${gamePhase}-${charIndex}-${tracePhase}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <TracingCanvas
                    letterData={letterData}
                    onComplete={handleLetterComplete}
                    size={CANVAS_SIZE}
                    phase={tracePhase}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div
              className="bg-white/20 rounded-2xl flex items-center justify-center"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            >
              <span className="text-8xl text-white/60">{currentChar}</span>
            </div>
          )}
        </div>

        {/* ── BOTTOM: Feedback + buttons (anchored to bottom, safe zone) ── */}
        <div className="shrink-0 flex flex-col items-center gap-2 pb-6 pt-4">
          {/* Accuracy toast (non-blocking, auto-fades) */}
          <AnimatePresence>
            {lastAccuracy !== null && (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p
                  className={`text-lg font-bold ${
                    lastAccuracy >= 80
                      ? 'text-green-100'
                      : lastAccuracy >= 50
                        ? 'text-yellow-100'
                        : 'text-red-100'
                  }`}
                >
                  {lastAccuracy >= 80
                    ? 'Great tracing! 🌟'
                    : lastAccuracy >= 50
                      ? 'Good try! 👍'
                      : 'Keep practicing! 💪'}
                  <span className="text-white/50 text-sm ml-2">{lastAccuracy}%</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons — well below the canvas */}
          <div className="flex gap-4">
            {tracePhase !== 'watch' && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/60 text-xs px-4 py-2"
                onClick={handleShowAgain}
              >
                Show Me Again
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="bg-white/60 text-xs px-4 py-2"
              onClick={handleSkip}
            >
              Skip Letter
            </Button>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
