# 🎧 myaudio — 개인 음악, 실물 음반 및 헤드파이 라이브러리 명세서

myaudio는 개인이 보유하고 감상한 **음악 앨범(Albums), RecordShelf(CD/LP 실물 음반), 헤드파이 기기(Head-fi), 가사 및 음원(Lyrics), 아티스트(Artists)**를 한곳에서 체계적으로 등록, 검색, 분석, 회고하는 프리미엄 개인 오디오 라이브러리 웹 애플리케이션입니다. 

본 애플리케이션은 **MusicBrainz API**를 연동하여 앨범 메타데이터를 자동화하고, **Gemini AI / OpenAI GPT / Anthropic Claude** 다중 AI 프로바이더 모델을 깊이 있게 활용하여 도메인별 AI 해석, 추천 및 시각화(산점도, 매칭 스코어링 등) 기능을 제공합니다.

---

## 1. 기술 스택 (Tech Stack)

*   **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers), React 19, TypeScript 5
*   **Styling**: Tailwind CSS v4, CSS 변수 기반 테마 시스템 (Light / Dark / Auto), Pretendard 폰트
*   **Database & Storage**: Supabase (PostgreSQL, Supabase Auth, Storage, RLS)
    *   *주의: 기존 mylibrary / mybooks 서비스와 동일한 Supabase 인스턴스를 공유하며, myaudio 도메인 테이블만 독립적으로 사용합니다.*
*   **AI Integration (Multi-Provider Architecture)**:
    *   **Google Gemini**: `gemini-3.5-flash-lite`, Gemini Vision (FR 그래프 이미지 비전 스캔 및 대역별 특성 해석)
    *   **OpenAI**: GPT-4o / GPT-4o-mini (매칭 스코어링), GPT-5.4-mini + Web Search (아티스트 국문 바이오 생성)
    *   **Anthropic**: Claude 3.5 Sonnet (기기 FR/음색 성향 해석, 추천 앨범 해설)
*   **External APIs**: MusicBrainz API, Cover Art Archive, Wikipedia API
*   **Key Libraries**:
    *   `lucide-react` (아이콘)
    *   `sonner` (Toast 알림)
    *   `react-markdown` (AI 텍스트 렌더링)
    *   `recharts` (헤드파이 레이더 차트)

---

## 2. 폴더 구조 (Directory Structure)

```text
myaudio/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 전역 레이아웃 (Theme, Player, Navigation, Footer 등)
│   │   ├── page.tsx                    # 메인 대시보드 (Stat 바, 최근 청취 7장 캐러셀, 최근 구매 기기)
│   │   ├── globals.css                 # 전역 스타일 및 Tailwind v4 유틸리티 클래스
│   │   ├── login/                      # 로그인 페이지
│   │   ├── albums/                     # 앨범 라이브러리, 음감 다이어리(/diary), 청취 통계(/stats)
│   │   ├── recordshelf/                # CD / LP 실물 음반 전용 라이브러리 (리스트/장르보드)
│   │   ├── artists/                    # 아티스트 관리 (2단 레이아웃, GPT 바이오, 외부 링크)
│   │   ├── headfi/                     # 헤드파이 기기 목록, 사용 통계(/stats), 매칭(/match), 포지션맵(/map)
│   │   ├── lyrics/                     # 가사 라이브러리 및 전역 오디오 플레이어
│   │   ├── archive/                    # 연도/월별 활동 아카이브 및 타임라인
│   │   └── api/                        # Gemini / OpenAI / Anthropic AI 연동 및 프록시 API 라우트
│   ├── components/                     # 공통 및 도메인별 UI 컴포넌트
│   │   ├── ui/                         # 아토믹 UI 요소 (버튼, 카드, 모달, 팝오버, 콤보박스 등)
│   │   ├── layout/                     # 헤더, 푸터, 네비게이션 등 공통 레이아웃
│   │   └── features/                   # 도메인별 기능 컴포넌트
│   ├── contexts/                       # 전역 가사 플레이어 Context (LyricsPlayerProvider)
│   ├── hooks/                          # 공용 커스텀 훅 (useAlbumMutations, useAlbumFilters, useHeadfiFilters 등)
│   ├── lib/                            # 유틸리티 라이브러리
│   │   ├── supabase/                   # Supabase client / server / middleware 설정
│   │   ├── musicbrainz.ts              # MusicBrainz API 연동 모듈
│   │   └── gemini.ts                   # Gemini API 헬퍼 및 retry 로직
│   └── proxy.ts                        # 쿠키 기반 세션 갱신 및 토큰 프록시
├── feature_list/                       # 하네스 검증용 JSON 파일군 (SETUP, ALBUM, GEAR, LYRICS, RecordShelf, UX, BUG)
├── public/                             # PWA 아이콘 및 정적 에셋
├── CONVENTIONS.md                      # 프로젝트 코딩 컨벤션 및 DB 맵핑 규칙
├── HARNESS.md                          # 하네스 운용 및 에이전트 작업 절차
└── README.md                           # (본 문서) 프로젝트 기능/스펙 명세서
```

