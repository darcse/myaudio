import { Suspense } from 'react';
import { ArtistsLibraryContent } from './_components/ArtistsLibraryContent';

export default function ArtistsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <ArtistsLibraryContent />
    </Suspense>
  );
}
