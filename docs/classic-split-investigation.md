# 클래식 분리 조사 보고서 (T-025)

조사일: 2026-11-16. **코드·DB는 수정하지 않음**(본 보고서 신규 파일만).

확정 전제: `album` 단일 테이블, 구분 `genre1 === 'Classic'`(`isClassicGenre`), Popular(가칭)는 `/albums`·`/artists` 유지 + 클래식 숨김, Classic는 `/classic/...` 추가, 다이어리·인사이트는 통합 유지, 목록 태그 Popular/Classic 제거·전체·All Time 유지, 등록 폼 분리, UI 라벨과 코드 scope 상수 분리.

---

## A. 클래식 의존 지점 전수

### 핵심 헬퍼·상수

| 파일:행 | 설명 | 분류 |
|---------|------|------|
| `src/app/albums/utils.ts:10-12` | `isClassicGenre` — `genre1.trim() === 'Classic'` | 기타(공통) |
| `src/app/albums/constants.ts:38-41` | `genreOptions`에 `'Classic'` 포함 | 등록 폼 |
| `src/app/albums/constants.ts:43-51` | `CLASSIC_FORM_OPTIONS`(형식) | 등록 폼 |
| `src/app/albums/constants.ts:74-76` | `isClassicFormOption` | 등록 폼 |
| `src/app/albums/constants.ts:53-60` | `COMPOSER_ERA_OPTIONS` | 등록 폼 / 아티스트 |
| `src/app/albums/constants.ts:62-72` | `ARTIST_TYPE_OPTIONS`(Popular+Classic 어휘 혼재) | 등록 폼 / 아티스트 |

### 등록 폼

| 파일:행 | 설명 |
|---------|------|
| `AlbumForm.tsx:145` | 클래식 시 아티스트 플레이스홀더「연주자(지휘자/솔리스트)」 |
| `AlbumForm.tsx:336-364` | 클래식→형식 select(`CLASSIC_FORM_OPTIONS`), 아니면 하위장르 텍스트 |
| `AlbumForm.tsx:365+` | 클래식→`composers` 다중 입력 UI |
| `AlbumForm.tsx:589-600` | 저장 전 형식 필수·작곡가 이름 중복 검사 |
| `ArtistsLibraryContent.tsx:84-106` | 작곡가에서 앨범 추가 시 `genre1: 'Classic'` 고정 초기값 |

### 저장 로직

| 파일:행 | 설명 |
|---------|------|
| `albums/actions.ts:56-68` | 클래식일 때만 `composers`/`composer_*` 페이로드 포함 |

### 상세 표시

| 파일:행 | 설명 |
|---------|------|
| `AlbumInfoSection.tsx:285` | `showMoodUi = !isClassicGenre` — 클래식 무드 UI 숨김 |
| `AlbumInfoSection.tsx:289+`, `617` | 클래식 작곡가 그리드·레거시 era 표시 |
| `AlbumInfoSection.tsx:49`, `579` | 작곡가 링크 → `/artists?role=composer&artist=...` |

### 목록·필터

| 파일:행 | 설명 |
|---------|------|
| `albums/utils.ts:219-221` | `LIBRARY_TAGS`: 전체·Popular·Classic·All Time |
| `albums/utils.ts:297-302` | `albumMatchesLibraryTag` — Popular=`!Classic`, Classic=`isClassicGenre`, All Time=year 메타 |
| `useAlbumFilters.ts:26,95-99` | `enableLibraryTags` 시 태그·All Time 연도 스킵 |
| `AlbumList.tsx:187-188` | 태그 칩 UI |
| `AlbumsLibraryContent.tsx:98` | `enableLibraryTags: !physicalOwnedOnly`(레코드선반은 태그 끔) |

### 통계 / 기타

| 파일:행 | 설명 | 분류 |
|---------|------|------|
| `lib/albumEnrichment.ts:65-67` | 클래식 무드 자동배정 `classic_skip` | 기타(enrichment) |
| `artists/utils.ts:76-111` | `buildArtistSummaries` — genre1 무관 전 앨범 포함 | 목록(아티스트) |
| `artists/utils.ts:113-161` | `buildComposerSummaries` — `composersFromAlbum` 전개 | 목록(작곡가) |
| `albums/utils.ts` composers 헬퍼 전반 | `composersFromAlbum`, `sanitizeComposersForSave`, `normalizeComposerNameKey` | 저장/표시/검색 |
| `ComposerComboSelect.tsx` | 작곡가 콤보·기존 메타 조회 | 등록 폼 |
| `updateArtistNames.ts` / `updateArtistProfileFields.ts` | 이름·부가정보 일괄(장르 필터 없음) | 기타(아티스트 편집) |

