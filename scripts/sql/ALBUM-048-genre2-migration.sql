-- Pop & Rock 장르2 표준화 데이터 이관 (2026-11-18)
-- 각 STEP을 순서대로 하나씩 실행한다. STEP 4는 STEP 3 결과 확인 후에만 실행.

-- ===== STEP 1. 백업 =====
CREATE TABLE album_backup_genre2_261118 AS
SELECT id, genre1, genre2, tags FROM album;
ALTER TABLE album_backup_genre2_261118 ENABLE ROW LEVEL SECURITY;

-- ===== STEP 2. 대응표 테이블 생성 =====
CREATE TABLE genre2_migration_map (
  genre1 text NOT NULL,
  old_genre2 text NOT NULL,
  new_genre1 text,
  new_genre2 text,
  add_tag text
);
ALTER TABLE genre2_migration_map ENABLE ROW LEVEL SECURITY;

INSERT INTO genre2_migration_map (genre1, old_genre2, new_genre1, new_genre2, add_tag) VALUES
  ('Crossover', 'Game OST', NULL, 'Orchestral Game / Metal', 'Game OST'),
  ('Crossover', 'Playlist', NULL, 'Playlist', NULL),
  ('Crossover', 'New Age', NULL, NULL, 'New Age'),
  ('Crossover', 'Traditional-Jazz', NULL, 'Traditional Crossover', 'Traditional Jazz'),
  ('Crossover', 'Heavy Metal', NULL, 'Orchestral Game / Metal', 'Heavy Metal'),
  ('Crossover', 'Classical Pop', NULL, 'Classical Crossover', 'Classical Pop'),
  ('Electronic', 'Electro Pop', NULL, 'Synth / Electro', 'Electro Pop'),
  ('Electronic', 'Big Beat', NULL, 'Big Beat / Trip Hop', NULL),
  ('Electronic', 'Synth Pop', NULL, 'Synth / Electro', 'Synth Pop'),
  ('Electronic', 'Trip hop', NULL, 'Big Beat / Trip Hop', NULL),
  ('Electronic', 'French House', NULL, 'House / Nu-disco', 'French House'),
  ('Electronic', 'House', NULL, 'House / Nu-disco', NULL),
  ('Electronic', 'Ambient', NULL, 'Ambient / IDM', NULL),
  ('Electronic', 'New Age', NULL, 'Ambient / IDM', 'New Age'),
  ('Electronic', 'Alt Dance Pop', NULL, 'Synth / Electro', 'Alt Dance Pop'),
  ('Electronic', 'Synth Rock', NULL, 'Synth / Electro', 'Synth Rock'),
  ('Electronic', 'Dance Pop', NULL, 'Synth / Electro', 'Dance Pop'),
  ('Electronic', 'IDM', NULL, 'Ambient / IDM', NULL),
  ('Electronic', 'Nu-disco', NULL, 'House / Nu-disco', NULL),
  ('J-Idol', 'Alternative', NULL, 'Rock / Punk', 'Alternative'),
  ('J-Idol', 'Pop Rock', NULL, 'Rock / Punk', 'Pop Rock'),
  ('J-Idol', 'Idol Pop', NULL, 'Idol Pop', NULL),
  ('J-Idol', 'Shoegaze', NULL, 'Shoegaze / Post Rock', NULL),
  ('J-Idol', 'Metalcore', NULL, 'Kawaii / Loud Rock', 'Metalcore'),
  ('J-Idol', 'Guitar Rock', NULL, 'Rock / Punk', 'Guitar Rock'),
  ('J-Idol', 'Loud Rock', NULL, 'Kawaii / Loud Rock', NULL),
  ('J-Idol', 'Math Rock', NULL, 'Rock / Punk', 'Math Rock'),
  ('J-Idol', 'Tsunku Pop', NULL, 'Idol Pop', 'Tsunku Pop'),
  ('J-Idol', 'Mixture Rock', NULL, 'Kawaii / Loud Rock', 'Mixture Rock'),
  ('J-Idol', 'Post Black Metal', NULL, 'Kawaii / Loud Rock', 'Post Black Metal'),
  ('J-Idol', 'Strange Pop', NULL, 'Idol Pop', 'Strange Pop'),
  ('J-Idol', 'Kawaii Metal', NULL, 'Kawaii / Loud Rock', 'Kawaii Metal'),
  ('J-Idol', 'Electronic', NULL, 'Electronic', NULL),
  ('J-Idol', 'Big Beat', NULL, 'Electronic', 'Big Beat'),
  ('J-Idol', 'Gothic Pop', NULL, 'Gothic Pop', NULL),
  ('J-Idol', 'Punk', NULL, 'Rock / Punk', NULL),
  ('J-Idol', 'Symphonic Metal', NULL, 'Kawaii / Loud Rock', 'Symphonic Metal'),
  ('J-Idol', 'Neo Music', NULL, 'Idol Pop', 'Neo Music'),
  ('J-Idol', 'Shibuya Pop', NULL, 'Idol Pop', 'Shibuya Pop'),
  ('J-Idol', 'Emo Rock', NULL, 'Rock / Punk', 'Emo'),
  ('J-Idol', 'Kawaiicore', NULL, 'Kawaii / Loud Rock', 'Kawaiicore'),
  ('J-Idol', 'Post Rock', NULL, 'Shoegaze / Post Rock', NULL),
  ('J-Pop', 'Pop Rock', NULL, 'Pop Rock', NULL),
  ('J-Pop', 'Adult Contemporary', NULL, 'Adult Contemporary', NULL),
  ('J-Pop', 'Pop', NULL, 'Pop / Dance', NULL),
  ('J-Pop', 'Indie Pop', NULL, 'Indie / City Pop', NULL),
  ('J-Pop', 'Urban Pop', NULL, 'Indie / City Pop', 'Urban Pop'),
  ('J-Pop', 'Anime', NULL, 'Anime / Character', NULL),
  ('J-Pop', 'Soft Rock', NULL, 'Adult Contemporary', 'Soft Rock'),
  ('J-Pop', 'Keyboard Pop', NULL, 'Pop / Dance', 'Keyboard Pop'),
  ('J-Pop', 'Jazz Pop', NULL, 'Jazz Pop', NULL),
  ('J-Pop', 'Old Pop', NULL, 'Adult Contemporary', 'Old Pop'),
  ('J-Pop', 'Pop Jazz', NULL, 'Jazz Pop', NULL),
  ('J-Pop', 'Meta Pop', NULL, 'Pop / Dance', 'Meta Pop'),
  ('J-Pop', 'Adult Contamparary', NULL, 'Adult Contemporary', NULL),
  ('J-Pop', 'Character Song', NULL, 'Anime / Character', NULL),
  ('J-Pop', 'Psychedelic', NULL, 'Pop Rock', 'Psychedelic'),
  ('J-Rock', 'Alternative', NULL, 'Alternative / Indie', NULL),
  ('J-Rock', 'Shoegaze', NULL, 'Shoegaze / Dream Pop', NULL),
  ('J-Rock', 'Pop Rock', NULL, 'Pop Rock', NULL),
  ('J-Rock', 'Psychedelic', NULL, 'Psychedelic', NULL),
  ('J-Rock', 'Post Rock', NULL, 'Alternative / Indie', 'Post Rock'),
  ('J-Rock', 'Hard Rock', NULL, 'Hard Rock', NULL),
  ('J-Rock', 'Indie Rock', NULL, 'Alternative / Indie', NULL),
  ('J-Rock', 'Post Hardcore', NULL, 'Punk / Emo', 'Post Hardcore'),
  ('J-Rock', 'Punk', NULL, 'Punk / Emo', NULL),
  ('J-Rock', 'Piano Rock', NULL, 'Pop Rock', 'Piano Rock'),
  ('J-Rock', 'Guitar Rock', NULL, 'Alternative / Indie', 'Guitar Rock'),
  ('J-Rock', 'Emo Rock', NULL, 'Punk / Emo', NULL),
  ('J-Rock', 'Art Rock', NULL, 'Progressive / Art Rock', NULL),
  ('J-Rock', 'Synth Rock', NULL, 'Alternative / Indie', 'Synth Rock'),
  ('J-Rock', 'Screamo', NULL, 'Punk / Emo', 'Screamo'),
  ('J-Rock', 'Heavy Metal', NULL, 'Hard Rock', 'Heavy Metal'),
  ('J-Rock', 'Bluse Rock', NULL, 'Hard Rock', 'Blues Rock'),
  ('J-Rock', 'Punk Rock', NULL, 'Punk / Emo', NULL),
  ('J-Rock', '超 Rock', NULL, 'Alternative / Indie', '超 Rock'),
  ('J-Rock', 'Pop Punk', NULL, 'Punk / Emo', 'Pop Punk'),
  ('Jazz', 'Anime', NULL, 'Anime / Game Jazz', NULL),
  ('Jazz', 'Nu Jazz', NULL, 'Contemporary / Nu Jazz', NULL),
  ('Jazz', 'Swing', NULL, 'Trio / Swing', NULL),
  ('Jazz', 'Neo Soul', NULL, 'Contemporary / Nu Jazz', 'Neo Soul'),
  ('Jazz', 'Fusion Jazz', NULL, 'Fusion', NULL),
  ('Jazz', 'Contemporary Jazz', NULL, 'Contemporary / Nu Jazz', NULL),
  ('Jazz', 'Trio', NULL, 'Trio / Swing', NULL),
  ('Jazz', 'Fusion', NULL, 'Fusion', NULL),
  ('Jazz', 'Game', NULL, 'Anime / Game Jazz', NULL),
  ('Jazz', 'Bebop', NULL, 'Trio / Swing', 'Bebop'),
  ('K-Pop', 'Dance Pop', NULL, 'Dance Pop', NULL),
  ('K-Pop', 'Pop Rock', NULL, 'Pop Rock / Alternative', NULL),
  ('K-Pop', 'Electro Pop', NULL, 'Electro / Synth Pop', NULL),
  ('K-Pop', 'Synth Pop', NULL, 'Electro / Synth Pop', NULL),
  ('K-Pop', 'Alternative', NULL, 'Pop Rock / Alternative', NULL),
  ('K-Pop', 'Hyper Pop', NULL, 'Electro / Synth Pop', 'Hyper Pop'),
  ('K-Pop', 'Indie Pop', NULL, 'Indie Pop', NULL),
  ('K-Pop', 'Playlist', NULL, NULL, 'Playlist'),
  ('K-Pop', 'Ballad', NULL, 'Ballad', NULL),
  ('K-Pop', 'Synthwave', NULL, 'Electro / Synth Pop', 'Synthwave'),
  ('K-Pop', 'Modern Pop', NULL, 'Indie Pop', 'Modern Pop'),
  ('K-Pop', 'Hard Rock', NULL, 'Pop Rock / Alternative', 'Hard Rock'),
  ('K-Pop', 'Pop', NULL, 'Dance Pop', NULL),
  ('Metal', 'Thrash', NULL, 'Thrash Metal', NULL),
  ('Metal', 'Melodic Death', NULL, 'Melodic / Power', 'Melodic Death'),
  ('Metal', 'Heavy Metal', NULL, 'Heavy Metal', NULL),
  ('Metal', 'Industrial', NULL, 'Metalcore / Industrial', NULL),
  ('Metal', 'Black Metal', NULL, 'Black / Blackgaze', NULL),
  ('Metal', 'Blackgaze', NULL, 'Black / Blackgaze', NULL),
  ('Metal', 'Melodic Speed', NULL, 'Melodic / Power', 'Melodic Speed'),
  ('Metal', 'Power Metal', NULL, 'Melodic / Power', NULL),
  ('Metal', 'Metalcore', NULL, 'Metalcore / Industrial', NULL),
  ('Metal', 'Gothic Metal', NULL, 'Gothic / Symphonic', NULL),
  ('Metal', 'Thrash Metal', NULL, 'Thrash Metal', NULL),
  ('Metal', 'Rap Metal', NULL, 'Metalcore / Industrial', 'Rap Metal'),
  ('Metal', 'LA Metal', NULL, 'Heavy Metal', 'LA Metal'),
  ('Metal', 'Pop Metal', NULL, 'Heavy Metal', 'Pop Metal'),
  ('Metal', 'Gothic', NULL, 'Gothic / Symphonic', NULL),
  ('OST', 'Game OST', NULL, 'Game OST', NULL),
  ('OST', 'Anime', NULL, 'Anime OST', NULL),
  ('OST', 'Game', NULL, 'Game OST', NULL),
  ('OST', 'Jazz', NULL, NULL, 'Jazz'),
  ('OST', 'Anime OST', NULL, 'Anime OST', NULL),
  ('OST', 'Ani OST', NULL, 'Anime OST', NULL),
  ('OST', 'Synth Pop', NULL, NULL, 'Synth Pop'),
  ('OST', 'Pop Rock', NULL, NULL, 'Pop Rock'),
  ('OST', 'Movie', NULL, 'Movie / Drama OST', NULL),
  ('Pop', 'R&B Pop', NULL, 'R&B / Soul', NULL),
  ('Pop', 'Art Pop', NULL, 'Indie / Modern Pop', 'Art Pop'),
  ('Pop', 'Pop Rock', NULL, 'Pop Rock / Alternative', NULL),
  ('Pop', 'Synth Pop', NULL, 'Dance / Electro Pop', 'Synth Pop'),
  ('Pop', 'Electro Pop', NULL, 'Dance / Electro Pop', NULL),
  ('Pop', 'Indie Pop', NULL, 'Indie / Modern Pop', NULL),
  ('Pop', 'Dance Pop', NULL, 'Dance / Electro Pop', NULL),
  ('Pop', 'Psychedelic', NULL, 'Indie / Modern Pop', 'Psychedelic'),
  ('Pop', 'Adult Contemporary', NULL, 'Adult Contemporary', NULL),
  ('Pop', 'Urban Pop', NULL, 'R&B / Soul', 'Urban Pop'),
  ('Pop', 'Soul', NULL, 'R&B / Soul', NULL),
  ('Pop', 'Modern Pop', NULL, 'Indie / Modern Pop', NULL),
  ('Pop', 'Various', NULL, 'Compilation / Various', NULL),
  ('Pop', 'Neo-Soul', NULL, 'R&B / Soul', 'Neo Soul'),
  ('Pop', 'Chanson', NULL, 'Chanson / World Pop', NULL),
  ('Pop', 'Alternative', NULL, 'Pop Rock / Alternative', NULL),
  ('Pop', 'Dacce Pop', NULL, 'Dance / Electro Pop', NULL),
  ('Pop', 'Euro Pop', NULL, 'Dance / Electro Pop', 'Euro Pop'),
  ('Pop', 'Baroque Pop', NULL, 'Indie / Modern Pop', 'Baroque Pop'),
  ('Rock', 'Shoegaze', NULL, 'Shoegaze / Dream Pop', NULL),
  ('Rock', 'Alternative', NULL, 'Alternative / Indie', NULL),
  ('Rock', 'Hard Rock', NULL, 'Hard Rock', NULL),
  ('Rock', 'Art Rock', NULL, 'Progressive / Art Rock', NULL),
  ('Rock', 'Pop Rock', NULL, 'Pop Rock', NULL),
  ('Rock', 'Punk', NULL, 'Punk / Emo', NULL),
  ('Rock', 'Progressive', NULL, 'Progressive / Art Rock', NULL),
  ('Rock', 'Psychedelic', NULL, 'Psychedelic', NULL),
  ('Rock', 'Dream Pop', NULL, 'Shoegaze / Dream Pop', NULL),
  ('Rock', 'Brit Pop', NULL, 'Alternative / Indie', 'Britpop'),
  ('Rock', 'Synth Rock', NULL, 'Alternative / Indie', 'Synth Rock'),
  ('Rock', 'Pop Punk', NULL, 'Punk / Emo', 'Pop Punk'),
  ('Rock', 'Funk Metal', NULL, 'Hard Rock', 'Funk Metal'),
  ('Rock', 'Indie Rock', NULL, 'Alternative / Indie', NULL),
  ('Rock', 'Grunge', NULL, 'Alternative / Indie', 'Grunge'),
  ('Rock', 'Punk Rock', NULL, 'Punk / Emo', NULL),
  ('Rock', 'Arena Rock', NULL, 'Hard Rock', 'Arena Rock'),
  ('Rock', 'Industrial', NULL, 'Hard Rock', 'Industrial'),
  ('Rock', 'Blackgaze', NULL, 'Shoegaze / Dream Pop', 'Blackgaze'),
  ('Rock', 'Post Punk', NULL, 'Punk / Emo', 'Post Punk'),
  ('Rock', 'Heavy Metal', NULL, 'Hard Rock', 'Heavy Metal'),
  ('Rock', 'Blues', NULL, 'Hard Rock', 'Blues Rock'),
  ('Rock', 'Baroque Pop', NULL, 'Pop Rock', 'Baroque Pop'),
  ('Rock', 'Ska Punk', NULL, 'Punk / Emo', 'Ska Punk'),
  ('Rock', 'Funk Rock', NULL, 'Hard Rock', 'Funk Rock'),
  ('Rock', 'Pop Metal', NULL, 'Hard Rock', 'Pop Metal'),
  ('World', 'Traditional', NULL, 'Traditional', NULL),
  ('기타', 'Playlist', NULL, 'Playlist', NULL),
  ('기타', 'Acustic', NULL, 'Acoustic', NULL),
  ('Rock', 'Ethnic', 'World', 'Ethnic / Folk', NULL);

