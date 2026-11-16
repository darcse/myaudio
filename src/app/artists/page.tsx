import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ArtistsLibraryContent } from './_components/ArtistsLibraryContent';

type ArtistsPageProps = {
  searchParams: Promise<{ role?: string; artist?: string }>;
};

export default async function ArtistsPage({ searchParams }: ArtistsPageProps) {
  const sp = await searchParams;
  if (sp.role === 'composer') {
    const params = new URLSearchParams();
    params.set('role', 'composer');
    if (sp.artist?.trim()) params.set('artist', sp.artist.trim());
    redirect(`/classic/artists?${params.toString()}`);
  }

  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <ArtistsLibraryContent catalogScope="popular" />
    </Suspense>
  );
}
