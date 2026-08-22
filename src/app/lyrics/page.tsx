import { Suspense } from 'react';
import { LyricsTranslateLibraryContent } from './_components/LyricsTranslateLibraryContent';

export default function LyricsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <LyricsTranslateLibraryContent />
    </Suspense>
  );
}
