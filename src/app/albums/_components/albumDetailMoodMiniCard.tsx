'use client';

import type { CSSProperties } from 'react';
import { getMoodVibeGradient } from '../moodGradient';

const MOOD_VIBE_EMOJIS = ['🤘', '🌙', '⚡', '🎷', '🍃', '✨', '🔷', '🎻', '🎤'];

const MOOD_KEYWORD_SLOTS: { keys: string[]; slot: number }[] = [
  { keys: ['메탈', 'metal', '둠', 'doom', '데스', 'death', '블랙', 'black', '스래시', 'thrash', '헤비', '냉소', '다크', 'dark', 'cold'], slot: 0 },
  { keys: ['슈게', 'shoegaze', '몽환', 'dream', '탐미', 'ambient', '앰비', 'ethereal', '노이즈', 'noise'], slot: 1 },
  { keys: ['펑크', 'punk', '저항', '하드코어', 'hardcore', '스카', 'ska', '강렬', 'energy', 'riot'], slot: 2 },
  { keys: ['재즈', 'jazz', '스윙', 'swing', 'soul', '보사', 'bossa', '쿨', 'cool'], slot: 3 },
  { keys: ['포크', 'folk', '어쿠스', 'acoustic', '컨츄리', 'country', '따뜻', 'warm'], slot: 4 },
  { keys: ['팝', 'pop', '밝', 'bright', '상큼', '댄스', 'dance'], slot: 5 },
  { keys: ['일렉', 'electronic', '신스', 'synth', 'edm', '테크', 'techno', '하우스', 'house'], slot: 6 },
  { keys: ['클래식', 'classical', '오페라', 'opera', '현악', 'orchestral', '실내악'], slot: 7 },
  { keys: ['힙합', 'hip', 'hop', '랩', 'rap', 'r&b', 'urban', '트랩', 'trap'], slot: 8 },
];

const vibeBadgeStyle: CSSProperties = {
  padding: '0.875rem 1.25rem',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.2)',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  width: 'fit-content',
  maxWidth: '100%',
};

function getMoodVibeEmoji(moodName: string): string {
  const n = moodName.trim().toLowerCase();
  for (const row of MOOD_KEYWORD_SLOTS) {
    if (row.keys.some((k) => n.includes(k.toLowerCase()))) {
      return MOOD_VIBE_EMOJIS[row.slot % MOOD_VIBE_EMOJIS.length];
    }
  }
  let h = 0;
  for (let i = 0; i < n.length; i++) {
    h = (h + n.charCodeAt(i) * (i + 7)) | 0;
  }
  return MOOD_VIBE_EMOJIS[Math.abs(h) % MOOD_VIBE_EMOJIS.length];
}

export function MoodMiniCard({
  moodName,
  onNavigate,
}: {
  moodName: string;
  onNavigate?: (name: string) => void;
}) {
  const emoji = getMoodVibeEmoji(moodName);
  const badgeSurface: CSSProperties = { ...vibeBadgeStyle, background: getMoodVibeGradient(moodName) };
  const inner = (
    <div className="flex items-center gap-[0.6rem] font-medium text-[0.85rem]">
      <span className="shrink-0 leading-none text-base text-[#fbbf24]" aria-hidden>
        {emoji}
      </span>
      <span className="break-words text-left">{moodName.trim()}</span>
    </div>
  );
  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(moodName.trim())}
        className="text-left cursor-pointer transition-[filter,opacity] duration-200 hover:brightness-110 active:opacity-90"
        style={badgeSurface}
      >
        {inner}
      </button>
    );
  }
  return <div style={badgeSurface}>{inner}</div>;
}
