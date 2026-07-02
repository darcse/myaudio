/* eslint-disable @next/next/no-img-element */

export const ALBUM_COVER_BLUR_OVERLAY =
  'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)';

type AlbumCoverBlurBackdropProps = {
  coverImageUrl: string | null;
  overlayStyle?: string;
};

export function AlbumCoverBlurBackdrop({
  coverImageUrl,
  overlayStyle = ALBUM_COVER_BLUR_OVERLAY,
}: AlbumCoverBlurBackdropProps) {
  return (
    <>
      {coverImageUrl ? (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <img
            src={coverImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover blur-xl scale-110"
          />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--badge-bg)' }} aria-hidden />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: overlayStyle }}
        aria-hidden
      />
    </>
  );
}
