import { Suspense } from 'react';
import { AlbumDiaryContent } from './_components/AlbumDiaryContent';

export default function AlbumDiaryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <AlbumDiaryContent />
    </Suspense>
  );
}
