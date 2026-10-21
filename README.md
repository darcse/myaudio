# 🎧 myaudio — 개인 음악, 실물 음반 및 헤드파이 라이브러리 명세서

myaudio는 개인이 보유하고 감상한 **음악 앨범(Albums), 아티스트(Artists), 가사 번역 노트(Lyrics), RecordShelf(CD/LP/Cassette 실물 음반), 헤드파이 기기(Head-fi), 가사·음원 플레이어(Works), 청취 통계 및 아카이브(Insights)**를 한곳에서 체계적으로 등록, 검색, 분석, 회고하는 프리미엄 개인 오디오 라이브러리 웹 애플리케이션입니다. 

본 애플리케이션은 **MusicBrainz API**를 연동하여 앨범 메타데이터를 자동화하고, **Gemini AI / OpenAI GPT / Anthropic Claude** 다중 AI 프로바이더 모델을 깊이 있게 활용하여 도메인별 AI 해석, 추천 및 시각화(산점도, 매칭 스코어링 등) 기능을 제공합니다.

---

## 1. 기술 스택 (Tech Stack)

*   **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers), React 19, TypeScript 5
*   **Styling**: Tailwind CSS v4, CSS 변수 기반 테마 시스템 (Light / Dark / Auto), Pretendard 폰트
*   **Database & Storage**: Supabase (PostgreSQL, Supabase Auth, Storage, RLS)
    *   *주의: 기존 mylibrary / mybooks 서비스와 동일한 Supabase 인스턴스를 공유하며, myaudio 도메인 테이블만 독립적으로 사용합니다.*
