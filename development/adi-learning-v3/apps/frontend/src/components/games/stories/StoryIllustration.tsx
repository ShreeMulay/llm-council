import type React from 'react';

interface StoryIllustrationProps {
  storyId: string;
  order: number;
  size?: number;
}

/** Simple child-friendly SVG illustrations for each story card */
export function StoryIllustration({ storyId, order, size = 64 }: StoryIllustrationProps) {
  const key = `${storyId}-${order}`;
  const svg = ILLUSTRATIONS[key];

  if (!svg) {
    // Fallback to a generic colored shape
    const colors = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24'];
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" fill={colors[(order - 1) % 4]} opacity="0.3" />
        <text x="32" y="40" textAnchor="middle" fontSize="28">
          {order}
        </text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {svg}
    </svg>
  );
}

// Each key is "storyId-order" mapping to JSX SVG children
const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  // ─── Making a Sandwich ──────────────────────────────
  'make-sandwich-1': (
    <>
      {/* Two slices of bread */}
      <rect x="12" y="20" width="40" height="24" rx="6" fill="#F59E0B" />
      <rect x="16" y="24" width="32" height="16" rx="4" fill="#FBBF24" />
      <rect x="12" y="30" width="40" height="24" rx="6" fill="#F59E0B" opacity="0.5" />
    </>
  ),
  'make-sandwich-2': (
    <>
      {/* Peanut butter jar + knife */}
      <rect x="18" y="14" width="20" height="30" rx="4" fill="#92400E" />
      <rect x="16" y="14" width="24" height="8" rx="3" fill="#B45309" />
      <text x="28" y="37" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">PB</text>
      <rect x="42" y="20" width="3" height="24" rx="1" fill="#9CA3AF" />
      <rect x="40" y="18" width="7" height="4" rx="1" fill="#D97706" />
    </>
  ),
  'make-sandwich-3': (
    <>
      {/* Jelly / grapes */}
      <circle cx="20" cy="28" r="6" fill="#7C3AED" />
      <circle cx="30" cy="24" r="6" fill="#8B5CF6" />
      <circle cx="40" cy="28" r="6" fill="#7C3AED" />
      <circle cx="25" cy="36" r="6" fill="#8B5CF6" />
      <circle cx="35" cy="36" r="6" fill="#7C3AED" />
      <rect x="28" y="10" width="3" height="12" rx="1" fill="#16A34A" />
      <ellipse cx="34" cy="12" rx="6" ry="4" fill="#22C55E" />
    </>
  ),
  'make-sandwich-4': (
    <>
      {/* Complete sandwich */}
      <rect x="10" y="18" width="44" height="10" rx="5" fill="#F59E0B" />
      <rect x="14" y="28" width="36" height="4" rx="1" fill="#92400E" opacity="0.6" />
      <rect x="14" y="32" width="36" height="4" rx="1" fill="#7C3AED" opacity="0.6" />
      <rect x="10" y="36" width="44" height="10" rx="5" fill="#F59E0B" />
      <path d="M14 18 Q32 10 50 18" fill="#FBBF24" />
    </>
  ),

  // ─── Getting Ready for School ───────────────────────
  'morning-routine-1': (
    <>
      {/* Alarm clock */}
      <circle cx="32" cy="32" r="20" fill="#3B82F6" />
      <circle cx="32" cy="32" r="17" fill="#DBEAFE" />
      <line x1="32" y1="32" x2="32" y2="20" stroke="#1E3A5F" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="42" y2="32" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="2" fill="#1E3A5F" />
      <circle cx="18" cy="14" r="6" fill="#60A5FA" />
      <circle cx="46" cy="14" r="6" fill="#60A5FA" />
    </>
  ),
  'morning-routine-2': (
    <>
      {/* Toothbrush */}
      <rect x="28" y="8" width="8" height="36" rx="4" fill="#06B6D4" />
      <rect x="24" y="40" width="16" height="14" rx="3" fill="#22D3EE" />
      <ellipse cx="32" cy="10" rx="6" ry="4" fill="white" opacity="0.7" />
      <circle cx="28" cy="46" r="2" fill="white" />
      <circle cx="36" cy="46" r="2" fill="white" />
      <circle cx="32" cy="50" r="2" fill="white" />
    </>
  ),
  'morning-routine-3': (
    <>
      {/* Dress / clothes */}
      <path d="M22 16 L32 10 L42 16 L40 22 L36 20 L36 48 L28 48 L28 20 L24 22 Z" fill="#EC4899" />
      <path d="M28 48 L24 56 L32 56 Z" fill="#EC4899" />
      <path d="M36 48 L40 56 L32 56 Z" fill="#EC4899" />
      <circle cx="32" cy="30" r="2" fill="#F9A8D4" />
      <circle cx="32" cy="38" r="2" fill="#F9A8D4" />
    </>
  ),
  'morning-routine-4': (
    <>
      {/* Backpack */}
      <rect x="18" y="16" width="28" height="36" rx="8" fill="#EF4444" />
      <rect x="22" y="26" width="20" height="12" rx="4" fill="#FCA5A5" />
      <rect x="28" y="8" width="8" height="12" rx="4" fill="#DC2626" />
      <line x1="32" y1="34" x2="32" y2="38" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    </>
  ),

  // ─── Planting a Flower ──────────────────────────────
  'plant-flower-1': (
    <>
      {/* Digging hole */}
      <rect x="4" y="38" width="56" height="22" rx="4" fill="#92400E" />
      <ellipse cx="32" cy="38" rx="14" ry="8" fill="#78350F" />
      <path d="M48 20 L52 36 L44 36 Z" fill="#9CA3AF" />
      <rect x="50" y="12" width="3" height="20" rx="1" fill="#D97706" />
    </>
  ),
  'plant-flower-2': (
    <>
      {/* Seed in hole */}
      <rect x="4" y="38" width="56" height="22" rx="4" fill="#92400E" />
      <ellipse cx="32" cy="38" rx="14" ry="8" fill="#78350F" />
      <ellipse cx="32" cy="40" rx="4" ry="3" fill="#854D0E" />
      <path d="M30 38 Q32 34 34 38" fill="#16A34A" opacity="0.6" />
    </>
  ),
  'plant-flower-3': (
    <>
      {/* Watering */}
      <rect x="4" y="44" width="56" height="16" rx="4" fill="#92400E" />
      <rect x="34" y="8" width="20" height="16" rx="3" fill="#60A5FA" />
      <rect x="30" y="18" width="8" height="8" rx="1" fill="#60A5FA" />
      <circle cx="36" cy="30" r="2" fill="#93C5FD" />
      <circle cx="40" cy="34" r="2" fill="#93C5FD" />
      <circle cx="32" cy="34" r="2" fill="#93C5FD" />
      <line x1="32" y1="36" x2="32" y2="44" stroke="#16A34A" strokeWidth="2" />
    </>
  ),
  'plant-flower-4': (
    <>
      {/* Flower grown */}
      <rect x="4" y="48" width="56" height="12" rx="4" fill="#92400E" />
      <line x1="32" y1="48" x2="32" y2="24" stroke="#16A34A" strokeWidth="3" />
      <ellipse cx="22" cy="40" rx="8" ry="4" fill="#22C55E" />
      <ellipse cx="42" cy="40" rx="8" ry="4" fill="#22C55E" />
      <circle cx="32" cy="20" r="8" fill="#F472B6" />
      <circle cx="24" cy="18" r="6" fill="#EC4899" />
      <circle cx="40" cy="18" r="6" fill="#EC4899" />
      <circle cx="26" cy="26" r="6" fill="#EC4899" />
      <circle cx="38" cy="26" r="6" fill="#EC4899" />
      <circle cx="32" cy="20" r="4" fill="#FBBF24" />
    </>
  ),

  // ─── Building a Snowman ─────────────────────────────
  'build-snowman-1': (
    <>
      {/* Big snowball */}
      <rect x="0" y="50" width="64" height="14" fill="#BFDBFE" opacity="0.5" />
      <circle cx="32" cy="40" r="18" fill="white" stroke="#CBD5E1" strokeWidth="1" />
      <circle cx="26" cy="36" r="3" fill="#E2E8F0" opacity="0.5" />
      <circle cx="38" cy="42" r="2" fill="#E2E8F0" opacity="0.5" />
    </>
  ),
  'build-snowman-2': (
    <>
      {/* Two snowballs stacked */}
      <rect x="0" y="50" width="64" height="14" fill="#BFDBFE" opacity="0.5" />
      <circle cx="32" cy="42" r="16" fill="white" stroke="#CBD5E1" strokeWidth="1" />
      <circle cx="32" cy="22" r="12" fill="white" stroke="#CBD5E1" strokeWidth="1" />
    </>
  ),
  'build-snowman-3': (
    <>
      {/* Snowman with face */}
      <rect x="0" y="50" width="64" height="14" fill="#BFDBFE" opacity="0.5" />
      <circle cx="32" cy="42" r="14" fill="white" stroke="#CBD5E1" strokeWidth="1" />
      <circle cx="32" cy="22" r="10" fill="white" stroke="#CBD5E1" strokeWidth="1" />
      <circle cx="28" cy="20" r="2" fill="#1E293B" />
      <circle cx="36" cy="20" r="2" fill="#1E293B" />
      <path d="M32 24 L38 26 L32 25 Z" fill="#F97316" />
    </>
  ),
  'build-snowman-4': (
    <>
      {/* Complete snowman with hat and scarf */}
      <rect x="0" y="50" width="64" height="14" fill="#BFDBFE" opacity="0.5" />
      <circle cx="32" cy="42" r="14" fill="white" stroke="#CBD5E1" strokeWidth="1" />
      <circle cx="32" cy="22" r="10" fill="white" stroke="#CBD5E1" strokeWidth="1" />
      <circle cx="28" cy="20" r="1.5" fill="#1E293B" />
      <circle cx="36" cy="20" r="1.5" fill="#1E293B" />
      <path d="M32 24 L37 25 L32 24.5 Z" fill="#F97316" />
      <rect x="24" y="8" width="16" height="6" rx="1" fill="#1E293B" />
      <rect x="20" y="13" width="24" height="3" rx="1" fill="#1E293B" />
      <path d="M22 30 Q32 34 42 30" stroke="#EF4444" strokeWidth="3" fill="none" strokeLinecap="round" />
      <line x1="42" y1="30" x2="46" y2="36" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
    </>
  ),

  // ─── Baking Cookies ─────────────────────────────────
  'bake-cookies-1': (
    <>
      {/* Mixing bowl */}
      <ellipse cx="32" cy="34" rx="22" ry="16" fill="#818CF8" />
      <ellipse cx="32" cy="28" rx="20" ry="10" fill="#C4B5FD" />
      <ellipse cx="32" cy="28" rx="16" ry="7" fill="#FDE68A" />
      <rect x="44" y="20" width="14" height="3" rx="1.5" fill="#9CA3AF" />
    </>
  ),
  'bake-cookies-2': (
    <>
      {/* Cookie shapes */}
      <circle cx="16" cy="24" r="10" fill="#D97706" />
      <circle cx="38" cy="20" r="10" fill="#D97706" />
      <circle cx="26" cy="42" r="10" fill="#D97706" />
      <circle cx="48" cy="40" r="10" fill="#D97706" />
      <circle cx="14" cy="22" r="2" fill="#92400E" />
      <circle cx="18" cy="26" r="2" fill="#92400E" />
      <circle cx="36" cy="18" r="2" fill="#92400E" />
      <circle cx="40" cy="22" r="2" fill="#92400E" />
    </>
  ),
  'bake-cookies-3': (
    <>
      {/* Oven */}
      <rect x="8" y="8" width="48" height="48" rx="4" fill="#6B7280" />
      <rect x="12" y="12" width="40" height="30" rx="2" fill="#1F2937" />
      <rect x="16" y="16" width="32" height="22" rx="1" fill="#F97316" opacity="0.4" />
      <circle cx="20" cy="22" r="4" fill="#D97706" opacity="0.7" />
      <circle cx="32" cy="26" r="4" fill="#D97706" opacity="0.7" />
      <circle cx="44" cy="22" r="4" fill="#D97706" opacity="0.7" />
      <rect x="28" y="46" width="8" height="4" rx="2" fill="#9CA3AF" />
    </>
  ),
  'bake-cookies-4': (
    <>
      {/* Cookies on plate, yum! */}
      <ellipse cx="32" cy="46" rx="24" ry="8" fill="#E5E7EB" />
      <circle cx="22" cy="38" r="8" fill="#D97706" />
      <circle cx="38" cy="36" r="8" fill="#D97706" />
      <circle cx="30" cy="30" r="8" fill="#D97706" />
      <circle cx="20" cy="36" r="1.5" fill="#92400E" />
      <circle cx="24" cy="40" r="1.5" fill="#92400E" />
      <circle cx="36" cy="34" r="1.5" fill="#92400E" />
      <circle cx="40" cy="38" r="1.5" fill="#92400E" />
      {/* Steam */}
      <path d="M26 22 Q28 18 26 14" stroke="#9CA3AF" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M34 20 Q36 16 34 12" stroke="#9CA3AF" strokeWidth="1.5" fill="none" opacity="0.5" />
    </>
  ),

  // ─── Washing the Dog ────────────────────────────────
  'wash-dog-1': (
    <>
      {/* Bathtub with water */}
      <rect x="8" y="28" width="48" height="28" rx="6" fill="#BFDBFE" />
      <rect x="8" y="24" width="48" height="8" rx="4" fill="white" />
      <ellipse cx="32" cy="44" rx="20" ry="8" fill="#60A5FA" opacity="0.5" />
      <rect x="4" y="52" width="8" height="8" rx="2" fill="#9CA3AF" />
      <rect x="52" y="52" width="8" height="8" rx="2" fill="#9CA3AF" />
    </>
  ),
  'wash-dog-2': (
    <>
      {/* Dog in tub */}
      <rect x="8" y="32" width="48" height="24" rx="6" fill="#BFDBFE" />
      <rect x="8" y="28" width="48" height="8" rx="4" fill="white" />
      <ellipse cx="32" cy="36" rx="14" ry="10" fill="#D2B48C" />
      <circle cx="32" cy="26" r="10" fill="#D2B48C" />
      <circle cx="24" cy="22" r="5" fill="#C4A07A" />
      <circle cx="40" cy="22" r="5" fill="#C4A07A" />
      <circle cx="29" cy="24" r="2" fill="#1E293B" />
      <circle cx="35" cy="24" r="2" fill="#1E293B" />
      <ellipse cx="32" cy="28" rx="3" ry="2" fill="#1E293B" />
    </>
  ),
  'wash-dog-3': (
    <>
      {/* Scrubbing with soap */}
      <rect x="8" y="32" width="48" height="24" rx="6" fill="#BFDBFE" />
      <ellipse cx="32" cy="36" rx="14" ry="10" fill="#D2B48C" />
      <circle cx="32" cy="26" r="10" fill="#D2B48C" />
      <circle cx="29" cy="24" r="2" fill="#1E293B" />
      <circle cx="35" cy="24" r="2" fill="#1E293B" />
      {/* Bubbles */}
      <circle cx="18" cy="20" r="4" fill="white" opacity="0.7" />
      <circle cx="46" cy="24" r="5" fill="white" opacity="0.7" />
      <circle cx="24" cy="14" r="3" fill="white" opacity="0.7" />
      <circle cx="42" cy="16" r="4" fill="white" opacity="0.7" />
      <circle cx="50" cy="18" r="3" fill="white" opacity="0.7" />
      <circle cx="14" cy="28" r="3" fill="white" opacity="0.7" />
    </>
  ),
  'wash-dog-4': (
    <>
      {/* Clean happy dog */}
      <ellipse cx="32" cy="44" rx="16" ry="12" fill="#D2B48C" />
      <circle cx="32" cy="28" r="12" fill="#D2B48C" />
      <circle cx="22" cy="22" r="6" fill="#C4A07A" />
      <circle cx="42" cy="22" r="6" fill="#C4A07A" />
      <circle cx="28" cy="26" r="2" fill="#1E293B" />
      <circle cx="36" cy="26" r="2" fill="#1E293B" />
      <ellipse cx="32" cy="30" rx="3" ry="2" fill="#1E293B" />
      {/* Sparkles */}
      <text x="12" y="16" fontSize="10">✨</text>
      <text x="48" y="14" fontSize="10">✨</text>
      <text x="8" y="40" fontSize="8">✨</text>
      {/* Tail wagging */}
      <path d="M48 42 Q56 34 52 26" stroke="#C4A07A" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),

  // ─── Catching a Butterfly ───────────────────────────
  'catch-butterfly-1': (
    <>
      {/* Pretty butterfly */}
      <ellipse cx="32" cy="30" rx="3" ry="8" fill="#92400E" />
      <ellipse cx="22" cy="24" rx="10" ry="8" fill="#F472B6" transform="rotate(-15 22 24)" />
      <ellipse cx="42" cy="24" rx="10" ry="8" fill="#A78BFA" transform="rotate(15 42 24)" />
      <ellipse cx="24" cy="36" rx="8" ry="6" fill="#FB923C" transform="rotate(-15 24 36)" />
      <ellipse cx="40" cy="36" rx="8" ry="6" fill="#34D399" transform="rotate(15 40 36)" />
      <circle cx="22" cy="22" r="2" fill="white" opacity="0.5" />
      <circle cx="42" cy="22" r="2" fill="white" opacity="0.5" />
      <line x1="30" y1="20" x2="26" y2="12" stroke="#92400E" strokeWidth="1.5" />
      <line x1="34" y1="20" x2="38" y2="12" stroke="#92400E" strokeWidth="1.5" />
      <circle cx="26" cy="11" r="2" fill="#92400E" />
      <circle cx="38" cy="11" r="2" fill="#92400E" />
    </>
  ),
  'catch-butterfly-2': (
    <>
      {/* Tiptoeing */}
      <circle cx="32" cy="20" r="8" fill="#FBBF24" />
      <rect x="28" y="28" width="8" height="16" rx="3" fill="#EC4899" />
      <line x1="26" y1="32" x2="20" y2="28" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
      <line x1="38" y1="32" x2="44" y2="28" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="44" x2="28" y2="54" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
      <line x1="34" y1="44" x2="36" y2="54" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="29" cy="18" r="1.5" fill="#1E293B" />
      <circle cx="35" cy="18" r="1.5" fill="#1E293B" />
      <path d="M29 23 Q32 25 35 23" stroke="#1E293B" strokeWidth="1" fill="none" />
      {/* Butterfly far away */}
      <ellipse cx="52" cy="14" rx="4" ry="3" fill="#F472B6" opacity="0.6" />
      <ellipse cx="56" cy="14" rx="4" ry="3" fill="#A78BFA" opacity="0.6" />
    </>
  ),
  'catch-butterfly-3': (
    <>
      {/* Net catching */}
      <circle cx="32" cy="20" r="14" stroke="#9CA3AF" strokeWidth="2" fill="none" />
      <line x1="32" y1="34" x2="32" y2="56" stroke="#78716C" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 20 Q26 36 32 34 Q38 36 46 20" stroke="#9CA3AF" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
      {/* Butterfly in net */}
      <ellipse cx="32" cy="22" rx="2" ry="5" fill="#92400E" />
      <ellipse cx="27" cy="20" rx="5" ry="4" fill="#F472B6" />
      <ellipse cx="37" cy="20" rx="5" ry="4" fill="#A78BFA" />
    </>
  ),
  'catch-butterfly-4': (
    <>
      {/* Letting butterfly go */}
      <circle cx="24" cy="34" r="8" fill="#FBBF24" />
      <rect x="20" y="42" width="8" height="12" rx="3" fill="#EC4899" />
      <line x1="32" y1="42" x2="38" y2="32" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
      <circle cx="22" cy="32" r="1.5" fill="#1E293B" />
      <path d="M22 37 Q24 39 26 37" stroke="#1E293B" strokeWidth="1" fill="none" />
      {/* Butterfly flying away */}
      <ellipse cx="48" cy="16" rx="2" ry="5" fill="#92400E" />
      <ellipse cx="43" cy="14" rx="6" ry="5" fill="#F472B6" />
      <ellipse cx="53" cy="14" rx="6" ry="5" fill="#A78BFA" />
      {/* Waving hand */}
      <line x1="18" y1="44" x2="12" y2="34" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" />
    </>
  ),

  // ─── Going Fishing ──────────────────────────────────
  'go-fishing-1': (
    <>
      {/* Fishing rod */}
      <line x1="12" y1="52" x2="48" y2="10" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="10" r="3" fill="#9CA3AF" />
      <line x1="48" y1="13" x2="48" y2="52" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="48" cy="52" r="3" fill="#9CA3AF" />
    </>
  ),
  'go-fishing-2': (
    <>
      {/* Worm on hook */}
      <line x1="32" y1="8" x2="32" y2="30" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M28 32 Q32 40 36 32" stroke="#9CA3AF" strokeWidth="2" fill="none" />
      <path d="M30 38 Q34 48 38 42 Q36 36 32 40" fill="#F472B6" />
      <circle cx="30" cy="38" r="1.5" fill="#1E293B" />
      <rect x="0" y="48" width="64" height="16" fill="#60A5FA" opacity="0.4" rx="2" />
    </>
  ),
  'go-fishing-3': (
    <>
      {/* Line in water with ripples */}
      <rect x="0" y="32" width="64" height="32" fill="#3B82F6" opacity="0.3" rx="2" />
      <line x1="10" y1="8" x2="36" y2="8" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="8" x2="36" y2="44" stroke="#CBD5E1" strokeWidth="1" />
      <ellipse cx="36" cy="34" rx="8" ry="3" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
      <ellipse cx="36" cy="34" rx="14" ry="4" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
      <circle cx="36" cy="44" r="2" fill="#9CA3AF" />
    </>
  ),
  'go-fishing-4': (
    <>
      {/* Caught a fish! */}
      <rect x="0" y="40" width="64" height="24" fill="#3B82F6" opacity="0.3" rx="2" />
      <line x1="8" y1="8" x2="32" y2="8" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="8" x2="40" y2="28" stroke="#CBD5E1" strokeWidth="1" />
      {/* Fish */}
      <ellipse cx="40" cy="30" rx="12" ry="7" fill="#FB923C" />
      <path d="M52 30 L60 22 L60 38 Z" fill="#FB923C" />
      <circle cx="35" cy="28" r="2" fill="white" />
      <circle cx="35" cy="28" r="1" fill="#1E293B" />
      {/* Water splash */}
      <circle cx="30" cy="38" r="2" fill="#93C5FD" opacity="0.6" />
      <circle cx="46" cy="36" r="2" fill="#93C5FD" opacity="0.6" />
      <circle cx="38" cy="42" r="3" fill="#93C5FD" opacity="0.4" />
    </>
  ),
};
