export function extractAppleMusicAlbumRef(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'music.apple.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    let storefront = null;
    let albumIndex = -1;
    if (parts[0]?.toLowerCase() === 'album') {
      albumIndex = 0;
    } else if (parts[1]?.toLowerCase() === 'album' && /^[a-z]{2}$/i.test(parts[0] ?? '')) {
      storefront = parts[0].toLowerCase();
      albumIndex = 1;
    } else {
      return null;
    }
    const afterAlbum = parts.slice(albumIndex + 1);
    const idToken = afterAlbum.find((part) => /^\d+$/.test(part));
    if (!idToken) return null;
    return { albumId: idToken, storefront };
  } catch {
    return null;
  }
}

export function lookupCountriesForAppleStorefront(storefront) {
  const preferred = storefront?.toUpperCase() ?? null;
  const ordered = ['KR', 'US', 'JP'];
  if (!preferred) return [...ordered];
  return [preferred, ...ordered.filter((code) => code !== preferred)];
}

export function lookupCountriesForImportStorefront(storefront, urlStorefront) {
  if (storefront === 'jp') return lookupCountriesForAppleStorefront('jp');
  if (storefront === 'kr') return lookupCountriesForAppleStorefront('kr');
  return lookupCountriesForAppleStorefront(urlStorefront ?? null);
}

export function appleMusicAlbumPageUrl(albumId, storefront) {
  const code = storefront === 'jp' ? 'jp' : 'kr';
  return `https://music.apple.com/${code}/album/${albumId}`;
}

function asPositiveInt(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function asDurationMs(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export function parseItunesAlbumTracks(results) {
  const tracks = [];
  for (const item of results ?? []) {
    if (!item || typeof item !== 'object') continue;
    if (item.wrapperType !== 'track') continue;
    const title = typeof item.trackName === 'string' ? item.trackName.trim() : '';
    if (!title) continue;
    tracks.push({
      disc: asPositiveInt(item.discNumber, 1),
      no: asPositiveInt(item.trackNumber, tracks.length + 1),
      title,
      duration_ms: asDurationMs(item.trackTimeMillis),
    });
  }
  return tracks.sort(
    (a, b) => a.disc - b.disc || a.no - b.no || a.title.localeCompare(b.title, 'ko'),
  );
}