`'Classic'` 문자열 리터럴 직접 사용은 주로 `isClassicGenre`·`genreOptions`·`albumFormDataFromArtist`·라이브러리 태그 타입에 한정. 그 외는 헬퍼 경유.

---

## B. 메뉴·라우팅·링크 전수

### Navigation / AppShell

| 파일:행 | 설명 |
|---------|------|
| `Navigation.tsx:13-21` | `navItems`: Albums`/albums`, Artists`/artists`, Lyrics, RecordShelf, Head-fi, Works, Insights |
| `Navigation.tsx:60-64` | `getActive`: `pathname === path` 또는 `pathname.startsWith(path)`(`/` 제외) |
| `AppShell.tsx:48` | `pathname === '/artists'`일 때 데스크톱 Footer 숨김 |
| `proxy.ts:4` | 보호 prefix: `/albums`, `/headfi`, `/works`, `/lyrics`, `/archive`, `/insights` — **`/artists`·`/classic` 없음** |

### AlbumPageHeader

| 파일:행 | 대상 |
|---------|------|
| `AlbumPageHeader.tsx:43-44` | `/albums?panel=random`, `/albums?panel=taste` |
| `AlbumPageHeader.tsx:58` | `/albums/diary` |
| `AlbumPageHeader.tsx:122` | SubHeader 뒤로가기 → `/albums` |

### artists role 쿼리

| 파일:행 | 설명 |
|---------|------|
| `ArtistsLibraryContent.tsx:121-122` | `role=composer`만 composer, 그 외 artist |
| `ArtistsLibraryContent.tsx:160-164` | `buildLibraryPath` → `/artists?role=...&artist=...` |
| `artists/page.tsx` | Suspense + `ArtistsLibraryContent`만 |

### `/albums` · `/artists` · `role=composer` 링크·push 전수

| 파일:행 | 형태 |
|---------|------|
| `Navigation.tsx:14-15` | Link `/albums`, `/artists` |
| `DashboardContent.tsx:700` | Link `/albums/diary` |
| `DashboardContent.tsx:720` | Link `/albums` |
| `AlbumPageHeader.tsx` | 위 표 참고 |
| `AlbumsLibraryContent.tsx:409` | `router.replace(/albums?...)` |
| `AlbumsLibraryContent.tsx:625` | `basePath` `/albums` 또는 `/recordshelf` |
| `AlbumMoodboard.tsx:135` | `router.replace(/albums?...)` |
| `AlbumGenreboard.tsx:32` | 기본 `basePath='/albums'` |
| `GlobalAlbumDetailHost.tsx:247` | `router.push(/albums?mood=...)` |
| `ArtistsLibraryContent.tsx:667` | `router.push(/albums?mood=...)` |
| `AlbumInfoSection.tsx:173` | `/artists?role=artist&artist=` |
| `AlbumInfoSection.tsx:49`, `579` | `/artists?role=composer&artist=` |
| `ArtistDetailModal.tsx:367` | nameHref `/artists?role=artist&artist=` |
| `GlobalAlbumPlayer.tsx:688` | `router.push(/artists?role=artist&artist=)` |
| `HeadfiLibraryContent.tsx:899` 등 | `router.push(/albums?view=id)` |
| `HeadfiMatchContent.tsx:413` | 동일 |
| `HeadfiUsageStatsContent.tsx:372` | 동일 |

분리 후 작곡가·클래식 앨범 링크는 `/classic/...`로 바꿔야 하는 후보: `AlbumInfoSection` composer 링크, Artists composer 탭 URL, (추측) 클래식 연주자 상세 nameHref.

---

## C. 앨범 목록 필터·가챠·All Time

### LIBRARY_TAGS

