# 리팩토링 후보 조사 보고서 (T-117)

- 작성일: 2026-11-25
- 성격: **읽기 전용 조사**. 코드 변경 없음. 이 보고서 1개 파일만 생성.
- 배경: 2026-11-24~25 헤드파이 조합 개편(T-102~T-116)을 짧은 주기로 덧붙여 중복·분기 누적 의심.
- 조사 범위: TASK.json 지정 후보 1~6 + 레포 전체 상위 파일.

> 표준 항목: **위치 / 문제 / 제안 방식 / 효과 / 위험도 / 규모 / 검증 / 선행조건**
> 위험도·규모는 상/중/하, 작/중/대로 표기.

---

## 요약 (상위 5개)

| # | 후보 | 규모 | 위험도 | 한줄 |
|---|------|------|--------|------|
| R1 | `headfiMatchScore.ts` 조합 경로 규칙 블록 중복 | 중 | **상** | 프롬프트 문자열이 여러 벌로 갈라져 유지보수·일관성 위험. 정리 시 문자열 동일성 검증 필수 |
| R2 | 청취 기록 폼 중복(Section ↔ Diary) | 대 | 중 | 두 컴포넌트가 같은 입력 폼 상태·핸들러를 통째로 복제. 공용 훅으로 추출 |
| R4 | 죽은 코드 제거 | 소 | 하 | `buildSourceListenRankings` 미사용, match-score 라우트 배치 분기 도달 불가 |
| R3 | match-score 라우트 단일/배치 분기 정리 | 소~중 | 중 | 배치(후보 20) 경로가 호출되지 않아 라우트 상태공간이 불필요하게 큼 |
| R6 | 초대형 컴포넌트 파일(1,000줄+) | 대 | 중 | AlbumForm·AlbumTrackListContent·ArtistsLibraryContent 등. 분할 후보 |

---

## R1. `headfiMatchScore.ts` 조합 경로 규칙 블록 중복 — 위험도 **상**

**위치**: `src/lib/headfiMatchScore.ts` (약 480줄). 핵심 함수:
- `buildDualChainRoleBlock` (253~277)
- `buildSourceInclusivePathRoleBlock` (299~356)
- `buildSourceDeviceSoloPathRoleBlock` (279~284)
- `buildComboBaseForPrompt` (389~438), `buildComboDisplayName` (358~387)
- 보조: `buildSourceLinkRuleLine`(222~240), `buildDeviceLinkAnalogNote`(242~251), `buildComboGearSpecBlock`(176~192)

**문제**:
- 신호 경로 해석 규칙 텍스트가 "소스 유무 × device_link=블루투스 여부 × 기기1=Source 여부 × select2 유무"의 조합마다 거의 같은 문장이 **여러 벌로 하드코딩**돼 있다.
  - 예: "`- 기기 2 "…": AMP. 기기 1 라인아웃→헤드폰 구동. drive·Vrms·Rk·출력 여유는 기기 2 기준으로 평가.`" 류의 문장이 `buildDualChainRoleBlock`과 `buildSourceInclusivePathRoleBlock`에 각각 존재.
  - 블루투스 분기의 "`무선 송신(동글 등)만 담당…`" 문장도 2기기/소스포함 양쪽에 중복.
  - `device1Line`(DAC 전용 vs 소스 기기) 분기가 `buildDualChainRoleBlock`, `buildSourceInclusivePathRoleBlock`, `buildComboBaseForPrompt`의 `select1SlotLabel`에 각각 재현.
- 같은 의미의 문장을 한 곳만 고치면 다른 분기와 **문구가 어긋나** 채점 편차가 생길 수 있다.

**제안 방식**:
- 문장 조각을 상수/헬퍼로 1벌화하되(예: `ROLE_AMP_LINE(name2)`, `ROLE_BT_TX_LINE(name1)`), **출력 문자열은 현재와 토씨 하나까지 동일**하게 유지. 즉 "리터럴을 함수로 승격"만 하고 표현은 바꾸지 않는다.
- 또는 더 보수적으로, 지금은 손대지 말고 R2/R4부터 처리. (R1은 효과 대비 위험이 가장 큼)

