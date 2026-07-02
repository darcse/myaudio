# 🎧 myaudio — 개인 음악 및 헤드파이 라이브러리 명세서

myaudio는 개인이 보유하고 감상한 **음악 앨범(Albums), 헤드파이 기기(Head-fi), 가사 및 음원(Lyrics)**을 한곳에서 체계적으로 등록, 검색, 분석, 회고하는 프리미엄 개인 오디오 라이브러리 웹 애플리케이션입니다. 

본 애플리케이션은 **MusicBrainz API**를 연동하여 앨범 메타데이터를 자동화하고, **Gemini AI 제품군**을 깊이 있게 활용하여 도메인별 AI 해석, 추천 및 시각화(산점도, 매칭 스코어링 등) 기능을 제공합니다.

---

## 1. 기술 스택 (Tech Stack)

*   **Framework**: Next.js 15 (App Router, Server Actions), React 19, TypeScript 5
*   **Styling**: Tailwind CSS v4, CSS 변수 기반 테마 시스템 (Light / Dark / Auto), Pretendard 폰트
*   **Database & Storage**: Supabase (PostgreSQL, Supabase Auth, Storage)
    *   *주의: 기존 mylibrary / mybooks 서비스와 동일한 Supabase 인스턴스를 공유하며, myaudio 도메인 테이블만 독립적으로 사용합니다.*
*   **AI Integration**: Gemini API (`gemini-3.1-flash-lite-preview`), Gemini Vision (FR 그래프 이미지 해석)
*   **External APIs**: MusicBrainz API, Cover Art Archive
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
│   │   ├── layout.tsx                  # 전역 레이아웃 (Theme, Player, Navigation 등)
│   │   ├── page.tsx                    # 메인 대시보드
│   │   ├── globals.css                 # 전역 스타일 및 Tailwind v4 유틸리티 클래스
│   │   ├── login/                      # 로그인 페이지
│   │   ├── albums/                     # 앨범 라이브러리 및 앨범 통계 페이지
│   │   ├── artists/                    # 아티스트 관리 페이지
│   │   ├── headfi/                     # 헤드파이 기기 목록, 매칭(/match), 포지션맵(/map)
│   │   ├── lyrics/                     # 가사 라이브러리 및 플레이리스트
│   │   ├── archive/                    # 연도/월별 활동 아카이브 및 타임라인
│   │   └── api/                        # Gemini AI 연동 및 프록시 API 라우트
│   ├── components/                     # 공통 및 도메인별 UI 컴포넌트
│   │   ├── ui/                         # 아토믹 UI 요소 (버튼, 카드, 모달, 팝오버 등)
│   │   ├── layout/                     # 헤더, 푸터, 네비게이션 등 공통 레이아웃
│   │   └── features/                   # 도메인별 거대 컴포넌트 분리
│   ├── contexts/                       # 전역 가사 플레이어 Context (LyricsPlayerProvider)
│   ├── hooks/                          # 공용 커스텀 훅 (useAlbumMutations, useAlbumFilters 등)
│   ├── lib/                            # 유틸리티 라이브러리
│   │   ├── supabase/                   # Supabase client / server / middleware 설정
│   │   ├── musicbrainz.ts              # MusicBrainz API 연동 모듈
│   │   └── gemini.ts                   # Gemini API 헬퍼 및 retry 로직
│   └── proxy.ts                        # 쿠키 기반 세션 갱신 및 토큰 프록시
├── feature_list/                       # 하네스 검증용 JSON 파일군 (SETUP, ALBUM, GEAR, LYRICS, UX, BUG)
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
| `album` | 앨범 메타데이터 정보 | 제목, 아티스트, 발매일, 장르, 국가, 오디오 태그, AI 소개문, 커버 이미지 URL, 수동 추천 헤드폰 IDs 등 저장 |
| `album_listen_history` | 앨범 청취 이력 | 사용자가 앨범을 청취한 일자, 소감(리뷰), 감상 시 매칭 기기(DAC/AMP, 헤드폰 등)를 누적 기록 |
| `album_mood_groups` | 무드보드 그룹 캐시 | Gemini가 분류한 앨범들의 무드 그룹(9가지 대표 무드) 분류 데이터를 캐싱 |
| `album_moods` | 사용자 지정 무드 이름 | 사용자가 앨범 무드 관리를 위해 커스텀 정의한 무드 키-벨류 정보 |
| `artists` | 아티스트 메타데이터 | 아티스트 위키피디아 summary, bio 정보, 외부 공식 SNS 링크 등을 관리 |
| `headfi` | 오디오 기기 컬렉션 | 브랜드, 모델명, 카테고리(헤드폰/이어폰/DAC/AMP/DAP/스피커), 스펙 정보, 18개 청음 평점, AI 소리 성향 해석, FR 그래프 이미지 URL 등 저장 |
| `headfi_match_cache` | 기기 조합 매칭 스코어 | 헤드폰 × DAC/AMP/DAP 매칭 궁합 점수 및 AI 매칭 평점 캐시 |
| `monthly_review_comments` | 월별 Gemini 코멘트 캐시 | 아카이브에서 월별 활동 요약 분석 후 Gemini가 작성한 월간 종합 코멘트 캐싱 |

