import { listenContextLog, listenContextWarn, truncateForLog } from '@/lib/listenContextDebug';

export type WeatherInfo = {
  temperature: number;
  condition: string;
  description: string;
};

type OpenMeteoCurrentResponse = {
  current?: { temperature_2m?: number; weather_code?: number };
  error?: boolean;
  reason?: string;
};

export async function getWeatherFromCurrentLocation(): Promise<WeatherInfo | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    return await getCurrentWeather(position.coords.latitude, position.coords.longitude);
  } catch {
    return null;
  }
}

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  listenContextLog('weather api request', {
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4)),
  });

  try {
    const res = await fetch(url);
    const raw = await res.text();
    listenContextLog('weather api response', {
      status: res.status,
      ok: res.ok,
      bodyPreview: truncateForLog(raw),
    });

    if (!res.ok) {
      listenContextWarn('weather api http error', { status: res.status });
      return null;
    }

    let data: OpenMeteoCurrentResponse;
    try {
      data = JSON.parse(raw) as OpenMeteoCurrentResponse;
    } catch {
      listenContextWarn('weather api json parse failed');
      return null;
    }

    if (data.error) {
      listenContextWarn('weather api error body', { reason: data.reason ?? 'unknown' });
      return null;
    }

    const temperatureRaw = data.current?.temperature_2m;
    if (typeof temperatureRaw !== 'number' || !Number.isFinite(temperatureRaw)) {
      listenContextWarn('weather api missing temperature_2m', {
        hasCurrent: Boolean(data.current),
        weatherCode: data.current?.weather_code ?? null,
      });
      return null;
    }

    const temp = Math.round(temperatureRaw);
    const code = data.current?.weather_code ?? 0;

    const getCondition = (weatherCode: number): { condition: string; description: string } => {
      if (weatherCode === 0) return { condition: 'clear', description: '맑음' };
      if (weatherCode <= 2) return { condition: 'clear', description: '대체로 맑음' };
      if (weatherCode <= 3) return { condition: 'cloudy', description: '흐림' };
      if (weatherCode <= 49) return { condition: 'foggy', description: '안개' };
      if (weatherCode <= 59) return { condition: 'rainy', description: '이슬비' };
      if (weatherCode <= 69) return { condition: 'rainy', description: '비' };
      if (weatherCode <= 79) return { condition: 'snowy', description: '눈' };
      if (weatherCode <= 84) return { condition: 'rainy', description: '소나기' };
      if (weatherCode <= 99) return { condition: 'stormy', description: '뇌우' };
      return { condition: 'cloudy', description: '흐림' };
    };

    return { temperature: temp, ...getCondition(code) };
  } catch (err) {
    listenContextWarn('weather api fetch failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
