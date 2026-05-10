# Animal Merge TODO

LLM이 개발을 진행할 때 요구사항과 설계 문서의 모든 세부 사항(Supabase 연동, 물리 엔진 설정, 시각적 디테일 등)을 놓치지 않고 구현할 수 있도록 정리한 TODO 리스트입니다.

## 🏗️ Scaffolding & Setup

* [ ] `app/animal-merge/page.tsx` 생성 (Metadata, JSON-LD, 클라이언트 컴포넌트 호출)
* [ ] `app/animal-merge/merge-client.tsx` 생성 (Game Loop 및 주요 UI 구성)
* [ ] `app/api/merge/rank/route.ts` 생성 (Supabase 점수 등록/조회용 API Proxy)
* [ ] `public/game_assets/animal_merge/images/` 경로에 10종의 동물 PNG 배치
* [ ] `public/game_assets/animal_merge/audios/merge.ogg` 배치
* [ ] `app/sitemap.ts`에 `/animal-merge` 경로 추가

## ⚙️ Game Logic & Physics (Matter.js)

* [ ] `AnimalLevel` 기반의 물리 속성(Radius, Mass, Friction) 상수 정의
* [ ] Matter.js 엔진 초기화 및 캔버스 렌더링 루프 구축
* [ ] 마우스/터치 위치에 따른 상단 대기 동물 이동 로직 구현
* [ ] 클릭 시 물리 바디 생성 및 낙하 로직 구현
* [ ] `collisionStart` 이벤트를 이용한 동일 라벨 동물 병합 로직 구현
* [ ] 병합 시 두 물체의 중간 지점에 차기 레벨 동물 생성 기능
* [ ] 2초 타임 윈도우 기반의 콤보(Combo) 카운트 및 가산점 로직 구현
* [ ] 데드라인 센서(Sensor) 충돌 시 3초 타이머 후 게임 오버 트리거 구현

## 🖥️ UI & Animation

* [ ] 블로그 디자인 시스템을 반영한 Glassmorphism 컨테이너 스타일링
* [ ] 시계 방향 화살표 기반의 **진화 가이드(Evolution Guide)** 컴포넌트 구현
* [ ] 차기 동물 미리보기(Next Preview) UI 구현
* [ ] 콤보 발생 시 Floating Text 및 배지 애니메이션(CSS/Canvas) 구현
* [ ] 대기 동물의 눈동자가 마우스/터치를 추적하는 **아이 트래킹(Eye Tracking)** 로직 구현
* [ ] 병합 시 사운드(`merge.ogg`) 재생 및 신규 바디 스케일 업 애니메이션
* [ ] 특수 스킬: 모든 바디에 랜덤한 외력을 가하는 **셰이크(Shake)** 기능 구현

## 🌐 Supabase & Data Persistence

* [ ] Supabase `animal_merge_ranks` 테이블 스키마 설계 및 연동
* [ ] 점수 전송 시 닉네임 입력 모달 및 유효성 검사(비속어/길이) 구현
* [ ] API Proxy를 통한 점수 검증(Check-sum) 및 DB 쓰기 로직 구현
* [ ] 글로벌 Top 10 리더보드 페칭 및 렌더링
* [ ] `localStorage`를 이용한 로컬 하이스코어 및 도감(Dictionary) 해금 현황 저장

## 💅 Polish & Optimization

* [ ] `next/dynamic`을 사용한 Matter.js 클라이언트 사이드 전용 로딩 처리
* [ ] 브라우저 오디오 정책 대응을 위한 "Start Game" 상호작용 레이어 구현
* [ ] 이미지 프리로딩(Pre-loading) 처리를 통한 캔버스 깜빡임 방지
* [ ] 반응형 레이아웃 대응 (`ResizeObserver` 활용 캔버스 크기 조절)
* [ ] 콤보/병합 시 미세한 화면 흔들림(Screen Shake) 효과 추가

## ✅ Verification

* [ ] 로컬 빌드(`npm run build`) 오류 여부 확인
* [ ] 동물 1~10단계 병합 정상 동작 확인
* [ ] 콤보 점수 가산 및 텍스트 노출 확인
* [ ] 게임 오버 시 Supabase 랭킹 등록 및 실시간 갱신 확인
* [ ] 모바일 환경 터치 조작 및 반응형 레이아웃 확인
## Asset Preload Tasks (Added)

- [ ] Add preload state (`idle/loading/ready/error`) to merge client.
- [ ] Preload all required animal images and merge SFX on mount.
- [ ] Show progress bar (percent + loaded/total) while loading.
- [ ] Disable drop/start interactions before preload is complete.
- [ ] Add retry action when preload fails.
- [ ] Reuse preloaded image/audio instances in game loop.
- [ ] Verify build and initial UX on first load and refresh.