- 정의: `albums/utils.ts:219-221` — `'전체' | 'Popular' | 'Classic' | 'All Time'`.
- 매칭: `albumMatchesLibraryTag`(`297-302`)  
  - 전체: 전부  
  - Popular: 비클래식  
  - Classic: 클래식  
  - All Time: `albumHasAllTimeYear`(앨범 `year` 배열에 `"All Time"` 메타) — **장르 필터가 아님**.
- UI: `AlbumList.tsx` 태그 칩. 훅: `useAlbumFilters` + `AlbumsLibraryContent`에서 `enableLibraryTags: !physicalOwnedOnly`.

**Popular·Classic 태그 제거 영향**: 목록에서 장르 스코프 UI가 사라짐 → Popular/Classic **메뉴 분리로 대체**해야 동일 필터 가능. `albumMatchesLibraryTag`·타입·`LIBRARY_TAGS`·AlbumList 칩·기본값 `'전체'` 정리 필요. 레코드선반(`physicalOwnedOnly`)은 이미 태그 비활성.

### All Time(연도 메타)

- 앨범 필드 `year`에 `'All Time'` 포함 여부(`albumHasAllTimeYear`, `utils.ts:267-271`).
- 등록: `AlbumForm.tsx:98,221-225` All Time 체크박스.
- 목록: 태그 All Time 선택 시 연도 select 비활성(`AlbumList.tsx:76`, `useAlbumFilters.ts:98`).
- 보드 뱃지: `albumBoardShared.tsx:28,113`.
- **가챠**: `LOTTERY_CATALOG_TAGS = ['전체','All Time']`(`utils.ts:314-316`) — 이미 Popular/Classic 없음. `albumMatchesCatalogLotteryConditions`에서 All Time이면 year 메타 필수.

**결론**: All Time은 유지. Popular/Classic 태그만 제거하면 가챠 쪽은 거의 무영향.

---

## D. 아티스트 화면

### 요약 빌드

- `buildArtistSummaries`(`artists/utils.ts:76-111`): `album.artist`별 그룹, **genre1 필터 없음** → 클래식·비클래식 앨범이 한 아티스트에 섞임(예: Erich Kunzel).
- `buildComposerSummaries`(`113-161`): 전 앨범의 composers 전개. 비클래식에 composers가 거의 없으면 사실상 클래식 중심이나 **코드상 장르 제한 없음**.

### role 탭

- `ArtistsLibraryContent`: URL `role` + 토글 UI, summaries 분기(`187` 근처).
- `ArtistTopControlBar`: artist면 구분·장르 필터, composer면 시대 필터(`COMPOSER_ERA_OPTIONS`).
- `useArtistFilters`: role별 필터·정렬.
- `ArtistLotteryModal`: 현재 role 요약 목록 대상.

### Popular에서 클래식 제외 시

- 앨범 수·국적·구분 최빈값·관련 아티스트·통계·위키 후보가 **비클래식 앨범만**으로 재계산됨.
- 교차 보유 아티스트(Kunzel 등)는 Popular/Classic에 **각각** 나타날 수 있음.
- 작곡가 탭을 Popular `/artists`에서 제거하면 `role=composer` 진입점·링크 전부 Classic 쪽으로 이동 필요.

### Classic 연주자 / 원작곡가 탭

- 연주자: `buildArtistSummaries(classicAlbumsOnly)`.
- 원작곡가: `buildComposerSummaries(classicAlbumsOnly)`(현 composer role과 동일 패턴).
- UI는 현 Artists 토글(아티스트|원작곡가)을 Classic 메뉴에 이식하면 됨. Popular Artists에서는 composer 토글 제거가 자연스러움.

### Various Artist

- `buildArtistSummaries`는 제외하지 않음 → Popular·Classic 연주자 목록에 **그대로 노출**.
- 인사이트/주간핫 아티스트 랭킹만 `isVariousArtistName`으로 제외(`albumListenStats.ts:15-17,522`, `weeklyHot.ts:109,140`).
- 표기 변형: `'various artist'` / `'various artists'`(공백 정규화).

---

## E. 통계·소비처 — 그대로 둠 / 손봄

