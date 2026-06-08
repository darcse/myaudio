'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Home, Menu, PenLine, TrendingUp, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { ThemeToggle } from '@/components/ThemeToggle';

type NavItem = { name: string; path: string };

const navItems: NavItem[] = [
  { name: 'Albums', path: '/albums' },
  { name: 'Head-fi', path: '/headfi' },
  { name: 'Lyrics', path: '/lyrics' },
  { name: 'Archive', path: '/archive' },
];

const externalLinks = [
  { name: 'Home', href: 'https://sshlove.com', Icon: Home },
  { name: 'Books', href: 'https://books.sshlove.com', Icon: BookOpen },
  { name: 'PenLine', href: 'https://sshwrite.com', Icon: PenLine },
  { name: 'My Stock', href: 'https://mystock-mu.vercel.app/stocks', Icon: TrendingUp },
] as const;

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  }, [router]);

  const getActive = useCallback(
    (path: string) =>
      pathname === path ||
      (path !== '/' && pathname?.startsWith(path)),
    [pathname]
  );

  const navLinks = useMemo(
    () =>
      navItems.map((item) => {
        const active = getActive(item.path);
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`font-medium transition-colors duration-200 whitespace-nowrap ${
              active ? 'opacity-100' : 'opacity-60 hover:opacity-100'
            }`}
            style={{ color: 'var(--foreground)' }}
          >
            {item.name}
          </Link>
        );
      }),
    [getActive]
  );

  return (
    <nav
      className="sticky top-0 z-50 border-b transition-colors duration-300 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--card-bg)/0.92]"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div className="flex h-14 items-center justify-between gap-3">
          <Link
            href="/"
            className="text-[17px] font-semibold tracking-tight transition-opacity hover:opacity-80 shrink-0 min-w-0"
            style={{ color: 'var(--foreground)' }}
          >
            MyAudio
          </Link>

          <div className="hidden lg:flex flex-1 items-center justify-between min-w-0 ml-10">
            <div className="flex gap-7 text-[14px] flex-wrap">{navLinks}</div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-1.5">
                {externalLinks.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_self"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-[var(--badge-bg)]"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)',
                    }}
                    aria-label={name}
                    title={name}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </a>
                ))}
              </div>

              <ThemeToggle />

              {isAuthenticated !== null &&
                (isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-[13px] font-medium opacity-70 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--foreground)' }}
                  >
                    로그아웃
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--foreground)' }}
                    aria-label="로그인"
                    title="로그인"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  </Link>
                ))}
            </div>
          </div>

          <button
            type="button"
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] opacity-80 hover:opacity-100 transition-opacity shrink-0"
            style={{ color: 'var(--foreground)' }}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            {mobileMenuOpen ? (
              <X className="size-5" strokeWidth={2} />
            ) : (
              <Menu className="size-5" strokeWidth={2} />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-x-0 bottom-0 top-14 bg-black/40 z-[45] lg:hidden"
              aria-label="메뉴 닫기"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              id="mobile-nav-menu"
              className="lg:hidden absolute left-0 right-0 top-full z-[55] border-b shadow-lg max-h-[min(70vh,calc(100dvh-3.5rem))] overflow-y-auto"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--card-bg)',
              }}
            >
              <div className="px-4 py-3 flex flex-col gap-0.5">
                {navItems.map((item) => {
                  const active = getActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`font-medium text-[15px] py-3 px-3 rounded-xl transition-colors ${
                        active
                          ? 'bg-[var(--badge-bg)] opacity-100'
                          : 'opacity-70 hover:opacity-100 hover:bg-[var(--badge-bg)]'
                      }`}
                      style={{ color: 'var(--foreground)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  );
                })}

                <div className="border-t my-2 pt-3 pb-1" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-semibold opacity-50 uppercase tracking-wide mb-2 px-3">
                    테마
                  </p>
                  <div className="px-3 flex items-center gap-3">
                    <ThemeToggle />
                  </div>
                </div>

                <div className="border-t pt-3 pb-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-semibold opacity-50 uppercase tracking-wide mb-2 px-3">
                    계정
                  </p>
                  <div className="px-3">
                    {isAuthenticated !== null &&
                      (isAuthenticated ? (
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="text-[15px] font-medium opacity-80 hover:opacity-100 py-3 px-3 rounded-xl w-full text-left hover:bg-[var(--badge-bg)] transition-colors"
                          style={{ color: 'var(--foreground)' }}
                        >
                          로그아웃
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          className="flex items-center gap-3 text-[15px] font-medium opacity-80 hover:opacity-100 py-3 px-3 rounded-xl hover:bg-[var(--badge-bg)] transition-colors"
                          style={{ color: 'var(--foreground)' }}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border)]">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                              <polyline points="10 17 15 12 10 7" />
                              <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                          </span>
                          로그인
                        </Link>
                      ))}
                  </div>
                </div>

                <div className="border-t pt-3 pb-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[11px] font-semibold opacity-50 uppercase tracking-wide mb-2 px-3">
                    외부 앱
                  </p>
                  <div className="px-3 flex items-center gap-2 flex-wrap">
                    {externalLinks.map(({ name, href, Icon }) => (
                      <a
                        key={name}
                        href={href}
                        target="_self"
                        rel="noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-[var(--badge-bg)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                        aria-label={name}
                        title={name}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon size={16} strokeWidth={2} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

