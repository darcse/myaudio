import { Suspense } from 'react';
import { AlbumsLibraryContent } from '@/app/albums/_components/AlbumsLibraryContent';

export default function RecordShelfPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <AlbumsLibraryContent physicalOwnedOnly />
    </Suspense>
  );
}
