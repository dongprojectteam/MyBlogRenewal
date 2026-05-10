# 수도쿠 (Sudoku) 구현 TODO

에이전트(구현 담당)가 `requirements.md` · `design.md`에 맞춰 순서대로 처리할 작업 목록이다. 체크박스는 PR/커밋 단위로 갱신한다.

---

## 0. 선행·정합

- [ ] `design.md` §3 라우트·파일명과 실제 생성 경로가 일치하는지 한 번 더 확인한다.
- [ ] 사용자 제공 **생성 알고리즘**이 준비되면 `lib/sudoku/generate.ts`(또는 합의된 경로)에 통합하고, **§6.3 Worker 메시지**(`generate` / `progress` / `success` / `error`)를 지키게 래핑한다. 준비 전에는 **동작 확인용 스텁**(고정 시드·단순 퍼즐)으로 UI만 연결할 수 있다.

---

## 1. 타입·데이터 계층

- [ ] `types/index.ts`에 `SudokuLevelId`, `SudokuScore`, (필요 시) `SaveSudokuScoreInput` 추가.
- [ ] Supabase에 `sudoku_scores` 테이블 생성(또는 마이그레이션 스크립트 추가): `design.md` §11.1 컬럼·인덱스 `(level_id, time_ms asc, created_at asc)`.
- [ ] `lib/data.ts`에 `listSudokuScores(levelId)`, `saveSudokuScore(input)` 추가 — `listTetrisScores` / `saveTetrisScore` 패턴 복제, Supabase 미설정 시 빈 목록·`saved: false` 폴백.
- [ ] (선택) 로컬 개발용 `seedSudokuScores` 더미 데이터가 있으면 테트리스와 동일 패턴으로 추가.

---

## 2. 서버 검증·API

- [ ] `lib/sudoku/validate.ts`(이름 가칭): 81자 그리드 문자열·완전판 규칙 검사, `givenMask`와 `playerGrid` 고정칸 일치 검사.
- [ ] `app/api/sudoku/scores/route.ts`: `GET ?level=1..10`, `POST` 바디 검증 → `saveSudokuScore`, 에러 시 400/500 메시지는 테트리스 API와 톤 통일.
- [ ] (선택) `design.md` §11.3 **시간 클램프**·간단 **레이트 리밋**(IP/쿠키 기준은 프로젝트 관례에 따름).

---

## 3. 레벨·도메인 로직

- [ ] `lib/sudoku/level-profiles.ts`: `levelId` → 생성 파라미터 매핑(알고리즘 연동 후 튜닝).
- [ ] `lib/sudoku/grid.ts`: `puzzle`/`solution`/`givenMask`/`playerGrid` 복사·동기화 헬퍼, 충돌 집합 계산(O(81) 스캔).
- [ ] 클라이언트 세션 상태: `design.md` §5 `ScreenPhase`, §6.2 `SudokuSession` 반영.

---

## 4. Web Worker

- [ ] Worker 엔트리에서 `GenerateRequest` 수신 → 생성기 호출 → `progress` / `success` / `error` 포스트.
- [ ] **generationId** 및 **취소**(메시지 또는 Worker terminate) 처리; 메인에서 옛 응답 무시.
- [ ] Next.js에서 Worker 번들 경로 확정(`new URL(..., import.meta.url)` 또는 `public/workers/...` — 프로젝트 빌드 방식에 맞게).

---

## 5. 페이지·클라이언트 UI

- [ ] `app/sudoku/page.tsx`: `dynamic = "force-dynamic"` 여부 결정, 메타·canonical·OG·JSON-LD(`design.md` §14).
- [ ] `app/sudoku/sudoku-client.tsx`:
  - [ ] 레벨 탭 1–10(`.sudoku-level-tabs`, 테트리스 탭 UX 정렬).
  - [ ] `idle` → `generating` → `ready` → `playing` / `paused` / `completed` 전이.
  - [ ] **Canvas**: DPR, 리사이즈, 보드+패드 레이아웃, 테마 CSS 변수 읽기.
  - [ ] 포인터 히트 테스트, 키보드(화살표/WASD, 1–9, 삭제, P), 폼 포커스 시 단축키 비활성화.
  - [ ] 생성 중 **프로그레스 바** + 취소; 500ms+ 시 보조 문구/indeterminate 허용.
  - [ ] 일시정지 시 입력 차단 + 오버레이; 타이머 `performance.now()` 누적 규칙.
  - [ ] 클리어 시 `POST /api/sudoku/scores`, 성공/실패 메시지, `hasSubmitted` 류 상태.
  - [ ] `dopt-sudoku-player-name`, 로컬 베스트 `dopt-sudoku-best-v1`.
  - [ ] 리더보드 `GET` 로딩/에러; 레벨 변경 시 해당 `level` 목록 갱신.
  - [ ] `aria-live` 선택 셀 요약.

---

## 6. 스타일

- [ ] `app/globals.css`에 `.sudoku-*` 블록 추가: `.tetris-*` 그리드·패널·탭·오버레이를 복제해 이질감 제거, 반응형 브레이크포인트 정리.

---

## 7. 사이트 연동·SEO

- [ ] `public/images/utilities/sudoku-preview.svg` 추가.
- [ ] 홈/유틸 시드, 사이트맵, 유틸 목록 등 기존 테트리스·다른 유틸과 동일한 진입점에 `/sudoku` 반영(프로젝트 규칙 파일 검색 후 수정).
- [ ] 필요 시 `.codex/skills/dopt-seo-indexing` 기준으로 robots/구조화 데이터 재점검.

---

## 8. 검증 마무리

- [ ] `pnpm build`(또는 프로젝트 표준) 및 타입체크 통과.
- [ ] `design.md` §15 수동 체크리스트 실행(레벨 전환, 취소, 모바일 패드-only 등).
- [ ] 본 `todo.md` 체크 상태 최신화.

---

## 사용자(알고리즘 제공자) 측 기대 사항

아래는 에이전트가 가정하고 맞춰야 하는 **입력 계약**이다.

- `levelId`와 시드(옵션)를 받아 완성된 `puzzle`, `solution`, 메타데이터를 반환할 것.
- 생성 중 `progress` 콜백을 호출할 수 있으면 UI 품질이 좋아진다(없어도 단계형 가중치로 대체 가능).
- 유일해 실패 시 재시도/폐기 정책은 알고리즘 내부에서 처리하고, 최종적으로는 `error`로 통지 가능하게 할 것.
