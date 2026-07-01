import { Suspense } from 'react';
import { HeadfiMapContent } from './_components/HeadfiMapContent';

export default function HeadfiMapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <HeadfiMapContent />
    </Suspense>
  );
}
