# 코드 품질 진단 리포트 (2026-06-12)

코드 수정 없음 — 진단 전용. 검토 범위: src/app, src/components, src/lib, src/contexts, src/hooks.

---

## 1. CLAUDE.md 규칙 위반

### any 타입 사용
- 위반 없음. `: any`, `as any`, `any[]` 검색 결과 0건. ✅

### 컴포넌트 default export
- 위반 없음. default export는 Next.js가 요구하는 page.tsx / layout.tsx 9개 파일에만 존재하며, 일반 컴포넌트는 모두 named export. ✅

### 불필요한 'use client'
| 파일 | 이슈 | 심각도 |
|---|---|---|
| src/app/albums/page.tsx | 페이지 본체가 Suspense + 클라이언트 컴포넌트 래핑만 하는데 `'use client'` 선언. Suspense 래핑은 서버 컴포넌트에서도 가능 | 낮음 |
| src/app/headfi/page.tsx | 동일 패턴 | 낮음 |
| src/app/lyrics/page.tsx | 동일 패턴 | 낮음 |
| src/app/headfi/match/page.tsx | 동일 패턴 추정 (같은 구조) | 낮음 |

권장: 페이지 파일에서 `'use client'` 제거하고 서버 컴포넌트로 유지. 실제 클라이언트 로직은 이미 _components 하위에 분리되어 있어 제거만으로 충분할 가능성 높음 (제거 후 빌드 확인 필요).

---

## 2. 구조적 이슈

### 300줄 이상 거대 컴포넌트 (총 9개)
| 파일 | 줄 수 | 심각도 |
|---|---|---|
| src/app/albums/_components/AlbumsLibraryContent.tsx | 741 | 높음 |
| src/app/albums/_components/AlbumDetailModal.tsx | 704 | 높음 |
| src/app/headfi/_components/HeadfiDetailModal.tsx | 625 | 높음 |
| src/app/archive/[year]/[month]/_components/MonthlyTimeline.tsx | 559 | 중간 |
| src/app/lyrics/_components/LyricsLibraryContent.tsx | 558 | 중간 |
| src/app/headfi/_components/HeadfiLibraryContent.tsx | 511 | 중간 |
| src/app/headfi/_components/HeadfiForm.tsx | 487 | 중간 |
| src/app/_components/DashboardContent.tsx | 462 | 중간 |
| src/app/albums/_components/AlbumList.tsx | 420 | 중간 |

권장: *LibraryContent 계열은 필터/정렬 상태 로직을 커스텀 훅으로, 모달 계열은 섹션별 하위 컴포넌트로 분리. 단, "요청받지 않은 리팩터링 금지" 규칙상 별도 feature 작업으로 승인 후 진행.

### 중복 코드
| 위치 | 이슈 | 심각도 |
|---|---|---|
| src/lib/headfiAlbumMatch.ts:55 / src/lib/headfiMatchScore.ts:35 | `parseFrInterpretationSummary` 함수가 두 파일에 동일 구현으로 중복 정의 | 중간 |
| src/lib/headfiAlbumMatch.ts 외 | `[...arr].sort(() => Math.random() - 0.5)` 셔플 패턴 반복 (3회). 또한 이 방식은 통계적으로 편향된 셔플 | 낮음 |
| albums/headfi/lyrics *LibraryContent.tsx | 검색/필터/뷰모드 상태 관리 패턴이 3개 도메인에서 유사하게 반복 | 낮음 |

권장: parseFrInterpretationSummary는 한쪽 lib으로 통합 후 다른 쪽에서 import. 셔플은 Fisher-Yates 헬퍼 1개로 통합.

### 미사용 코드
- grep 수준에서 명백한 미사용 파일/export는 발견되지 않음. 정밀 확인은 빌드(tsc) 결과로 판단 권장 (규칙상 lint 직접 실행 금지).
- Codex-progress.txt (루트, 99B): 사용처 불명 — 잔여 파일 여부 확인 필요. (낮음)

---

## 3. Supabase / RLS

- **리포지토리에 SQL 마이그레이션 파일이 없음** → 4개 정책(SELECT/INSERT/UPDATE/DELETE) 누락 여부를 코드만으로 검증 불가. Supabase 대시보드에서 테이블별 정책 수동 확인 필요. (심각도: 확인 필요)
- 권장: 향후 정책을 `supabase/migrations/*.sql`로 버전 관리하면 코드 리뷰로 검증 가능.
- **user_id 하드코딩**: 위반 없음. user_id 직접 문자열 대입 패턴 검색 결과 0건. ✅

