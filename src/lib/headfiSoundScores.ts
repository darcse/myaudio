export type HeadfiSoundScores = {
  brand: string;
  model: string;
  category: string;
  bass_quantity: number | null | undefined;
  bass_depth: number | null | undefined;
  bass_speed: number | null | undefined;
  dynamics_slam: number | null | undefined;
  midrange_body: number | null | undefined;
  tone_warmth: number | null | undefined;
  vocal_position: number | null | undefined;
  midrange_clarity: number | null | undefined;
  treble_brightness: number | null | undefined;
  treble_smoothness: number | null | undefined;
  treble_airiness: number | null | undefined;
  resolution: number | null | undefined;
  separation: number | null | undefined;
  soundstage: number | null | undefined;
  imaging: number | null | undefined;
  timbre: number | null | undefined;
};

function formatSoundScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return String(value);
}

export function buildHeadfiSoundScoresPromptBlock(headfi: HeadfiSoundScores): string | null {
  if (!headfiHasSoundScores(headfi)) return null;
  return `[청음 평가 점수 (10점 만점)]
저역 - 양감:${formatSoundScore(headfi.bass_quantity)} 깊이:${formatSoundScore(headfi.bass_depth)} 속도:${formatSoundScore(headfi.bass_speed)}
중역 - 다이내믹스:${formatSoundScore(headfi.dynamics_slam)} 두께감:${formatSoundScore(headfi.midrange_body)} 온기:${formatSoundScore(headfi.tone_warmth)} 보컬위치:${formatSoundScore(headfi.vocal_position)} 명료도:${formatSoundScore(headfi.midrange_clarity)}
고역 - 밝기:${formatSoundScore(headfi.treble_brightness)} 부드러움:${formatSoundScore(headfi.treble_smoothness)} 공기감:${formatSoundScore(headfi.treble_airiness)}
기술 - 해상력:${formatSoundScore(headfi.resolution)} 분리도:${formatSoundScore(headfi.separation)} 음장:${formatSoundScore(headfi.soundstage)} 이미징:${formatSoundScore(headfi.imaging)} 음색:${formatSoundScore(headfi.timbre)}`;
}

export function headfiHasSoundScores(scores: HeadfiSoundScores): boolean {
  const values = [
    scores.bass_quantity,
    scores.bass_depth,
    scores.bass_speed,
    scores.dynamics_slam,
    scores.midrange_body,
    scores.tone_warmth,
    scores.vocal_position,
    scores.midrange_clarity,
    scores.treble_brightness,
    scores.treble_smoothness,
    scores.treble_airiness,
    scores.resolution,
    scores.separation,
    scores.soundstage,
    scores.imaging,
    scores.timbre,
  ];
  return values.some((v) => v != null && Number(v) > 0);
}
