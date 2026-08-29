'use client';

/* eslint-disable @next/next/no-img-element */

import { Disc, Pencil, Trash2 } from 'lucide-react';
import { ListenContextMeta } from '@/app/albums/_components/ListenContextMeta';
import { formatDiaryGearLabel, type DiaryListenEntry } from '../albumDiary';

type DiaryListenEntryListItemProps = {
  entry: DiaryListenEntry;
  isEditing: boolean;
  listenSaving: boolean;
  showActions: boolean;
  onOpenAlbum: (albumId: number) => void;
  onEdit: (entry: DiaryListenEntry) => void;
  onDelete: (entryId: number) => void;
};

function renderGearTags(entry: DiaryListenEntry) {
  const gears = [entry.dacAmp, entry.dacAmp2, entry.headphone].filter((g) => g != null);
  if (gears.length === 0) return null;
  return (
    <p className="mt-1.5 truncate text-xs opacity-65">
      {gears.map((g) => formatDiaryGearLabel(g)).join(' / ')}
    </p>
  );
}

export function DiaryListenEntryListItem({
  entry,
  isEditing,
  listenSaving,
  showActions,
  onOpenAlbum,
  onEdit,
  onDelete,
}: DiaryListenEntryListItemProps) {
  return (
    <li
      className="flex gap-3 rounded-xl p-3"
      style={{
        background: 'var(--badge-bg)',
        border: isEditing ? '1px solid var(--foreground)' : '1px solid var(--border)',
      }}
    >
      <button
        type="button"
        onClick={() => onOpenAlbum(entry.albumId)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity hover:opacity-90"
      >
        <div
          className="relative size-14 shrink-0 overflow-hidden rounded-md"
          style={{ background: 'var(--card-bg)' }}
        >
          {entry.album?.cover_image_url ? (
            <img src={entry.album.cover_image_url} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center opacity-40">
              <Disc className="size-5" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.album?.album_name || '삭제된 앨범'}</p>
          <p className="truncate text-xs opacity-60">{entry.album?.artist || '—'}</p>
          <ListenContextMeta
            captured_at={entry.capturedAt}
            weather_condition={entry.weatherCondition}
            temperature={entry.temperature}
          />
          {entry.impression?.trim() ? (
            <p className="mt-1 line-clamp-2 text-xs opacity-75">{entry.impression}</p>
          ) : null}
          {renderGearTags(entry)}
        </div>
      </button>
      {showActions ? (
        <div className="flex shrink-0 flex-col gap-1.5 self-start">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            disabled={listenSaving}
            className="btn-apple shrink-0 px-2 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
            aria-label="청취 기록 수정"
          >
            <Pencil className="size-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            disabled={listenSaving}
            className="btn-apple btn-apple-danger shrink-0 px-2 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
            aria-label="청취 기록 삭제"
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </li>
  );
}
