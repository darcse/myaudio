import type { Headfi, HeadfiCombo } from '@/app/headfi/types';
import { LISTEN_HISTORY_SOURCE_CATEGORIES } from '@/lib/listenHistoryGear';

export type ListenHistoryComboGear = Pick<Headfi, 'id' | 'brand' | 'model' | 'category'>;

export type ListenHistoryComboFill = {
  sourceId: string;
  dacAmpId: string;
  dacAmp2Id: string;
  headphoneId: string | null;
  hasSpeaker: boolean;
};

export function comboHasSpeaker(
  combo: Pick<HeadfiCombo, 'select1_id' | 'select2_id'>,
  gearById: Map<number, ListenHistoryComboGear>,
): boolean {
  for (const id of [combo.select1_id, combo.select2_id]) {
    if (id == null) continue;
    if (gearById.get(id)?.category === '스피커') return true;
  }
  return false;
}

function isListenHistorySourceCategory(category: string | null | undefined): boolean {
  return (LISTEN_HISTORY_SOURCE_CATEGORIES as readonly string[]).includes(category ?? '');
}

export function fillListenHistoryFromCombo(
  combo: HeadfiCombo,
  gearById: Map<number, ListenHistoryComboGear>,
): ListenHistoryComboFill {
  let sourceId: number | null = combo.source_id ?? null;
  const ampIds: number[] = [];
  let speakerId: number | null = null;
  let hasSpeaker = false;

  const deviceEntries: { id: number | null; isDevice1: boolean }[] = [
    { id: combo.select1_id, isDevice1: true },
    { id: combo.select2_id, isDevice1: false },
  ];

  for (const { id, isDevice1 } of deviceEntries) {
    if (id == null) continue;
    const gear = gearById.get(id);
    if (!gear) continue;
    if (gear.category === '스피커') {
      hasSpeaker = true;
      speakerId = gear.id;
      continue;
    }
    if (
      combo.source_id == null &&
      sourceId == null &&
      (isDevice1
        ? isListenHistorySourceCategory(gear.category)
        : gear.category === 'Source')
    ) {
      sourceId = gear.id;
      continue;
    }
    ampIds.push(gear.id);
  }

  return {
    sourceId: sourceId != null ? String(sourceId) : '',
    dacAmpId: ampIds[0] != null ? String(ampIds[0]) : '',
    dacAmp2Id: ampIds[1] != null ? String(ampIds[1]) : '',
    headphoneId: hasSpeaker ? (speakerId != null ? String(speakerId) : '') : null,
    hasSpeaker,
  };
}
