import Link from 'next/link';

export function ArchiveLoginPrompt() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="section-title text-xl mb-3">Archive</h1>
      <p className="text-[15px] leading-relaxed opacity-80 mb-6">
        아카이브 목록과 상세 내용을 보려면 로그인이 필요합니다.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        로그인하기
      </Link>
    </div>
  );
}
