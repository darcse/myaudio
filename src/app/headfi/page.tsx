'use client';

import { Suspense } from 'react';
import { HeadfiLibraryContent } from './_components/HeadfiLibraryContent';

export default function HeadfiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <HeadfiLibraryContent />
    </Suspense>
  );
}
