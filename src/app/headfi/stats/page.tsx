import { redirect } from 'next/navigation';

export default function HeadfiUsageStatsPage() {
  redirect('/insights?tab=usage');
}