*   **AI Integration (Multi-Provider Architecture)**: 모델명 기본값은 `src/lib/aiModels.ts` 한 곳에서 관리합니다. (OpenAI / Anthropic은 환경변수로 덮어쓸 수 있음)
    *   **Google Gemini**: `gemini-3.5-flash-lite` — 앨범 소개·무드 분류, 기분/앨범 추천, 포지션 라벨, 외부 리뷰 검색 요약(Google Search 연동) 등 (Gemini 13개 기능이 같은 모델 사용)
    *   **OpenAI**: `gpt-5.4-mini` — 기기 조합 매칭 스코어링(Chat Completions), 아티스트 국문 바이오(Responses API + Web Search)
    *   **Anthropic**: Claude Sonnet — 청음 AI 분석, 추천 앨범 해설, FR 그래프 비전 해석, 가사 번역
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
│   │   ├── page.tsx                    # 메인 대시보드 (Stat 바, 최근 청취 7장 캐러셀, 최근 구매 기기, 타임머신)
│   │   ├── globals.css                 # 전역 스타일 및 Tailwind v4 유틸리티 클래스
│   │   ├── login/                      # 로그인 페이지
│   │   ├── albums/                     # 앨범 라이브러리, 음감 다이어리(/diary - 리스트/캘린더 뷰)
│   │   ├── artists/                    # 아티스트 관리 (2단 레이아웃, GPT 바이오, 외부 링크, 아티스트 빠칭코)
│   │   ├── lyrics/                     # 가사 번역 노트 (AI 번역, 원문·발음·번역, 유튜브 연동, 트랙리스트 편집)
│   │   ├── recordshelf/                # CD / LP / Cassette Tape 실물 음반 전용 라이브러리 (리스트/장르보드)
│   │   ├── headfi/                     # 헤드파이 기기 목록, 조합 관리, 매칭(/match), 포지션맵(/map), 판매관리, 액세서리 관리
│   │   ├── works/                      # 가사·음원 라이브러리 및 전역 HTML5 연속 오디오 플레이어
│   │   ├── insights/                   # 청취 통계 및 아카이브 대통합 (랭킹, 추이, 사용통계, 장르통계, 아카이브)
│   │   ├── archive/                    # (레거시 호환) /insights?tab=archive 리다이렉트
│   │   └── api/                        # Gemini / OpenAI / Anthropic AI 연동 및 프록시 API 라우트
│   ├── components/                     # 공통 및 도메인별 UI 컴포넌트
│   │   ├── ui/                         # 아토믹 UI 요소 (버튼, 카드, 모달, 팝오버, 콤보박스 등)
│   │   ├── layout/                     # 헤더, 푸터, 네비게이션(GNB) 등 공통 레이아웃
│   │   └── features/                   # 도메인별 기능 컴포넌트
│   ├── contexts/                       # 전역 가사 플레이어 Context (LyricsPlayerProvider)
│   ├── hooks/                          # 공용 커스텀 훅 (useAlbumMutations, useAlbumFilters, useHeadfiFilters 등)
│   ├── lib/                            # 유틸리티 라이브러리
│   │   ├── supabase/                   # Supabase client / server / middleware 설정
│   │   ├── aiModels.ts                 # AI 모델명 기본값 단일 관리 (OpenAI/Anthropic은 env로 덮어쓰기 가능)
│   │   ├── musicbrainz.ts              # MusicBrainz API 연동 모듈
│   │   ├── gemini.ts                   # Gemini API 헬퍼 및 retry 로직 (검색 근거 URL 반환 포함)
│   │   ├── listenHistoryGear.ts        # 청취 이력 Source / Amp / Receiver / Media 공용 상수·포매터
│   │   ├── headfiSoundScores.ts        # 청음 평점(성능 13 + 성향 4) AI 프롬프트 블록 공용 정의
│   │   ├── headfiPosition.ts           # 포지션 맵 좌표 공식 (유선 HP/IEM)
│   │   ├── headfiReviewSources.ts      # 외부 리뷰 요약 출처 파싱·길이 상한·캐시 판정
│   │   └── timeMachineRecall.server.ts # 대시보드 과거 청취 타임머신 발굴 로직
│   └── proxy.ts                        # 쿠키 기반 세션 갱신 및 토큰 프록시
├── feature_list/                       # 하네스 검증용 JSON 파일군 (SETUP, ALBUM, GEAR, LYRICS, RecordShelf, UX, STATS, BUG 등)
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
| `album` | 앨범 메타데이터 정보 | 제목, 아티스트, 발매일, 장르, 국가, 오디오 태그, 실물 음반 보유 여부(`owns_cd`, `owns_lp`, `owns_cassette`), 앨범 타입(정규/EP/싱글/라이브/리메이크/리믹스 등), AI 소개문, 커버 URL, 수동 무드 재분류 플래그(`mood_manually_set`) 등 |
| `album_listen_history` | 앨범 청취 이력 | 청취 일자, 소감(리뷰), 감상 시 날씨/온도, 매체(`media`), 소스 기기(`source_id`), 앰프 1·2(`dac_amp_id`, `dac_amp2_id`), 리시버(`headphone_id`)를 누적 기록. 구성: Media + Source / Amp 1 + Amp 2 + Receiver |
| `album_mood_groups` | 무드보드 그룹 캐시 | AI가 분류한 앨범들의 무드 그룹(9가지 대표 무드) 분류 데이터를 캐싱 |
| `album_moods` | 사용자 지정 무드 이름 | 사용자가 앨범 무드 관리를 위해 커스텀 정의한 무드 키-벨류 정보 |
| `artists` | 아티스트 메타데이터 | 아티스트명, 보조이름(`name_alt`), 프로필 이미지, 위키피디아 요약, GPT 생성 국문 Bio, 외부 공식 SNS 링크 등을 관리 |
| `headfi` | 오디오 기기 컬렉션 | 브랜드, 모델명, 카테고리(헤드폰/이어폰/무선 헤드폰/무선 이어폰/스피커/DAC/AMP/DAC/AMP/DAP/Source/기타), 상세 스펙, **청음 평가(성능 13개 + 성향 4개)**, AI 청음 분석(`ai_sound_analysis`), FR 그래프 URL 및 FR 해석(`fr_interpretation`), **외부 리뷰 요약(`ai_review_summary`, `ai_review_sources`, `ai_review_fetched_at`)**, 포지션 맵 좌표(`position_x/y/label`), 대표 매칭 콤보(`pairing_combo_id`) 등. 구 액세서리 컬럼(`cable`, `eartip`, `accessory` 및 각 가격)과 구 청음 평점 컬럼 7개(`bass_speed`, `dynamics_slam`, `tone_warmth`, `vocal_position`, `midrange_clarity`, `treble_brightness`, `timbre`)는 레거시로 남겨두며 사용하지 않음 |
| `headfi_combos` | DAC/AMP 기기 조합 컬렉션 | DAC/AMP/DAP 기기들을 묶은 매칭 조합(콤보) 관리 CRUD 및 소프트 삭제(`deleted_at`) 지원 |
| `headfi_accessories` | 액세서리 컬렉션 | 케이블, 이어팁, 무선 액세서리 등 품목 등록/수정/삭제, 보유 상태(`status`: `owned` / `released`), 소비 통계 합산. DAC·AMP·DAC/AMP·DAP·Source·스피커 액세서리는 "기타 케이블" 카테고리로 통합 |
| `headfi_accessory_links` | 기기 ↔ 액세서리 연결 | 기기와 액세서리의 N:M 연결(`headfi_id`, `accessory_id`, UNIQUE 쌍). 기기·액세서리 삭제 시 연결만 CASCADE 삭제 |
| `headfi_sales` | 기기 및 액세서리 판매 관리 | 보유 기기 및 방출 액세서리의 판매 이력(판매일자, 판매금액 등) 통합 관리 |
| `headfi_device_settings` | 리시버-앰프 조합 세팅 | 리시버(헤드폰/이어폰) × DAC/AMP/DAP 조합별 게인(Gain) 설정 및 세팅 메모 관리 |
| `headfi_match_cache` | 기기 조합 매칭 스코어 | 헤드폰/이어폰 × DAC/AMP/DAP 조합(combo_id) 매칭 궁합 점수(`drive`, `synergy`, `genre`) 및 AI 코멘트 캐시 (마스터 콤보 가산점 +20점은 표시 시 계산). 기기 평점 저장 시 해당 기기 캐시 삭제 |
| `monthly_review_comments` | 월별 AI 코멘트 캐시 | 아카이브에서 월별 활동 요약 분석 후 AI가 작성한 월간 종합 코멘트 캐싱 (mybooks와 공용) |
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
    *   **과거 오늘 타임머신 회상 (Time Machine)**: 과거 동일 날짜(1년 전, 2년 전 등)의 청취 기록을 발굴하여 대시보드에 감성적으로 노출 (±3일 윈도우 OR 필터 쿼리 최적화).
    *   **최근 구매 기기 목록**: 구매일 최신순 기기 5개 및 대시보드 보유 기기 3x3 그리드 제공.
