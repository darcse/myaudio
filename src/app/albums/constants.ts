export const countryOptions = [
  { name: '한국', flag: '🇰🇷' },
  { name: '일본', flag: '🇯🇵' },
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
  { name: '벨기에', flag: '🇧🇪' },
  { name: '아이슬란드', flag: '🇮🇸' },
  { name: '기타', flag: '🏳️' },
] as const;

export const genreOptions = [
  'Rock', 'Metal', 'Electronic', 'Pop', 'K-Pop', 'J-Pop', 'J-Idol', 'J-Rock',
  'OST', 'Jazz', 'Classic', '기타',
] as const;

export const albumYearOptions = [
  '2026',
  '2025',
  '2020 ~ 2024',
  '2010 ~ 2019',
  '2000 ~ 2009',
  '~1999',
  'All Time',
] as const;