### 3.2. Storage 버킷 명세

*   `lyrics-covers`: 가사 앨범의 전용 커버 아트 이미지 저장소
*   `lyrics-audio`: 가사 앨범에 등록된 음원 파일 저장소 (`.mp3`, `.wav`, `.flac`)
*   `headfi-fr`: 헤드파이 기기의 주파수 응답(FR) 그래프 이미지 파일 저장소

---

## 4. 핵심 기능 명세

### 4.1. 공통 UX & PWA
*   **반응형 대시보드**: 상단 Stat 바(총 앨범 수, 보유 기기 수, 이번 달 청취수)와 보유 기기별 통계, 최근 앨범/기기 가로 그리드를 제공합니다.
*   **오늘의 추천 앨범**: 대시보드 내에서 앨범의 돔-컬러(Dominant Color) 그라디언트와 풀블리드 커버 이미지를 오버레이 형태로 노출하여 시각적 완성도를 극대화합니다.
*   **슬롯머신 앨범 추천**: 인라인 슬롯머신 애니메이션을 통해 보유 앨범 중 한 장을 무작위로 추첨해 줍니다.
*   **테마 토글 & 모션**: 라이트/다크/자동(System) 모드를 완벽히 지원하며, 스크롤 300px 이상 시 부드럽게 위로 이동하는 `BackToTop` 컴포넌트가 내장되어 있습니다.
*   **PWA(Progressive Web App)**: 모바일 및 데스크탑 웹 브라우저에서 '홈 화면에 추가'가 가능한 독립 앱 아이콘(Headphones) 및 manifest 설정을 갖추고 있습니다.

### 4.2. 앨범 라이브러리 (Albums)
*   **목록 및 복합 필터**: 장르, 국가, 연도 구간(2020~2024, 2010~2019 등), 텍스트 검색, 다중 정렬 기준(등록일, 발매일, 제목 등)을 지원합니다.
*   **MusicBrainz 및 CAA 연동**: 아티스트 검색 후 앨범(Release-group) 리스트를 2단계로 조회하여 폼 정보를 자동 완성하고 Cover Art Archive 이미지를 자동으로 가져옵니다.
*   **3탭 앨범 상세 모달**:
    *   **앨범 정보**: 메타데이터, Wikipedia 요약 정보, Gemini 생성 앨범 소개 및 태그 노출
    *   **추천 헤드폰**: 사용자가 지정한 수동 추천 기기(최대 3개) 및 Gemini AI가 추천한 헤드폰 기기 2개(추천 사유 및 새로고침 지원) 노출
    *   **청취 이력**: 토글형 입력 폼을 통해 청취 일자, 청취 기기(사용자 보유 기기 연동), 소감을 기록하고 누적 타임라인 표시
