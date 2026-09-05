import type { AlbumMoodGroupRow } from '@/lib/albumMoodRefs';

export type ManualMoodPin = {
  id: number;
  mood_name: string;
};

export function normalizeAlbumIdList(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of ids) {
    const n =
      typeof raw === 'number' && Number.isFinite(raw)
        ? Math.trunc(raw)
        : parseInt(String(raw), 10);
    if (!Number.isInteger(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** 전체 재분류 후 수동 지정 앨범을 기존 mood_name 그룹에 다시 꽂는다. */
export function mergeManualPinsIntoMoodGroups(
  groups: AlbumMoodGroupRow[],
  pins: ManualMoodPin[],
): AlbumMoodGroupRow[] {
  if (pins.length === 0) return groups;
  const manualIds = new Set(pins.map((p) => p.id));
  const next = groups.map((g) => ({
    mood_name: g.mood_name,
    album_ids: g.album_ids.filter((id) => !manualIds.has(Number(id))),
  }));

  for (const pin of pins) {
    const moodName = pin.mood_name.trim();
    if (!moodName) continue;
    const idx = next.findIndex((g) => g.mood_name.trim() === moodName);
    if (idx < 0) continue;
    const ids = normalizeAlbumIdList(next[idx].album_ids);
    if (!ids.includes(pin.id)) ids.push(pin.id);
    next[idx] = { ...next[idx], album_ids: ids };
  }
  return next;
}

type MoodGroupDbRow = {
  id: number;
  mood_name: string;
  album_ids: unknown;
};

/** album_ids에서 albumId를 제거하고 targetMoodName 그룹에 추가. */
export async function moveAlbumBetweenMoodGroups(
  // Supabase client — 테이블별 제네릭이 호출부마다 달라 any로 둔다
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  groups: MoodGroupDbRow[],
  albumId: number,
  targetMoodName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const targetName = targetMoodName.trim();
  const target = groups.find((g) => String(g.mood_name ?? '').trim() === targetName);
  if (!target) {
    return { ok: false, error: 'Mood group not found' };
  }

  const now = new Date().toISOString();
  for (const group of groups) {
    const current = normalizeAlbumIdList(group.album_ids);
    const shouldContain = group.id === target.id;
    const has = current.includes(albumId);
    let next = current;
    if (shouldContain && !has) next = [...current, albumId];
    if (!shouldContain && has) next = current.filter((id) => id !== albumId);
    if (next.length === current.length && next.every((id, i) => id === current[i])) continue;
    const { error } = await supabase
      .from('album_mood_groups')
      .update({ album_ids: next, updated_at: now })
      .eq('id', group.id);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
