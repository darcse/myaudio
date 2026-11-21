-- 장르2 2차 개편 (2026-11-21) — STEP을 하나씩 순서대로 실행
-- Classic은 건드리지 않는다.

-- ===== STEP 1. 백업 =====
CREATE TABLE album_backup_genre2_261121 AS
SELECT id, genre1, genre2, tags FROM album;
ALTER TABLE album_backup_genre2_261121 ENABLE ROW LEVEL SECURITY;

-- ===== STEP 2. 미리보기: 아티스트·태그로 나누는 앨범 (target이 '미분류'인 행을 확인) =====
SELECT id, artist, album_name, genre1, genre2,
  coalesce(CASE
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Black / Blackgaze' AND (trim(artist) = 'Deafheaven' OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Blackgaze'))) THEN 'Metal|Blackgaze'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Black / Blackgaze' THEN 'Metal|Black Metal'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Melodic / Power' AND trim(artist) = 'Cradle of Filth' THEN 'Metal|Gothic Metal'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Melodic / Power' AND (EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Melodic Death')) OR trim(artist) IN ('Arch Enemy', 'The Agonist', 'My Material Season')) THEN 'Metal|Melodic Death'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Melodic / Power' AND trim(artist) IN ('Helloween', 'Unlucky Morpheus', 'X JAPAN', 'BRIDEAR', 'FATE GEAR') THEN 'Metal|Power Metal'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Metalcore / Industrial' AND trim(artist) = 'Rage Against the Machine' THEN 'Rock|Hard Rock'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Metalcore / Industrial' AND (EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Industrial')) OR trim(artist) IN ('Marilyn Manson', 'Rammstein')) THEN 'Metal|Industrial'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Metalcore / Industrial' AND trim(artist) IN ('花冷え。', 'Poppy') THEN 'Metal|Metalcore'
    WHEN trim(genre1) = 'Electronic' AND trim(genre2) = 'Big Beat / Trip Hop' AND (trim(artist) = 'The Chemical Brothers' OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Big Beat'))) THEN 'Electronic|Big Beat'
    WHEN trim(genre1) = 'Electronic' AND trim(genre2) = 'Big Beat / Trip Hop' AND trim(artist) IN ('Portishead', 'Lamb') THEN 'Electronic|Trip Hop'
    WHEN trim(genre1) = 'Pop' AND trim(genre2) = 'Dance / Electro Pop' AND trim(artist) = 'Olivia Rodrigo' THEN 'Pop|Pop Rock'
    WHEN trim(genre1) = 'Pop' AND trim(genre2) = 'Dance / Electro Pop' AND trim(artist) IN ('Billie Eilish', 'Lorde', 'a-ha') THEN 'Pop|Synth Pop'
    WHEN trim(genre1) = 'Pop' AND trim(genre2) = 'Dance / Electro Pop' AND trim(artist) IN ('ABBA', 'New Kids on the Block', 'Paula Abdul', 'Sabrina Carpenter', 'Freddie Mercury') THEN 'Pop|Dance Pop'
    WHEN trim(genre1) = 'OST' AND trim(genre2) = 'Album' AND trim(artist) = '放課後ティータイム' THEN 'OST|Anime OST'
    WHEN trim(genre1) = 'OST' AND trim(genre2) = 'Album' AND trim(artist) = 'Air' THEN 'OST|Movie OST'
    WHEN trim(genre1) = 'J-Pop' AND trim(genre2) = 'Indie / City Pop' AND translate(trim(artist), '‐‑–', '---') ILIKE 'Hi-Fi Set' THEN 'J-Pop|City Pop'
    WHEN trim(genre1) = 'J-Pop' AND trim(genre2) = 'Indie / City Pop' THEN 'J-Pop|Indie Pop'
    WHEN trim(genre1) = 'K-Pop' AND coalesce(trim(genre2), '') = '' AND EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Playlist')) THEN 'K-Pop|Playlist'
    ELSE NULL
  END, '미분류') AS target
