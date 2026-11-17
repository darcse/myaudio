# HARNESS.md — 하네스 운용 규칙

## 하네스 파일 구조

| 파일 | 역할 |
|------|------|
| `AGENTS.md` | 에이전트 행동 규칙 (절대 규칙, 코딩 규칙, Task handoff). Cursor가 자동 인식 |
| `CLAUDE.md` | AGENTS.md와 같은 규칙의 Claude Code용 사본 |
| `CONVENTIONS.md` | 프로젝트별 스택·DB·도메인 규칙 |
| `TASK.json` | 현재 작업 지시 1건. 새 작업마다 덮어쓴다 |
| `docs/tasks/` | 지난 TASK.json 보관 ({id}.json). 보관 파일은 수정하지 않는다 |
| `feature_list/` | 기능 스펙·검증 기준. 항목 삭제 금지. 기능이 바뀌면 steps 문구는 플래너가 고친다. `passes`는 플래너만 변경 |

---

## 개발 흐름

```
JW 요청 → Claude(플래너)가 TASK.json 작성 → Cursor 구현 → "확인해줘"로 Claude가 result·diff 검토 → JW 동작 확인 → Claude가 passes 변경 → JW 커밋·푸시
```

1. **JW** — 요구사항을 말한다.
2. **Claude(플래너)** — 레포의 TASK.json에 작업 지시를 쓴다. 새 기능이면 feature_list에도 항목을 추가한다. SQL이 필요하면 JW가 Supabase에서 직접 실행한다.
3. **Cursor** — "TASK.json 읽고 구현해" 요청으로 구현하고 status/result만 갱신한다.
4. **Claude(플래너)** — result와 git diff를 검토한다. scope 이탈, 중복·불필요한 복잡도, 죽은 코드를 본다.
5. **JW** — 브라우저에서 동작을 직접 확인한다. (Playwright 사용 안 함)
6. **Claude(플래너)** — 확인된 feature의 passes를 변경하고 파일을 다시 읽어 저장을 확인한다.
7. **JW** — 직접 커밋하고 푸시한다. 에이전트는 git add/commit/push를 하지 않는다.

문제가 있으면 새 TASK.json(수정 작업)으로 넘긴다.

---

## 세션 시작 절차 (공통)

1. `TASK.json`과 `docs/tasks/`의 최근 파일 읽기 — 현재·이전 작업 파악
2. `feature_list/` 읽기 — passes: false 항목 파악
3. JW가 띄운 개발 서버 접속 주소를 확인한다. 모르면 물어본다. 직접 실행·종료하지 않는다.

---

## 구현 규칙 (Cursor)

- TASK.json 1건만 작업한다. 범위는 goal, context, scope에 한정한다.
- scope.out에 해당하는 수정이 필요해 보이면 변경하지 말고 result에 보고한다.
- 수정할 파일을 작업 전 한 줄로 요약한다.
- 작업 중 발견한 버그나 개선점은 즉시 고치지 않고 result에 보고한다. BUG 항목 추가는 플래너가 한다.
- passes는 변경하지 않는다.
- 지시보다 나은 설계나 놓친 리스크가 보이면 반박하고 대안을 제안한다.

---

## 검증 규칙

- 플래너: TASK.json의 result와 git diff를 코드 품질 기준으로 검토한다. 기능 동작 테스트는 하지 않는다.
- JW: feature_list steps를 브라우저에서 직접 확인한다.
- "잘 될 것 같다"는 passes: true 사유가 안 된다. steps 전체가 통과하고 JW가 확인한 경우에만 true로 바꾼다.
- 하나라도 실패하면 passes: false를 유지한다.
- passes 변경은 파일에 직접 저장한 뒤 다시 읽어 반드시 확인한다.

---

## 테스트 루프

TASK.json의 done에 따른다. 로직이나 구조를 건드리는 작업은 기본으로 아래 둘을 실행한다.

1. `npx tsc --noEmit` — 타입 오류 확인
2. `npm run lint` — 린트 에러 확인

구조가 크게 바뀐 작업은 `npm run build:check`(.next-buildcheck, 실행 중 dev의 .next를 덮지 않음)를 추가한다. `npm run build`는 쓰지 않는다.

실패 시: 스스로 수정 후 재시도(최대 3회). 3회 실패하면 result에 원인과 시도 내용을 적고 status를 blocked로 둔다.

---

## 세션 종료 절차

1. TASK.json의 status를 done으로, result에 변경 요약·건너뛴 항목과 이유·검증 결과·`git diff --stat` 요약을 기록한다.
2. 테스트 루프 통과를 확인한다.
3. 커밋·푸시는 JW가 한다.

---

## 규칙 문서 보강 (플래너)

검토 중 같은 종류의 실수가 docs/tasks/의 최근 result에서 2회 이상 반복되면 AGENTS.md와 CLAUDE.md를 보강한다.

- 특정 API 응답 구조 오해
- Supabase RLS·Auth 실수
- 컴포넌트 구조 반복 오해
- 같은 종류의 실수 (try/catch 누락, import 경로 오류 등)

패턴이 없으면 규칙 문서를 수정하지 않는다.

---

## 회귀 테스트 (새 기능 추가 후 선택적 실행)

passes: true 항목 전체를 대상으로 steps 중 핵심 1~2개만 빠르게 확인한다. 깨진 항목은 BUG 항목으로 추가하고 새 TASK.json으로 수정한다.
