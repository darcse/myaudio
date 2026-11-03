# CONVENTIONS.md — myaudio

## 프로젝트 개요

개인 음악·헤드파이 라이브러리. 앨범·아티스트·헤드파이 기기·가사를 관리한다.
배포 URL: https://audio.sshlove.com

---

## 기술 스택

- Framework: Next.js 15 App Router + TailwindCSS v4
- Database: Supabase (Auth + PostgreSQL + RLS) — mylibrary / mybooks와 동일 인스턴스 공유
- Deployment: Vercel
- AI: Gemini (`gemini-3.5-flash-lite`), OpenAI (`gpt-5.4-mini`), Anthropic Claude Sonnet. 모델명 기본값은 `src/lib/aiModels.ts` 한 곳에서 관리
- External API: MusicBrainz, Cover Art Archive, YouTube IFrame Player API, YouTube oEmbed, YouTube Music 카탈로그(비공식 내부 API, 한국 앨범 트랙 제목 한정), iTunes Search API(애플뮤직 앨범 주소 찾기, 키 불필요)
- Font: Pretendard
- dev 런처: Tauri 웹뷰(macOS). 외부 링크 열기는 런처 capabilities의 shell open 권한(`http`/`https` 한정)이 있어야 동작한다.

---

## 폴더 구조

```
myaudio/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # 대시보드
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── albums/
│   │   │   ├── page.tsx
│   │   │   └── _components/      # AlbumForm, AlbumDetailModal, AlbumInfoSection, ComposerComboSelect 등
│   │   ├── artists/
│   │   │   └── _components/      # ArtistsLibraryContent (아티스트/작곡가 토글, URL 기준 선택)
│   │   ├── headfi/page.tsx
│   │   ├── lyrics/page.tsx
│   │   ├── archive/
│   │   │   ├── page.tsx
│   │   │   └── [year]/[month]/page.tsx
│   │   └── api/
│   │       ├── analyze-music-taste/route.ts
│   │       ├── mood-recommend/route.ts
│   │       ├── album-intro/route.ts
│   │       ├── album-mood-groups/route.ts
│   │       ├── album-mood-assign/route.ts
│   │       ├── analyze-lyrics-vibe/route.ts
│   │       ├── headfi-fr-image/route.ts
│   │       ├── headfi-fr-interpret/route.ts
│   │       ├── headfi-recommended-genres/route.ts
│   │       ├── headfi-sound-analysis/route.ts
│   │       ├── headfi-review-summary/route.ts
│   │       ├── monthly-review-comment/route.ts
│   │       ├── youtube-track-titles/route.ts   # 앨범 플레이어 트랙 제목 조회 (oEmbed + 한국 앨범 카탈로그)
│   │       └── apple-music-album/route.ts      # 애플뮤직 앨범 주소 자동 찾기 (iTunes Search API)
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── features/
│   │   └── GlobalAlbumPlayer.tsx  # 앨범 전역 플레이어 (띠 + 확장 모달, 유튜브 플레이어 인스턴스 1개)
│   ├── contexts/
│   │   └── AlbumPlayerContext.tsx # 앨범 플레이어 전역 상태 (current / session / expanded만)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── aiModels.ts           # AI 모델명 기본값 단일 관리
│   │   ├── musicbrainz.ts
│   │   ├── gemini.ts
│   │   ├── albumEnrichment.ts    # 신규 앨범 소개·무드 자동 생성 (단계별 로그)
│   │   ├── listenHistoryGear.ts  # 청취 이력 Source/Amp/Receiver/Media 공용 상수·포매터
│   │   ├── headfiSoundScores.ts  # 청음 평점 AI 프롬프트 블록 공용 정의
│   │   ├── headfiPosition.ts     # 포지션 맵 좌표 공식
│   │   ├── headfiReviewSources.ts # 외부 리뷰 요약 출처 파싱·길이 상한·캐시 판정
│   │   ├── youtubePlaylist.ts    # 유튜브 재생목록 주소 → ID 추출
│   │   ├── youtubeIframeApi.ts   # IFrame API 스크립트 1회 로드, 플레이어 준비 판정
│   │   ├── youtubeTracks.ts      # 트랙 목록 캐시 형식·불일치 판정
│   │   ├── appleMusic.ts         # iTunes 검색 결과 정규화·일치도 판정
│   │   └── utils.ts
│   ├── hooks/
│   └── types/
│       └── index.ts
├── feature_list/
│   ├── SETUP.json
│   ├── ALBUM.json
│   ├── GEAR.json
│   ├── LYRICS.json
│   ├── UX.json
│   ├── AUTH.json
│   └── BUG.json
├── .env.local
├── CLAUDE.md
├── AGENTS.md
├── HARNESS.md
├── CONVENTIONS.md
├── claude-progress.txt
└── Codex-progress.txt
```

---

## DB 테이블

mylibrary / mybooks와 동일한 Supabase 인스턴스를 공유한다.
별도 prefix 없음 — 이 앱에서 사용하는 테이블만 접근한다.

### 사용 테이블

| 테이블 | 용도 |
|--------|------|
| `album` | 음악 앨범 컬렉션 (`genre1`, `genre2`, `mood_name`, `mood_manually_set`, `artist_type`, 작곡가 4종 `composer` / `composer_country` / `composer_era` / `composer_wiki_url`, 재생 연결 `youtube_playlist_id` / `youtube_tracks` / `apple_music_url` 포함) |
| `artists` | 아티스트 프로필 (`artist_name` UNIQUE, 보조이름 `name_alt`, 바이오, 프로필 이미지, 외부 링크). 아티스트 목록 자체는 `album.artist` 문자열로 묶고, 프로필 행은 상세 진입 시 생성 |
| `headfi` | 헤드파이 기기 컬렉션 (보유 상태 `status2`, 청음 평가, AI 분석, 외부 리뷰 요약, 포지션 좌표 포함) |
| `headfi_accessories` | 독립 액세서리 (id uuid, 카테고리·이름·가격·구매일, `status`: `owned` / `released` / `transferred`) |
| `headfi_accessory_links` | 기기 ↔ 액세서리 연결 (N:M). `headfi_id` int FK, `accessory_id` uuid FK, 둘 다 ON DELETE CASCADE, UNIQUE(headfi_id, accessory_id), user_id 기반 RLS |
| `headfi_combos`, `headfi_sales`, `headfi_device_settings`, `headfi_match_cache` | 조합 / 판매 / 게인 세팅 / 매칭 점수 캐시 |
| `lyrics` | 가사/음원 컬렉션 |
| `album_listen_history` | 앨범 청취 이력 |
| `album_mood_groups` | 무드보드 그룹 캐시 (9개 무드) |
| `album_moods` | 사용자별 무드명 관리 |
| `monthly_review_comments` | 월별 Archive Gemini 코멘트 캐시 (mybooks와 공용) |

