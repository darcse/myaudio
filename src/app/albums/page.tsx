import { Suspense } from 'react';
import { AlbumsLibraryContent } from './_components/AlbumsLibraryContent';

export default function AlbumsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <AlbumsLibraryContent />
    </Suspense>
  );
}