*   **슬롯머신 앨범 추천**: 인라인 슬롯머신 애니메이션을 통해 보유 앨범 중 한 장을 무작위로 추첨해 모달로 연동.
*   **GNB 인터랙션 & 테마 토글**: 라이트/다크/자동(System) 모드 지원, 부드러운 상단 스크롤 `BackToTop`, GNB 새로고침 버튼 비동기 스핀 애니메이션(`animate-spin`, `aria-busy`).
*   **인라인 확인 모달 전면 표준화**: 브라우저 기본 `window.confirm` 대화상자로 인한 모달 중첩 오류를 방지하기 위해, 전 도메인(앨범, 헤드파이 기기/액세서리/판매/세팅, 청취 이력, 가사, 포지션맵 등)에서 **커스텀 인라인 확인 UI**로 전면 전환.
*   **PWA(Progressive Web App)**: 모바일/데스크탑 웹 홈 화면 추가 기능(Headphones 아이콘, Manifest 지원).

### 4.2. 앨범 라이브러리 & 다이어리 (Albums)
*   **목록 및 복합 필터**: 장르(Crossover 포함), 국가(한국, 일본, 미국, 영국, 유럽, 중국 등), 연도 구간, 실물 음반 매체 여부, 앨범 타입(정규/EP/싱글/라이브/컴필레이션/OST/리메이크/리믹스), 텍스트 검색, 다중 정렬 지원.
*   **MusicBrainz 및 CAA 연동**: 아티스트 검색 후 앨범 리스트 자동 완성 및 Cover Art Archive 이미지 자동 수집.
*   **3탭 앨범 상세 모달**:
    *   **앨범 정보**: 메타데이터, Wikipedia 요약, AI 생성 소개문 및 태그, 무드보드 바로가기 연동.
    *   **추천 리시버**: 수동 추천 기기 및 AI 추천 리시버(헤드폰+이어폰 확장, 추천 사유 및 새로고침 지원) 노출.
    *   **청취 이력**: 청취 일자, 소감, 날씨/온도, 감상 환경(**Media + Source / Amp 1 + Amp 2 + Receiver**) 기록 및 누적 타임라인.
        *   **Media**: Apple Music, Spotify, YouTube Music, CD, LP, Cassette, FLAC, 기타 (필수).
        *   **Source**: Source·DAP 카테고리 기기에서 선택 (필수).
        *   **Amp 1 / Amp 2**: DAC·AMP·DAC/AMP·기타 카테고리 기기에서 선택 (선택).
        *   **Receiver**: 헤드폰·이어폰·무선 헤드폰·무선 이어폰·스피커 중 선택 (필수).
        *   기기 선택 옵션과 이력 카드에는 **브랜드 없이 모델명만** 표시. 슬롯별 카테고리 규칙은 `src/lib/listenHistoryGear.ts`에서 공용 관리.
        *   이력 카드: 날짜·시간·날씨 / 소감 / 미디어·리시버 배지 / Source / Amp 1 / Amp 2 순으로 배치하며, 카드 안에서 인라인 수정 가능.
