'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type GearSummary = {
  id: number;
  brand: string;
  model: string;
  category: string;
};

type ListenHistoryRow = {
  id: number;
  listened_at: string;
  impression: string | null;
  dac_amp_id: number | null;
  headphone_id: number | null;
  dac_amp?: GearSummary | null;
  headphone?: GearSummary | null;
};

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
  const [selectedDacAmpId, setSelectedDacAmpId] = useState('');
  const [selectedHeadphoneId, setSelectedHeadphoneId] = useState('');
  const [dacAmpOptions, setDacAmpOptions] = useState<GearOption[]>([]);
  const [headphoneOptions, setHeadphoneOptions] = useState<GearOption[]>([]);
  const [listenSaving, setListenSaving] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const loadListenHistory = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('album_listen_history')
      .select('id, listened_at, impression, dac_amp_id, headphone_id')
      .eq('album_id', albumId)
      .order('listened_at', { ascending: false });
    if (error) {
      toast.error(error.message || '청취 이력을 불러오지 못했습니다.');
      setListenHistory([]);
      return;
    }
    const rows = (data ?? []) as ListenHistoryRow[];
    const gearIds = new Set<number>();
    for (const row of rows) {
      if (row.dac_amp_id != null) gearIds.add(row.dac_amp_id);
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
        dac_amp: row.dac_amp_id != null ? gearMap.get(row.dac_amp_id) ?? null : null,
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
      setDacAmpOptions([]);
      setHeadphoneOptions([]);
      return;
    }
    const supabase = createClient();
    void Promise.all([
      supabase
        .from('headfi')
        .select('id, brand, model')
        .in('category', ['DAC/AMP', 'DAP', 'Source', '기타'])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
      supabase
        .from('headfi')
        .select('id, brand, model')
        .in('category', ['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰'])
        .eq('status2', '보유중')
        .order('brand')
        .order('model'),
    ]).then(([dacRes, hpRes]) => {
      setDacAmpOptions(
        (dacRes.data ?? []).map((r) => ({
          id: r.id,
          brand: r.brand || '',
          model: r.model || '',
        })),
      );
      setHeadphoneOptions(
        (hpRes.data ?? []).map((r) => ({
          id: r.id,
          brand: r.brand || '',
          model: r.model || '',
        })),
      );
    });
  }, [isAuthenticated]);

  useEffect(() => {
    setListenDate('');
    setListenImpression('');
    setSelectedDacAmpId('');
    setSelectedHeadphoneId('');
    setListenOpen(false);
    setFormOpen(false);
  }, [albumId]);

  const addListenHistory = async () => {
    if (isAuthenticated !== true) return;
    const d = listenDate.trim();
    if (!d) {
      toast.error('청취일을 선택해 주세요.');
      return;
    }
    setListenSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      const dacAmpId = selectedDacAmpId.trim()
        ? parseInt(selectedDacAmpId, 10)
        : null;
      const headphoneId = selectedHeadphoneId.trim()
        ? parseInt(selectedHeadphoneId, 10)
        : null;
      const { error } = await supabase.from('album_listen_history').insert({
        album_id: albumId,
        listened_at: d,
        impression: listenImpression.trim() || null,
        dac_amp_id: dacAmpId != null && !Number.isNaN(dacAmpId) ? dacAmpId : null,
        headphone_id: headphoneId != null && !Number.isNaN(headphoneId) ? headphoneId : null,
      });
      if (error) {
        toast.error(error.message || '저장하지 못했습니다.');
        return;
      }
      setListenImpression('');
      setSelectedDacAmpId('');
      setSelectedHeadphoneId('');
      setListenDate('');
      setFormOpen(false);
      await loadListenHistory();
      toast.success('청취 이력을 저장했습니다.');
    } finally {
      setListenSaving(false);
    }
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
      await loadListenHistory();
    } finally {
      setListenSaving(false);
    }
  };

  const toggleFormOpen = useCallback(() => {
    setFormOpen((prev) => {
      const next = !prev;
      if (next && variant === 'accordion') {
        setListenOpen(true);
      }
      return next;
    });
  }, [variant]);

  if (isAuthenticated !== true) {
    if (variant === 'tab') {
      return <p className="text-xs opacity-60">로그인 후 청취 이력을 기록할 수 있습니다.</p>;
    }
    return null;
  }

  const gearDisplayName = (gear: GearSummary) => `${gear.brand} ${gear.model}`.trim() || '—';

  const renderGearLine = (row: ListenHistoryRow) => {
    const parts: { gear: GearSummary; name: string }[] = [];
    if (row.dac_amp) parts.push({ gear: row.dac_amp, name: gearDisplayName(row.dac_amp) });
    if (row.headphone) parts.push({ gear: row.headphone, name: gearDisplayName(row.headphone) });
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
        <div>
          <label className="mb-1 block text-[11px] font-semibold opacity-70">DAC / AMP (선택)</label>
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
          <label className="mb-1 block text-[11px] font-semibold opacity-70">헤드폰 / 이어폰 (선택)</label>
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
          <button
            type="button"
            onClick={() => void addListenHistory()}
            disabled={listenSaving}
            className="btn-apple btn-apple-primary shrink-0 self-center px-4 py-2.5 text-sm leading-none disabled:pointer-events-none disabled:opacity-50"
          >
            추가
          </button>
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
          {listenHistory.map((row) => (
            <li
              key={row.id}
              className="flex gap-3 rounded-xl p-3"
              style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tabular-nums">
                  {new Date(row.listened_at + 'T12:00:00').toLocaleDateString('ko-KR')}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm opacity-85">
                  {row.impression?.trim() ? row.impression : '—'}
                </p>
                {renderGearLine(row)}
              </div>
              <button
                type="button"
                onClick={() => void deleteListenHistory(row.id)}
                disabled={listenSaving}
                className="btn-apple btn-apple-danger shrink-0 self-start px-2 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
                aria-label="이력 삭제"
              >
                <Trash2 className="size-3.5" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs opacity-60">아직 기록된 청취 이력이 없습니다.</p>
      )}
    </>
  );

  const historyBody = (
    <>
      {formOpen ? <div className="mb-4">{inputForm}</div> : null}
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
