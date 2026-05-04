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

## 관리자 로그인

- `id`: `admin`
- `password`: `.env.local`의 `PASSWORD` 값

## SEO 기준

이 프로젝트는 SEO 관련 사이트 URL을 고정값으로 사용합니다.

- `https://www.doptsw.org`

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
