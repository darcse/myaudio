# Catalog 탭 이동 로딩 조사 (T-033)

조사일: 2026-11-16  
범위: Pop & Rock·Classic의 앨범 ↔ 아티스트(연주자/지휘자·원작곡가) 탭 이동. **앱 코드 미수정.**

## 요약

탭을 바꿀 때마다 **서로 다른 라우트 페이지가 마운트**되고, 각 Content가 클라이언트에서 **`album` 전체(`select('*')`)를 다시 조회**한다. 앨범·아티스트 화면은 같은 데이터를 공유하지 않으며, Classic도 **전 장르 앨범을 받은 뒤** `filterAlbumsByScope`로 버린다. T-027은 이 중복 조회 패턴을 새로 만들지는 않았고(이전에도 `/albums`↔`/artists`는 분리 라우트), **탭을 자주 쓰게 만들고 scope 필터를 클라이언트에 얹은 것**이 체감 병목을 키운다.

---

## 1. 라우트·마운트 경계

| 이동 | URL | 컴포넌트 | 마운트/조회 |
|------|-----|----------|-------------|
| Pop 앨범 → 아티스트 | `/albums` → `/artists` | `AlbumsLibraryContent` → `ArtistsLibraryContent` | **전체 언마운트·재마운트**, `fetchLibrary` 재실행 |
| Classic 앨범 → 연주자 | `/classic/albums` → `/classic/artists` | 동일 패턴 | **전체 재마운트·재조회** |
| Classic 연주자 ↔ 원작곡가 | `/classic/artists` ↔ `?role=composer` | **같은** `ArtistsLibraryContent` | 라우트 세그먼트 동일 → **앨범 재조회 없음** (`role`만 변경, `useMemo`로 요약 재계산) |

근거:

- `src/app/albums/page.tsx`, `src/app/artists/page.tsx`, `src/app/classic/albums/page.tsx`, `src/app/classic/artists/page.tsx` — 각각 `Suspense` + Content만 렌더. **공통 `layout.tsx` 없음**(루트 `src/app/layout.tsx` + `AppShell`만 공유).
- `AppShell`(`src/components/AppShell.tsx`)은 Navigation/플레이어만 유지하고 `children`은 페이지마다 교체.
- `CatalogTabBar`는 `Link`로 위 경로를 오간다(`src/components/CatalogTabBar.tsx`).

서버 컴포넌트: 페이지는 거의 패스스루(아티스트 Popular만 composer → classic redirect). **데이터 로딩은 전부 클라이언트 `useEffect`.**

---

## 2. 마운트 시 Supabase 조회

### AlbumsLibraryContent (`fetchLibrary`)

파일: `src/app/albums/_components/AlbumsLibraryContent.tsx` ~149–177행

| # | 테이블 | select | 조건/정렬 | 병렬 |
|---|--------|--------|-----------|------|
| 1 | `album` | `*` | 일반: `order(created_at desc)` / 레코드선반: owns_* OR | `Promise.all` |
| 2 | `artists` | `artist_name, name_alt` | 전체 | 위와 병렬 |

이후:

- `filterAlbumsByScope(library, catalogScope)` — **이미 받은 전체 행**을 클라이언트에서 필터 (`~88–91`).
- `isLoading === true`인 동안 목록 대신 스피너(`~628–637`).

부가(마운트 직후·상세 열 때, 첫 페인트 필수는 아님): `headfi` 소유 기기, 상세 시 headfi/album 단건 등.

### ArtistsLibraryContent (`fetchLibrary`)

파일: `src/app/artists/_components/ArtistsLibraryContent.tsx` ~314–357행

| # | 테이블 | select | 조건/정렬 | 병렬 |
|---|--------|--------|-----------|------|
| 1 | `album` | `*` | `order(release_date desc)` | `Promise.all` 3개 |
| 2 | `album_listen_history` | `album_id, listened_at` | 전체 | 동시 |
| 3 | `artists` | `artist_name, profile_image_url, name_alt` | 전체 | 동시 |

이후(동기·마운트 후):

- `filterAlbumsByScope` → `buildArtistSummaries` / `buildComposerSummaries` (`utils.ts` 76–161행, `useMemo` ~205–218).
- `isLoading`이면 “로딩 중...”만 표시(`~952`).
- 선택 아티스트 확정 후 `ensureArtistRecord` — `artists` **단건 select(+없으면 insert)** (`ensureArtistRecord.ts` 4–34행). 첫 화면 차단은 아니지만 상세 준비에 추가 RTT.

### `album *` 페이로드 성격

`Album` 타입(`src/app/albums/types.ts`) 기준 목록에 불필요한 대용량 후보: `youtube_tracks`, `album_intro`, `cover_image_url`, `composers` jsonb, `dominant_colors`, AI 추천 필드 등. **탭 전환마다 이 전체 행이 왕복한다.**

---

## 3. 탭 이동 때 다시 실행되는 것

| 요소 | 앨범↔아티스트(다른 path) | Classic 연주자↔원작곡가(같은 path) |
|------|---------------------------|-------------------------------------|
| Next 페이지 RSC/Suspense fallback | 예(짧게) | 검색 파라미터만 변경 시 페이지 유지 |
| Content 마운트 | 예 | 아니오 |
| `album`/`artists`/`listen_history` fetch | **예(전부)** | **아니오** |
| `filterAlbumsByScope` | 예 | albums 변경 없으면 캐시된 useMemo |
| `buildArtistSummaries` / `buildComposerSummaries` | 예(아티스트 쪽) | **role 변경 시 예** |
| `ensureArtistRecord` | 선택자 바뀌면 예 | 선택자 바뀌면 예 |
| 공유 캐시 | **없음** | 동일 인스턴스 state 유지 |