*   **무드보드 & 장르보드 & 수동 무드 재분류 (`ALBUM-033`)**: 9가지 무드 분류 및 대표 `genre1` 기준 스택 카드 뷰 제공. AI 자동 분류 외에 사용자가 직접 앨범 무드를 드롭다운으로 변경 가능 (`mood_manually_set` 플래그로 자동분류 덮어쓰기 방지).
*   **음감 다이어리 (`/albums/diary`, `ALBUM-032`)**: 날짜별로 그룹핑된 청취 일지 타임라인 제공. **리스트 뷰**와 **캘린더 카드 뷰** 토글 지원, 청취 이력 인라인 수정 및 삭제 지원. 기기 표기는 브랜드 없이 모델명만 노출.
*   **공용 리시버 콤보박스 (`ALBUM-027`)**: 검색, 최근 사용 기기, 전체보기 지원 콤보박스 UI 적용.

### 4.3. RecordShelf (실물 음반 라이브러리, `/recordshelf`)
*   **CD / LP / 카세트 테이프(Cassette Tape) 실물 음반 컬렉션 단독 관리**: 앨범 폼에서 `CD 보유`, `LP 보유`, `Cassette 보유`(`owns_cassette`)로 체크된 실물 음반들만 별도로 모아보는 전용 라이브러리 메뉴.
*   **다양한 뷰 & 필터**: 리스트뷰(Albums와 동일한 커버 레이아웃) 및 장르보드 뷰 전환, CD/LP/Cassette 매체 구분 태그 표시, 매체 필터(전체/CD/LP/Cassette) 및 발매일 정렬 지원.
*   **상세 모달 연동**: 항목 클릭 시 앨범 상세 모달이 오픈되어 수정·삭제가 즉시 수행되며 배경 스크롤을 자동 잠금 처리.

### 4.4. 아티스트 라이브러리 (Artists)
*   **애플 뮤직 스타일 2단 레이아웃**: 좌측 아티스트 필터링/검색 목록, 우측 상세 아티스트 프로필 정보 구성.
*   **이름2 (`name_alt`) 지원 & 정규화**: 한국어/원어 보조이름 등록 및 NFKC 정규화 비교를 통한 중복 검사, 이름 변경 시 앨범 artist 일괄 갱신 및 기존 아티스트 병합 처리.
*   **OpenAI Web Search 바이오**: 위키피디아와 연동 후 OpenAI Responses API + web_search 기반으로 정갈한 한국어 존대어(~습니다체) 아티스트 바이오를 자동 생성.
*   **외부 브랜드 링크 & 빠칭코 모달**: 5대 플랫폼(Apple Music, Spotify, YouTube, X, Instagram) 브랜드 SVG 인라인 수정, 아티스트 빠칭코 무작위 추천 모달(`ALBUM-021`), 유사 아티스트 가중치 스코어링 지원.

