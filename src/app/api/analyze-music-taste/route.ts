import { NextResponse } from 'next/server';
import { analyzeMusicTaste } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import { fetchAllRows, selectCountOptions } from '@/lib/supabase/fetchAllRows';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await fetchAllRows<{
      genre1: string | null;
      genre2: string | null;
      country: string | null;
      release_date: string | null;
    }>(({ countExact }) =>
      supabase
        .from('album')
        .select('genre1, genre2, country, release_date', selectCountOptions(countExact)),
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (data.length === 0) {
      return NextResponse.json({ error: 'No albums found' }, { status: 404 });
    }

    const sampled = shuffle(data).slice(0, 50);
    const result = await analyzeMusicTaste(sampled);
    if (!result) {
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