**효과**: 경로 규칙 문구 단일 출처화 → 향후 규칙 수정 시 1곳만 변경, 분기 간 불일치 제거.

**위험도 상 이유**: 이 문자열은 그대로 OpenAI 매칭 프롬프트로 들어간다. 한 글자(공백·줄바꿈 포함)만 달라져도 LLM 채점 결과가 바뀔 수 있고, `headfi_match_cache`에 점수가 저장돼 회귀가 즉시 안 보인다.

**규모**: 중.

**동작 동일성 검증 방법 (필수, 구체안)**:
1. **프롬프트 스냅샷 비교 스크립트** (설치·작성은 하지 말 것, 제안만):
   - `buildComboBaseForPrompt(select1, select2, source, links)`를 대상으로, 모든 조합 유형을 전수 입력하는 고정 픽스처를 만든다. 유형 축:
     - `source`: 없음 / Source / DAP
     - `select2`: 없음 / 있음
     - `select1.category`: Source / DAC / 기타
     - `source_link`: '' / USB / 광(옵티컬) / 동축 / 아날로그 라인아웃 / 포노 아웃 / 블루투스 / AirPlay
     - `device_link`: '' / RCA / XLR / 4.4mm to 4.4mm / 블루투스 / 스피커 케이블
     - `source_media`: '' / LP / Cassette / 그 외
   - 각 조합에 대해 `{ name, combo_specs_block }` 전체 문자열을 `JSON.stringify`로 덤프 → `before.json` 저장.
   - 정리 커밋 후 같은 픽스처로 `after.json` 생성 → `diff before.json after.json`이 **완전히 비어야** 통과.
   - 실행 형태 예: `ts-node scripts/snapshot-combo-prompt.ts > before.json` (현재 테스트 인프라 없음 → 아래 "검증 인프라 제안" 참고).
2. 보조: `candidateLine(compressCandidateRow(item))`도 같은 방식으로 대표 기기 몇 개에 대해 스냅샷. (R1 범위는 아니나 매칭 프롬프트 전체 동일성 확인용)

**선행조건**: 스냅샷 스크립트가 먼저 있어야 안전하게 착수 가능. 스크립트 없이 손대지 말 것.

---

## R2. 청취 기록 입력 폼 중복 (Section ↔ Diary) — 위험도 중

**위치**:
- `src/app/albums/_components/AlbumListenHistorySection.tsx` (859줄)
- `src/app/albums/diary/_components/AlbumDiaryContent.tsx` (1,011줄)

**문제**: 두 파일이 "미디어 + Source/Amp1/Amp2 + Receiver + 조합" 입력 폼의 상태·핸들러를 **거의 통째로 복제**한다. 이미 공용화된 것(`useListenHistoryComboOptions`, `ReceiverComboSelect`, `fillListenHistoryFromCombo`, `comboHasSpeaker`)은 잘 분리돼 있으나, 그 바깥 레이어가 중복이다:
- 모듈 헬퍼 중복: `parseOptionalId`, `ensureGearOption` (Diary 100·107줄 / Section도 동형 보유), `todayLocalDateInputValue`, `listenHistoryMediaForForm`.
- 폼 상태 중복: `selectedSourceId/DacAmpId/DacAmp2Id/HeadphoneId`, `sourceOptions/dacAmpOptions/headphoneOptions`, `selectedMedia`, `selectedComboId`, `listenDate`, `listenImpression`, `listenSaving`.
- 핸들러 거의 동일:
  - `applySelectedCombo` — Section(378~400) ↔ Diary(397~418)는 한 줄(`if (fill.headphoneId) setReceiverError(null);`)만 다르고 나머지 동일.
  - `clearComboSelection` — Section(402~404) ↔ Diary(420~422) 완전 동일.
  - `startEdit*` 매핑, 저장 payload(`source_id/dac_amp_id/dac_amp2_id/headphone_id/combo_id`) 동일 구조.

