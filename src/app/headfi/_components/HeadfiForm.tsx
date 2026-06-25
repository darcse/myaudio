'use client';

import { SavingLabel } from '@/components/AsyncMutationUi';
import type { SelectedHeadfi } from '../types';

type FormData = {
  brand: string;
  model: string;
  category: string;
  type1: string;
  type2: string;
  impedance: string;
  db1: string;
  db2: string;
  volume: string;
  volume_type: string;
  purchase_date: string;
  price: string;
  status1: string;
  status2: string;
  cable: string;
  cable_price: string;
  eartip: string;
  eartip_price: string;
  unit: string;
  etc: string;
  speaker_type1: string;
  speaker_type2: string;
  dap_spec: string;
  dap_output: string;
  matching: string;
  gain: string;
  temp: string;
  bright: string;
  bass_quantity: string;
  bass_depth: string;
  bass_speed: string;
  dynamics_slam: string;
  midrange_body: string;
  tone_warmth: string;
  vocal_position: string;
  midrange_clarity: string;
  treble_brightness: string;
  treble_smoothness: string;
  treble_airiness: string;
  resolution: string;
  separation: string;
  soundstage: string;
  imaging: string;
  timbre: string;
  memo: string;
  image_url: string;
  fr_graph_url: string;
  amp_type: string;
  output_impedance: string;
  chipset: string;
  vrms_bal: string;
  vrms_single: string;
};

type HeadfiFormProps = {
  selectedItem: SelectedHeadfi;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  dacAmpList: { id: number; brand: string; model: string }[];
  wirelessMatchingList: { id: number; brand: string; model: string }[];
  onClose: () => void;
  onSave: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFrGraphFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSaving?: boolean;
};

const inputBaseClass = 'input-apple px-3 py-2 w-full h-[42px]';
const disabledClass = 'opacity-60 cursor-not-allowed';

