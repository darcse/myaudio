'use client';

import { Suspense } from 'react';
import { LyricsLibraryContent } from './_components/LyricsLibraryContent';

export default function LyricsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <LyricsLibraryContent />
    </Suspense>
  );
}
