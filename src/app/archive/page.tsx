import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ year?: string }>;
};

export default async function ArchivePage({ searchParams }: Props) {
  const { year } = await searchParams;
  const qs = new URLSearchParams({ tab: 'trend' });
  if (year) qs.set('hfYear', year);
  redirect(`/insights?${qs.toString()}`);
}