### 접근하지 않는 테이블 (mybooks 전용)

`books`, `comics`, `photobook`, `book_highlights`, `book_stats_comments`

### 크로스 참조 (앱 내 허용)

- `album.manual_recommended_headphone_ids` → `headfi.id` 참조 (같은 앱 내)
- `headfi.ai_recommended_album_ids` → `album.id` 참조 (같은 앱 내)
- 무드 추천 API는 album + headfi 테이블 동시 조회
- 작곡가는 별도 테이블 없이 `album.composer` 문자열로 묶는다. 작곡가 프로필은 같은 이름의 `artists` 행을 공유한다.

### id 타입 (SQL 작성 시 확인 필수)

- `album.id`: integer
- `artists.id`: uuid
- `headfi.id`: integer
- `headfi_accessories.id`: uuid
- `album_listen_history.id`: uuid, `album_id`: bigint, 기기 컬럼(`source_id` / `dac_amp_id` / `dac_amp2_id` / `headphone_id`): integer
- `headfi_match_cache`: `id` uuid, `base_gear_id` / `target_gear_id` integer, `combo_id` uuid
- `headfi` 청음 평점 컬럼은 모두 smallint, NULL 허용, 기본값 없음
- `album.youtube_tracks`: jsonb, `album.youtube_playlist_id` / `album.apple_music_url`: text
- 그 외 테이블은 추측하지 말고 조회 후 확인한다.

---

## 앨범 규칙

### 아티스트·작곡가 필드

- `album.artist`는 **연주자(아티스트)**다. `album.country`는 연주자 국적이다.
- 작곡가 필드 4종은 Classic 앨범에서만 입력·표시한다: `composer`(이름), `composer_country`(작곡가 국적), `composer_era`(시대), `composer_wiki_url`(작곡가 위키피디아).
- 비Classic으로 저장하면 작곡가 키를 저장 payload에서 제외한다. DB의 기존 작곡가 값은 지워지지 않는다.
- 작곡가 이름은 앨범 검색 대상에 포함한다.
- 작곡가 위키피디아는 `composer_wiki_url`만 쓴다. 없으면 연주자 `wiki_url`로 대체하지 않는다.

### Classic 형식·시대

- Classic일 때 장르2는 **형식 셀렉트(필수)**다: 교향곡 / 관현악, 협주곡, 실내악, 기악 / 독주, 성악 / 오페라 / 합창, 발레 / 극장·부수음악, 컴필레이션.
- 레거시 장르2 값은 그대로 표시하고, 수정 저장 시에는 형식을 선택해야 한다.
- 시대(`composer_era`)는 선택 항목이다: 고음악 (중세·르네상스), 바로크, 고전주의, 낭만주의, 근현대, 혼합 / 옴니버스.

### 작곡가 입력 콤보박스

- Classic 폼의 작곡가 입력은 콤보박스(`ComposerComboSelect`)다. 후보는 `album.composer` 고유값이며, 목록에서 선택하거나 직접 입력할 수 있다.
- 목록에서 **선택한 경우에만** 국적·시대·위키를 자동으로 채운다. 작곡가별 대표값은 비어 있지 않은 값 중 최빈값, 동률이면 최근 `created_at` 값이다. 작곡가 쪽에 값이 없는 필드는 기존 입력을 지우지 않는다.
- 직접 타이핑만 하면 이름만 바뀌고 다른 필드는 채우지 않는다.

### 아티스트 구분 (`artist_type`)

- 값: 밴드, 솔로, 아이돌, 그룹, 걸스 밴드, 연주자, 지휘자, 음악감독, 기타
- **음악감독**은 게임·영화·드라마 OST 작곡가를 뜻한다. Classic의 작곡가 필드(`album.composer`)와는 별개다.

### 국가 선택지

- 오스트리아, 이탈리아, 체코, 폴란드, 헝가리, 핀란드, 스페인, 네덜란드를 추가했다(기타 앞).

### 앨범 메뉴 목록·필터

- 타이틀: "Album Library"
- 연도 셀렉트에 "기간 전체"가 있다(구 올타임 옵션은 제거).
- 태그 버튼: 전체 / Popular / Classic / All Time. 기본은 전체다. All Time은 연도를 무시하고, 나머지는 연도·다른 필터와 AND로 적용한다. Popular는 Classic이 아닌 모든 앨범이다.
- 앨범 메뉴의 랜덤 추천 버튼은 제거했다(코드는 유지).

### 랜덤 앨범 추천

- 최상단 랜덤 추천 버튼은 모달만 연다. 자동 추첨하지 않는다.
- 기간(기본: 기간 전체)과 태그(기본: 전체)를 선택하고 "추천 받기"로 추첨한다. "다시 추천"으로 같은 조건에서 재추첨한다.

### 앨범 등록/수정 폼 순서

- 앨범명은 한 줄 전체 폭이다.
- 물리 매체 이후 순서: 애플뮤직 주소 + 유튜브 뮤직 재생목록 / 타이틀곡 URL + Wikipedia URL / 장르1 + 장르2(형식) / 작곡가 + 작곡가 국적 / 시대 + 작곡가 위키피디아 URL
- 모바일에서는 각 줄을 세로로 쌓는다.

### 앨범 상세 모달

- 상단 버튼(커버 영역 우측 하단, 같은 축소 크기): **TV → 애플뮤직 → ▶**
  - TV: 타이틀곡 유튜브 영상(`title_song_url`이 있을 때만)
  - 애플뮤직: 애플뮤직에서 열기(`apple_music_url`이 있거나 자동 찾기로 찾았을 때만)
  - ▶: 유튜브 뮤직 앨범 전체 재생(`youtube_playlist_id`가 있을 때만)