FROM album
WHERE (trim(genre1), coalesce(trim(genre2), '')) IN (
    ('Metal', 'Black / Blackgaze'), ('Metal', 'Melodic / Power'), ('Metal', 'Metalcore / Industrial'),
    ('Electronic', 'Big Beat / Trip Hop'), ('Pop', 'Dance / Electro Pop'), ('OST', 'Album'),
    ('J-Pop', 'Indie / City Pop'), ('K-Pop', '')
  )
  AND NOT (trim(genre1) = 'K-Pop' AND NOT EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = 'playlist'))
ORDER BY target, genre1, artist;

-- ===== STEP 3. 실제 변경 (STEP 2 확인 후 실행) =====
BEGIN;

-- 3-1. 아티스트·태그 기준 분리 ('미분류'는 바꾸지 않음)
WITH s AS (
  SELECT id, CASE
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Black / Blackgaze' AND (trim(artist) = 'Deafheaven' OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Blackgaze'))) THEN 'Metal|Blackgaze'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Black / Blackgaze' THEN 'Metal|Black Metal'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Melodic / Power' AND trim(artist) = 'Cradle of Filth' THEN 'Metal|Gothic Metal'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Melodic / Power' AND (EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Melodic Death')) OR trim(artist) IN ('Arch Enemy', 'The Agonist', 'My Material Season')) THEN 'Metal|Melodic Death'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Melodic / Power' AND trim(artist) IN ('Helloween', 'Unlucky Morpheus', 'X JAPAN', 'BRIDEAR', 'FATE GEAR') THEN 'Metal|Power Metal'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Metalcore / Industrial' AND trim(artist) = 'Rage Against the Machine' THEN 'Rock|Hard Rock'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Metalcore / Industrial' AND (EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Industrial')) OR trim(artist) IN ('Marilyn Manson', 'Rammstein')) THEN 'Metal|Industrial'
    WHEN trim(genre1) = 'Metal' AND trim(genre2) = 'Metalcore / Industrial' AND trim(artist) IN ('花冷え。', 'Poppy') THEN 'Metal|Metalcore'
    WHEN trim(genre1) = 'Electronic' AND trim(genre2) = 'Big Beat / Trip Hop' AND (trim(artist) = 'The Chemical Brothers' OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Big Beat'))) THEN 'Electronic|Big Beat'
    WHEN trim(genre1) = 'Electronic' AND trim(genre2) = 'Big Beat / Trip Hop' AND trim(artist) IN ('Portishead', 'Lamb') THEN 'Electronic|Trip Hop'
    WHEN trim(genre1) = 'Pop' AND trim(genre2) = 'Dance / Electro Pop' AND trim(artist) = 'Olivia Rodrigo' THEN 'Pop|Pop Rock'
    WHEN trim(genre1) = 'Pop' AND trim(genre2) = 'Dance / Electro Pop' AND trim(artist) IN ('Billie Eilish', 'Lorde', 'a-ha') THEN 'Pop|Synth Pop'
    WHEN trim(genre1) = 'Pop' AND trim(genre2) = 'Dance / Electro Pop' AND trim(artist) IN ('ABBA', 'New Kids on the Block', 'Paula Abdul', 'Sabrina Carpenter', 'Freddie Mercury') THEN 'Pop|Dance Pop'
    WHEN trim(genre1) = 'OST' AND trim(genre2) = 'Album' AND trim(artist) = '放課後ティータイム' THEN 'OST|Anime OST'
    WHEN trim(genre1) = 'OST' AND trim(genre2) = 'Album' AND trim(artist) = 'Air' THEN 'OST|Movie OST'
    WHEN trim(genre1) = 'J-Pop' AND trim(genre2) = 'Indie / City Pop' AND translate(trim(artist), '‐‑–', '---') ILIKE 'Hi-Fi Set' THEN 'J-Pop|City Pop'
    WHEN trim(genre1) = 'J-Pop' AND trim(genre2) = 'Indie / City Pop' THEN 'J-Pop|Indie Pop'
    WHEN trim(genre1) = 'K-Pop' AND coalesce(trim(genre2), '') = '' AND EXISTS (SELECT 1 FROM unnest(tags) t WHERE lower(trim(t)) = lower('Playlist')) THEN 'K-Pop|Playlist'
    ELSE NULL
  END AS target
  FROM album
  WHERE (trim(genre1), coalesce(trim(genre2), '')) IN (
    ('Metal', 'Black / Blackgaze'), ('Metal', 'Melodic / Power'), ('Metal', 'Metalcore / Industrial'),
    ('Electronic', 'Big Beat / Trip Hop'), ('Pop', 'Dance / Electro Pop'), ('OST', 'Album'),
    ('J-Pop', 'Indie / City Pop'), ('K-Pop', '')
  )
)
UPDATE album a
SET genre1 = split_part(s.target, '|', 1),
    genre2 = split_part(s.target, '|', 2)
