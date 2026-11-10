---
description:
alwaysApply: true
---

# AGENTS.md — 공통 에이전트 행동 규칙

> 프로젝트별 스택·DB·도메인 정보는 CONVENTIONS.md 참조.
> 하네스 운용 절차는 HARNESS.md 참조.

---

## 필수 시작 절차

세션 시작 시 아래 파일을 순서대로 읽는다:

1. `HARNESS.md` — 하네스 운용 규칙
2. `CONVENTIONS.md` — 프로젝트 스택 및 도메인 규칙
3. `TASK.json`과 `docs/tasks/`의 최근 파일 — 현재·이전 작업 내용
4. `feature_list/` — 현재 passes: false 항목 파악

---

## 절대 규칙

- 브랜치 생성 금지 — main 직접 푸시
- worktree 사용 금지
- feature 1개씩만 작업 — 범위 확장 금지
- passes 변경은 Claude Code만 한다
- passes 변경 후 grep으로 실제 저장 여부 반드시 확인
- 개발 서버 보호 절을 따른다
- 실행 중인 개발 서버가 쓰는 `.next`를 덮어쓰는 `npm run build`는 쓰지 않는다. Next 컴파일 검증은 `npm run build:check`만 사용한다
- 전체 파일 재작성 금지 — 변경되는 부분만 최소 수정
- 주석 추가 금지
- Playwright 사용 금지 — 브라우저 테스트는 수동 확인
- extended thinking 기본 사용 금지, 복잡한 알고리즘·아키텍처 설계 시에만 사용
- 요청받지 않은 기능·추상화·리팩터링 추가 금지
- 불명확한 요구사항은 구현 전에 질문한다 — 가정하고 진행 금지
- 인접 코드 임의 개선 금지 — 내 변경이 만든 미사용 코드만 정리한다
- 여러 해석이 가능한 요청은 선택지를 먼저 제시하고 확인 후 진행한다

---

## 개발 서버 보호

- 개발 서버는 JW가 Tauri 런처로 따로 띄우며, 여러 프로젝트가 서로 다른 포트에서 동시에 실행될 수 있다.
- 에이전트가 직접 시작하지 않은 node/next 프로세스는 포트와 무관하게 종료하지 않는다. `kill`, `pkill`, `killall`, `lsof` 기반 종료, 포트 비우기를 모두 금지한다.
- `npm run dev`를 새로 실행하지 않는다. 서버 확인이 필요하면 JW에게 접속 주소를 물어 그 서버를 사용한다.
- 응답 없는 서버는 JW에게 보고하고 기다린다. 화면이 갱신되지 않아 보여도 재시작하지 말고 JW에게 보고한다.
- 코드 검증은 `npx tsc --noEmit`과 `npm run lint`를 우선 사용한다. Next 컴파일 검증은 `npm run build:check`만 사용한다.

---

## 코딩 규칙

- TypeScript 사용, any 타입 지양
- 컴포넌트는 named export 사용
- 서버 컴포넌트 우선, 필요할 때만 `use client`
- 환경변수는 .env.local 사용, 절대 하드코딩 금지
- Supabase 클라이언트는 `lib/supabase/client.ts` (브라우저), `lib/supabase/server.ts` (서버) 분리 유지

---

## Tailwind v4 주의사항

- 커스텀 유틸 클래스는 반드시 `@layer utilities`에 정의
- 조합 선택자(`.prose h3` 등)는 `globals.css`에 넣으면 purge됨
  → 별도 CSS 파일로 분리 후 `layout.tsx`에서 import
- 다크모드 대응 시 Recharts 대신 SVG 차트 우선 사용 (CSS 변수 호환)
- Glass 스타일은 인라인 다크 클래스 대신 `globals.css` 유틸 클래스 사용

---

## Supabase 규칙

- RLS는 모든 테이블에 활성화
- RLS 정책은 SELECT / INSERT / UPDATE / DELETE 4개 모두 생성
- 기본 패턴: `auth.uid() = user_id`
- `user_id`는 반드시 `supabase.auth`에서 가져온다 — 하드코딩 금지
- AI API Route에서 사용하는 키는 서버 전용 (`NEXT_PUBLIC_` 없음)

---

## Git 규칙

- 브랜치 생성 금지 — 항상 main에 직접 커밋 & 푸시
- PR 없음

### 커밋 메시지 형식

```
YYMMDD_HHMM (type): 설명
```

| type | 용도 |
|------|------|
| `feat` | 새로운 기능 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `style` | 스타일·UI 변경 |
| `chore` | 설정, 의존성 등 기타 |
| `docs` | 문서 수정 |

### 예시

```
260608_1030 (feat): SETUP-001 프로젝트 초기화 완료
260608_1500 (fix): BOOK-001 도서 저장 후 stale state 수정
260608_2210 (chore): 환경변수 정리
```

---

## AI API 호출 규칙

- 모든 API 호출은 반드시 try/catch로 감싼다
- API 응답 JSON 파싱 실패 시 에러 메시지 노출
- Gemini 응답이 markdown 코드블록으로 감싸진 경우 파싱 전 제거 처리
- `withRetry` 헬퍼로 429/503 에러 처리
- 프로젝트별 추가 AI 규칙은 CONVENTIONS.md 참조

---

## Task handoff (TASK.json)

- 작업 지시는 레포 루트의 `TASK.json`에 있다. "TASK.json 읽고 구현해"라는 요청을 받으면 `goal`, `context`, `scope`, `done`을 읽고 그대로 구현한다.
- `goal`·`context`·`scope`·`done`은 수정하지 않는다. 갱신하는 필드는 `status`와 `result`뿐이다. 착수 시 `in_progress`, 완료 시 `done`, 막히면 `blocked`와 이유를 기록한다.
- `result`에는 변경 요약, 건너뛴 항목과 이유, 검증 결과(`npx tsc --noEmit`, `npm run lint`, 필요 시 `npm run build:check`), `git diff --stat` 요약을 적는다. `npm run build`는 쓰지 않는다.
- TASK.json 작업에서는 `git add`/`commit`/`push`를 하지 않는다. 위 Git 규칙의 "main 직접 커밋 & 푸시"보다 이 규칙이 우선한다.
- `scope.out`에 해당하는 수정이 필요해 보이면 변경하지 말고 `result`에 보고한다.
- `done` 항목을 모두 만족하지 못하면 `blocked`로 기록한다.
- 지시보다 나은 설계나 놓친 리스크가 보이면 반박하고 대안을 제안한다.
- `TASK.json`은 작업 1건만 담는다. 새 작업을 쓰기 전에 기존 내용을 `docs/tasks/{id}.json`으로 복사해 보관한 뒤 덮어쓴다. 보관 파일은 수정하지 않는다.
- 새 기능 작업은 `feature_id`로 `feature_list/` 항목과 연결한다. 기능 스펙은 feature_list가 원본이다. `passes`는 JW가 갱신하며 에이전트는 건드리지 않는다. 위 절대 규칙의 "passes 변경은 Claude Code만 한다"보다 이 규칙이 우선한다.
- mybooks 전용 테이블(books, comics, photobook, book_highlights, book_stats_comments)은 건드리지 않는다. 공용 요소(auth.users, RLS, monthly_review_comments) 변경이 필요하면 구현하지 말고 `result`에 보고한다.
- window.confirm / alert / prompt는 사용하지 않는다(Tauri 웹뷰). 인라인 확인 UI를 쓴다.
