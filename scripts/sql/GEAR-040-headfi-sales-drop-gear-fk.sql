-- GEAR-040: headfi_sales.gear_id 가 headfi(id) 만 참조하는 FK 이면
-- category='악세서리' 시 headfi_accessories.id 저장이 실패한다.
-- 이 스크립트는 직접 실행 전 제약을 확인한 뒤, JW/Claude Code 가 Supabase 에서 적용한다.

-- 1) FK 확인
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'headfi_sales'
  AND con.contype = 'f';

-- 2) 확인된 FK 제거 (이름이 다르면 1) 결과의 constraint_name 으로 교체)
-- ALTER TABLE public.headfi_sales DROP CONSTRAINT IF EXISTS headfi_sales_gear_id_fkey;

-- 참고: gear_id 는 category 에 따라 headfi 또는 headfi_accessories 를 가리키는
-- polymorphic id 이므로, 단일 FK 로는 양쪽을 동시에 보장할 수 없다.
-- 장기적으로는 accessory_id 컬럼 분리 또는 item_type + item_id 가 더 안전하다.
