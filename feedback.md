# feedback.md — GEAR-041~047 코드 검수 (2026-10-21)

> 보고 전용. 앱 실행·AI 호출·DB 쓰기·코드 수정/삭제 없음.
> passes 값은 무시하고 steps를 코드 기준으로만 점검.

## 검증 환경

| 검사 | 결과 |
|------|------|
| `npx tsc --noEmit` | **No errors found** |
| `npm run lint` | **No issues found** |

---

## 1. 항목별 점검 (통과 / 실패 / 코드로 확인 불가)

### GEAR-041 — 기기 폼 액세서리를 독립 액세서리 연결로 통합

| 항목 | 결과 | 근거 |
|------|------|------|
| 폼에서 케이블·이어팁·액세서리 직접 입력 제거, 공통 '액세서리' 영역 | **통과** | 폼 어떤 섹션도 `cable/eartip/accessory` 입력을 렌더하지 않음. 액세서리 탭은 `HeadfiFormAccessoryLinks`만 사용 (`HeadfiForm.tsx:282`). 폼 섹션에서 `formData.cable/eartip/accessory` 읽기 0건 |
| 카테고리 → 제품 순 선택, 제품명·가격 한 줄 표시 | **통과** | `HeadfiFormAccessoryLinks.tsx:215` 카테고리 셀렉트 → 제품 목록. 라벨 `제품명 | 가격` |
| 여러 개 추가·제거, 중복 추가 금지 | **통과** | `selectedAccessoryIds` 배열 상태(`HeadfiForm.tsx:55`), `syncHeadfiAccessoryLinks`가 `new Set`으로 중복 제거(`actions.ts:460`), DB UNIQUE(headfi_id, accessory_id) |
| 방출 액세서리는 선택 목록 미노출, 연결 중 표시 | **통과(코드 일부 확인)** | 연결 기기 표시 로직 존재. 방출 필터·"연결 중" 표기는 `HeadfiFormAccessoryLinks` 내 처리 (상세 UI는 수동 확인 권장) |
| 연결 액세서리 가격은 기기 구매액에 미합산 | **통과** | `headfiItemSpending`는 `item.price`만(`spendingStats.ts:88-90`). 액세서리는 별도 배열로 합산(`:200-205`) |
| 저장 중 오류 시 폼 내용 유지 | **통과** | 링크 저장 실패 시 `toast.error` 후 `return`(`HeadfiForm.tsx:105-108`), 모달 닫지 않음. formData는 부모 상태라 보존 |
| 대시보드 등 다른 화면 수정 모달도 동일 저장 | **통과** | `DashboardContent`/`AlbumStatsContent`/`MonthlyTimeline` 모두 `HeadfiForm` 렌더 + `onSave`가 id 반환(`DashboardContent.tsx:516-531`) → 링크 sync 동작 |

### GEAR-042 — 액세서리 관리 화면 연결 기기 표시(표시 전용)

| 항목 | 결과 | 근거 |
|------|------|------|
| 각 액세서리에 연결 기기 표시, 다수 모두 표시 | **통과** | `linkedGearByAccessoryId` 맵(`HeadfiAccessoryModal.tsx:147-153`), 행별 `linked` 배열(`:351`) |
| 연결 기기 없음 표기 | **통과** | "연결된 기기 없음"(`:455`) |
| 삭제 시 window.confirm 금지·인라인 확인 | **통과** | `window.confirm` 전 코드 0건. 인라인 `pendingDeleteKey` 상태(`:123`, 확인 UI `:526`) |

### GEAR-043 — 레거시 내장 액세서리 합산/표시 제거

| 항목 | 결과 | 근거 |
|------|------|------|
| 소비통계가 레거시 `cable_price/eartip_price/accessory_price` 미읽기 | **통과** | `spendingStats.ts` 전체에서 레거시 가격 컬럼 참조 0건. `item.price`만 사용(`:88,:242`) |
| 종류별 합계 = 본체 가격, 액세서리 항목 = 독립 액세서리 합 | **통과** | `byCategory`는 `item.price`(`:239-245`), `byAccessory`는 `accessories`(`:247-255`) |
| 기기 상세에서 레거시 직접입력 표시 제거 | **통과** | 상세/표시 컴포넌트에서 레거시 컬럼 읽기 0건 (grep 확인) |

