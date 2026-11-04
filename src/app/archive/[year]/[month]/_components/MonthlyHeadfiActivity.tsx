/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { HeadfiDetailModal } from '@/app/headfi/_components/HeadfiDetailModal';
import type { Headfi } from '@/app/headfi/types';

export type MonthlyPurchasedGear = {
  id: number;
  brand: string;
  model: string;
  category: string | null;
  image_url: string | null;
  price: number | null;
  purchase_date: string;
};

export type MonthlyPurchasedAccessory = {
  id: string;
  name: string;
  price: number | null;
  purchase_date: string;
};

export type MonthlySoldGear = {
  saleId: number;
  headfiId: number | null;
  brand: string;
  model: string;
  category: string | null;
  image_url: string | null;
  salePrice: number | null;
  saleDate: string;
};

export type MonthlySoldAccessory = {
  saleId: number;
  name: string;
  salePrice: number | null;
  saleDate: string;
};

export type MonthlyHeadfiActivityData = {
  spendTotal: number;
  salesTotal: number;
  purchasedGear: MonthlyPurchasedGear[];
  purchasedAccessories: MonthlyPurchasedAccessory[];
  soldGear: MonthlySoldGear[];
  soldAccessories: MonthlySoldAccessory[];
};

type Props = {
  data: MonthlyHeadfiActivityData;
};

const mediaGridClass = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6';

function formatWon(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString()}원`;
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

export function MonthlyHeadfiActivity({ data }: Props) {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [viewingHeadfi, setViewingHeadfi] = useState<Headfi | null>(null);

  const openHeadfiById = useCallback(async (id: number) => {
    const { data: row, error } = await createClient().from('headfi').select('*').eq('id', id).maybeSingle();
    if (error || !row) {
      toast.error('기기 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingHeadfi(row as Headfi);
  }, []);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section
        className="grid grid-cols-2 gap-3 rounded-xl border p-4 sm:gap-4 sm:p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
      >
        <div>
          <p className="text-xs font-semibold opacity-70">지출액</p>
          <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{formatWon(data.spendTotal)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold opacity-70">판매액</p>
          <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{formatWon(data.salesTotal)}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold opacity-90">🎧 구매한 기기</h2>
        {data.purchasedGear.length === 0 && data.purchasedAccessories.length === 0 ? (
          <p className="text-sm opacity-70">이 달에 구매한 기기가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.purchasedGear.length > 0 ? (
              <div className={mediaGridClass}>
                {data.purchasedGear.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => void openHeadfiById(h.id)}
                    className="group flex cursor-pointer flex-col rounded-xl p-4 text-left transition-all duration-300"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <div
                      className="relative mb-4 aspect-square overflow-hidden rounded-lg"
                      style={{ background: 'var(--badge-bg)' }}
                    >
                      {h.image_url ? (
                        <img
                          src={h.image_url}
                          alt="기기 이미지"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
                          <Headphones className="size-8 opacity-40" strokeWidth={1.25} aria-hidden />
                        </div>
                      )}
                    </div>
                    <span className="badge-apple mb-2 inline-flex w-fit px-2 py-0.5 text-[11px] font-semibold">
                      {h.category ?? '—'}
                    </span>
                    <h3 className="mb-0.5 truncate text-sm font-bold leading-tight">{h.model || '—'}</h3>
                    <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                      {h.brand || '—'}
                    </p>
                    <p className="mt-2 text-xs font-medium tabular-nums opacity-85">{formatWon(h.price)}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums opacity-60">구매일 {formatDate(h.purchase_date)}</p>
                  </button>
                ))}
              </div>
            ) : null}
            {data.purchasedAccessories.length > 0 ? (
              <ul className="space-y-1.5 rounded-xl border px-3 py-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                {data.purchasedAccessories.map((a) => (
                  <li key={a.id} className="flex min-w-0 items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate opacity-90">{a.name}</span>
                    <span className="shrink-0 tabular-nums opacity-75">{formatWon(a.price)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold opacity-90">💸 판매한 기기</h2>
        {data.soldGear.length === 0 && data.soldAccessories.length === 0 ? (
          <p className="text-sm opacity-70">이 달에 판매한 기기가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.soldGear.length > 0 ? (
              <div className={mediaGridClass}>
                {data.soldGear.map((h) => (
                  <button
                    key={h.saleId}
                    type="button"
                    onClick={() => {
                      if (h.headfiId != null) void openHeadfiById(h.headfiId);
                    }}
                    disabled={h.headfiId == null}
                    className="group flex flex-col rounded-xl p-4 text-left transition-all duration-300 disabled:cursor-default"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <div
                      className="relative mb-4 aspect-square overflow-hidden rounded-lg"
                      style={{ background: 'var(--badge-bg)' }}
                    >
                      {h.image_url ? (
                        <img
                          src={h.image_url}
                          alt="기기 이미지"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
                          <Headphones className="size-8 opacity-40" strokeWidth={1.25} aria-hidden />
                        </div>
                      )}
                    </div>
                    <span className="badge-apple mb-2 inline-flex w-fit px-2 py-0.5 text-[11px] font-semibold">
                      {h.category ?? '—'}
                    </span>
                    <h3 className="mb-0.5 truncate text-sm font-bold leading-tight">{h.model || '—'}</h3>
                    <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                      {h.brand || '—'}
                    </p>
                    <p className="mt-2 text-xs font-medium tabular-nums opacity-85">{formatWon(h.salePrice)}</p>
                    <p className="mt-0.5 text-[11px] tabular-nums opacity-60">판매일 {formatDate(h.saleDate)}</p>
                  </button>
                ))}
              </div>
            ) : null}
            {data.soldAccessories.length > 0 ? (
              <ul className="space-y-1.5 rounded-xl border px-3 py-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                {data.soldAccessories.map((a) => (
                  <li key={a.saleId} className="flex min-w-0 items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate opacity-90">{a.name}</span>
                    <span className="shrink-0 tabular-nums opacity-75">{formatWon(a.salePrice)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      {viewingHeadfi ? (
        <HeadfiDetailModal
          viewingItem={viewingHeadfi}
          registeredAlbums={[]}
          matchedMatchingDevice={null}
          matchedHeadphones={[]}
          onClose={() => setViewingHeadfi(null)}
          onEdit={() => {
            const id = viewingHeadfi.id;
            setViewingHeadfi(null);
            router.push(`/headfi?view=${id}`);
          }}
          onDelete={() => toast.info('삭제는 헤드파이 화면에서 진행해 주세요.')}
          onHeadfiPatch={(patch) => setViewingHeadfi((v) => (v ? { ...v, ...patch } : null))}
          onAlbumClick={() => {}}
          isAuthenticated={isAuthenticated}
        />
      ) : null}
    </div>
  );
}
