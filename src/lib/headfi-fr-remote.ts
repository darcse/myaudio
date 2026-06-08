const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0') return true;
  if (h.endsWith('.local')) return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

export function isAllowedPublicImageUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (isBlockedHostname(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export async function fetchRemoteImageBytes(
  urlString: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!isAllowedPublicImageUrl(urlString)) return null;

  let origin: string;
  let hostname: string;
  try {
    const u = new URL(urlString);
    origin = u.origin;
    hostname = u.hostname.toLowerCase();
  } catch {
    return null;
  }

  const refererForHost = (): string => {
    if (hostname.includes('redd.it') || hostname.includes('reddit.com')) {
      return 'https://www.reddit.com/';
    }
    if (hostname.includes('imgur.com')) {
      return 'https://imgur.com/';
    }
    if (hostname.includes('discordapp.com') || hostname.includes('discord.com')) {
      return 'https://discord.com/';
    }
    return `${origin}/`;
  };

  const tryFetch = async (referer: string) => {
    return fetch(urlString, {
      redirect: 'follow',
      signal: AbortSignal.timeout(35_000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        Referer: referer,
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    });
  };

  try {
    const primaryRef = refererForHost();
    let res = await tryFetch(primaryRef);
    if (!res.ok) {
      res = await tryFetch(`${origin}/`);
    }
    if (!res.ok) return null;

    const cl = res.headers.get('content-length');
    if (cl) {
      const n = parseInt(cl, 10);
      if (Number.isFinite(n) && n > MAX_IMAGE_BYTES) return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;

    let mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!mime.startsWith('image/')) {
      const sniffed = sniffImageMime(buf);
      mime = sniffed ?? '';
    }
    if (!mime.startsWith('image/')) return null;
    if (mime.includes('svg')) return null;

    return { buffer: buf, mimeType: mime };
  } catch {
    return null;
  }
}
