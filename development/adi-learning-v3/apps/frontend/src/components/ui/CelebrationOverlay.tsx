import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '@/services/audio';

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  rotation: number;
  scale: number;
  delay: number;
}

const CELEBRATION_EMOJIS = ['✨', '🌟', '⭐', '🎉', '🎊', '💖', '🦄', '🌈', '💫', '🎀'];

interface CelebrationOverlayProps {
  onDismiss: () => void;
  message?: string;
}

export function CelebrationOverlay({ onDismiss, message = 'Amazing!' }: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    audio.playCelebration();

    // Generate confetti particles
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1.5,
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);

    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

      {/* Confetti particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute text-3xl pointer-events-none select-none"
          style={{ left: `${p.x}%`, fontSize: `${p.scale * 1.5}rem` }}
          initial={{ y: `${p.y}vh`, rotate: 0, opacity: 1 }}
          animate={{
            y: '110vh',
            rotate: p.rotation + 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2.5,
            delay: p.delay,
            ease: 'easeIn',
          }}
        >
          {p.emoji}
        </motion.div>
      ))}

      {/* Center message */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
      >
        <div className="text-7xl">🎉</div>
        <div className="text-5xl font-bold text-white drop-shadow-lg" style={{ textShadow: '0 0 20px rgba(168,85,247,0.8)' }}>
          {message}
        </div>
        <div className="text-6xl">
          {'⭐'.repeat(3)}
        </div>
      </motion.div>
    </motion.div>
  );
}
