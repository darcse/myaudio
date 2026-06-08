import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { generateMonthlyReviewComment } from '@/lib/gemini';
import {
  monthlyReviewCommentQuery,
  monthlyReviewCommentUpsertPayload,
} from '@/app/archive/lib/monthly-review-query';
import { stripMonthlyCommentIntro } from '@/app/archive/lib/monthly-comment';

const MONTHLY_REVIEW_SYSTEM_INSTRUCTION = `너는 개인 음악·오디오 컬렉션 큐레이터야. 반드시 아래 섹션으로 나눠서 한국어로 코멘트해줘.

🎵 Listening :
- 감상 앨범
- 실제 앨범명, 아티스트를 구체적으로 언급
- 이달의 청취 성향, 장르 패턴, 인상적인 앨범 인사이트

🎧 Head-fi :
- 등록 기기
- 실제 브랜드, 모델명을 구체적으로 언급
- 이달 구입 기기의 성향, 카테고리 패턴 인사이트

🎶 Lyrics & Writing :
- 등록 가사
- 실제 곡 제목, 앨범명을 구체적으로 언급
- 이달 가사 등록 활동에 대한 인사이트

각 섹션은 2~3줄로 작성. 각 섹션 사이에 2줄 띔. 해당 월 데이터가 없는 섹션은 완전히 생략. 섹션끼리 절대 엮지 말 것. 수박 겉핥기식 표현 금지.
도입 문장 없이 각 섹션 본문만 작성한다. '이번 달', '한 달을 돌아보면', '이달에는' 같은 서두·마무리 문장은 쓰지 않는다. 첫 줄부터 섹션 제목(🎵 Listening : 등)으로 바로 시작한다.`;

export type MonthlyReviewTimeline = {
  albums: {
    id: number;
    album_name: string;
    artist: string | null;
    created_at: string;
    cover_image_url: string | null;
  }[];
  headfi: {
    id: number;
    brand: string | null;
    model: string | null;
    purchase_date: string;
    category: string | null;
    image_url: string | null;
  }[];
  lyrics: {
    id: number;
    title: string;
    album: string | null;
    created_at: string;
    cover_image_url: string | null;
  }[];
};

function monthUtcIsoRange(year: number, month: number): { startIso: string; endExclusiveIso: string } {
  const startIso = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const endExclusiveIso = new Date(Date.UTC(year, month, 1)).toISOString();
  return { startIso, endExclusiveIso };
}

function validYearMonth(year: number, month: number, now: Date): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12) return false;
  if (year < 2026) return false;
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  if (year > cy || (year === cy && month > cm)) return false;
  return true;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function buildUserPrompt(year: number, month: number, t: MonthlyReviewTimeline): string {
  const blocks: string[] = [`${year}년 ${month}월 활동:`, ''];
  if (t.albums.length) {
    blocks.push(
      `🎵 청취 앨범: ${t.albums.map((a) => `${stripHtml(a.album_name)} - ${(a.artist ?? '').trim()}`).join(', ')}`,
    );
  }
  if (t.headfi.length) {
    blocks.push(
      `🎧 등록 기기: ${t.headfi.map((h) => `${(h.brand ?? '').trim()} ${(h.model ?? '').trim()}`.trim()).join(', ')}`,
    );
  }
  if (t.lyrics.length) {
    blocks.push(`🎶 등록 가사: ${t.lyrics.map((l) => l.title.trim()).join(', ')}`);
  }
  return blocks.join('\n');
}

