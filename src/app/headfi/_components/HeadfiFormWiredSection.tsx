'use client';

import type { ChangeEvent } from 'react';
import { HeadfiFormFrGraphSection } from './HeadfiFormFrGraphSection';
import { HeadfiFormListeningEvaluation } from './HeadfiFormListeningEvaluation';
import {
  HeadfiFormMemoField,
  HeadfiFormPriceStatusRow,
  HeadfiFormPurchaseStatusRow,
  HeadfiFormTextInput,
} from './HeadfiFormSharedFields';
import type { HeadfiFormSectionProps } from './headfiFormTypes';
import { getHeadfiFormCategoryFlags, getWiredMatchingSelectValue, INPUT_BASE_CLASS } from './headfiFormUtils';

type HeadfiFormWiredSectionProps = HeadfiFormSectionProps & {
  dacAmpList: { id: number; brand: string; model: string }[];
  onFrGraphFileChange?: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function HeadfiFormWiredSection({
  formData,
  setFormData,
  dacAmpList,
  onFrGraphFileChange,
}: HeadfiFormWiredSectionProps) {
  const { cat, isHeadphone, isEarphone, isEarphoneType } = getHeadfiFormCategoryFlags(formData.category);
  const dacAmpIds = dacAmpList.map((d) => String(d.id));
  const { matchingSelectVal } = getWiredMatchingSelectValue(formData, dacAmpIds);

  const handleMatchingChange = (value: string) => {
    if (value === '') setFormData({ ...formData, matching: '' });
    else if (value === '__custom__') setFormData({ ...formData, matching: ' ' });
    else setFormData({ ...formData, matching: value });
  };

  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">타입1</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.type1} onChange={(e) => setFormData({ ...formData, type1: e.target.value })}>
          <option value="">선택</option>
          {isEarphoneType ? (
            <>
              <option value="오픈형">오픈형</option>
              <option value="세미 오픈">세미 오픈</option>
              <option value="커널형">커널형</option>
            </>
          ) : (
            <>
              <option value="오픈형">오픈형</option>
              <option value="밀폐형">밀폐형</option>
            </>
          )}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">타입2</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.type2} onChange={(e) => setFormData({ ...formData, type2: e.target.value })}>
          <option value="">선택</option>
          {cat === '이어폰' ? (
            <>
              <option value="Over-ear">Over-ear</option>
              <option value="Under-ear">Under-ear</option>
            </>
          ) : (
            <>
              <option value="다이내믹">다이내믹</option>
              <option value="평판형">평판형</option>
              <option value="정전형">정전형</option>
              <option value="기타">기타</option>
            </>
          )}
        </select>
      </div>
      <div className="col-span-2 grid grid-cols-4 gap-x-6">
        <div className="col-span-2">
          <HeadfiFormTextInput label="임피던스 (Ω)" field="impedance" type="number" formData={formData} setFormData={setFormData} />
        </div>
        <HeadfiFormTextInput label="db SPL/V" field="db1" type="number" formData={formData} setFormData={setFormData} />
        <HeadfiFormTextInput label="db/mW" field="db2" type="number" formData={formData} setFormData={setFormData} />
      </div>
      {isHeadphone ? (
        <div className="col-span-2 grid grid-cols-4 gap-x-6">
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">볼륨 구동력</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.volume} onChange={(e) => setFormData({ ...formData, volume: e.target.value })}>
              <option value="">선택</option>
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">구동 타입</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.volume_type} onChange={(e) => setFormData({ ...formData, volume_type: e.target.value })}>
              <option value="">선택</option>
              <option value="전압형">전압형</option>
              <option value="전류형">전류형</option>
              <option value="혼합형">혼합형</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">온도</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.temp} onChange={(e) => setFormData({ ...formData, temp: e.target.value })}>
              <option value="">선택</option>
              <option value="매우 따뜻함">매우 따뜻함</option>
              <option value="따뜻함">따뜻함</option>
              <option value="조금 따뜻함">조금 따뜻함</option>
              <option value="중립">중립</option>
              <option value="조금 차가움">조금 차가움</option>
              <option value="차가움">차가움</option>
              <option value="매우 차가움">매우 차가움</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">밝기</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.bright} onChange={(e) => setFormData({ ...formData, bright: e.target.value })}>
              <option value="">선택</option>
              <option value="매우 밝음">매우 밝음</option>
              <option value="밝음">밝음</option>
              <option value="조금 밝음">조금 밝음</option>
              <option value="중립">중립</option>
              <option value="조금 어두움">조금 어두움</option>
              <option value="어두움">어두움</option>
              <option value="매우 어두움">매우 어두움</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="col-span-2 grid grid-cols-4 gap-x-6">
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">온도</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.temp} onChange={(e) => setFormData({ ...formData, temp: e.target.value })}>
              <option value="">선택</option>
              <option value="매우 따뜻함">매우 따뜻함</option>
              <option value="따뜻함">따뜻함</option>
              <option value="조금 따뜻함">조금 따뜻함</option>
              <option value="중립">중립</option>
              <option value="조금 차가움">조금 차가움</option>
              <option value="차가움">차가움</option>
              <option value="매우 차가움">매우 차가움</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">밝기</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.bright} onChange={(e) => setFormData({ ...formData, bright: e.target.value })}>
              <option value="">선택</option>
              <option value="매우 밝음">매우 밝음</option>
              <option value="밝음">밝음</option>
              <option value="조금 밝음">조금 밝음</option>
              <option value="중립">중립</option>
              <option value="조금 어두움">조금 어두움</option>
              <option value="어두움">어두움</option>
              <option value="매우 어두움">매우 어두움</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">매칭 (DAC/AMP/DAP)</label>
            <select
              className="select-apple px-3 py-2 w-full h-[42px]"
              value={matchingSelectVal}
              onChange={(e) => handleMatchingChange(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {dacAmpList.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.brand} {d.model}</option>
              ))}
              <option value="__custom__">기타 (직접 입력)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">Gain</label>
            <input
              type="text"
              className={INPUT_BASE_CLASS}
              placeholder="예: Low, High"
              value={formData.gain}
              onChange={(e) => setFormData({ ...formData, gain: e.target.value })}
            />
          </div>
        </div>
      )}
      {isEarphone && matchingSelectVal === '__custom__' ? (
        <div className="col-span-2">
          <input
            type="text"
            className={INPUT_BASE_CLASS}
            placeholder="매칭 직접 입력"
            value={formData.matching === ' ' ? '' : formData.matching}
            onChange={(e) => setFormData({ ...formData, matching: e.target.value || ' ' })}
          />
        </div>
      ) : null}
      {isHeadphone ? (
        <>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">매칭 (DAC/AMP/DAP)</label>
            <select
              className="select-apple px-3 py-2 w-full h-[42px]"
              value={matchingSelectVal}
              onChange={(e) => handleMatchingChange(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {dacAmpList.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.brand} {d.model}</option>
              ))}
              <option value="__custom__">기타 (직접 입력)</option>
            </select>
            {matchingSelectVal === '__custom__' && (
              <input
                type="text"
                className={`${INPUT_BASE_CLASS} mt-2`}
                placeholder="매칭 직접 입력"
                value={formData.matching === ' ' ? '' : formData.matching}
                onChange={(e) => setFormData({ ...formData, matching: e.target.value || ' ' })}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">Gain</label>
            <input
              type="text"
              className={INPUT_BASE_CLASS}
              placeholder="예: Low, High"
              value={formData.gain}
              onChange={(e) => setFormData({ ...formData, gain: e.target.value })}
            />
          </div>
        </>
      ) : null}
      <HeadfiFormTextInput label="케이블" field="cable" formData={formData} setFormData={setFormData} />
      <HeadfiFormTextInput label="케이블 가격" field="cable_price" type="number" formData={formData} setFormData={setFormData} />
      <>
        <div>
          <label className="block text-sm font-semibold mb-1 opacity-90">
            {isHeadphone ? '이어패드' : '이어팁'}
          </label>
          <input
            type="text"
            className={INPUT_BASE_CLASS}
            placeholder={isHeadphone ? '이어패드 (예: Dekoni Choice Suede)' : '이어팁 (예: SpinFit CP145)'}
            value={formData.eartip}
            onChange={(e) => setFormData({ ...formData, eartip: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 opacity-90">
            {isHeadphone ? '이어패드 가격' : '이어팁 가격'}
          </label>
          <input
            type="number"
            className={INPUT_BASE_CLASS}
            placeholder="가격"
            value={formData.eartip_price}
            onChange={(e) => setFormData({ ...formData, eartip_price: e.target.value })}
          />
        </div>
      </>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">유닛</label>
        <input
          type="text"
          className={INPUT_BASE_CLASS}
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          placeholder="유닛 (예: 1DD, 2BA+1DD)"
        />
      </div>
      <HeadfiFormTextInput label="기타" field="etc" formData={formData} setFormData={setFormData} />
      <HeadfiFormPurchaseStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormPriceStatusRow formData={formData} setFormData={setFormData} />
      <HeadfiFormListeningEvaluation formData={formData} setFormData={setFormData} />
      <HeadfiFormFrGraphSection formData={formData} setFormData={setFormData} onFrGraphFileChange={onFrGraphFileChange} />
      <HeadfiFormMemoField formData={formData} setFormData={setFormData} />
    </>
  );
}