- 작곡가 표시(Classic): 1줄 `작곡가: {이름}`(링크), 2줄 `국기 국적 · 시대`(작고 흐린 글씨, 둘 다 없으면 줄 숨김)
- 아티스트명·작곡가명을 클릭하면 모달을 닫고 아티스트 메뉴의 해당 뷰로 이동한다.

---

## 아티스트 메뉴 규칙

- 아티스트 / 작곡가 토글이 있다. 작곡가 뷰는 `album.composer` 기준으로 묶고, 필터는 검색 / 국적 / 시대 / 형식 태그다.
- **토글과 선택 대상은 URL(`role`, `artist`)이 유일한 기준이다.**
  - 경로: `/artists?role=artist|composer&artist={이름}`. `role=composer`가 아니면 아티스트 뷰다.
  - 토글과 선택은 URL에서 파생한다. 별도 state로 복제하거나 effect로 URL과 동기화하지 않는다(과거 이 구조 때문에 버그가 연쇄로 났다).
  - 목록 클릭·토글 전환은 `router.replace`로 URL만 바꾼다. 앨범 모달 링크는 `push`라 뒤로가기로 돌아갈 수 있다.
  - URL의 이름이 목록에 없으면 화면 표시만 첫 항목으로 폴백한다. URL은 고치지 않는다.
- `/artists` 딥링크 진입점: 앨범 상세 모달의 아티스트명·작곡가명, Insights 아티스트 모달(`ArtistDetailModal`)의 아티스트명
- 이름 변경·병합 시 `album.artist`와 `album.composer`를 함께 갱신한다. 이름 저장 후에는 URL을 새 이름으로 `replace`한다.
- 작곡가 뷰의 바이오는 작곡가 기준으로 생성한다.

---

## 앨범 플레이어 (유튜브 뮤직) 규칙

### 데이터

- `album.youtube_playlist_id`: 재생목록 **ID만** 저장한다(유튜브 뮤직 앨범 `OLAK5uy_…`, 직접 만든 공개·일부 공개 재생목록 `PL…` 모두 가능). 폼은 주소·ID 어느 형태로 넣어도 `list` 값을 추출한다. 비공개 재생목록은 임베드에서 재생되지 않는다.
- `album.youtube_tracks`: 트랙 목록 캐시 `[{ videoId, title }]`(재생목록 순서)
  - 확장 모달에서 처음 필요할 때 조회한다. 플레이어 `getPlaylist()` 결과와 **길이 + 순서**가 다르거나 비어 있으면 다시 조회한다.
  - 로그인 사용자만 저장한다. 비로그인은 조회만 하고 저장 액션을 호출하지 않는다.
  - 재생목록 ID가 바뀌어 저장되면 `youtube_tracks`를 NULL로 비운다. 확장 모달 새로고침 버튼(로그인만)으로 다시 조회할 수 있다.

### 트랙 제목 조회 (`/api/youtube-track-titles`)

- 기본은 유튜브 oEmbed(서버에서 호출, 동시 요청 4개 제한). 요청당 ID 200개 상한과 형식 검사가 있다.
- oEmbed는 언어 설정을 무시하고 현지화(주로 영어) 제목을 준다. 그래서 `album.country = '한국'`인 앨범에서 제목에 한글·가나·한자가 없을 때만 유튜브 뮤직 카탈로그(`WEB_REMIX`, `hl=ko`)를 한 번 더 조회해 한글 원제를 받는다. 국가는 요청 body로 넘긴다.
- 카탈로그 조회는 **비공식 내부 API**라 언제든 바뀌거나 막힐 수 있다. 실패(오류, 타임아웃 2000ms, 빈 값)하면 oEmbed 제목을 쓰고 서버 로그에 `[youtube-track-titles] music_fallback`과 사유를 남긴다.
- 제목 조회에 실패한 곡은 `트랙 n`으로 표시한다.

### 플레이어 구조

- `AlbumPlayerProvider`는 `LyricsPlayerProvider` 안에 있다. 플레이어 컴포넌트는 `GlobalAlbumPlayer` 하나이고, 유튜브 플레이어 인스턴스는 **1개**다. 띠 ↔ 확장 모달 전환은 클래스와 `setSize`로만 하며 `destroy` / 재생성하지 않는다. 다른 앨범은 `loadPlaylist`로 교체한다.
- 플레이어 메서드는 `onReady` 이후에만 호출한다. `playerRef` 등록과 진행 타이머 시작도 `onReady` 뒤에 한다. 닫기·언마운트 시 타이머, 타임아웃, 플레이어, iframe을 모두 정리한다(`teardownPlayer`).
- 성능: IFrame API 스크립트는 앱 시작 시 로드하지 않는다(첫 재생 시 로드, 재생목록이 있는 앨범 모달을 열 때 스크립트만 미리 로드 가능). 진행 바 현재 시간·트랙 목록·현재 곡 상태는 플레이어 컴포넌트 로컬 state다. 전역 Context에는 `current` / `session` / `expanded`만 둔다(0.5초마다 앱 전체가 리렌더링되지 않게).
- iframe에는 `referrerPolicy="strict-origin-when-cross-origin"`이 필수다(없으면 오류 153). 유튜브 자체 컨트롤은 `controls=0`.
- 정책: 플레이어는 숨기거나 200×200px 미만으로 줄이지 않는다. 소리만 분리해 재생하지 않는다.
- Works 플레이어와 상호 배타다. 한쪽이 재생을 시작하면 다른 쪽은 닫힌다.

### 화면

- 띠(하단): 플레이어, 앨범명·아티스트, 현재 곡 제목 + `n / 전체`, 재생/일시정지, 이전/다음, 진행 바(클릭·드래그 이동), 유튜브 뮤직에서 열기, 확장, 닫기
- 확장 모달: 상단 좌측 플레이어(정사각형 200px) / 우측 앨범 정보·컨트롤·진행 바, 우측 상단 유튜브 뮤직·축소·닫기, 그 아래 트랙 목록(현재 곡 강조, 클릭 재생, 재생 중인 곡 클릭 시 일시정지/재개, 목록 영역만 스크롤)
- 유튜브 뮤직에서 열기(`music.youtube.com/playlist?list={ID}`)는 **플레이어(띠, 확장 모달)에만** 둔다. 열 때 앱 플레이어를 일시정지한다.

