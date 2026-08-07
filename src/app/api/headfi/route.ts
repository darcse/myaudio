import { NextRequest, NextResponse } from 'next/server';
import { saveHeadfiToDB, updateHeadfiInDB } from '@/app/headfi/actions';
import type { HeadfiFormData } from '@/app/headfi/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = body?.data as HeadfiFormData | undefined;
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const rawId = body?.id;
    const id =
      typeof rawId === 'number'
        ? rawId
        : typeof rawId === 'string'
          ? parseInt(rawId, 10)
          : NaN;

    if (Number.isFinite(id)) {
      await updateHeadfiInDB(id, data);
      return NextResponse.json({ id });
    }

    const result = await saveHeadfiToDB(data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
