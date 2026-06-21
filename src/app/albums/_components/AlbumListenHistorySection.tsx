'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type ListenHistoryRow = {
  id: number;
  listened_at: string;
  impression: string | null;
};

type AlbumListenHistorySectionProps = {
  albumId: number;
  isAuthenticated: boolean | null;
  variant?: 'accordion' | 'tab';
};

export function AlbumListenHistorySection({
  albumId,
  isAuthenticated,
  variant = 'accordion',
}: AlbumListenHistorySectionProps) {
  const [listenHistory, setListenHistory] = useState<ListenHistoryRow[]>([]);
  const [listenLoading, setListenLoading] = useState(false);
  const [listenDate, setListenDate] = useState('');
  const [listenImpression, setListenImpression] = useState('');
  const [listenSaving, setListenSaving] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);

  const loadListenHistory = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('album_listen_history')
      .select('id, listened_at, impression')
      .eq('album_id', albumId)
      .order('listened_at', { ascending: false });
    if (error) {
      toast.error(error.message || '청취 이력을 불러오지 못했습니다.');
      setListenHistory([]);
      return;
    }
    setListenHistory((data ?? []) as ListenHistoryRow[]);
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
    setListenDate('');
    setListenImpression('');
    setListenOpen(false);
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
      const { error } = await supabase.from('album_listen_history').insert({
        album_id: albumId,
        listened_at: d,
        impression: listenImpression.trim() || null,
      });
      if (error) {
        toast.error(error.message || '저장하지 못했습니다.');
        return;
      }
      setListenImpression('');
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

  if (isAuthenticated !== true) {
    if (variant === 'tab') {
      return <p className="text-xs opacity-60">로그인 후 청취 이력을 기록할 수 있습니다.</p>;
    }
    return null;
  }

  const historyBody = (
    <>
      {listenLoading ? (
        <div className="mb-4 flex items-center gap-2 py-2 opacity-60">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
          <span className="text-xs">불러오는 중…</span>
        </div>
      ) : listenHistory.length > 0 ? (
        <ul className="mb-4 space-y-3">
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
        <p className="mb-4 text-xs opacity-60">아직 기록된 청취 이력이 없습니다.</p>
      )}
      <div className="flex min-w-0 flex-row flex-nowrap items-center gap-2">
        <input
          type="date"
          value={listenDate}
          onChange={(e) => setListenDate(e.target.value)}
          title="청취일"
          aria-label="청취일"
          className="box-border w-[10.5rem] max-w-[min(100%,10.5rem)] shrink-0 rounded-lg border px-1.5 py-2 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
        />
        <input
          type="text"
          value={listenImpression}
          onChange={(e) => setListenImpression(e.target.value)}
          placeholder="소감 (선택)"
          title="소감 (선택)"
          aria-label="소감 (선택)"
          className="min-w-0 flex-1 basis-0 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
        />
        <button
          type="button"
          onClick={() => void addListenHistory()}
          disabled={listenSaving}
          className="btn-apple btn-apple-primary box-border shrink-0 px-3 py-2 text-sm leading-none disabled:pointer-events-none disabled:opacity-50"
        >
          추가
        </button>
      </div>
    </>
  );

  if (variant === 'tab') {
    return (
      <div>
        <div className="mb-3 flex items-baseline gap-2">
          <strong className="text-sm">청취 이력</strong>
          <span className="text-xs tabular-nums opacity-55">{listenHistory.length}건</span>
        </div>
        {historyBody}
      </div>
    );
  }

  return (
    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={() => setListenOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left transition-opacity hover:opacity-90"
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
      {listenOpen ? historyBody : null}
    </div>
  );
}
