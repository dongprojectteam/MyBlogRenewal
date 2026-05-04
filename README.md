# DOPT

개인 취미 공간이자 유틸 허브를 목표로 하는 `Next.js + TypeScript + Supabase + Vercel` 프로젝트입니다.

## 환경 변수

프로젝트 루트에 `.env.local` 파일을 만들고 아래처럼 입력합니다.

```env
PASSWORD=abc
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

설명:

- `PASSWORD`
  - 관리자 비밀번호의 앞부분
  - 실제 로그인 비밀번호는 `PASSWORD + 오늘 날짜(MMDD)`
- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase 프로젝트 주소
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - 브라우저에서 사용 가능한 공개 키
- `SUPABASE_SECRET_KEY`
  - 서버 전용 비밀 키
  - 절대 브라우저나 공개 저장소에 노출하면 안 됨

## Supabase에서 무엇을 어디서 가져오나

최신 Supabase에서는 예전 `anon`, `service_role` 대신 보통 아래 3개만 보면 됩니다.

1. `Project URL`
2. `Publishable key`
3. `Secret key`

### 각 값의 의미

`Project URL`

- 예: `https://abcdefghijk.supabase.co`
- 이 앱이 어느 Supabase 프로젝트에 연결할지 알려주는 주소

`Publishable key`

- 예: `sb_publishable_...`
- 브라우저에서 사용 가능한 공개 키
- 이 프로젝트에서는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`에 넣음

`Secret key`

- 예: `sb_secret_...`
- 서버에서만 써야 하는 비밀 키
- 관리자 쓰기 작업, 파일 업로드/다운로드 같은 서버 작업에 사용
- 이 프로젝트에서는 `SUPABASE_SECRET_KEY`에 넣음

### 어디서 복사하나

방법 1. `Connect` 화면

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트를 엽니다.
2. `Connect`를 누릅니다.
3. 여기서 보통 아래를 바로 볼 수 있습니다.
   - `Project URL`
   - `Publishable key`

방법 2. `Settings > API Keys`

1. 프로젝트를 엽니다.
2. `Settings`
3. `API Keys`
4. 여기서 아래를 확인합니다.
   - `Publishable key`
   - `Secret key`
   - 필요하면 `Legacy API Keys`
     - `anon`
     - `service_role`

이 프로젝트에서는 최신 기준으로 아래처럼 넣으면 됩니다.

```env
PASSWORD=abc
NEXT_PUBLIC_SUPABASE_URL=https://jfrylcjguarmmpmgttnt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

핵심:

- `anon key`는 필수가 아님
- `service_role key`도 최신 기준에서는 필수가 아님
- 이 프로젝트는 `Publishable key + Secret key` 조합을 사용

## Supabase 설정 순서

### 1. 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. 프로젝트 준비 완료 후 `Connect` 또는 `Settings > API Keys` 확인

공식 참고:

- [Understanding API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [API keys 상세 문서](https://supabase.com/docs/guides/api/api-keys)

### 2. 테이블 생성

Supabase SQL Editor에서 아래 SQL을 실행합니다.

```sql
create extension if not exists "pgcrypto";

create table if not exists public.visualizations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  url text not null unique,
  visible boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null,
  file_size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  created_at timestamptz not null default now()
);

create table if not exists public.profile (
  id uuid primary key default gen_random_uuid(),
  greeting text not null default '',
  bio text not null default '',
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  project_url text not null default '',
  start_year integer,
  end_year integer,
  screenshot_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visualizations_sort_order_idx on public.visualizations (sort_order);
create index if not exists profile_projects_sort_order_idx on public.profile_projects (sort_order);
create index if not exists profile_links_sort_order_idx on public.profile_links (sort_order);
```

이미 `profile_projects` 테이블을 만든 경우에는 아래 SQL도 한 번 실행합니다.

```sql
alter table public.profile_projects add column if not exists start_year integer;
alter table public.profile_projects add column if not exists end_year integer;
alter table public.profile_projects add column if not exists screenshot_url text;
```

### 3. Storage bucket 생성

Supabase Storage에서 아래 bucket 2개를 만듭니다.

- `admin-files`
- `profile-images`

권장:

- 둘 다 `private`

공식 참고:

- [Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## Vercel 설정

### 1. 저장소 연결

1. 코드를 GitHub/GitLab/Bitbucket에 push
2. [Vercel Dashboard](https://vercel.com/dashboard) 접속
3. `New Project`
4. 저장소 import
5. Framework가 `Next.js`인지 확인

### 2. Vercel 환경 변수 등록

`Project Settings > Environment Variables`에 아래 값을 등록합니다.

- `PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

권장 환경:

- `Production`
- `Preview`
- `Development`

### 3. 첫 배포 후 확인

- `/`
- `/about`
- `/admin`

공식 참고:

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
- `password`: `.env.local`의 `PASSWORD` + 오늘 날짜(`MMDD`)

예:

```env
PASSWORD=abc
```

5월 3일이면 비밀번호는:

```txt
abc0503
```

날짜 기준은 `Asia/Seoul`입니다.
