import type { Headfi } from '@/app/headfi/types';
import { formatVrms, formatDacAmpSpecsForPrompt } from '@/app/headfi/dacAmpSpec';
import { formatComboConnectionSuffix } from '@/app/headfi/headfiComboUtils';
import { formatFrInterpretationForPrompt } from '@/lib/headfiAlbumMatch';
import { buildHeadfiSoundScoresPromptBlock } from '@/lib/headfiSoundScores';
import { shuffleArray } from '@/lib/utils';

export { parseFrInterpretationSummary } from '@/lib/headfiAlbumMatch';

export type HeadfiMatchScoreMode = 'dac_amp' | 'headphone';

export const HEADFI_CATEGORY_OPTIONS = [
  '헤드폰',
  '이어폰',
  '무선 헤드폰',
  '무선 이어폰',
  '스피커',
  'DAC',
  'AMP',
  'DAC/AMP',
  'DAP',
  'Source',
  '기타',
] as const;

/** 판매관리 전용 — 기기 카테고리 + 독립 액세서리(headfi_accessories) */
export const HEADFI_SALE_ACCESSORY_CATEGORY = '액세서리' as const;
/** 과거 표기(악세서리) — 기존 headfi_sales 행 조회 호환 */
export const HEADFI_SALE_ACCESSORY_CATEGORY_LEGACY = '악세서리' as const;

export function isHeadfiSaleAccessoryCategory(category: string | null | undefined): boolean {
  const value = (category ?? '').trim();
  return value === HEADFI_SALE_ACCESSORY_CATEGORY || value === HEADFI_SALE_ACCESSORY_CATEGORY_LEGACY;
}

export const HEADFI_SALE_CATEGORY_OPTIONS = [
  ...HEADFI_CATEGORY_OPTIONS,
  HEADFI_SALE_ACCESSORY_CATEGORY,
] as const;

export const DAC_AMP_ONLY_CATEGORIES = ['DAC', 'AMP', 'DAC/AMP'] as const;
export const DAC_AMP_DAP_CATEGORIES = ['DAC', 'AMP', 'DAC/AMP', 'DAP'] as const;
export const WIRED_HP_IEM_CATEGORIES = ['헤드폰', '이어폰'] as const;

export function isDacAmpOnlyCategory(category: string | null | undefined): boolean {
  return category === 'DAC' || category === 'AMP' || category === 'DAC/AMP';
}

export function isDacAmpDapCategory(category: string | null | undefined): boolean {
  return category === 'DAC' || category === 'AMP' || category === 'DAC/AMP' || category === 'DAP';
}

export function isWiredHeadphoneEarphoneCategory(category: string | null | undefined): boolean {
  return category === '헤드폰' || category === '이어폰';
}

export type CompressedCandidate = {
  id: number;
  name: string;
  connector: string;
  rkOrImpedance: string;
  db1: string;
  vrms32: string;
  vrms300: string;
  low: string;
  mid: string;
  high: string;
  musicality: string;
  trait_warmth: string;
  trait_brightness: string;
  trait_vocal_position: string;
  trait_bass_decay: string;
};

function deviceName(brand: string | null, model: string | null): string {
  return `${brand ?? ''} ${model ?? ''}`.trim() || '-';
}

export function formatExactGearName(item: Headfi): string {
  return deviceName(item.brand, item.model);
}

function formatScoreOrDash(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return String(value);
}

function avgScoreOrDash(...values: (number | null | undefined)[]): string {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(Number(v)));
  if (nums.length === 0) return '-';
  const sum = nums.reduce((acc, v) => acc + Number(v), 0);
  return String(Math.round((sum / nums.length) * 10) / 10);
}

export function compressHeadfiAudioBands(item: Headfi): { low: string; mid: string; high: string } {
  return {
    low: avgScoreOrDash(item.bass_quantity, item.bass_depth, item.bass_control),
    mid: avgScoreOrDash(item.midrange_body),
    high: avgScoreOrDash(item.treble_airiness, item.treble_smoothness),
  };
}