### 오류·제약

- 임베드 차단(101/150): 다음 곡으로 건너뛰고 짧은 안내를 띄운다. 목록에 "재생 불가"를 표시한다(세션 상태만).
- 재생목록 없음·잘못된 ID: 띠에 오류 안내와 "유튜브에서 열기" 링크를 표시한다.
- iOS: 첫 재생에서 띠의 재생 버튼을 한 번 더 눌러야 할 수 있다(자동재생 정책). 무음 자동재생 같은 우회는 하지 않는다.
- 백그라운드(화면 꺼짐) 재생은 임베드로 불가능하다. 모바일에서 화면을 끄고 들을 때는 유튜브 뮤직에서 열기로 앱(프리미엄)에서 듣는다.

---

## 애플뮤직 연결 규칙

- `album.apple_music_url`: 애플뮤직 앨범 주소(`https://music.apple.com/kr/album/...`, 추적 파라미터 제거)
- 자동 찾기(`/api/apple-music-album`): iTunes Search API(`entity=album`, 키 불필요). 조회 순서는 US → JP(KR 스토어는 빈 결과라 제외), 국가당 타임아웃 2500ms.
  - 비교 전 ` - EP` / ` - Single` / ` - LP` / `(EP)` 접미사를 제거하고, NFKC·소문자·공백/기호 제거로 정규화한다.
  - 일치 기준: 앨범 ≥ 0.72, 아티스트 ≥ 0.50. 미달이면 저장하지 않는다.
  - `lang=ko_kr`은 효과가 없다. 한국 아티스트·앨범은 영문 표기(예: 윤하 → Younha, 공중무용 → GANGGANGSULLAE)로 와서 못 찾는 경우가 있다. 이런 앨범은 폼에 주소를 직접 넣는다.
  - API 요청 제한이 분당 약 20회다. 일괄 조회 경로는 만들지 않는다.
- 시점: 상세 모달을 열 때 `apple_music_url`이 비어 있으면 백그라운드로 찾는다. 모달 표시를 막지 않는다. 로그인 사용자만 저장한다.
- **값이 있으면 자동 찾기가 실행되지 않고 덮어쓰지도 않는다.** 수동 입력값이 우선이다. 폼에서 비워 저장하면 다음 오픈 때 다시 찾는다.
- 버튼은 주소가 있을 때만 표시한다. 검색 결과 링크 대체는 없다(없는 앨범이 있는 것처럼 보이지 않게).
- 링크는 iOS 팝업 차단을 피하기 위해 `<a href target="_blank">`로 즉시 연다(클릭 후 비동기 작업 금지).
- 애플뮤직 아이콘은 Simple Icons(CC0) 기반 공용 컴포넌트를 쓴다(앨범 모달, 아티스트 메뉴 공통).
- 애플뮤직 임베드 플레이어는 쓰지 않는다(로그인 상태에서도 30초 미리듣기만 재생되는 문제). 스포티파이 연결은 하지 않는다(API에 프리미엄 소유자 필요).

---

## 헤드파이 규칙

### 카테고리

헤드폰, 이어폰, 무선 헤드폰, 무선 이어폰, 스피커, DAC, AMP, DAC/AMP, DAP, Source, 기타

### 보유 상태

- 기기 보유 상태 `headfi.status2`는 한글 값이다: **보유중 / 방출 / 양도** (선택 안 함은 빈 문자열). 영문 값을 쓰지 않는다.
- 액세서리 상태 `headfi_accessories.status`는 영문 값이다: **`owned` / `released` / `transferred`(양도)**. 기기와 컨벤션이 다르므로 혼동하지 않는다. DB CHECK 제약 `headfi_accessories_status_check`는 이 3값을 모두 허용해야 한다.
- 양도는 방출과 비슷하게 "보유중이 아닌 상태"지만 **판매 대상이 아니다**. 판매관리(`HeadfiSaleModal`)의 기기·액세서리 선택지와 집계에는 방출만 포함하고 양도는 제외한다.
- 청취 이력 선택, 매칭, 기분 추천 등은 `status2 = '보유중'`만 쓰므로 방출·양도 기기는 자동으로 빠진다.
- 소비 통계는 `status`를 보지 않는다. 방출·양도와 무관하게 구매액을 합산하고, 차감은 `headfi_sales`로만 한다.

### 액세서리

- 액세서리 카테고리는 기기 카테고리를 따르되, DAC / AMP / DAC/AMP / DAP / Source / 스피커 액세서리는 **"기타 케이블"** 하나로 통합했다.
- 기기와 액세서리는 `headfi_accessory_links`로 연결한다. 한 액세서리를 여러 기기에 연결할 수 있다.
- 방출(`released`)·양도(`transferred`) 액세서리도 연결 선택지에 노출하며, "방출" 또는 "양도" 표시를 붙이고 뒤로 정렬한다.
- 소비 통계는 기기 가격 + 독립 액세서리 가격 합산이다. 기기 가격에는 액세서리 가격을 섞지 않는다.
- 액세서리 관리 모달 필터: 카테고리, 상태(전체 / 보유중 / 방출 / 양도), 연결 기기 유무(전체 / 연결됨 / 미연결). 수정·저장 후에도 현재 필터를 유지한다.
- **레거시 컬럼**: `headfi.cable`, `cable_price`, `eartip`, `eartip_price`, `accessory`, `accessory_price`는 더 이상 쓰지 않는다. 값은 모두 NULL로 비웠고 컬럼은 삭제하지 않고 남겨둔다. 통계와 상세 화면은 이 컬럼을 읽지 않는다.
- 독립 액세서리 데이터는 삭제·유실하지 않는다. 마이그레이션은 항상 이관 → 확인 SELECT → (별도 승인 후) 정리 순서로 진행한다.

### 기기 등록/수정 모달

