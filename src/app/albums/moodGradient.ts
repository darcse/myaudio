const MOOD_GRADIENT_ROWS: { keys: string[]; a: string; b: string }[] = [
  { keys: ['메탈의 서사', '냉소적인 메탈', '냉소', '메탈', 'metal', '둠', 'doom'], a: '#0f0f0f', b: '#1a1a1a' },
  { keys: ['슈게이징', 'shoegaze', '탐미적인 슈게', '몽환적이고 탐미'], a: '#6b21a8', b: '#9333ea' },
  { keys: ['실험적인 사운드', '몽환적 감성과 실험', '실험적인'], a: '#1e3a8a', b: '#2563eb' },
  { keys: ['얼터너티브', 'alternative', '서정적인 얼터', '철학적이고 서정'], a: '#14532d', b: '#16a34a' },
  { keys: ['저항 정신', '폭발적인 에너지', '폭발적', '저항', '펑크', 'punk', '하드코어', 'hardcore'], a: '#991b1b', b: '#dc2626' },
  { keys: ['희망찬 정서', '세련된 청량', '청량감', '청량'], a: '#0369a1', b: '#0ea5e9' },
  { keys: ['댄스 무드', '도시적인 그루브', '그루브', '댄스'], a: '#854d0e', b: '#ca8a04' },
  { keys: ['위로를 전하는', '향수와 위로', '서정성'], a: '#7c2d12', b: '#ea580c' },
  { keys: ['감동의 서사시', '벅차오르는', '서사시'], a: '#155e75', b: '#0891b2' },
];

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function getMoodGradientPair(moodName: string): { a: string; b: string } {
  const n = moodName.trim().toLowerCase();
  if (!n) {
    const row = MOOD_GRADIENT_ROWS[0];
    return { a: row.a, b: row.b };
  }
  for (const row of MOOD_GRADIENT_ROWS) {
    if (row.keys.some((k) => n.includes(k.toLowerCase()))) {
      return { a: row.a, b: row.b };
    }
  }
  let h = 0;
  for (let i = 0; i < n.length; i++) {
    h = (h + n.charCodeAt(i) * (i + 11)) | 0;
  }
  const row = MOOD_GRADIENT_ROWS[Math.abs(h) % MOOD_GRADIENT_ROWS.length];
  return { a: row.a, b: row.b };
}

export function getMoodVibeGradient(moodName: string): string {
  const { a, b } = getMoodGradientPair(moodName);
  return `linear-gradient(135deg, ${a}, ${b})`;
}