### 4.5. 가사 번역 노트 (Lyrics, `/lyrics`)
*   **AI 트랙 제목 및 가사 번역 (`LYRICSTRANSLATE-001`)**: 가사 등록 시 AI 원클릭 번역을 통해 트랙 제목과 가사 본문을 일괄 번역.
*   **3단 가사 뷰 & 유튜브 연동**: 상단 원문 제목 + 번역 제목 병기, 유튜브 영상 임베드 플레이어, 하단 원문-발음-번역 순차 가사 렌더링.
*   **Lyrics 앨범 안전 제거 (`LYRICS-005`)**: 원본 앨범(`album`) 데이터는 안전하게 보존하면서 가사/트랙리스트 데이터만 깔끔하게 분리·제거.
*   **트랙리스트 인라인 편집 (`LYRICS-006`)**: 트랙명, 순서 번호 수정 및 draft 로컬 반영 후 일괄 저장, 삭제된 트랙의 가사만 선택적 정리.

### 4.6. 헤드파이 라이브러리 & 조합/세팅/판매 (Head-fi)
*   **기기 등록/수정 모달**: 상단에 브랜드, 모델명, 이미지, 카테고리 선택을 두고, 하단은 탭(**기본 정보 / 분석 / 액세서리**)으로 구성. 분석 탭은 헤드폰·이어폰 계열에서만 노출. 데스크톱은 좌우 2패널(약 3:7, 좌측 기본 정보·우측 탭 영역)이고 모바일은 단일 컬럼. 하단 저장 버튼 고정, 모달 오픈 중 배경 스크롤 잠금, 저장 후 스크롤 위치 유지. 카테고리별 유동 스펙 분기(이어폰 단자, 앰프 Vrms Single/BAL, 구동방식/Chipset/Rk 등)는 기존과 동일.
*   **청음 평가 입력 (`GEAR-044`)**: 유선 헤드폰/이어폰의 분석 탭에서 **성능 13개(1~10 정수)**와 **성향 4개(5단계 라디오, -2~+2)**를 입력. 모든 입력은 선택이며 성능 영역에 "n/13 입력" 진행이 표시됨. 성향은 선택을 다시 눌러 해제할 수 있고 미입력(NULL)과 중립(0)은 구분 저장. 점수 기준 안내: 5=같은 가격대 평균, 7=가격대 대비 우수, 9=보유 기기 중 최상위급, 10=들어본 것 중 최고. 구 평점 7개는 폼에서 제거되며 DB 값은 보존. 유선 헤드폰/이어폰 폼과 상세 모달에서 음색 문자열(`temp` 온도 / `bright` 밝기) 입력·표시는 제거했고, AI·매칭·추천은 성향(`trait_warmth`, `trait_brightness`)을 대신 사용한다. DB 컬럼 `temp`/`bright`와 기존 값은 레거시로 보존한다.
*   **기기 매칭 조합 관리 (`headfi_combos`, `GEAR-031`)**: DAC/AMP/DAP 기기들을 묶은 매칭 조합(콤보) 관리 CRUD 및 소프트 삭제(`deleted_at`) 지원.
*   **대표 매칭 콤보 지정 (`pairing_combo_id`, `GEAR-036`)**: 헤드폰/이어폰 등록 시 대표 매칭 조합을 지정하고, 매칭맵에서 일치 시 마스터 궁합 가산점(+20점) 계산/표시 (`GEAR-038`).
*   **액세서리 관리 (`GEAR-039`, `GEAR-041~043`)**: 케이블, 이어팁, 무선 액세서리 등 품목 행 단위 등록/수정/삭제, 보유중(`owned`) / 방출(`released`) 상태 저장 및 필터링, 지출 합산. 카테고리를 바꿔 저장해도 목록에서 사라지지 않고, 저장 후에도 현재 카테고리 필터를 유지. 기타 케이블 카테고리는 DAC·AMP·DAC/AMP·DAP·Source·스피커 액세서리를 통합한 것.
*   **기기 ↔ 액세서리 연결 (`headfi_accessory_links`)**: 기기 모달의 액세서리 탭에서 독립 액세서리를 연결(N:M). 선택 목록은 `제품명 | 가격`, 다른 기기에 이미 연결된 경우 해당 기기(모델명만)와 방출 여부를 함께 표시. 기기 가격 합산에는 액세서리 가격을 섞지 않으며, 구 액세서리 컬럼은 읽지 않음.
*   **판매 관리 시스템 (`GEAR-040`, `headfi_sales`)**: 기기뿐만 아니라 방출된 액세서리까지 판매 이력(판매일, 판매가 등) 통합 관리 및 카테고리 필터 지원.
*   **4탭 헤드파이 상세 모달**: 기본 정보 / 청음 평가 / 추천 앨범 / 세팅.
    *   **기본 정보**: 상세 스펙, 블러 배경 헤더.
    *   **청음 평가 (세그먼트: 청음 평가 / FR 그래프 / 외부 리뷰 / AI 분석, `GEAR-045`, `GEAR-047`)**:
        *   **청음 평가**: 성능 13축 레이더(13개를 모두 입력해야 표시, 미입력 시 "성능 n/13 입력 시 레이더가 표시됩니다" 안내, 7점 우수선), 그룹별 평균(저역/중역/고역/기술·공간/종합, 입력된 항목만 평균 + "n개 평가", 총점 없음), 성향 4줄(점 표시, 미입력은 "—", 0과 구분) 및 태그 요약.
        *   **FR 그래프**: 이미지 Upload/URL 입력 프록시 우회 및 이미지 비전 스캔을 통한 대역별 밸런스 리포트(`fr_interpretation`).
        *   **외부 리뷰**: Gemini 검색으로 기기 외부 리뷰를 요약해 저장(`ai_review_summary`, 출처 `ai_review_sources`, 수집 시각). 요약이 있으면 재검색하지 않고, 갱신은 "리뷰 갱신" 버튼으로만 수행. 모델명이 정확히 일치하는 리뷰만 사용하며 요약 길이 상한 적용. 출처는 저장만 하고 화면에는 표시하지 않음.
        *   **AI 분석**: Anthropic Claude가 기기 스펙(확정 사실) + 성능/성향 평가 + FR 해석(있을 때) + 외부 리뷰 요약(있을 때)을 종합해 음색·밸런스·잘 맞는 음악을 서술. 리뷰·FR이 없으면 해당 블록을 생략하고 점수 기준으로만 서술. 외부 리뷰와 청음 평가가 다르면 차이로 명시하고, 스펙과 충돌하면 스펙을 우선. 리뷰 요약이 비어 있으면 분석 전에 리뷰 수집을 먼저 실행(별도 두 요청).
    *   **추천 앨범**: Anthropic Claude / AI 추천 앨범 3선(추천 사유 포함) 및 수동 매칭 앨범 노출.
