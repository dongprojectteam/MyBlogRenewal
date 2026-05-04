---
name: dopt-seo-indexing
description: MyBlogRenewal(DOPT) 프로젝트 전용 SEO/인덱싱 실행 스킬. 사용자가 구글 등 외부 검색 노출 개선, SEO 수정, robots/sitemap/메타데이터/구조화데이터/Search Console 대응을 요청할 때 사용한다. 현재 코드를 먼저 점검해 수정이 필요한 경우에만 변경하며, 새 유틸 라우트와 공개 유틸 URL을 탐지해 해당 페이지 검색 노출 요소를 누락 없이 반영한다.
---

# DOPT SEO Indexing (Project-only)

고정 사이트 URL은 `https://www.doptsw.org`를 사용한다.

## Rules

- 기존 상태를 먼저 확인하고, 필요할 때만 수정한다.
- 이미 올바르면 파일을 건드리지 않는다.
- 삭제된 라우트/유틸의 SEO 잔재(사이트맵, 시드, 링크)는 함께 정리한다.
- 내부 관리자 경로(`/admin*`)는 색인 대상에서 제외한다.

## Audit Checklist

1. Global metadata
- `app/layout.tsx` 점검
- `metadataBase`, 기본 `title/description`, `openGraph`, `twitter`, canonical 기본값 확인
- 도메인 상수가 `https://www.doptsw.org`인지 확인

2. Crawling & sitemap
- `app/robots.ts` 존재 및 `sitemap.xml` 연결 확인
- `app/sitemap.ts`에서 공개 페이지만 포함하는지 확인
- 삭제된 경로나 내부 경로가 남아 있으면 제거

3. Page-level metadata
- 공개 페이지(`/`, `/about`, 각 유틸)별 `title`, `description`, `alternates.canonical`, `openGraph`, `twitter` 확인
- 클라이언트 페이지 유틸은 라우트 `layout.tsx`에서 메타 적용

4. Structured data
- 유틸 페이지에 최소 `WebSite`, `SoftwareApplication` JSON-LD 확인
- 페이지 목적과 맞지 않는 스키마 제거

## New Utility Detection

항상 아래 3가지를 함께 확인해 신규 유틸을 판단한다.

1. `app/`의 공개 라우트 폴더
2. `lib/data.ts`의 `getPublicVisualizations()`로 노출되는 URL 구조
3. `lib/seed.ts`의 시드 유틸/프로젝트 URL

신규 유틸을 찾으면:
- 해당 라우트 존재 여부 확인
- 페이지 메타/캐노니컬/OG/Twitter 반영
- 사이트맵 포함 여부 반영
- 필요 시 JSON-LD 추가

## Edit Policy

- 최소 수정 원칙으로 변경한다.
- 인코딩 깨짐 문자열이 보이면 같은 변경 맥락에서 정리한다.
- 제목/설명 문구는 페이지별로 중복 없이 작성한다.

## Validation

- 가능하면 `npm run build` 실행
- `robots.txt`, `sitemap.xml` 생성 여부 확인
- 변경 파일과 이유를 짧게 요약

## Search Console Runbook (on request)

1. 속성: `https://www.doptsw.org`
2. 사이트맵 제출: `https://www.doptsw.org/sitemap.xml`
3. 색인 요청: `/`, `/about`, `/diff`, 신규 유틸
4. 페이지 인덱싱 제외 사유 모니터링 후 재검증
