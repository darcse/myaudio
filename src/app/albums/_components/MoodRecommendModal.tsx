/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getCurrentWeather } from '@/lib/weather';

const MOOD_OPTIONS = [
  { value: '행복함', emoji: '😊' },
  { value: '우울함', emoji: '😢' },
  { value: '설렘', emoji: '🌟' },
  { value: '피곤함', emoji: '😴' },
  { value: '집중', emoji: '🎯' },
  { value: '신남', emoji: '🔥' },
  { value: '감성적', emoji: '💭' },
  { value: '차분함', emoji: '😌' },
  { value: '불안함', emoji: '😰' },
  { value: '나른함', emoji: '🥱' },
  { value: '따분함', emoji: '😑' },
  { value: '멍함', emoji: '🌀' },
];

type RecommendResult = {
  album: {
    id: number;
    album_name: string;
    artist: string;
    cover_image_url: string | null;
    genre1: string | null;
    genre2: string | null;
  } | null;
  headphone: {
    id: number;
    brand: string;
    model: string;
    image_url: string | null;
  } | null;
  reason: string;
};

type MoodRecommendModalProps = {
  onClose: () => void;
  onAlbumClick: (albumId: number) => void;
};

function getTimeSlot(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '오전';
  if (hour >= 12 && hour < 17) return '오후';
  if (hour >= 17 && hour < 21) return '저녁';
  if (hour >= 21 && hour < 24) return '밤';
  return '새벽';
}

export function MoodRecommendModal({ onClose, onAlbumClick }: MoodRecommendModalProps) {
  const [selectedMood, setSelectedMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [weatherDesc, setWeatherDesc] = useState('');
  const moodTextInputRef = useRef<HTMLInputElement>(null);

  const executeSubmit = async () => {
    if (!selectedMood) return;
    setLoading(true);
    setResult(null);

    let weather = null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      weather = await getCurrentWeather(position.coords.latitude, position.coords.longitude);
      if (weather) setWeatherDesc(`${weather.description} ${weather.temperature}°C`);
      else setWeatherDesc('날씨 정보 없음');
    } catch {
      setWeatherDesc('날씨 정보 없음');
    }

    try {
      const res = await fetch('/api/mood-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          moodText: moodTextInputRef.current?.value ?? '',
          weather,
          timeSlot: getTimeSlot(),
        }),
      });
      let data: RecommendResult & { error?: string } = { album: null, headphone: null, reason: '' };
      try {
        data = await res.json();
      } catch {
        throw new Error('parse');
      }
      if (!res.ok || data.error) {
        toast.error('추천에 실패했어요. 다시 시도해줘요.');
        return;
      }
      setResult(data);
    } catch {
      toast.error('추천에 실패했어요. 다시 시도해줘요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel-apple max-w-lg w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-5 text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity"
        >
          &times;
        </button>

        <h2 className="section-title text-xl mb-6">🎵 지금 기분에 맞는 음악</h2>

        {!result ? (
          <div>
            <div className="mb-6">
              <p className="text-sm font-semibold opacity-80 mb-3">지금 기분이 어때요?</p>
              <div
                className="grid gap-2 w-full"
                style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
              >
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setSelectedMood(mood.value)}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all w-full min-w-0"
                    style={{
                      background: selectedMood === mood.value ? 'rgba(0,91,193,0.12)' : 'var(--badge-bg)',
                      border:
                        selectedMood === mood.value
                          ? '1px solid rgba(0,91,193,0.4)'
                          : '1px solid var(--border)',
                      color: selectedMood === mood.value ? '#005bc1' : 'var(--foreground)',
                    }}
                  >
                    <span className="text-lg leading-none">{mood.emoji}</span>
                    <span className="text-[10px] font-medium text-center leading-tight">{mood.value}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold opacity-80 mb-2">더 자세히 말해줄래요? (선택)</p>
              <input
                ref={moodTextInputRef}
                name="moodText"
                type="text"
                className="input-apple px-3 py-2 w-full h-[42px]"
                placeholder="예: 오늘 유독 지치는 날이야, 드라이브 중이야..."
                defaultValue=""
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  if (e.nativeEvent.isComposing) {
                    e.preventDefault();
                    return;
                  }
                  if (!selectedMood || loading) return;
                  void executeSubmit();
                }}
              />
            </div>

            <button
              type="button"
              disabled={!selectedMood || loading}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!selectedMood || loading) return;
                void executeSubmit();
              }}
              className="btn-apple btn-apple-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI가 분석 중이에요...
                </span>
              ) : (
                '🎵 지금 이 순간의 음악 추천받기'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm opacity-70 mb-4">
              <span>{MOOD_OPTIONS.find((m) => m.value === selectedMood)?.emoji}</span>
              <span>{selectedMood}</span>
              {weatherDesc ? (
                <>
                  <span>·</span>
                  <span>🌤 {weatherDesc}</span>
                </>
              ) : null}
            </div>

            <div
              className="p-4 rounded-xl text-sm leading-relaxed"
              style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
            >
              {result.reason}
            </div>

            {result.album ? (
              <button
                type="button"
                onClick={() => {
                  onAlbumClick(result.album!.id);
                  onClose();
                }}
                className="flex gap-4 items-center p-4 rounded-xl hover:opacity-90 transition-opacity w-full text-left"
                style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
              >
                {result.album.cover_image_url ? (
                  <img
                    src={result.album.cover_image_url}
                    alt=""
                    className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                    style={{ border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-xs opacity-50"
                    style={{ background: 'var(--badge-bg)' }}
                  >
                    No Cover
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs opacity-60 mb-1">추천 앨범</p>
                  <p className="font-bold truncate">{result.album.album_name}</p>
                  <p className="text-sm opacity-60 truncate">{result.album.artist}</p>
                  {result.album.genre1 ? (
                    <div className="flex gap-1 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full badge-apple">{result.album.genre1}</span>
                    </div>
                  ) : null}
                </div>
              </button>
            ) : null}

            {result.headphone ? (
              <Link
                href={`/headfi?view=${result.headphone.id}`}
                onClick={onClose}
                className="flex gap-4 items-center p-4 rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
              >
                {result.headphone.image_url ? (
                  <img
                    src={result.headphone.image_url}
                    alt=""
                    className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                    style={{ border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-xs opacity-50"
                    style={{ background: 'var(--badge-bg)' }}
                  >
                    No Image
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs opacity-60 mb-1">추천 헤드폰</p>
                  <p className="font-bold truncate">
                    {result.headphone.brand} {result.headphone.model}
                  </p>
                </div>
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setResult(null);
                setSelectedMood('');
              }}
              className="btn-apple btn-apple-secondary w-full py-3 mt-2"
            >
              다시 추천받기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
