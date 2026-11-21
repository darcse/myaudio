import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  appleMusicAlbumPageUrl,
  extractAppleMusicAlbumRef,
  lookupCountriesForImportStorefront,
  parseItunesAlbumTracks,
} from './lib/appleMusicTracks.mjs';
import {
  fetchAppleMusicPageTracks,
  needsAppleMusicPageTrackFallback,
} from './lib/appleMusicPageTracks.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_PATH = join(root, 'docs/reports/jp-track-rename-preview.json');
const APPLY_PATH = join(root, 'docs/reports/jp-track-rename-apply.json');
const PAGE_SIZE = 200;
const LOOKUP_TIMEOUT_MS = 8000;
const REQUEST_GAP_MS_MIN = 1500;
const REQUEST_GAP_MS_MAX = 2000;
const MAX_RETRIES = 3;

function loadEnvLocal() {
  const path = join(root, '.env.local');
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/rename-jp-album-tracks.mjs [options]

Options:
  (default)     Preview only — fetch JP store tracks, write ${PREVIEW_PATH}
  --apply       Read preview file only (no Apple requests). Update title when disc/no match
  --limit N     Process only the first N matching albums (by id asc)
  --id N        Process only album id N
  --help        Show this help

Examples:
  node scripts/rename-jp-album-tracks.mjs --limit 5
  node scripts/rename-jp-album-tracks.mjs --apply --limit 5
  node scripts/rename-jp-album-tracks.mjs
  node scripts/rename-jp-album-tracks.mjs --apply

Note:
  Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
  Targets: country='일본', tracks length >= 1, valid apple_music_url album id.
  Never updates album_name. Lyrics tables are not touched.
`);
}

function parseArgs(argv) {
  const options = { apply: false, limit: null, id: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--limit') {
      const n = Number.parseInt(argv[i + 1] ?? '', 10);
      if (!Number.isFinite(n) || n <= 0) throw new Error('--limit requires a positive integer');
      options.limit = n;
      i += 1;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const n = Number.parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) throw new Error('--limit requires a positive integer');
      options.limit = n;
      continue;
    }
    if (arg === '--id') {
      const n = Number.parseInt(argv[i + 1] ?? '', 10);
      if (!Number.isFinite(n) || n <= 0) throw new Error('--id requires a positive integer');
      options.id = n;
      i += 1;
      continue;
    }
    if (arg.startsWith('--id=')) {
      const n = Number.parseInt(arg.slice('--id='.length), 10);
      if (!Number.isFinite(n) || n <= 0) throw new Error('--id requires a positive integer');
      options.id = n;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestGapMs() {
  return (
    REQUEST_GAP_MS_MIN +
    Math.floor(Math.random() * (REQUEST_GAP_MS_MAX - REQUEST_GAP_MS_MIN + 1))
  );
}

function normalizeTracks(value) {
  if (!Array.isArray(value)) return [];
  const tracks = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const title = typeof item.title === 'string' ? item.title : '';
    tracks.push({
      disc:
        typeof item.disc === 'number' && Number.isFinite(item.disc) && item.disc > 0
          ? Math.floor(item.disc)
          : 1,
      no:
        typeof item.no === 'number' && Number.isFinite(item.no) && item.no > 0
          ? Math.floor(item.no)
          : tracks.length + 1,
      title,
      duration_ms:
        typeof item.duration_ms === 'number' && Number.isFinite(item.duration_ms)
          ? Math.round(item.duration_ms)
          : null,
    });
  }
  return tracks;
}

function snapshotDiscNo(tracks) {
  return tracks.map((t) => ({ disc: t.disc, no: t.no, title: t.title }));
}

function discNoEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].disc !== b[i].disc || a[i].no !== b[i].no) return false;
  }
  return true;
}

function countChangedTitles(currentTracks, jpTracks) {
  const byKey = new Map(jpTracks.map((t) => [`${t.disc}:${t.no}`, t.title]));
  let changed = 0;
  for (const track of currentTracks) {
    const next = byKey.get(`${track.disc}:${track.no}`);
    if (next != null && next !== track.title) changed += 1;
  }
  return changed;
}

function buildRenamedTracks(currentTracks, jpTracks) {
  const byKey = new Map(jpTracks.map((t) => [`${t.disc}:${t.no}`, t.title]));
  return currentTracks.map((track) => {
    const nextTitle = byKey.get(`${track.disc}:${track.no}`);
    return {
      disc: track.disc,
      no: track.no,
      title: nextTitle != null ? nextTitle : track.title,
      duration_ms: track.duration_ms,
    };
  });
}

async function fetchLookupResults(albumId, country, entity) {
  const endpoint = new URL('https://itunes.apple.com/lookup');
  endpoint.searchParams.set('id', albumId);
  endpoint.searchParams.set('entity', entity);
  endpoint.searchParams.set('country', country);
  if (entity === 'song') endpoint.searchParams.set('limit', '200');
  const res = await fetch(endpoint.toString(), {
    cache: 'no-store',
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (!res.ok) return { results: [], status: res.status };
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') return { results: [], status: res.status };
  const results = data.results;
  return { results: Array.isArray(results) ? results : [], status: res.status };
}

async function fetchWithRetry(albumId, country, entity) {
  let lastStatus = null;
  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const { results, status } = await fetchLookupResults(albumId, country, entity);
      lastStatus = status;
      if (status === 429 || status >= 500) {
        lastError = `HTTP ${status}`;
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return { results, status, error: null };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await sleep(500 * 2 ** attempt);
    }
  }
  return { results: [], status: lastStatus, error: lastError };
}

function findCollection(results) {
  for (const item of results ?? []) {
    if (!item || typeof item !== 'object') continue;
    if (typeof item.collectionName !== 'string' || !item.collectionName.trim()) continue;
    if (item.wrapperType === 'collection') return item;
    if (typeof item.collectionType === 'string' && item.collectionType.length > 0) return item;
  }
  return null;
}

function collectionTrackCount(album) {
  const value = album?.trackCount;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

async function lookupJpTracks(appleMusicUrl) {
  const ref = extractAppleMusicAlbumRef(appleMusicUrl);
  if (!ref) {
    return {
      status: 'not_found',
      reason: 'invalid Apple Music album URL',
      tracks: [],
      collectionName: null,
      expectedTrackCount: null,
    };
  }

  const countries = lookupCountriesForImportStorefront('jp', ref.storefront);
  let collection = null;
  let collectionName = null;
  let expectedTrackCount = null;
  let lastError = null;
  let sawFailure = false;

  for (const country of countries) {
    const albumLookup = await fetchWithRetry(ref.albumId, country, 'album');
    if (albumLookup.error || (albumLookup.status != null && albumLookup.status >= 400)) {
      sawFailure = true;
      lastError = albumLookup.error ?? `HTTP ${albumLookup.status}`;
    }
    const found = findCollection(albumLookup.results);
    if (found) {
      collection = found;
      collectionName =
        typeof found.collectionName === 'string' ? found.collectionName.trim() : null;
      expectedTrackCount = collectionTrackCount(found);
      break;
    }
    await sleep(requestGapMs());
  }

  let tracks = [];
  for (const country of countries) {
    const songLookup = await fetchWithRetry(ref.albumId, country, 'song');
    if (songLookup.error || (songLookup.status != null && songLookup.status >= 400)) {
      sawFailure = true;
      lastError = songLookup.error ?? `HTTP ${songLookup.status}`;
    }
    tracks = parseItunesAlbumTracks(songLookup.results);
    if (!collection) {
      const found = findCollection(songLookup.results);
      if (found) {
        collection = found;
        collectionName =
          typeof found.collectionName === 'string' ? found.collectionName.trim() : null;
        expectedTrackCount = collectionTrackCount(found);
      }
    }
    if (tracks.length > 0) break;
    await sleep(requestGapMs());
  }

  if (needsAppleMusicPageTrackFallback(tracks.length, expectedTrackCount)) {
    const pageUrl = appleMusicAlbumPageUrl(ref.albumId, 'jp');
    const pageTracks = await fetchAppleMusicPageTracks(pageUrl);
    if (pageTracks.length > tracks.length) tracks = pageTracks;
  }

  if (tracks.length === 0 && !collection) {
    return {
      status: sawFailure ? 'failed' : 'not_found',
      reason: lastError ?? 'album not found',
      tracks: [],
      collectionName: null,
      expectedTrackCount: null,
    };
  }

  return {
    status: 'ok',
    reason: null,
    tracks,
    collectionName,
    expectedTrackCount,
  };
}

async function fetchTargetAlbums(supabase, options) {
  if (options.id != null) {
    const { data, error } = await supabase
      .from('album')
      .select('id, artist, album_name, country, apple_music_url, tracks')
      .eq('id', options.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return [];
    if (data.country !== '일본') return [];
    const url = typeof data.apple_music_url === 'string' ? data.apple_music_url.trim() : '';
    const tracks = normalizeTracks(data.tracks);
    if (!url || tracks.length === 0) return [];
    if (!extractAppleMusicAlbumRef(url)) return [];
    return [
      {
        id: data.id,
        artist: data.artist ?? null,
        album_name: data.album_name,
        apple_music_url: url,
        tracks,
      },
    ];
  }

  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('album')
      .select('id, artist, album_name, country, apple_music_url, tracks')
      .eq('country', '일본')
      .not('apple_music_url', 'is', null)
      .neq('apple_music_url', '')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    for (const row of page) {
      const url = typeof row.apple_music_url === 'string' ? row.apple_music_url.trim() : '';
      const tracks = normalizeTracks(row.tracks);
      if (!url || tracks.length === 0) continue;
      if (!extractAppleMusicAlbumRef(url)) continue;
      rows.push({
        id: row.id,
        artist: row.artist ?? null,
        album_name: row.album_name,
        apple_music_url: url,
        tracks,
      });
      if (options.limit != null && rows.length >= options.limit) return rows;
    }
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function summarizeByStatus(rows) {
  const counts = {};
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

function logProgress(i, total, id, status) {
  const line = `[${i + 1}/${total}] id=${id} ${status}`;
  if (total <= 20 || (i + 1) % 50 === 0 || i + 1 === total) {
    process.stdout.write(`${line}\n`);
  } else {
    process.stdout.write(`\r${line}   `);
  }
}

async function runPreview(supabase, options) {
  const targets = await fetchTargetAlbums(supabase, options);
  console.log(
    `대상: ${targets.length} (country=일본, tracks>=1${
      options.limit != null ? `, limit=${options.limit}` : ''
    }${options.id != null ? `, id=${options.id}` : ''})`,
  );
  console.log('모드: preview (DB 미기록)');

  const rows = [];
  for (let i = 0; i < targets.length; i += 1) {
    const album = targets[i];
    const lookedUp = await lookupJpTracks(album.apple_music_url);
    let row;

    if (lookedUp.status !== 'ok') {
      row = {
        id: album.id,
        artist: album.artist,
        album_name: album.album_name,
        status: lookedUp.status,
        reason: lookedUp.reason,
        currentTrackCount: album.tracks.length,
        jpTrackCount: 0,
        changedTitleCount: 0,
        currentTracks: snapshotDiscNo(album.tracks),
        jpTracks: [],
        jpCollectionName: lookedUp.collectionName,
      };
    } else if (lookedUp.tracks.length !== album.tracks.length) {
      row = {
        id: album.id,
        artist: album.artist,
        album_name: album.album_name,
        status: 'count_mismatch',
        reason: `current=${album.tracks.length}, jp=${lookedUp.tracks.length}`,
        currentTrackCount: album.tracks.length,
        jpTrackCount: lookedUp.tracks.length,
        changedTitleCount: 0,
        currentTracks: snapshotDiscNo(album.tracks),
        jpTracks: lookedUp.tracks,
        jpCollectionName: lookedUp.collectionName,
      };
    } else {
      const changedTitleCount = countChangedTitles(album.tracks, lookedUp.tracks);
      row = {
        id: album.id,
        artist: album.artist,
        album_name: album.album_name,
        status: changedTitleCount > 0 ? 'ready' : 'no_change',
        reason: null,
        currentTrackCount: album.tracks.length,
        jpTrackCount: lookedUp.tracks.length,
        changedTitleCount,
        currentTracks: snapshotDiscNo(album.tracks),
        jpTracks: lookedUp.tracks,
        jpCollectionName: lookedUp.collectionName,
      };
    }

    rows.push(row);
    logProgress(i, targets.length, album.id, row.status);
    if (i < targets.length - 1) await sleep(requestGapMs());
  }

  if (targets.length > 20) process.stdout.write('\n');

  const byStatus = summarizeByStatus(rows);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'preview',
    limit: options.limit,
    id: options.id,
    targetCount: rows.length,
    byStatus,
    rows,
  };
  mkdirSync(dirname(PREVIEW_PATH), { recursive: true });
  writeFileSync(PREVIEW_PATH, JSON.stringify(report, null, 2));
  console.log('=== 요약 ===');
  console.log(JSON.stringify(byStatus, null, 2));
  console.log(`보고서: ${PREVIEW_PATH}`);
}

async function runApply(supabase, options) {
  let preview;
  try {
    preview = JSON.parse(readFileSync(PREVIEW_PATH, 'utf8'));
  } catch {
    console.error(`미리보기 파일이 없습니다: ${PREVIEW_PATH}`);
    process.exitCode = 1;
    return;
  }

  let candidates = (preview.rows ?? []).filter((row) => row.status === 'ready');
  if (options.id != null) {
    candidates = candidates.filter((row) => row.id === options.id);
  }
  if (options.limit != null) {
    candidates = candidates.slice(0, options.limit);
  }

  console.log(`적용 대상(ready): ${candidates.length} (파일만 사용, Apple 요청 없음)`);
  const results = [];
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < candidates.length; i += 1) {
    const row = candidates[i];
    const { data: fresh, error } = await supabase
      .from('album')
      .select('id, tracks, album_name')
      .eq('id', row.id)
      .maybeSingle();

    if (error || !fresh) {
      results.push({ id: row.id, status: 'skipped', reason: 'not_found' });
      skipped += 1;
      logProgress(i, candidates.length, row.id, 'skipped');
      continue;
    }

    const currentTracks = normalizeTracks(fresh.tracks);
    const snapshot = Array.isArray(row.currentTracks) ? row.currentTracks : [];
    if (
      currentTracks.length !== snapshot.length ||
      !discNoEqual(
        currentTracks.map((t) => ({ disc: t.disc, no: t.no })),
        snapshot.map((t) => ({ disc: t.disc, no: t.no })),
      )
    ) {
      results.push({
        id: row.id,
        status: 'skipped',
        reason: 'disc_no_mismatch_or_count_changed',
      });
      skipped += 1;
      logProgress(i, candidates.length, row.id, 'skipped');
      continue;
    }

    const jpTracks = Array.isArray(row.jpTracks) ? row.jpTracks : [];
    if (jpTracks.length !== currentTracks.length) {
      results.push({ id: row.id, status: 'skipped', reason: 'jp_count_mismatch' });
      skipped += 1;
      logProgress(i, candidates.length, row.id, 'skipped');
      continue;
    }

    const nextTracks = buildRenamedTracks(currentTracks, jpTracks);
    const { error: updateError } = await supabase
      .from('album')
      .update({ tracks: nextTracks })
      .eq('id', row.id);
    if (updateError) {
      results.push({ id: row.id, status: 'failed', reason: updateError.message });
      skipped += 1;
      logProgress(i, candidates.length, row.id, 'failed');
      continue;
    }

    results.push({
      id: row.id,
      status: 'updated',
      changedTitleCount: countChangedTitles(currentTracks, jpTracks),
      album_name: fresh.album_name,
    });
    updated += 1;
    logProgress(i, candidates.length, row.id, 'updated');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'apply',
    limit: options.limit,
    id: options.id,
    previewGeneratedAt: preview.generatedAt ?? null,
    candidateCount: candidates.length,
    updated,
    skipped,
    results,
  };
  mkdirSync(dirname(APPLY_PATH), { recursive: true });
  writeFileSync(APPLY_PATH, JSON.stringify(report, null, 2));
  console.log('=== 요약 ===');
  console.log(`updated=${updated}, skipped=${skipped}`);
  console.log(`보고서: ${APPLY_PATH}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.',
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, key);
  if (options.apply) {
    await runApply(supabase, options);
  } else {
    await runPreview(supabase, options);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
