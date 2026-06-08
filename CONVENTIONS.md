# CONVENTIONS.md — myaudio

## 프로젝트 개요

개인 음악·헤드파이 라이브러리. 앨범·헤드파이 기기·가사를 관리한다.
배포 URL: https://audio.sshlove.com

---

## 기술 스택

- Framework: Next.js 15 App Router + TailwindCSS v4
- Database: Supabase (Auth + PostgreSQL + RLS) — mylibrary와 동일 인스턴스 공유
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

mylibrary와 동일한 Supabase 인스턴스를 공유한다.
별도 prefix 없음 — 이 앱에서 사용하는 테이블만 접근한다.

### 사용 테이블

| 테이블 | 용도 |
|--------|------|
| `album` | 음악 앨범 컬렉션 |
| `headfi` | 헤드파이 기기 컬렉션 |
| `lyrics` | 가사/음원 컬렉션 |
| `album_listen_history` | 앨범 청취 이력 |
| `album_mood_groups` | 무드보드 그룹 캐시 |
| `album_moods` | 사용자별 무드명 관리 |
| `monthly_review_comments` | 월별 Archive Gemini 코멘트 캐시 |

### 접근하지 않는 테이블 (mybooks 전용)

`books`, `comics`, `photobook`, `book_highlights`, `book_stats_comments`

### 크로스 참조 (앱 내 허용)

- `album.manual_recommended_headphone_ids` → `headfi.id` 참조 (같은 앱 내)
- `headfi.ai_recommended_album_ids` → `album.id` 참조 (같은 앱 내)
- 무드 추천 API는 album + headfi 테이블 동시 조회

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
```

---

## feature_list/ ID 규칙

| prefix | 카테고리 |
|--------|----------|
| `SETUP-` | 프로젝트 초기 세팅 |
| `ALBUM-` | 앨범 |
| `GEAR-` | 헤드파이 기기 (헤드폰·이어폰·DAC·AMP) |
| `LYRICS-` | 가사 |
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
