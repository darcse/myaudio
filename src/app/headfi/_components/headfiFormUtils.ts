import { isDacAmpOnlyCategory } from '@/lib/headfiMatchScore';
import type { HeadfiFormData } from '../types';

export const INPUT_BASE_CLASS = 'input-apple px-3 py-2 w-full h-[42px]';
export const DISABLED_CLASS = 'opacity-60 cursor-not-allowed';

export function getHeadfiFormCategoryFlags(category: string) {
  const hasCategory = category !== '';
  const isWired = category === '헤드폰' || category === '이어폰';
  const isWireless = category === '무선 헤드폰' || category === '무선 이어폰';
  const isSpeaker = category === '스피커';
  const isDacAmp = isDacAmpOnlyCategory(category);
  const isDap = category === 'DAP';
  const isSourceOrEtc = category === 'Source' || category === '기타';
  const isHeadphone = category === '헤드폰';
  const isEarphone = category === '이어폰';
  const isEarphoneType = isEarphone || category === '무선 이어폰';

  return {
    cat: category,
    hasCategory,
    isWired,
    isWireless,
    isSpeaker,
    isDacAmp,
    isDap,
    isSourceOrEtc,
    isHeadphone,
    isEarphone,
    isEarphoneType,
  };
}

export function getWiredMatchingSelectValue(formData: HeadfiFormData, dacAmpIds: string[]) {
  const isMatchingCustom =
    !dacAmpIds.includes(formData.matching) && formData.matching !== '' && formData.matching !== ' ';
  const matchingSelectVal = dacAmpIds.includes(formData.matching)
    ? formData.matching
    : isMatchingCustom
      ? '__custom__'
      : '';
  return { matchingSelectVal, isMatchingCustom };
}

export function getWirelessMatchingSelectValue(
  formData: HeadfiFormData,
  wirelessMatchingIds: string[],
) {
  return wirelessMatchingIds.includes(formData.matching) ? formData.matching : '';
}
