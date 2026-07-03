'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { BoardExpandedAlbumGrid } from '@/app/albums/_components/albumBoardShared';
import type { Album } from '@/app/albums/types';
import { countryFlag, findArtistWikiUrl, getPrimaryGenre1 } from '../utils';
import type { ArtistRecord, ArtistStats, ArtistSummary, RelatedArtist } from '../types';
import { ArtistBioSection } from './ArtistBioSection';
import { ArtistExternalLinksSection, type ArtistLinksPatch } from './ArtistExternalLinksSection';
import { ArtistNameEditPopover } from './ArtistNameEditPopover';
import { ArtistProfileImage } from './ArtistProfileImage';
import { ArtistRelatedSection } from './ArtistRelatedSection';
import { ArtistStatsSection } from './ArtistStatsSection';
import { ArtistWikiSection } from './ArtistWikiSection';

type ArtistDetailPanelProps = {
  artist: ArtistSummary | null;
  artistRecord: ArtistRecord | null;
  artistStats: ArtistStats | null;
  popularAlbumId: number | null;
  relatedArtists: RelatedArtist[];
  bioLoading: boolean;
  linksSaving: boolean;
  profileSaving: boolean;
  nameSaving: boolean;
  isAuthenticated: boolean | null;
  showMobileBack?: boolean;
  onMobileBack?: () => void;
  onAlbumClick: (album: Album) => void;
  onAddAlbum?: () => void;
  onSelectArtist: (name: string) => void;
  onRefreshBio: () => void;
  onSaveLinks: (patch: ArtistLinksPatch) => Promise<boolean>;
  onSaveProfileImage: (profileImageUrl: string | null) => Promise<boolean>;
  onSaveNames: (patch: { name: string; nameAlt: string | null }) => Promise<boolean>;
};

export function ArtistDetailPanel({
  artist,
  artistRecord,
  artistStats,
  popularAlbumId,
  relatedArtists,
  bioLoading,
  linksSaving,
  profileSaving,
  nameSaving,
  isAuthenticated,
  showMobileBack = false,
  onMobileBack,
  onAlbumClick,
  onAddAlbum,
  onSelectArtist,
  onRefreshBio,
  onSaveLinks,
  onSaveProfileImage,
  onSaveNames,
}: ArtistDetailPanelProps) {
  const [linksEditing, setLinksEditing] = useState(false);

  useEffect(() => {
    setLinksEditing(false);
  }, [artistRecord?.id, artist?.name]);

  if (!artist) {
    return (
      <div
        className="flex min-h-[20rem] flex-1 items-center justify-center rounded-xl border p-8 text-center"
        style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
      >
        <p className="text-sm opacity-60">아티스트를 선택하면 상세 정보가 표시됩니다.</p>
      </div>
    );
  }

  const flag = countryFlag(artist.country);
  const wikiUrl = findArtistWikiUrl(artist.albums);
  const primaryGenre1 = getPrimaryGenre1(artist);
  const nameAlt = artistRecord?.name_alt ?? artist.nameAlt ?? null;
  const nameAltDisplay = nameAlt?.trim() || null;

  return (
    <section
      className="flex min-h-0 flex-1 flex-col rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="border-b px-4 py-5 sm:px-6"
        style={{ borderColor: 'var(--border)' }}
      >
        {showMobileBack ? (
          <button
            type="button"
            onClick={onMobileBack}
            className="mb-3 inline-flex items-center gap-1 text-sm opacity-70 transition-opacity hover:opacity-100 lg:hidden"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
            목록
          </button>
        ) : null}
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 sm:gap-x-5">
          <div className="row-start-1 col-start-1 self-start">
            <ArtistProfileImage
              profileImageUrl={artistRecord?.profile_image_url ?? null}
              artistName={artist.name}
              isAuthenticated={isAuthenticated}
              saving={profileSaving}
              onSave={onSaveProfileImage}
            />
          </div>
          <div className="row-start-1 col-start-2 min-w-0 self-center sm:self-start">
            <div className="flex min-w-0 items-start gap-2">
              <div className="min-w-0">
                <h2 className="min-w-0 text-2xl font-bold tracking-tight">
                  {artist.name}
                  {nameAltDisplay ? (
                    <span className="hidden text-base font-medium opacity-60 sm:inline">
                      {' '}
                      ({nameAltDisplay})
                    </span>
                  ) : null}
                </h2>
                {nameAltDisplay ? (
                  <p className="mt-0.5 text-base font-medium opacity-60 sm:hidden">{nameAltDisplay}</p>
                ) : null}
              </div>
              <ArtistNameEditPopover
                artistName={artist.name}
                nameAlt={nameAlt}
                saving={nameSaving}
                isAuthenticated={isAuthenticated}
                onSave={onSaveNames}
              />
            </div>
          </div>
          <div className="col-span-2 row-start-2 flex min-w-0 flex-col gap-4 sm:col-span-1 sm:col-start-2 sm:row-start-2 sm:min-h-[calc(132px-2.5rem)] sm:justify-between">
            <ArtistExternalLinksSection
              artistRecord={artistRecord}
              linksSaving={linksSaving}
              editing={linksEditing}
              isAuthenticated={isAuthenticated}
              onEditingChange={setLinksEditing}
              onSaveLinks={onSaveLinks}
            >
              {artist.country ? (
                <span>
                  {flag ? `${flag} ` : ''}
                  {artist.country}
                </span>
              ) : null}
              {artist.artistType ? (
                <span className="badge-apple inline-flex px-2 py-0.5 text-[11px] font-semibold">
                  {artist.artistType}
                </span>
              ) : null}
              {primaryGenre1 ? (
                <span className="badge-apple inline-flex px-2 py-0.5 text-[11px] font-semibold">
                  {primaryGenre1}
                </span>
              ) : null}
            </ArtistExternalLinksSection>
            {artistStats ? (
              <div className="sm:pt-4">
                <ArtistStatsSection stats={artistStats} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-0 overflow-y-auto p-4 sm:p-6">
        <ArtistBioSection
          bio={artistRecord?.bio ?? null}
          bioLoading={bioLoading}
          isAuthenticated={isAuthenticated}
          onRefreshBio={onRefreshBio}
        />

        <ArtistWikiSection wikiUrl={wikiUrl} artistName={artist.name} />

        <div className="pt-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold opacity-90">등록 앨범</h3>
            {isAuthenticated === true && onAddAlbum ? (
              <button
                type="button"
                onClick={onAddAlbum}
                className="btn-apple btn-apple-secondary flex size-8 shrink-0 items-center justify-center"
                aria-label="앨범 등록"
              >
                <span className="text-lg leading-none">＋</span>
              </button>
            ) : null}
          </div>
          {artist.albums.length > 0 ? (
            <BoardExpandedAlbumGrid
              albums={artist.albums}
              onAlbumClick={onAlbumClick}
              popularAlbumId={popularAlbumId}
              hideCoverBadges
              subtitle="releaseDate"
            />
          ) : (
            <p className="text-sm opacity-60">등록된 앨범이 없습니다.</p>
          )}
        </div>

        <ArtistRelatedSection
          relatedArtists={relatedArtists}
          onSelectArtist={onSelectArtist}
        />
      </div>
    </section>
  );
}