- 상단: 브랜드, 모델명, 이미지, 카테고리 선택.
- 데스크톱은 좌우 2패널(약 3:7). 좌측 기본 정보(브랜드·모델 각 한 줄), 우측 탭 영역.
- 탭: 기본 정보 / 분석 / 액세서리. 분석 탭은 헤드폰·이어폰 계열에서만 노출. 탭은 아이콘 + 텍스트로 간결하게 표시한다.
- 모바일은 기존 단일 컬럼 구조를 유지한다.
- 하단 저장 버튼은 고정한다. 모달이 열린 동안 배경 스크롤은 잠그고, 저장 후 스크롤 위치가 바뀌지 않아야 한다.
- 액세서리 선택 목록 표기: `제품명 | 가격`, 다른 기기에 연결된 경우 연결 기기를 모델명만(브랜드 제외) 표시한다.
- 유선 헤드폰/이어폰 폼에 음색 문자열(`temp`, `bright`) 입력은 없다. 저장 payload에도 이 키를 포함하지 않아 기존 DB 값이 지워지지 않는다.

### 기기 상세 모달

- 상위 탭: 기본 정보 / 청음 평가 / 추천 앨범 / 세팅.
- 청음 평가 탭 안의 세그먼트: 청음 평가 / FR 그래프 / 외부 리뷰 / AI 분석.
- 구매 정보 줄: `신품/중고 / 가격 / 보유 상태`. 방출 기기는 `방출(판매가)`, 판매 이력이 없으면 `방출`만, 양도 기기는 `양도`를 표시한다. 판매가는 목록 페이지에서 한 번 선조회한 캐시로 전달한다(여러 건이면 가장 최근 판매일 1건).
- 음색(온도/밝기) 표시는 없다. 온도/밝기가 필요하면 성향 `trait_warmth` / `trait_brightness`를 쓴다.

---

## 청음 평가 규칙

대상은 유선 헤드폰·이어폰이다. 무선·스피커 등 다른 카테고리로 바꿔 저장하면 청음 평가 값은 초기화(NULL)된다.

### 성능 13개 (1~10 정수, 높을수록 좋음, 총점 없음)

| 그룹 | 컬럼 |
|------|------|
| 저역 | `bass_quantity`, `bass_depth`, `bass_control` |
| 중역 | `midrange_body` |
| 고역 | `treble_airiness`, `treble_smoothness` |
| 기술·공간 | `resolution`, `dynamic_range`, `separation`, `soundstage`, `imaging` |
| 종합 | `musicality`, `listening_comfort` |

- 점수 기준: 5 = 같은 가격대 평균, 7 = 가격대 대비 우수, 9 = 보유 기기 중 최상위급, 10 = 들어본 것 중 최고.
- 양 계열 항목(`bass_quantity`, `midrange_body`, `treble_airiness`)은 "많을수록 좋음"이 아니라 "빈약하지 않은가"를 평가한다. 과다·치우침은 성향이 담당한다.
- 신규 컬럼 DB CHECK: 1~10. (기존 승계 9개 컬럼에는 DB CHECK가 없고 앱에서 검증)

### 성향 4개 (-2~+2 정수, 좋고 나쁨 없음, 평균·총점 제외)

| 컬럼 | -2 | +2 |
|------|----|----|
| `trait_warmth` | 차가움 | 따뜻함 |
| `trait_brightness` | 어두움 | 밝음 |
| `trait_vocal_position` | 후방 | 전진 |
| `trait_bass_decay` | 타이트 | 풍성 |

- 신규 컬럼 DB CHECK: -2~+2.
- **미입력은 NULL, 중립은 0이다.** `?? 0`, `|| 0`, `> 0`으로 두 값을 뭉개지 않는다. NULL은 "모르는 값"이며 AI에도 추정하지 않게 전달한다.

### 표시

- 레이더(성능 13축)는 13개를 모두 입력해야 표시한다. 일부만 입력하면 안내 문구만 보이고, 미입력 축을 0으로 그리지 않는다. 7점 우수선을 표시한다.
- 그룹 평균은 입력된 항목만 평균하고 "n개 평가"를 함께 표시한다. 단일 총점은 만들지 않는다.
- 성향은 점 표시 4줄과 한 줄 태그 요약(0·미입력은 요약에서 제외)이다. 성향은 레이더에 넣지 않는다.

### 레거시 컬럼 (사용 금지, 삭제하지 않음)

- 구 평점 컬럼: `bass_speed`, `dynamics_slam`, `tone_warmth`, `vocal_position`, `midrange_clarity`, `treble_brightness`, `timbre`. 폼·표시·AI·포지션·매칭·기분 추천 어디에서도 읽지 않는다. 같은 이름의 의미 변경은 하지 않고, 의미가 바뀌는 항목은 새 컬럼으로 추가한다.
- 음색 문자열 컬럼: `headfi.temp`(온도), `headfi.bright`(밝기). 폼 입력, 상세 표시, AI 프롬프트, 매칭, 추천에서 읽거나 쓰지 않는다. 컬럼과 기존 값은 남겨둔다. 대체는 `trait_warmth` / `trait_brightness`.

### 평점을 쓰는 곳

- 청음 AI 분석, 추천 앨범: 성능 13(품질 평가) + 성향 4(소리의 성격, 우열 아님)를 구분해 전달.
- 매칭 점수: 후보 헤드폰 한 줄 요약의 저/중/고 밴드와 성향 4개, Musicality를 synergy 힌트로 사용.
- 기분 추천: `trait_warmth`, `trait_brightness`, `soundstage`.
- 포지션 맵: 유선 HP/IEM 좌표는 공식으로 계산한다 (`src/lib/headfiPosition.ts`). X는 `trait_warmth`와 `trait_brightness`, Y는 `resolution`·`separation`·`imaging` 평균 대비 `musicality`. 필요한 6개 값 중 하나라도 NULL이면 계산하지 않고 기존 좌표를 유지한다. AI(Gemini)는 라벨 문구만 생성한다. DAC/AMP 좌표는 출력 스펙 기반 AI 추정을 유지한다.
- 평점 저장 시 해당 기기의 `headfi_match_cache`는 삭제된다. `ai_sound_analysis`, `position_*`, 앨범 추천 결과는 자동으로 갱신되지 않으며 각 새로고침 시 재생성된다.
- 방출 기기의 AI 분석은 필요 없는 경우 `ai_sound_analysis`를 비울 수 있다(일회성 SQL). 방출 전환 시 자동으로 지우지는 않는다.

### 외부 리뷰와 AI 분석

