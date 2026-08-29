import { getCurrentWeather } from '@/lib/weather';

const LEGACY_GEO_DENIED_KEY = 'listen_context_geo_denied';
const GEO_PERMISSION_DENIED_KEY = 'listen_context_geo_permission_denied';

export type ListenContextSnapshot = {
  captured_at: string;
  weather_condition: string | null;
  temperature: number | null;
};

export type ListenWeatherContext = Pick<ListenContextSnapshot, 'weather_condition' | 'temperature'>;

function isGeoPermissionDenied(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  if (sessionStorage.getItem(LEGACY_GEO_DENIED_KEY) === '1') {
    sessionStorage.removeItem(LEGACY_GEO_DENIED_KEY);
  }
  return sessionStorage.getItem(GEO_PERMISSION_DENIED_KEY) === '1';
}

function markGeoPermissionDenied(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(GEO_PERMISSION_DENIED_KEY, '1');
  }
}

export function createListenCapturedAt(): string {
  return new Date().toISOString();
}

export async function fetchListenWeatherContext(): Promise<ListenWeatherContext> {
  if (isGeoPermissionDenied()) {
    return { weather_condition: null, temperature: null };
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { weather_condition: null, temperature: null };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 20000,
        maximumAge: 600000,
        enableHighAccuracy: false,
      });
    });
    const weather = await getCurrentWeather(position.coords.latitude, position.coords.longitude);
    if (weather) {
      return { weather_condition: weather.description, temperature: weather.temperature };
    }
  } catch (err) {
    const code = (err as GeolocationPositionError)?.code;
    if (code === 1) {
      markGeoPermissionDenied();
    }
  }

  return { weather_condition: null, temperature: null };
}

export async function captureListenContextSnapshot(): Promise<ListenContextSnapshot> {
  const captured_at = createListenCapturedAt();
  const weather = await fetchListenWeatherContext();
  return { captured_at, ...weather };
}