*   **헤드파이 목록 카드**: 매칭 정보는 카드에 표시하지 않음.
*   **리시버 게인 세팅 탭 (`GEAR-028`)**: 헤드폰/이어폰 × DAC/AMP/DAP 조합별 게인(Gain) 설정/메모 CRUD.

### 4.7. 매칭 및 포지션 맵 (Match & Position Map)
*   **기기 조합 매칭 추천 (`/headfi/match`)**: DAC/AMP/DAP 조합(콤보) × 유선 헤드폰/이어폰 선택 시 궁합 앨범 5개 제안.
*   **기기 궁합 매칭 맵 (Matrix, `/headfi/match`)**: 헤드폰(행) × 활성 콤보(열) 2차원 궁합 점수(300점 만점) 및 캐시/실시간 분석 표도식화, 마스터 콤보 가산점(+20점) breakdown 표시, 셀 상세 모달 인라인 재분석. 후보 헤드폰의 청음 평가(저/중/고 밴드 요약, 성향 4개, Musicality)가 synergy 판단의 힌트로 AI에 전달됨. 미입력 값은 "-"로 전달.
*   **포지션 맵 (`/headfi/map`, `GEAR-046`)**: Warm ↔ Cool / Musical ↔ Technical X·Y축 도식화, 클러스터링 팝오버, 산점도 기기 다중 선택 필터. **유선 헤드폰/이어폰 좌표는 AI가 아니라 공식으로 계산**: X는 `trait_warmth`와 `trait_brightness`, Y는 해상도·분리도·정위감 평균 대비 Musicality. 필요한 6개 값 중 하나라도 비어 있으면 계산하지 않고 기존 좌표를 유지. AI(Gemini)는 라벨 문구만 생성. DAC/AMP 좌표는 출력 스펙 기반으로 기존 방식 유지.
*   **기분 추천**: 헤드폰 후보의 온도/밝기에 `trait_warmth`/`trait_brightness`를 사용.

