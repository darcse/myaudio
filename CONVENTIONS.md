# CONVENTIONS.md — myaudio

## 프로젝트 개요

개인 음악·실물 음반·헤드파이 라이브러리.
앨범, 아티스트, 가사 번역 노트(Lyrics), 실물 음반(RecordShelf), 헤드파이 기기, 가사·음원 플레이어(Works), 청취 통계·아카이브(Insights)를 관리한다.
배포 URL: https://audio.sshlove.com

> 기능 명세, AI 모델명(README §1), Route별 프로바이더(README §5)는 **README.md가 기준**이다.
> 이 문서는 코딩 규칙과 데이터 경계만 다룬다. 두 문서가 충돌하면 README.md를 따른다.
> 단, 문서와 코드가 다르면 **코드가 사실**이다. 모델·스키마·파일 위치는 작업 전 코드에서 확인하고, 다르면 문서 갱신을 함께 보고한다.

---

## 기술 스택

- Framework: Next.js 15 App Router (Server Actions, Route Handlers), React 19, TypeScript 5
- Styling: TailwindCSS v4, CSS 변수 기반 테마 (Light / Dark / Auto), Pretendard
- Database & Storage: Supabase (Auth + PostgreSQL + Storage + RLS) — mybooks와 동일 인스턴스 공유
- Deployment: Vercel
- AI: Gemini / OpenAI / Anthropic 멀티 프로바이더 (기능별 모델은 README.md 참조)
- External API: MusicBrainz, Cover Art Archive, Wikipedia
- Key Libraries: lucide-react, sonner, react-markdown, recharts (레이더 차트 한정)
- dev 런처: Tauri 웹뷰

---

## 폴더 구조

```
myaudio/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # 전역 레이아웃 (Theme, Player, Navigation, Footer)
│   │   ├── page.tsx              # 대시보드
│   │   ├── globals.css
│   │   ├── login/
│   │   ├── albums/               # 앨범 라이브러리, /diary (음감 다이어리)
│   │   ├── artists/
│   │   ├── lyrics/               # 가사 번역 노트
│   │   ├── recordshelf/          # CD / LP / Cassette 실물 음반
│   │   ├── headfi/               # 기기, 조합, /match, /map, 판매관리
│   │   ├── works/                # 가사·음원 라이브러리 + 전역 플레이어
│   │   ├── insights/             # 랭킹, 추이, 사용통계, 장르통계, 아카이브
│   │   ├── archive/              # (레거시) /insights?tab=archive 리다이렉트
│   │   └── api/                  # AI 연동 및 프록시 Route Handler
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── features/
│   ├── contexts/                 # LyricsPlayerProvider
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase/             # client / server / middleware
│   │   ├── musicbrainz.ts
│   │   ├── aiModels.ts           # AI 기본 모델 ID (모델명 단일 관리)
│   │   ├── gemini.ts             # Gemini 호출 함수 모음
│   │   ├── openaiArtistBio.ts
│   │   ├── openaiHeadfi.ts
│   │   ├── anthropicHeadfi.ts
│   │   ├── anthropicLyricsTranslate.ts
│   │   └── timeMachineRecall.server.ts
│   ├── types/
│   └── proxy.ts                  # 쿠키 기반 세션 갱신
├── scripts/                      # 일회성 마이그레이션 스크립트 (앱 런타임 아님)
├── feature_list/                 # 하네스 검증용 JSON
├── public/                       # PWA 아이콘, 정적 에셋
├── .env.local
├── CLAUDE.md
├── AGENTS.md
├── HARNESS.md
├── CONVENTIONS.md
├── README.md
├── claude-progress.txt
└── Codex-progress.txt
```

---

## DB 테이블

mybooks와 동일한 Supabase 인스턴스를 공유한다.
별도 prefix 없음 — 이 앱에서 사용하는 테이블만 접근한다.
컬럼 구조와 id 타입(integer/uuid)은 이 문서에 적지 않는다. 작업 전 실제 스키마에서 확인한다.

### 사용 테이블

