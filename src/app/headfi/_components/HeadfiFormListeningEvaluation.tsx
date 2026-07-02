'use client';

import type { HeadfiFormSectionProps } from './headfiFormTypes';

export function HeadfiFormListeningEvaluation({ formData, setFormData }: HeadfiFormSectionProps) {
  return (
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
  );
}
