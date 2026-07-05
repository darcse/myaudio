-- GEAR-018: DAC/AMP/DAC·AMP/DAP 매칭맵 궁합 캐시 초기화
-- 대상: headfi_match_cache에서 DAC/AMP/DAC·AMP/DAP가 base 또는 target인 행만 삭제
-- 포지션맵(position_x/y/label)은 초기화하지 않음
-- JW: Supabase SQL Editor에서 수동 실행

DELETE FROM headfi_match_cache
WHERE base_gear_id IN (
  SELECT id FROM headfi WHERE category IN ('DAC', 'AMP', 'DAC/AMP', 'DAP')
)
OR target_gear_id IN (
  SELECT id FROM headfi WHERE category IN ('DAC', 'AMP', 'DAC/AMP', 'DAP')
);