- 외부 리뷰 검색은 Gemini(Google Search 연동)만 담당한다. 결과 요약과 출처, 수집 시각을 `ai_review_summary`, `ai_review_sources`, `ai_review_fetched_at`에 저장한다. 출처는 검색 근거(grounding) URL만 저장하며 화면에는 표시하지 않는다.
- 요약이 있으면 재검색하지 않는다. 갱신은 "리뷰 갱신" 버튼으로만 수행하며 일괄 실행 경로는 만들지 않는다. 요약 길이 상한이 있고, 모델명이 정확히 일치하는 리뷰만 사용한다.
- 청음 AI 분석(Anthropic)은 스펙(확정 사실) + 성능/성향 + FR 해석(있을 때) + 외부 리뷰 요약(있을 때)을 입력으로 한다. 리뷰·FR이 없으면 해당 블록을 생략하고 "없음"으로 명시한다. 확정 사실(스펙)과 리뷰가 충돌하면 확정 사실이 우선하고, 청음 평가와 리뷰가 다르면 차이로 명시한다.
- 검색(리뷰 수집)과 분석은 별도 요청으로 분리한다. 한 서버 요청에서 함께 수행하지 않는다 (타임아웃 방지).

---

## 청취 이력 (`album_listen_history`) 규칙

선택 구성은 **Media + Source / Amp 1 + Amp 2 + Receiver** 이다.

| 항목 | 컬럼 | 선택 가능 카테고리 / 값 | 필수 |
|------|------|-------------------------|------|
| Media | `media` (text) | Apple Music, Spotify, YouTube Music, CD, LP, Cassette, FLAC/MP3(저장값은 `FLAC`), 기타 | 필수 |
| Source | `source_id` (FK headfi, ON DELETE SET NULL) | Source, DAP | 필수 |
| Amp 1 | `dac_amp_id` | DAC, AMP, DAC/AMP, 기타 | 선택 |
| Amp 2 | `dac_amp2_id` (FK headfi, ON DELETE SET NULL) | DAC, AMP, DAC/AMP, 기타 | 선택 |
| Receiver | `headphone_id` | 헤드폰, 이어폰, 무선 헤드폰, 무선 이어폰, 스피커 | 필수 |

- 모든 슬롯에서 선택 가능한 기기는 보유중(`status2 = '보유중'`)만이다.
- 슬롯별 카테고리 상수와 포매터는 `src/lib/listenHistoryGear.ts` 한 곳에서 관리한다. 컴포넌트에서 카테고리 목록을 중복 정의하지 않는다.
- Media의 `FLAC`은 저장값을 바꾸지 않고 표시 라벨만 `FLAC/MP3`로 매핑한다(공용 상수에서 관리). 통계·필터는 저장값 기준이다.
- 선택 옵션과 이력 카드의 기기 표기는 **브랜드를 빼고 모델명만** 쓴다. (다이어리 화면도 동일)
- `album_listen_history`에는 `user_id` 컬럼이 없다. `dac_amp_id` / `headphone_id`에는 FK가 없다.
- 레거시 이력은 컬럼 의미 이동으로 이관했다: 구 기기선택1 → Amp 1, 구 기기선택2 → Amp 2, 구 헤드폰/이어폰 → Receiver. 구 기기선택1이 DAP/Source였던 이력은 Source로 옮겼다.
- 이력 카드 레이아웃: 날짜 옆 시간·날씨 / 소감 / 미디어·리시버 배지 / Source / Amp 1 / Amp 2.

---

## Insights 화면 규칙

- 장르 통계 탭: 좌 장르 목록(장르1 / 장르2 토글) : 우 디테일 = 3 : 7. 개수는 연/월 선택 시 TOP10, 기간 "전체"일 때 TOP20. 디테일은 대표 아티스트 5명, 대표 앨범 5개. 토글·필터 변경 시 선택은 1위로 초기화. 장르1은 `album.genre1`, 장르2는 `album.genre2` 기준이며 장르2가 비어 있는 앨범은 장르2 집계에서 제외한다. 순위·동점(공동 순위) 규칙은 두 장르 공용 집계 함수(`buildGenreFieldListenRankings`)가 담당한다.
- 장르 통계의 아티스트·앨범 섬네일을 클릭하면 모달을 연다. 앨범 모달은 수정·저장과 배경 스크롤 잠금을 지원한다.
- 청취 랭킹 탭의 Weekly Hot: 롤링 7일. 핫 아티스트 1명(아티스트 단위 청취 횟수 합산 1위, `Various Artist` 제외, 동점은 횟수 → 앨범 수 → 이름순)과 핫 앨범 TOP3를 독립 패널 두 개로 3 : 7 배치한다. 추가 쿼리 없이 이미 불러온 데이터로 계산한다. 핫 아티스트를 클릭하면 아티스트 모달을 연다.
- Insights의 아티스트 모달(`ArtistDetailModal`)에서 아티스트명을 클릭하면 모달을 닫고 `/artists?role=artist&artist={이름}`으로 이동한다.
- 레이아웃을 수정한 뒤 화면이 이상하면 먼저 강력 새로고침으로 캐시를 확인한다. 개발 중 화면은 이전 스타일을 캐시할 수 있다.

---

## Storage 버킷

| 버킷 | 용도 |
|------|------|
| `lyrics-audio` | 가사 오디오 파일 (mp3, wav, flac) |
| `lyrics-covers` | 가사 커버 이미지 |
| `headfi-fr` | 헤드파이 FR 그래프 이미지 (png, jpg, jpeg, webp, gif) |

---

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
MUSICBRAINZ_CONTACT_EMAIL=   # MusicBrainz User-Agent 연락처 (배포 환경 필수 권장, 미설정 시 로그인 사용자 이메일 fallback)