| 테이블 | 용도 |
|--------|------|
| `album` | 앨범 메타데이터, 실물 음반 보유 여부(`owns_cd`, `owns_lp`, `owns_cassette`), 무드 수동 지정(`mood_manually_set`) |
| `album_listen_history` | 앨범 청취 이력 (일자, 소감, 날씨, 감상 기기) |
| `album_mood_groups` | 무드보드 그룹 캐시 |
| `album_moods` | 사용자 지정 무드명 |
| `artists` | 아티스트 메타데이터, 보조이름(`name_alt`), Bio, 외부 링크 |
| `headfi` | 오디오 기기 컬렉션, 대표 매칭 콤보(`pairing_combo_id`) |
| `headfi_combos` | DAC/AMP/DAP 조합 (소프트 삭제 `deleted_at`) |
| `headfi_accessories` | 독립 액세서리 (`status`: `owned` / `released`) |
| `headfi_sales` | 기기·액세서리 판매 이력 |
| `headfi_device_settings` | 리시버 × DAC/AMP/DAP 게인 세팅 |
| `headfi_match_cache` | 리시버 × 콤보 매칭 점수 캐시 |
| `monthly_review_comments` | 월별 AI 코멘트 캐시 |
| `lyrics` | Works 메뉴의 가사·음원 데이터 |

### 접근하지 않는 테이블 (mybooks 전용)

`books`, `comics`, `photobook`, `book_highlights`, `book_stats_comments`

### mybooks와 공유하는 요소

`auth.users`, user_id 기반 RLS 정책, `monthly_review_comments`
→ 변경 전에 mybooks 영향 여부를 먼저 보고한다. 임의 변경 금지.

### 크로스 참조 (앱 내 허용)

- `album.manual_recommended_headphone_ids` → `headfi.id`
- `headfi.ai_recommended_album_ids` → `album.id`
- `headfi.pairing_combo_id` → `headfi_combos.id`
- 무드 추천 API는 album + headfi 테이블 동시 조회

### 도메인 경계 주의

- **Lyrics 메뉴**(`/lyrics`)는 album 테이블에 앨범을 새로 만들지 않고 기존 album을 참조한다.
- "Lyrics 앨범 제거"는 **트랙 + 가사 삭제**이며 album 레코드는 절대 삭제하지 않는다.
- **Works 메뉴**(`/works`)의 `lyrics` 테이블은 Lyrics 메뉴와 별개 시스템이다. 혼용 금지.

### 스키마 변경

- FK, 제약, 컬럼 추가·삭제 등 스키마 변경이 필요하면 직접 ALTER 하지 말고 먼저 보고한다. SQL은 JW가 Supabase에서 직접 실행한다.
- 기존 컬럼은 원칙적으로 삭제하지 않고 레거시로 남긴다.

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

