# CONVENTIONS.md — myaudio

## 프로젝트 개요

개인 음악·헤드파이 라이브러리. 앨범·헤드파이 기기·가사를 관리한다.
배포 URL: https://audio.sshlove.com

---

## 기술 스택

- Framework: Next.js 15 App Router + TailwindCSS v4
- Database: Supabase (Auth + PostgreSQL + RLS) — mylibrary / mybooks와 동일 인스턴스 공유
- Deployment: Vercel
- AI: Gemini (`gemini-3.5-flash-lite`), OpenAI (`gpt-5.4-mini`), Anthropic Claude Sonnet. 모델명 기본값은 `src/lib/aiModels.ts` 한 곳에서 관리
- External API: MusicBrainz, Cover Art Archive
- Font: Pretendard

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
│   │   ├── albums/page.tsx
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
│   │       └── monthly-review-comment/route.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── features/
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
| `album` | 음악 앨범 컬렉션 (`genre1`, `genre2`, `mood_name`, `mood_manually_set` 포함) |
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

### id 타입 (SQL 작성 시 확인 필수)

- `headfi.id`: integer
- `headfi_accessories.id`: uuid
- `album_listen_history.id`: uuid, `album_id`: bigint, 기기 컬럼(`source_id` / `dac_amp_id` / `dac_amp2_id` / `headphone_id`): integer
- `headfi_match_cache`: `id` uuid, `base_gear_id` / `target_gear_id` integer, `combo_id` uuid
- `headfi` 청음 평점 컬럼은 모두 smallint, NULL 허용, 기본값 없음
- 그 외 테이블은 추측하지 말고 조회 후 확인한다.

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
- 청취 랭킹 탭의 Weekly Hot: 롤링 7일. 핫 아티스트 1명(아티스트 단위 청취 횟수 합산 1위, `Various Artist` 제외, 동점은 횟수 → 앨범 수 → 이름순)과 핫 앨범 TOP3를 독립 패널 두 개로 3 : 7 배치한다. 추가 쿼리 없이 이미 불러온 데이터로 계산한다.
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

---

## feature_list/ ID 규칙

| prefix | 카테고리 |
|--------|----------|
| `SETUP-` | 프로젝트 초기 세팅 |
| `ALBUM-` | 앨범 / 무드 / 청취 이력 |
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
- **`window.confirm` / `alert` / `prompt` 사용 금지.** dev 런처(Tauri 웹뷰)에서 깨질 수 있으므로 항상 인라인 확인 UI를 쓴다.
- 필터가 걸린 목록에서 수정·저장 후에는 현재 필터를 유지한다. (저장 시 필터가 "전체"로 초기화되지 않게 한다.)
- **모달 배경 스크롤 잠금**: 모달이 열려 있는 동안 body 스크롤을 잠그고, 닫을 때(닫기 버튼, 오버레이 클릭, 저장 후 닫힘, 언마운트) 반드시 해제한다. 기기 등록/수정, 액세서리 관리, 판매관리, RecordShelf 상세 등 모든 모달에 적용한다.
- **선조회 캐시 전달**: 상세·폼 모달이 쓰는 연결 데이터(액세서리 연결, 판매가 등)는 목록 페이지에서 한 번 선조회한 캐시(`accessoryLinksCache` 등)를 props로 전달한다. 모달을 열 때마다 새로 조회하지 않는다. 저장 직후에는 캐시를 먼저 갱신한 뒤 상세를 연다. 캐시를 안 넘기는 화면(대시보드 등)은 폴백으로 직접 조회한다. 선조회는 필요한 컬럼만, 기존 선조회와 병렬로, 페이지 렌더를 막지 않게 한다. 로딩 중에는 스피너를 쓰고 끝난 뒤에만 빈 상태("-", "없습니다")를 표시한다.
- **반응형 레이아웃 변경 시**: 폭 390 / 800 / 1024 / 1440px에서 렌더링을 확인하고, 텍스트 잘림과 컨테이너 넘침이 없는지 본다. 이미지는 `object-fit`과 고정 상한으로 무한정 커지지 않게 한다.

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