# DOPT

媛쒖씤 痍⑤? 怨듦컙?댁옄 ?좏떥 ?덈툕瑜?紐⑺몴濡??섎뒗 `Next.js + TypeScript + Supabase + Vercel` ?꾨줈?앺듃?낅땲??

## ?섍꼍 蹂??
?꾨줈?앺듃 猷⑦듃??`.env.local` ?뚯씪??留뚮뱾怨??꾨옒泥섎읆 ?낅젰?⑸땲??

```env
PASSWORD=abc
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

?ㅻ챸:

- `PASSWORD`
  - 愿由ъ옄 鍮꾨?踰덊샇???욌?遺?  - 관리자 로그인 비밀번호
- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase ?꾨줈?앺듃 二쇱냼
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - 釉뚮씪?곗??먯꽌 ?ъ슜 媛?ν븳 怨듦컻 ??- `SUPABASE_SECRET_KEY`
  - ?쒕쾭 ?꾩슜 鍮꾨? ??  - ?덈? 釉뚮씪?곗???怨듦컻 ??μ냼???몄텧?섎㈃ ????
## Supabase?먯꽌 臾댁뾿???대뵒??媛?몄삤??
理쒖떊 Supabase?먯꽌???덉쟾 `anon`, `service_role` ???蹂댄넻 ?꾨옒 3媛쒕쭔 蹂대㈃ ?⑸땲??

1. `Project URL`
2. `Publishable key`
3. `Secret key`

### 媛?媛믪쓽 ?섎?

`Project URL`

- ?? `https://abcdefghijk.supabase.co`
- ???깆씠 ?대뒓 Supabase ?꾨줈?앺듃???곌껐?좎? ?뚮젮二쇰뒗 二쇱냼

`Publishable key`

- ?? `sb_publishable_...`
- 釉뚮씪?곗??먯꽌 ?ъ슜 媛?ν븳 怨듦컻 ??- ???꾨줈?앺듃?먯꽌??`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`???ｌ쓬

`Secret key`

- ?? `sb_secret_...`
- ?쒕쾭?먯꽌留??⑥빞 ?섎뒗 鍮꾨? ??- 愿由ъ옄 ?곌린 ?묒뾽, ?뚯씪 ?낅줈???ㅼ슫濡쒕뱶 媛숈? ?쒕쾭 ?묒뾽???ъ슜
- ???꾨줈?앺듃?먯꽌??`SUPABASE_SECRET_KEY`???ｌ쓬

### ?대뵒??蹂듭궗?섎굹

諛⑸쾿 1. `Connect` ?붾㈃

1. [Supabase Dashboard](https://supabase.com/dashboard)?먯꽌 ?꾨줈?앺듃瑜??쎈땲??
2. `Connect`瑜??꾨쫭?덈떎.
3. ?ш린??蹂댄넻 ?꾨옒瑜?諛붾줈 蹂????덉뒿?덈떎.
   - `Project URL`
   - `Publishable key`

諛⑸쾿 2. `Settings > API Keys`

1. ?꾨줈?앺듃瑜??쎈땲??
2. `Settings`
3. `API Keys`
4. ?ш린???꾨옒瑜??뺤씤?⑸땲??
   - `Publishable key`
   - `Secret key`
   - ?꾩슂?섎㈃ `Legacy API Keys`
     - `anon`
     - `service_role`

???꾨줈?앺듃?먯꽌??理쒖떊 湲곗??쇰줈 ?꾨옒泥섎읆 ?ｌ쑝硫??⑸땲??

```env
PASSWORD=abc
NEXT_PUBLIC_SUPABASE_URL=https://jfrylcjguarmmpmgttnt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

?듭떖:

- `anon key`???꾩닔媛 ?꾨떂
- `service_role key`??理쒖떊 湲곗??먯꽌???꾩닔媛 ?꾨떂
- ???꾨줈?앺듃??`Publishable key + Secret key` 議고빀???ъ슜

## Supabase ?ㅼ젙 ?쒖꽌

### 1. ?꾨줈?앺듃 ?앹꽦

1. [Supabase Dashboard](https://supabase.com/dashboard)?먯꽌 ???꾨줈?앺듃 ?앹꽦
2. ?꾨줈?앺듃 以鍮??꾨즺 ??`Connect` ?먮뒗 `Settings > API Keys` ?뺤씤

怨듭떇 李멸퀬:

- [Understanding API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [API keys ?곸꽭 臾몄꽌](https://supabase.com/docs/guides/api/api-keys)





### 3. Storage bucket ?앹꽦

Supabase Storage?먯꽌 ?꾨옒 bucket 2媛쒕? 留뚮벊?덈떎.

- `admin-files`
- `profile-images`

沅뚯옣:

- ????`private`

怨듭떇 李멸퀬:

- [Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## Vercel ?ㅼ젙

### 1. ??μ냼 ?곌껐

1. 肄붾뱶瑜?GitHub/GitLab/Bitbucket??push
2. [Vercel Dashboard](https://vercel.com/dashboard) ?묒냽
3. `New Project`
4. ??μ냼 import
5. Framework媛 `Next.js`?몄? ?뺤씤

### 2. Vercel ?섍꼍 蹂???깅줉

`Project Settings > Environment Variables`???꾨옒 媛믪쓣 ?깅줉?⑸땲??

- `PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

沅뚯옣 ?섍꼍:

- `Production`
- `Preview`
- `Development`

### 3. 泥?諛고룷 ???뺤씤

- `/`
- `/about`
- `/admin`

怨듭떇 李멸퀬:

- [Next.js on Vercel](https://vercel.com/docs/concepts/next.js/overview)
- [Project Settings](https://vercel.com/docs/projects/project-configuration/project-settings)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Deploying Git Repositories](https://vercel.com/docs/deployments/git)

## 濡쒖뺄 ?ㅽ뻾

```bash
npm install
npm run dev
```

釉뚮씪?곗?:

- `http://localhost:3000`

## 愿由ъ옄 濡쒓렇??
- `id`: `admin`


## Project SEO Skill

????μ냼?먮뒗 ?꾨줈?앺듃 ?꾩슜 SEO ?ㅽ궗???ы븿?섏뼱 ?덉뒿?덈떎.

- 寃쎈줈: `.codex/skills/dopt-seo-indexing/SKILL.md`
- 紐⑹쟻: 援ш? ???몃? 寃???몄텧 媛쒖꽑 ?붿껌 ?? ?꾩옱 ?곹깭瑜?癒쇱? ?먭??섍퀬 ?꾩슂???섏젙留??곸슜
- 怨좎젙 ?꾨찓?? `https://www.doptsw.org`

?ㅽ궗? ?꾨옒瑜??먮룞 ?먭??⑸땲??

1. `app/layout.tsx` ?꾩뿭 硫뷀??곗씠??2. `app/robots.ts`, `app/sitemap.ts`
3. ?섏씠吏 ?⑥쐞 硫뷀?(`/`, `/about`, 媛??좏떥)
4. ?좏떥 JSON-LD(`WebSite`, `SoftwareApplication`)
5. ?좉퇋 ?좏떥 ?먯?(`app/` ?쇱슦??+ `lib/data.ts` + `lib/seed.ts`)

?좉퇋 ?좏떥??諛쒓껄?섎㈃ ?대떦 ?좏떥??硫뷀?/罹먮끂?덉뺄/?ъ씠?몃㏊/援ъ“?붾뜲?댄꽣瑜?蹂닿컯?⑸땲??


