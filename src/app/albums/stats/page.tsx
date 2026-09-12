import { redirect } from 'next/navigation';

export default function AlbumStatsPage() {
  redirect('/insights?tab=ranking');
}
