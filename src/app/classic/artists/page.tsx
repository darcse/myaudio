import { Suspense } from 'react';
import { ArtistsLibraryContent } from '@/app/artists/_components/ArtistsLibraryContent';

export default function ClassicArtistsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <ArtistsLibraryContent catalogScope="classic" />
    </Suspense>
  );
}