### 4.8. 가사 및 전역 플레이어 (Works, `/works`)
*   **가사 앨범 그리드 & 바이브 분석**: 가사 등록 앨범 탐색, AI 감정선 분석 기반 **그라디언트 HEX 코드 2종 & 이모지** 앨범 카드 비주얼 연동.
*   **전역 연속 오디오 플레이어**: Next.js 페이지 이동 시에도 Context(`LyricsPlayerProvider`)를 통해 **오디오가 중단 없이 연속 재생**되는 HTML5 오디오 플레이어 (반복, 가사 드로어, 즐겨찾기 지원).

### 4.9. 청취 통계 & 아카이브 (Insights, `/insights`, `STATS-001`)
기존 분산되어 있던 앨범 통계, 기기 사용 통계, 연간/월간 아카이브를 5개 탭으로 대통합한 종합 인사이트 대시보드입니다. (구 경로 `/albums/stats`, `/headfi/stats`, `/archive` 자동 리다이렉트 지원)
*   **청취 랭킹 탭 (`ranking`)**: 청취 랭킹 TOP20, 금주의 핫 앨범 TOP5 (오늘 기준 롤링 7일), 최다 청취 기기 TOP20 노출.
*   **청취 추이 탭 (`trend`)**: 기간별(월별/연도별) 청취 횟수 변화를 다이내믹 SVG 그래프로 시각화.
*   **사용 통계 탭 (`usage`, 구 "기기 사용 통계")**: 최다 사용 **구동계**(DAC / AMP / DAC/AMP, DAP 제외) TOP10, 최다 사용 **소스기기** TOP10, 최다 사용 **미디어** TOP10, 리시버(HP/IEM/W-HP/W-IEM) 랭킹 TOP10 및 소비 통계 모달 연동. 연도를 "전체"로 선택하면 TOP20으로 확장. 집계 기준은 청취 이력의 Amp 1 / Source / Media / Receiver 컬럼.
*   **장르 통계 탭 (`genre`, `STATS-002`)**: 연도별/월별 최다 청취 장르(`album.genre1` 기준) 및 최다 청취 아티스트 구분 랭킹 시각화.
*   **아카이브 탭 (`archive`)**: 연도별 월 활동(앨범 청취, 기기 구매, 가사 등록) 집계 카드 및 날짜별 상세 타임라인 스크롤, AI 월간 종합 리뷰 코멘트 제공.

---

## 5. AI API 연동 명세

myaudio는 AI 연동 시 **다중 AI 프로바이더 (Gemini / OpenAI / Anthropic)** 체계를 구축하고, **try/catch 예외 처리, 429 에러 retry 헬퍼, AI 한국어 응답 정규화** 등의 방어코드를 적용하고 있습니다. 모든 호출은 `src/lib` 래퍼로 모이고, 모델명 기본값은 `src/lib/aiModels.ts`에서 관리합니다. 네이티브 JSON 모드는 쓰지 않고, 프롬프트에서 JSON을 요청한 뒤 응답에서 JSON 부분을 추출해 파싱합니다.

### 주요 API Route 및 역할

