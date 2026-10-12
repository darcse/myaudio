function retryDelayFromDetails(details: unknown): number | null {
  if (!Array.isArray(details)) return null;
  for (const item of details) {
    if (!item || typeof item !== 'object') continue;
    const raw = (item as { retryDelay?: unknown }).retryDelay;
    if (typeof raw !== 'string') continue;
    const match = raw.match(/^(\d+(?:\.\d+)?)s$/i);
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000;
  }
  return null;
}

export function parseGeminiRetryDelayMs(error: unknown): number | null {
  const err = error as {
    status?: number;
    message?: string;
    error?: { message?: string; details?: unknown };
  };
  const blobs: string[] = [];
  if (typeof err?.message === 'string' && err.message) blobs.push(err.message);
  if (typeof err?.error?.message === 'string' && err.error.message) blobs.push(err.error.message);

  const retryIn = /retry in (\d+(?:\.\d+)?)s/i;
  for (const blob of blobs) {
    const match = blob.match(retryIn);
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000;
    try {
      const parsed = JSON.parse(blob) as { error?: { message?: string; details?: unknown } };
      if (typeof parsed?.error?.message === 'string') {
        const inner = parsed.error.message.match(retryIn);
        if (inner) return Math.ceil(parseFloat(inner[1]) * 1000) + 1000;
      }
      const fromDetails = retryDelayFromDetails(parsed?.error?.details);
      if (fromDetails != null) return fromDetails;
    } catch {
    }
  }

  return retryDelayFromDetails(err?.error?.details);
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const message = err?.message ?? '';
      const is429 =
        err?.status === 429 || message.includes('429') || message.includes('Too Many Requests');
      const is503 =
        err?.status === 503 || message.includes('503') || message.includes('Service Unavailable');
      if (is429 && i < retries - 1) {
        const waitMs = parseGeminiRetryDelayMs(error) ?? 60000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      if (is503 && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export function extractJsonObjectFromText(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (fenced?.[1]) return fenced[1];
  const brace = text.match(/\{[\s\S]*\}/);
  return brace ? brace[0] : null;
}

function extractBalancedJsonSlice(text: string, open: '[' | '{'): string | null {
  const close = open === '[' ? ']' : '}';
  const start = text.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJsonArrayFromText(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) {
    const fromFence = extractBalancedJsonSlice(fenced[1].trim(), '[');
    if (fromFence) return fromFence;
  }
  return extractBalancedJsonSlice(text, '[');
}