# (선택) 모델 override — 비워두면 코드 기본값 사용
OPENAI_ARTIST_BIO_MODEL=
OPENAI_MATCH_SCORE_MODEL=
ANTHROPIC_HEADFI_MODEL=
ANTHROPIC_LYRICS_TRANSLATE_MODEL=   # 미설정 시 ANTHROPIC_HEADFI_MODEL → 코드 기본값 순
```

- 새 env 키를 코드에 추가하면 이 문서와 README §7.1에 함께 등록한다.

---

## feature_list/ ID 규칙

| prefix | 카테고리 |
|--------|----------|
| `SETUP-` | 프로젝트 초기 세팅 |
| `ALBUM-` | 앨범, 무드, 아티스트, 다이어리 |
| `RECORDSHELF-` | 실물 음반 (CD / LP / Cassette) |
| `GEAR-` | 헤드파이 기기, 조합, 매칭, 판매, 액세서리 |
| `LYRICS-` | Lyrics 메뉴 |
| `LYRICSTRANSLATE-` | 가사 번역 |
| `STATS-` | Insights (통계·아카이브) |
| `UX-` | 공통 UX / 레이아웃 |
| `BUG-` | 버그 수정 |

---

## 검증 명령

- `npx tsc --noEmit`, `npm run lint`, `npm run build`가 모두 통과해야 완료로 본다.
- `npm run lint`는 ESLint CLI + flat config(`eslint.config.mjs`)로 저장소 전체를 검사한다.
- 빌드 출력 디렉터리(`.next`, `.next-buildcheck` 등)를 새로 만들면 `.gitignore`와 `eslint.config.mjs`의 `ignores`에 **함께** 추가한다. 빠지면 lint가 산출물까지 검사해 수천 건이 나온다.
- lint 건수를 줄이려고 규칙을 끄지 않는다.

---

## 인증

- 비로그인(Guest): 목록·상세 조회만 가능 (읽기 전용)
- 로그인(Owner): 등록·수정·삭제, AI 분석 생성, 판매·세팅 관리
- 쓰기·수정·삭제 Server Action 및 API Route는 최상단에서 `getCurrentUser()`로 서버 세션을 재검증한다.

---

## 컴포넌트 패턴

- named export 사용
- 서버 컴포넌트 기본, 인터랙션 필요 시 `use client`
- props 타입은 인터페이스로 별도 정의
- 모달 상태 관리: stale state 방지를 위해 API 응답 후 `setViewingItem`과 `setLibrary` 동시 업데이트
- 전역 Lyrics Player: `contexts/`의 `LyricsPlayerProvider`로 layout.tsx에서 감싸고, 페이지 이동 후에도 재생 상태 유지
- **`window.confirm` / `alert` / `prompt` 사용 금지** — Tauri 웹뷰에서 깨지고 모달 중첩 오류를 일으킨다. 커스텀 인라인 확인 UI를 사용한다.
- 알림은 `sonner` Toast 사용

---

## AI 규칙 (전 프로바이더 공통)

- 사용 모델은 README §1 기준. 모델을 바꾸면 README §1을 함께 갱신한다.
- 모델 ID 문자열은 `src/lib/aiModels.ts`에만 둔다. 다른 파일에 하드코딩하지 않는다.
- 모델 override env는 `process.env.KEY_NAME` 형태로 정적 접근한다 (`process.env[name]`은 빌드 타임에 주입되지 않을 수 있음).
- AI Route를 추가·삭제하거나 프로바이더를 바꾸면 README §5 표를 함께 갱신한다.
- AI API 호출은 반드시 try/catch로 감싼다
- 429 에러는 retry 헬퍼로 처리 (Gemini는 `withRetry`, retry delay는 에러 메시지에서 파싱)
- AI 편향 방지: 후보 아이템 전달 전 random shuffle + slice 적용
- 응답 JSON이 markdown 코드블록으로 감싸진 경우 파싱 전 제거
- 한국어 응답은 정규화 후 저장·렌더링 (react-markdown)
- 생성 비용이 큰 결과는 캐시 테이블에 저장하고 재사용한다 (무드, 매칭 점수, 월간 코멘트 등)
- FR 그래프 이미지 해석은 Anthropic 비전으로 처리한다 (Gemini 이미지 호출 없음)
- Gemini SDK는 `@google/genai` 2.x를 쓴다 (3.0은 Node 22 필수 등 변경이 있어 별도 검토 후 올린다). 레거시 `@google/generative-ai`는 앱에서 쓰지 않는다.
- 신규 Gemini 기능은 `gemini.ts`의 `generateGeminiText` 래퍼를 거친다. 래퍼 밖에서 SDK를 직접 호출하지 않는다.
  - 응답은 `response.text` getter로 읽고, 빈 값은 실패로 처리한다
  - SDK 자체 재시도는 끄고(`retryOptions.attempts: 1`) `withRetry`만 쓴다 (중첩 재시도 방지)
  - 실패 시 `[gemini]` 로그를 남긴다. API 키와 프롬프트 전문은 로그에 남기지 않는다
- Google Search grounding(`config.tools: [{ googleSearch: {} }]`)을 쓰는 호출에는 `responseMimeType` / `responseSchema`를 넣지 않는다 (400 에러). JSON은 프롬프트로 요구하고 파싱한다.

---

## 스타일 규칙

- 테마: CSS 변수 기반 Light / Dark / Auto. 색상 하드코딩 금지
- Glass 스타일: `globals.css` 유틸 클래스 사용
  - 카드: `glass-card`
  - 헤더: `glass-header`
- 차트:
  - **신규 차트는 SVG + CSS 변수**로 구현 (다크모드 대응)
  - 예외: 헤드파이 레이더 차트는 기존 Recharts 유지
- 커스텀 클래스: `@layer utilities` 필수 (Tailwind v4)

---

## Archive 범위

Archive는 `/insights?tab=archive`에 있다 (구 `/archive`는 리다이렉트).
아래 항목만 집계한다:
- 앨범 청취 이력 (`album_listen_history`)
- 헤드파이 기기 구매 (`headfi.purchase_date`)
- 가사 등록 (`lyrics.created_at`)