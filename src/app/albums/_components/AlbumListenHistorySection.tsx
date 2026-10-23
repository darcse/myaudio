'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { createListenCapturedAt, fetchListenWeatherContext, LISTEN_GEO_UNAVAILABLE_TOAST, type ListenWeatherContext } from '@/lib/listenContextSnapshot';
import { listenContextError, listenContextLog, listenContextWarn } from '@/lib/listenContextDebug';
import { formatListenContextMeta } from '@/lib/listenContextDisplay';
import { ReceiverComboSelect } from '@/components/ReceiverComboSelect';
import {
  LISTEN_HISTORY_AMP_CATEGORIES,
  LISTEN_HISTORY_DEFAULT_MEDIA,
  LISTEN_HISTORY_MEDIA_OPTIONS,
  LISTEN_HISTORY_RECEIVER_CATEGORIES,
  LISTEN_HISTORY_SOURCE_CATEGORIES,
  formatListenHistoryMediaLabel,
  formatListenHistoryOptionLabel,
  listenHistoryMediaDisplay,
  listenHistoryMediaForForm,
  type ListenHistoryMedia,
} from '@/lib/listenHistoryGear';

type GearSummary = {
  id: number;
  brand: string;
  model: string;
  category: string;
};

type ListenHistoryRow = {
  id: number;
  listened_at: string;
  created_at?: string | null;
  captured_at?: string | null;
  weather_condition?: string | null;
  temperature?: number | null;
  impression: string | null;
  dac_amp_id: number | null;
  dac_amp2_id: number | null;
  headphone_id: number | null;
  source_id: number | null;
  media: string | null;
  source?: GearSummary | null;
  dac_amp?: GearSummary | null;
  dac_amp2?: GearSummary | null;
  headphone?: GearSummary | null;
};

function todayLocalDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sortListenHistoryRows(rows: ListenHistoryRow[]): ListenHistoryRow[] {
  return [...rows].sort((a, b) => {
    const byDate = b.listened_at.localeCompare(a.listened_at);
    if (byDate !== 0) return byDate;
    const aTime = a.created_at ? new Date(a.created_at).getTime() : a.id;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : b.id;
    return bTime - aTime;
  });
}

type GearOption = { id: number; brand: string; model: string };

type AlbumListenHistorySectionProps = {
  albumId: number;
  isAuthenticated: boolean | null;
  variant?: 'accordion' | 'tab';
  onHeadfiClick?: (headfiId: number) => void;
  onHistoryCountChange?: (count: number) => void;
};

