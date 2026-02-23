import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkillCard } from './SkillCard';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';
import { audio } from '@/services/audio';

const SKILLS = [
  { id: 'name-writing', title: 'Write\nMy Name', emoji: '✍️', route: '/game/name-writing', color: 'bg-pink-100/90' },
  { id: 'counting', title: 'Count\nto 75', emoji: '🔢', route: '/game/counting', color: 'bg-blue-100/90' },
  { id: 'compare', title: 'More or\nLess?', emoji: '⚖️', route: '/game/compare', color: 'bg-green-100/90' },
  { id: 'rhymes', title: 'Rhyme\nTime', emoji: '🎵', route: '/game/rhymes', color: 'bg-yellow-100/90' },
  { id: 'stories', title: 'Story\nCards', emoji: '📖', route: '/game/stories', color: 'bg-purple-100/90' },
  { id: 'letter-sounds', title: 'Letter\nSounds', emoji: '🔤', route: '/game/letter-sounds', color: 'bg-cyan-100/90' },
];

export default function HomeHub() {
  const { showSettings, toggleSettings } = useSettingsStore();
  const { skills, fetchProgress } = useProgressStore();

  useEffect(() => {
    audio.init();
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <div />
        <motion.h1
          className="text-3xl font-extrabold text-white text-center drop-shadow-lg"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textShadow: '0 2px 10px rgba(168,85,247,0.5)' }}
        >
          Adi's Learning Adventure
        </motion.h1>
        <Button variant="ghost" size="icon" onClick={toggleSettings} className="text-white/80 hover:text-white">
          <Settings size={24} />
        </Button>
      </div>

      {/* Greeting */}
      <motion.p
        className="text-center text-white/80 text-lg font-medium pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        What do you want to learn today?
      </motion.p>

      {/* Skill Grid */}
      <div className="grid grid-cols-2 gap-4 px-5 pb-8 max-w-lg mx-auto w-full">
        {SKILLS.map((skill, i) => (
          <SkillCard
            key={skill.id}
            title={skill.title}
            emoji={skill.emoji}
            route={skill.route}
            mastery={skills[skill.id]?.mastery || 0}
            color={skill.color}
            index={i}
          />
        ))}
      </div>

      {/* Settings Panel */}
      {showSettings && <SettingsPanel />}
    </div>
  );
}
