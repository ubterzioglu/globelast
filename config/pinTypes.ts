export type PinType = 'greeting' | 'student' | 'event' | 'family' | 'general';

export const DEFAULT_PIN_TYPE: PinType = 'greeting';

export type PinTypeConfig = {
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  glow: string;
};

export const PIN_TYPES: Record<PinType, PinTypeConfig> = {
  greeting: {
    emoji: '🇹🇷',
    label: 'Selam',
    shortLabel: 'Selam',
    description: 'Genel selamlama / greet',
    color: '#ff2d2d',
    glow: 'rgba(255,45,45,0.45)',
  },
  student: {
    emoji: '🎓',
    label: 'Öğrenci',
    shortLabel: 'Öğrenci',
    description: 'Yurtdışında öğrenim gören',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.45)',
  },
  event: {
    emoji: '📍',
    label: 'Etkinlik',
    shortLabel: 'Etkinlik',
    description: '19 Mayıs etkinliği / organizasyon',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.45)',
  },
  family: {
    emoji: '🏠',
    label: 'Aile',
    shortLabel: 'Aile',
    description: 'Aile bağını paylaşıyor',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.45)',
  },
  general: {
    emoji: '🌍',
    label: 'Genel',
    shortLabel: 'Genel',
    description: 'Diğer / genel katılım',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.45)',
  },
};

export const PIN_TYPE_OPTIONS: PinType[] = ['greeting', 'student', 'event', 'family', 'general'];
