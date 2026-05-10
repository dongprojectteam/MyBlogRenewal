# [요구사항 명세서] 애니멀 머지 (Animal Merge) - Next.js App

## 1. 프로젝트 개요

* **게임 제목:** 애니멀 머지 (Animal Merge)
* **플랫폼:** Next.js 기반 블로그 내 임베디드 웹 앱
* **핵심 루프:** 위에서 떨어지는 동물 오브젝트를 조준하여 낙하, 같은 종류의 동물이 충돌 시 상위 단계 동물로 병합(Merge)하며 점수를 획득하는 물리 퍼즐 게임.

## 2. 리소스 및 자산 (Assets)

* **이미지 경로:** `public/game_assets/animal_merge/images/` 내 PNG 파일 사용
* `snake.png`, `rabbit.png`, `pig.png`, `sloth.png`, `zebra.png`, `walrus.png`, `bear.png`, `buffalo.png`, `rhino.png`, `whale.png`


* **오디오 경로:** `public/game_assets/animal_merge/audios/`
* 병합 사운드: `merge.ogg` (병합 발생 시 즉시 재생)



## 3. 캐릭터 진화 시스템 (Level Design)

| 레벨 | 캐릭터 명칭 | 이미지 파일명 | 특징 및 크기 비율 |
| --- | --- | --- | --- |
| LV 1 | 뱀 | `snake.png` | 가장 작음, 낮은 마찰력(잘 미끄러짐) |
| LV 2 | 토끼 | `rabbit.png` |  |
| LV 3 | 돼지 | `pig.png` |  |
| LV 4 | 나무늘보 | `sloth.png` | 높은 마찰력(천천히 구름) |
| LV 5 | 얼룩말 | `zebra.png` |  |
| LV 6 | 바다코끼리 | `walrus.png` |  |
| LV 7 | 곰 | `bear.png` |  |
| LV 8 | 버팔로 | `buffalo.png` |  |
| LV 9 | 코뿔소 | `rhino.png` | 무거운 질량(강하게 밀어냄) |
| LV 10 | 고래 | `whale.png` | 최종 단계 (수박 역할) |

## 4. UI/UX 요구사항

* **블로그 통합 스타일:** 블로그의 전역 폰트 및 컬러 테마(Light/Dark)를 유지하며, 게임 컨테이너에 Glassmorphism 효과(Blur, Semi-transparent)를 적용하여 이질감을 최소화함.
* **진화 가이드 (Evolution Roadmap):** 화면 우측 또는 하단에 시계 방향 화살표와 함께 동물 진화 순서를 상시 노출. (예: 뱀 → 토끼 → 돼지 ...)
* **차기 동물 UI (Next Preview):** 상단에 다음에 떨어질 동물의 이미지를 미리 보여줌.
* **아이 트래킹 (Eye Tracking):** 대기 중인 동물의 눈동자가 마우스 커서 또는 터치 위치를 미세하게 추적함.
* **게임 오버 연출:** 제한선 도달 시 라인 점멸 연출과 함께 최종 점수 및 최고 기록(localStorage 연동) 결과창 노출.

## 5. 게임플레이 핵심 로직 (Physics)

* **물리 엔진:** `Matter.js` 활용, 모든 동물을 원형 히트박스(`Bodies.circle`)로 처리.
* **콤보(Combo) 시스템:**
* 병합 발생 후 2초 이내 연속 병합 시 콤보 카운트 증가.
* $점수 = 기본 점수 \times (1 + (콤보 \times 0.5))$ 공식 적용.
* 화면에 부드럽게 상승하며 사라지는 콤보 텍스트 애니메이션 적용.


* **특수 스킬 (Shake):** 쿨타임 또는 게임당 1회 사용 가능한 '지진' 기능으로 물리 객체들을 강제로 섞어 병합 기회 창출.
* **수집 도감:** 특정 동물을 처음 병합할 때마다 해당 동물의 특징과 블로그 카테고리 유머가 섞인 '동물 카드' 팝업 노출.

## 6. 기술적 세부사항

* **프레임워크:** Next.js (React 기반)
* **렌더링:** HTML5 Canvas
* **상태 관리:** React `useState`, `useRef` 및 `localStorage` (최고 기록 및 도감 해금 데이터 저장)
* **반응형:** `ResizeObserver`를 통해 블로그 사이드바 유무에 따라 캔버스 크기 동적 대응.
* **사운드 정책:** 브라우저 오토플레이 방지 정책에 따라 유저의 첫 상호작용(Start 버튼) 이후 오디오 컨텍스트 활성화.
## 7. Asset Preload Requirements (Added)

- Game interaction must stay disabled until all required runtime assets are ready.
- Required assets for gameplay start:
- 10 level animal images (`snake` through `whale`)
- 1 merge sound effect (`merge.ogg`)
- A visible loading experience must appear before the first game start:
- Progress bar with numeric percent
- Short loading status text
- Start button remains disabled until loading is complete
- If one or more assets fail to load, show a non-blocking warning and allow retry.
- Preload should run on first page visit and avoid repeated downloads when browser cache is available.
