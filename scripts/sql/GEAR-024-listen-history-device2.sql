-- GEAR-024: 청취 이력 기기 선택2 (dac_amp2_id) 컬럼 추가
--
-- ⚠️ 실행 전 백업을 권장합니다.
-- Supabase SQL Editor에서 수동 실행하세요. 에이전트가 직접 실행하지 않습니다.
--
-- 설계:
--   기존 dac_amp_id  = 기기 선택1 (Source/DAC/DAC·AMP/AMP/DAP/기타 등, nullable FK → headfi)
--   신규 dac_amp2_id = 기기 선택2 (DAC/DAC·AMP/AMP, nullable FK → headfi)
--   기존 headphone_id = 헤드폰/이어폰 (nullable FK → headfi)
-- 기존 행은 dac_amp2_id = NULL 로 두어 조회 시 해당 항목을 표시하지 않습니다.

CREATE TABLE IF NOT EXISTS album_listen_history_backup_gear024 AS
SELECT * FROM album_listen_history;

ALTER TABLE album_listen_history
ADD COLUMN IF NOT EXISTS dac_amp2_id integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'album_listen_history_dac_amp2_id_fkey'
  ) THEN
    ALTER TABLE album_listen_history
      ADD CONSTRAINT album_listen_history_dac_amp2_id_fkey
      FOREIGN KEY (dac_amp2_id) REFERENCES headfi (id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN album_listen_history.dac_amp2_id IS
  '기기 선택2 (DAC/AMP/DAC·AMP). NULL이면 미선택 — GEAR-024';
