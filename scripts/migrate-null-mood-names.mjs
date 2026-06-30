import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = typeof error === 'object' && error && 'status' in error ? error.status : undefined;
      const is429 = status === 429 || message.includes('429') || message.includes('Too Many Requests');
      const is503 = status === 503 || message.includes('503') || message.includes('Service Unavailable');
      if ((is429 || is503) && i < retries - 1) {
        const retryDelayMatch = message.match(/retry in (\d+)s/i);
        const waitMs = retryDelayMatch ? parseInt(retryDelayMatch[1], 10) * 1000 + 1000 : is429 ? 60000 : delayMs;
        await sleep(waitMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

async function pickAlbumMoodGroupName(genAI, album, moodNames, modelName = 'gemini-3.1-flash-lite') {
  if (moodNames.length === 0) return null;
  const model = genAI.getGenerativeModel({ model: modelName });
  const tags = Array.isArray(album.audio_tags) ? JSON.stringify(album.audio_tags) : '[]';
  const prompt = `무드 그룹 목록:
${moodNames.join('\n')}

앨범 정보:
아티스트: ${album.artist ?? ''}
앨범명: ${album.album_name ?? ''}
장르1: ${album.genre1 ?? ''}
장르2: ${album.genre2 ?? ''}
오디오 태그: ${tags}

위 무드 그룹 중 가장 적합한 하나의 mood_name만 반환해. 다른 텍스트 없이 목록에 있는 무드명 그대로만 출력해.`;
  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response
      .text()
      .trim()
      .replace(/```json|```/g, '')
      .replace(/^["']|["']$/g, '');
    if (moodNames.includes(text)) return text;
    const hit = moodNames.find((name) => text.includes(name));
    return hit ?? null;
  } catch {
    return null;
  }
}

async function assignAlbumMood(supabase, genAI, albumId, groups, moodNames) {
  const { data: album, error: albumError } = await supabase
    .from('album')
    .select('id, artist, album_name, genre1, genre2, audio_tags')
    .eq('id', albumId)
    .single();
  if (albumError || !album) {
    throw new Error(albumError?.message ?? 'Album not found');
  }

  const mood_name =
    (await pickAlbumMoodGroupName(genAI, album, moodNames)) ??
    (await pickAlbumMoodGroupName(genAI, album, moodNames, 'gemini-2.0-flash'));
  if (!mood_name) {
    throw new Error('Mood classification failed');
  }

  const { error: moodColErr } = await supabase.from('album').update({ mood_name }).eq('id', albumId);
  if (moodColErr) throw new Error(moodColErr.message);

  const targetGroup = groups.find(
    (g) => String(g.mood_name ?? '').trim() === mood_name,
  );
  if (targetGroup) {
    const current = Array.isArray(targetGroup.album_ids) ? targetGroup.album_ids : [];
    const next = current.some((id) => Number(id) === albumId) ? current : [...current, albumId];
    if (next.length !== current.length) {
      const { error: groupErr } = await supabase
        .from('album_mood_groups')
        .update({ album_ids: next, updated_at: new Date().toISOString() })
        .eq('id', targetGroup.id);
      if (groupErr) throw new Error(groupErr.message);
      targetGroup.album_ids = next;
    }
  }

  return mood_name;
}

async function countNullMoodNames(supabase) {
  const { count, error } = await supabase
    .from('album')
    .select('id', { count: 'exact', head: true })
    .is('mood_name', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!url || !key || !geminiKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL, Supabase key, GEMINI_API_KEY required in .env.local');
  }

  const supabase = createClient(url, key);
  const genAI = new GoogleGenerativeAI(geminiKey);

  const beforeNull = await countNullMoodNames(supabase);
  console.log(`mood_name IS NULL (before): ${beforeNull}`);

  const { data: nullRows, error: listErr } = await supabase
    .from('album')
    .select('id')
    .is('mood_name', null)
    .order('id', { ascending: true });
  if (listErr) throw new Error(listErr.message);

  const albumIds = (nullRows ?? []).map((row) => Number(row.id)).filter((id) => Number.isInteger(id));
  console.log(`Processing ${albumIds.length} album(s)...`);

  const { data: moodRows, error: moodError } = await supabase
    .from('album_mood_groups')
    .select('id, mood_name, album_ids')
    .order('id', { ascending: true });
  if (moodError) throw new Error(moodError.message);

  const groups = (moodRows ?? []).map((row) => ({
    id: row.id,
    mood_name: String(row.mood_name ?? '').trim(),
    album_ids: Array.isArray(row.album_ids) ? [...row.album_ids] : [],
  }));
  const moodNames = groups.map((g) => g.mood_name).filter(Boolean);
  if (moodNames.length === 0) {
    throw new Error('Mood groups not found');
  }

  let success = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < albumIds.length; i++) {
    const albumId = albumIds[i];
    try {
      const mood = await assignAlbumMood(supabase, genAI, albumId, groups, moodNames);
      success += 1;
      console.log(`[${i + 1}/${albumIds.length}] album ${albumId} -> ${mood}`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ albumId, message });
      console.error(`[${i + 1}/${albumIds.length}] album ${albumId} FAILED: ${message}`);
    }
    if (i < albumIds.length - 1) {
      await sleep(500 + Math.floor(Math.random() * 501));
    }
  }

  const afterNull = await countNullMoodNames(supabase);
  console.log('\n--- Summary ---');
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`mood_name IS NULL (after): ${afterNull}`);
  if (failures.length > 0) {
    console.log('Failures:', failures);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