export function AlbumListenHistorySection({
  albumId,
  isAuthenticated,
  variant = 'accordion',
  onHeadfiClick,
  onHistoryCountChange,
}: AlbumListenHistorySectionProps) {
  const [listenHistory, setListenHistory] = useState<ListenHistoryRow[]>([]);
  const [listenLoading, setListenLoading] = useState(false);
  const [listenDate, setListenDate] = useState('');
  const [listenImpression, setListenImpression] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ListenHistoryMedia>(LISTEN_HISTORY_DEFAULT_MEDIA);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedDacAmpId, setSelectedDacAmpId] = useState('');
  const [selectedDacAmp2Id, setSelectedDacAmp2Id] = useState('');
  const [selectedHeadphoneId, setSelectedHeadphoneId] = useState('');
  const [sourceOptions, setSourceOptions] = useState<GearOption[]>([]);
  const [dacAmpOptions, setDacAmpOptions] = useState<GearOption[]>([]);
  const [headphoneOptions, setHeadphoneOptions] = useState<GearOption[]>([]);
  const [receiverError, setReceiverError] = useState<string | null>(null);
  const [listenSaving, setListenSaving] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const editFormRef = useRef<HTMLLIElement>(null);

  const resetFormFields = useCallback((options?: { forNew?: boolean }) => {
    setListenDate(options?.forNew ? todayLocalDateInputValue() : '');
    setListenImpression('');
    setSelectedMedia(LISTEN_HISTORY_DEFAULT_MEDIA);
    setSelectedSourceId('');
    setSelectedDacAmpId('');
    setSelectedDacAmp2Id('');
    setSelectedHeadphoneId('');
    setReceiverError(null);
    setEditingId(null);
  }, []);

  const ensureGearOption = useCallback((gear: GearSummary | null | undefined, setter: (updater: (prev: GearOption[]) => GearOption[]) => void) => {
    if (!gear) return;
    setter((prev) => {
      if (prev.some((g) => g.id === gear.id)) return prev;
      return [...prev, { id: gear.id, brand: gear.brand, model: gear.model }].sort(
        (a, b) => a.brand.localeCompare(b.brand, 'ko') || a.model.localeCompare(b.model, 'ko'),
      );
    });
  }, []);

  const loadListenHistory = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('album_listen_history')
      .select(
        'id, listened_at, created_at, captured_at, weather_condition, temperature, impression, media, source_id, dac_amp_id, dac_amp2_id, headphone_id',
      )
      .eq('album_id', albumId)
      .order('listened_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message || '청취 이력을 불러오지 못했습니다.');
      setListenHistory([]);
      return;
    }
    const rows = sortListenHistoryRows(
      ((data ?? []) as ListenHistoryRow[]).map((row) => ({
        ...row,
        dac_amp2_id: row.dac_amp2_id ?? null,
        source_id: row.source_id ?? null,
        media: row.media ?? null,
      })),
    );
    const gearIds = new Set<number>();
    for (const row of rows) {
      if (row.source_id != null) gearIds.add(row.source_id);
      if (row.dac_amp_id != null) gearIds.add(row.dac_amp_id);
      if (row.dac_amp2_id != null) gearIds.add(row.dac_amp2_id);
      if (row.headphone_id != null) gearIds.add(row.headphone_id);
    }
    if (gearIds.size === 0) {
      setListenHistory(rows);
      return;
    }
    const { data: gearRows, error: gearError } = await supabase
      .from('headfi')
      .select('id, brand, model, category')
      .in('id', [...gearIds]);
    if (gearError) {
      setListenHistory(rows);
      return;
    }
    const gearMap = new Map<number, GearSummary>(
      (gearRows ?? []).map((g) => [
        g.id,
        {
          id: g.id,
          brand: g.brand || '',
          model: g.model || '',
          category: g.category || '',
        },
      ]),
    );
    setListenHistory(
      rows.map((row) => ({
        ...row,
        source: row.source_id != null ? gearMap.get(row.source_id) ?? null : null,
        dac_amp: row.dac_amp_id != null ? gearMap.get(row.dac_amp_id) ?? null : null,
        dac_amp2: row.dac_amp2_id != null ? gearMap.get(row.dac_amp2_id) ?? null : null,
        headphone: row.headphone_id != null ? gearMap.get(row.headphone_id) ?? null : null,
      })),
    );
  }, [albumId]);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setListenHistory([]);
      return;
    }
    let cancelled = false;
    setListenLoading(true);
    void loadListenHistory().finally(() => {
      if (!cancelled) setListenLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, albumId, loadListenHistory]);

  useEffect(() => {
    onHistoryCountChange?.(listenHistory.length);
  }, [listenHistory.length, onHistoryCountChange]);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setSourceOptions([]);
      setDacAmpOptions([]);
      setHeadphoneOptions([]);
      return;
    }
    const supabase = createClient();
    const mapOptions = (rows: { id: number; brand: string | null; model: string | null }[] | null): GearOption[] =>
      (rows ?? []).map((r) => ({
        id: r.id,
        brand: r.brand || '',
        model: r.model || '',
      }));
    void Promise.all([
      supabase
        .from('headfi')
        .select('id, brand, model')
        .in('category', [...LISTEN_HISTORY_SOURCE_CATEGORIES])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
      supabase
        .from('headfi')
        .select('id, brand, model')
        .in('category', [...LISTEN_HISTORY_AMP_CATEGORIES])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
      supabase
        .from('headfi')
        .select('id, brand, model')
        .in('category', [...LISTEN_HISTORY_RECEIVER_CATEGORIES])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
    ]).then(([sourceRes, ampRes, hpRes]) => {
      setSourceOptions(mapOptions(sourceRes.data));
      setDacAmpOptions(mapOptions(ampRes.data));
      setHeadphoneOptions(mapOptions(hpRes.data));
    });
  }, [isAuthenticated]);

  useEffect(() => {
    resetFormFields();
    setListenOpen(false);
    setFormOpen(false);
    setPendingDeleteId(null);
  }, [albumId, resetFormFields]);

  const parseOptionalId = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) ? null : n;
  };

  const enrichListenHistoryWeather = useCallback(async (rowId: number, contextPromise: Promise<ListenWeatherContext>) => {
    listenContextLog('weather enrich start', { rowId });
    const { weather_condition, temperature, geoFailureCode } = await contextPromise;
    if (weather_condition == null && temperature == null) {
      listenContextWarn('weather enrich skipped — no data', { rowId });
      if (geoFailureCode === 2) {
        toast.warning(LISTEN_GEO_UNAVAILABLE_TOAST);
      }
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from('album_listen_history')
      .update({ weather_condition, temperature })
      .eq('id', rowId);
    if (error) {
      listenContextError('weather enrich update failed', { rowId, message: error.message });
      return;
    }
    listenContextLog('weather enrich saved', { rowId, weather_condition, temperature });
    await loadListenHistory();
  }, [loadListenHistory]);

  const saveListenHistory = async () => {
    if (isAuthenticated !== true) return;
    const d = listenDate.trim();
    if (!d) {
      toast.error('청취일을 선택해 주세요.');
      return;
    }
    const headphoneId = parseOptionalId(selectedHeadphoneId);
    if (editingId == null && headphoneId == null) {
      setReceiverError('Receiver를 선택해 주세요.');
      return;
    }
    setReceiverError(null);
    setListenSaving(true);
    const weatherContextPromise = editingId == null ? fetchListenWeatherContext() : null;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      const payload = {
        listened_at: d,
        impression: listenImpression.trim() || null,
        media: selectedMedia,
        source_id: parseOptionalId(selectedSourceId),
        dac_amp_id: parseOptionalId(selectedDacAmpId),
        dac_amp2_id: parseOptionalId(selectedDacAmp2Id),
        headphone_id: headphoneId,
      };
      const contextSnapshot =
        editingId == null
          ? { captured_at: createListenCapturedAt(), weather_condition: null, temperature: null }
          : null;
      const insertResult =
        editingId != null
          ? await supabase.from('album_listen_history').update(payload).eq('id', editingId)
          : await supabase
              .from('album_listen_history')
              .insert({
                album_id: albumId,
                ...payload,
                captured_at: contextSnapshot?.captured_at ?? null,
                weather_condition: contextSnapshot?.weather_condition ?? null,
                temperature: contextSnapshot?.temperature ?? null,
              })
              .select('id')
              .single();
      const error = insertResult.error;
      const insertedId =
        editingId == null && insertResult.data && 'id' in insertResult.data
          ? (insertResult.data as { id: number }).id
          : null;
      if (error) {
        toast.error(error.message || '저장하지 못했습니다.');
        return;
      }
      if (insertedId != null && weatherContextPromise) {
        void enrichListenHistoryWeather(insertedId, weatherContextPromise);
      } else if (editingId == null && insertedId == null) {
        listenContextWarn('weather enrich not scheduled — missing inserted id');
      }
      resetFormFields();
      setFormOpen(false);
      await loadListenHistory();
      toast.success(editingId != null ? '청취 이력을 수정했습니다.' : '청취 이력을 저장했습니다.');
    } finally {
      setListenSaving(false);
    }
  };

  const startEditListenHistory = (row: ListenHistoryRow) => {
    ensureGearOption(row.source, setSourceOptions);
    ensureGearOption(row.dac_amp, setDacAmpOptions);
    ensureGearOption(row.dac_amp2, setDacAmpOptions);
    ensureGearOption(row.headphone, setHeadphoneOptions);
    setEditingId(row.id);
    setListenDate(row.listened_at?.slice(0, 10) ?? '');
    setListenImpression(row.impression ?? '');
    setSelectedMedia(listenHistoryMediaForForm(row.media));
    setSelectedSourceId(row.source_id != null ? String(row.source_id) : '');
    setSelectedDacAmpId(row.dac_amp_id != null ? String(row.dac_amp_id) : '');
    setSelectedDacAmp2Id(row.dac_amp2_id != null ? String(row.dac_amp2_id) : '');
    setSelectedHeadphoneId(row.headphone_id != null ? String(row.headphone_id) : '');
    setReceiverError(null);
    setFormOpen(false);
    if (variant === 'accordion') setListenOpen(true);
  };

  useEffect(() => {
    if (editingId == null) return;
    const frame = window.requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingId]);

  const cancelForm = () => {
    resetFormFields();
    setFormOpen(false);
  };

  const deleteListenHistory = async (rowId: number) => {
    setListenSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('album_listen_history').delete().eq('id', rowId);
      if (error) {
        toast.error(error.message || '삭제하지 못했습니다.');
        return;
      }
      setPendingDeleteId(null);
      if (editingId === rowId) {
        resetFormFields();
        setFormOpen(false);
      }
      await loadListenHistory();
    } finally {
      setListenSaving(false);
    }
  };

  const toggleFormOpen = useCallback(() => {
    setFormOpen((prev) => {
      if (prev) {
        resetFormFields();
        return false;
      }
      resetFormFields({ forNew: true });
      if (variant === 'accordion') setListenOpen(true);
      return true;
    });
  }, [resetFormFields, variant]);

  if (isAuthenticated !== true) {
    if (variant === 'tab') {
      return <p className="text-xs opacity-60">로그인 후 청취 이력을 기록할 수 있습니다.</p>;
    }
    return null;
  }

  const renderGearLine = (row: ListenHistoryRow) => {
    const parts: { gear: GearSummary; name: string }[] = [];
    if (row.source) parts.push({ gear: row.source, name: formatListenHistoryOptionLabel(row.source) });
    if (row.dac_amp) parts.push({ gear: row.dac_amp, name: formatListenHistoryOptionLabel(row.dac_amp) });
    if (row.dac_amp2) parts.push({ gear: row.dac_amp2, name: formatListenHistoryOptionLabel(row.dac_amp2) });
    if (parts.length === 0) return null;

    if (onHeadfiClick) {
      return (
        <p className="mt-2 text-xs opacity-80">
          {parts.map((part, idx) => (
            <span key={part.gear.id}>
              {idx > 0 ? <span className="opacity-50"> / </span> : null}
              <button
                type="button"
                onClick={() => onHeadfiClick(part.gear.id)}
                className="underline-offset-2 transition-opacity hover:opacity-100 hover:underline"
              >
                {part.name}
              </button>
            </span>
          ))}
        </p>
      );
    }

    return (
      <p className="mt-2 text-xs opacity-80">{parts.map((part) => part.name).join(' / ')}</p>
    );
  };

  const inputForm = (
    <div
      className="space-y-3 rounded-xl p-4"
      style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
    >
      <div>
        <label className="mb-1 block text-[11px] font-semibold opacity-70">청취일</label>
        <input
          type="date"
          value={listenDate}
          onChange={(e) => setListenDate(e.target.value)}
          title="청취일"
          aria-label="청취일"
          className="box-border w-full max-w-[12rem] rounded-lg border px-1.5 py-2 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="mb-1 block text-[11px] font-semibold opacity-70">Media</label>
          <select
            className="select-apple h-[42px] w-full px-3 py-2 text-sm"
            value={selectedMedia}
            onChange={(e) => setSelectedMedia(listenHistoryMediaForForm(e.target.value))}
            disabled={listenSaving}
            aria-label="Media"
          >
            {LISTEN_HISTORY_MEDIA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatListenHistoryMediaLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-[11px] font-semibold opacity-70">Source</label>
          <select
            className="select-apple h-[42px] w-full px-3 py-2 text-sm"
            value={selectedSourceId}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            disabled={listenSaving}
          >
            <option value="">선택 안 함</option>
            {sourceOptions.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {formatListenHistoryOptionLabel(g)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="min-w-0">
          <label className="mb-1 block text-[11px] font-semibold opacity-70">Amp 1</label>
          <select
            className="select-apple h-[42px] w-full px-3 py-2 text-sm"
            value={selectedDacAmpId}
            onChange={(e) => setSelectedDacAmpId(e.target.value)}
            disabled={listenSaving}
          >
            <option value="">선택 안 함</option>
            {dacAmpOptions.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {formatListenHistoryOptionLabel(g)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-[11px] font-semibold opacity-70">Amp 2</label>
          <select
            className="select-apple h-[42px] w-full px-3 py-2 text-sm"
            value={selectedDacAmp2Id}
            onChange={(e) => setSelectedDacAmp2Id(e.target.value)}
            disabled={listenSaving}
          >
            <option value="">선택 안 함</option>
            {dacAmpOptions.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {formatListenHistoryOptionLabel(g)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-[11px] font-semibold opacity-70">Receiver</label>
          <ReceiverComboSelect
            className="min-w-0 w-full"
            value={selectedHeadphoneId}
            onChange={(value) => {
              setSelectedHeadphoneId(value);
              if (value) setReceiverError(null);
            }}
            options={headphoneOptions}
            disabled={listenSaving}
            placeholder="Receiver"
            formatOptionLabel={formatListenHistoryOptionLabel}
            aria-label="Receiver"
          />
          {receiverError ? <p className="mt-1 text-xs text-red-500">{receiverError}</p> : null}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold opacity-70">소감 (선택)</label>
        <div className="flex min-w-0 items-center gap-2">
          <textarea
            value={listenImpression}
            onChange={(e) => setListenImpression(e.target.value)}
            placeholder="청취 소감을 적어 주세요."
            title="소감 (선택)"
            aria-label="소감 (선택)"
            rows={4}
            className="input-apple min-h-[5.5rem] min-w-0 flex-1 resize-y rounded-lg px-3 py-2 text-sm leading-relaxed"
          />
          <div className="flex shrink-0 flex-col gap-2 self-center">
            <button
              type="button"
              onClick={() => void saveListenHistory()}
              disabled={listenSaving}
              className="btn-apple btn-apple-primary px-4 py-2.5 text-sm leading-none disabled:pointer-events-none disabled:opacity-50"
            >
              {editingId != null ? '저장' : '추가'}
            </button>
            {editingId != null ? (
              <button
                type="button"
                onClick={cancelForm}
                disabled={listenSaving}
                className="btn-apple px-4 py-2.5 text-sm leading-none disabled:pointer-events-none disabled:opacity-50"
              >
                취소
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const formToggleButton = (
    <button
      type="button"
      onClick={toggleFormOpen}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-90"
      style={{ color: 'var(--foreground)' }}
      aria-label={formOpen ? '입력 닫기' : '청취 이력 추가'}
      aria-expanded={formOpen}
    >
      {formOpen ? <X className="size-4" strokeWidth={2} /> : <Plus className="size-4" strokeWidth={2} />}
    </button>
  );

  const historyList = (
    <>
      {pendingDeleteId != null ? (
        <div
          className="mb-3 rounded-lg border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
        >
          <p className="text-sm font-medium">이 청취 이력을 삭제할까요?</p>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="btn-apple btn-apple-secondary h-[34px] px-3 text-sm"
              onClick={() => setPendingDeleteId(null)}
              disabled={listenSaving}
            >
              취소
            </button>
            <button
              type="button"
              className="btn-apple btn-apple-danger h-[34px] px-3 text-sm"
              onClick={() => void deleteListenHistory(pendingDeleteId)}
              disabled={listenSaving}
            >
              {listenSaving ? '삭제 중…' : '삭제'}
            </button>
          </div>
        </div>
      ) : null}
      {listenLoading ? (
        <div className="flex items-center gap-2 py-2 opacity-60">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
          <span className="text-xs">불러오는 중…</span>
        </div>
      ) : listenHistory.length > 0 ? (
        <ul className="space-y-3">
          {listenHistory.map((row) => {
            if (editingId === row.id) {
              return (
                <li key={row.id} ref={editFormRef}>
                  {inputForm}
                </li>
              );
            }
            const mediaLabel = listenHistoryMediaDisplay(row.media);
            const context = formatListenContextMeta({
              captured_at: row.captured_at,
              weather_condition: row.weather_condition,
              temperature: row.temperature,
            });
            const dateLabel = new Date(row.listened_at + 'T12:00:00').toLocaleDateString('ko-KR');
            const receiver = row.headphone;
            return (
              <li
                key={row.id}
                className="flex gap-3 rounded-xl p-3"
                style={{
                  background: 'var(--badge-bg)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tabular-nums">
                    {context ? `${dateLabel} ${context}` : dateLabel}
                  </p>
                  {row.impression?.trim() ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm opacity-85">{row.impression}</p>
                  ) : null}
                  {mediaLabel || receiver ? (
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                      {mediaLabel ? (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium tracking-tight opacity-80"
                          style={{ border: '1px solid var(--border)', background: 'var(--background)' }}
                        >
                          {mediaLabel}
                        </span>
                      ) : null}
                      {receiver ? (
                        onHeadfiClick ? (
                          <button
                            type="button"
                            onClick={() => onHeadfiClick(receiver.id)}
                            className="max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-tight"
                            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
                          >
                            {formatListenHistoryOptionLabel(receiver)}
                          </button>
                        ) : (
                          <span
                            className="max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-tight"
                            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
                          >
                            {formatListenHistoryOptionLabel(receiver)}
                          </span>
                        )
                      ) : null}
                    </div>
                  ) : null}
                  {renderGearLine(row)}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 self-start">
                  <button
                    type="button"
                    onClick={() => startEditListenHistory(row)}
                    disabled={listenSaving}
                    className="btn-apple shrink-0 px-2 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
                    aria-label="이력 수정"
                  >
                    <Pencil className="size-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(row.id)}
                    disabled={listenSaving}
                    className="btn-apple btn-apple-danger shrink-0 px-2 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
                    aria-label="이력 삭제"
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs opacity-60">아직 기록된 청취 이력이 없습니다.</p>
      )}
    </>
  );

  const historyBody = (
    <>
      {formOpen && editingId == null ? <div className="mb-4">{inputForm}</div> : null}
      {historyList}
    </>
  );

  if (variant === 'tab') {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-baseline gap-2">
            <strong className="text-sm">청취 이력</strong>
            <span className="text-xs tabular-nums opacity-55">{listenHistory.length}건</span>
          </span>
          {formToggleButton}
        </div>
        {historyBody}
      </div>
    );
  }

  return (
    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setListenOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1 text-left transition-opacity hover:opacity-90"
          style={{ color: 'var(--foreground)' }}
          aria-expanded={listenOpen}
        >
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <strong className="text-sm">청취 이력</strong>
            <span className="text-xs tabular-nums opacity-55">{listenHistory.length}건</span>
          </span>
          <ChevronDown
            className={`size-5 shrink-0 opacity-60 transition-transform ${listenOpen ? 'rotate-180' : ''}`}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
        {formToggleButton}
      </div>
      {listenOpen ? historyBody : null}
    </div>
  );
}
