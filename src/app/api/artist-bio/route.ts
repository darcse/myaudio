import { NextRequest, NextResponse } from 'next/server';
import { generateArtistBio } from '@/lib/gemini';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { getArtistMetaFromAlbums } from '@/app/artists/utils';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : '';
    if (!artistName) {
      return NextResponse.json({ error: 'artistName required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: albums, error: albumsError } = await supabase
      .from('album')
      .select('country, artist_type, genre1')
      .eq('artist', artistName);

    if (albumsError) {
      return NextResponse.json({ error: albumsError.message }, { status: 500 });
    }

    const meta = getArtistMetaFromAlbums(albums ?? []);
    const generated = await generateArtistBio({
      artist_name: artistName,
      country: meta.country ?? '',
      artist_type: meta.artistType ?? '',
      genre: meta.genres.join(', '),
    });

    if (!generated) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    const { data: existing } = await supabase
      .from('artists')
      .select('id')
      .eq('artist_name', artistName)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase
        .from('artists')
        .insert({ artist_name: artistName, bio: generated.bio });
      if (insertError) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
      }
    } else {
      const { error: updateError } = await supabase
        .from('artists')
        .update({ bio: generated.bio })
        .eq('artist_name', artistName);
      if (updateError) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ bio: generated.bio });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