-- ===== STEP 3-1. 미리보기: 대응표에 없는 값 (0행이어야 정상) =====
SELECT a.genre1, a.genre2, COUNT(*) AS cnt
FROM album a
WHERE coalesce(trim(a.genre1), '') <> 'Classic'
  AND coalesce(trim(a.genre2), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM genre2_migration_map m WHERE trim(a.genre1) = m.genre1 AND lower(trim(a.genre2)) = lower(m.old_genre2))
  AND NOT EXISTS (SELECT 1 FROM genre2_migration_map m WHERE trim(a.genre1) = m.genre1 AND a.genre2 = m.new_genre2)
GROUP BY a.genre1, a.genre2
ORDER BY a.genre1, a.genre2;

-- ===== STEP 3-2. 미리보기: 바뀔 내용 요약 =====
SELECT m.genre1, a.genre2 AS old_genre2,
       coalesce(m.new_genre1, m.genre1) AS new_genre1,
       m.new_genre2, m.add_tag, COUNT(*) AS cnt
FROM album a
JOIN genre2_migration_map m ON trim(a.genre1) = m.genre1 AND lower(trim(a.genre2)) = lower(m.old_genre2)
GROUP BY m.genre1, a.genre2, m.new_genre1, m.new_genre2, m.add_tag
ORDER BY m.genre1, cnt DESC;

