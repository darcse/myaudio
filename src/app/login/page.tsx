'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(
          err.message === 'Invalid login credentials'
            ? '이메일 또는 비밀번호가 올바르지 않습니다.'
            : err.message
        );
        setLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">로그인</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--muted)' }}>
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border px-4 py-2.5 text-[15px]"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--muted)' }}>
            비밀번호
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border py-2.5 pl-4 pr-12 text-[15px]"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 opacity-60 transition-opacity hover:opacity-100"
              style={{ color: 'var(--foreground)' }}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <hr className="my-8" style={{ borderColor: 'var(--border)', borderTopWidth: 1 }} />

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 font-semibold disabled:opacity-50"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </div>
      </form>
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
        <Link href="/" className="underline hover:opacity-80">돌아가기</Link>
      </p>
    </div>
  );
}
