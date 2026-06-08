'use client';

export type TasteResult = {
  dominant_genres: string[];
  preferred_era: string;
  taste_summary: string;
  unregistered_recommendations: {
    artist: string;
    album: string;
    reason: string;
  }[];
};

function isTasteResult(v: unknown): v is TasteResult {
  return (
    v != null &&
    typeof v === 'object' &&
    'taste_summary' in v &&
    typeof (v as TasteResult).taste_summary === 'string' &&
    'dominant_genres' in v &&
    Array.isArray((v as TasteResult).dominant_genres) &&
    'preferred_era' in v &&
    typeof (v as TasteResult).preferred_era === 'string' &&
    'unregistered_recommendations' in v &&
    Array.isArray((v as TasteResult).unregistered_recommendations)
  );
}

type MusicTasteModalProps = {
  result: TasteResult | null;
  isLoading: boolean;
  onClose: () => void;
};

const GENRE_BAR_WIDTHS: number[] = [100, 80, 60];

export function MusicTasteModal({ result, isLoading, onClose }: MusicTasteModalProps) {
  const valid = result != null && isTasteResult(result);
  const showError = !isLoading && !valid;

  return (
    <div
      className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="music-taste-modal-title"
    >
      <div
        className="modal-panel-apple w-full max-w-lg max-h-[85vh] overflow-y-auto p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 id="music-taste-modal-title" className="section-title text-xl pr-8">
            🎵 나의 음악 취향 분석
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity leading-none"
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 min-h-[200px]">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: 'var(--border)',
                borderTopColor: 'var(--foreground)',
              }}
            />
            <p className="text-sm opacity-80">AI가 취향을 분석하는 중이에요...</p>
          </div>
        )}

        {showError && (
          <p className="text-center py-8 opacity-80">분석에 실패했어요. 다시 시도해주세요.</p>
        )}

        {!isLoading && valid && result && (
          <div className="flex flex-col gap-8">
            <blockquote
              className="text-lg font-semibold rounded-xl p-4"
              style={{ background: 'var(--badge-bg)' }}
            >
              &ldquo;{result.taste_summary}&rdquo;
            </blockquote>

            <section>
              <h3 className="text-sm font-semibold opacity-80 mb-3">지배 장르</h3>
              <ul className="flex flex-col gap-3">
                {result.dominant_genres.map((genre, index) => {
                  const widthPct = GENRE_BAR_WIDTHS[index] ?? 40;
                  return (
                    <li key={`${genre}-${index}`} className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{genre}</span>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--border)' }}
                      >
                        <div
                          className="h-full rounded-full transition-[width]"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: '#005bc1',
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold opacity-80 mb-2">선호 시대</h3>
              <p className="text-2xl font-bold">{result.preferred_era}</p>
            </section>

            <section>
              <h3 className="text-sm font-semibold opacity-80 mb-3">🎶 AI 추천 앨범</h3>
              <div className="grid grid-cols-1 gap-3">
                {result.unregistered_recommendations.map((rec, index) => (
                  <div
                    key={`${rec.artist}-${rec.album}-${index}`}
                    className="rounded-xl p-4"
                    style={{
                      background: 'var(--badge-bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p className="font-bold">{rec.artist}</p>
                    <p className="opacity-80">{rec.album}</p>
                    <p className="text-sm opacity-60 mt-2">{rec.reason}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <a
                        href={`https://open.spotify.com/search/${encodeURIComponent(rec.artist + ' ' + rec.album)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-[11px] font-bold px-3 py-1 rounded-full text-white"
                        style={{ backgroundColor: '#1DB954' }}
                      >
                        Spotify
                      </a>
                      <a
                        href={`https://music.apple.com/search?term=${encodeURIComponent(rec.artist + ' ' + rec.album)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-[11px] font-bold px-3 py-1 rounded-full text-white"
                        style={{ backgroundColor: '#FC3C44' }}
                      >
                        Apple Music
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
