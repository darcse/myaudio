/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Headphones, SlidersHorizontal } from 'lucide-react';
import type { Headfi } from '../types';
import { formatVrmsAt32Ohm } from '../utils';

type HeadfiInfoSectionProps = {
  viewingItem: Headfi;
  matchedMatchingDevice: { id: number; brand: string; model: string } | null;
  matchedHeadphones: { id: number; brand: string; model: string; category: string }[];
};

export function HeadfiInfoSection({
  viewingItem,
  matchedMatchingDevice,
  matchedHeadphones,
}: HeadfiInfoSectionProps) {
  const [specOpen, setSpecOpen] = useState(() => viewingItem.category === 'DAC/AMP');

  useEffect(() => {
    setSpecOpen(viewingItem.category === 'DAC/AMP');
  }, [viewingItem.id, viewingItem.category]);

  return (
    <>
      <h2 className="section-title text-xl mb-4 pr-12">
        {viewingItem.brand} {viewingItem.model}
      </h2>
      <div className="flex flex-col sm:flex-row gap-6 mb-2 pb-6">
        {viewingItem.image_url ? (
          <img
            src={viewingItem.image_url}
            alt="기기 이미지"
            className="w-32 h-32 object-cover rounded-xl mx-auto sm:mx-0 flex-shrink-0"
            style={{ border: '1px solid var(--border)' }}
          />
        ) : null}
        <div className="space-y-2 text-sm opacity-90 flex-1">
          <p><strong>브랜드:</strong> {viewingItem.brand}</p>
          <p><strong>모델명:</strong> {viewingItem.model}</p>
          <p><strong>카테고리:</strong> {viewingItem.category}</p>
          <p><strong>구입일:</strong> {viewingItem.purchase_date || '-'}</p>
          <p>
            <strong>구매 정보:</strong>{' '}
            {viewingItem.status1 || '-'} /{' '}
            {viewingItem.price ? `${Number(viewingItem.price).toLocaleString()}원` : '-'} /{' '}
            <span className="font-semibold">{viewingItem.status2 || '-'}</span>
          </p>
        </div>
      </div>

      <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setSpecOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 text-left mb-3 rounded-lg -mx-1 px-1 py-1 hover:opacity-90 transition-opacity"
          aria-expanded={specOpen}
        >
          <strong className="text-sm flex items-center gap-1.5 font-semibold">
            <SlidersHorizontal className="size-4 opacity-80 shrink-0" aria-hidden />
            상세 스펙
          </strong>
          <span className="text-sm opacity-60 tabular-nums shrink-0">{specOpen ? '▴' : '▾'}</span>
        </button>
        {specOpen ? (
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-4 opacity-90">
            {['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰'].includes(viewingItem.category) ? (
              <>
                {(viewingItem.category === '헤드폰' ||
                  viewingItem.category === '이어폰' ||
                  viewingItem.category === '무선 헤드폰') && (
                  <p className="col-span-2">
                    <strong>타입:</strong> {viewingItem.type1 || '-'} / {viewingItem.type2 || '-'}
                  </p>
                )}
                {viewingItem.category === '무선 이어폰' ? (
                  <p className="col-span-2">
                    <strong>타입:</strong> {viewingItem.type1 || '-'}
                  </p>
                ) : null}
                {(viewingItem.category === '헤드폰' || viewingItem.category === '이어폰') && (
                  <>
                    <p>
                      <strong>임피던스:</strong>{' '}
                      {viewingItem.impedance ? `${viewingItem.impedance} Ω` : '-'}
                    </p>
                    <p>
                      <strong>감도:</strong>{' '}
                      {viewingItem.db1 != null ? `${String(viewingItem.db1)} dB/SPL V` : '-'}{' '}
                      {viewingItem.db1 != null && viewingItem.db2 != null && '·'}{' '}
                      {viewingItem.db2 != null ? `${String(viewingItem.db2)} dB/mW` : ''}
                    </p>
                  </>
                )}
                {viewingItem.category === '헤드폰' ? (
                  <>
                    <p>
                      <strong>구동력:</strong> {viewingItem.volume || '-'} / {viewingItem.volume_type || '-'}
                    </p>
                    <p>
                      <strong>음색 (온도/밝기):</strong> {viewingItem.temp || '-'} / {viewingItem.bright || '-'}
                    </p>
                  </>
                ) : null}
                {viewingItem.category === '이어폰' ? (
                  <p className="col-span-2">
                    <strong>음색 (온도/밝기):</strong> {viewingItem.temp || '-'} / {viewingItem.bright || '-'}
                  </p>
                ) : null}
                <p className="col-span-2">
                  <strong>매칭 (매칭 기기 / gain):</strong>{' '}
                  {viewingItem.matching && viewingItem.matching !== ' ' ? (
                    matchedMatchingDevice ? (
                      <Link href={`/headfi?view=${matchedMatchingDevice.id}`} className="link-apple">
                        {matchedMatchingDevice.brand} {matchedMatchingDevice.model}
                      </Link>
                    ) : (
                      <span>{viewingItem.matching}</span>
                    )
                  ) : (
                    '-'
                  )}
                  {viewingItem.category === '헤드폰' && (viewingItem.gain ? ` / ${viewingItem.gain}` : '')}
                </p>
                <p className="col-span-2">
                  <strong>케이블:</strong> {viewingItem.cable || '-'}
                  {viewingItem.cable && Number(viewingItem.cable_price) > 0
                    ? ` (${Number(viewingItem.cable_price).toLocaleString()}원)`
                    : ''}
                </p>
              </>
            ) : null}
            {viewingItem.category === 'DAC/AMP' ? (
              <>
                <p className="col-span-2">
                  <strong>앰프 타입:</strong> {viewingItem.amp_type || '-'}
                </p>
                <p className="col-span-2">
                  <strong>Rk (Ω):</strong>{' '}
                  {viewingItem.output_impedance != null &&
                  Number.isFinite(Number(viewingItem.output_impedance))
                    ? `${viewingItem.output_impedance} Ω`
                    : '-'}
                </p>
                <p className="col-span-2">
                  <strong>Chipset:</strong> {viewingItem.chipset || '-'}
                </p>
                {formatVrmsAt32Ohm(viewingItem.vrms_bal) ? (
                  <p className="col-span-2">
                    <strong>Vrms (BAL):</strong> {formatVrmsAt32Ohm(viewingItem.vrms_bal)}
                  </p>
                ) : null}
                {formatVrmsAt32Ohm(viewingItem.vrms_single) ? (
                  <p className="col-span-2">
                    <strong>Vrms (Single):</strong> {formatVrmsAt32Ohm(viewingItem.vrms_single)}
                  </p>
                ) : null}
              </>
            ) : null}
            <p className="col-span-2"><strong>기타:</strong> {viewingItem.etc || '-'}</p>
          </div>
        ) : null}
      </div>

      {viewingItem.memo ? (
        <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <strong className="block mb-2">메모</strong>
          <p
            className="p-4 rounded-xl whitespace-pre-wrap leading-relaxed text-sm opacity-90"
            style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
          >
            {viewingItem.memo}
          </p>
        </div>
      ) : null}

      {viewingItem.category === 'DAC/AMP' ? (
        <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <strong className="block mb-2 flex items-center">
            <Headphones className="size-4 opacity-80 shrink-0 mr-1.5" /> 매칭 모델
          </strong>
          {matchedHeadphones.length === 0 ? (
            <p className="text-sm opacity-70 py-2">이 기기를 매칭으로 선택한 헤드폰이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {matchedHeadphones.map((h) => (
                <li key={h.id}>
                  <Link href={`/headfi?view=${h.id}`} className="link-apple text-sm">
                    {h.brand} {h.model}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </>
  );
}
