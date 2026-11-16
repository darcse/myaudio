const COUNTRY_OPTIONS_SOURCE = [
  { name: '한국', flag: '🇰🇷' },
  { name: '일본', flag: '🇯🇵' },
  { name: '중국', flag: '🇨🇳' },
  { name: '대만', flag: '🇹🇼' },
  { name: '미국', flag: '🇺🇸' },
  { name: '영국', flag: '🇬🇧' },
  { name: '프랑스', flag: '🇫🇷' },
  { name: '노르웨이', flag: '🇳🇴' },
  { name: '독일', flag: '🇩🇪' },
  { name: '아일랜드', flag: '🇮🇪' },
  { name: '캐나다', flag: '🇨🇦' },
  { name: '러시아', flag: '🇷🇺' },
  { name: '뉴질랜드', flag: '🇳🇿' },
  { name: '스웨덴', flag: '🇸🇪' },
  { name: '스위스', flag: '🇨🇭' },
  { name: '벨기에', flag: '🇧🇪' },
  { name: '아이슬란드', flag: '🇮🇸' },
  { name: '오스트리아', flag: '🇦🇹' },
  { name: '이탈리아', flag: '🇮🇹' },
  { name: '체코', flag: '🇨🇿' },
  { name: '폴란드', flag: '🇵🇱' },
  { name: '헝가리', flag: '🇭🇺' },
  { name: '핀란드', flag: '🇫🇮' },
  { name: '스페인', flag: '🇪🇸' },
  { name: '네덜란드', flag: '🇳🇱' },
  { name: '멕시코', flag: '🇲🇽' },
  { name: '기타', flag: '🏳️' },
] as const;

export const countryOptions = [
  ...COUNTRY_OPTIONS_SOURCE.filter((c) => c.name !== '기타').sort((a, b) =>
    a.name.localeCompare(b.name, 'ko'),
  ),
  ...COUNTRY_OPTIONS_SOURCE.filter((c) => c.name === '기타'),
] as const;

export const genreOptions = [
  'Rock', 'Metal', 'Electronic', 'Pop', 'K-Pop', 'J-Pop', 'J-Idol', 'J-Rock',
  'OST', 'Jazz', 'Classic', 'Crossover', '기타',
] as const;

export const CLASSIC_FORM_OPTIONS = [
  'Orchestral',
  'Concerto',
  'Chamber',
  'Solo',
  'Opera/Choral',
  'Stage',
  'Compilation',
] as const;

export const CLASSIC_INSTRUMENT_OPTIONS = [
  'Piano',
  'Violin',
  'Cello',
  'Orchestra',
  'Vocal',
  'Other',
] as const;

export const COMPOSER_ERA_OPTIONS = [
  '고음악 (중세·르네상스)',
  '바로크',
  '고전주의',
  '낭만주의',
  '근현대',
  '혼합 / 옴니버스',
] as const;

export const POPULAR_ARTIST_TYPE_OPTIONS = [
  '솔로',
  '아이돌',
  '밴드',
  '걸스 밴드',
  '그룹',
  '연주자',
  '음악감독',
  '기타',
] as const;

export const CLASSIC_ARTIST_TYPE_OPTIONS = ['연주자', '지휘자', '기타'] as const;

export const ARTIST_TYPE_OPTIONS = [
  '솔로',
  '아이돌',
  '밴드',
  '걸스 밴드',
  '그룹',
  '연주자',
  '지휘자',
  '음악감독',
  '기타',
] as const;

export function artistTypeOptionsForCatalog(scope: 'popular' | 'classic') {
  return scope === 'classic' ? CLASSIC_ARTIST_TYPE_OPTIONS : POPULAR_ARTIST_TYPE_OPTIONS;
}

export function isClassicFormOption(value: string | null | undefined): boolean {
  return !!value && (CLASSIC_FORM_OPTIONS as readonly string[]).includes(value);
}

export function isClassicInstrumentOption(value: string | null | undefined): boolean {
  return !!value && (CLASSIC_INSTRUMENT_OPTIONS as readonly string[]).includes(value);
}

export const albumYearOptions = [
  '2026',
  '2025',
  '2020 ~ 2024',
  '2010 ~ 2019',
  '2000 ~ 2009',
  '~1999',
  '기간 전체',
] as const;
