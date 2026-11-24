import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import type { Headfi } from '@/app/headfi/types';
import {
  COMBO_DEVICE_LINK_OPTIONS,
  COMBO_SOURCE_LINK_OPTIONS,
  COMBO_SOURCE_MEDIA_OPTIONS,
} from '@/app/headfi/headfiComboUtils';
import {
  buildComboBaseForPrompt,
  candidateLine,
  compressCandidateRow,
} from '@/lib/headfiMatchScore';

const OUT_OF_LIST = '목록밖값';

function gear(id: number, brand: string, model: string, category: string, extra: Partial<Headfi> = {}): Headfi {
  return {
    id,
    brand,
    model,
    category,
    type1: null,
    type2: null,
    impedance: null,
    connector: null,
    db1: null,
    db2: null,
    volume: null,
    volume_type: null,
    purchase_date: null,
    price: 0,
    status1: null,
    status2: '보유중',
    cable: null,
    cable_price: null,
    unit: null,
    etc: null,
    matching: null,
    gain: null,
    temp: null,
    bright: null,
    ...extra,
  } as Headfi;
}

const dacSpecs: Partial<Headfi> = {
  amp_type: 'A',
  chipset: 'ES9038PRO',
  output_impedance: 1,
  vrms_bal: 6.5,
  vrms_single: 3.2,
};

const sources: { key: string; item: Headfi | null }[] = [
  { key: 'none', item: null },
  { key: 'Source', item: gear(1, 'SrcBrand', 'Streamer One', 'Source', dacSpecs) },
  { key: 'DAP', item: gear(2, 'DapBrand', 'Player X', 'DAP', dacSpecs) },
];

const select1s: { key: string; item: Headfi }[] = [
  { key: 'Source', item: gear(11, 'S1Brand', 'Transport', 'Source', dacSpecs) },
  { key: 'DAC', item: gear(12, 'S1Brand', 'Dac One', 'DAC', dacSpecs) },
  { key: 'DAC/AMP', item: gear(13, 'S1Brand', 'DacAmp One', 'DAC/AMP', dacSpecs) },
];

const select2s: { key: string; item: Headfi | null }[] = [
  { key: 'none', item: null },
  { key: 'AMP', item: gear(21, 'S2Brand', 'Amp One', 'AMP', { ...dacSpecs, amp_type: 'AB' }) },
];

const medias = ['', ...COMBO_SOURCE_MEDIA_OPTIONS, OUT_OF_LIST];
const sourceLinks = ['', ...COMBO_SOURCE_LINK_OPTIONS, OUT_OF_LIST];
const deviceLinks = ['', ...COMBO_DEVICE_LINK_OPTIONS, OUT_OF_LIST];

const candidates: Headfi[] = [
  gear(31, 'HpBrand', 'Open Back', '헤드폰', {
    impedance: 300,
    connector: '4.4mm',
    db1: 102,
    musicality: 8,
    trait_warmth: 6,
    trait_brightness: 4,
    trait_vocal_position: 5,
    trait_bass_decay: 7,
  }),
  gear(32, 'IemBrand', 'In Ear', '이어폰', { impedance: 16, connector: '3.5mm', db1: 110 }),
  gear(33, 'HpBrand', 'Bare', '헤드폰'),
];

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function main() {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error('usage: npm run snapshot:prompt -- <output.json>');
    process.exit(1);
  }

  const blocks: Record<string, string> = {};
  const cases: Record<string, { name: string; genres: string; has_source: boolean; block: string }> = {};

  for (const source of sources) {
    for (const select1 of select1s) {
      for (const select2 of select2s) {
        for (const media of medias) {
          for (const sourceLink of sourceLinks) {
            for (const deviceLink of deviceLinks) {
              const base = buildComboBaseForPrompt(select1.item, select2.item, source.item, {
                source_media: media,
                source_link: sourceLink,
                device_link: deviceLink,
              });
              const blockHash = sha256(base.combo_specs_block).slice(0, 16);
              blocks[blockHash] = base.combo_specs_block;
              const key = [source.key, select1.key, select2.key, media, sourceLink, deviceLink].join(' | ');
              cases[key] = {
                name: base.name,
                genres: base.genres,
                has_source: base.has_source === true,
                block: blockHash,
              };
            }
          }
        }
      }
    }
  }

  const candidateLines = candidates.map((item) => candidateLine(compressCandidateRow(item)));

  const sortObject = <T>(obj: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));

  const output = JSON.stringify(
    { cases: sortObject(cases), blocks: sortObject(blocks), candidateLines },
    null,
    1,
  );
  writeFileSync(outPath, `${output}\n`);

  console.log(
    `cases=${Object.keys(cases).length} blocks=${Object.keys(blocks).length} sha256=${sha256(output)}`,
  );
}

main();
