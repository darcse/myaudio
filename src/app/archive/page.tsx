import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ year?: string }>;
};

export default async function ArchivePage({ searchParams }: Props) {
  const sp = await searchParams;
  const year = sp.year?.trim();
  if (year) {
    redirect(`/insights?tab=archive&year=${encodeURIComponent(year)}`);
  }
  redirect('/insights?tab=archive');
}
