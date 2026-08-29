export type ListenContextFields = {
  captured_at?: string | null;
  weather_condition?: string | null;
  temperature?: number | null;
};

function weatherEmoji(description: string | null | undefined): string | null {
  if (!description) return null;
  if (description.includes('뇌')) return '⛈️';
  if (description.includes('눈')) return '❄️';
  if (description.includes('비') || description.includes('소나기') || description.includes('이슬')) return '🌧️';
  if (description.includes('안개')) return '🌫️';
  if (description.includes('흐림')) return '☁️';
  if (description.includes('맑')) return '🌤️';
  return null;
}

function formatCapturedTime(capturedAt: string): string | null {
  const date = new Date(capturedAt);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatListenContextMeta(fields: ListenContextFields): string | null {
  const parts: string[] = [];
  if (fields.captured_at) {
    const time = formatCapturedTime(fields.captured_at);
    if (time) parts.push(time);
  }
  const weatherParts: string[] = [];
  const emoji = weatherEmoji(fields.weather_condition);
  if (emoji) {
    weatherParts.push(emoji);
  } else if (fields.weather_condition) {
    weatherParts.push(fields.weather_condition);
  }
  if (fields.temperature != null) {
    weatherParts.push(`${fields.temperature}°C`);
  }
  if (weatherParts.length > 0) {
    parts.push(weatherParts.join(' '));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