FROM s
WHERE a.id = s.id AND s.target IS NOT NULL;

-- 3-2. 1:1 이름 변경
UPDATE album a
SET genre2 = m.new_genre2
FROM (VALUES
  ('Rock', 'Alternative / Indie', 'Alternative'),
  ('J-Rock', 'Alternative / Indie', 'Alternative'),
  ('Rock', 'Progressive / Art Rock', 'Prog / Art Rock'),
  ('J-Rock', 'Progressive / Art Rock', 'Prog / Art Rock'),
  ('J-Idol', 'Shoegaze / Post Rock', 'Shoegaze / Dream Pop'),
  ('J-Idol', 'Rock / Punk', 'Idol Rock'),
  ('J-Idol', 'Kawaii / Loud Rock', 'Loud Rock'),
  ('J-Idol', 'Electronic', 'Synth Pop'),
  ('K-Pop', 'Pop Rock / Alternative', 'Pop Rock'),
  ('K-Pop', 'Electro / Synth Pop', 'Synth Pop'),
  ('K-Pop', '플레이리스트', 'Playlist'),
  ('Pop', 'Pop Rock / Alternative', 'Pop Rock'),
  ('Pop', 'Indie / Modern Pop', 'Indie Pop'),
  ('Pop', 'Adult Contemporary', 'Adult Pop'),
  ('Pop', 'R&B / Soul', 'R&B'),
  ('Pop', 'Compilation / Various', 'Compilation'),
  ('Pop', 'Chanson / World Pop', 'Chanson'),
  ('J-Pop', 'Pop / Dance', 'Dance Pop'),
  ('J-Pop', 'Adult Contemporary', 'Adult Pop'),
  ('J-Pop', 'Anime / Character', 'Anisong'),
  ('Metal', 'Gothic / Symphonic', 'Gothic Metal'),
  ('Electronic', 'Synth / Electro', 'Electro'),
  ('Electronic', 'House / Nu-disco', 'House'),
  ('Electronic', 'Ambient / IDM', 'Ambient'),
  ('Jazz', 'Anime / Game Jazz', 'Anime Jazz'),
  ('Jazz', 'Contemporary / Nu Jazz', 'Nu Jazz'),
  ('Jazz', 'Trio / Swing', 'Swing'),
  ('OST', 'Movie / Drama OST', 'Movie OST'),
  ('Crossover', 'Orchestral Game / Metal', 'Orchestral'),
  ('Crossover', 'Classical Crossover', 'Classical'),
  ('Crossover', 'Traditional Crossover', 'Traditional'),
  ('World', 'Ethnic / Folk', 'Folk')
) AS m(genre1, old_genre2, new_genre2)
WHERE trim(a.genre1) = m.genre1 AND trim(a.genre2) = m.old_genre2;

COMMIT;

