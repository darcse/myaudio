import { Suspense } from 'react';
import { HeadfiUsageStatsContent } from './_components/HeadfiUsageStatsContent';

export default function HeadfiUsageStatsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center opacity-70">로딩 중...</div>}>
      <HeadfiUsageStatsContent />
    </Suspense>
  );
}