### GEAR-044 — 청음 평가 성능 13 + 성향 4 신규 컬럼 저장

| 항목 | 결과 | 근거 |
|------|------|------|
| 성능 13개 그룹/순서, 점수 기준 안내 | **통과** | `LISTENING_PERFORMANCE_GROUPS` 저/중/고/기술·공간/종합 순(`listeningEvaluation.ts:52-92`) |
| 신규 4개 노출, 레거시 7개 폼 미노출 | **통과** | 폼은 `LISTENING_PERFORMANCE_FIELDS`(13) + `LISTENING_TRAIT_FIELDS`(4)만 렌더. 레거시 7개 폼 섹션 읽기 0건 |
| 성향 미입력(NULL)/중립(0) 구분 저장 | **통과** | `parseTraitScore` 빈값 → `null`, 0은 유효값(`listeningEvaluation.ts:167-179`) |
| 성능 0/11 거부 | **통과** | `parsePerformanceScore` 1~10 외 throw(`:153-165`), `getListeningEvaluationFormError`가 제출 전 차단(`HeadfiForm.tsx:91-96`) |
| 레거시 7개 값 변경 안 함 (유선 저장) | **통과** | 헤드폰/이어폰 분기는 `wiredListeningScoreColumns`(13+4)만 기록, 레거시 7개는 payload에 없음 → 보존(`actions.ts:237,267`) |
| 유선→비유선 전환 시 신규 8개 NULL 초기화, 레거시 미변경 | **통과(관찰 있음 — 섹션 2.5)** | 비유선 분기는 `emptyWiredFields`→`emptySoundScores`로 신규 8개 null 기록. 레거시 7개도 null 기록되나 이미 null이라 무변경 |
| 매칭 캐시 무효화에 신규 8개 포함 | **통과** | `WIRED_HP_IEM_MATCH_FIELDS`에 신규 8개 전부 포함, 레거시 7개 없음(`headfiMatchCacheInvalidation.ts:8-33`) |

### GEAR-045 — 상세 청음 평가 탭 13축 레이더 + 그룹 평균 + 성향 4줄

| 항목 | 결과 | 근거 |
|------|------|------|
| 13개 모두 입력 시 레이더, 일부면 안내 | **통과** | `hasCompletePerformanceRadar`(`listeningEvaluation.ts:213-215`) |
| 그룹 평균 = 입력 항목만, n개 평가, 단일 총점 없음 | **통과** | `performanceGroupAverages`(`:222-237`), 미입력 그룹 `average==null → '—'`(`HeadfiRadarSection.tsx:354`) |
| 성향 0=가운데 점, NULL=점 없음 '—' | **통과** | `selected = value != null && value === step`(`:381`), `value == null ? '—'`(`:399`) |
| 태그 요약에서 0·NULL 생략 | **통과** | `traitTagSummary`가 `value==null||value===0` 제외(`listeningEvaluation.ts:239-247`) |
| 레거시 7개 레이더/평균/성향에 미노출 | **통과** | 표시 경로가 신규 컬럼만 참조 |

### GEAR-046 — AI/매칭/포지션이 신규 컬럼 사용, 포지션은 공식 계산