# (선택) 모델명 덮어쓰기 — 설정하면 src/lib/aiModels.ts 기본값보다 우선한다.
ANTHROPIC_HEADFI_MODEL=
ANTHROPIC_LYRICS_TRANSLATE_MODEL=   # 미설정 시 ANTHROPIC_HEADFI_MODEL → 상수 순으로 폴백
OPENAI_ARTIST_BIO_MODEL=
OPENAI_MATCH_SCORE_MODEL=
```

- 모델을 교체할 때는 로컬 `.env.local`과 Vercel 환경변수에 옛 모델명이 남아 있지 않은지 함께 확인한다. 환경변수가 코드의 새 기본값을 덮어쓴다.
- 유튜브·애플뮤직 연동(oEmbed, 유튜브 뮤직 카탈로그, iTunes Search API)은 키가 필요 없다.

---

## feature_list/ ID 규칙

| prefix | 카테고리 |
|--------|----------|
| `SETUP-` | 프로젝트 초기 세팅 |
| `ALBUM-` | 앨범 / 무드 / 청취 이력 / 아티스트·작곡가 / 앨범 플레이어 / 외부 재생 연결 |
| `RECORDSHELF-` | CD·LP·Cassette 실물 음반 |
| `GEAR-` | 헤드파이 기기 (기기·조합·매칭·판매·액세서리·청음 평가) |
| `STATS-` | Insights 통계 |
| `LYRICS-` | Lyrics 메뉴 |
| `LYRICSTRANSLATE-` | 가사 번역 |
| `UX-` | 공통 UX / 레이아웃 |
| `AUTH-` | 인증 |
| `BUG-` | 버그 수정 |

---

## 컴포넌트 패턴

- named export 사용
- 서버 컴포넌트 기본, 인터랙션 필요 시 `use client`
- props 타입은 인터페이스로 별도 정의
- 모달 상태 관리: stale state 방지를 위해 API 응답 후 `setViewingItem`과 `setLibrary` 동시 업데이트
- 전역 Lyrics Player: `LyricsPlayerProvider`로 layout.tsx에서 감싸고, 페이지 이동 후에도 재생 상태 유지
- 전역 앨범 플레이어: `AlbumPlayerProvider`(`LyricsPlayerProvider` 안). Works 플레이어와 상호 배타
- **`window.confirm` / `alert` / `prompt` 사용 금지.** dev 런처(Tauri 웹뷰)에서 깨질 수 있으므로 항상 인라인 확인 UI를 쓴다.
- 필터가 걸린 목록에서 수정·저장 후에는 현재 필터를 유지한다. (저장 시 필터가 "전체"로 초기화되지 않게 한다.)
- **화면 선택 상태를 URL로 공유하는 경우**(아티스트 메뉴 등) URL을 유일한 기준으로 둔다. 같은 값을 state로 복제하고 effect로 맞추지 않는다.
- **모달 배경 스크롤 잠금**: 모달이 열려 있는 동안 body 스크롤을 잠그고, 닫을 때(닫기 버튼, 오버레이 클릭, 저장 후 닫힘, 언마운트, 링크 이동) 반드시 해제한다. 기기 등록/수정, 액세서리 관리, 판매관리, RecordShelf 상세, 앨범 플레이어 확장 모달 등 모든 모달에 적용한다.
- **선조회 캐시 전달**: 상세·폼 모달이 쓰는 연결 데이터(액세서리 연결, 판매가 등)는 목록 페이지에서 한 번 선조회한 캐시(`accessoryLinksCache` 등)를 props로 전달한다. 모달을 열 때마다 새로 조회하지 않는다. 저장 직후에는 캐시를 먼저 갱신한 뒤 상세를 연다. 캐시를 안 넘기는 화면(대시보드 등)은 폴백으로 직접 조회한다. 선조회는 필요한 컬럼만, 기존 선조회와 병렬로, 페이지 렌더를 막지 않게 한다. 로딩 중에는 스피너를 쓰고 끝난 뒤에만 빈 상태("-", "없습니다")를 표시한다.
- **외부 링크**: `<a href target="_blank" rel="noopener">`로 즉시 연다. iOS에서는 클릭 후 비동기 작업을 거친 `window.open`이 팝업으로 차단된다.
- **반응형 레이아웃 변경 시**: 폭 390 / 800 / 1024 / 1440px에서 렌더링을 확인하고, 텍스트 잘림과 컨테이너 넘침이 없는지 본다. 이미지는 `object-fit`과 고정 상한으로 무한정 커지지 않게 한다.
- **Artists 화면 레이아웃 예외**: 데스크톱(1024px 이상)은 좌측 목록 sticky 고정 + 우측 페이지 스크롤이며, 이 화면에서만 글로벌 푸터를 숨긴다. 우측에 내부 스크롤을 두지 않는다. 모바일(1024px 미만)은 목록을 항상 마운트하고 상세를 전체 화면 오버레이로 띄운다. 목록에서 직접 연 경우만 `router.push` 후 닫기 시 `back`, 딥링크·외부 진입·새로고침 후에는 `replace`로 `artist` 쿼리를 제거한다(페이지 이탈 금지). 오버레이 안 유사 아티스트 선택은 `replace`로 내용만 교체한다.
잘 처리됐습니다. 삭제 공용 훅(`useAlbumMutations`) 한 곳에 넣어서 대부분의 화면이 자동으로 커버되고, 삭제 **성공 시에만** 닫으니 삭제가 실패했는데 재생바만 닫히는 일도 없습니다.

하나만 짚으면, Artists 화면은 공용 훅을 안 거치고 삭제를 직접 호출하고 있어서 따로 한 줄 추가한 상태입니다. 나중에 새 화면이 또 직접 호출하면 같은 구멍이 생길 수 있으니 규칙으로 남겨두는 게 좋겠습니다.

**직접 확인할 것**
- 앨범 메뉴 / Artists 화면에서 재생 중인 A 삭제 → 재생바 닫힘, 소리 멈춤
- A 재생 중 B 삭제 → A 계속 재생
- 삭제 후 다른 앨범 재생 → 정상

오늘 재생바 작업 세 건이 같은 구조를 건드렸으니, `CONVENTIONS.md`의 "컴포넌트 패턴" 섹션에 아래를 추가해 두시길 권합니다.

**전역 앨범 재생바(`GlobalAlbumPlayer`)**: 새 재생은 `playAlbum()`의 `session` 증가로만 판단한다. 같은 앨범의 정보 갱신(저장, 청취 이력, 소개 새로고침 등)은 `patchCurrentMeta()`로 표시 정보만 바꾸고 재생을 다시 시작하지 않는다. 재생 effect가 앨범 객체 참조에 반응하게 만들지 않는다. 재생 중 재생목록 주소 변경은 다음 재생부터 적용한다.
**앨범 삭제**: 반드시 `useAlbumMutations.deleteAlbum`을 거친다. 삭제 서버 액션을 직접 호출해야 하면 성공 직후 `closeIfPlayingAlbum(albumId)`를 함께 호출한다(재생 중 앨범이면 재생바를 닫음).

---

## AI 규칙

### 공통

- AI API 호출은 반드시 try/catch로 감싼다. 실패 시 원인이 화면에 구분되어 보이게 한다 (예: 출력 길이 초과, 파싱 실패, 호출 실패).
- 모델명은 `src/lib/aiModels.ts`에서만 정의한다. 다른 파일에 모델명 문자열을 하드코딩하지 않는다.
- `withRetry` 헬퍼로 429/503 에러 처리 (최대 3회, retry delay는 에러 메시지에서 파싱)
- AI 편향 방지: 후보 아이템 전달 전 random shuffle + slice 적용
- 네이티브 JSON 모드는 쓰지 않는다. 프롬프트에서 JSON을 요청하고, markdown 코드블록이나 잡텍스트는 파싱 전에 제거(`extractJsonObjectFromText` / `extractJsonArrayFromText`)한다.
- 응답이 길어질 수 있는 호출은 `max_tokens` 한도에 걸려 JSON이 잘리는지 확인한다. 한도에 걸리면 `stop_reason`으로 구분해 "출력 길이 초과"로 처리하고, 프롬프트에 분량 가이드를 둔다.
- 미입력(NULL) 값은 "모름"으로 전달하고 추정하게 하지 않는다.
- AI가 아닌 외부 호출(oEmbed, 유튜브 뮤직 카탈로그, iTunes)도 try/catch와 타임아웃을 두고, 실패가 화면 동작을 막지 않게 한다.

### Gemini

- `googleSearch: {}` vs `googleSearchRetrieval: {}` — SDK 버전 확인 후 사용
- 검색 출처 URL은 프롬프트로 생성하게 하지 않고 검색 근거(grounding) 메타데이터만 사용한다.
- 외부 리뷰 검색, 앨범 소개, 장르 추천, 트랙리스트 등 검색이 필요한 기능은 Gemini가 담당한다.

### Anthropic

- 청음 AI 분석, 앨범 추천, FR 그래프 비전 해석, 가사 번역에 사용한다. 호출은 `thinking: disabled`로 한다.
- FR 해석은 Anthropic 비전(이미지 + 텍스트)이다. Gemini Vision은 사용하지 않는다.

### OpenAI

- 매칭 점수는 Chat Completions, 아티스트 바이오는 Responses API + web_search를 사용한다.

### 앨범 무드 자동 분류

- 무드 이름은 `album_mood_groups.mood_name` 9개이며 개수는 **9로 고정**이다(10개를 만들면 전체 재분류가 422로 실패). 단건 할당은 캐시에 있는 이름 중 하나만 고른다. 이름을 바꾸면 `album.mood_name` 문자열과 `album_mood_groups`를 함께 옮겨야 하고, 수동 지정 앨범(`mood_manually_set`)은 자동으로 덮어쓰지 않는다.
- 자동 분류가 실행되는 곳은 두 군데뿐이다: ① 신규 등록 직후 서버 백그라운드(`after()`, 소개 생성에 성공했을 때만 무드 호출) ② 앨범 메뉴의 소개 새로고침(`assignMood: true`, 소개 생성 후 `/api/album-mood-assign`). 수정 저장은 무드를 건드리지 않고 기존 값을 유지하며, 다른 화면(아티스트, 인사이트, 다이어리, 통계, 아카이브, 가사)의 소개 새로고침은 소개만 만들고 무드는 분류하지 않는다.
- 분류 실패(502, 목록 밖 이름, Gemini 예외)는 화면에 표시되지 않는다. 문제가 의심되면 서버 로그를 본다. 로그 키워드: `[album-enrichment]`(`start`, `intro_ok` / `intro_failed`, `mood_start` / `mood_ok` / `mood_failed`, `introMs`, `moodMs`), `mood_name_mismatch`(AI 원문 `raw`와 후보 `candidates`), `gemini_error`, `mood_groups_empty`, `update_no_assign`. 로컬은 터미널, 배포는 Vercel Logs에서 본다.
- `after()`가 도는 서버 액션(`saveAlbumToDB`)에는 `maxDuration`이 설정되어 있지 않다. 배포에서 자동 생성이 중간에 끊기면(`start`만 있고 `intro_ok`가 없음) 실행 시간 제한을 먼저 의심한다. 로컬에서는 소개 약 5초 + 무드 약 1.5초에 끝난다.

---

## 스타일 규칙

- Glass 스타일: `globals.css` 유틸 클래스 사용
  - 카드: `glass-card`
  - 헤더: `glass-header`
- 다크모드 차트: Recharts 대신 SVG + CSS 변수 사용 (헤드파이 레이더 차트 포함)
- 커스텀 클래스: `@layer utilities` 필수 (Tailwind v4)

---

## Archive 범위

myaudio Archive는 아래 항목만 집계한다:
- 앨범 청취 이력 (`album_listen_history`)
- 헤드파이 기기 구매 (`headfi.purchase_date`)
- 가사 등록 (`lyrics.created_at`)

---

## DB 변경 작업 규칙

- SQL은 JW가 Supabase SQL Editor에서 직접 실행한다. 실행 전 CSV 백업을 받는다.
- ALTER는 컬럼 하나당 한 문장으로 나눈다. CHECK 제약 변경은 `drop constraint` → `add constraint` 두 문장으로 나눠 순서대로 실행하고, 실제 제약 이름은 `pg_constraint` 조회 결과로 확인한 뒤 쓴다(이름을 추측하지 않는다).
- 데이터 이관 → 확인용 SELECT → 구 컬럼 정리(DROP) 순서로 진행하고, DROP은 확인 후 별도 단계로 한다. 기존 컬럼은 원칙적으로 삭제하지 않고 레거시로 남긴다.
- 에이전트(Cursor)는 스키마 변경이 필요해 보여도 직접 ALTER 하지 않고 먼저 보고한다.
- 공용 요소(`auth.users`, user_id 기반 RLS, `monthly_review_comments`)를 바꿀 때는 mybooks 영향부터 확인한다.