*   **무드보드 & 장르보드**: 앨범들을 9가지 주요 음악적 무드 또는 대표 `genre1` 기준으로 분류 및 그룹핑하여 카드 스택 형태로 모아볼 수 있는 특수 뷰를 제공합니다.

### 4.3. 아티스트 라이브러리 (Artists)
*   **애플 뮤직 스타일 2단 레이아웃**: 좌측 아티스트 필터링/검색 목록, 우측 상세 아티스트 프로필 정보를 보여주는 수려한 데스크탑 뷰와 모바일 맞춤 탭 뷰를 지원합니다.
*   **상세 위키 및 외부 링크**: 위키피디아와 연동된 아티스트 소개, Gemini로 한글 번역/요약된 바이오(Bio) 새로고침, 5대 플랫폼(Apple Music, Spotify, YouTube, X, Instagram) 링크의 인라인 수정을 제공합니다.
*   **아티스트 청취 통계 & 앨범 뱃지**: 아티스트의 등록 앨범 수, 청취 횟수 통계를 계산하여 최다 청취 앨범에 'All Time' 왕관 배지를 부착합니다.
*   **관련 아티스트 스코어링**: 국적, 타입, 장르 정보를 기반으로 유사도 점수를 가중 계산하여 관련 있는 추천 아티스트를 하단에 가로 스크롤로 보여줍니다.

### 4.4. 헤드파이 라이브러리 (Head-fi)
*   **카테고리별 동적 폼**: 헤드폰, 이어폰, DAC, AMP, DAP, 스피커 카테고리별로 입력 스펙과 레이아웃이 유동적으로 분기됩니다 (예: 이어폰의 경우 이어팁 및 케이블 정보, 앰프의 경우 칩셋 및 Vrms 정보 등).
*   **4탭 헤드파이 상세 모달**:
    *   **기본 정보**: 제조사, 모델, 보유 상태, 스펙 정보 및 18개 사운드 평가 항목
    *   **청음 평가 (레이더 차트)**: 18개 음질 평가 수치를 다각도로 매핑한 **Recharts 레이더 차트** 시각화 및 Gemini 기반 음색 성향 상세 해석 캐싱
    *   **FR 그래프**: Storage 업로드 또는 외부 FR 이미지 주소 입력 시 API 프록시 우회로 CORS 에러를 회피하며, Gemini Vision을 통해 저음/중음/고음 밸런스 및 성향을 자동 해석하여 텍스트 제공
    *   **추천 앨범**: 기기 스펙과 성향에 걸맞은 추천 앨범 3개(Gemini AI 추천 사유 제공) 및 수동 매칭된 앨범 리스트 노출
*   **소비 통계**: 사용자가 기기 구매, 케이블 교체, 이어팁 구매 등에 소요한 전체 지출, 연도별 지출, 2025년 이후 월별 지출 비용을 파악하기 쉽게 누적 차트/테이블 형태로 보여줍니다.

### 4.5. 매칭 및 포지션 맵 (Match & Position Map)
*   **기기 조합 매칭 추천 페이지 (`/headfi/match`)**: 보유 중인 DAC/AMP/DAP 중 하나와 유선 헤드폰/이어폰 중 하나를 선택하면, Gemini가 기기 성능 조화도를 감안하여 감상하기에 가장 알맞은 라이브러리 내 앨범 5개를 추천합니다.
*   **기기 궁합 매칭 맵 (Matrix)**: 헤드폰(행) × DAC/AMP/DAP(열) 조합에 따른 AI 평가 점수(300점 만점)와 매칭 이유를 2차원 매트릭스 표로 도식화합니다. 빈 셀 클릭 시 실시간으로 단일 조합 분석을 돌려 즉각 캐시에 채워 넣으며, 점수에 따라 4단계 셀 색상을 차등 적용합니다.
*   **포지션 맵 (SVG Scatter Plot, `/headfi/map`)**:
    *   X축(Warm ↔ Cool), Y축(Technical ↔ Musical)을 기준으로 헤드폰/이어폰 기기들의 음색 포지션을 SVG 평면에 도식화합니다.
    *   좌표가 뭉쳐 있는 기기는 클릭 팝오버 및 툴팁을 통해 그룹핑(Clustering) 처리하여 상세 정보를 직관적으로 노출합니다.
    *   상단 기기 선택 팝오버를 통해 원하는 기기만 다중 체크하여 산점도에 필터링해 렌더링할 수 있습니다.

