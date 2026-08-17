const STORAGE_KEY = 'myaudio-recent-receiver-ids';
const MAX_STORED = 30;

export const RECENT_RECEIVER_DISPLAY_LIMIT = 5;

export type RecentReceiverEntry = {
  id: number;
  usedAt: number;
};

export function readRecentReceiverEntries(): RecentReceiverEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentReceiverEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) => typeof entry.id === 'number' && Number.isFinite(entry.id) && typeof entry.usedAt === 'number',
    );
  } catch {
    return [];
  }
}

function writeRecentReceiverEntries(entries: RecentReceiverEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_STORED)));
}

export function recordRecentReceiver(id: number): void {
  if (typeof window === 'undefined' || !Number.isFinite(id)) return;
  const entries = readRecentReceiverEntries().filter((entry) => entry.id !== id);
  entries.unshift({ id, usedAt: Date.now() });
  writeRecentReceiverEntries(entries);
}

export function setRecentReceiversFromHistory(newestFirstIds: number[]): void {
  if (typeof window === 'undefined') return;
  const unique: number[] = [];
  for (const id of newestFirstIds) {
    if (!Number.isFinite(id) || unique.includes(id)) continue;
    unique.push(id);
  }
  if (unique.length === 0) return;
  const entries = unique.map((id, index) => ({ id, usedAt: Date.now() - index }));
  writeRecentReceiverEntries(entries);
}

export function getRecentReceiverIds(
  limit = RECENT_RECEIVER_DISPLAY_LIMIT,
  validIds?: Set<number>,
): number[] {
  const ids: number[] = [];
  for (const entry of readRecentReceiverEntries()) {
    if (validIds && !validIds.has(entry.id)) continue;
    ids.push(entry.id);
    if (ids.length >= limit) break;
  }
  return ids;
}

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapRecentReceiversIfEmpty(
  fetchNewestFirstIds: () => Promise<number[]>,
): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (readRecentReceiverEntries().length > 0) return Promise.resolve();
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = fetchNewestFirstIds()
    .then((ids) => {
      if (readRecentReceiverEntries().length > 0) return;
      setRecentReceiversFromHistory(ids);
    })
    .catch(() => undefined)
    .finally(() => {
      bootstrapPromise = null;
    });
  return bootstrapPromise;
}
