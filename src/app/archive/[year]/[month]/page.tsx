import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ year: string; month: string }>;
};

export default async function ArchiveMonthRedirectPage({ params }: Props) {
  const { year, month } = await params;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const qs = new URLSearchParams({ tab: 'trend' });
  if (Number.isInteger(y)) qs.set('hfYear', String(y));
  if (Number.isInteger(m) && m >= 1 && m <= 12) qs.set('hfMonth', String(m));
  redirect(`/insights?${qs.toString()}`);
}
