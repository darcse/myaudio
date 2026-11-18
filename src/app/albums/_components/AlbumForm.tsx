'use client';

import { useEffect, useRef, useState } from 'react';
import { DeletingLabel, SavingLabel } from '@/components/AsyncMutationUi';
import { ReceiverComboSelect } from '@/components/ReceiverComboSelect';
import {
  artistTypeOptionsForCatalog,
  CLASSIC_FORM_OPTIONS,
  formatClassicFormLabel,
  CLASSIC_INSTRUMENT_OPTIONS,
  COMPOSER_ERA_OPTIONS,
  countryOptions,
  genre2OptionsForGenre1,
  genreOptions,
  isClassicFormOption,
  isClassicInstrumentOption,
  isGenre2OptionForGenre1,
} from '../constants';
import type { AlbumFormData, SelectedAlbum } from '../types';
import { parseAppleMusicAlbumInput } from '@/lib/appleMusic';
import { normalizeArtistNameForCompare } from '@/app/artists/utils';
import { parseYoutubePlaylistInput } from '@/lib/youtubePlaylist';
import {
  albumFormModeFromGenre1,
  emptyComposerFormEntry,
  getYoutubeId,
  MAX_ALBUM_COMPOSERS,
  normalizeComposerNameKey,
  normalizeStagePlusUrl,
  primaryComposerFieldsFromEntries,
  type AlbumFormMode,
} from '../utils';
import type { AlbumComposerFormEntry } from '../types';
import { ComposerComboSelect } from './ComposerComboSelect';

type ArtistDefaultsAlbum = {
  artist: string | null;
  artist_type: string | null;
  country: string | null;
};

type AppleMusicImportResponse = {
  artist?: string;
  albumName?: string;
  releaseDate?: string | null;
  coverImageUrl?: string | null;
  albumType?: string;
  appleMusicUrl?: string;
  error?: string;
};

