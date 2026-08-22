import { LyricsViewContent } from '../../_components/LyricsViewContent';

type PageProps = {
  params: Promise<{ albumId: string; trackId: string }>;
};

export default async function LyricsTrackViewPage({ params }: PageProps) {
  const { albumId: rawAlbum, trackId } = await params;
  const albumId = parseInt(rawAlbum, 10);
  if (!Number.isFinite(albumId) || !trackId) {
    return <div className="p-8 text-center opacity-70">잘못된 경로입니다.</div>;
  }
  return <LyricsViewContent albumId={albumId} trackId={trackId} />;
}