| 소비처 | 클래식 처리 현황 | 이번 결정 |
|--------|------------------|-----------|
| 대시보드(`DashboardContent`) | 앨범·청취 통합 | **그대로 둠**(통합) |
| 인사이트(`GenreStatsContent`) | 장르 통계에 Classic 포함 가능 | **그대로 둠** |
| 앨범 통계(`AlbumStatsContent`) | 통합 | **그대로 둠** |
| 다이어리 | 통합 | **그대로 둠** |
| 가사·번역 라이브러리 | 앨범 목록/폼 공용 | **그대로 둠**(추측: 장르 필터 없으면 Classic도 보임 — 제품 확인 여지) |
| 레코드선반 | `AlbumsLibraryContent` physical | **손봄 후보**: Popular만? 실물 Classic도 선반에? → 열린 질문 |
| 앨범/아티스트 가챠 | 카탈로그 태그 전체·All Time | Popular 화면은 비클래식 풀로 **손봄** |
| 글로벌 플레이어 | 재생 중 아티스트 링크 `/artists?role=artist` | 클래식 연주자면 Classic URL로 **손봄** |
| Head-fi match/view → `/albums?view=` | 앨범 상세 딥링크 | Popular 앨범 전제면 유지; Classic 앨범이면 `/classic/albums?view=` **손봄** |
| Moodboard / 무드 추천 | 클래식 enrichment skip·상세 무드 숨김 | Popular 전용 성격 유지 → **그대로**(이미 스킵) |
| `updateArtist*` 일괄 수정 | 전 장르 앨범 | **손봄**(§J) |

---

## F. 재사용성 설계안

규모: `ArtistsLibraryContent` ~1039줄, `AlbumsLibraryContent` ~743, `AlbumList` ~516, `AlbumForm` ~672. props·URL·모달·폼이 한 파일에 결합.

### 안 1(추천): `catalogScope: 'popular' | 'classic'` prop + 경로 래퍼

- `/albums`, `/artists`와 `/classic/albums`, `/classic/artists` 페이지가 동일 Content에 scope만 전달.
- 데이터 로드 후 `albums.filter(a => scope==='classic' ? isClassicGenre : !isClassicGenre)`.
- 장점: 중복 최소, 기존 버그픽스 한 곳 반영.  
- 단점: Content가 더 비대해질 수 있음 → scope 분기 헬퍼로 격리 필요.
- UI 라벨(Popular 가칭)은 `scope`와 분리된 display 상수로.

### 안 2: 라우트별 얇은 페이지 + 공용 훅만 공유

- `useAlbumLibrary` / `useArtistLibrary` 추출 후 Classic/Popular UI 분리.
- 장점: 화면별 독립성. 단점: 초기 추출 비용·드리프트 위험 큼(1000줄급).

**추천: 안 1.** 분리 1차 목표는 필터·내비·폼 진입이지 아키텍처 전면 개편이 아님. 이후 비대하면 훅 추출(안 2 방향)로 리팩터.

---

## G. 등록 폼 분리

### AlbumForm 클래식 분기 전수

1. 아티스트 플레이스홀더(145)  
2. genre1 변경 시 classicFormError 리셋(326-329)  
3. 형식 vs 하위장르 UI(336-364)  
4. composers 블록(365+)  
5. 저장 검증 형식·중복(589-600)  
(+ actions.ts 저장 시 composers 포함)

### AlbumForm 진입점·초기값

| 진입 | 파일 | 초기값 특징 |
|------|------|-------------|
| 앨범 라이브러리 | `AlbumsLibraryContent` | 검색/수동, MusicBrainz 선택 |
| 레코드선반 | 동일 Content `physicalOwnedOnly` | 동일 폼 |
| 아티스트 | `ArtistsLibraryContent` `albumFormDataFromArtist` | composer→`genre1:'Classic'`+composers; artist→주 장르 |
| 대시보드 | `DashboardContent` | 수정 위주 |
| 인사이트/앨범통계 | Genre/Album Stats | 수정 |
| 다이어리 | `AlbumDiaryContent` | 수정 |
| 가사 | `AlbumTrackListContent` | 수정 |
| 글로벌 상세 | `GlobalAlbumDetailHost` | 수정 |

### MusicBrainz(`AlbumSearchSection`)

- 검색 UI만 담당(`AlbumSearchSection.tsx`). 장르 모름.
- 선택 후 폼에 아티스트·앨범명 등 주입하는 쪽은 `AlbumsLibraryContent`. Classic 전용 등록 플로우에서는: (a) 검색 후 폼에서 genre1 Classic 고정, 또는 (b) Classic 등록 진입 시 검색 결과를 클래식 폼으로만 연결.
- **추측**: MB 결과에 클래식/비클래식 자동판별은 없음 → 사용자가 메뉴(Popular/Classic 등록)로 결정.

