'use client';

import { DeletingLabel, SavingLabel } from '@/components/AsyncMutationUi';
import { countryOptions, genreOptions } from '../constants';
import type { AlbumFormData, SelectedAlbum } from '../types';

interface AlbumFormProps {
  selectedItem: SelectedAlbum;
  formData: AlbumFormData;
  setFormData: React.Dispatch<React.SetStateAction<AlbumFormData>>;
  headfiOwnedHeadphones: { id: number; brand: string; model: string }[];
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

const inputBaseClass = 'input-apple px-3 py-2 w-full h-[42px]';
const readonlyClass = 'opacity-60 cursor-not-allowed';

export function AlbumForm({
  selectedItem,
  formData,
  setFormData,
  headfiOwnedHeadphones,
  onClose,
  onSave,
  onDelete,
  onImageUpload,
  isSaving = false,
  isDeleting = false,
}: AlbumFormProps) {
  const isEdit = 'id' in selectedItem && typeof selectedItem.id === 'number';
  const releaseDateReadOnly =
    !isEdit && !('isManual' in selectedItem)
      ? !!(selectedItem as Record<string, unknown>)?.release_date
      : false;
  const isAllTime = formData.year.includes('All Time');

  const renderInput = (label: string, field: keyof AlbumFormData, apiField?: string, type: string = 'text') => {
    const isReadOnly =
      apiField && !isEdit && !('isManual' in selectedItem)
        ? !!(selectedItem as Record<string, unknown>)?.[apiField]
        : false;
    if (field === 'cover_image_url') return null;
    return (
      <div className={label === '앨범명' || label === '타이틀곡 URL' ? 'col-span-2' : ''}>
        <label className="block text-sm font-semibold mb-1 opacity-90">{label}</label>
        <input
          type={type}
          className={`${inputBaseClass} ${isReadOnly ? readonlyClass : ''}`}
          value={String(formData[field] ?? '')}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          readOnly={isReadOnly}
        />
      </div>
    );
  };

  return (
    <div className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel-apple max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title text-xl">{isEdit ? '✏️ 앨범 정보 수정' : '➕ 신규 앨범 등록'}</h2>
          <button type="button" className="text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {renderInput('앨범명', 'album_name', 'album_name')}
          {renderInput('아티스트', 'artist', 'artist')}
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">아티스트 구분</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.artist_type} onChange={(e) => setFormData({ ...formData, artist_type: e.target.value })}>
              <option value="">선택</option>
              <option value="솔로">솔로</option>
              <option value="아이돌">아이돌</option>
              <option value="밴드">밴드</option>
              <option value="그룹">그룹</option>
              <option value="기타">기타</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">국가</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })}>
              <option value="">선택</option>
              {countryOptions.map((c) => (
                <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">앨범 타입</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.album_type} onChange={(e) => setFormData({ ...formData, album_type: e.target.value })}>
              <option value="">선택</option>
              <option value="Album">정규 (Album)</option>
              <option value="EP">EP</option>
              <option value="Single">싱글 (Single)</option>
              <option value="Compilation">컴필레이션</option>
              <option value="OST">OST</option>
              <option value="Live">라이브</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">앨범 커버 (URL 또는 직접 업로드)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="이미지 URL"
                className={`${inputBaseClass} flex-1 ${'cover_image_url' in selectedItem && selectedItem.cover_image_url && !isEdit && !('isManual' in selectedItem) ? readonlyClass : ''}`}
                value={formData.cover_image_url}
                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                readOnly={!!('cover_image_url' in selectedItem && selectedItem.cover_image_url && !isEdit && !('isManual' in selectedItem))}
              />
              {(!('cover_image_url' in selectedItem && selectedItem.cover_image_url) || isEdit || ('isManual' in selectedItem)) && (
                <input type="file" accept="image/*" onChange={onImageUpload} className="input-apple p-2 w-full sm:w-64 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:opacity-90" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">발매연도 (YYYY-MM-DD)</label>
            <input
              type="date"
              className={`${inputBaseClass} ${releaseDateReadOnly ? readonlyClass : ''}`}
              value={formData.release_date ?? ''}
              onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
              readOnly={releaseDateReadOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">All time</label>
            <label
              className="inline-flex h-[42px] w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-sm"
              style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
            >
              <input
                type="checkbox"
                className="rounded border shrink-0"
                style={{ accentColor: 'var(--link)' }}
                checked={isAllTime}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    year: e.target.checked ? ['All Time'] : [],
                  });
                }}
              />
              <span>All Time</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">장르</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.genre1} onChange={(e) => setFormData({ ...formData, genre1: e.target.value })}>
              <option value="">선택</option>
              {genreOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          {renderInput('하위 장르 (직접 입력)', 'genre2')}
          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1 opacity-90">타이틀곡 URL (유튜브)</label>
              <input
                type="text"
                className={inputBaseClass}
                value={formData.title_song_url}
                onChange={(e) => setFormData({ ...formData, title_song_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            {renderInput('Wikipedia URL', 'wiki_url')}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">앨범 소개 · 사운드 성향</label>
            <textarea
              className="input-apple px-3 py-2 w-full min-h-[100px] resize-y rounded-xl"
              value={formData.album_intro}
              onChange={(e) => setFormData({ ...formData, album_intro: e.target.value })}
              placeholder="3~4줄 정도로 앨범 소개와 사운드 성향을 적어주세요."
            />
          </div>
          <div className="col-span-2">
            <p className="text-[11px] opacity-60 mb-2">추천 헤드폰은 Head-Fi 라이브러리에서 <strong className="opacity-90">보유중</strong>인 모델만 선택할 수 있어요.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">추천 헤드폰 1순위</label>
                <select
                  className="select-apple px-3 py-2 w-full h-[42px]"
                  value={formData.recommended_hp1}
                  onChange={(e) => setFormData({ ...formData, recommended_hp1: e.target.value })}
                >
                  <option value="">선택 안 함</option>
                  {headfiOwnedHeadphones.map((h) => (
                    <option key={h.id} value={String(h.id)}>
                      {h.brand} {h.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">추천 헤드폰 2순위</label>
                <select
                  className="select-apple px-3 py-2 w-full h-[42px]"
                  value={formData.recommended_hp2}
                  onChange={(e) => setFormData({ ...formData, recommended_hp2: e.target.value })}
                >
                  <option value="">선택 안 함</option>
                  {headfiOwnedHeadphones.map((h) => (
                    <option key={h.id} value={String(h.id)}>
                      {h.brand} {h.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            className="btn-apple btn-apple-primary p-4 w-full text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
            onClick={onSave}
            disabled={isSaving || isDeleting}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <SavingLabel />
            ) : isEdit ? (
              '수정 내용 저장하기'
            ) : (
              '라이브러리에 최종 등록'
            )}
          </button>
          {isEdit && onDelete && (
            <button
              type="button"
              className="btn-apple btn-apple-danger p-4 w-full text-base disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={onDelete}
              disabled={isSaving || isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? <DeletingLabel /> : '앨범 삭제'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