---

## 3. 데이터베이스 및 Storage 설계

myaudio는 Supabase PostgreSQL 인스턴스를 공유하며 다음 테이블 및 Storage 버킷을 단독으로 사용합니다.

### 3.1. 주요 테이블 명세

| 테이블명 | 용도 | 설명 |
| :--- | :--- | :--- |
| `album` | 앨범 메타데이터 정보 | 제목, 아티스트, 발매일, 장르, 국가, 오디오 태그, CD/LP 보유 여부(`owns_cd`, `owns_lp`), AI 소개문, 커버 URL, 수동 추천 기기 IDs 등 |
| `album_listen_history` | 앨범 청취 이력 | 사용자가 앨범을 청취한 일자, 소감(리뷰), 감상 시 매칭 기기(DAC/AMP, 헤드폰 등)를 누적 기록 |
| `album_mood_groups` | 무드보드 그룹 캐시 | AI가 분류한 앨범들의 무드 그룹(9가지 대표 무드) 분류 데이터를 캐싱 |
| `album_moods` | 사용자 지정 무드 이름 | 사용자가 앨범 무드 관리를 위해 커스텀 정의한 무드 키-벨류 정보 |
| `artists` | 아티스트 메타데이터 | 아티스트명, 보조이름(`name_alt`), 프로필 이미지, 위키피디아 요약, GPT 생성 국문 Bio, 외부 공식 SNS 링크 등을 관리 |
| `headfi` | 오디오 기기 컬렉션 | 브랜드, 모델명, 카테고리(헤드폰/이어폰/DAC/AMP/DAP/스피커), 상세 스펙, 18개 청음 평점, AI 소리 성향 해석, FR 그래프 URL 등 |
| `headfi_accessories` | 독립 액세서리 컬렉션 | 케이블, 이어팁, 무선 액세서리, 스피커 부품 등 독립 지출 품목 등록/수정/삭제 및 소비 통계 합산 |
| `headfi_device_settings` | 리시버-앰프 조합 세팅 | 리시버(헤드폰/이어폰) × DAC/AMP/DAP 조합별 게인(Gain) 설정 및 세팅 메모 관리 |
| `headfi_match_cache` | 기기 조합 매칭 스코어 | 헤드폰/이어폰 × DAC/AMP/DAP 매칭 궁합 점수 및 AI 매칭 평점 캐시 |
| `monthly_review_comments` | 월별 AI 코멘트 캐시 | 아카이브에서 월별 활동 요약 분석 후 AI가 작성한 월간 종합 코멘트 캐싱 |
| `lyrics` | 가사 및 음원 데이터 | 가사 텍스트, 음원 파일 URL, 커버 이미지, AI 바이브 색상/이모지 등 저장 |

### 3.2. Storage 버킷 명세

*   `lyrics-covers`: 가사 앨범의 전용 커버 아트 이미지 저장소
*   `lyrics-audio`: 가사 앨범에 등록된 음원 파일 저장소 (`.mp3`, `.wav`, `.flac`)
*   `headfi-fr`: 헤드파이 기기의 주파수 응답(FR) 그래프 이미지 파일 저장소

---

## 4. 핵심 기능 명세

### 4.1. 공통 UX & PWA & 메인 대시보드
*   **반응형 메인 대시보드 (`/`)**:
    *   **Stat 바**: 총 앨범 수, 보유 기기 수(보유중 기준), 이번 달 청취 건수 집계 노출.
    *   **최근 청취 7장 스와이프 캐러셀**: 1:1 커버 비율 유지, 대칭 Peek 효과, 3초 오토 슬라이드, 다이어리 바로가기 배지 탑재.
    *   **최근 구매 기기 목록**: 구매일 최신순 기기 5개 및 대시보드 보유 기기 3x3 그리드 제공.
