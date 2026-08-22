import { AlbumTrackListContent } from '../_components/AlbumTrackListContent';

type PageProps = {
  params: Promise<{ albumId: string }>;
};

export default async function LyricsAlbumTracksPage({ params }: PageProps) {
  const { albumId: raw } = await params;
  const albumId = parseInt(raw, 10);
  if (!Number.isFinite(albumId)) {
    return <div className="p-8 text-center opacity-70">잘못된 앨범입니다.</div>;
  }
  return <AlbumTrackListContent albumId={albumId} />;
}
