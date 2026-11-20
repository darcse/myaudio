import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  extractAppleMusicAlbumRef,
  lookupCountriesForAppleStorefront,
  parseItunesAlbumTracks,
} from './lib/appleMusicTracks.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = join(root, 'docs/reports/album-tracks-backfill-preview.json');
const PAGE_SIZE = 200;
const LOOKUP_TIMEOUT_MS = 8000;
const REQUEST_GAP_MS_MIN = 1000;
const REQUEST_GAP_MS_MAX = 1500;
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
  node scripts/backfill-album-tracks.mjs [options]

Options:
  (default)     Preview only — no DB writes. Writes docs/reports/album-tracks-backfill-preview.json
  --apply       Write tracks only when the album still has empty tracks
  --limit N     Process only the first N matching albums (by id asc)
  --id N        Process only album id N
  --help        Show this help

Examples:
  node scripts/backfill-album-tracks.mjs --limit 20
  node scripts/backfill-album-tracks.mjs
  node scripts/backfill-album-tracks.mjs --apply --limit 20

Note:
  Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
  Apple Music parsing helpers are mirrored in scripts/lib/appleMusicTracks.mjs
  (same behavior as src/lib/appleMusic.ts + src/lib/appleMusicTracks.ts; plain node
  cannot import Next src TS without tsx).
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

