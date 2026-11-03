'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Home, LogIn, LogOut, Menu, RefreshCw, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { ThemeToggle } from '@/components/ThemeToggle';

type NavItem = { name: string; path: string };

const navItems: NavItem[] = [
  { name: 'Albums', path: '/albums' },
  { name: 'Artists', path: '/artists' },
  { name: 'Lyrics', path: '/lyrics' },
  { name: 'RecordShelf', path: '/recordshelf' },
  { name: 'Head-fi', path: '/headfi' },
  { name: 'Works', path: '/works' },
  { name: 'Insights', path: '/insights' },
];

const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:bg-[var(--badge-bg)]';

const HOME_EXTERNAL_HREF = 'https://sshlove.com';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reloading, setReloading] = useState(false);

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

  const handleReload = useCallback(() => {
    if (reloading) return;
    setReloading(true);
    window.location.reload();
  }, [reloading]);

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
        <div className="flex h-[var(--app-header-height)] items-center justify-between gap-3">
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
                <button
                  type="button"
                  onClick={handleReload}
                  disabled={reloading}
                  aria-busy={reloading}
                  className={`${iconButtonClass} disabled:pointer-events-none disabled:opacity-50`}
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  aria-label="새로고침"
                  title="새로고침"
                >
                  <RefreshCw
                    size={16}
                    strokeWidth={2}
                    className={reloading ? 'animate-spin' : undefined}
                  />
                </button>
                <a
                  href={HOME_EXTERNAL_HREF}
                  target="_self"
                  rel="noreferrer"
                  className={iconButtonClass}
                  style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  aria-label="Home"
                  title="Home"
                >
                  <Home size={16} strokeWidth={2} />
                </a>
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
              className="fixed inset-x-0 top-[var(--app-header-height)] z-[45] h-[calc(100dvh-var(--app-header-height))] bg-black/40 lg:hidden"
              aria-label="메뉴 닫기"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              id="mobile-nav-menu"
              className="fixed inset-x-0 top-[var(--app-header-height)] z-[55] flex h-[calc(100dvh-var(--app-header-height))] flex-col shadow-lg lg:hidden"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--card-bg)',
              }}
            >
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-4 py-3">
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
              </div>

              <div
                className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleReload();
                    }}
                    disabled={reloading}
                    aria-busy={reloading}
                    className={`${iconButtonClass} disabled:pointer-events-none disabled:opacity-50`}
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    aria-label="새로고침"
                    title="새로고침"
                  >
                    <RefreshCw
                      size={16}
                      strokeWidth={2}
                      className={reloading ? 'animate-spin' : undefined}
                    />
                  </button>
                  <a
                    href={HOME_EXTERNAL_HREF}
                    target="_self"
                    rel="noreferrer"
                    className={iconButtonClass}
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    aria-label="Home"
                    title="Home"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Home size={16} strokeWidth={2} />
                  </a>
                </div>

                {isAuthenticated !== null &&
                  (isAuthenticated ? (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className={iconButtonClass}
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      aria-label="로그아웃"
                      title="로그아웃"
                    >
                      <LogOut size={16} strokeWidth={2} />
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className={iconButtonClass}
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      aria-label="로그인"
                      title="로그인"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LogIn size={16} strokeWidth={2} />
                    </Link>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

