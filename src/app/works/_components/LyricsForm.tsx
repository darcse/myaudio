'use client';

import { SavingLabel } from '@/components/AsyncMutationUi';
import { genre1Options } from '../constants';
import type { SelectedLyrics } from '../types';

type FormData = {
  title: string;
  album: string;
  genre1: string;
  genre2: string;
  lyrics: string;
  cover_image_url: string;
  audio_url: string;
  youtube_url: string;
};

type LyricsFormProps = {
  selectedItem: SelectedLyrics;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onClose: () => void;
  onSave: () => void;
  isSaving?: boolean;
  coverFile: File | null;
  setCoverFile: (f: File | null) => void;
  audioFile: File | null;
  setAudioFile: (f: File | null) => void;
};

const inputBaseClass = 'input-apple px-3 py-2 w-full h-[42px]';

export function LyricsForm({
  selectedItem,
  formData,
  setFormData,
  onClose,
  onSave,
  isSaving = false,
  coverFile,
  setCoverFile,
  audioFile,
  setAudioFile,
}: LyricsFormProps) {
  const isEdit = 'id' in selectedItem && selectedItem.id;
  const legacyGenre1 =
    formData.genre1 && !(genre1Options as readonly string[]).includes(formData.genre1)
      ? formData.genre1
      : null;

  return (
    <div className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel-apple max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title text-xl">{isEdit ? '✏️ 가사 수정' : '➕ 가사 등록'}</h2>
          <button type="button" className="text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">제목 *</label>
            <input
              type="text"
              className={inputBaseClass}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="곡 제목"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">앨범명 *</label>
            <input
              type="text"
              className={inputBaseClass}
              value={formData.album}
              onChange={(e) => setFormData({ ...formData, album: e.target.value })}
              placeholder="앨범명"
              required
              aria-required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">장르1</label>
            <select
              className="select-apple px-3 py-2 w-full h-[42px]"
              value={formData.genre1}
              onChange={(e) => setFormData({ ...formData, genre1: e.target.value })}
            >
              <option value="">선택</option>
              {legacyGenre1 ? (
                <option value={legacyGenre1}>{legacyGenre1} (기존 값)</option>
              ) : null}
              {genre1Options.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">genre2</label>
            <input
              type="text"
              className={inputBaseClass}
              value={formData.genre2}
              onChange={(e) => setFormData({ ...formData, genre2: e.target.value })}
              placeholder="세부 장르"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">커버 이미지 (URL 또는 업로드)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="이미지 URL"
                className={`${inputBaseClass} flex-1`}
                value={formData.cover_image_url}
                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setCoverFile(f);
                }}
                className="input-apple p-2 w-full sm:w-64 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:opacity-90"
              />
            </div>
            {coverFile ? <p className="text-xs opacity-70 mt-1">선택됨: {coverFile.name}</p> : null}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">오디오 (mp3 / wav / flac 업로드 또는 URL)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="오디오 파일 URL"
                className={`${inputBaseClass} flex-1`}
                value={formData.audio_url}
                onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
              />
              <input
                type="file"
                accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac,audio/x-flac"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setAudioFile(f);
                }}
                className="input-apple p-2 w-full sm:w-64 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:opacity-90"
              />
            </div>
            {audioFile ? <p className="text-xs opacity-70 mt-1">선택됨: {audioFile.name}</p> : null}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">가사 (Markdown)</label>
            <textarea
              className="input-apple px-3 py-2 w-full rounded-xl min-h-[200px] font-mono text-sm"
              rows={12}
              value={formData.lyrics}
              onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
              placeholder="마크다운으로 가사를 입력하세요."
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">YouTube URL</label>
            <input
              type="text"
              className={inputBaseClass}
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </div>
        <button
          type="button"
          className="btn-apple btn-apple-primary p-4 mt-8 w-full text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
          onClick={onSave}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? <SavingLabel /> : isEdit ? '수정 내용 저장하기' : '라이브러리에 등록'}
        </button>
      </div>
    </div>
  );
}
