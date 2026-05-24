import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/auth";

const errorMessages: Record<string, string> = {
  invalid_credentials: "The ID or password is incorrect.",
  missing_fields: "Enter both ID and password.",
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
          Sign in to manage the about page, home content, notes, and files.
        </p>

        {errorMessage ? (
          <div className="notice" style={{ marginBottom: 18 }}>
            {errorMessage}
          </div>
        ) : null}

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
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
