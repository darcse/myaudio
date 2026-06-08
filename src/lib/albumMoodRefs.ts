export function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

export type AlbumIdCatalog = {
  kind: 'uuid' | 'integer';
  byKey: Map<string, string | number>;
  allKeys: string[];
};

export function buildAlbumIdCatalog(albumRows: { id: unknown }[]): AlbumIdCatalog {
  const byKey = new Map<string, string | number>();
  for (const row of albumRows) {
    const raw = row.id;
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (isUuidLike(t)) {
        const k = t.toLowerCase();
        byKey.set(k, k);
      } else if (/^-?\d+$/.test(t)) {
        const n = parseInt(t, 10);
        if (Number.isInteger(n)) byKey.set(String(n), n);
      }
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      const n = Math.trunc(raw);
      if (Number.isInteger(n)) byKey.set(String(n), n);
    }
  }
  const allKeys = [...byKey.keys()];
  const kind: 'uuid' | 'integer' =
    allKeys.length > 0 && allKeys.every((k) => isUuidLike(k)) ? 'uuid' : 'integer';
  return { kind, byKey, allKeys };
}

export function geminiCandidateToCatalogKey(x: unknown, kind: 'uuid' | 'integer'): string | null {
  if (kind === 'uuid') {
    if (typeof x !== 'string') return null;
    const t = x.trim();
    return isUuidLike(t) ? t.toLowerCase() : null;
  }
  if (typeof x === 'number' && Number.isFinite(x)) {
    const n = Math.trunc(x);
    return Number.isInteger(n) ? String(n) : null;
  }
  if (typeof x === 'string') {
    const t = x.trim();
    if (!/^-?\d+$/.test(t)) return null;
    const n = parseInt(t, 10);
    return Number.isInteger(n) ? String(n) : null;
  }
  return null;
}

export type AlbumMoodGroupRow = {
  mood_name: string;
  album_ids: (number | string)[];
};

export function listExplicitAlbumUuidsFromAlbumRows(albumRows: { id: unknown }[]): string[] {
  const out = new Set<string>();
  for (const row of albumRows) {
    const raw = row.id;
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (isUuidLike(t)) out.add(t.toLowerCase());
    }
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

export function narrowCatalogToExplicitUuids(
  catalog: AlbumIdCatalog,
  allowedUuids: readonly string[],
): AlbumIdCatalog | null {
  if (allowedUuids.length === 0) return catalog;
  const allowed = new Set(
    allowedUuids.map((u) => u.trim().toLowerCase()).filter((u) => isUuidLike(u)),
  );
  if (allowed.size === 0) return catalog;
  const byKey = new Map<string, string | number>();
  for (const [k, v] of catalog.byKey) {
    if (!isUuidLike(k)) continue;
    const key = k.toLowerCase();
    if (allowed.has(key)) {
      const stored = typeof v === 'string' ? v.trim().toLowerCase() : v;
      byKey.set(key, stored);
    }
  }
  const allKeys = [...byKey.keys()].sort((a, b) => a.localeCompare(b));
  if (allKeys.length === 0) return null;
  return { kind: 'uuid', byKey, allKeys };
}

export type AlbumMoodUuidOptions = {
  readonly promptAllowedUuids: readonly string[];
};

export function parseGeminiAlbumMoodJson(raw: unknown, catalog: AlbumIdCatalog): AlbumMoodGroupRow[] | null {
  if (catalog.allKeys.length === 0) return null;
  if (!Array.isArray(raw) || raw.length !== 9) return null;
  const rows: { mood_name: string; keys: string[] }[] = [];
  for (let i = 0; i < 9; i += 1) {
    const el = raw[i];
    if (!el || typeof el !== 'object') return null;
    const o = el as Record<string, unknown>;
    const name = typeof o.mood_name === 'string' ? o.mood_name.trim() : '';
    if (!name) return null;
    const idsRaw = o.album_ids;
    const keys: string[] = [];
    if (Array.isArray(idsRaw)) {
      for (const x of idsRaw) {
        const k = geminiCandidateToCatalogKey(x, catalog.kind);
        if (k != null && catalog.byKey.has(k)) keys.push(k);
      }
    }
    rows.push({ mood_name: name, keys: [...new Set(keys)] });
  }
  const seen = new Set<string>();
  const cleaned = rows.map((r) => ({
    mood_name: r.mood_name,
    keys: r.keys.filter((k) => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }),
  }));
  for (const key of catalog.allKeys) {
    if (!seen.has(key)) {
      let minIdx = 0;
      let minLen = cleaned[0].keys.length;
      for (let j = 1; j < 9; j += 1) {
        if (cleaned[j].keys.length < minLen) {
          minLen = cleaned[j].keys.length;
          minIdx = j;
        }
      }
      cleaned[minIdx].keys.push(key);
      seen.add(key);
    }
  }
  if (seen.size !== catalog.allKeys.length) return null;
  const usedNames = new Set<string>();
  return cleaned.map((r) => {
    const album_ids = r.keys.map((k) => catalog.byKey.get(k)!);
    const mood_name = r.mood_name;
    if (!usedNames.has(mood_name)) {
      usedNames.add(mood_name);
      return { mood_name, album_ids };
    }
    let n = 2;
    let candidate = `${r.mood_name} (${n})`;
    while (usedNames.has(candidate)) {
      n += 1;
      candidate = `${r.mood_name} (${n})`;
    }
    usedNames.add(candidate);
    return { mood_name: candidate, album_ids };
  });
}

export function refineMoodGroupsForDb(
  rows: AlbumMoodGroupRow[],
  albumRows: { id: unknown }[],
  options?: AlbumMoodUuidOptions,
): AlbumMoodGroupRow[] {
  const base = buildAlbumIdCatalog(albumRows);
  let catalog: AlbumIdCatalog = base;
  if (options?.promptAllowedUuids && options.promptAllowedUuids.length > 0) {
    const narrowed = narrowCatalogToExplicitUuids(base, options.promptAllowedUuids);
    if (narrowed) catalog = narrowed;
  }
  if (rows.length === 0 || catalog.allKeys.length === 0) return rows;
  const keyed = rows.map((r) => ({
    mood_name: r.mood_name,
    keys: [
      ...new Set(
        r.album_ids
          .map((x) => geminiCandidateToCatalogKey(x, catalog.kind))
          .filter((k): k is string => k != null && catalog.byKey.has(k)),
      ),
    ],
  }));
  const seen = new Set<string>();
  const cleaned = keyed.map((r) => ({
    mood_name: r.mood_name,
    keys: r.keys.filter((k) => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }),
  }));
  for (const key of catalog.allKeys) {
    if (!seen.has(key)) {
      if (cleaned.length === 0) break;
      let minIdx = 0;
      let minLen = cleaned[0].keys.length;
      for (let j = 1; j < cleaned.length; j += 1) {
        if (cleaned[j].keys.length < minLen) {
          minLen = cleaned[j].keys.length;
          minIdx = j;
        }
      }
      cleaned[minIdx].keys.push(key);
      seen.add(key);
    }
  }
  const usedNames = new Set<string>();
  return cleaned.map((r) => {
    const album_ids = r.keys.map((k) => catalog.byKey.get(k)!);
    const mood_name = r.mood_name;
    if (!usedNames.has(mood_name)) {
      usedNames.add(mood_name);
      return { mood_name, album_ids };
    }
    let n = 2;
    let candidate = `${r.mood_name} (${n})`;
    while (usedNames.has(candidate)) {
      n += 1;
      candidate = `${r.mood_name} (${n})`;
    }
    usedNames.add(candidate);
    return { mood_name: candidate, album_ids };
  });
}
