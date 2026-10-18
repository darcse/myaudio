# CONVENTIONS.md — myaudio

## 프로젝트 개요

개인 음악·헤드파이 라이브러리. 앨범·헤드파이 기기·가사를 관리한다.
배포 URL: https://audio.sshlove.com

---

## 기술 스택

- Framework: Next.js 15 App Router + TailwindCSS v4
- Database: Supabase (Auth + PostgreSQL + RLS) — mylibrary / mybooks와 동일 인스턴스 공유
- Deployment: Vercel
- AI: Gemini API (`gemini-3.1-flash-lite-preview`), Gemini Vision (FR 그래프 해석)
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
│   │       └── monthly-review-comment/route.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── features/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── musicbrainz.ts
│   │   ├── gemini.ts
│   │   ├── listenHistoryGear.ts  # 청취 이력 Source/Amp/Receiver/Media 공용 상수·포매터
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
| `album` | 음악 앨범 컬렉션 |
| `headfi` | 헤드파이 기기 컬렉션 |
| `headfi_accessories` | 독립 액세서리 (id uuid, 카테고리·이름·가격·구매일, `status`: `owned` / `released`) |
| `headfi_accessory_links` | 기기 ↔ 액세서리 연결 (N:M). `headfi_id` int FK, `accessory_id` uuid FK, 둘 다 ON DELETE CASCADE, UNIQUE(headfi_id, accessory_id), user_id 기반 RLS |
| `headfi_combos`, `headfi_sales`, `headfi_device_settings`, `headfi_match_cache` | 조합 / 판매 / 게인 세팅 / 매칭 점수 캐시 |
| `lyrics` | 가사/음원 컬렉션 |
| `album_listen_history` | 앨범 청취 이력 |
| `album_mood_groups` | 무드보드 그룹 캐시 |
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
- 그 외 테이블은 추측하지 말고 조회 후 확인한다.

---

## 헤드파이 규칙

### 카테고리

헤드폰, 이어폰, 무선 헤드폰, 무선 이어폰, 스피커, DAC, AMP, DAC/AMP, DAP, Source, 기타

### 액세서리

- 액세서리 카테고리는 기기 카테고리를 따르되, DAC / AMP / DAC/AMP / DAP / Source / 스피커 액세서리는 **"기타 케이블"** 하나로 통합했다.
- 기기와 액세서리는 `headfi_accessory_links`로 연결한다. 한 액세서리를 여러 기기에 연결할 수 있다.
- 방출(`released`) 액세서리도 연결 선택지에 노출하며, "방출" 표시를 붙인다.
- 소비 통계는 기기 가격 + 독립 액세서리 가격 합산이다. 기기 가격에는 액세서리 가격을 섞지 않는다.
- **레거시 컬럼**: `headfi.cable`, `cable_price`, `eartip`, `eartip_price`, `accessory`, `accessory_price`는 더 이상 쓰지 않는다. 값은 모두 NULL로 비웠고 컬럼은 삭제하지 않고 남겨둔다. 통계와 상세 화면은 이 컬럼을 읽지 않는다.
- 독립 액세서리 데이터는 삭제·유실하지 않는다. 마이그레이션은 항상 이관 → 확인 SELECT → (별도 승인 후) 정리 순서로 진행한다.

### 기기 등록/수정 모달

- 상단: 브랜드, 모델명, 이미지, 카테고리 선택.
- 데스크톱은 좌우 2패널(약 3:7). 좌측 기본 정보(브랜드·모델 각 한 줄), 우측 탭 영역.
- 탭: 기본 정보 / 분석 / 액세서리. 분석 탭은 헤드폰·이어폰 계열에서만 노출. 탭은 아이콘 + 텍스트로 간결하게 표시한다.
- 모바일은 기존 단일 컬럼 구조를 유지한다.
- 하단 저장 버튼은 고정한다. 모달이 열린 동안 배경 스크롤은 잠그고, 저장 후 스크롤 위치가 바뀌지 않아야 한다.
- 액세서리 선택 목록 표기: `제품명 | 가격`, 다른 기기에 연결된 경우 연결 기기를 모델명만(브랜드 제외) 표시한다.

