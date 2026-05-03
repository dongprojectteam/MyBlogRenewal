import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/auth";

const errorMessages: Record<string, string> = {
  invalid_credentials: "아이디 또는 비밀번호가 올바르지 않습니다.",
  missing_fields: "아이디와 비밀번호를 모두 입력해 주세요.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authed = await isAdminAuthenticated();
  if (authed) {
    redirect("/admin/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorKey = typeof resolvedSearchParams?.error === "string" ? resolvedSearchParams.error : "";
  const errorMessage = errorMessages[errorKey];

  return (
    <div className="page-shell">
      <div className="panel" style={{ maxWidth: 520, margin: "72px auto 0" }}>
        <div className="eyebrow">admin login</div>
        <h1>DOPT Admin</h1>
        <p className="muted" style={{ lineHeight: 1.7 }}>
          관리자 로그인 후 소개 페이지, 유틸 목록, 메모, 파일을 관리할 수 있습니다.
        </p>

        {errorMessage ? <div className="notice" style={{ marginBottom: 18 }}>{errorMessage}</div> : null}

        <form action="/admin/login" method="post" className="stack">
          <div className="field">
            <label className="label" htmlFor="admin-id">
              ID
            </label>
            <input className="input" id="admin-id" name="id" defaultValue="admin" />
          </div>
          <div className="field">
            <label className="label" htmlFor="admin-password">
              Password
            </label>
            <input className="input" id="admin-password" name="password" type="password" />
          </div>
          <div className="actions">
            <button className="button" type="submit">
              login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
