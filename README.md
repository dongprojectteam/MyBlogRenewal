# DOPT

개인 공간과 유틸리티를 함께 운영하는 `Next.js + TypeScript + Supabase + Vercel` 프로젝트입니다.

## 환경 변수

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정하세요.

```env
PASSWORD=your_admin_password
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

설명:

- `PASSWORD`
  - 관리자 로그인 비밀번호
- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - 클라이언트에서 사용하는 공개 키
- `SUPABASE_SECRET_KEY`
  - 서버 전용 비밀 키 (절대 클라이언트에 노출 금지)

## Supabase 키 확인

Supabase 대시보드에서 아래 3가지를 확인합니다.

1. `Project URL`
2. `Publishable key`
3. `Secret key`

확인 경로:

1. `Connect` 패널
2. `Settings > API Keys`

참고 문서:

- [Understanding API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [API keys](https://supabase.com/docs/guides/api/api-keys)

## Storage 버킷

Supabase Storage에 아래 버킷을 생성합니다.

- `admin-files`
- `profile-images`

권장 설정:

- `private`

참고 문서:

- [Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## Tetris 리더보드

`/tetris` 유틸은 `tetris_scores` 테이블을 사용합니다.

Supabase SQL Editor에서 아래 파일 내용을 실행하세요.

```text
supabase/tetris_scores.sql
```

포함 내용:

- `tetris_scores` 테이블 생성
- 모드별 점수/시간 정렬 인덱스 생성
- `/tetris` 유틸을 `visualizations` 목록에 등록

현재 서버 API가 `SUPABASE_SECRET_KEY`로 읽기/쓰기를 수행하므로, 공개 클라이언트에서 직접 테이블에 접근하지 않습니다.

## Sudoku 리더보드

`/sudoku` 유틸은 `sudoku_scores` 테이블을 사용합니다.

```text
supabase/sudoku_scores.sql
```

## Vercel 설정

1. GitHub/GitLab/Bitbucket 저장소를 연결합니다.
2. Vercel에서 `New Project`로 프로젝트를 import 합니다.
3. Framework가 `Next.js`인지 확인합니다.

환경 변수 등록 경로:

- `Project Settings > Environment Variables`

등록 항목:

- `PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

권장 환경:

- `Production`
- `Preview`
- `Development`

참고 문서:

- [Next.js on Vercel](https://vercel.com/docs/concepts/next.js/overview)
- [Project Settings](https://vercel.com/docs/projects/project-configuration/project-settings)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Deploying Git Repositories](https://vercel.com/docs/deployments/git)

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저:

- `http://localhost:3000`

## 주요 유틸리티

- `/diagram`: Mermaid, PlantUML, Markdown 문서 안의 다이어그램을 미리보고 SVG/PNG로 내보냅니다. 파일 선택과 드래그 앤 드롭 가져오기를 지원합니다.
- `/exif`: 사진 EXIF 메타데이터를 브라우저에서 확인, 정리, 편집, 내보냅니다. 이미지 파일 선택과 드래그 앤 드롭을 지원합니다.
- `/mindmap`: 마인드맵을 직접 만들고 노드 드래그, 계층 변경, 브라우저 저장, JSON/Markdown/OPML/FreeMind/Mermaid/CSV/SVG/PNG 가져오기와 내보내기를 지원합니다.

## 유틸리티 기획 문서

유틸리티별 요구사항, 설계, TODO는 `mockups/utilities/<slug>/` 아래에 둡니다.

- `mockups/utilities/diagram/`
- `mockups/utilities/exif/`
- `mockups/utilities/mindmap/`

## 관리자 로그인

- `id`: `admin`
- `password`: `.env.local`의 `PASSWORD` 값

## SEO 기준

이 프로젝트는 SEO 관련 사이트 URL을 고정값으로 사용합니다.

- `https://www.doptsw.org`

신규 공개 유틸리티를 추가할 때 확인할 항목:

- 페이지 단위 `Metadata`와 canonical URL
- Open Graph/Twitter preview image
- `SoftwareApplication` JSON-LD
- `app/sitemap.ts` 정적 또는 동적 노출
- `lib/seed.ts` 공개 유틸리티 seed와 홈 설명
- `public/images/utilities/<slug>-preview.svg`
- `mockups/utilities/<slug>/` 문서 세트

## Project SEO Skill

이 저장소에는 프로젝트 전용 SEO 스킬이 포함되어 있습니다.

- 경로: `.codex/skills/dopt-seo-indexing/SKILL.md`
- 목적: 외부 검색 노출 개선 요청 시 현재 상태를 먼저 점검하고, 필요한 수정만 적용
- 고정 도메인: `https://www.doptsw.org`

스킬 점검 범위:

1. `app/layout.tsx` 전역 메타데이터
2. `app/robots.ts`, `app/sitemap.ts`
3. 페이지 단위 메타(`/`, `/about`, 각 유틸)
4. 유틸 JSON-LD(`WebSite`, `SoftwareApplication`)
5. 신규 유틸 탐지(`app/` 라우트 + `lib/data.ts` + `lib/seed.ts`)