export function formatGenres(genres: string[] | null | undefined, max = 3): string {
  if (!Array.isArray(genres) || genres.length === 0) return '-';
  return genres.slice(0, max).join(', ');
}

export function compressCandidateRow(item: Headfi): CompressedCandidate {
  const isWired = isWiredHeadphoneEarphoneCategory(item.category);
  const isDacSide = isDacAmpDapCategory(item.category);
  const bands = isWired ? compressHeadfiAudioBands(item) : null;
  const rkOrImpedance = isDacSide
    ? item.output_impedance != null && Number.isFinite(Number(item.output_impedance))
      ? String(item.output_impedance)
      : '-'
    : item.impedance != null && Number.isFinite(Number(item.impedance))
      ? String(item.impedance)
      : '-';
  const db1 =
    item.db1 != null && Number.isFinite(Number(item.db1)) ? String(item.db1) : '-';
  const vrms32 = isDacSide ? formatVrms(item.vrms_bal) || '-' : '-';
  const vrms300 = isDacSide ? formatVrms(item.vrms_single) || '-' : '-';

  return {
    id: item.id,
    name: deviceName(item.brand, item.model),
    connector: isWired ? item.connector?.trim() || '-' : '-',
    rkOrImpedance,
    db1,
    vrms32,
    vrms300,
    low: bands ? bands.low : '-',
    mid: bands ? bands.mid : '-',
    high: bands ? bands.high : '-',
    musicality: isWired ? formatScoreOrDash(item.musicality) : '-',
    trait_warmth: isWired ? formatScoreOrDash(item.trait_warmth) : '-',
    trait_brightness: isWired ? formatScoreOrDash(item.trait_brightness) : '-',
    trait_vocal_position: isWired ? formatScoreOrDash(item.trait_vocal_position) : '-',
    trait_bass_decay: isWired ? formatScoreOrDash(item.trait_bass_decay) : '-',
  };
}

export function candidateLine(row: CompressedCandidate): string {
  return `${row.id}|${row.name}|${row.connector}|${row.rkOrImpedance}|${row.db1}|${row.vrms32}|${row.vrms300}|${row.low}|${row.mid}|${row.high}|${row.musicality}|${row.trait_warmth}|${row.trait_brightness}|${row.trait_vocal_position}|${row.trait_bass_decay}`;
}

export function pickCandidates(items: Headfi[], limit = 20): Headfi[] {
  return shuffleArray(items).slice(0, limit);
}

export function buildHeadphoneListeningContextForPrompt(item: Headfi): string | null {
  if (!isWiredHeadphoneEarphoneCategory(item.category)) return null;

  const parts: string[] = [];
  const scoresBlock = buildHeadfiSoundScoresPromptBlock(item);
  if (scoresBlock) parts.push(scoresBlock);

  const ai = item.ai_sound_analysis?.trim();
  if (ai) parts.push(`[청음 평가 AI 분석] ${ai}`);

  const fr = formatFrInterpretationForPrompt(item.fr_interpretation);
  if (fr) parts.push(`[FR 그래프 분석] ${fr}`);

  if (parts.length === 0) return null;
  return `[${deviceName(item.brand, item.model)} | id:${item.id}]\n${parts.join('\n')}`;
}

export function buildHeadphoneListeningContextSections(items: Headfi[]): string | null {
  const blocks = items
    .map((item) => buildHeadphoneListeningContextForPrompt(item))
    .filter((block): block is string => Boolean(block));
  if (blocks.length === 0) return null;
  return `[후보 헤드폰/이어폰 청음·FR 상세 (있는 항목만)]\n\n${blocks.join('\n\n')}`;
}

