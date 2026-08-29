const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function colorDistance(hexA: string, hexB: string): number {
  const parse = (hex: string) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(hexA);
  const [br, bg, bb] = parse(hexB);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

export function normalizeDominantColors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && HEX_COLOR.test(item));
}

function uniqueDiaryColors(colors: string[]): string[] {
  const unique: string[] = [];
  for (const color of colors) {
    if (!HEX_COLOR.test(color)) continue;
    if (unique.some((existing) => colorDistance(existing, color) < 28)) continue;
    unique.push(color);
  }
  return unique;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function softenHexForCalendar(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  const softS = s < 0.08 ? s : Math.min(Math.max(s * 0.55, 0.28), 0.48);
  const softL = Math.min(Math.max(l * 0.7 + 0.12, 0.34), 0.5);
  return hslToHex(h, softS, softL);
}

export function buildDiaryDayGradient(colors: string[]): string | null {
  const unique = uniqueDiaryColors(colors);
  if (unique.length === 0) return null;
  if (unique.length === 1) {
    return `linear-gradient(135deg, ${unique[0]}d9 0%, ${unique[0]}80 100%)`;
  }
  const stops = unique
    .map((color, index) => {
      const pct = Math.round((index / (unique.length - 1)) * 100);
      return `${color}cc ${pct}%`;
    })
    .join(', ');
  return `linear-gradient(135deg, ${stops})`;
}

export function buildDiaryDaySoftGradient(colors: string[]): string | null {
  const unique = uniqueDiaryColors(colors)
    .slice(0, 3)
    .map(softenHexForCalendar);
  if (unique.length === 0) return null;
  const overlay = 'linear-gradient(160deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.32) 100%)';
  if (unique.length === 1) {
    return `${overlay}, linear-gradient(160deg, ${unique[0]} 0%, ${unique[0]}99 100%)`;
  }
  if (unique.length === 2) {
    return `${overlay}, linear-gradient(160deg, ${unique[0]} 0%, ${unique[1]} 100%)`;
  }
  return `${overlay}, radial-gradient(120% 140% at 15% 10%, ${unique[0]} 0%, transparent 55%), radial-gradient(110% 130% at 85% 90%, ${unique[2]} 0%, transparent 50%), linear-gradient(160deg, ${unique[0]} 0%, ${unique[1]} 55%, ${unique[2]} 100%)`;
}

export function collectDiaryDayColors(entries: { albumId: number; album: { dominant_colors?: unknown } | null }[]): string[] {
  const colors: string[] = [];
  const seenAlbums = new Set<number>();
  for (const entry of entries) {
    if (!entry.album || seenAlbums.has(entry.albumId)) continue;
    seenAlbums.add(entry.albumId);
    colors.push(...normalizeDominantColors(entry.album.dominant_colors));
  }
  return colors;
}
