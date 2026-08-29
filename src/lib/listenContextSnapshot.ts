import { getCurrentWeather } from '@/lib/weather';

const GEO_DENIED_SESSION_KEY = 'listen_context_geo_denied';

export type ListenContextSnapshot = {
  captured_at: string;
  weather_condition: string | null;
  temperature: number | null;
};

export async function captureListenContextSnapshot(): Promise<ListenContextSnapshot> {
  const captured_at = new Date().toISOString();
  let weather_condition: string | null = null;
  let temperature: number | null = null;

  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(GEO_DENIED_SESSION_KEY) === '1') {
    return { captured_at, weather_condition, temperature };
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { captured_at, weather_condition, temperature };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    const weather = await getCurrentWeather(position.coords.latitude, position.coords.longitude);
    if (weather) {
      weather_condition = weather.description;
      temperature = weather.temperature;
    }
  } catch {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(GEO_DENIED_SESSION_KEY, '1');
    }
  }

  return { captured_at, weather_condition, temperature };
}