function buildComboGearSpecBlock(
  item: Headfi,
  slotLabel: string,
  options?: { forceOutputSpecs?: boolean },
): string {
  const exactName = formatExactGearName(item);
  const lines = [
    `[${slotLabel}] 정확한 모델명: "${exactName}" | DB카테고리: ${item.category}`,
  ];
  if (isDacAmpDapCategory(item.category) || options?.forceOutputSpecs) {
    const specs = formatDacAmpSpecsForPrompt(item);
    lines.push(
      `  구동방식/등급:${specs.driveGrade} | Chipset:${specs.chipset} | Rk:${specs.rk} | Vrms@32Ω:${specs.vrms32} | Vrms@300Ω:${specs.vrms300}`,
    );
  }
  return lines.join('\n');
}

export type ComboPathLinks = {
  source_media?: string | null;
  source_link?: string | null;
  device_link?: string | null;
};

function trimPathLink(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function hasAnyComboPathLink(links?: ComboPathLinks | null): boolean {
  if (!links) return false;
  return Boolean(
    trimPathLink(links.source_media) ||
      trimPathLink(links.source_link) ||
      trimPathLink(links.device_link),
  );
}

function buildSourceMediaRuleLine(media: string): string | null {
  if (!media) return null;
  const analogNote =
    media === 'LP' || media === 'Cassette'
      ? ' 아날로그 매체 특성(노이즈·대역·다이나믹)을 고려할 것.'
      : '';
  return `- 소스 재생 매체: ${media}.${analogNote}`;
}

function buildSourceLinkRuleLine(sourceLink: string, sourceName: string, name1: string): string | null {
  if (!sourceLink) return null;
  if (sourceLink === 'USB' || sourceLink === '광(옵티컬)' || sourceLink === '동축') {
    return `- 소스→기기 1 연결: ${sourceLink}(디지털). 소스 "${sourceName}"는 디지털 전송만 담당하고, DAC 변환은 기기 1 "${name1}"이 담당.`;
  }
  if (sourceLink === '아날로그 라인아웃') {
    return `- 소스→기기 1 연결: 아날로그 라인아웃. 소스 "${sourceName}"의 DAC·아날로그 음색이 반영됨.`;
  }
  if (sourceLink === '포노 아웃') {
    return `- 소스→기기 1 연결: 포노 아웃. 소스 "${sourceName}"는 포노 레벨(RIAA 미보정) 신호를 출력하므로 기기 1 "${name1}"이 포노 앰프(증폭·RIAA 보정) 역할을 하는 것으로 해석하고, 기기 1에 포노 입력이 없으면 매칭이 성립하기 어려운 점을 감안.`;
  }
  if (sourceLink === '블루투스') {
    return `- 소스→기기 1 연결: 블루투스(무선). 코덱 손실 가능성을 고려.`;
  }
  if (sourceLink === 'AirPlay') {
    return `- 소스→기기 1 연결: AirPlay(무선, 최대 16bit/44.1kHz ALAC 무손실 전송). 블루투스보다 손실이 적음.`;
  }
  return `- 소스→기기 1 연결: ${sourceLink}.`;
}

function buildDeviceLinkAnalogNote(deviceLink: string): string | null {
  if (!deviceLink) return null;
  if (deviceLink === 'XLR' || deviceLink === '4.4mm to 4.4mm') {
    return `- 기기 간 연결: ${deviceLink}(밸런스 아날로그 전송). 기기 1 DAC → 기기 2 AMP 역할은 위와 동일.`;
  }
  if (deviceLink === 'RCA') {
    return `- 기기 간 연결: RCA(아날로그 전송). 기기 1 DAC → 기기 2 AMP 역할은 위와 동일.`;
  }
  return null;
}

function buildDualChainRoleBlock(
  select1: Headfi,
  select2: Headfi,
  deviceLink: string = '',
): string {
  const name1 = formatExactGearName(select1);
  const name2 = formatExactGearName(select2);
  if (deviceLink === '블루투스') {
    return `[신호 경로 해석 규칙 — 2기기 조합]
- 기기 간 연결: 블루투스(무선).
- 기기 1 "${name1}": 무선 송신(동글 등)만 담당. DAC·AMP·헤드폰 구동으로 해석하지 말 것.
- 기기 2 "${name2}": DAC·AMP 모두 담당. 무선 수신→DAC→헤드폰 구동. drive·Vrms·Rk·출력 여유는 기기 2 기준으로 평가.
- "${name1}"를 DAC로, "${name2}"를 AMP만으로 해석하지 말 것.`;
  }
  const device1Line =
    select1.category === 'Source'
      ? `- 기기 1 "${name1}": 소스 기기(재생·라인 출력). 디지털 입력→아날로그 라인아웃 출력만 담당. 헤드폰 직접 구동·헤드폰단 앰핑은 하지 않음.`
      : `- 기기 1 "${name1}": DAC 전용. 디지털 입력→아날로그 라인아웃 출력만 담당. 헤드폰 직접 구동·헤드폰단 앰핑은 하지 않음.`;
  const base = `[신호 경로 해석 규칙 — 2기기 조합]
${device1Line}
- 기기 2 "${name2}": AMP. 기기 1 라인아웃→헤드폰 구동. drive·Vrms·Rk·출력 여유는 기기 2 기준으로 평가.
- "${name1}"와 "${name2}"를 각각 독립 앰프 2대로 해석하거나, 기기 1을 DAC/AMP 겸용으로 가정하지 말 것.`;
  const analogNote = buildDeviceLinkAnalogNote(deviceLink);
  return analogNote ? `${base}\n${analogNote}` : base;
}

function buildSourceDeviceSoloPathRoleBlock(select1: Headfi): string {
  const name1 = formatExactGearName(select1);
  return `[신호 경로 해석 규칙 — 소스 기기 단독]
- 기기 1 "${name1}": 소스 기기로 재생과 헤드폰 직접 구동을 모두 담당. drive·Vrms·Rk·출력 여유는 기기 1 출력 기준으로 평가.
- 별도 DAC/AMP 단을 가정하지 말 것.`;
}

function buildSourceGearSpecBlock(source: Headfi): string {
  const slotLabel =
    source.category === 'DAP'
      ? '소스 — DAP(재생·출력, 헤드폰 구동 주체 아님)'
      : '소스 — 재생·출력(헤드폰 구동 주체 아님)';
  const lines = [buildComboGearSpecBlock(source, slotLabel)];
  const scoresBlock = buildHeadfiSoundScoresPromptBlock(source);
  if (scoresBlock) lines.push(`  ${scoresBlock.replace(/\n/g, '\n  ')}`);
  const ai = source.ai_sound_analysis?.trim();
  if (ai) lines.push(`  청음 AI 분석: ${ai}`);
  return lines.join('\n');
}

function buildSourceInclusivePathRoleBlock(
  source: Headfi,
  select1: Headfi,
  select2: Headfi | null,
  links?: ComboPathLinks | null,
): string {
  const sourceName = formatExactGearName(source);
  const name1 = formatExactGearName(select1);
  const dapNote =
    source.category === 'DAP'
      ? ' DAP는 재생·디지털/아날로그 출력을 담당하는 소스로만 보고, 헤드폰 구동 주체·최종 앰프로 해석하지 말 것.'
      : '';
  const media = trimPathLink(links?.source_media);
  const sourceLink = trimPathLink(links?.source_link);
  const deviceLink = trimPathLink(links?.device_link);
  const extraLines = [
    buildSourceMediaRuleLine(media),
    buildSourceLinkRuleLine(sourceLink, sourceName, name1),
  ].filter((line): line is string => Boolean(line));

  const select1IsSourceDevice = select1.category === 'Source';
  if (select2) {
    const name2 = formatExactGearName(select2);
    if (deviceLink === '블루투스') {
      return `[신호 경로 해석 규칙 — 소스 포함 조합]
- 신호 경로: 소스 "${sourceName}" → 기기 1 "${name1}" → 기기 2 "${name2}" → 헤드폰/이어폰.
- 소스 "${sourceName}": 재생·출력 담당.${dapNote} drive·Vrms·Rk·헤드폰 구동력은 소스 기준으로 평가하지 말 것.
${extraLines.length > 0 ? `${extraLines.join('\n')}\n` : ''}- 기기 간 연결: 블루투스(무선).
- 기기 1 "${name1}": 무선 송신(동글 등)만 담당. DAC·AMP·헤드폰 구동으로 해석하지 말 것.
- 기기 2 "${name2}": DAC·AMP 모두 담당. 무선 수신→DAC→헤드폰 구동. drive·Vrms·Rk·출력 여유는 기기 2 기준으로 평가.
- 소스·기기 1·기기 2를 서로 역할이 바뀐 독립 앰프들로 해석하지 말 것.`;
    }
    const analogNote = buildDeviceLinkAnalogNote(deviceLink);
    const device1Line = select1IsSourceDevice
      ? `- 기기 1 "${name1}": 소스 기기(재생·라인 출력). 소스 출력→아날로그 라인아웃. 헤드폰 직접 구동은 하지 않음.`
      : `- 기기 1 "${name1}": DAC 전용. 소스 출력→아날로그 라인아웃. 헤드폰 직접 구동은 하지 않음.`;
    const base = `[신호 경로 해석 규칙 — 소스 포함 조합]
- 신호 경로: 소스 "${sourceName}" → 기기 1 "${name1}" → 기기 2 "${name2}" → 헤드폰/이어폰.
- 소스 "${sourceName}": 재생·출력 담당.${dapNote} drive·Vrms·Rk·헤드폰 구동력은 소스 기준으로 평가하지 말 것.
${device1Line}
- 기기 2 "${name2}": AMP. 기기 1 라인아웃→헤드폰 구동. drive·Vrms·Rk·출력 여유는 기기 2 기준으로 평가.
- 소스·기기 1·기기 2를 서로 역할이 바뀐 독립 앰프들로 해석하지 말 것.`;
    if (!hasAnyComboPathLink(links) && !select1IsSourceDevice) return base;
    const notes = [...extraLines, analogNote].filter((line): line is string => Boolean(line));
    return notes.length > 0 ? `${base}\n${notes.join('\n')}` : base;
  }

  const device1SoloLine = select1IsSourceDevice
    ? `- 기기 1 "${name1}": 소스 기기로 재생과 헤드폰 직접 구동을 담당. drive는 기기 1 출력 기준으로 평가.`
    : `- 기기 1 "${name1}": 소스 이후 단에서 헤드폰 구동·음색을 담당. drive는 기기 1 기준으로 평가.`;
  const base = `[신호 경로 해석 규칙 — 소스 포함 조합]
- 신호 경로: 소스 "${sourceName}" → 기기 1 "${name1}" → 헤드폰/이어폰.
- 소스 "${sourceName}": 재생·출력 담당.${dapNote} drive·Vrms·Rk·헤드폰 구동력은 소스 기준으로 평가하지 말 것.
${device1SoloLine}
- 소스를 최종 헤드폰 앰프로 해석하지 말 것.`;
  if (!hasAnyComboPathLink(links) && !select1IsSourceDevice) return base;
  return extraLines.length > 0 ? `${base}\n${extraLines.join('\n')}` : base;
}

function buildComboDisplayName(
  select1: Headfi,
  select2: Headfi | null,
  source: Headfi | null = null,
  links?: ComboPathLinks | null,
): string {
  const name1 = formatExactGearName(select1);
  const suffix = formatComboConnectionSuffix(links ?? {});
  if (source) {
    const sourceLabel = `${formatExactGearName(source)} (${source.category})`;
    if (!select2) {
      return `${sourceLabel} → ${name1} (${select1.category})${suffix}`;
    }
    const name2 = formatExactGearName(select2);
    const deviceLink = trimPathLink(links?.device_link);
    if (deviceLink === '블루투스') {
      return `${sourceLabel} → ${name1} (TX) → ${name2} (DAC/AMP)${suffix}`;
    }
    return `${sourceLabel} → ${name1} (DAC) → ${name2} (AMP)${suffix}`;
  }
  if (!select2) {
    return `${name1} (${select1.category})${suffix}`;
  }
  const name2 = formatExactGearName(select2);
  const deviceLink = trimPathLink(links?.device_link);
  if (deviceLink === '블루투스') {
    return `${name1} (TX) → ${name2} (DAC/AMP)${suffix}`;
  }
  return `${name1} (DAC) → ${name2} (AMP)${suffix}`;
}

export function buildComboBaseForPrompt(
  select1: Headfi,
  select2: Headfi | null,
  source: Headfi | null = null,
  links?: ComboPathLinks | null,
): {
  name: string;
  genres: string;
  combo_specs_block: string;
  has_source?: boolean;
} {
  const dualChain = select2 != null;
  const deviceLink = trimPathLink(links?.device_link);
  const deviceLinkBt = dualChain && deviceLink === '블루투스';
  const select1IsSourceDevice = select1.category === 'Source';
  const select1SlotLabel = dualChain
    ? deviceLinkBt
      ? '기기 1 — 무선 송신'
      : select1IsSourceDevice
        ? '기기 1 — 소스 기기(재생·라인 출력)'
        : '기기 1 — DAC(라인아웃 출력 전용)'
    : '기기 1';
  const blocks: string[] = [];
  if (source) {
    blocks.push(buildSourceGearSpecBlock(source));
  }
  blocks.push(
    buildComboGearSpecBlock(select1, select1SlotLabel, {
      forceOutputSpecs: select1IsSourceDevice,
    }),
  );
  if (select2) {
    blocks.push(
      buildComboGearSpecBlock(select2, deviceLinkBt ? '기기 2 — DAC·AMP' : '기기 2 — AMP'),
    );
  }
  if (source) {
    blocks.push(buildSourceInclusivePathRoleBlock(source, select1, select2, links));
  } else if (select2) {
    blocks.push(buildDualChainRoleBlock(select1, select2, deviceLink));
  } else if (select1IsSourceDevice) {
    blocks.push(buildSourceDeviceSoloPathRoleBlock(select1));
  }
  return {
    name: buildComboDisplayName(select1, select2, source, links),
    genres: '-',
    combo_specs_block: blocks.join('\n\n'),
    ...(source ? { has_source: true as const } : {}),
  };
}

export const MATCH_SCORE_MAX = 300;
export const MASTER_PAIRING_BONUS = 20;

export function hasMasterPairingBonus(
  pairingComboId: string | null | undefined,
  comboId: string,
): boolean {
  const normalized = pairingComboId?.trim();
  if (!normalized) return false;
  return normalized === comboId;
}

export type MatchScoreDisplay = {
  baseTotal: number;
  displayTotal: number;
  hasMasterBonus: boolean;
  bonusAmount: number;
};

export function computeMatchScoreDisplay(
  drive: number,
  synergy: number,
  genre: number,
  pairingComboId: string | null | undefined,
  comboId: string,
): MatchScoreDisplay {
  const baseTotal = drive + synergy + genre;
  const hasMasterBonus = hasMasterPairingBonus(pairingComboId, comboId);
  const bonusAmount = hasMasterBonus ? MASTER_PAIRING_BONUS : 0;
  const displayTotal = hasMasterBonus
    ? Math.min(MATCH_SCORE_MAX, baseTotal + MASTER_PAIRING_BONUS)
    : baseTotal;
  return { baseTotal, displayTotal, hasMasterBonus, bonusAmount };
}

export function formatMatchScoreTotalLine(score: MatchScoreDisplay): string {
  if (score.hasMasterBonus) {
    return `합계 ${score.displayTotal} (${score.baseTotal} + 마스터 가산점 ${score.bonusAmount})`;
  }
  return `합계 ${score.baseTotal}`;
}
