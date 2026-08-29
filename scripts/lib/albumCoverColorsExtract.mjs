import sharp from 'sharp';

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function colorDistance(hexA, hexB) {
  const parse = (hex) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(hexA);
  const [br, bg, bb] = parse(hexB);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

async function extractFromBuffer(buffer) {
  const { data } = await sharp(buffer)
    .resize(48, 48, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 18 || min > 240) continue;

    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    const prev = buckets.get(key);
    if (prev) {
      prev.count += 1;
      prev.r += r;
      prev.g += g;
      prev.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count);
  const colors = [];
  for (const bucket of ranked) {
    const r = Math.round(bucket.r / bucket.count);
    const g = Math.round(bucket.g / bucket.count);
    const b = Math.round(bucket.b / bucket.count);
    const hex = rgbToHex(r, g, b);
    if (colors.some((existing) => colorDistance(existing, hex) < 36)) continue;
    colors.push(hex);
    if (colors.length >= 3) break;
  }

  if (colors.length === 0 && ranked[0]) {
    const bucket = ranked[0];
    colors.push(
      rgbToHex(
        Math.round(bucket.r / bucket.count),
        Math.round(bucket.g / bucket.count),
        Math.round(bucket.b / bucket.count),
      ),
    );
  }

  return colors;
}

async function loadCoverBuffer(coverUrl) {
  const trimmed = coverUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:')) {
    const base64 = trimmed.split(',')[1];
    if (!base64) return null;
    return Buffer.from(base64, 'base64');
  }

  try {
    const res = await fetch(trimmed, {
      headers: { 'User-Agent': 'MyAudio/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function extractDominantColorsFromCoverUrl(coverUrl) {
  try {
    const buffer = await loadCoverBuffer(coverUrl);
    if (!buffer) return [];
    return await extractFromBuffer(buffer);
  } catch {
    return [];
  }
}
