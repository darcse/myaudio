import type { Headfi } from '@/app/headfi/types';
import { formatVrms, formatDacAmpSpecsForPrompt } from '@/app/headfi/dacAmpSpec';
import { formatComboConnectionSuffix } from '@/app/headfi/headfiComboUtils';
import { formatFrInterpretationForPrompt } from '@/lib/headfiAlbumMatch';
import { buildHeadfiSoundScoresPromptBlock } from '@/lib/headfiSoundScores';

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

const SOURCE_LINK_PREFIX = '- 소스→기기 1 연결: ';
const DUAL_CHAIN_HEADER = '[신호 경로 해석 규칙 — 2기기 조합]';
const SOURCE_INCLUSIVE_HEADER = '[신호 경로 해석 규칙 — 소스 포함 조합]';
const BT_DEVICE_LINK_LINE = '- 기기 간 연결: 블루투스(무선).';
const NO_ROLE_SWAP_LINE = '- 소스·기기 1·기기 2를 서로 역할이 바뀐 독립 앰프들로 해석하지 말 것.';

function appendLines(base: string, lines: (string | null)[]): string {
  const notes = lines.filter((line): line is string => Boolean(line));
  return notes.length > 0 ? `${base}\n${notes.join('\n')}` : base;
}

function buildSourceLinkRuleLine(sourceLink: string, sourceName: string, name1: string): string | null {
  if (!sourceLink) return null;
  if (sourceLink === 'USB' || sourceLink === '광(옵티컬)' || sourceLink === '동축') {
    return `${SOURCE_LINK_PREFIX}${sourceLink}(디지털). 소스 "${sourceName}"는 디지털 전송만 담당하고, DAC 변환은 기기 1 "${name1}"이 담당.`;
  }
  if (sourceLink === '아날로그 라인아웃') {
    return `${SOURCE_LINK_PREFIX}아날로그 라인아웃. 소스 "${sourceName}"의 DAC·아날로그 음색이 반영됨.`;
  }
  if (sourceLink === '포노 아웃') {
    return `${SOURCE_LINK_PREFIX}포노 아웃. 소스 "${sourceName}"는 포노 레벨(RIAA 미보정) 신호를 출력하므로 기기 1 "${name1}"이 포노 앰프(증폭·RIAA 보정) 역할을 하는 것으로 해석하고, 기기 1에 포노 입력이 없으면 매칭이 성립하기 어려운 점을 감안.`;
  }
  if (sourceLink === '블루투스') {
    return `${SOURCE_LINK_PREFIX}블루투스(무선). 코덱 손실 가능성을 고려.`;
  }
  if (sourceLink === 'AirPlay') {
    return `${SOURCE_LINK_PREFIX}AirPlay(무선, 최대 16bit/44.1kHz ALAC 무손실 전송). 블루투스보다 손실이 적음.`;
  }
  return `${SOURCE_LINK_PREFIX}${sourceLink}.`;
}

function buildDeviceLinkAnalogNote(deviceLink: string): string | null {
  const label =
    deviceLink === 'XLR' || deviceLink === '4.4mm to 4.4mm'
      ? `${deviceLink}(밸런스 아날로그 전송)`
      : deviceLink === 'RCA'
        ? 'RCA(아날로그 전송)'
        : null;
  if (!label) return null;
  return `- 기기 간 연결: ${label}. 기기 1 DAC → 기기 2 AMP 역할은 위와 동일.`;
}

function buildBluetoothDeviceLines(name1: string, name2: string): string {
  return `${BT_DEVICE_LINK_LINE}
- 기기 1 "${name1}": 무선 송신(동글 등)만 담당. DAC·AMP·헤드폰 구동으로 해석하지 말 것.
- 기기 2 "${name2}": DAC·AMP 모두 담당. 무선 수신→DAC→헤드폰 구동. drive·Vrms·Rk·출력 여유는 기기 2 기준으로 평가.`;
}

function buildLineOutDevice1Line(select1: Headfi, name1: string, flow: string): string {
  const role = select1.category === 'Source' ? '소스 기기(재생·라인 출력).' : 'DAC 전용.';
  return `- 기기 1 "${name1}": ${role} ${flow}`;
}

