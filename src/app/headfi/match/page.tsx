'use client';

import { Suspense } from 'react';
import { HeadfiMatchContent } from './_components/HeadfiMatchContent';

export default function HeadfiMatchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <HeadfiMatchContent />
    </Suspense>
  );
}