-- ===== STEP 4. 실제 변경 (STEP 3 확인 후 실행) =====
UPDATE album a
SET genre1 = coalesce(m.new_genre1, a.genre1),
    genre2 = m.new_genre2,
    tags = CASE
      WHEN m.add_tag IS NULL THEN a.tags
      WHEN EXISTS (SELECT 1 FROM unnest(a.tags) t WHERE lower(trim(t)) = lower(m.add_tag)) THEN a.tags
      ELSE array_append(a.tags, m.add_tag)
    END
FROM genre2_migration_map m
WHERE trim(a.genre1) = m.genre1 AND lower(trim(a.genre2)) = lower(m.old_genre2);

-- ===== STEP 5. 결과 확인 =====
SELECT genre1, genre2, COUNT(*) AS cnt
FROM album
WHERE coalesce(genre1, '') <> 'Classic'
GROUP BY genre1, genre2
ORDER BY genre1, cnt DESC;

SELECT tag, COUNT(*) AS cnt
FROM album, unnest(tags) AS tag
GROUP BY tag
ORDER BY cnt DESC, tag;

-- ===== STEP 6. 정리 (앱에서 이상 없음을 확인한 뒤) =====
-- DROP TABLE genre2_migration_map;
-- 백업 테이블은 며칠 써 본 뒤 삭제:
-- DROP TABLE album_backup_genre2_261118;

-- ===== 되돌리기 (문제가 생겼을 때만) =====
-- UPDATE album a
-- SET genre1 = b.genre1, genre2 = b.genre2, tags = b.tags
-- FROM album_backup_genre2_261118 b
-- WHERE a.id = b.id;
