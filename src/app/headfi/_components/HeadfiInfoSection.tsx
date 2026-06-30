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
  matchedHeadphones: { id: number; brand: string; model: string; category: string; image_url?: string | null }[];
  variant?: 'default' | 'tab';
};

export function HeadfiInfoHeroSection({ viewingItem }: Pick<HeadfiInfoSectionProps, 'viewingItem'>) {
  return (
    <div className="flex flex-col gap-6 px-6 pt-3 sm:flex-row">
      {viewingItem.image_url ? (
        <img
          src={viewingItem.image_url}
          alt="기기 이미지"
          className="mx-auto h-32 w-32 flex-shrink-0 rounded-xl object-cover sm:mx-0"
          style={{ border: '1px solid var(--border)' }}
        />
      ) : null}
      <div className="flex-1 space-y-2 text-sm opacity-90">
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
  );
}

export function HeadfiInfoSection({
  viewingItem,
  matchedMatchingDevice,
  matchedHeadphones,
  variant = 'default',
}: HeadfiInfoSectionProps) {
  const cat = viewingItem.category;
  const isWired = cat === '헤드폰' || cat === '이어폰';
  const isHeadphone = cat === '헤드폰';
  const isWireless = cat === '무선 헤드폰' || cat === '무선 이어폰';
  const isSpeaker = cat === '스피커';
  const isDacAmp = cat === 'DAC/AMP';
  const isDap = cat === 'DAP';
  const isSourceOrEtc = cat === 'Source' || cat === '기타';

  const renderMatchingLink = (withGain = false) => (
    <>
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
      {withGain && viewingItem.gain ? ` / ${viewingItem.gain}` : ''}
    </>
  );

  const [specOpen, setSpecOpen] = useState(() => variant === 'tab' || isDacAmp || isDap);

  useEffect(() => {
    setSpecOpen(variant === 'tab' || isDacAmp || isDap);
  }, [viewingItem.id, cat, variant, isDacAmp, isDap]);

  return (
    <>
      {variant === 'default' ? (
        <h2 className="section-title text-xl mb-4 pr-12">
          {viewingItem.brand} {viewingItem.model}
        </h2>
      ) : null}
      {variant === 'default' ? (
        <div className="mb-2 flex flex-col gap-6 pb-6 sm:flex-row">
          {viewingItem.image_url ? (
            <img
              src={viewingItem.image_url}
              alt="기기 이미지"
              className="mx-auto h-32 w-32 flex-shrink-0 rounded-xl object-cover sm:mx-0"
              style={{ border: '1px solid var(--border)' }}
            />
          ) : null}
          <div className="flex-1 space-y-2 text-sm opacity-90">
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
      ) : null}

      <div className={`${variant === 'tab' ? '' : 'pt-4 mt-2 border-t'}`} style={{ borderColor: 'var(--border)' }}>
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
            {isWired ? (
              <>
                <p className="col-span-2">
                  <strong>타입:</strong> {viewingItem.type1 || '-'} / {viewingItem.type2 || '-'}
                </p>
                <div className="col-span-2 grid grid-cols-[3fr_7fr] gap-x-6">
                  <p className="min-w-0">
                    <strong>임피던스:</strong>{' '}
                    {viewingItem.impedance ? `${viewingItem.impedance} Ω` : '-'}
                  </p>
                  <p className="min-w-0">
                    <strong>감도:</strong>{' '}
                    {[
                      viewingItem.db1 != null ? `${String(viewingItem.db1)} dB/SPL V` : null,
                      viewingItem.db2 != null ? `${String(viewingItem.db2)} dB/mW` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '-'}
                  </p>
                </div>
                {cat === '헤드폰' ? (
                  <div className="col-span-2 grid grid-cols-[3fr_7fr] gap-x-6">
                    <p className="min-w-0">
                      <strong>구동력:</strong> {viewingItem.volume || '-'} / {viewingItem.volume_type || '-'}
                    </p>
                    <p className="min-w-0">
                      <strong>음색 (온도/밝기):</strong> {viewingItem.temp || '-'} / {viewingItem.bright || '-'}
                    </p>
                  </div>
                ) : (
                  <p className="col-span-2">
                    <strong>음색 (온도/밝기):</strong> {viewingItem.temp || '-'} / {viewingItem.bright || '-'}
                  </p>
                )}
                <p className="col-span-2">
                  <strong>매칭 (매칭 기기 / gain):</strong> {renderMatchingLink(true)}
                </p>
                <p className="col-span-2">
                  <strong>케이블:</strong> {viewingItem.cable || '-'}
                  {viewingItem.cable && Number(viewingItem.cable_price) > 0
                    ? ` (${Number(viewingItem.cable_price).toLocaleString()}원)`
                    : ''}
                </p>
                {isWired ? (
                  <p className="col-span-2">
                    <strong>{isHeadphone ? '이어패드' : '이어팁'}:</strong> {viewingItem.eartip || '-'}
                    {viewingItem.eartip && Number(viewingItem.eartip_price) > 0
                      ? ` (${Number(viewingItem.eartip_price).toLocaleString()}원)`
                      : ''}
                  </p>
                ) : null}
                <p>
                  <strong>유닛:</strong> {viewingItem.unit || '-'}
                </p>
              </>
            ) : null}
            {isWireless ? (
              <>
                <p className="col-span-2">
                  <strong>타입:</strong> {viewingItem.type1 || '-'} / {viewingItem.type2 || '-'}
                </p>
                <p className="col-span-2">
                  <strong>매칭:</strong> {renderMatchingLink()}
                </p>
                {viewingItem.eartip?.trim() ? (
                  <p className="col-span-2">
                    <strong>{cat === '무선 헤드폰' ? '이어패드' : '이어팁'}:</strong> {viewingItem.eartip.trim()}
                    {Number(viewingItem.eartip_price) > 0
                      ? ` (${Number(viewingItem.eartip_price).toLocaleString()}원)`
                      : ''}
                  </p>
                ) : null}
                <p className="col-span-2">
                  <strong>유닛:</strong> {viewingItem.unit || '-'}
                </p>
              </>
            ) : null}
            {isSpeaker ? (
              <>
                <p>
                  <strong>타입1:</strong> {viewingItem.speaker_type1 || '-'}
                </p>
                <p>
                  <strong>타입2:</strong> {viewingItem.speaker_type2 || '-'}
                </p>
              </>
            ) : null}
            {isDacAmp ? (
              <>
                <p>
                  <strong>앰프 타입:</strong> {viewingItem.amp_type || '-'}
                </p>
                <p>
                  <strong>Chipset:</strong> {viewingItem.chipset || '-'}
                </p>
                <p>
                  <strong>출력 임피던스 (Rk):</strong>{' '}
                  {viewingItem.output_impedance != null &&
                  Number.isFinite(Number(viewingItem.output_impedance))
                    ? `${viewingItem.output_impedance} Ω`
                    : '-'}
                </p>
                <p>
                  <strong>Vrms (BAL):</strong> {formatVrmsAt32Ohm(viewingItem.vrms_bal) || '-'}
                </p>
                <p className="col-span-2">
                  <strong>Vrms (Single):</strong> {formatVrmsAt32Ohm(viewingItem.vrms_single) || '-'}
                </p>
              </>
            ) : null}
            {isDap ? (
              <>
                <p className="col-span-2">
                  <strong>스펙:</strong> {viewingItem.dap_spec || '-'}
                </p>
                <p>
                  <strong>Chipset:</strong> {viewingItem.chipset || '-'}
                </p>
                <p>
                  <strong>출력:</strong> {viewingItem.dap_output || '-'}
                </p>
              </>
            ) : null}
            {(isDacAmp || isDap || isSourceOrEtc) && viewingItem.accessory?.trim() ? (
              <p className="col-span-2">
                <strong>액세서리:</strong> {viewingItem.accessory.trim()}
                {Number(viewingItem.accessory_price) > 0
                  ? ` (${Number(viewingItem.accessory_price).toLocaleString()}원)`
                  : ''}
              </p>
            ) : null}
            {(isWired || isWireless || isSpeaker || isDacAmp || isDap || isSourceOrEtc) &&
            viewingItem.etc?.trim() ? (
              <p className="col-span-2"><strong>기타:</strong> {viewingItem.etc.trim()}</p>
            ) : null}
            {(isWired || isWireless || isSpeaker || isDacAmp || isDap || isSourceOrEtc) ? (
              viewingItem.memo ? (
                <div className="col-span-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <strong className="block mb-2">특징</strong>
                  <p
                    className="p-4 rounded-xl whitespace-pre-wrap leading-relaxed text-sm opacity-90"
                    style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                  >
                    {viewingItem.memo}
                  </p>
                </div>
              ) : (
                <p className="col-span-2"><strong>특징:</strong> -</p>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      {(isDacAmp || isDap) ? (
        <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <strong className="block mb-2 flex items-center">
            <Headphones className="size-4 opacity-80 shrink-0 mr-1.5" /> 매칭 모델
          </strong>
          {matchedHeadphones.length === 0 ? (
            <p className="text-sm opacity-70 py-2">이 기기를 매칭으로 선택한 헤드폰이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {matchedHeadphones.map((h) => (
                <Link
                  key={h.id}
                  href={`/headfi?view=${h.id}`}
                  className="flex items-center gap-3 rounded-xl p-3 transition-opacity hover:opacity-90"
                  style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                >
                  {h.image_url ? (
                    <img
                      src={h.image_url}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                      style={{ border: '1px solid var(--border)' }}
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                    >
                      <Headphones className="size-4 opacity-40" strokeWidth={1.5} aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] opacity-70">{h.brand}</p>
                    <p className="truncate text-sm font-semibold">{h.model}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
