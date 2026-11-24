import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUCKET = 'lyrics-covers';
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function loadEnvLocal() {
  const path = join(root, '.env.local');
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseDataUrl(value) {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(value);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = MIME_EXT[mime];
  if (!ext) return { mime, ext: null, buffer: null };
  return { mime, ext, buffer: Buffer.from(match[2], 'base64') };
}

async function main() {
  const apply = process.argv.includes('--apply');
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, key);
  const { data: rows, error } = await supabase
    .from('album')
    .select('id, album_name, cover_image_url')
    .like('cover_image_url', 'data:%')
    .order('id', { ascending: true });
  if (error) {
    console.error(`조회 실패: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(apply ? '모드: --apply (업로드 + DB 갱신)' : '모드: dry-run (변경 없음)');
  console.log(`대상: ${rows.length}건`);

  const results = [];
  for (const row of rows) {
    const parsed = parseDataUrl(row.cover_image_url);
    if (!parsed || !parsed.buffer) {
      console.log(`- id=${row.id} 건너뜀: 지원하지 않는 data URL (${parsed?.mime ?? '형식 오류'})`);
      continue;
    }
    const storagePath = `album-cover/migrated/${row.id}-${Date.now()}.${parsed.ext}`;
    const sizeKb = (parsed.buffer.length / 1024).toFixed(1);
    console.log(`- id=${row.id} "${row.album_name}" ${parsed.mime} ${sizeKb}KB → ${BUCKET}/${storagePath}`);
    if (!apply) continue;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    });
    if (uploadError) {
      console.error(`  업로드 실패: ${uploadError.message}`);
      continue;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const { data: updated, error: updateError } = await supabase
      .from('album')
      .update({ cover_image_url: pub.publicUrl })
      .eq('id', row.id)
      .like('cover_image_url', 'data:%')
      .select('id');
    if (updateError) {
      console.error(`  DB 갱신 실패: ${updateError.message}`);
      continue;
    }
    if (!updated || updated.length === 0) {
      console.log('  DB 갱신 건너뜀: 이미 data URL이 아님');
      continue;
    }
    results.push({ id: row.id, url: pub.publicUrl });
  }

  if (apply) {
    console.log(`완료: ${results.length}건`);
    for (const item of results) console.log(`  ${item.id} → ${item.url}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
