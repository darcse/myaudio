-- GEAR-018 확장: 헤드폰/이어폰 관련 매칭맵 궁합 캐시 초기화
-- 대상: headfi_match_cache에서 헤드폰/이어폰이 base 또는 target인 행만 삭제
-- JW: Supabase SQL Editor에서 수동 실행

DELETE FROM headfi_match_cache
WHERE base_gear_id IN (
  SELECT id FROM headfi WHERE category IN ('헤드폰', '이어폰')
)
OR target_gear_id IN (
  SELECT id FROM headfi WHERE category IN ('헤드폰', '이어폰')
);