**제안 방식**: 폼 상태+핸들러를 공용 훅 `useListenHistoryEntryForm`(또는 `useListenHistoryGearForm`)으로 추출. 입력은 `isAuthenticated`, 출력은 상태값·`applySelectedCombo`·`clearComboSelection`·`startEditFrom(record)`·`buildSavePayload()`·`resetFields()`. 두 컴포넌트는 UI(아코디언 vs 다이어리 레이아웃)만 유지. `ReceiverComboSelect`·`comboHasSpeaker` 연동은 그대로.

**효과**: 약 150~250줄 중복 제거, 폼 규칙(저장값 매핑·조합 채움·스피커 해제) 단일화. 한쪽만 고쳐 생기던 Section/Diary 동작 불일치 예방.

**위험도 중 이유**: 상태 리프트는 렌더 타이밍·초기값·`setReceiverError`(Section만 존재) 차이를 흡수해야 한다. Section에는 Receiver 검증(`receiverError`), accordion variant, 날씨 enrich 로직이 추가로 붙어 있어 훅 경계 설계에 주의.

**규모**: 대.

**검증 방법**:
- 타입: `npx tsc --noEmit`, 린트: `npm run lint`.
- 수동(JW): ① 앨범 상세의 청취 기록 추가/수정/삭제 ② 다이어리 화면 추가/수정 ③ 조합 선택 시 Source/Amp/Receiver 자동 채움 ④ 스피커 조합 선택 시 자동 해제 ⑤ Receiver 미선택 저장 차단(Section). 네 폭(390/800/1024/1440) 확인.
- 저장 payload 동일성: 추출 전후로 같은 입력에 대해 DB update/insert 객체가 동일한지 코드 리뷰로 확인(값 매핑 함수 단위).

**선행조건**: R2는 독립 착수 가능(R1과 무관). 단, done 기준상 **단독 T로 분리** 권장(규모 큼).

---

## R3. match-score 라우트 단일/배치 분기 정리 — 위험도 중

**위치**: `src/app/api/headfi-match-score/route.ts` (97~355), 호출부 `MatchMapTab.tsx`(242~), `useHeadfiDacAmpMapLazyAnalysis.ts`(8~14).

**문제**: 라우트는 `singleTarget`(targetGearId 지정)과 배치(후보 20개 채점) 두 경로를 모두 구현하지만, **실제 호출부는 전부 `targetGearId`를 보내는 단일 경로**거나 `clearCacheForGearId`(캐시 삭제)뿐이다. 배치 경로(비-singleTarget)는 도달하지 않는다:
- 배치 캐시 반환 분기 `!force && !singleTarget && cachedScores.length > 0` (237~242)
- 배치 캐시 삭제 분기 `force && !singleTarget` (258~266)
- `candidates = pickCandidates(pool, 20)` else 분기 (276~278)
- `cacheOnly` 분기 (244~246) — 어떤 호출부도 `cacheOnly`를 보내지 않음.

**제안 방식**: 단일 타겟 전제로 라우트를 좁힌다 — `targetGearId` 필수화, 배치/`cacheOnly`/`pickCandidates` 경로 제거. 또는 보수적으로 R4(순수 죽은 코드)만 먼저 제거하고 라우트 구조 변경은 뒤로.

**효과**: 라우트 상태공간 축소, `pickCandidates` 등 미사용 유틸 동시 제거, 읽기 난이도 감소.

**위험도 중 이유**: 라우트 계약 변경이라 호출부와 함께 봐야 하고, 추후 "조합 전체 일괄 채점" 기능을 다시 쓸 의도가 있었는지 JW 확인 필요(의도적 미래 대비일 수 있음).

**규모**: 소~중.

**검증 방법**: `npx tsc --noEmit`, `npm run lint`. 수동: 매칭 맵에서 셀 채점/강제 재채점/캐시 삭제(기기 평점 저장 시) 정상 동작. 네트워크 탭에서 보내는 body에 `targetGearId`가 항상 있는지 재확인.