async function loadTimeline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
  month: number,
): Promise<MonthlyReviewTimeline> {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const listenStart = `${year}-${pad2(month)}-01`;
  const listenEndExclusive =
    month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;
  const { startIso, endExclusiveIso } = monthUtcIsoRange(year, month);
  const [headfiRes, lyricsRes, listenRes] = await Promise.all([
    supabase
      .from('headfi')
      .select('id,brand,model,purchase_date,category,image_url')
      .not('purchase_date', 'is', null)
      .gte('purchase_date', startIso)
      .lt('purchase_date', endExclusiveIso),
    supabase
      .from('lyrics')
      .select('id,title,album,created_at,cover_image_url')
      .gte('created_at', startIso)
      .lt('created_at', endExclusiveIso),
    supabase
      .from('album_listen_history')
      .select('album_id, listened_at')
      .gte('listened_at', listenStart)
      .lt('listened_at', listenEndExclusive)
      .order('listened_at', { ascending: true }),
  ]);
  if (headfiRes.error) throw new Error(headfiRes.error.message);
  if (lyricsRes.error) throw new Error(lyricsRes.error.message);
  if (listenRes.error) throw new Error(listenRes.error.message);

  let albums: MonthlyReviewTimeline['albums'] = [];
  const listenRows = listenRes.data ?? [];
  if (listenRows.length > 0) {
    const firstListenByAlbum = new Map<number, string>();
    for (const row of listenRows) {
      const aid = row.album_id as number;
      if (!firstListenByAlbum.has(aid)) {
        firstListenByAlbum.set(aid, String(row.listened_at).slice(0, 10));
      }
    }
    const albumIds = [...firstListenByAlbum.keys()];
    const albumFetch = await supabase
      .from('album')
      .select('id, album_name, artist, created_at, cover_image_url')
      .in('id', albumIds);
    if (albumFetch.error) throw new Error(albumFetch.error.message);
    const albumMap = new Map<number, (typeof albumFetch.data)[number]>();
    for (const row of albumFetch.data ?? []) {
      if (row.id != null) albumMap.set(row.id as number, row);
    }
    albums = albumIds
      .map((id) => {
        const al = albumMap.get(id);
        if (!al) return null;
        return {
          id: al.id as number,
          album_name: String(al.album_name ?? ''),
          artist: (al.artist as string | null) ?? null,
          created_at: firstListenByAlbum.get(id) ?? (al.created_at as string),
          cover_image_url: (al.cover_image_url as string | null) ?? null,
        };
      })
      .filter((x): x is MonthlyReviewTimeline['albums'][number] => x != null);
  }

  return {
    albums,
    headfi: (headfiRes.data ?? []) as MonthlyReviewTimeline['headfi'],
    lyrics: (lyricsRes.data ?? []) as MonthlyReviewTimeline['lyrics'],
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const y = parseInt(req.nextUrl.searchParams.get('year') ?? '', 10);
    const m = parseInt(req.nextUrl.searchParams.get('month') ?? '', 10);
    const refresh =
      req.nextUrl.searchParams.get('refresh') === '1' ||
      req.nextUrl.searchParams.get('refresh') === 'true';
    const now = new Date();
    if (!validYearMonth(y, m, now)) {
      return NextResponse.json({ error: '연도 또는 월이 올바르지 않습니다.' }, { status: 400 });
    }
    const supabase = await createClient();
    const timeline = await loadTimeline(supabase, y, m);
    const activityText = buildUserPrompt(y, m, timeline);
    const hasAny =
      timeline.albums.length + timeline.headfi.length + timeline.lyrics.length > 0;

    let comment: string | null = null;
    if (!refresh) {
      const { data: cached, error: cErr } = await monthlyReviewCommentQuery(supabase, y, m);
      if (cErr) {
        return NextResponse.json({ error: cErr.message }, { status: 500 });
      }
      const c = cached?.comment;
      if (typeof c === 'string' && c.trim() !== '') {
        comment = stripMonthlyCommentIntro(c);
      }
    }

    if (comment == null) {
      if (!hasAny) {
        comment = null;
      } else {
        const generated = await generateMonthlyReviewComment(
          y,
          m,
          activityText,
          MONTHLY_REVIEW_SYSTEM_INSTRUCTION,
        );
        if (!generated) {
          return NextResponse.json({ error: '코멘트를 생성하지 못했습니다.' }, { status: 503 });
        }
        const normalized = stripMonthlyCommentIntro(generated);
        const { error: upErr } = await supabase.from('monthly_review_comments').upsert(
          monthlyReviewCommentUpsertPayload(y, m, normalized),
          { onConflict: 'year,month,app' },
        );
        if (upErr) {
          return NextResponse.json({ error: upErr.message }, { status: 500 });
        }
        comment = normalized;
      }
    }

    return NextResponse.json({ comment, timeline });
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : '서버 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