### 4.6. 가사 & 전역 플레이어 (Lyrics)
*   **가사 앨범 그리드**: 가사가 등록된 앨범을 그리드로 탐색하며, 타이틀/곡명/앨범 검색을 지원합니다.
*   **바이브 분석**: 등록된 가사를 바탕으로 Gemini가 어울리는 그라디언트 색상 코드 2개와 대표 이모지를 분석하여 앨범 카드의 비주얼 그라디언트 배경으로 활용합니다.
*   **전역 가사 플레이어 (Global Player)**:
    *   음악 상세 및 플레이리스트에서 재생을 시작하면 하단에 고정된 HTML5 Audio 기반 플레이어가 활성화됩니다.
    *   Next.js 페이지를 이동하더라도 Context(LyricsPlayerProvider)를 통해 **재생 중단이나 초기화 없이 오디오가 연속적으로 재생**됩니다.
    *   이전/다음 곡 전환, 재생 큐 관리, 한 곡 반복 재생, 실시간 가사 팝업 드로어, 하트(즐겨찾기) 토글 기능을 지원합니다.

### 4.7. 월별 활동 아카이브 (Archive)
*   **연도별 월 활동 그리드**: 로그인 유저의 월별 앨범 청취 수, 헤드파이 기기 구매 건수, 가사 등록 건수를 달력 카드로 보여주며, 활동이 아예 없는 월은 자동 생략됩니다.
*   **월별 타임라인**: 선택한 월의 오디오 라이프 활동(앨범 청취, 기기 구매, 가사 등록 등)을 날짜 기준 상세 타임라인 스크롤로 구성하며, 카드 클릭 시 각각의 상세 정보 모달을 페이지 이동 없이 띄워 줍니다.
*   **월간 AI 종합 리뷰**: 한 달간 사용자의 감상 성향과 장비 소비 내역을 분석하여 Gemini가 한글 코멘트를 생성 및 캐싱합니다.

---

## 5. Gemini AI API 연동 명세

myaudio는 AI 연동 시 예기치 못한 에러와 성능 이슈를 차단하기 위해 모든 API Route에 **try/catch 예외 처리, 429 에러 딜레이 withRetry 헬퍼, Gemini 프롬프트 한국어 응답 강제** 등의 방어코드를 적용하고 있습니다.

### API Route 목록 및 주요 역할

