'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { CatalogScope } from '@/lib/catalogScope';
import { catalogAlbumsPath, catalogArtistsPath } from '@/lib/catalogScope';

type CatalogTabBarProps = {
  scope: CatalogScope;
};

type TabItem = {
  id: string;
  label: string;
  href: string;
  active: boolean;
};

export function CatalogTabBar({ scope }: CatalogTabBarProps) {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const albumsPath = catalogAlbumsPath(scope);
  const artistsPath = catalogArtistsPath(scope);
  const onAlbums = pathname === albumsPath || pathname.startsWith(`${albumsPath}/`);
  const onArtists = pathname === artistsPath || pathname.startsWith(`${artistsPath}/`);

  const tabs: TabItem[] =
    scope === 'classic'
      ? [
          {
            id: 'albums',
            label: '앨범',
            href: albumsPath,
            active: onAlbums,
          },
          {
            id: 'performer',
            label: '연주자',
            href: artistsPath,
            active: onArtists && role !== 'composer',
          },
          {
            id: 'composer',
            label: '원작곡가',
            href: `${artistsPath}?role=composer`,
            active: onArtists && role === 'composer',
          },
        ]
      : [
          {
            id: 'albums',
            label: '앨범',
            href: albumsPath,
            active: onAlbums,
          },
          {
            id: 'artists',
            label: '아티스트',
            href: artistsPath,
            active: onArtists,
          },
        ];

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-1.5"
      role="tablist"
      aria-label={scope === 'classic' ? 'Classic 메뉴' : 'Pop & Rock 메뉴'}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          role="tab"
          aria-selected={tab.active}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm"
          style={{
            background: tab.active ? 'var(--foreground)' : 'var(--badge-bg)',
            color: tab.active ? 'var(--background)' : 'var(--foreground)',
            border: '1px solid var(--border)',
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