-- ===== STEP 4. 확인: 새 목록에 없는 장르2 (남은 행만 다음에 정리) =====
SELECT a.genre1, a.genre2, COUNT(*) AS cnt
FROM album a
WHERE coalesce(trim(a.genre1), '') <> 'Classic'
  AND coalesce(trim(a.genre2), '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM (VALUES
  ('Rock', 'Alternative'),
  ('Rock', 'Shoegaze / Dream Pop'),
  ('Rock', 'Pop Rock'),
  ('Rock', 'Punk / Emo'),
  ('Rock', 'Hard Rock'),
  ('Rock', 'Prog / Art Rock'),
  ('Rock', 'Psychedelic'),
  ('J-Rock', 'Alternative'),
  ('J-Rock', 'Shoegaze / Dream Pop'),
  ('J-Rock', 'Pop Rock'),
  ('J-Rock', 'Punk / Emo'),
  ('J-Rock', 'Hard Rock'),
  ('J-Rock', 'Prog / Art Rock'),
  ('J-Rock', 'Psychedelic'),
  ('J-Idol', 'Idol Rock'),
  ('J-Idol', 'Loud Rock'),
  ('J-Idol', 'Idol Pop'),
  ('J-Idol', 'Shoegaze / Dream Pop'),
  ('J-Idol', 'Synth Pop'),
  ('J-Idol', 'Gothic Pop'),
  ('J-Pop', 'Pop Rock'),
  ('J-Pop', 'Adult Pop'),
  ('J-Pop', 'Dance Pop'),
  ('J-Pop', 'Indie Pop'),
  ('J-Pop', 'City Pop'),
  ('J-Pop', 'Anisong'),
  ('J-Pop', 'Jazz Pop'),
  ('K-Pop', 'Synth Pop'),
  ('K-Pop', 'Dance Pop'),
  ('K-Pop', 'Pop Rock'),
  ('K-Pop', 'Indie Pop'),
  ('K-Pop', 'Ballad'),
  ('K-Pop', 'Playlist'),
  ('Pop', 'Indie Pop'),
  ('Pop', 'Synth Pop'),
  ('Pop', 'Dance Pop'),
  ('Pop', 'R&B'),
  ('Pop', 'Pop Rock'),
  ('Pop', 'Adult Pop'),
  ('Pop', 'Compilation'),
  ('Pop', 'Chanson'),
  ('Metal', 'Thrash Metal'),
  ('Metal', 'Melodic Death'),
  ('Metal', 'Power Metal'),
  ('Metal', 'Heavy Metal'),
  ('Metal', 'Metalcore'),
  ('Metal', 'Industrial'),
  ('Metal', 'Black Metal'),
  ('Metal', 'Blackgaze'),
  ('Metal', 'Gothic Metal'),
  ('Electronic', 'Electro'),
  ('Electronic', 'Big Beat'),
  ('Electronic', 'Trip Hop'),
  ('Electronic', 'House'),
  ('Electronic', 'Ambient'),
  ('Jazz', 'Anime Jazz'),
  ('Jazz', 'Nu Jazz'),
  ('Jazz', 'Swing'),
  ('Jazz', 'Fusion'),
  ('OST', 'Game OST'),
  ('OST', 'Anime OST'),
  ('OST', 'Movie OST'),
  ('Crossover', 'Orchestral'),
  ('Crossover', 'Classical'),
  ('Crossover', 'Traditional'),
  ('Crossover', 'Playlist'),
  ('World', 'Folk'),
  ('World', 'Traditional'),
  ('기타', 'Playlist'),
  ('기타', 'Acoustic')
    ) AS s(genre1, genre2)
    WHERE s.genre1 = trim(a.genre1) AND s.genre2 = trim(a.genre2)
  )
GROUP BY a.genre1, a.genre2
ORDER BY a.genre1, a.genre2;

-- ===== 되돌리기 (문제가 있을 때만) =====
-- UPDATE album a SET genre1 = b.genre1, genre2 = b.genre2, tags = b.tags
-- FROM album_backup_genre2_261121 b WHERE a.id = b.id;