*   **슬롯머신 앨범 추천**: 인라인 슬롯머신 애니메이션을 통해 보유 앨범 중 한 장을 무작위로 추첨해 모달로 연동.
*   **테마 토글 & 모션**: 라이트/다크/자동(System) 모드를 완벽 지원하며 `BackToTop` 부드러운 스크롤 탑 이동 탑재.
*   **PWA(Progressive Web App)**: 모바일/데스크탑 웹 홈 화면 추가 기능(Headphones 아이콘, Manifest 지원).

### 4.2. 앨범 라이브러리 & 다이어리 & 통계 (Albums)
*   **목록 및 복합 필터**: 장르, 국가, 연도 구간(2020~2024, 2010~2019 등), CD/LP 매체 여부, 텍스트 검색, 다중 정렬 기준 지원.
*   **MusicBrainz 및 CAA 연동**: 아티스트 검색 후 앨범 리스트 자동 완성 및 Cover Art Archive 이미지 자동 수집.
*   **3탭 앨범 상세 모달**:
    *   **앨범 정보**: 메타데이터, Wikipedia 요약, AI 생성 소개문 및 태그, 무드보드 바로가기 연동.
    *   **추천 리시버**: 수동 추천 기기 및 AI 추천 리시버(헤드폰+이어폰 확장, 추천 사유 및 새로고침 지원) 노출.
    *   **청취 이력**: 청취 일자, 소감, 감상 매칭 기기(리시버 콤보박스 연동) 기록 및 누적 타임라인.
*   **무드보드 & 장르보드**: 9가지 무드 분류 및 대표 `genre1` 기준 스택 카드 뷰 제공 (신규 앨범 등록 시 백그라운드 무드 오토 아사인).
*   **음감 다이어리 (`/albums/diary`)**: 날짜별로 그룹핑된 청취 일지 타임라인 제공, 청취 이력 인라인 수정 및 삭제 지원.
*   **청취 통계 (`/albums/stats`)**:
    *   **랭킹 탭**: 청취 랭킹 TOP20, 금주의 핫 앨범 TOP5 (오늘 기준 롤링 7일), 최다 청취 기기 TOP20 노출.
    *   **청취 추이 탭**: 기간별(월별/연도별) 청취 횟수 변화를 다이내믹 SVG 그래프로 시각화.
    *   **공용 리시버 콤보박스 (`ALBUM-027`)**: 검색, 최근 사용 기기, 전체보기 지원 콤보박스 UI 적용.

### 4.3. RecordShelf (CD/LP 실물 음반 라이브러리, `/recordshelf`)
*   **CD / LP 실물 음반 컬렉션 단독 관리**: 앨범 폼에서 `CD 보유`, `LP 보유`로 체크된 실물 음반들만 별도로 모아보는 전용 라이브러리 메뉴.
*   **다양한 뷰 & 필터**: 리스트뷰(Albums와 동일한 커버 레이아웃) 및 장르보드 뷰 전환, CD/LP 매체 구분 태그 표시, 매체 필터(전체/CD/LP) 및 정렬 지원.
*   **상세 모달 연동**: 항목 클릭 시 앨범 상세 모달이 오픈되어 수정·삭제가 즉시 수행되며 배경 스크롤을 자동 잠금 처리.

### 4.4. 아티스트 라이브러리 (Artists)
*   **애플 뮤직 스타일 2단 레이아웃**: 좌측 아티스트 필터링/검색 목록, 우측 상세 아티스트 프로필 정보 구성.
*   **이름2 (`name_alt`) 지원 & 정규화**: 한국어/원어 보조이름 등록 및 NFKC 정규화 비교를 통한 중복 검사, 이름 변경 시 앨범 artist 일괄 갱신 및 기존 아티스트 병합 처리.
*   **OpenAI GPT-5.4-mini Web Search 바이오**: 위키피디아와 연동 후 OpenAI GPT-5.4-mini Responses API + web_search 기반으로 정갈한 한국어 존대어(~습니다체) 아티스트 바이오를 자동 생성.
*   **외부 브랜드 링크 & 빠칭코 모달**: 5대 플랫폼(Apple Music, Spotify, YouTube, X, Instagram) 브랜드 SVG 인라인 수정, 아티스트 빠칭코 무작위 추천 모달(`ALBUM-021`), 유사 아티스트 가중치 스코어링 지원.

