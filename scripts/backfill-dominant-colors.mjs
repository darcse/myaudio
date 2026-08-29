import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { extractDominantColorsFromCoverUrl } from './lib/albumCoverColorsExtract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BATCH_SIZE = 8;
const PAGE_SIZE = 200;

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

async function fetchTargetAlbums(supabase) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('album')
      .select('id, album_name, cover_image_url')
      .is('dominant_colors', null)
      .not('cover_image_url', 'is', null)
      .neq('cover_image_url', '')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function processAlbum(supabase, album) {
  const coverUrl = album.cover_image_url?.trim();
  if (!coverUrl) {
    return {
      ok: false,
      failure: { id: album.id, album_name: album.album_name, reason: 'cover_image_url empty' },
    };
  }

  const colors = await extractDominantColorsFromCoverUrl(coverUrl);
  if (colors.length === 0) {
    return {
      ok: false,
      failure: { id: album.id, album_name: album.album_name, reason: 'color extraction returned empty' },
    };
  }

  const { error } = await supabase.from('album').update({ dominant_colors: colors }).eq('id', album.id);
  if (error) {
    return {
      ok: false,
      failure: { id: album.id, album_name: album.album_name, reason: error.message },
    };
  }

  return { ok: true };
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and Supabase key required in .env.local');
  }

  const dryRun = process.argv.includes('--dry-run');
  const supabase = createClient(url, key);
  const targets = await fetchTargetAlbums(supabase);

  console.log(`대상 앨범: ${targets.length}건 (dominant_colors IS NULL, cover URL 있음)`);
  if (dryRun) {
    console.log('dry-run 모드 — 업데이트 없이 종료');
    return;
  }

  let success = 0;
  const failures = [];

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((album) => processAlbum(supabase, album)));
    for (const result of results) {
      if (result.ok) success += 1;
      else failures.push(result.failure);
    }
    const done = Math.min(i + BATCH_SIZE, targets.length);
    console.log(`진행: ${done}/${targets.length} (성공 ${success}, 실패 ${failures.length})`);
  }

  console.log('\n=== 백필 완료 ===');
  console.log(`성공: ${success}건`);
  console.log(`실패: ${failures.length}건`);
  if (failures.length > 0) {
    console.log('\n실패 목록:');
    for (const item of failures) {
      console.log(`- id=${item.id} "${item.album_name ?? ''}" — ${item.reason}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
