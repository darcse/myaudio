import { NextRequest, NextResponse } from 'next/server';
import { generateArtistBio } from '@/lib/openaiArtistBio';
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
    const role = body.role === 'composer' ? 'composer' : 'artist';

    const supabase = await createClient();

    let meta: ReturnType<typeof getArtistMetaFromAlbums>;
    if (role === 'composer') {
      const { data: albums, error: albumsError } = await supabase
        .from('album')
        .select('composer_country, composer_era, genre1, genre2')
        .eq('composer', artistName);
      if (albumsError) {
        return NextResponse.json({ error: albumsError.message }, { status: 500 });
      }
      meta = getArtistMetaFromAlbums(
        (albums ?? []).map((album) => ({
          country: typeof album.composer_country === 'string' ? album.composer_country : null,
          artist_type: typeof album.composer_era === 'string' ? album.composer_era : '작곡가',
          genre1:
            (typeof album.genre2 === 'string' && album.genre2.trim()) ||
            (typeof album.genre1 === 'string' ? album.genre1 : null),
        })),
      );
    } else {
      const { data: albums, error: albumsError } = await supabase
        .from('album')
        .select('country, artist_type, genre1')
        .eq('artist', artistName);
      if (albumsError) {
        return NextResponse.json({ error: albumsError.message }, { status: 500 });
      }
      meta = getArtistMetaFromAlbums(albums ?? []);
    }
    const generated = await generateArtistBio({
      artist_name: artistName,
      country: meta.country ?? '',
      artist_type: meta.artistType ?? '',
      genre: meta.genres.join(', '),
      role,
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
