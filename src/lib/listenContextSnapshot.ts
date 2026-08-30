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

function geolocationErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return String(err);
}

type GeoAttempt = {
  label: string;
  timeout: number;
  maximumAge: number;
  enableHighAccuracy: boolean;
};

const GEO_ATTEMPTS: GeoAttempt[] = [
  { label: 'cached-low', timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
  { label: 'fresh-high', timeout: 15000, maximumAge: 0, enableHighAccuracy: true },
  { label: 'fresh-low', timeout: 15000, maximumAge: 0, enableHighAccuracy: false },
];

function getCurrentPositionAttempt(attempt: GeoAttempt): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: attempt.timeout,
      maximumAge: attempt.maximumAge,
      enableHighAccuracy: attempt.enableHighAccuracy,
    });
  });
}

function watchGeolocationPosition(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let lastError: GeolocationPositionError | null = null;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timer);
        resolve(position);
      },
      (error) => {
        lastError = error;
      },
      {
        timeout: timeoutMs,
        maximumAge: 0,
        enableHighAccuracy: true,
      },
    );
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      reject(lastError ?? ({ code: 3, message: 'watch timeout' } as GeolocationPositionError));
    }, timeoutMs);
  });
}

async function requestGeolocationPosition(): Promise<GeolocationPosition> {
  let lastError: GeolocationPositionError | null = null;

  for (const attempt of GEO_ATTEMPTS) {
    listenContextLog('geo attempt', { strategy: attempt.label });
    try {
      const position = await getCurrentPositionAttempt(attempt);
      listenContextLog('geo attempt success', { strategy: attempt.label });
      return position;
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      lastError = geoError;
      listenContextWarn('geo attempt failed', {
        strategy: attempt.label,
        code: geoError.code,
        reason: geolocationErrorLabel(geoError.code),
        message: geolocationErrorMessage(err),
      });
      if (geoError.code === 1) throw geoError;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  listenContextLog('geo watch fallback start');
  try {
    const position = await watchGeolocationPosition(15000);
    listenContextLog('geo watch fallback success');
    return position;
  } catch (err) {
    const geoError = err as GeolocationPositionError;
    listenContextWarn('geo watch fallback failed', {
      code: geoError.code,
      reason: geolocationErrorLabel(geoError.code),
      message: geolocationErrorMessage(err),
    });
    throw lastError ?? geoError;
  }
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
    const position = await requestGeolocationPosition();
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
      message: geolocationErrorMessage(err),
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