| 항목 | 결과 | 근거 |
|------|------|------|
| AI 분석 프롬프트가 성능/성향 구분 전달, 레거시 미언급 | **통과** | `buildHeadfiSoundScoresPromptBlock` 성능/성향 블록 분리(`headfiSoundScores.ts:83-97`), 레거시 미참조 |
| 포지션 X=warmth/brightness, Y=기술평균 대비 musicality, 결정론적 | **통과** | `computeWiredPositionCoords`(`headfiPosition.ts:59-100`), 필요 6값 중 NULL이면 `null` 반환 → 좌표 유지 |
| 매칭 저/중/고 밴드 신규 컬럼, NULL은 '-' | **통과** | `candidateLine`에 trait 4 + musicality 포함(`headfiMatchScore.ts:154`), 성향/성능 신규 컬럼 사용, 레거시 미참조 |
| 기분 추천 trait_warmth/brightness, 0/NULL 구분 | **통과** | `formatMoodAxis`가 NULL→'모름', 0→'0'(`gemini.ts:243-244`), 프롬프트에 -2~+2 의미 명시(`:272-274`) |

### GEAR-047 — 청음 AI 분석이 스펙+성능/성향+FR+외부 리뷰 종합

| 항목 | 결과 | 근거 |
|------|------|------|
| 리뷰 요약 없으면 검색 선행 후 분석(별도 2요청) | **통과** | 리뷰 route와 sound-analysis route 분리, `HeadfiRadarSection`의 `analysisPhase` 'review'→'analysis'(`:66`) |
| 캐시 있으면 재검색 0회 | **통과** | `!force && hasCachedHeadfiReview` → `cached:true` 반환(`headfi-review-summary/route.ts:46-53`) |
| 갱신은 버튼(force)으로만 | **통과** | `force`일 때만 재검색(`:46`) |
| 요약 길이 상한 1500자 | **통과** | `truncateReviewSummary`(`headfiReviewSources.ts:24-28`, 적용 `route.ts:77`) |
| 실패 시 기존 요약·분석 미덮어쓰기 | **통과** | 생성 실패(null) → 503, DB update 미수행(`route.ts:70-75`). 리뷰 update는 요약/출처/시각 3컬럼만, `ai_sound_analysis` 등 미변경(`:83-88`) |
| 유선만·비로그인 차단 | **통과** | 비유선 400(`:42-43`), 미인증 401(`:16`) |
| 출처는 grounding URL만(http(s), 중복 제거) | **통과** | `parseHeadfiReviewSources`가 http(s)·중복 필터(`headfiReviewSources.ts:8-22`) |
| 모델명 정확 일치 리뷰만 사용 | **코드로 확인 불가** | Gemini 프롬프트 내부 지시 사항. route는 brand/model을 전달만 함(`route.ts:61-68`). 프롬프트 문구는 수동/Cursor 보고로 확인 필요 |

---

## 2. 정리 후보 (삭제 순서: ① → ⑥, 보고만)

### ① `buildHeadphoneBaseListeningContext` — 미사용 export [위험도: 낮음]
- 위치: `src/lib/headfiMatchScore.ts:186-199`
- 근거: 전체 소스 grep 시 **정의 1건 외 호출처 0건**. 실제 사용은 `buildHeadphoneListeningContextForPrompt`(`:161`)·`buildHeadphoneListeningContextSections`(`:178`)로 대체됨
- 삭제: 함수 블록 제거만으로 안전

### ② `accessoryFields()` — 전부 폐기되는 쓰기 [위험도: 낮음]
- 위치: `src/app/headfi/actions.ts:66-71` (+ 호출 6곳 `:148,162,176,186,200,213`)
- 근거: 반환 키 `accessory`, `accessory_price`는 둘 다 `LEGACY_ACCESSORY_COLUMNS`(`:104-111`)에 속해 insert/update 직전 `omitLegacyAccessoryColumns`(`:289,305`)가 **항상 제거**. 즉 DB에 도달하지 못하는 죽은 쓰기
- 삭제: `accessoryFields` 함수와 6개 `...accessoryFields(data)` 호출 제거. 동작 변화 없음

### ③ `mapHeadfiData`의 cable/eartip 할당 — 폐기되는 쓰기 [위험도: 낮음]
- 위치: 헤드폰 `actions.ts:227-230`, 이어폰 `:257-260`, 무선 `:189-190`
- 근거: `cable/cable_price/eartip/eartip_price`도 `LEGACY_ACCESSORY_COLUMNS`라 omit으로 제거됨. 역시 죽은 쓰기
- 삭제: 각 분기의 해당 4(무선은 2)줄 제거

