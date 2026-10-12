# Gemini SDK 이관 검증 (`@google/generative-ai` → `@google/genai` 2.x)

검증일: 2026-10-12. 앱 코드 수정 없음. `album` SELECT만 사용. `album` / `album_mood_groups` WRITE 및 `POST /api/album-mood-groups` 없음.

이미 확인된 항목(재실행하지 않음): `analyzeMusicTaste`·`generateAlbumIntroAndTags` 로컬 호출 성공, Gemini 화면 9개 수동 확인.

---

## 1. 정적 검사

| 항목 | 결과 | 근거 |
|------|------|------|
| `npx tsc --noEmit` | **통과** | 재실행, 에러 없음 |
| `npm run build` | **통과** | 1차(샌드박스)는 `/albums` prerender `TypeError: Cannot read properties of undefined (reading 'call')`로 실패. 2차(동일 명령, 비샌드박스) 성공. 이관 코드 결함으로 보기 어려움(동시 `next-server`와 `.next` 충돌 가능) |
| `src/` `@google/generative-ai` import | **통과** | 0건. `src/lib/gemini.ts:1`만 `@google/genai` |
| `package.json` dependencies `@google/genai` 2.x | **통과** | `"@google/genai": "^2.28.0"`. lock `node_modules/@google/genai` resolved `2.28.0`. `@google/generative-ai` 없음. 3.x 아님 |
| `generateContent`는 래퍼 한 곳 | **통과** | `src/`에서 `generateContent`는 `src/lib/gemini.ts:49` (`generateGeminiText` 내부)뿐 |
| `responseMimeType` / `responseSchema` | **통과** | `src/` 0건 |
| 모델 문자열은 `aiModels.ts`만 | **통과** | `src/`에서 `gemini-` / `gpt-` / `claude-`는 `src/lib/aiModels.ts:1-3`만 |

참고(이번 합격 기준 밖): `scripts/migrate-null-mood-names.mjs:5`가 여전히 `@google/generative-ai`를 import. 앱 의존성 제거로 해당 스크립트는 실행 불가.

---

## 2. `generateAlbumMoodGroups` 실제 호출

| 항목 | 결과 |
|------|------|
| 호출 방식 | 임시 스크립트 → `generateAlbumMoodGroups` 직접 호출. 검증 후 스크립트 삭제 |
| 입력 | `album` SELECT `id, genre1, genre2, audio_tags` 15행 (WRITE 없음, POST 없음) |
| 그룹 수 | **통과** — 9 |
| 빈 결과 아님 | **통과** — 15장 전부 배정 |
| 앨범당 한 그룹 | **통과** — duplicate id 0 |

생성된 무드명(캐시에 저장하지 않음): 반항적이고 거친 사이키델릭 록 / 미래지향적이고 도발적인 하이퍼팝 / 비장한 서사의 하드 록 / 몽환적이고 아련한 J-아이돌 / 음울하고 퇴폐적인 팝 / 아련하고 지적인 인디 록 / 폭발적인 에너지의 얼터너티브 록 / 웅장하고 긴장감 넘치는 팝 록 서사 / 차갑고 광기 어린 포스트 하드코어와 펑크

---

## 3. 실패 로그 (`[gemini]` console.error)

| 항목 | 결과 | 근거 |
|------|------|------|
| 로그가 API 키를 직접 넣는 경로 | **통과** | `logGeminiFailure` (`src/lib/gemini.ts:36-43`)는 `fn`, `status`, `error`만 기록. `GEMINI_API_KEY` / `apiKey`는 `GoogleGenAI` 생성자(`:22-24`)에만 있고 로그 인자에 없음 |
| 로그가 프롬프트 전문을 직접 넣는 경로 | **통과** | `options.prompt` / `systemInstruction`은 `generateContent` 인자(`:51-56`)로만 전달. `console.error`에 없음 |
| 에러 메시지 경유 유출 | **통과(잔여 리스크 있음)** | `error` 필드는 `err.message` 또는 `String(error)`를 300자로 자름 (`:38-42`). 신 SDK `ApiError.message`는 보통 API 에러 JSON stringify. **코드가 키·프롬프트를 붙이지는 않음.** 업스트림 에러 바디가 요청 일부를 메아리치면 300자 안에 프롬프트 조각이 들어갈 **이론적 가능성**은 있음. 이번 검증에서 실패 로그 실물은 수집하지 않음 |

다른 `console.error`: `analyzeLyricsVibe` catch가 전체 `error` 객체를 찍음. 래퍼 `[gemini]` 경로는 아님.

---

## 종합

이관 검증 항목은 모두 **통과**. 실패로 막을 수정 사항 없음.

확인 불가: 실제 429 응답의 `[gemini]` 로그 샘플(라이브 쿼터 소진 호출 안 함).