---

## 청취 이력 (`album_listen_history`) 규칙

선택 구성은 **Media + Source / Amp 1 + Amp 2 + Receiver** 이다.

| 항목 | 컬럼 | 선택 가능 카테고리 / 값 | 필수 |
|------|------|-------------------------|------|
| Media | `media` (text) | Apple Music, Spotify, YouTube Music, CD, LP, Cassette, FLAC, 기타 | 필수 |
| Source | `source_id` (FK headfi, ON DELETE SET NULL) | Source, DAP | 필수 |
| Amp 1 | `dac_amp_id` | DAC, AMP, DAC/AMP, 기타 | 선택 |
| Amp 2 | `dac_amp2_id` (FK headfi, ON DELETE SET NULL) | DAC, AMP, DAC/AMP, 기타 | 선택 |
| Receiver | `headphone_id` | 헤드폰, 이어폰, 무선 헤드폰, 무선 이어폰, 스피커 | 필수 |

- 모든 슬롯에서 선택 가능한 기기는 보유중(`status2 = '보유중'`)만이다.
- 슬롯별 카테고리 상수와 포매터는 `src/lib/listenHistoryGear.ts` 한 곳에서 관리한다. 컴포넌트에서 카테고리 목록을 중복 정의하지 않는다.
- 선택 옵션과 이력 카드의 기기 표기는 **브랜드를 빼고 모델명만** 쓴다. (다이어리 화면도 동일)
- `album_listen_history`에는 `user_id` 컬럼이 없다. `dac_amp_id` / `headphone_id`에는 FK가 없다.
- 레거시 이력은 컬럼 의미 이동으로 이관했다: 구 기기선택1 → Amp 1, 구 기기선택2 → Amp 2, 구 헤드폰/이어폰 → Receiver. 구 기기선택1이 DAP/Source였던 이력은 Source로 옮겼다.
- 이력 카드 레이아웃: 날짜 옆 시간·날씨 / 소감 / 미디어·리시버 배지 / Source / Amp 1 / Amp 2.

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
MUSICBRAINZ_CONTACT_EMAIL=   # MusicBrainz User-Agent 연락처 (배포 환경 필수 권장, 미설정 시 로그인 사용자 이메일 fallback)
```

---

## feature_list/ ID 규칙

| prefix | 카테고리 |
|--------|----------|
| `SETUP-` | 프로젝트 초기 세팅 |
| `ALBUM-` | 앨범 / 무드 / 청취 이력 |
| `RECORDSHELF-` | CD·LP·Cassette 실물 음반 |
| `GEAR-` | 헤드파이 기기 (기기·조합·매칭·판매·액세서리) |
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

---

## AI (Gemini) 규칙

- Gemini API 호출은 반드시 try/catch로 감싼다
- `withRetry` 헬퍼로 429 에러 처리 (retry delay는 에러 메시지에서 파싱)
- AI 편향 방지: 후보 아이템 전달 전 random shuffle + slice 적용
- 응답 JSON이 markdown 코드블록으로 감싸진 경우 파싱 전 제거
- Gemini Vision (FR 해석): `gemini-3.1-flash-lite-preview` 사용, 이미지는 base64 또는 URL 전달
- `googleSearch: {}` vs `googleSearchRetrieval: {}` — SDK 버전 확인 후 사용

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
- ALTER는 컬럼 하나당 한 문장으로 나눈다.
- 데이터 이관 → 확인용 SELECT → 구 컬럼 정리(DROP) 순서로 진행하고, DROP은 확인 후 별도 단계로 한다. 기존 컬럼은 원칙적으로 삭제하지 않고 레거시로 남긴다.
- 에이전트(Cursor)는 스키마 변경이 필요해 보여도 직접 ALTER 하지 않고 먼저 보고한다.
- 공용 요소(`auth.users`, user_id 기반 RLS, `monthly_review_comments`)를 바꿀 때는 mybooks 영향부터 확인한다.