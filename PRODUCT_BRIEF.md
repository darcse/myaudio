# PRODUCT_BRIEF.md — myaudio

## 1. 앱 목적 및 개요

myaudio는 개인이 보유하거나 감상한 음악 앨범·헤드파이 기기·가사를 한 곳에서 등록·검색·분류·회고하는 개인 라이브러리 앱이다.
MusicBrainz 기반 앨범 메타데이터 자동 완성, Gemini 기반 앨범 소개·무드보드·무드 추천·헤드파이 FR 그래프 해석, 전역 가사 플레이어, 월별 Archive를 제공한다.

배포 URL: https://audio.sshlove.com

---

## 2. 기술 스택

- Framework: Next.js 15 App Router, React 19, TypeScript 5
- 스타일링: Tailwind CSS v4, CSS 변수 기반 라이트/다크/자동 테마, Pretendard
- DB/Auth/Storage: Supabase PostgreSQL, Supabase Auth, @supabase/ssr, Supabase Storage
- 배포: Vercel
- AI: Gemini API (`gemini-3.1-flash-lite-preview`), Gemini Vision (FR 그래프 해석)
- 외부 API: MusicBrainz, Cover Art Archive
- 주요 라이브러리: lucide-react, sonner, react-markdown, recharts

---

## 3. 도메인 범위

| 도메인 | 테이블 | 설명 |
|--------|--------|------|
| Albums | `album`, `album_listen_history`, `album_mood_groups`, `album_moods` | 앨범 컬렉션·무드보드·청취 이력 |
| Head-fi | `headfi` | 헤드파이 기기 컬렉션 |
| Lyrics | `lyrics` | 가사/음원 컬렉션 |
| Archive | `monthly_review_comments` | 앨범/헤드파이/가사 기준 월별 회고 |

---

## 4. 주요 기능

### 공통/UX
- 네비게이션: Albums, Head-fi, Lyrics, Archive, 로그인/로그아웃
- 라이트/다크/자동 테마 토글
- 모바일 햄버거 메뉴
- Sonner 기반 toast
- 홈 대시보드: 헤드파이 통계, 랜덤 앨범 추천, 가사 섹션
- 전역 Lyrics Player: LyricsPlayerProvider, 하단 고정 플레이어, 페이지 이동 후 재생 상태 유지

### 인증
- 이메일/비밀번호 로그인 (Supabase Auth)
- SSR 쿠키 세션 유지
- 비로그인: Albums/Head-fi/Lyrics 읽기 허용, 쓰기 차단
- 로그인 전용: Archive, 청취 이력, 무드보드 캐시 생성

### Albums
- MusicBrainz 2단계 검색으로 폼 자동 완성 (아티스트 → release-group)
- Cover Art Archive 커버 이미지
- 앨범 등록/수정/삭제
- 장르·국가·연도 필터, 텍스트 검색, 페이지네이션
- 상세 모달: 커버, 발매 정보, 오디오 태그, 앨범 소개, 추천/매칭 헤드폰, 청취 이력
- Gemini 기반 앨범 소개문·오디오 태그 생성
- 음악 취향 분석 (`/api/analyze-music-taste`)
- 무드·날씨·시간대 기반 앨범+헤드폰 추천 (`/api/mood-recommend`)
- 수동 추천 헤드폰 최대 3개 지정
- 무드보드: Gemini가 앨범을 무드 그룹으로 분류·캐싱
- 앨범별 청취일+소감 누적 저장

### Head-fi
- 오디오 기기 수동 등록/수정/삭제
- 카테고리·보유상태·타입 필터, 실시간 검색
- 헤드폰/이어폰: 임피던스, 감도, 케이블, 음색 18개 평가 항목
- DAC/AMP: 앰프 타입, 출력 임피던스, 칩셋, Vrms 전용 필드
- 상세 모달: 기본 정보, 스펙, Recharts 레이더 차트, 매칭 앨범
- FR 그래프 이미지 업로드 또는 외부 URL, `/api/headfi-fr-image` 프록시
- Gemini Vision FR 그래프 저음/중음/고음/요약 해석
- Gemini 추천 장르 생성 및 태그 표시
- AI 추천 앨범 사이드 패널

### Lyrics
- 가사 수동 등록/수정/삭제
- 커버 이미지·오디오 파일 업로드 (Supabase Storage)
- 제목/앨범 검색, 페이지네이션
- Gemini 기반 가사 바이브 색상/이모지 분석
- 앨범 단위 그리드, 앨범 상세 곡 목록
- 전역 하단 플레이어: 이전/재생/다음, 진행바, 반복, 가사 보기, 볼륨
- 즐겨찾기 플레이리스트 재생

### Archive
- 연도별 월 카드 그리드 (로그인 전용)
- 앨범 청취·헤드파이 구매·가사 등록 기준 월별 집계
- Gemini 월간 종합 코멘트 캐싱
- 월별 상세 타임라인

---

## 5. 인증 구조

- Supabase Auth 이메일/비밀번호
- 서버: `src/lib/supabase/server.ts` createClient() / getCurrentUser()
- 브라우저: `src/lib/supabase/client.ts` createClient()
- `src/proxy.ts`: 쿠키 기반 세션 갱신
- 등록/수정/삭제 Server Action: getCurrentUser() 없으면 Unauthorized

---

## 6. 공유 DB 참고사항

- mylibrary, mybooks와 동일한 Supabase 인스턴스를 사용한다
- 이 앱에서 접근하는 테이블만 CONVENTIONS.md에 명시되어 있다
- 다른 앱의 테이블(books, comics, photobook 등)은 이 앱에서 접근하지 않는다
- album↔headfi 크로스 참조(매칭 헤드폰, 추천 앨범, 무드 추천)는 이 앱 내에서 허용된다