export function HeadfiForm({ selectedItem, formData, setFormData, dacAmpList, wirelessMatchingList, onClose, onSave, onImageUpload, onFrGraphFileChange, isSaving = false }: HeadfiFormProps) {
  const cat = formData.category;
  const hasCategory = cat !== '';
  const isWired = cat === '헤드폰' || cat === '이어폰';
  const isWireless = cat === '무선 헤드폰' || cat === '무선 이어폰';
  const isSpeaker = cat === '스피커';
  const isDacAmp = cat === 'DAC/AMP';
  const isDap = cat === 'DAP';
  const isSourceOrEtc = cat === 'Source' || cat === '기타';
  const isHeadphone = cat === '헤드폰';
  const isEarphone = cat === '이어폰';
  const isEarphoneType = isEarphone || cat === '무선 이어폰';

  const dacAmpIds = dacAmpList.map((d) => String(d.id));
  const wirelessMatchingIds = wirelessMatchingList.map((d) => String(d.id));
  const isMatchingCustom = isWired && !dacAmpIds.includes(formData.matching) && formData.matching !== '' && formData.matching !== ' ';
  const matchingSelectVal = isWired
    ? dacAmpIds.includes(formData.matching)
      ? formData.matching
      : isMatchingCustom
        ? '__custom__'
        : ''
    : formData.matching;
  const wirelessMatchingSelectVal = wirelessMatchingIds.includes(formData.matching)
    ? formData.matching
    : '';

  const renderInput = (label: string, field: keyof FormData, type: string = 'text', isActive: boolean = true) => (
    <div>
      <label className="block text-sm font-semibold mb-1 opacity-90">{label}</label>
      <input
        type={type}
        className={`${inputBaseClass} ${!isActive ? disabledClass : ''}`}
        value={formData[field]}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
        disabled={!isActive}
        placeholder={!isActive ? '해당 없음' : ''}
      />
    </div>
  );

  const purchaseStatusRow = (
    <>
      {renderInput('구입일', 'purchase_date', 'date')}
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">보유 상태</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.status2} onChange={(e) => setFormData({ ...formData, status2: e.target.value })}>
          <option value="">선택</option>
          <option value="보유중">보유중</option>
          <option value="방출">방출</option>
        </select>
      </div>
    </>
  );

  const priceStatusRow = (
    <>
      {renderInput('구매가', 'price', 'number')}
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">구매 형태</label>
        <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.status1} onChange={(e) => setFormData({ ...formData, status1: e.target.value })}>
          <option value="">선택</option>
          <option value="신품">신품</option>
          <option value="미개봉">미개봉</option>
          <option value="중고">중고</option>
          <option value="중고2차">중고2차</option>
          <option value="중고3차">중고3차</option>
          <option value="반품 최상">반품 최상</option>
          <option value="반품 상">반품 상</option>
        </select>
      </div>
    </>
  );

  const memoField = (
    <div className="col-span-2">
      <label className="block text-sm font-semibold mb-1 opacity-90">특징</label>
      <textarea className="input-apple px-3 py-2 w-full rounded-xl min-h-[80px]" rows={3} value={formData.memo} onChange={(e) => setFormData({ ...formData, memo: e.target.value })} />
    </div>
  );

  return (
    <div className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel-apple max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title text-xl">{'id' in selectedItem && selectedItem.id ? '✏️ 기기 정보 수정' : '➕ 신규 기기 등록'}</h2>
          <button type="button" className="text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {renderInput('브랜드', 'brand')}
          {renderInput('모델명', 'model')}
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">기기 이미지 (URL 또는 직접 업로드)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" placeholder="이미지 URL" className={`${inputBaseClass} flex-1`} value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
              <input type="file" accept="image/*" onChange={onImageUpload} className="input-apple p-2 w-full sm:w-64 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:opacity-90" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">카테고리</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
              <option value="">선택</option>
              {['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰', '스피커', 'DAC/AMP', 'DAP', 'Source', '기타'].map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>{categoryOption}</option>
              ))}
            </select>
          </div>
          {hasCategory && isWired && (
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
                  {renderInput('임피던스 (Ω)', 'impedance', 'number')}
                </div>
                {renderInput('db SPL/V', 'db1', 'number')}
                {renderInput('db/mW', 'db2', 'number')}
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
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') setFormData({ ...formData, matching: '' });
                        else if (v === '__custom__') setFormData({ ...formData, matching: ' ' });
                        else setFormData({ ...formData, matching: v });
                      }}
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
                      className={inputBaseClass}
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
                    className={inputBaseClass}
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
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') setFormData({ ...formData, matching: '' });
                        else if (v === '__custom__') setFormData({ ...formData, matching: ' ' });
                        else setFormData({ ...formData, matching: v });
                      }}
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
                        className={`${inputBaseClass} mt-2`}
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
                      className={inputBaseClass}
                      placeholder="예: Low, High"
                      value={formData.gain}
                      onChange={(e) => setFormData({ ...formData, gain: e.target.value })}
                    />
                  </div>
                </>
              ) : null}
              {renderInput('케이블', 'cable', 'text')}
              {renderInput('케이블 가격', 'cable_price', 'number')}
              {isWired ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1 opacity-90">
                      {isHeadphone ? '이어패드' : '이어팁'}
                    </label>
                    <input
                      type="text"
                      className={inputBaseClass}
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
                      className={inputBaseClass}
                      placeholder="가격"
                      value={formData.eartip_price}
                      onChange={(e) => setFormData({ ...formData, eartip_price: e.target.value })}
                    />
                  </div>
                </>
              ) : null}
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">유닛</label>
                <input
                  type="text"
                  className={inputBaseClass}
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="유닛 (예: 1DD, 2BA+1DD)"
                />
              </div>
              {renderInput('기타', 'etc')}
              {purchaseStatusRow}
              {priceStatusRow}
            <div className="col-span-2">
              <div className="border-t pt-4 mt-2" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold opacity-90 mb-3">청음 평가 (1~10, 선택)</h3>

                <p className="text-xs opacity-60 mb-2 mt-3">저역 (Bass)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="전체적인 저역 양감. 서브베이스부터 미드베이스까지의 총량.">Bass Quantity</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.bass_quantity} onChange={(e) => setFormData({ ...formData, bass_quantity: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="서브베이스의 극저역 확장성. 낮은 주파수가 얼마나 깊이 뻗어 내려가는가.">Bass Depth</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.bass_depth} onChange={(e) => setFormData({ ...formData, bass_depth: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="저역의 통제력과 반응 속도. 베이스가 얼마나 단단하고 빠르게 치고 빠지는가.">Bass Speed &amp; Decay</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.bass_speed} onChange={(e) => setFormData({ ...formData, bass_speed: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="소리가 터져 나올 때의 물리적인 타격감과 음량의 극적인 에너지 대비.">Dynamics &amp; Slam</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.dynamics_slam} onChange={(e) => setFormData({ ...formData, dynamics_slam: e.target.value })} placeholder="-" />
                  </div>
                </div>

                <p className="text-xs opacity-60 mb-2 mt-3">중역 및 톤 (Midrange &amp; Tone)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="중역의 뼈대와 두께감. 악기와 보컬의 물리적인 무게감과 묵직함.">Midrange Body</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.midrange_body} onChange={(e) => setFormData({ ...formData, midrange_body: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="전체적인 소리의 온도감. 선의 두께와 독립적인 아날로그적 온기.">Tone / Warmth</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.tone_warmth} onChange={(e) => setFormData({ ...formData, tone_warmth: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="보컬의 전후 위치. 가수가 청자에게 얼마나 가깝게 다가와 있는가.">Vocal Position</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.vocal_position} onChange={(e) => setFormData({ ...formData, vocal_position: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="중역의 선명도. 보컬과 메인 악기의 디테일이 얼마나 또렷하게 들리는가.">Midrange Clarity</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.midrange_clarity} onChange={(e) => setFormData({ ...formData, midrange_clarity: e.target.value })} placeholder="-" />
                  </div>
                </div>

                <p className="text-xs opacity-60 mb-2 mt-3">고역 (Treble)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="고역의 밝기와 에너지. 심벌, 하이햇, 현악기 고음부의 전반적인 존재감.">Treble Brightness</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.treble_brightness} onChange={(e) => setFormData({ ...formData, treble_brightness: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="고역의 질감과 제어력. 쏘는 소리 없이 얼마나 매끄럽게 튜닝되었는가.">Treble Smoothness</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.treble_smoothness} onChange={(e) => setFormData({ ...formData, treble_smoothness: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="초고역의 확장성. 음악 주변을 감도는 공기감과 탁 트인 헤드룸.">Treble Airiness</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.treble_airiness} onChange={(e) => setFormData({ ...formData, treble_airiness: e.target.value })} placeholder="-" />
                  </div>
                  <div />
                </div>

                <p className="text-xs opacity-60 mb-2 mt-3">기술 및 공간 (Technical &amp; Space)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="전 대역에 걸친 정보량과 해상도. 미세한 뉘앙스를 얼마나 잘 분리해 내는가.">Resolution</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.resolution} onChange={(e) => setFormData({ ...formData, resolution: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="악기와 악기 사이의 분리도. 복잡한 패시지에서 각 소스들을 구별할 수 있는가.">Separation</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.separation} onChange={(e) => setFormData({ ...formData, separation: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="공간의 물리적 크기. 좌우 넓이와 전후 깊이가 만들어내는 가상의 무대 크기.">Soundstage</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.soundstage} onChange={(e) => setFormData({ ...formData, soundstage: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="공간 내의 정위감. 개별 악기가 정확히 어디에 위치하는지 맺히는 능력.">Imaging</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.imaging} onChange={(e) => setFormData({ ...formData, imaging: e.target.value })} placeholder="-" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs opacity-80 truncate flex-1" title="소리의 자연스러움. 배음 구조가 실제 악기나 목소리에 얼마나 가깝게 재현되는가.">Timbre</label>
                    <input type="number" min="1" max="10" className="input-apple text-center w-16 h-8 px-2 text-sm flex-shrink-0" value={formData.timbre} onChange={(e) => setFormData({ ...formData, timbre: e.target.value })} placeholder="-" />
                  </div>
                  <div />
                </div>
              </div>
            </div>
              <div className="col-span-2 p-4 rounded-xl space-y-3" style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}>
                <div>
                  <label className="block text-sm font-semibold mb-1 opacity-90">FR 그래프 (주파수 응답)</label>
                  <p className="text-[11px] opacity-65 mb-2">
                    측정 그래프 이미지를 업로드하거나, 이미 호스팅된 이미지 URL을 붙여 넣으세요.
                  </p>
                  <input
                    type="url"
                    placeholder="https://… (외부 이미지 직접 링크)"
                    className={`${inputBaseClass} w-full`}
                    value={formData.fr_graph_url}
                    onChange={(e) => setFormData({ ...formData, fr_graph_url: e.target.value })}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                  {onFrGraphFileChange ? (
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={onFrGraphFileChange}
                      className="input-apple p-2 w-full sm:w-auto file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:opacity-90"
                    />
                  ) : null}
                  {formData.fr_graph_url ? (
                    <button
                      type="button"
                      className="text-xs font-medium opacity-80 hover:opacity-100 underline py-2"
                      onClick={() => setFormData({ ...formData, fr_graph_url: '' })}
                    >
                      FR 그래프 URL/업로드 지우기
                    </button>
                  ) : null}
                </div>
              </div>
              {memoField}
            </>
          )}
          {hasCategory && isWireless && (
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
                  {cat === '무선 이어폰' ? (
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
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1 opacity-90">매칭</label>
                <select
                  className="select-apple px-3 py-2 w-full h-[42px]"
                  value={wirelessMatchingSelectVal}
                  onChange={(e) => setFormData({ ...formData, matching: e.target.value })}
                >
                  <option value="">선택 안 함</option>
                  {wirelessMatchingList.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.brand} {d.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">유닛</label>
                <input
                  type="text"
                  className={inputBaseClass}
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="유닛 (예: 1DD, 2BA+1DD)"
                />
              </div>
              {renderInput('기타', 'etc')}
              {purchaseStatusRow}
              {priceStatusRow}
              {memoField}
            </>
          )}
          {hasCategory && isSpeaker && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">타입1</label>
                <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.speaker_type1} onChange={(e) => setFormData({ ...formData, speaker_type1: e.target.value })}>
                  <option value="">선택</option>
                  <option value="액티브">액티브</option>
                  <option value="패시브">패시브</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">타입2</label>
                <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.speaker_type2} onChange={(e) => setFormData({ ...formData, speaker_type2: e.target.value })}>
                  <option value="">선택</option>
                  <option value="북쉘프">북쉘프</option>
                  <option value="스탠딩">스탠딩</option>
                  <option value="사운드바">사운드바</option>
                  <option value="블루투스">블루투스</option>
                  <option value="스마트">스마트</option>
                </select>
              </div>
              <div className="col-span-2">{renderInput('기타', 'etc')}</div>
              {purchaseStatusRow}
              {priceStatusRow}
              {memoField}
            </>
          )}
          {hasCategory && isDacAmp && (
            <>
              {renderInput('앰프 타입', 'amp_type')}
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">Chipset</label>
                <input
                  type="text"
                  className={inputBaseClass}
                  value={formData.chipset}
                  onChange={(e) => setFormData({ ...formData, chipset: e.target.value })}
                />
              </div>
              {renderInput('출력 임피던스 (Rk Ω)', 'output_impedance', 'number')}
              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <label className="block text-sm font-semibold mb-1 opacity-90">Vrms (BAL)</label>
                  <input
                    type="number"
                    step="any"
                    className={inputBaseClass}
                    placeholder="32Ω 기준 (예: 15.5)"
                    value={formData.vrms_bal}
                    onChange={(e) => setFormData({ ...formData, vrms_bal: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 opacity-90">Vrms (Single)</label>
                  <input
                    type="number"
                    step="any"
                    className={inputBaseClass}
                    placeholder="32Ω 기준 (예: 12)"
                    value={formData.vrms_single}
                    onChange={(e) => setFormData({ ...formData, vrms_single: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-span-2">{renderInput('기타', 'etc')}</div>
              {purchaseStatusRow}
              {priceStatusRow}
              {memoField}
            </>
          )}
          {hasCategory && isDap && (
            <>
              <div className="col-span-2">{renderInput('스펙', 'dap_spec')}</div>
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">Chipset</label>
                <input
                  type="text"
                  className={inputBaseClass}
                  value={formData.chipset}
                  onChange={(e) => setFormData({ ...formData, chipset: e.target.value })}
                />
              </div>
              {renderInput('출력', 'dap_output')}
              <div className="col-span-2">{renderInput('기타', 'etc')}</div>
              {purchaseStatusRow}
              {priceStatusRow}
              {memoField}
            </>
          )}
          {hasCategory && isSourceOrEtc && (
            <>
              <div className="col-span-2">{renderInput('기타', 'etc')}</div>
              {purchaseStatusRow}
              {priceStatusRow}
              {memoField}
            </>
          )}
        </div>
        <button
          type="button"
          className="btn-apple btn-apple-primary p-4 mt-8 w-full text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
          onClick={onSave}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? (
            <SavingLabel />
          ) : 'id' in selectedItem && selectedItem.id ? (
            '수정 내용 저장하기'
          ) : (
            '라이브러리에 최종 등록'
          )}
        </button>
      </div>
    </div>
  );
}