### 4.5. 헤드파이 라이브러리 & 사용 통계 & 세팅 (Head-fi)
*   **카테고리별 동적 입력 폼**: 헤드폰, 이어폰, DAC, AMP, DAP, 스피커 카테고리별 유동 스펙 분기 (이어폰 이어팁/케이블, 앰프 Vrms Single/BAL, 구동방식/등급 9조합 등).
*   **4탭 헤드파이 상세 모달**:
    *   **기본 정보**: 스펙 정보, 18개 사운드 평점, 블러 배경 헤더.
    *   **청음 평가 (레이더 차트)**: Recharts 레이더 차트 및 Anthropic Claude 3.5 Sonnet 기반 음색 성향 상세 해석.
    *   **FR 그래프**: 이미지 Upload/URL 입력 프록시 우회 및 Gemini Vision 이미지 비전 스캔을 통한 대역별 밸런스 리포트.
    *   **추천 앨범**: Anthropic Claude / AI 추천 앨범 3선(추천 사유 포함) 및 수동 매칭 앨범 노출.
*   **독립 액세서리 관리 (`GEAR-022`, `GEAR-023`)**: 케이블, 이어팁, 무선 액세서리, 스피커 부품 등 독립 품목 행 단위 인라인 등록/수정/삭제 및 카테고리 필터ing, 지출 합산.
*   **리시버 게인 세팅 탭 (`GEAR-028`)**: 헤드폰/이어폰 × DAC/AMP/DAP 조합별 게인(Gain) 설정/메모 CRUD.
*   **Head-fi 사용 통계 (`/headfi/stats`)**: 최다 사용 DAC/AMP/DAP 랭킹 TOP10, 리시버(HP/IEM/W-HP/W-IEM) 랭킹 TOP10 2컬럼 배치 및 소비 통계 모달 연동.

### 4.6. 매칭 및 포지션 맵 (Match & Position Map)
*   **기기 조합 매칭 추천 (`/headfi/match`)**: DAC/AMP/DAP × 유선 헤드폰/이어폰 선택 시 궁합 앨범 5개 제안.
*   **기기 궁합 매칭 맵 (Matrix)**: 헤드폰(행) × DAC/AMP/DAP(열) 2차원 궁합 점수(300점 만점) 및 캐시/실시간 분석 표도식화.
*   **포지션 맵 (`/headfi/map`)**: Warm ↔ Cool / Technical ↔ Musical X·Y축 포지션 도식화, 클러스터링 팝오버, 산점도 기기 다중 선택 필터.

### 4.7. 가사 & 전역 플레이어 (Lyrics)
*   **가사 앨범 그리드 & 바이브 분석**: 가사 등록 앨범 탐색, AI 감정선 분석 기반 **그라디언트 HEX 코드 2종 & 이모지** 앨범 카드 비주얼 연동.
*   **전역 가사 플레이어**: Next.js 페이지 이동 시에도 Context(`LyricsPlayerProvider`)를 통해 **오디오가 중단 없이 연속 재생**되는 HTML5 오디오 플레이어 (반복, 가사 드로어, 즐겨찾기 지원).

### 4.8. 월별 활동 아카이브 (Archive)
*   **연도별 월 활동 그리드 & 타임라인**: 월별 앨범 청취, 기기 구매, 가사 등록 활동 집계 카드 및 날짜별 상세 타임라인 스크롤.
*   **월간 AI 종합 리뷰**: 사용자의 감상 성향과 장비 소비 내역을 분석한 AI 월간 종합 피드백 코멘트 제공.

---

## 5. AI API 연동 명세

myaudio는 AI 연동 시 **다중 AI 프로바이더 (Gemini / OpenAI / Anthropic)** 체계를 구축하고, **try/catch 예외 처리, 429 에러 retry 헬퍼, AI 한국어 응답 정규화** 등의 방어코드를 적용하고 있습니다.

### 주요 API Route 및 역할

