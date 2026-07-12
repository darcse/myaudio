/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Disc, Music, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { AlbumForm } from '@/app/albums/_components/AlbumForm';
import { AlbumPageHeader, AlbumSubHeader } from '@/app/albums/_components/AlbumPageHeader';
import { useAlbumMutations } from '@/app/albums/_hooks/useAlbumMutations';
import type { Album, AlbumFormData, SelectedAlbum } from '@/app/albums/types';
import { albumToFormData } from '@/app/albums/utils';
import {
  clampListenPeriodFilter,
  formatPeriodLabel,
  formatStatsMonthOptionLabel,
  getDefaultListenPeriodFilter,
  listStatsMonths,
  listStatsYears,
  type ListenPeriodFilter,
  type ListenPeriodMonth,
} from '@/app/albums/stats/albumListenStats';
import {
  buildDiaryDayGroups,
  formatDiaryGearLabel,
  type DiaryDaySortOrder,
  type DiaryGearSummary,
  type DiaryHistoryRow,
  type DiaryListenEntry,
} from '../albumDiary';

type GearOption = { id: number; brand: string; model: string };

const initialAlbumFormData: AlbumFormData = {
  artist: '',
  artist_type: '',
  country: '',
  album_name: '',
  album_type: '',
  year: ['2026'],
  release_date: '',
  genre1: '',
  genre2: '',
  cover_image_url: '',
  matching1: '',
  matching2: '',
  title_song_url: '',
  wiki_url: '',
  album_intro: '',
  recommended_hp1: '',
  recommended_hp2: '',
  recommended_hp3: '',
  mood_names: [],
};

function filterToggleStyle(active: boolean): CSSProperties {
  return {
    fontSize: '12px',
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

function parseOptionalId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) ? null : n;
}

function ensureGearOption(
  gear: DiaryGearSummary | null | undefined,
  setter: (updater: (prev: GearOption[]) => GearOption[]) => void,
) {
  if (!gear) return;
  setter((prev) => {
    if (prev.some((g) => g.id === gear.id)) return prev;
    return [...prev, { id: gear.id, brand: gear.brand, model: gear.model }].sort(
      (a, b) => a.brand.localeCompare(b.brand, 'ko') || a.model.localeCompare(b.model, 'ko'),
    );
  });
}

