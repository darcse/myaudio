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
