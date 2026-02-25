import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGameStore } from '@/stores/gameStore';
import { CelebrationOverlay } from './CelebrationOverlay';
import { BadgeToast } from '@/components/badges/BadgeDisplay';
import { audio } from '@/services/audio';
import { useEffect } from 'react';

interface GameShellProps {
  title: string;
  emoji: string;
  children: React.ReactNode;
  progress?: number;
  bgClass?: string;
  onBack?: () => void;
}

export function GameShell({ title, emoji, children, progress, bgClass, onBack }: GameShellProps) {
  const navigate = useNavigate();
  const { volume, setVolume } = useSettingsStore();
  const { score, streak, showCelebration, dismissCelebration } = useGameStore();

  // Generate unique background music each time a game is entered
  useEffect(() => {
    audio.regenerateMusic();
  }, []);

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  }

  return (
    <div className={`flex flex-col h-full w-full ${bgClass || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={handleBack} className="text-white">
          <ArrowLeft size={28} />
        </Button>

        <div className="flex items-center gap-2 text-white">
          <span className="text-2xl">{emoji}</span>
          <h1 className="text-xl font-bold drop-shadow-md">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-bold">
              {streak} streak
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className="text-white"
          >
            {volume > 0 ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="px-6 pb-2 shrink-0">
          <Progress value={progress} className="h-3" />
        </div>
      )}

      {/* Game content */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {children}
      </div>

      {/* Celebration overlay */}
      {showCelebration && <CelebrationOverlay onDismiss={dismissCelebration} />}

      {/* Badge toast */}
      <BadgeToast />
    </div>
  );
}