function pickMostCommonValue(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function artistDefaultsFromLibrary(
  albums: ArtistDefaultsAlbum[],
  artistName: string,
): { artist_type: string; country: string } {
  const key = normalizeArtistNameForCompare(artistName).toLocaleLowerCase();
  if (!key) return { artist_type: '', country: '' };
  const matches = albums.filter(
    (album) => normalizeArtistNameForCompare(album.artist ?? '').toLocaleLowerCase() === key,
  );
  return {
    artist_type: pickMostCommonValue(matches.map((album) => album.artist_type ?? '')),
    country: pickMostCommonValue(matches.map((album) => album.country ?? '')),
  };
}

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
  mode?: AlbumFormMode;
  artistDefaultsLibrary?: ArtistDefaultsAlbum[];
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
  mode,
  artistDefaultsLibrary = [],
}: AlbumFormProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [classicFormError, setClassicFormError] = useState(false);
  const [composerDupError, setComposerDupError] = useState(false);
  const [playlistError, setPlaylistError] = useState(false);
  const [appleMusicError, setAppleMusicError] = useState(false);
  const [appleMusicImportError, setAppleMusicImportError] = useState<string | null>(null);
  const [appleMusicImporting, setAppleMusicImporting] = useState(false);
  const [stagePlusError, setStagePlusError] = useState(false);
  const [initialTitleSongUrl, setInitialTitleSongUrl] = useState(() =>
    'title_song_url' in selectedItem && typeof selectedItem.title_song_url === 'string'
      ? selectedItem.title_song_url
      : formData.title_song_url,
  );
  const appleMusicUrlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDeleteConfirmOpen(false);
    setClassicFormError(false);
    setComposerDupError(false);
    setPlaylistError(false);
    setAppleMusicError(false);
    setAppleMusicImportError(null);
    setAppleMusicImporting(false);
    setStagePlusError(false);
    setInitialTitleSongUrl(
      'title_song_url' in selectedItem && typeof selectedItem.title_song_url === 'string'
        ? selectedItem.title_song_url
        : '',
    );
  }, [selectedItem]);
  useEffect(() => {
    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      htmlOverflow: documentElement.style.overflow,
    };
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    documentElement.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      documentElement.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const isEdit = 'id' in selectedItem && typeof selectedItem.id === 'number';
  const resolvedMode: AlbumFormMode =
    mode ?? (isEdit ? albumFormModeFromGenre1(formData.genre1) : 'pop');
  const isClassicMode = resolvedMode === 'classic';
  const popGenreOptions = genreOptions.filter((genre) => genre !== 'Classic');
  const artistTypeOptions = artistTypeOptionsForCatalog(isClassicMode ? 'classic' : 'popular');

  useEffect(() => {
    if (isEdit) return;
    appleMusicUrlInputRef.current?.focus({ preventScroll: true });
  }, [selectedItem, isEdit]);

  const handleAppleMusicImport = async () => {
    if (appleMusicImporting) return;
    setAppleMusicImportError(null);
    const parsed = parseAppleMusicAlbumInput(formData.apple_music_url ?? '');
    if (parsed.status === 'empty') {
      setAppleMusicImportError('Apple Music 주소를 입력해 주세요.');
      return;
    }
    if (parsed.status === 'invalid') {
      setAppleMusicImportError('music.apple.com 앨범 주소를 입력해 주세요.');
      return;
    }
    setAppleMusicImporting(true);
    try {
      const res = await fetch('/api/apple-music-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.apple_music_url }),
      });
      const data = (await res.json().catch(() => null)) as AppleMusicImportResponse | null;
      if (!res.ok || !data || data.error) {
        setAppleMusicImportError(
          data?.error?.trim() ||
            (res.status === 404
              ? '앨범 정보를 찾지 못했습니다.'
              : '앨범 정보를 가져오지 못했습니다.'),
        );
        return;
      }
      if (isEdit) {
        setFormData((prev) => ({
          ...prev,
          release_date: data.releaseDate?.trim() || prev.release_date,
          cover_image_url: data.coverImageUrl?.trim() || prev.cover_image_url,
          apple_music_url: data.appleMusicUrl?.trim() || prev.apple_music_url,
        }));
      } else {
        const importedArtist = data.artist?.trim() ?? '';
        setFormData((prev) => {
          const shared = {
            ...prev,
            album_name: data.albumName?.trim() || prev.album_name,
            release_date: data.releaseDate?.trim() || prev.release_date,
            cover_image_url: data.coverImageUrl?.trim() || prev.cover_image_url,
            apple_music_url: data.appleMusicUrl?.trim() || prev.apple_music_url,
          };
          if (isClassicMode) return shared;
          const existingArtist = prev.artist.trim();
          const nextArtist = existingArtist || importedArtist;
          const defaults = nextArtist
            ? artistDefaultsFromLibrary(artistDefaultsLibrary, nextArtist)
            : { artist_type: '', country: '' };
          return {
            ...shared,
            artist: nextArtist,
            album_type: data.albumType?.trim() || prev.album_type,
            artist_type: prev.artist_type.trim()
              ? prev.artist_type
              : defaults.artist_type || prev.artist_type,
            country: prev.country.trim() ? prev.country : defaults.country || prev.country,
          };
        });
      }
      setAppleMusicError(false);
    } catch {
      setAppleMusicImportError('앨범 정보를 가져오지 못했습니다.');
    } finally {
      setAppleMusicImporting(false);
    }
  };

  useEffect(() => {
    if (!isClassicMode) return;
    if (formData.genre1 === 'Classic') return;
    setFormData((prev) => ({ ...prev, genre1: 'Classic' }));
  }, [formData.genre1, isClassicMode, setFormData]);

  const releaseDateReadOnly =
    !isEdit && !('isManual' in selectedItem)
      ? !!(selectedItem as Record<string, unknown>)?.release_date
      : false;
  const isAllTime = formData.year.includes('All Time');

  const renderInput = (
    label: string,
    field: keyof AlbumFormData,
    apiField?: string,
    type: string = 'text',
    hint?: string,
  ) => {
    const isReadOnly =
      apiField && !isEdit && !('isManual' in selectedItem)
        ? !!(selectedItem as Record<string, unknown>)?.[apiField]
        : false;
    if (field === 'cover_image_url') return null;
    return (
      <div className={label === '타이틀곡 URL' ? 'col-span-2' : ''}>
        <label className="block text-sm font-semibold mb-1 opacity-90">{label}</label>
        <input
          type={type}
          className={`${inputBaseClass} ${isReadOnly ? readonlyClass : ''}`}
          value={String(formData[field] ?? '')}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          readOnly={isReadOnly}
        />
        {hint ? <p className="mt-1 text-[11px] opacity-60">{hint}</p> : null}
      </div>
    );
  };

  const appleMusicField = (
    <div className="min-w-0">
      <label className="block text-sm font-semibold mb-1 opacity-90">애플뮤직 주소</label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          ref={appleMusicUrlInputRef}
          type="text"
          className={`${inputBaseClass} sm:flex-1`}
          value={formData.apple_music_url ?? ''}
          onChange={(e) => {
            setFormData({ ...formData, apple_music_url: e.target.value });
            if (appleMusicError) setAppleMusicError(false);
            if (appleMusicImportError) setAppleMusicImportError(null);
          }}
          placeholder="https://music.apple.com/kr/album/..."
          aria-invalid={appleMusicError || Boolean(appleMusicImportError)}
        />
        <button
          type="button"
          className="btn-apple btn-apple-secondary h-[42px] shrink-0 px-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => void handleAppleMusicImport()}
          disabled={appleMusicImporting || isSaving || isDeleting}
          aria-busy={appleMusicImporting}
        >
          {appleMusicImporting
            ? '가져오는 중…'
            : isEdit
              ? '커버·발매일 가져오기'
              : '앨범 정보 가져오기'}
        </button>
      </div>
      {appleMusicError ? (
        <p className="mt-1 text-[11px]" style={{ color: '#ff3b30' }}>
          music.apple.com 주소를 입력해 주세요.
        </p>
      ) : null}
      {appleMusicImportError ? (
        <p className="mt-1 text-[11px]" style={{ color: '#ff3b30' }}>
          {appleMusicImportError}
        </p>
      ) : null}
    </div>
  );

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
          {!isEdit ? <div className="col-span-2">{appleMusicField}</div> : null}
          <div className="col-span-2">
            {renderInput('앨범명', 'album_name', 'album_name')}
          </div>
          {renderInput(
            '아티스트',
            'artist',
            'artist',
            'text',
            isClassicMode ? '연주자(지휘자/솔리스트)를 입력하세요' : undefined,
          )}
          <div>
            <label className="block text-sm font-semibold mb-1 opacity-90">아티스트 구분</label>
            <select className="select-apple px-3 py-2 w-full h-[42px]" value={formData.artist_type} onChange={(e) => setFormData({ ...formData, artist_type: e.target.value })}>
              <option value="">선택</option>
              {artistTypeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
              {formData.artist_type &&
              !(artistTypeOptions as readonly string[]).includes(formData.artist_type) ? (
                <option value={formData.artist_type}>{formData.artist_type}</option>
              ) : null}
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
              <option value="베스트/스페셜">베스트/스페셜</option>
              <option value="OST">OST</option>
              <option value="Live">라이브</option>
              <option value="리메이크">리메이크</option>
              <option value="리믹스">리믹스</option>
              <option value="플레이리스트">플레이리스트</option>
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
            <label className="block text-sm font-semibold mb-1 opacity-90">발매연도</label>
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
          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1 opacity-90">물리 매체 보유</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label
                className="inline-flex h-[42px] w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
              >
                <input
                  type="checkbox"
                  className="rounded border shrink-0"
                  style={{ accentColor: 'var(--link)' }}
                  checked={formData.owns_cd}
                  onChange={(e) => setFormData({ ...formData, owns_cd: e.target.checked })}
                />
                <span>CD 보유</span>
              </label>
              <label
                className="inline-flex h-[42px] w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
              >
                <input
                  type="checkbox"
                  className="rounded border shrink-0"
                  style={{ accentColor: 'var(--link)' }}
                  checked={formData.owns_lp}
                  onChange={(e) => setFormData({ ...formData, owns_lp: e.target.checked })}
                />
                <span>LP 보유</span>
              </label>
              <label
                className="inline-flex h-[42px] w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
              >
                <input
                  type="checkbox"
                  className="rounded border shrink-0"
                  style={{ accentColor: 'var(--link)' }}
                  checked={formData.owns_cassette}
                  onChange={(e) => setFormData({ ...formData, owns_cassette: e.target.checked })}
                />
                <span>카세트 보유</span>
              </label>
            </div>
          </div>
          <div
            className={`col-span-2 grid grid-cols-1 gap-x-6 gap-y-4 ${
              isEdit ? 'sm:grid-cols-2' : ''
            }`}
          >
            {isEdit ? appleMusicField : null}
            <div className="min-w-0">
              <label className="block text-sm font-semibold mb-1 opacity-90">유튜브 뮤직 재생목록</label>
              <input
                type="text"
                className={inputBaseClass}
                value={formData.youtube_playlist_id ?? ''}
                onChange={(e) => {
                  setFormData({ ...formData, youtube_playlist_id: e.target.value });
                  if (playlistError) setPlaylistError(false);
                }}
                placeholder="music.youtube.com 주소 또는 OLAK5uy_..."
                aria-invalid={playlistError}
              />
              {playlistError ? (
                <p className="mt-1 text-[11px]" style={{ color: '#ff3b30' }}>
                  유튜브 재생목록 주소 또는 ID를 확인해 주세요.
                </p>
              ) : null}
            </div>
          </div>
          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1 opacity-90">
                {isClassicMode ? 'Stage+ URL' : '타이틀곡 URL (유튜브)'}
              </label>
              <input
                type="text"
                className={inputBaseClass}
                value={formData.title_song_url}
                onChange={(e) => {
                  setFormData({ ...formData, title_song_url: e.target.value });
                  if (stagePlusError) setStagePlusError(false);
                }}
                placeholder={
                  isClassicMode
                    ? 'https://www.stage-plus.com/audio/album_...'
                    : 'https://www.youtube.com/watch?v=...'
                }
                aria-invalid={stagePlusError}
              />
              {stagePlusError ? (
                <p className="mt-1 text-[11px]" style={{ color: '#ff3b30' }}>
                  Stage+ 주소(https://www.stage-plus.com/...)를 입력해 주세요.
                </p>
              ) : null}
              {isClassicMode &&
              formData.title_song_url.trim() &&
              formData.title_song_url.trim() === initialTitleSongUrl.trim() &&
              getYoutubeId(formData.title_song_url) ? (
                <p className="mt-1 text-[11px] opacity-60">
                  기존 YouTube 주소입니다. 수정하면 Stage+ 주소만 저장할 수 있습니다.
                </p>
              ) : null}
            </div>
            {renderInput('Wikipedia URL', 'wiki_url')}
            {isClassicMode ? (
              <div className="col-span-2 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold mb-1 opacity-90">장르</label>
                  <select
                    className={`select-apple px-3 py-2 w-full h-[42px] ${readonlyClass}`}
                    value="Classic"
                    disabled
                    aria-readonly="true"
                  >
                    <option value="Classic">Classic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 opacity-90">형식</label>
                  <select
                    className="select-apple px-3 py-2 w-full h-[42px]"
                    value={formData.genre2}
                    onChange={(e) => {
                      setFormData({ ...formData, genre2: e.target.value });
                      if (isClassicFormOption(e.target.value)) setClassicFormError(false);
                    }}
                    aria-invalid={classicFormError}
                  >
                    <option value="">형식 선택</option>
                    {formData.genre2.trim() && !isClassicFormOption(formData.genre2) ? (
                      <option value={formData.genre2}>{formData.genre2}</option>
                    ) : null}
                    {CLASSIC_FORM_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatClassicFormLabel(option)}
                      </option>
                    ))}
                  </select>
                  {classicFormError ? (
                    <p className="mt-1 text-[11px]" style={{ color: '#ff3b30' }}>
                      Classic 앨범은 형식을 선택해야 저장할 수 있습니다.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 opacity-90">대표 악기</label>
                  <select
                    className="select-apple px-3 py-2 w-full h-[42px]"
                    value={formData.classic_instrument}
                    onChange={(e) =>
                      setFormData({ ...formData, classic_instrument: e.target.value })
                    }
                  >
                    <option value="">선택</option>
                    {formData.classic_instrument.trim() &&
                    !isClassicInstrumentOption(formData.classic_instrument) ? (
                      <option value={formData.classic_instrument}>
                        {formData.classic_instrument}
                      </option>
                    ) : null}
                    {CLASSIC_INSTRUMENT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1 opacity-90">장르</label>
                  <select
                    className="select-apple px-3 py-2 w-full h-[42px]"
                    value={formData.genre1}
                    onChange={(e) => {
                      const nextGenre1 = e.target.value;
                      setFormData((prev) => {
                        const options = genre2OptionsForGenre1(nextGenre1);
                        const current = prev.genre2.trim();
                        const keep = !!options && !!current && options.includes(current);
                        return {
                          ...prev,
                          genre1: nextGenre1,
                          genre2: keep ? current : '',
                        };
                      });
                      setClassicFormError(false);
                    }}
                  >
                    <option value="">선택</option>
                    {popGenreOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 opacity-90">하위 장르</label>
                  <select
                    className="select-apple px-3 py-2 w-full h-[42px]"
                    value={formData.genre2}
                    onChange={(e) => setFormData({ ...formData, genre2: e.target.value })}
                    disabled={
                      !formData.genre1.trim() || genre2OptionsForGenre1(formData.genre1) == null
                    }
                  >
                    <option value="">선택</option>
                    {formData.genre2.trim() &&
                    !isGenre2OptionForGenre1(formData.genre1, formData.genre2) ? (
                      <option value={formData.genre2}>
                        {formData.genre2} (기존 값)
                      </option>
                    ) : null}
                    {(genre2OptionsForGenre1(formData.genre1) ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {isClassicMode ? (
              <div className="col-span-2 flex min-w-0 flex-col gap-3">
                {(formData.composers.length > 0
                  ? formData.composers
                  : [emptyComposerFormEntry()]
                ).map((entry, index) => {
                  const composers =
                    formData.composers.length > 0
                      ? formData.composers
                      : [emptyComposerFormEntry()];
                  const duplicateName =
                    entry.name.trim() !== '' &&
                    composers.some(
                      (other, otherIndex) =>
                        otherIndex !== index &&
                        normalizeComposerNameKey(other.name) ===
                          normalizeComposerNameKey(entry.name),
                    );
                  const updateComposers = (next: AlbumComposerFormEntry[]) => {
                    setFormData((prev) => ({
                      ...prev,
                      composers: next,
                      ...primaryComposerFieldsFromEntries(next),
                    }));
                  };
                  return (
                    <div
                      key={index}
                      className="min-w-0 rounded-xl p-3"
                      style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold opacity-90">
                          작곡가 {index + 1}
                          {index === 0 ? (
                            <span className="ml-1 text-[11px] font-medium opacity-60">대표</span>
                          ) : null}
                        </p>
                        {composers.length > 1 ? (
                          <button
                            type="button"
                            className="text-[11px] font-medium opacity-70 transition-opacity hover:opacity-100"
                            onClick={() => {
                              const next = composers.filter((_, i) => i !== index);
                              updateComposers(next.length > 0 ? next : [emptyComposerFormEntry()]);
                            }}
                          >
                            삭제
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="min-w-0 sm:col-span-2">
                          <label className="mb-1 block text-sm font-semibold opacity-90">이름</label>
                          <ComposerComboSelect
                            value={entry.name}
                            onChange={(name) => {
                              const next = composers.map((row, i) =>
                                i === index ? { ...row, name } : row,
                              );
                              updateComposers(next);
                            }}
                            onSelectOption={(option) => {
                              const key = normalizeComposerNameKey(option.name);
                              const dup = composers.some(
                                (row, i) =>
                                  i !== index && normalizeComposerNameKey(row.name) === key,
                              );
                              if (dup) return;
                              const next = composers.map((row, i) =>
                                i === index
                                  ? {
                                      name: option.name,
                                      country: option.country ?? row.country,
                                      era: option.era ?? row.era,
                                      wiki_url: option.wikiUrl ?? row.wiki_url,
                                    }
                                  : row,
                              );
                              updateComposers(next);
                            }}
                          />
                          {duplicateName ? (
                            <p className="mt-1 text-[11px]" style={{ color: '#ff3b30' }}>
                              같은 작곡가 이름은 한 번만 입력할 수 있습니다.
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold opacity-90">국적</label>
                          <select
                            className="select-apple h-[42px] w-full px-3 py-2"
                            value={entry.country}
                            onChange={(e) => {
                              const next = composers.map((row, i) =>
                                i === index ? { ...row, country: e.target.value } : row,
                              );
                              updateComposers(next);
                            }}
                          >
                            <option value="">선택 안 함</option>
                            {countryOptions.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.flag} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-semibold opacity-90">시대</label>
                          <select
                            className="select-apple h-[42px] w-full px-3 py-2"
                            value={entry.era}
                            onChange={(e) => {
                              const next = composers.map((row, i) =>
                                i === index ? { ...row, era: e.target.value } : row,
                              );
                              updateComposers(next);
                            }}
                          >
                            <option value="">선택 안 함</option>
                            {entry.era.trim() &&
                            !(COMPOSER_ERA_OPTIONS as readonly string[]).includes(entry.era) ? (
                              <option value={entry.era}>{entry.era}</option>
                            ) : null}
                            {COMPOSER_ERA_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-0 sm:col-span-2">
                          <label className="mb-1 block text-sm font-semibold opacity-90">
                            위키피디아 URL
                          </label>
                          <input
                            className={inputBaseClass}
                            value={entry.wiki_url}
                            onChange={(e) => {
                              const next = composers.map((row, i) =>
                                i === index ? { ...row, wiki_url: e.target.value } : row,
                              );
                              updateComposers(next);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div>
                  <button
                    type="button"
                    disabled={formData.composers.length >= MAX_ALBUM_COMPOSERS}
                    className="btn-apple btn-apple-secondary h-[36px] px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => {
                      if (formData.composers.length >= MAX_ALBUM_COMPOSERS) return;
                      const base =
                        formData.composers.length > 0
                          ? formData.composers
                          : [emptyComposerFormEntry()];
                      const next = [...base, emptyComposerFormEntry()];
                      setFormData((prev) => ({
                        ...prev,
                        composers: next,
                        ...primaryComposerFieldsFromEntries(next),
                      }));
                    }}
                  >
                    작곡가 추가
                  </button>
                  {formData.composers.length >= MAX_ALBUM_COMPOSERS ? (
                    <p className="mt-1 text-[11px] opacity-60">
                      작곡가는 최대 {MAX_ALBUM_COMPOSERS}명까지 입력할 수 있습니다.
                    </p>
                  ) : null}
                  {composerDupError ? (
                    <p className="mt-1 text-[11px]" style={{ color: '#ff3b30' }}>
                      같은 작곡가 이름은 한 번만 입력할 수 있습니다.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
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
            <p className="text-[11px] opacity-60 mb-2">추천 리시버는 Head-Fi 라이브러리에서 <strong className="opacity-90">보유중</strong>인 헤드폰·이어폰만 선택할 수 있어요.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">추천 리시버 1순위</label>
                <ReceiverComboSelect
                  value={formData.recommended_hp1}
                  onChange={(recommended_hp1) => setFormData({ ...formData, recommended_hp1 })}
                  options={headfiOwnedHeadphones}
                  aria-label="추천 리시버 1순위"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 opacity-90">추천 리시버 2순위</label>
                <ReceiverComboSelect
                  value={formData.recommended_hp2}
                  onChange={(recommended_hp2) => setFormData({ ...formData, recommended_hp2 })}
                  options={headfiOwnedHeadphones}
                  aria-label="추천 리시버 2순위"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            className="btn-apple btn-apple-primary p-4 w-full text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
            onClick={() => {
              if (isClassicMode) {
                if (!isClassicFormOption(formData.genre2)) {
                  setClassicFormError(true);
                  return;
                }
                const keys = formData.composers
                  .map((entry) => normalizeComposerNameKey(entry.name))
                  .filter(Boolean);
                if (new Set(keys).size !== keys.length) {
                  setComposerDupError(true);
                  return;
                }
                const titleUrl = formData.title_song_url.trim();
                if (
                  titleUrl &&
                  titleUrl !== initialTitleSongUrl.trim() &&
                  normalizeStagePlusUrl(titleUrl).status !== 'ok'
                ) {
                  setStagePlusError(true);
                  return;
                }
              }
              if (parseYoutubePlaylistInput(formData.youtube_playlist_id ?? '').status === 'invalid') {
                setPlaylistError(true);
                return;
              }
              if (parseAppleMusicAlbumInput(formData.apple_music_url ?? '').status === 'invalid') {
                setAppleMusicError(true);
                return;
              }
              setClassicFormError(false);
              setComposerDupError(false);
              setPlaylistError(false);
              setAppleMusicError(false);
              setStagePlusError(false);
              onSave();
            }}
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
          {isEdit && onDelete && !deleteConfirmOpen ? (
            <button
              type="button"
              className="btn-apple btn-apple-danger p-4 w-full text-base disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={isSaving || isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? <DeletingLabel /> : '앨범 삭제'}
            </button>
          ) : null}
          {isEdit && onDelete && deleteConfirmOpen ? (
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
            >
              <p className="text-sm font-medium">정말 이 앨범을 삭제하시겠습니까?</p>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="btn-apple btn-apple-secondary h-[34px] px-3 text-sm"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn-apple btn-apple-danger h-[34px] px-3 text-sm"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    onDelete();
                  }}
                  disabled={isDeleting}
                  aria-busy={isDeleting}
                >
                  {isDeleting ? <DeletingLabel /> : '삭제'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