---

## 4. AI API 호출 / 외부 fetch

### 양호한 부분 ✅
- src/lib/gemini.ts: `withRetry` 헬퍼 존재(429 retry-delay 파싱 포함), 모든 generateContent 호출이 try/catch로 보호됨, 마크다운 코드블록(` ```json `) 제거 처리도 존재.
- src/app/api/ 12개 라우트 전부 try/catch 존재.
- src/lib/weather.ts, src/lib/headfi-fr-remote.ts: try/catch + `res.ok` 체크 존재.

### 이슈
| 파일 | 이슈 | 심각도 |
|---|---|---|
| src/app/albums/actions.ts:54,73 (`searchMusicBrainz`) | 외부 API fetch 2건이 try/catch 없음. `res.ok` 실패 시 throw만 하고, 네트워크 오류·`.json()` 파싱 실패 시 서버 액션이 unhandled rejection으로 종료 — "모든 API 호출은 try/catch" 규칙 위반 | 높음 |
| src/app/albums/actions.ts:50 | User-Agent에 `contact@example.com` 더미 이메일 하드코딩. MusicBrainz는 유효 연락처를 요구 — 차단 위험 | 낮음 |

권장: searchMusicBrainz 전체를 try/catch로 감싸고 사용자 노출용 에러 메시지 반환(throw 대신 `{ error }` 형태 또는 호출측 catch 보장). 연락처는 실제 값 또는 env로 이동.

---

## 요약

| 구분 | 건수 |
|---|---|
| 높음 | 3 (거대 컴포넌트 2 + actions.ts try/catch 누락 1) |
| 중간 | 8 |
| 낮음 | 8 |
| 확인 필요 | RLS 정책 (코드로 검증 불가) |

전반적으로 any 금지·named export·user_id·Gemini 호출 규칙은 잘 지켜지고 있음. 최우선 수정 대상은 **albums/actions.ts의 searchMusicBrainz try/catch 누락**이며, 그 외는 별도 승인 후 리팩터링 feature로 진행 권장.

---

# BUG-001~004 검수 결과 (2026-06-12)

## BUG-001 — searchMusicBrainz try/catch ✅ 통과
- 외곽 try/catch + fetch별 개별 catch(네트워크 오류 한글 메시지), `.json()` 파싱 실패 처리, `release-groups` 배열 형식 검증까지 모두 적용됨.
- User-Agent 이메일은 `MUSICBRAINZ_CONTACT_EMAIL` env로 이동 ✓. 단, .env.local 값이 여전히 `contact@example.com` 더미 — **실제 연락처로 교체 필요** (코드 이슈 아님, 설정 이슈).

## BUG-002 — 'use client' 제거 ✅ 통과
- albums / headfi / lyrics / headfi/match 4개 page.tsx 모두 제거 확인.
- 하위 클라이언트 컴포넌트(*LibraryContent, HeadfiMatchContent)에 'use client' 유지 확인 → 인터랙션 경로 보존.
- npm run build 통과 (albums/headfi/lyrics/match가 Static ○ 으로 전환됨 — 의도된 개선).

## BUG-003 — 중복 제거 + Fisher-Yates ✅ 통과
- parseFrInterpretationSummary: headfiAlbumMatch.ts 단일 정의, headfiMatchScore.ts는 import + re-export (기존 호출처 호환 유지). 중복 제거 확인.
- src/lib/utils.ts의 shuffleArray: 표준 Fisher-Yates(뒤→앞, `j ∈ [0, i]`) 구현 정확. 원본 불변(`[...items]`) 보장.
- 기존 `sort(() => Math.random() - 0.5)` 패턴 4곳 모두 교체 확인.

## BUG-004 — 거대 컴포넌트 분리 ✅ 통과
- AlbumDetailModal 704→153줄, HeadfiDetailModal 625→111줄. 섹션 컴포넌트 8개 + albumDetailMoodMiniCard 분리, 모두 300줄 미만 (최대 216줄).
- AlbumsLibraryContent: useAlbumFilters 훅(102줄) 분리 확인. 단, 본체가 741→690줄로 여전히 300줄 초과 — 명세된 step(훅 분리)은 충족했으나 추가 분리 여지 있음 (후속 feature 권장).
- props 전달: 두 모달 모두 섹션 import/렌더링 및 props 배선 확인, 누락 없음. npm run build 통과.

## 비고
- feature_list/BUG.json 구조가 `[obj, [obj, obj, obj]]` 중첩 배열로 비정상 — 평탄화 권장 (이번에는 passes 값만 변경).
- 클라이언트 인터랙션(필터/모달)은 정적 검증(빌드 + 디렉티브/props 확인)까지 완료. 규칙상 Playwright 금지이므로 최종 브라우저 수동 확인 1회 권장.

---

# myaudio 코드 검수 결과 (ALBUM-012~014, GEAR-014, 매칭맵 sticky) — 2026-06-12

정적 검수 + `npm run build`(통과, 29p 생성, 경고 7건). 브라우저 인터랙션은 Playwright 금지 규칙상 수동 확인 권장. 코드 수정 없음.

## 심각도 분류
- 🔴 높음: 버그 가능성 또는 즉시 수정 필요
- 🟡 중간: 품질 개선 권장
- 🟢 낮음: 선택적 개선

## 파일별 이슈

### src/app/albums/stats/_components/AlbumStatsContent.tsx (724줄)
- 🟡 **단일 컴포넌트 책임 과다**: 데이터 fetch + 랭킹 탭 + 추이 탭 위임 + 금주 핫앨범 + 앨범 CRUD(저장/삭제/소개갱신/이미지업로드/편집) + 아티스트 모달 + 앨범 폼을 모두 보유. 통계 페이지가 앨범 라이브러리의 편집 기능까지 흡수함.
- 🟡 **앨범 CRUD 로직 중복**: `handleAlbumSave`/`handleDeleteFromModal`/`handleRefreshAlbumIntro`/`handleAlbumImageUpload`가 AlbumsLibraryContent.tsx의 동명 핸들러와 거의 동일. → 공용 훅(예: `useAlbumModalActions`)으로 추출 권장.
- 🟢 `now` 상태가 60초 tick마다 갱신되어 `weeklyHotAlbums`/`weekRange` useMemo 및 전체 리렌더 유발. 금주 집계 경계 갱신 목적이나, 분 단위 리렌더는 과함 — 시각 표시가 없다면 tick 주기 완화 가능.

### src/app/headfi/map/_components/PositionMapTab.tsx (992줄)
- 🟡 **코드베이스 최대 파일**: SVG 렌더 + 클러스터링 + 툴팁 + 기기선택 팝오버(GEAR-014) + 좌표 자동생성 + 삭제가 한 컴포넌트에 누적. 렌더 로직(SVG)·클러스터 계산·팝오버를 하위 컴포넌트/훅으로 분리 권장.
- 🟢 SVG+CSS 변수 기반 차트로 Recharts 미사용 — CONVENTIONS.md 다크모드 규칙 준수 ✅.

### src/app/headfi/_components/HeadfiForm.tsx (799줄) / HeadfiLibraryContent.tsx (699줄) / src/app/artists/_components/ArtistsLibraryContent.tsx (671줄)
- 🟡 300줄 기준 대폭 초과. 특히 HeadfiForm은 카테고리별 필드 분기(스피커/DAC·AMP/DAP)가 인라인으로 누적 — 카테고리별 서브 폼 컴포넌트 분리 여지.

### exhaustive-deps 경고 (빌드 warning 6건)
- 🟡 다음 useEffect 의존성 배열 누락. 모달 open-once 목적의 의도적 생략일 가능성이 높으나, 각각 사유 주석(eslint-disable + 이유) 또는 의존성 포함으로 명시 권장:
  - src/app/_components/DashboardContent.tsx:285 (`viewingHeadfi`)
  - src/app/_components/DashboardTodayAlbumCard.tsx:84 (`resultAlbum`)
  - src/app/albums/_components/AlbumLotteryModal.tsx:106 (`resultAlbum`)
  - src/app/archive/[year]/[month]/_components/MonthlyTimeline.tsx:205 (`viewingHeadfi`)
  - src/app/artists/_components/ArtistProfileImage.tsx:37 (`savedUrl`)
  - src/app/headfi/_components/HeadfiLibraryContent.tsx:268 (`viewingItem`)

### src/app/artists/_components/ArtistDetailPanel.tsx:1
- 🟢 **죽은 코드**: 최상단 `/* eslint-disable @next/next/no-img-element */` 지시문이 미사용(빌드 경고 "Unused eslint-disable directive"). 파일 내 `<img>` 제거(ArtistProfileImage 컴포넌트로 대체) 후 남은 잔재 — 삭제 권장.

### src/app/headfi/spendingStats.ts
- 🟢 null 처리 우수(`safeAmount`, `?? 0` 이중 가드) ✅. 다만 `total`은 모든 항목의 price+cable+eartip+accessory 합계인데, `byCategory`는 `price`만·`byAccessory`는 특정 카테고리만 집계. '스피커' 등 액세서리 분기가 없는 카테고리의 부가 비용은 total에만 잡히고 세부 표에는 누락 → 합계 불일치 가능(낮음).

### 매칭맵 sticky 리팩터링 (MatchMapTab.tsx, 412줄)
- ✅ **잔재 없음**: 단일 `overflow-auto` + `sticky top-0/left-0` 구조로 정리됨. 이전 시도의 `overflow-y-clip`·`top-14`·죽은 CSS 클래스 없음. 상수(`HEATMAP_SCROLL_MAX_HEIGHT`/`SCORE_COL_WIDTH`/`ROW_LABEL_COL_WIDTH`) 모두 사용 중. `fetch`에 `.catch()`·`!res.ok` 처리 정상.

## 긍정 확인 사항 ✅
- `any` 타입: albums/stats·artists·headfi/map 전 범위 0건.
- API 라우트 17개 전부 try/catch 보유. 신규 `album-headphone-recommend`·`artist-bio`·`headfi-sound-analysis`·`headfi-album-recommend`·`headfi-match-score` 포함.
- 통계 탭 데이터 fetch **중복 없음**: 부모(AlbumStatsContent)가 `album`·`album_listen_history`를 1회 병렬 조회 후 랭킹/추이 탭에 props 전달. 연/월 필터 변경 시 재조회 없이 useMemo 클라이언트 필터링 → Supabase 과호출 없음 ✅.
- 신규 컬럼(unit, speaker_type1/2, dap_spec, dap_output): types → actions(저장 `.trim() ?? ''` / 조회 `select('*')`) → HeadfiForm(카테고리 분기) → HeadfiInfoSection(카테고리별 표시) 전 경로 배선 확인 ✅.
- 아티스트 라우팅: AlbumInfoSection의 `href="/artists?artist=..."` → ArtistsLibraryContent `useSearchParams().get('artist')` 수신 정상 ✅.
- 유사 아티스트 스코어링(artists/utils.ts): 가중치(genre2=3, genre1=2, type=1, country=1) 합리적, score>0 필터·동점 시 앨범수·이름 정렬 정확 ✅.
- artists 자동 생성(ensureArtistRecord): 조회→없으면 insert→insert 실패 시 재조회 폴백으로 경합 방어. 단, `artists.artist_name` UNIQUE 제약 존재를 전제로 함(코드로 검증 불가 — DB 확인 권장).

## 수정 우선순위
1. **1순위(🟡 구조)**: AlbumStatsContent ↔ AlbumsLibraryContent 앨범 CRUD 중복 → 공용 훅 추출. 유지보수 리스크가 가장 큼.
2. **2순위(🟡 분리)**: PositionMapTab(992) / HeadfiForm(799) 하위 컴포넌트·훅 분리. 별도 리팩터 feature로 승인 후 진행.
3. **3순위(🟢 정리)**: ArtistDetailPanel 죽은 eslint-disable 삭제, exhaustive-deps 6건 사유 주석 명시, spendingStats 스피커 액세서리 집계 갭 검토.

## feature_list 검증 결과
정적 구현 검증 + 빌드 통과 기준. 4개 항목 모두 구현·배선·타입 정상, 이미 `passes: true` 상태로 **변경 없이 유지**.

| 항목 | 구현 파일 | 정적 검증 | passes |
|---|---|---|---|
| ALBUM-012 청취 랭킹 | AlbumStatsContent + albumListenStats(buildAlbum/ArtistListenRankings) | 앨범/아티스트 TOP10, 동점 시 발매일→이름 정렬 확인 | true(유지) |
| ALBUM-013 기간별 청취 추이 | ListenTrendSection/Chart + build{Yearly,Monthly,Weekly}ListenTrend | 연/월/주 단위 분기·0회 표시·CSS 바차트 확인 | true(유지) |
| ALBUM-014 금주의 핫 앨범 | WeeklyHotAlbumsSection + getRollingSevenDayRange/buildWeeklyHotAlbumRankings | 오늘 기준 롤링 7일·TOP5 확인 | true(유지) |
| GEAR-014 포지션맵 기기 선택 팝오버 | PositionMapTab(ListChecks 팝오버·체크박스 필터) | 팝오버·필터 상태관리 배선 확인 | true(유지) |

> ⚠️ 필터 클릭·팝오버 토글·모달 오픈 등 실제 인터랙션은 정적(배선/빌드) 검증까지만 수행. 규칙상 Playwright 금지이므로 브라우저 수동 클릭 확인 1회 권장.
