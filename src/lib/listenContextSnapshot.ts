import { getCurrentWeather } from '@/lib/weather';
import { listenContextLog, listenContextWarn } from '@/lib/listenContextDebug';

const LEGACY_GEO_DENIED_KEY = 'listen_context_geo_denied';
const GEO_PERMISSION_DENIED_KEY = 'listen_context_geo_permission_denied';

export type ListenContextSnapshot = {
  captured_at: string;
  weather_condition: string | null;
  temperature: number | null;
};

export type ListenWeatherContext = Pick<ListenContextSnapshot, 'weather_condition' | 'temperature'>;

function clearGeoPermissionDenied(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(GEO_PERMISSION_DENIED_KEY);
  }
}

function markGeoPermissionDenied(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(GEO_PERMISSION_DENIED_KEY, '1');
  }
}

async function queryGeolocationPermissionState(): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null;
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return null;
  }
}

async function shouldSkipGeolocation(): Promise<boolean> {
  if (typeof sessionStorage === 'undefined') return false;
  if (sessionStorage.getItem(LEGACY_GEO_DENIED_KEY) === '1') {
    sessionStorage.removeItem(LEGACY_GEO_DENIED_KEY);
  }
  if (sessionStorage.getItem(GEO_PERMISSION_DENIED_KEY) !== '1') return false;

  const permissionState = await queryGeolocationPermissionState();
  if (permissionState === 'granted') {
    listenContextLog('geo session flag cleared — permission granted');
    clearGeoPermissionDenied();
    return false;
  }
  if (permissionState === 'denied') {
    listenContextLog('geo skipped — permission denied');
    return true;
  }

  listenContextLog('geo session flag ignored — retry geolocation', { permissionState });
  clearGeoPermissionDenied();
  return false;
}

function geolocationErrorLabel(code: number | undefined): string {
  if (code === 1) return 'PERMISSION_DENIED';
  if (code === 2) return 'POSITION_UNAVAILABLE';
  if (code === 3) return 'TIMEOUT';
  return 'UNKNOWN';
}

export function createListenCapturedAt(): string {
  return new Date().toISOString();
}

export async function fetchListenWeatherContext(): Promise<ListenWeatherContext> {
  if (await shouldSkipGeolocation()) {
    return { weather_condition: null, temperature: null };
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    listenContextWarn('geo unavailable');
    return { weather_condition: null, temperature: null };
  }

  listenContextLog('geo request start');

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 20000,
        maximumAge: 600000,
        enableHighAccuracy: false,
      });
    });
    clearGeoPermissionDenied();
    const { latitude, longitude } = position.coords;
    listenContextLog('geo success', {
      lat: Number(latitude.toFixed(4)),
      lon: Number(longitude.toFixed(4)),
    });

    const weather = await getCurrentWeather(latitude, longitude);
    if (weather) {
      listenContextLog('weather resolved', {
        description: weather.description,
        temperature: weather.temperature,
      });
      return { weather_condition: weather.description, temperature: weather.temperature };
    }

    listenContextWarn('weather empty after geo success');
  } catch (err) {
    const code = (err as GeolocationPositionError)?.code;
    listenContextWarn('geo failed', {
      code,
      reason: geolocationErrorLabel(code),
      message: err instanceof Error ? err.message : String(err),
    });

    const permissionState = await queryGeolocationPermissionState();
    if (code === 1 && permissionState === 'denied') {
      markGeoPermissionDenied();
    } else if (permissionState === 'granted') {
      clearGeoPermissionDenied();
    }
  }

  return { weather_condition: null, temperature: null };
}

export async function captureListenContextSnapshot(): Promise<ListenContextSnapshot> {
  const captured_at = createListenCapturedAt();
  const weather = await fetchListenWeatherContext();
  return { captured_at, ...weather };
}