export function AlbumDiaryContent() {
  const isAuthenticated = useAuthState();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [historyRows, setHistoryRows] = useState<DiaryHistoryRow[]>([]);
  const [gearById, setGearById] = useState<Map<number, DiaryGearSummary>>(() => new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<ListenPeriodFilter>(getDefaultListenPeriodFilter);
  const [sortOrder, setSortOrder] = useState<DiaryDaySortOrder>('desc');
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [albumFormItem, setAlbumFormItem] = useState<SelectedAlbum | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>(initialAlbumFormData);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [editingEntry, setEditingEntry] = useState<DiaryListenEntry | null>(null);
  const [listenDate, setListenDate] = useState('');
  const [listenImpression, setListenImpression] = useState('');
  const [selectedDacAmpId, setSelectedDacAmpId] = useState('');
  const [selectedDacAmp2Id, setSelectedDacAmp2Id] = useState('');
  const [selectedHeadphoneId, setSelectedHeadphoneId] = useState('');
  const [dacAmpOptions, setDacAmpOptions] = useState<GearOption[]>([]);
  const [dacAmp2Options, setDacAmp2Options] = useState<GearOption[]>([]);
  const [headphoneOptions, setHeadphoneOptions] = useState<GearOption[]>([]);
  const [listenSaving, setListenSaving] = useState(false);
  const { isSaving, isDeleting, albumIntroLoading, saveAlbum, deleteAlbum, refreshAlbumIntro } =
    useAlbumMutations({ isAuthenticated });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const client = createClient();
      const [albumRes, historyRes, gearRes] = await Promise.all([
        client.from('album').select('*').order('release_date', { ascending: false }),
        client
          .from('album_listen_history')
          .select('id, album_id, listened_at, created_at, impression, dac_amp_id, dac_amp2_id, headphone_id'),
        client.from('headfi').select('id, brand, model'),
      ]);
      const errors: string[] = [];
      if (albumRes.error) {
        errors.push('앨범 목록을 불러오지 못했습니다.');
        setAlbums([]);
      } else {
        setAlbums((albumRes.data ?? []) as Album[]);
      }
      if (historyRes.error) {
        errors.push('청취 기록을 불러오지 못했습니다.');
        setHistoryRows([]);
      } else {
        setHistoryRows(
          ((historyRes.data ?? []) as DiaryHistoryRow[]).map((row) => ({
            ...row,
            dac_amp2_id: row.dac_amp2_id ?? null,
          })),
        );
      }
      if (gearRes.error) {
        setGearById(new Map());
      } else {
        const map = new Map<number, DiaryGearSummary>();
        for (const row of gearRes.data ?? []) {
          map.set(row.id, {
            id: row.id,
            brand: row.brand || '',
            model: row.model || '',
          });
        }
        setGearById(map);
      }
      if (errors.length > 0) {
        setLoadError(errors.join(' '));
        toast.error(errors[0]);
      }
    } catch {
      const message = '다이어리 데이터를 불러오지 못했습니다.';
      setLoadError(message);
      toast.error(message);
      setAlbums([]);
      setHistoryRows([]);
      setGearById(new Map());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setDacAmpOptions([]);
      setDacAmp2Options([]);
      setHeadphoneOptions([]);
      setHeadfiOwnedHeadphones([]);
      return;
    }
    const client = createClient();
    void Promise.all([
      client
        .from('headfi')
        .select('id, brand, model')
        .in('category', ['DAC', 'AMP', 'DAC/AMP', 'DAP', 'Source', '기타'])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
      client
        .from('headfi')
        .select('id, brand, model')
        .in('category', ['DAC', 'AMP', 'DAC/AMP'])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
      client
        .from('headfi')
        .select('id, brand, model')
        .in('category', ['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰'])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
      client
        .from('headfi')
        .select('id, brand, model')
        .eq('category', '헤드폰')
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
    ]).then(([dacRes, dac2Res, hpRes, ownedHpRes]) => {
      setDacAmpOptions(
        (dacRes.data ?? []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' })),
      );
      setDacAmp2Options(
        (dac2Res.data ?? []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' })),
      );
      setHeadphoneOptions(
        (hpRes.data ?? []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' })),
      );
      setHeadfiOwnedHeadphones(
        (ownedHpRes.data ?? []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' })),
      );
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!viewingAlbum?.id) {
      setRecommendedHeadphones([]);
      setAudioTags([]);
      return;
    }
    setAudioTags(viewingAlbum.audio_tags ?? []);
    const ids = (viewingAlbum.manual_recommended_headphone_ids ?? []).slice(0, 2);
    if (ids.length === 0) {
      setRecommendedHeadphones([]);
      return;
    }
    void createClient()
      .from('headfi')
      .select('id, brand, model, image_url')
      .in('id', ids)
      .then(({ data }) => {
        const ordered = ids
          .map((id) => (data || []).find((h) => h.id === id))
          .filter(
            (h): h is { id: number; brand: string; model: string; image_url: string | null } => !!h,
          )
          .map((h) => ({
            id: h.id,
            brand: h.brand || '',
            model: h.model || '',
            image_url: h.image_url ?? null,
          }));
        setRecommendedHeadphones(ordered);
      });
  }, [viewingAlbum?.id, viewingAlbum?.manual_recommended_headphone_ids, viewingAlbum?.audio_tags]);

  const yearOptions = useMemo(() => listStatsYears(), []);
  const monthOptions = useMemo(() => listStatsMonths(periodFilter.year), [periodFilter.year]);
  const dayGroups = useMemo(
    () => buildDiaryDayGroups(historyRows, albums, gearById, periodFilter, sortOrder),
    [historyRows, albums, gearById, periodFilter, sortOrder],
  );
  const hasAnyListenData = historyRows.some((row) => row.album_id != null && row.listened_at);
  const periodSummary = useMemo(() => {
    const entries = dayGroups.flatMap((group) => group.entries);
    const albumIds = new Set<number>();
    const artistNames = new Set<string>();
    for (const entry of entries) {
      albumIds.add(entry.albumId);
      const artist = entry.album?.artist?.trim();
      if (artist) artistNames.add(artist);
    }
    return {
      listenCount: entries.length,
      uniqueAlbumCount: albumIds.size,
      uniqueArtistCount: artistNames.size,
    };
  }, [dayGroups]);

  const handleYearChange = (year: number) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ year, month: prev.month }));
  };
  const handleMonthChange = (month: ListenPeriodMonth) => {
    setPeriodFilter((prev) => clampListenPeriodFilter({ year: prev.year, month }));
  };

  const openAlbum = useCallback(
    (albumId: number) => {
      const cached = albums.find((album) => album.id === albumId);
      if (cached) {
        setViewingAlbum(cached);
        return;
      }
      void createClient()
        .from('album')
        .select('*')
        .eq('id', albumId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error || !data) {
            toast.error('앨범 정보를 불러오지 못했습니다.');
            return;
          }
          setViewingAlbum(data as Album);
        });
    },
    [albums],
  );

  const resetEditForm = () => {
    setEditingEntry(null);
    setListenDate('');
    setListenImpression('');
    setSelectedDacAmpId('');
    setSelectedDacAmp2Id('');
    setSelectedHeadphoneId('');
  };

  const startEditEntry = (entry: DiaryListenEntry) => {
    ensureGearOption(entry.dacAmp, setDacAmpOptions);
    ensureGearOption(entry.dacAmp2, setDacAmp2Options);
    ensureGearOption(entry.headphone, setHeadphoneOptions);
    setEditingEntry(entry);
    setListenDate(entry.listenedAt);
    setListenImpression(entry.impression ?? '');
    setSelectedDacAmpId(entry.dacAmpId != null ? String(entry.dacAmpId) : '');
    setSelectedDacAmp2Id(entry.dacAmp2Id != null ? String(entry.dacAmp2Id) : '');
    setSelectedHeadphoneId(entry.headphoneId != null ? String(entry.headphoneId) : '');
  };

  const saveEditedEntry = async () => {
    if (!editingEntry || isAuthenticated !== true) return;
    const d = listenDate.trim();
    if (!d) {
      toast.error('청취일을 선택해 주세요.');
      return;
    }
    setListenSaving(true);
    try {
      const { error } = await createClient()
        .from('album_listen_history')
        .update({
          listened_at: d,
          impression: listenImpression.trim() || null,
          dac_amp_id: parseOptionalId(selectedDacAmpId),
          dac_amp2_id: parseOptionalId(selectedDacAmp2Id),
          headphone_id: parseOptionalId(selectedHeadphoneId),
        })
        .eq('id', editingEntry.id);
      if (error) {
        toast.error(error.message || '저장하지 못했습니다.');
        return;
      }
      toast.success('청취 기록을 수정했습니다.');
      resetEditForm();
      await fetchData();
    } finally {
      setListenSaving(false);
    }
  };

  const deleteEntry = async (entryId: number) => {
    if (!confirm('이 청취 기록을 삭제할까요?')) return;
    setListenSaving(true);
    try {
      const { error } = await createClient().from('album_listen_history').delete().eq('id', entryId);
      if (error) {
        toast.error(error.message || '삭제하지 못했습니다.');
        return;
      }
      if (editingEntry?.id === entryId) resetEditForm();
      toast.success('청취 기록을 삭제했습니다.');
      await fetchData();
    } finally {
      setListenSaving(false);
    }
  };

  const handleAlbumEditClick = () => {
    if (!viewingAlbum) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const item = viewingAlbum;
    setViewingAlbum(null);
    setAlbumFormItem(item);
    setAlbumFormData(
      albumToFormData(item, {
        album_intro: item.album_intro ?? item.ai_recommended_headphone_reason ?? '',
      }),
    );
  };

  const handleAlbumImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setAlbumFormData((prev) => ({ ...prev, cover_image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleAlbumSave = async () => {
    if (!albumFormItem) return;
    const result = await saveAlbum({ formItem: albumFormItem, formData: albumFormData });
    if (result.status === 'updated') {
      if (result.album) {
        setAlbums((prev) => prev.map((album) => (album.id === result.album!.id ? result.album! : album)));
        setViewingAlbum(result.album);
        setAudioTags(result.album.audio_tags ?? []);
      }
      setAlbumFormItem(null);
      return;
    }
    if (result.status === 'created') {
      await fetchData();
      setAlbumFormItem(null);
    }
  };

  const handleDeleteFromModal = async () => {
    if (!viewingAlbum) return;
    const deletedId = viewingAlbum.id;
    const deleted = await deleteAlbum({ albumId: deletedId });
    if (!deleted) return;
    setViewingAlbum(null);
    setAlbums((prev) => prev.filter((album) => album.id !== deletedId));
    await fetchData();
  };

  const handleRefreshAlbumIntro = async () => {
    if (!viewingAlbum) return;
    await refreshAlbumIntro({
      album: viewingAlbum,
      onUpdated: (updated, tags) => {
        setViewingAlbum(updated);
        setAlbums((prev) => prev.map((album) => (album.id === updated.id ? updated : album)));
        setAudioTags(tags);
      },
    });
  };

  useEffect(() => {
    if (!editingEntry) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingEntry]);

  const renderGearTags = (entry: DiaryListenEntry) => {
    const gears = [entry.dacAmp, entry.dacAmp2, entry.headphone].filter(
      (g): g is DiaryGearSummary => g != null,
    );
    if (gears.length === 0) return null;
    return (
      <p className="mt-1.5 truncate text-xs opacity-65">
        {gears.map((g) => formatDiaryGearLabel(g)).join(' / ')}
      </p>
    );
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <AlbumPageHeader activeNav="diary" isAuthenticated={isAuthenticated} showDivider />
      <AlbumSubHeader icon={BookOpen} title="다이어리" />

      <section
        className="mb-6 rounded-xl border"
        style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
      >
        <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-xs font-semibold opacity-60">연도</span>
              {yearOptions.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleYearChange(year)}
                  className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                  style={filterToggleStyle(periodFilter.year === year)}
                  aria-pressed={periodFilter.year === year}
                >
                  {year}년
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-xs font-semibold opacity-60">월</span>
              {monthOptions.map((month) => (
                <button
                  key={String(month)}
                  type="button"
                  onClick={() => handleMonthChange(month)}
                  className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                  style={filterToggleStyle(periodFilter.month === month)}
                  aria-pressed={periodFilter.month === month}
                >
                  {formatStatsMonthOptionLabel(month)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-xs font-semibold opacity-60">정렬</span>
              <button
                type="button"
                onClick={() => setSortOrder('desc')}
                className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                style={filterToggleStyle(sortOrder === 'desc')}
                aria-pressed={sortOrder === 'desc'}
              >
                최근순
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('asc')}
                className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                style={filterToggleStyle(sortOrder === 'asc')}
                aria-pressed={sortOrder === 'asc'}
              >
                이전순
              </button>
            </div>
          </div>
          {hasAnyListenData && periodSummary.listenCount > 0 ? (
            <p className="text-sm font-semibold opacity-90">
              총 {periodSummary.listenCount}건 · 아티스트 {periodSummary.uniqueArtistCount}명 · 앨범{' '}
              {periodSummary.uniqueAlbumCount}장
            </p>
          ) : null}
        </div>
      </section>

      {editingEntry
        ? createPortal(
            <div
              className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={resetEditForm}
            >
              <div
                className="modal-panel-apple relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="청취 기록 수정"
              >
                <button
                  type="button"
                  onClick={resetEditForm}
                  className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-lg font-semibold opacity-70 transition-opacity hover:opacity-100"
                  style={{ color: 'var(--foreground)' }}
                  aria-label="닫기"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
                <div className="space-y-3 pr-6">
                  <p className="text-sm font-semibold">
                    청취 기록 수정
                    {editingEntry.album ? (
                      <span className="mt-1 block font-normal opacity-70">
                        {editingEntry.album.artist} — {editingEntry.album.album_name}
                      </span>
                    ) : null}
                  </p>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold opacity-70">청취일</label>
                    <input
                      type="date"
                      value={listenDate}
                      onChange={(e) => setListenDate(e.target.value)}
                      className="box-border w-full max-w-[12rem] rounded-lg border px-1.5 py-2 text-sm"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--card-bg)',
                        color: 'var(--foreground)',
                      }}
                      title="청취일"
                      aria-label="청취일"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold opacity-70">기기 선택1 (선택)</label>
                      <select
                        className="select-apple h-[42px] w-full px-3 py-2 text-sm"
                        value={selectedDacAmpId}
                        onChange={(e) => setSelectedDacAmpId(e.target.value)}
                        disabled={listenSaving}
                      >
                        <option value="">선택 안 함</option>
                        {dacAmpOptions.map((g) => (
                          <option key={g.id} value={String(g.id)}>
                            {g.brand} {g.model}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold opacity-70">기기 선택2 (선택)</label>
                      <select
                        className="select-apple h-[42px] w-full px-3 py-2 text-sm"
                        value={selectedDacAmp2Id}
                        onChange={(e) => setSelectedDacAmp2Id(e.target.value)}
                        disabled={listenSaving}
                      >
                        <option value="">선택 안 함</option>
                        {dacAmp2Options.map((g) => (
                          <option key={g.id} value={String(g.id)}>
                            {g.brand} {g.model}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold opacity-70">
                        헤드폰 / 이어폰 (선택)
                      </label>
                      <select
                        className="select-apple h-[42px] w-full px-3 py-2 text-sm"
                        value={selectedHeadphoneId}
                        onChange={(e) => setSelectedHeadphoneId(e.target.value)}
                        disabled={listenSaving}
                      >
                        <option value="">선택 안 함</option>
                        {headphoneOptions.map((g) => (
                          <option key={g.id} value={String(g.id)}>
                            {g.brand} {g.model}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold opacity-70">소감 (선택)</label>
                    <textarea
                      value={listenImpression}
                      onChange={(e) => setListenImpression(e.target.value)}
                      placeholder="청취 소감을 적어 주세요."
                      rows={4}
                      className="input-apple min-h-[5.5rem] w-full resize-y rounded-lg px-3 py-2 text-sm leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={resetEditForm}
                      disabled={listenSaving}
                      className="btn-apple px-4 py-2.5 text-sm leading-none disabled:pointer-events-none disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEditedEntry()}
                      disabled={listenSaving}
                      className="btn-apple btn-apple-primary px-4 py-2.5 text-sm leading-none disabled:pointer-events-none disabled:opacity-50"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="size-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : loadError ? (
        <div
          className="rounded-xl border px-6 py-12 text-center text-sm opacity-70"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
        >
          {loadError}
        </div>
      ) : !hasAnyListenData ? (
        <div
          className="rounded-xl border px-6 py-16 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
        >
          <Music className="mx-auto mb-3 size-8 opacity-40" strokeWidth={1.5} />
          <p className="text-sm opacity-70">아직 등록된 청취 기록이 없습니다.</p>
        </div>
      ) : dayGroups.length === 0 ? (
        <div
          className="rounded-xl border px-6 py-16 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
        >
          <BookOpen className="mx-auto mb-3 size-8 opacity-40" strokeWidth={1.5} />
          <p className="text-sm opacity-70">{formatPeriodLabel(periodFilter)}에는 청취 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {dayGroups.map((group) => (
            <section key={group.date}>
              <h3 className="mb-3 text-base font-semibold tabular-nums">{group.label}</h3>
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex gap-3 rounded-xl p-3"
                    style={{
                      background: 'var(--badge-bg)',
                      border:
                        editingEntry?.id === entry.id
                          ? '1px solid var(--foreground)'
                          : '1px solid var(--border)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openAlbum(entry.albumId)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity hover:opacity-90"
                    >
                      <div
                        className="relative size-14 shrink-0 overflow-hidden rounded-md"
                        style={{ background: 'var(--card-bg)' }}
                      >
                        {entry.album?.cover_image_url ? (
                          <img
                            src={entry.album.cover_image_url}
                            alt=""
                            className="absolute inset-0 size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center opacity-40">
                            <Disc className="size-5" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {entry.album?.album_name || '삭제된 앨범'}
                        </p>
                        <p className="truncate text-xs opacity-60">{entry.album?.artist || '—'}</p>
                        {entry.impression?.trim() ? (
                          <p className="mt-1 line-clamp-2 text-xs opacity-75">{entry.impression}</p>
                        ) : null}
                        {renderGearTags(entry)}
                      </div>
                    </button>
                    {isAuthenticated === true ? (
                      <div className="flex shrink-0 flex-col gap-1.5 self-start">
                        <button
                          type="button"
                          onClick={() => startEditEntry(entry)}
                          disabled={listenSaving}
                          className="btn-apple shrink-0 px-2 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
                          aria-label="청취 기록 수정"
                        >
                          <Pencil className="size-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteEntry(entry.id)}
                          disabled={listenSaving}
                          className="btn-apple btn-apple-danger shrink-0 px-2 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
                          aria-label="청취 기록 삭제"
                        >
                          <Trash2 className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {viewingAlbum ? (
        <AlbumDetailModal
          viewingItem={viewingAlbum}
          recommendedHeadphones={recommendedHeadphones}
          albumIntro={viewingAlbum.album_intro ?? viewingAlbum.ai_recommended_headphone_reason ?? ''}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={() => {
            setViewingAlbum(null);
            void fetchData();
          }}
          onEdit={handleAlbumEditClick}
          onDelete={() => void handleDeleteFromModal()}
          isAuthenticated={isAuthenticated}
          isDeleting={isDeleting}
          onAlbumPatch={(album) => {
            setViewingAlbum(album);
            setAlbums((prev) => prev.map((row) => (row.id === album.id ? album : row)));
          }}
        />
      ) : null}

      {albumFormItem ? (
        <AlbumForm
          selectedItem={albumFormItem}
          formData={albumFormData}
          setFormData={setAlbumFormData}
          headfiOwnedHeadphones={headfiOwnedHeadphones}
          onClose={() => setAlbumFormItem(null)}
          onSave={() => void handleAlbumSave()}
          onImageUpload={handleAlbumImageUpload}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  );
}
