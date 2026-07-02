import { Suspense } from 'react';
import { AlbumStatsContent } from './_components/AlbumStatsContent';

export default function AlbumStatsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <AlbumStatsContent />
    </Suspense>
  );
}