1.  **`/api/album-intro`**: 앨범 정보를 바탕으로 AI 웹 검색 결합 앨범 영/국문 소개 및 대표 키워드 태그 생성. (Gemini)
2.  **`/api/album-mood-assign`**: 신규 앨범 등록 시 백그라운드 단일 분석으로 무드보드 캐시에 동적 할당. (Gemini)
3.  **`/api/album-mood-groups`**: 전체 앨범 라이브러리를 9가지 무드 기준으로 일괄 매핑 및 캐싱. (Gemini)
4.  **`/api/mood-recommend`**: 사용자 기분, 날씨, 시간대 감안 맞춤형 앨범 및 오디오 기기 제안. 헤드폰 후보의 온도/밝기는 `trait_warmth`/`trait_brightness` 사용. (Gemini)
5.  **`/api/analyze-music-taste`**: 앨범 장르, 국가, 연대 분포 기반 음악적 취향 종합 분석. (Gemini)
6.  **`/api/artist-bio`**: **OpenAI (Responses API + web_search)**를 활용해 위키피디아 기반 정갈한 한국어 아티스트 생애/업적 바이오 작성.
7.  **`/api/headfi-recommended-genres`**: 신규 오디오 장비 등록 시 스펙 적합 추천 음악 장르 태그 분석. (Gemini, 검색)
8.  **`/api/headfi-album-recommend`**: **Anthropic Claude** 기반 기기 성향 대비 최적 궁합 보유 앨범 3선 및 추천 사유 제안. (성능/성향 평가 + FR + AI 분석 사용)
9.  **`/api/headfi-sound-analysis`**: **Anthropic Claude** 기반 청음 AI 분석. 스펙(확정 사실) + 성능 13/성향 4 + FR 해석(있을 때) + 외부 리뷰 요약(있을 때)을 종합. 실패 시 기존 분석을 덮어쓰지 않음.
10. **`/api/headfi-review-summary`**: **Gemini(Google Search 연동)**로 기기 외부 리뷰를 요약해 `ai_review_*` 컬럼에 저장. 요약이 있으면 재검색하지 않고 `force`일 때만 재검색.
11. **`/api/headfi-fr-interpret`**: **Anthropic 비전**으로 FR 그래프 이미지를 스캔하여 저/중/고역 특성 리포트(`fr_interpretation`) 생성.
12. **`/api/headfi-position`**: 포지션 맵 좌표 산출. 유선 헤드폰/이어폰은 공식 좌표 + Gemini 라벨, DAC/AMP는 출력 스펙 기반 AI 추정.
13. **`/api/headfi-match-score`**: **OpenAI(Chat Completions)** 기반 기기 조합(combo_id) × 헤드폰/이어폰 궁합 점수(300점 만점) 산출.
14. **`/api/headfi-album-match`**, **`/api/album-headphone-recommend`**: 콤보 × 앨범 매칭, 앨범 → 헤드폰 추천. (Gemini)
15. **`/api/analyze-lyrics-vibe`**: 노랫말 문맥 분석 기반 **그라디언트 HEX 코드 2종 & 이모지** 산출. (Gemini)
16. **`/api/lyrics-translate`**: 가사 번역. (Anthropic)
17. **`/api/lyrics-tracklist`**: 앨범 트랙리스트 조회. (Gemini, 검색)
18. **`/api/monthly-review-comment`**: 아카이브 월별 청취 내역 및 라이브러리 종합 AI 월간 코멘트 생성. (Gemini)
19. **`/api/headfi`**: 헤드파이 장비 등록 및 변경 사항 처리를 위한 전용 Route Handler.

---

## 6. 인증 및 세션 아키텍처

myaudio는 SSR과 비로그인 게스트의 원활한 조회 경험을 보장하는 하이브리드 Auth 구조를 취합니다.

*   **Supabase SSR Client**: `src/lib/supabase/server.ts`의 `createClient()`는 쿠키 기반으로 서버 컴포넌트 환경 인증 상태 파악.
*   **미들웨어 & 세션 프록시**: `src/middleware.ts`와 `src/proxy.ts`는 Supabase Auth 토큰 쿠키 세션 주기적 갱신 (`/albums`, `/headfi`, `/works`, `/lyrics`, `/archive`, `/insights` 보호 경로 관리).
*   **접근 권한 위계**:
    *   **비로그인 (Guest)**: 대시보드, Albums / Artists / Lyrics / RecordShelf / Head-fi / Works / Insights 기본 목록 검색 및 상세 모달 조회 (읽기 전용).
    *   **로그인 (Owner)**: 신규 아이템 등록/수정/삭제, 청취 이력 작성/수정/삭제, 기기 조합(Combos) 및 액세서리(보유/방출) 관리, 판매 관리, 게인 세팅 CRUD, AI 분석·외부 리뷰 수집 생성 및 아카이브/통계 전체 접근 (쓰기/편집 권한).
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

# (선택) 모델명 덮어쓰기. 설정하면 src/lib/aiModels.ts 기본값보다 우선합니다.
# ANTHROPIC_HEADFI_MODEL=
# ANTHROPIC_LYRICS_TRANSLATE_MODEL=
# OPENAI_ARTIST_BIO_MODEL=
# OPENAI_MATCH_SCORE_MODEL=
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