직렬/병렬: 초기 라이브러리 fetch는 화면 내부에서 병렬. **두 화면 간에는 직렬**(A 언마운트 → B 마운트 → B fetch). 캐시 히트 없음.

---

## 4. 중복 조회·느린 원인 (코드 근거)

1. **중복 `album.select('*')`**  
   Albums `~155–162`, Artists `~318–319`. 동일 사용자 라이브러리를 탭마다 재다운로드.

2. **라우트 분리 + 클라이언트 전용 로딩**  
   공유 layout/context 없음 → 상태가 라우트와 함께 사라짐.

3. **Classic도 전량 다운로드 후 필터**  
   `filterAlbumsByScope` (`src/lib/catalogScope.ts` 10–23)는 클라이언트 전용. Supabase 쿼리에 `genre1` 조건 없음.

4. **첫 페인트 차단**  
   양쪽 모두 fetch 완료 전 `isLoading`으로 본문 미표시. 스켈레톤/캐시 하이드레이션 없음.

5. **아티스트 추가 비용**  
   listen_history 전체 + O(n) 요약 집계 + (선택 시) `ensureArtistRecord`.

6. **이미지**  
   목록/커버는 데이터 도착 후 로드. 초기 “로딩이 길다” 체감의 주원인은 **네트워크+JSON 파싱+isLoading 게이트**로 보는 것이 타당. 이미지 자체는 게이트 이후.

---

## 5. T-027(CLASSIC-001) 전후

커밋 `66f4fcf` (261116_1340).

| 항목 | 이전 | 이후 |
|------|------|------|
| `/albums`↔`/artists` 분리 라우트·각자 `album *` | 이미 동일 | 동일 |
| Artists `Promise.all`(album+history+artists) | 이미 동일 | 동일 |
| `CatalogTabBar`로 앨범↔아티스트 상시 이동 | 없음(내비 분리) | **이동 빈도↑ → 재조회 체감↑** |
| `filterAlbumsByScope` | 없음 | **전량 fetch 후 버림** |
| 잘못된 메뉴 deep-link | — | `buildArtistSummaries` 등을 **반대 scope에 한 번 더** 돌릴 수 있음 (`ArtistsLibraryContent` ~272–294) |

결론: **근본 병목(탭마다 full album refetch)은 T-027 이전부터 있었고**, Classic 분리 후 탭 UX가 그 비용을 더 자주 드러낸다. scope 필터는 다운로드 양을 줄이지 못한다.

---

## 6. 개선안 비교

| 안 | 내용 | 효과 | 구현 크기 | 위험 | 비고 |
|----|------|------|-----------|------|------|
| **A. 클라이언트 공유 캐시** | SWR/React Query 또는 모듈 싱글톤으로 `album`(+artists meta) 키 공유. 탭 이동 시 stale-while-revalidate | **큼** — 두 번째 탭은 즉시/수 ms | 중 | 중 — 무효화(저장·삭제) 규칙 필요 | 현 클라이언트 fetch 구조와 가장 잘 맞음 |
| **B. 쿼리 축소 + 서버 scope** | 목록용 컬럼만 select; Classic/Popular에 `genre1` eq/neq 필터 | **중~큼** — 페이로드·파싱↓ | 소~중 | 낮음 — 상세/폼은 단건 `*` 유지 | A와 병행 가능 |
| **C. 라우트 그룹 레이아웃에서 1회 로드** | `(catalog)/layout`이 데이터 Provider | 큼 | **큼** — 구조 개편, RSC vs 클라이언트 선택 | 중~높음 | A의 “상위 공유”를 라우트로 고정한 형태 |

### 추천

**1순위: A + B를 한 작업으로.**  
탭 이동 체감은 A가 즉시 줄이고, B는 첫 방문·콜드 로드와 Classic 불필요 행을 줄인다. C는 A가 안정된 뒤 필요 시에만.

비추천(당장): Soft navigate / parallel routes keep-alive — Next App Router에서 비용 대비 복잡.

Classic 연주자↔원작곡가만 느리다면 네트워크가 아니라 `buildComposerSummaries`·필터 리셋·`ensureArtistRecord`를 프로파일링하면 된다(앨범 refetch는 없음).

---

## 7. 참고 파일

| 파일 | 역할 |
|------|------|
| `src/app/albums/_components/AlbumsLibraryContent.tsx` | 앨범 fetch·scope·로딩 UI |
| `src/app/artists/_components/ArtistsLibraryContent.tsx` | 아티스트 fetch·요약·ensureArtist |
| `src/lib/catalogScope.ts` | `filterAlbumsByScope` |
| `src/app/artists/utils.ts` | `buildArtistSummaries` / `buildComposerSummaries` |
| `src/components/CatalogTabBar.tsx` | 탭 Link |
| `src/components/AppShell.tsx` | 공통 셸(데이터 공유 없음) |
| `src/app/{albums,artists,classic/albums,classic/artists}/page.tsx` | 페이지 경계 |
