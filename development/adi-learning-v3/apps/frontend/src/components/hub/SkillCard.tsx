import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { audio } from '@/services/audio';

interface SkillCardProps {
  title: string;
  emoji: string;
  route: string;
  mastery: number;
  color: string;
  index: number;
}

function Stars({ mastery }: { mastery: number }) {
  const filled = Math.round((mastery / 100) * 5);
  return (
    <div className="flex gap-0.5 text-xl">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? 'opacity-100' : 'opacity-30'}>
          {i < filled ? '⭐' : '☆'}
        </span>
      ))}
    </div>
  );
}

export function SkillCard({ title, emoji, route, mastery, color, index }: SkillCardProps) {
  const navigate = useNavigate();

  function handleTap() {
    audio.playClick();
    navigate(route);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
      whileTap={{ scale: 0.95 }}
    >
      <Card
        className={`cursor-pointer hover:scale-[1.03] transition-transform duration-200 ${color} border-2 border-white/50 backdrop-blur-sm`}
        onClick={handleTap}
      >
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <span className="text-5xl">{emoji}</span>
          <h2 className="text-lg font-bold text-center">{title}</h2>
          <Stars mastery={mastery} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