1.  **`/api/album-intro`**: 앨범 정보를 바탕으로 Gemini가 웹 검색을 결합해 앨범 영문/국문 소개 및 대표 키워드 태그를 생성합니다.
2.  **`/api/album-mood-assign`**: 신규 앨범 등록 시 해당 앨범 정보를 단일 분석하여 기존 무드보드 캐시에 동적으로 끼워 넣습니다.
3.  **`/api/album-mood-groups`**: 전체 앨범 라이브러리를 9가지 무드 기준(Warm, Cool, Dynamic 등)으로 일괄 매핑/캐싱하여 무드보드를 만듭니다.
4.  **`/api/mood-recommend`**: 사용자가 입력한 현재 기분, 날씨, 시간대를 감안하여 맞춤형 앨범과 매칭 오디오 기기를 선별하여 제안합니다.
5.  **`/api/analyze-music-taste`**: 사용자가 수집한 앨범들의 장르, 국가, 연대 분포를 바탕으로 사용자의 음악적 성향과 취향을 종합적으로 분석합니다.
6.  **`/api/artist-bio`**: 위키피디아 정보를 바탕으로 아티스트의 생애와 업적을 국문으로 보기 좋게 정리하여 제공합니다.
7.  **`/api/headfi-recommended-genres`**: 신규 오디오 장비 등록 시 해당 장비의 응답 성향과 하드웨어 스펙에 적합한 추천 음악 장르 태그를 분석합니다.
8.  **`/api/headfi-album-recommend`**: 기기의 성향 분석 정보(`ai_sound_analysis`)를 감안하여 해당 기기와 최적의 궁합을 보여줄 보유 앨범 3선과 그 이유를 제안합니다.
9.  **`/api/headfi-sound-analysis`**: 기기의 18개 사운드 점수를 바탕으로 전반적인 소리 성향, 밸런스, 타 오디오 커뮤니티의 평가 톤앤매너를 수집하여 텍스트로 풀어냅니다.
10. **`/api/headfi-fr-interpret`**: 업로드된 주파수 응답(FR) 그래프 이미지 파일 또는 외부 이미지 주소를 **Gemini Vision**으로 스캔하여 대역별(저/중/고역) 특성을 수치 및 텍스트로 리포트합니다.
11. **`/api/headfi-position`**: 기기의 사운드 특성을 추출하여 포지션 맵 좌표 평면 상에 정교하게 매핑하기 위한 X, Y 축 좌표 수치(`-100 ~ +100`)를 산출합니다.
12. **`/api/headfi-match-score`**: 특정 DAC/AMP × 헤드폰 조합의 드라이브 전력 여유도, 음색적 상보성, 입체감 등을 다각도로 채점하여 300점 만점의 점수를 계산합니다.
13. **`/api/analyze-lyrics-vibe`**: 노랫말의 문맥과 감정선을 분석해 이를 감각적으로 시각화할 수 있는 **그라디언트 HEX 코드 2종** 및 **이모지**를 산출합니다.
14. **`/api/monthly-review-comment`**: 아카이브 월별 청취 내역 및 라이브러리 데이터를 종합해 사용자의 해당 월 오디오 활동 성향을 위트 있고 심도 있게 피드백해 줍니다.

---

## 6. 인증 및 세션 아키텍처

myaudio는 안정적인 SSR과 비로그인 게스트의 원활한 조회 경험을 보장하기 위해 다음과 같은 하이브리드 Auth 구조를 취합니다.

*   **Supabase SSR Client**: `src/lib/supabase/server.ts`의 `createClient()`는 요청/응답 쿠키를 관리하여 Next.js 서버 컴포넌트 환경에서도 인증 상태를 지속적으로 파악합니다.
*   **미들웨어 & 세션 프록시**: `src/middleware.ts`와 `src/proxy.ts`는 사용자 브라우저 요청에 따라 Supabase Auth 토큰 쿠키 세션을 주기적으로 갱신하여 세션 만료로 인한 UI 튕김 현상을 방지합니다.
*   **접근 권한 위계**:
    *   **비로그인 (Guest)**: 대시보드 조회, Albums / Artists / Head-fi / Lyrics의 기본 목록 필터 검색 및 상세 모달 조회 권한 제공 (읽기 전용)
    *   **로그인 (Owner)**: 신규 아이템 등록/수정/삭제, 청취 이력 입력, AI 분석 생성 및 재생성, 아카이브 메뉴 접근, 소비 통계 열람 권한 제공 (쓰기/편집 권한)
    *   **Server Actions 보호**: 모든 쓰기/수정/삭제 비즈니스 로직(Server Actions)의 최상단에서 서버 세션(`getCurrentUser()`)을 재검증하여 비로그인 사용자의 우회 입력을 API 수준에서 차단합니다.

---

## 7. 개발 및 실행 가이드

### 7.1. 로컬 환경 변수 설정 (`.env.local`)
프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 아래 키를 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
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