**선행조건**: JW가 "배치 일괄 채점" 경로를 향후에도 안 쓸 것임을 확인. (쓸 계획이면 R4만 적용하고 R3 보류)

---

## R4. 죽은/미사용 코드 제거 — 위험도 하

**위치·항목**:
1. `src/app/albums/stats/albumListenStats.ts:216` `buildSourceListenRankings(...)` — 레포 전체에서 **정의 외 호출처 0건**(grep 확인). export돼 있으나 어디서도 import 안 함.
2. `src/lib/headfiMatchScore.ts:147` `pickCandidates(items, limit=20)` — 유일 호출처가 R3의 도달 불가 else 분기(route 277). R3 적용 시 함께 제거.
3. match-score 라우트 `cacheOnly` 처리(244~246) — 호출부 없음.

**제안 방식**: 1번은 단독 즉시 제거 가능(순수 삭제). 2·3번은 R3와 묶어서 처리.

**효과**: 유지보수 표면 축소, "이 함수 어디 쓰이지?" 혼동 제거.

**위험도 하 이유**: 1번은 외부 의존 없는 순수 함수 삭제라 사실상 무위험. 2·3번은 라우트 변경과 연동.

**규모**: 소.

**검증 방법**: 삭제 후 `npx tsc --noEmit`(미사용 export 삭제로 인한 import 오류 없음 확인), `npm run lint`. `grep -rn buildSourceListenRankings src`가 0건인지 재확인.

**선행조건**: 1번 없음. 2·3번은 R3 선행.

---

## R5. 조합 관련 유틸 책임 분산 — 위험도 하

**위치**: `src/app/headfi/headfiComboUtils.ts` (255줄), `src/lib/listenHistoryCombo.ts` (72줄), 레이블류가 걸쳐 있음.

**문제**: 조합 관련 로직이 두 모듈에 나뉘어 있고 각각 나름 응집도는 있으나 경계가 애매하다.
- `headfiComboUtils.ts`: 옵션 상수(`COMBO_*_OPTIONS`), 카테고리 판정(`isCombo*Category`), 레이블 포매터(`formatGear*Label`, `formatCombo*Label` 6종), 이벤트(`notifyHeadfiCombosChanged`), 맵 빌더가 한 파일.
- `listenHistoryCombo.ts`: 조합→청취이력 채움(`fillListenHistoryFromCombo`), `comboHasSpeaker`.
- 레이블 포매터가 `formatGearShortLabel / PairingDisplayLabel / MapLabel / formatListenHistoryComboBaseLabel` 등 **유사 변형이 많다**(brand 포함/제외, suffix compact 여부 차이).

**제안 방식**: 레이블 포매터를 `formatGearLabel(item, { variant })` 류로 통합하거나, 최소한 파일을 역할별(상수/판정/레이블/이벤트)로 재배치. **단, 지금 당장 필요성은 낮음** — 중복이 아니라 "변형 다수"에 가깝고 각 호출부가 서로 다른 표기를 요구한다(모델명만 vs 브랜드+모델+카테고리 vs compact suffix). 과도한 추상화 위험.

**효과**: (제한적) 레이블 규칙 한눈 파악.

**위험도 하 / 규모 소~중**. 변형 통합 시 각 화면 표기가 미세하게 바뀌지 않는지 주의.

**검증 방법**: 변형별 출력 스냅샷(조합 레이블 before/after 문자열 비교), 수동으로 조합 관리/매칭 맵/청취 이력/페어링 레이블 표기 확인.

**선행조건**: 없음. **권고: 우선순위 낮음, 보류.**

---

## R6. 초대형 컴포넌트 파일 — 위험도 중