### 장르 전환 금지 지점

- 수정 모드(`isEdit`)에서 `genre1` select 비활성 또는 Classic↔비Classic 옵션 숨김.
- 서버 `actions.ts`에서도 기존 row genre1과 요청 genre1의 클래식 여부 불일치 시 reject 권장(클라이언트만이면 우회 가능).
- 신규: Popular 폼 `genreOptions`에서 Classic 제거; Classic 폼 genre1 고정·형식 필수.

### 분기 제거 후 Popular AlbumForm 모습

- composers UI·형식 select·classic 검증 삭제.
- 아티스트 플레이스홀더 일반화.
- Classic 전용 폼(또는 `mode="classic"`)이 composers·형식·연주자 카피 담당.

---

## H. 구현 단계 제안

| 단계 | 내용 | 주요 파일 | 위험 | 되돌리기 | 의존 |
|------|------|-----------|------|----------|------|
| H1 | 공통 `CatalogScope`·필터 헬퍼·라벨 상수 | `albums/utils` 또는 `lib/catalogScope` | 낮음 | 쉬움 | 없음 |
| H2 | 목록 태그 Popular/Classic 제거, 전체·All Time만 | `utils`, `AlbumList`, `useAlbumFilters` | 낮음 | 쉬움 | H1 권장 |
| H3 | Popular `/albums`·`/artists`에서 클래식 앨범 숨김; Artists에서 composer 탭 제거(또는 Classic로 안내) | Library Contents, TopBar | 중(북마크 `role=composer`) | 중 | H1 |
| H4 | `/classic/albums`, `/classic/artists` + Nav 항목 + proxy `/classic` + AppShell footer 규칙 | pages, Navigation, proxy, AppShell | 중 | 중 | H1·H3 |
| H5 | 딥링크 정리(작곡가→classic, view/mood, 플레이어 아티스트) | AlbumInfoSection, Player, Head-fi pushes | 중 | 중 | H4 |
| H6 | 폼 분리(Popular에서 Classic 제거, Classic 폼, 수정 시 전환 금지) | AlbumForm, actions, 진입점 | 중~높음 | 중 | H4 |
| H7 | 부가정보 일괄수정 scope(§J) + ARTIST_TYPE 옵션 분리 | updateArtistProfileFields, InfoEditModal, constants | 중 | 중 | H3·H4 |
| H8 | 가챠·필터 풀을 scope에 맞춤, 회귀 확인 | Lottery modals, filters | 낮~중 | 쉬움 | H3·H4 |

**추천 순서**: H1 → H2 → H3 → H4 → H5 → H6 → H7 → H8.  
근거: 읽기 경로(목록 숨김·라우트)를 먼저 검증한 뒤 쓰기(폼·일괄수정)로 가면 데이터 오염 위험과 롤백 범위가 작다. H2는 독립적으로 먼저 가능.

---

## I. 열린 질문·위험

1. **Popular 최종 UI 라벨** — 코드 scope와 분리 확정이나 표기 문자열 미정.  
2. **레코드선반** — Classic 실물 앨범 포함 여부.  
3. **가사/Works** — Classic 트랙 노출·편집을 Popular 흐름에 둘지.  
4. **`/artists` 미보호**(`proxy.ts`) — `/classic` 추가 시 인증 정책 통일 필요.  
5. **교차 아티스트 이름 변경** — 한쪽 메뉴에서 rename 시 반대 장르 앨범 artist/composer도 바꿀지(§J 권고: 이름은 양쪽).  
6. **Composer가 비클래식 앨범에 남아 있는 레거시** — `buildComposerSummaries`·일괄수정이 장르 무시하면 Popular composer 유령 데이터(추측·SQL로 확인 권장).  
7. **Nav `startsWith('/albums')`** — `/albums/diary`·stats와 활성 충돌은 현행과 동일; `/classic/albums`는 별 path라 괜찮음.  
8. **Head-fi ` /albums?view=`** — Classic 앨범 ID면 상세가 Popular 목록 컨텍스트에서 열릴 수 있음.  
9. **깨질 기능**: 북마크된 `/artists?role=composer`, 앨범 상세 작곡가 링크, 아티스트 부가정보 일괄이 반대 장르 `artist_type`을 덮어쓰는 문제(현재).

