import { Suspense } from 'react';
import { HeadfiCombosContent } from './_components/HeadfiCombosContent';

export default function HeadfiCombosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <HeadfiCombosContent />
    </Suspense>
  );
}