**위치(줄 수, 상위)**:
- `src/app/albums/_components/AlbumForm.tsx` — 1,290
- `src/app/lyrics/_components/AlbumTrackListContent.tsx` — 1,259
- `src/app/artists/_components/ArtistsLibraryContent.tsx` — 1,206
- `src/app/albums/stats/_components/AlbumStatsContent.tsx` — 1,110
- `src/app/albums/diary/_components/AlbumDiaryContent.tsx` — 1,011 (R2와 중복 대상)
- `src/app/_components/DashboardContent.tsx` — 994, `insights/GenreStatsContent.tsx` — 982, `headfi/HeadfiLibraryContent.tsx` — 946, `lib/gemini.ts` — 940, `headfi/map/MatchMapTab.tsx` — 890

**문제**: 단일 파일에 폼·목록·모달·필터·API 호출이 섞여 가독성·변경 영향 범위가 크다. 단, **이번 조합 개편과 직접 관련은 낮음**(기존부터 큼).

**제안 방식**: 당장 손대지 말고, 각 파일 수정 작업이 생길 때 "그 작업 범위 안에서" 섹션 컴포넌트/훅 분할. 전면 분할 전용 T는 효과 대비 위험(대규모 diff)이 커 권장하지 않음.

**효과**: 점진적 가독성 개선.

**위험도 중 / 규모 대**. 전체 재작성 금지 규칙과 충돌하므로 **반드시 소규모·부분적**으로.

**검증 방법**: 분할 시 해당 화면 수동 회귀, `tsc`/`lint`, 필요 시 `npm run build:check`.

**선행조건**: 개별 기능 작업과 묶어서만. 단독 대규모 리팩터 금지.

---

## 검증 인프라 제안 (설치·작성 금지, 제안만)

현재 레포에 테스트 인프라가 없다. 최소 장치로 아래를 제안한다:

1. **프롬프트 스냅샷 스크립트** `scripts/snapshot-combo-prompt.ts` (제안):
   - `buildComboBaseForPrompt` 전수 조합 입력 → `{name, combo_specs_block}` JSON 덤프.
   - 실행: `npx tsx scripts/snapshot-combo-prompt.ts > /tmp/combo-before.json` → 정리 후 `-after.json` → `diff`.
   - 의존: `tsx` 또는 `ts-node`(devDependency 추가 필요 → JW 승인 후). 또는 기존 Next 런타임 없이 순수 함수라 간단히 돌아감.
2. **매칭 후보 라인 스냅샷**: `candidateLine(compressCandidateRow(item))`를 대표 기기 픽스처로 덤프(선택).
3. 러너 도입(vitest 등)은 범위 과대 → 지금은 스냅샷 diff 스크립트 1개로 충분.

> 주의: 위 스크립트는 **제안일 뿐**이며 이번 작업에서 생성하지 않았다.

---

## 추천 진행 순서 (작업 단위 T 후보)

| 순서 | T 후보 | 내용 | auto_commit 권고 | 비고 |
|------|--------|------|------------------|------|
| 1 | **T-a (R4-1)** | `buildSourceListenRankings` 단독 삭제 | true | 무위험, 즉시. 가장 먼저 |
| 2 | **T-b (검증 스크립트)** | 프롬프트 스냅샷 스크립트 작성 + devDep 추가 | false | R1 선행조건. JW가 devDep 승인 |
| 3 | **T-c (R3+R4-2,3)** | match-score 라우트 단일 타겟 전제로 축소, `pickCandidates`·`cacheOnly`·배치 분기 제거 | false | 라우트 계약 변경. JW의 "배치 미사용" 확인 선행 |
| 4 | **T-d (R2)** | 청취 기록 폼 공용 훅 추출(Section↔Diary) | false | 규모 대. 단독 T |
| 5 | **T-e (R1)** | 경로 규칙 문장 조각 1벌화(문자열 불변) | false | T-b 스냅샷 통과를 완료 기준에 포함. 위험 최상 |
| — | (보류) R5, R6 | 레이블 통합·대형 파일 분할 | — | 필요 시 개별 기능 작업에 편승 |

**원칙**: T-b(스냅샷) 없이 T-e(R1)에 착수하지 말 것. R2와 R1/R3는 서로 독립이라 병렬 가능하나, 한 번에 feature 1개 규칙에 따라 순차 처리 권장.