---

## J. 부가 정보 일괄 수정 범위

### 현재

- `updateArtistProfileFields.ts`: 이름 일치 앨범 **전 장르** 갱신(`fetchTargetAlbums`에 genre1 조건 없음, ~171-214, 216+).
- `artist_type`은 role=artist일 때 `album.artist_type` 일괄.
- 국적·위키는 연주자↔작곡가 교차 반영(역할 간). **장르 간 교차는 사실상 동일 쿼리로 이미 발생**.
- `ARTIST_TYPE_OPTIONS`에 솔로·아이돌·…·연주자·지휘자·음악감독 혼재(`constants.ts:62-72`).
- `updateArtistNames`도 장르 무관 이름 일괄.

### 데이터(JW 제공, SQL 미실행)

- Erich Kunzel: Classic 1 + 기타 1  
- Various Artist: Classic 1 + 기타 8 → 양쪽 연주자 목록에 이름 노출(§D). 인사이트 랭킹만 제외.

### 권고 설계

| 필드 | 권고 | 이유 |
|------|------|------|
| `artist_type` | **현재 메뉴(scope)의 앨범만** 갱신 | Popular/Classic 어휘 충돌 방지 |
| `country`, `wiki_url`(및 작곡가 country/wiki) | **양쪽 장르 반영 유지** 가능 | 인물 단위 정보. 다만 scope 제한 옵션을 두면 실수 복구에 유리 — 기본은 양쪽 반영 추천 |
| `era`(작곡가) | Classic(또는 composer 앨범)만 | 시대는 클래식 맥락 |
| 이름1·이름2 | **양쪽 모두** | 동일 인물 identity; 한쪽만 바꾸면 목록 분열 |

구현 스케치:

- `UpdateArtistProfileFieldsParams`에 `catalogScope?: 'popular' | 'classic' | 'all'`(기본은 호출 메뉴).
- `artistType` 패치 시 fetch/update에 `isClassicGenre` 필터 강제.
- country/wiki는 `all` 또는 명시적 cross-scope.
- `ARTIST_TYPE_OPTIONS` → `POPULAR_ARTIST_TYPE_OPTIONS` / `CLASSIC_ARTIST_TYPE_OPTIONS`(또는 scope 필터). 폼·InfoEditModal·TopControlBar 각각 사용.
- 영향 파일: `updateArtistProfileFields.ts`, `applyAlbumProfileFieldsRetarget`, `ArtistInfoEditModal.tsx`, `AlbumForm.tsx`, `ArtistTopControlBar.tsx`, `constants.ts`, 호스트 호출부(Library/Modal)에서 scope 전달.

이름 변경(`updateArtistNames`)은 scope 제한 **비권장**(반대쪽 앨범이 옛 이름으로 남음). 대신 확인 카피에「모든 장르 앨범의 이름이 바뀝니다」정도를 Classic 분리 후 모달에 추가하는 편이 안전.

### Various Artist 노출 요약

| 화면 | 노출 |
|------|------|
| Popular/Classic 아티스트(연주자) 목록 | 예(`buildArtistSummaries`) |
| 원작곡가 탭 | 이름에 Various가 composer로 들어간 앨범이 있을 때만(데이터 의존) |
| 인사이트·주간 아티스트 랭킹 | 아니오(`isVariousArtistName`) |

분리 후에도 목록 제외를 원하면 summaries 단계 필터가 추가 결정 사항.

---

## 에이전트 제안(요약)

1. **scope prop 재사용(안 1)**이 1차 구현에 적합.  
2. **쓰기 경로보다 읽기 경로 먼저**(H3→H4→H6).  
3. **`artist_type`만 scope 제한**, 국적·위키·이름은 인물 단위 — 가장 적은 놀람.  
4. proxy·Nav·AppShell에 `/classic`을 한 단계(H4)에서 같이 넣기.  
5. JW SQL로 확인할 것: 비Classic인데 `composers`/`composer` 있는 행 수, Popular·Classic 교차 artist 목록.

— 끝 —
