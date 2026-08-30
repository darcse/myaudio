const LOG_PREFIX = '[listen-context]';

export function listenContextLog(step: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.log(LOG_PREFIX, step, detail);
    return;
  }
  console.log(LOG_PREFIX, step);
}

export function listenContextWarn(step: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.warn(LOG_PREFIX, step, detail);
    return;
  }
  console.warn(LOG_PREFIX, step);
}

export function listenContextError(step: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.error(LOG_PREFIX, step, detail);
    return;
  }
  console.error(LOG_PREFIX, step);
}

export function truncateForLog(value: string, max = 240): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}
