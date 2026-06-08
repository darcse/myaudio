/** 서버: Supabase/Storage 에러를 사용자에게 보여줄 한 줄 문자열로 */
export function toSupabaseErrorMessage(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}): string {
  const parts = [error.message, error.details, error.hint]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
  if (parts.length > 0) return parts.join(' — ');
  if (typeof error.code === 'string' && error.code.trim()) return error.code;
  return '데이터베이스 요청에 실패했습니다.';
}

/** 클라이언트: Server Action 예외(Error 또는 직렬화된 PostgREST 객체) 메시지 추출 */
export function getClientErrorMessage(e: unknown): string {
  if (e == null) return '알 수 없는 오류입니다.';
  if (typeof e === 'string' && e.trim()) return e.trim();
  if (e instanceof Error && e.message.trim()) return e.message.trim();
  if (typeof e !== 'object') return String(e);
  const o = e as Record<string, unknown>;
  const parts = [o.message, o.details, o.hint]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
  if (parts.length > 0) return parts.join(' — ');
  if (typeof o.code === 'string' && o.code.trim()) return `코드: ${o.code}`;
  try {
    return JSON.stringify(o);
  } catch {
    return '오류가 발생했습니다.';
  }
}
