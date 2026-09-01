-- GEAR-039: headfi_match_cache unique 제약을 combo_id + target_gear_id 기준으로 전환
--
-- 배경: GEAR-032 이후 조합(combo_id)별 캐시를 저장하지만,
--       레거시 UNIQUE(base_gear_id, target_gear_id)가 남아 있으면
--       동일 select1·헤드폰 조합 매칭 시 duplicate key 에러가 발생함.
--
-- ⚠️ Supabase SQL Editor에서 수동 실행하세요.
-- 이미 1차 스크립트(부분 unique index)를 실행했다면 아래 전체를 다시 실행해도 됩니다.

ALTER TABLE public.headfi_match_cache
  DROP CONSTRAINT IF EXISTS headfi_match_cache_base_gear_id_target_gear_id_key;

DROP INDEX IF EXISTS public.headfi_match_cache_base_gear_id_target_gear_id_key;

DROP INDEX IF EXISTS public.headfi_match_cache_combo_id_target_gear_id_key;

ALTER TABLE public.headfi_match_cache
  DROP CONSTRAINT IF EXISTS headfi_match_cache_combo_id_target_gear_id_key;

ALTER TABLE public.headfi_match_cache
  ADD CONSTRAINT headfi_match_cache_combo_id_target_gear_id_key
  UNIQUE (combo_id, target_gear_id);