function buildAmpDevice2Line(name2: string): string {
  return `- 기기 2 "${name2}": AMP. 기기 1 라인아웃→헤드폰 구동. drive·Vrms·Rk·출력 여유는 기기 2 기준으로 평가.`;
}

function buildDualChainRoleBlock(
  select1: Headfi,
  select2: Headfi,
  deviceLink: string = '',
): string {
  const name1 = formatExactGearName(select1);
  const name2 = formatExactGearName(select2);
  if (deviceLink === '블루투스') {
    return `${DUAL_CHAIN_HEADER}
${buildBluetoothDeviceLines(name1, name2)}
- "${name1}"를 DAC로, "${name2}"를 AMP만으로 해석하지 말 것.`;
  }
  const base = `${DUAL_CHAIN_HEADER}
${buildLineOutDevice1Line(select1, name1, '디지털 입력→아날로그 라인아웃 출력만 담당. 헤드폰 직접 구동·헤드폰단 앰핑은 하지 않음.')}
${buildAmpDevice2Line(name2)}
- "${name1}"와 "${name2}"를 각각 독립 앰프 2대로 해석하거나, 기기 1을 DAC/AMP 겸용으로 가정하지 말 것.`;
  return appendLines(base, [buildDeviceLinkAnalogNote(deviceLink)]);
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
  const name2 = select2 ? formatExactGearName(select2) : null;
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
  ];
  const chain = name2 ? `기기 1 "${name1}" → 기기 2 "${name2}"` : `기기 1 "${name1}"`;
  const header = `${SOURCE_INCLUSIVE_HEADER}
- 신호 경로: 소스 "${sourceName}" → ${chain} → 헤드폰/이어폰.
- 소스 "${sourceName}": 재생·출력 담당.${dapNote} drive·Vrms·Rk·헤드폰 구동력은 소스 기준으로 평가하지 말 것.`;
  const select1IsSourceDevice = select1.category === 'Source';
  const keepNotes = hasAnyComboPathLink(links) || select1IsSourceDevice;

  if (name2 != null) {
    if (deviceLink === '블루투스') {
      return `${appendLines(header, extraLines)}
${buildBluetoothDeviceLines(name1, name2)}
${NO_ROLE_SWAP_LINE}`;
    }
    const base = `${header}
${buildLineOutDevice1Line(select1, name1, '소스 출력→아날로그 라인아웃. 헤드폰 직접 구동은 하지 않음.')}
${buildAmpDevice2Line(name2)}
${NO_ROLE_SWAP_LINE}`;
    if (!keepNotes) return base;
    return appendLines(base, [...extraLines, buildDeviceLinkAnalogNote(deviceLink)]);
  }

  const device1SoloLine = select1IsSourceDevice
    ? `- 기기 1 "${name1}": 소스 기기로 재생과 헤드폰 직접 구동을 담당. drive는 기기 1 출력 기준으로 평가.`
    : `- 기기 1 "${name1}": 소스 이후 단에서 헤드폰 구동·음색을 담당. drive는 기기 1 기준으로 평가.`;
  const base = `${header}
${device1SoloLine}
- 소스를 최종 헤드폰 앰프로 해석하지 말 것.`;
  if (!keepNotes) return base;
  return appendLines(base, extraLines);
}

function buildComboDisplayName(
  select1: Headfi,
  select2: Headfi | null,
  source: Headfi | null = null,
  links?: ComboPathLinks | null,
): string {
  const name1 = formatExactGearName(select1);
  const suffix = formatComboConnectionSuffix(links ?? {});
  const prefix = source ? `${formatExactGearName(source)} (${source.category}) → ` : '';
  if (!select2) {
    return `${prefix}${name1} (${select1.category})${suffix}`;
  }
  const name2 = formatExactGearName(select2);
  if (trimPathLink(links?.device_link) === '블루투스') {
    return `${prefix}${name1} (TX) → ${name2} (DAC/AMP)${suffix}`;
  }
  return `${prefix}${name1} (DAC) → ${name2} (AMP)${suffix}`;
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
