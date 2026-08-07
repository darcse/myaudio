import { NextRequest, NextResponse } from 'next/server';
import { uploadHeadfiFrGraphImage } from '@/app/headfi/actions';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    const url = await uploadHeadfiFrGraphImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