### ④ `emptyWiredFields`의 레거시 액세서리 6키 [위험도: 낮음]
- 위치: `src/app/headfi/actions.ts:82-87` (cable/cable_price/eartip/eartip_price/accessory/accessory_price)
- 근거: 동일하게 omit 대상. 비유선 분기에서 spread되지만 제거됨
- 삭제: 6줄 제거

### ⑤ 폼 기본값 객체 중복 정의 [위험도: 낮음~중간]
- 위치: `initialHeadfiFormData` (`src/app/_components/DashboardContent.tsx:107~`), `initialFormData` (`src/app/headfi/_components/HeadfiLibraryContent.tsx:50~`)
- 근거: 두 객체가 `emptyHeadfiFormData`(`src/app/headfi/utils.ts:3-67`)와 키·값 **동일 중복**. 공유 상수는 이미 `MonthlyTimeline`·`AlbumStatsContent`가 import해 사용 중
- 삭제: 두 로컬 객체를 `emptyHeadfiFormData` import로 교체. 주의: `DashboardContent`의 것은 `: HeadfiFormData` 타입 주석이 없어 교체 전 키 일치 확인 필요 (현재 일치 확인됨)

### ⑥ HeadfiFormData 타입의 레거시 폼 필드 [위험도: 중간]
- 위치: `src/app/headfi/types.ts:191-194`(cable/cable_price/eartip/eartip_price), `:210-223`(bass_speed/dynamics_slam/tone_warmth/vocal_position/midrange_clarity/treble_brightness/timbre)
- 근거: 폼 UI가 더 이상 입력하지 않고, 폼 섹션 컴포넌트에서 `formData.*` 읽기 0건. `headfiToFormData`가 item 전체를 spread하므로 채워지기만 할 뿐 사용처 없음
- 삭제: ②③④⑤ 정리 후 타입 필드 + 기본값 객체 해당 키 함께 제거. DB 컬럼 자체는 CONVENTIONS 규칙대로 **삭제하지 않음**

> 참고: 중복 제거가 가능한 카테고리 상수(Source/Amp/Receiver/Media)는 이미 `src/lib/listenHistoryGear.ts` 한 곳에서 관리되며 다른 파일은 모두 import만 함 — **중복 정의 없음**.

---

## 2.5 관찰 — 실패 아님

- **비유선 저장 시 레거시 평점 7개에 null 기록**: `emptySoundScores`(`actions.ts:27-54`)가 신규 8개와 함께 레거시 7개도 `null`로 넣는다. 마이그레이션으로 이미 모두 null이라 값 변화는 없고(데이터 손실 없음) GEAR-044의 "건드리지 않는다" 의도와 사실상 동일 결과. 다만 "엄밀히 touch하지 않음"을 원하면 ⑥ 정리 시 `emptySoundScores`에서 레거시 7키를 함께 빼면 됨 (위험도 낮음, 기존에도 null이라 영향 없음).

---

## 3. 종합

- **GEAR-041~047 steps: 코드 확인 가능한 항목 전부 통과.** 실패로 막을 결함 없음.
- `tsc`/`lint` 모두 clean.
- **코드로 확인 불가 (수동/프롬프트 확인 권장)**:
  - GEAR-047 "모델명 정확 일치 리뷰만 사용" — Gemini 프롬프트 지시 영역.
  - GEAR-041 "방출 액세서리 미노출 / 연결 중 표시" 등 UI 세부 — 브라우저 수동 확인.
- 정리 후보 6건은 모두 레거시 잔재(죽은 쓰기·미사용 export·중복 기본값)이며 ①→⑥ 순서로 제거 시 동작 변화 없음. **본 세션에서는 수정하지 않음 (보고 전용).**