function isEmptyTracks(value) {
  if (value == null) return true;
  if (!Array.isArray(value)) return true;
  return value.length === 0;
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

async function fetchLookupResults(albumId, country) {
  const endpoint = new URL('https://itunes.apple.com/lookup');
  endpoint.searchParams.set('id', albumId);
  endpoint.searchParams.set('entity', 'song');
  endpoint.searchParams.set('country', country);
  endpoint.searchParams.set('limit', '200');
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

async function fetchTracksWithRetry(albumId, country) {
  let lastStatus = null;
  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const { results, status } = await fetchLookupResults(albumId, country);
      lastStatus = status;
      if (status != null && (status === 429 || status >= 500)) {
        lastError = `HTTP ${status}`;
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return { tracks: parseItunesAlbumTracks(results), status, error: null };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await sleep(500 * 2 ** attempt);
    }
  }
  return { tracks: [], status: lastStatus, error: lastError };
}

async function lookupTracksForUrl(appleMusicUrl) {
  const ref = extractAppleMusicAlbumRef(appleMusicUrl);
  if (!ref) {
    return { tracks: [], reason: 'invalid Apple Music album URL', status: 'invalid_url' };
  }
  const countries = lookupCountriesForAppleStorefront(ref.storefront);
  let lastReason = null;
  let sawHttpFailure = false;
  for (const country of countries) {
    const result = await fetchTracksWithRetry(ref.albumId, country);
    if (result.tracks.length > 0) {
      return { tracks: result.tracks, reason: null, status: 'ok' };
    }
    if (result.error) {
      sawHttpFailure = true;
      lastReason = `${country}: ${result.error}`;
    } else if (result.status != null && result.status >= 400) {
      sawHttpFailure = true;
      lastReason = `${country}: HTTP ${result.status}`;
    } else {
      lastReason = `${country}: 0 tracks`;
    }
  }
  return {
    tracks: [],
    reason: lastReason ?? 'no tracks found',
    status: sawHttpFailure ? 'lookup_failed' : 'empty_tracks',
  };
}

async function fetchTargetAlbums(supabase, options) {
  if (options.id != null) {
    const { data, error } = await supabase
      .from('album')
      .select('id, artist, album_name, apple_music_url, tracks')
      .eq('id', options.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return [];
    const url = typeof data.apple_music_url === 'string' ? data.apple_music_url.trim() : '';
    if (!url || !isEmptyTracks(data.tracks)) return [];
    return [
      {
        id: data.id,
        artist: data.artist ?? null,
        album_name: data.album_name,
        apple_music_url: url,
        tracks: data.tracks,
      },
    ];
  }

  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('album')
      .select('id, artist, album_name, apple_music_url, tracks')
      .not('apple_music_url', 'is', null)
      .neq('apple_music_url', '')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    for (const row of page) {
      const url = typeof row.apple_music_url === 'string' ? row.apple_music_url.trim() : '';
      if (!url || !isEmptyTracks(row.tracks)) continue;
      rows.push({
        id: row.id,
        artist: row.artist ?? null,
        album_name: row.album_name,
        apple_music_url: url,
        tracks: row.tracks,
      });
      if (options.limit != null && rows.length >= options.limit) return rows;
    }
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function summarize(rows) {
  const counts = {};
  for (const row of rows) {
    let key = row.status;
    if (row.status !== 'ok' && row.reason) key = `${row.status}:${row.reason}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
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
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. Add the service role key, then re-run.',
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, key);
  const targets = await fetchTargetAlbums(supabase, options);
  console.log(
    `대상 앨범: ${targets.length}건 (apple_music_url 있음 + tracks 비어 있음${
      options.limit != null ? `, limit=${options.limit}` : ''
    }${options.id != null ? `, id=${options.id}` : ''})`,
  );
  console.log(options.apply ? '모드: --apply (저장)' : '모드: preview (저장 없음)');

  const rows = [];
  let success = 0;
  let emptyCount = 0;
  let failedCount = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const album = targets[i];
    const lookedUp = await lookupTracksForUrl(album.apple_music_url);
    const possiblyTruncatedAt200 = lookedUp.tracks.length === 200;
    let row;

    if (lookedUp.status !== 'ok') {
      row = {
        id: album.id,
        artist: album.artist,
        album_name: album.album_name,
        status: lookedUp.status,
        trackCount: 0,
        reason: lookedUp.reason,
        possiblyTruncatedAt200: false,
      };
      if (lookedUp.status === 'empty_tracks') emptyCount += 1;
      else failedCount += 1;
    } else if (!options.apply) {
      row = {
        id: album.id,
        artist: album.artist,
        album_name: album.album_name,
        status: 'ok',
        trackCount: lookedUp.tracks.length,
        reason: null,
        possiblyTruncatedAt200,
      };
      success += 1;
    } else {
      const { data: fresh, error: freshError } = await supabase
        .from('album')
        .select('id, tracks')
        .eq('id', album.id)
        .maybeSingle();
      if (freshError) throw freshError;
      if (!fresh || !isEmptyTracks(fresh.tracks)) {
        row = {
          id: album.id,
          artist: album.artist,
          album_name: album.album_name,
          status: 'skipped_already_filled',
          trackCount: Array.isArray(fresh?.tracks) ? fresh.tracks.length : 0,
          reason: 'tracks already filled',
          possiblyTruncatedAt200: false,
        };
      } else {
        const { error: updateError } = await supabase
          .from('album')
          .update({ tracks: lookedUp.tracks })
          .eq('id', album.id);
        if (updateError) {
          row = {
            id: album.id,
            artist: album.artist,
            album_name: album.album_name,
            status: 'update_failed',
            trackCount: lookedUp.tracks.length,
            reason: updateError.message,
            possiblyTruncatedAt200,
          };
          failedCount += 1;
        } else {
          row = {
            id: album.id,
            artist: album.artist,
            album_name: album.album_name,
            status: 'ok',
            trackCount: lookedUp.tracks.length,
            reason: null,
            possiblyTruncatedAt200,
          };
          success += 1;
        }
      }
    }

    rows.push(row);
    console.log(
      `[${i + 1}/${targets.length}] id=${album.id} "${album.album_name}" → ${row.status}` +
        (row.trackCount ? ` (${row.trackCount} tracks)` : '') +
        (row.reason ? ` — ${row.reason}` : ''),
    );

    if (i < targets.length - 1) await sleep(requestGapMs());
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.apply ? 'apply' : 'preview',
    limit: options.limit,
    id: options.id,
    targetCount: targets.length,
    success,
    emptyTracks: emptyCount,
    failed: failedCount,
    byReason: summarize(rows),
    rows,
  };

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log('\n=== 요약 ===');
  console.log(`대상: ${targets.length}`);
  console.log(`성공(트랙 확보): ${success}`);
  console.log(`0곡: ${emptyCount}`);
  console.log(`실패: ${failedCount}`);
  console.log('사유별:');
  for (const [reason, count] of Object.entries(summary.byReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log(`보고서: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