1.  **`/api/album-intro`**: 앨범 정보를 바탕으로 AI 웹 검색 결합 앨범 영/국문 소개 및 대표 키워드 태그 생성.
2.  **`/api/album-mood-assign`**: 신규 앨범 등록 시 백그라운드 단일 분석으로 무드보드 캐시에 동적 할당.
3.  **`/api/album-mood-groups`**: 전체 앨범 라이브러리를 9가지 무드 기준으로 일괄 매핑 및 캐싱.
4.  **`/api/mood-recommend`**: 사용자 기분, 날씨, 시간대 감안 맞춤형 앨범 및 오디오 기기 제안.
5.  **`/api/analyze-music-taste`**: 앨범 장르, 국가, 연대 분포 기반 음악적 취향 종합 분석.
6.  **`/api/artist-bio`**: **OpenAI GPT-5.4-mini (Responses API + web_search)**를 활용해 위키피디아 기반 정갈한 한국어 아티스트 생애/업적 바이오 작성.
7.  **`/api/headfi-recommended-genres`**: 신규 오디오 장비 등록 시 스펙 적합 추천 음악 장르 태그 분석.
8.  **`/api/headfi-album-recommend`**: **Anthropic Claude 3.5 Sonnet** 기반 기기 성향 대비 최적 궁합 보유 앨범 3선 및 추천 사유 제안.
9.  **`/api/headfi-sound-analysis`**: **Anthropic Claude 3.5 Sonnet** 기반 기기 18개 사운드 점수를 바탕으로 전반적 소리 성향 및 밸런스 상세 풀이.
10. **`/api/headfi-fr-interpret`**: **Gemini Vision / Claude**로 FR 그래프 이미지를 비전 스캔하여 저/중/고역 특성 리포트.
11. **`/api/headfi-position`**: 기기 사운드 특성을 포지션 맵 X, Y축 좌표 수치(`-100 ~ +100`)로 산출.
12. **`/api/headfi-match-score`**: **OpenAI GPT-4o / GPT-4o-mini** 기반 DAC/AMP/DAP × 헤드폰/이어폰 궁합 점수(300점 만점) 산출.
13. **`/api/analyze-lyrics-vibe`**: 노랫말 문맥 분석 기반 **그라디언트 HEX 코드 2종 & 이모지** 산출.
14. **`/api/monthly-review-comment`**: 아카이브 월별 청취 내역 및 라이브러리 종합 AI 월간 코멘트 생성.
15. **`/api/headfi`**: 헤드파이 장비 등록 및 변경 사항 처리를 위한 전용 Route Handler.

---

## 6. 인증 및 세션 아키텍처

myaudio는 SSR과 비로그인 게스트의 원활한 조회 경험을 보장하는 하이브리드 Auth 구조를 취합니다.

*   **Supabase SSR Client**: `src/lib/supabase/server.ts`의 `createClient()`는 쿠키 기반으로 서버 컴포넌트 환경 인증 상태 파악.
*   **미들웨어 & 세션 프록시**: `src/middleware.ts`와 `src/proxy.ts`는 Supabase Auth 토큰 쿠키 세션 주기적 갱신.
*   **접근 권한 위계**:
    *   **비로그인 (Guest)**: 대시보드, Albums / RecordShelf / Artists / Head-fi / Lyrics 기본 목록 검색 및 상세 모달 조회 (읽기 전용).
    *   **로그인 (Owner)**: 신규 아이템 등록/수정/삭제, 청취 이력 작성/수정/삭제, 독립 액세서리 및 게인 세팅 CRUD, AI 분석 생성 및 아카이브/통계 접근 (쓰기/편집 권한).
    *   **Server Actions & API Route 보호**: 쓰기/수정/삭제 로직 최상단에서 서버 세션(`getCurrentUser()`)을 재검증하여 우회 입력 차단.

---

## 7. 개발 및 실행 가이드

### 7.1. 로컬 환경 변수 설정 (`.env.local`)

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 아래 키를 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
MUSICBRAINZ_CONTACT_EMAIL=your_email_for_user_agent
```

### 7.2. 명령어 가이드

*   **의존성 설치**:
    ```bash
    npm install
    ```
*   **개발 서버 실행**:
    ```bash
    npm run dev
    ```
*   **타입스크립트 정적 검사**:
    ```bash
    npx tsc --noEmit
    ```
*   **Next.js 빌드**:
    ```bash
    npm run build
    ```
*   **Next.js 빌드 정적 검사 전용**:
    ```bash
    npm run build:check
    ```
*   **코드 린트 검사**:
    ```bash
    npm run lint
    ```
