-- BUG-007: 대시보드 월별 청취 조회 가속 (선택 적용)
CREATE INDEX IF NOT EXISTS idx_album_listen_history_listened_at
  ON album_listen_history (listened_at);

-- BUG-007: 최근 앨범/기기 조회 가속 (선택 적용)
CREATE INDEX IF NOT EXISTS idx_album_created_at_desc
  ON album (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_headfi_created_at_desc
  ON headfi (created_at DESC);
