import { unstable_noStore as noStore } from "next/cache";

import { ProfilePhoto } from "@/components/profile-photo";
import { SiteHeader } from "@/components/site-header";
import { getProfileBundle, getProfilePhotoUrl } from "@/lib/data";

export default async function AboutPage() {
  noStore();
  const bundle = await getProfileBundle();
  const photoUrl = await getProfilePhotoUrl(bundle.profile.photo_path);

  return (
    <div className="page-shell">
      <SiteHeader current="about" />

      <section className="panel profile-grid">
        <div>
          <ProfilePhoto url={photoUrl} />
        </div>
        <div className="stack">
          <div className="eyebrow">about</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2.4rem, 4vw, 4rem)", marginBottom: 12 }}>
            {bundle.profile.greeting || "안녕하세요. DOPT입니다."}
          </h1>
          <p className="hero-copy" style={{ margin: 0, maxWidth: "unset" }}>
            {bundle.profile.bio || "이곳은 제가 좋아하는 것과 직접 만든 프로젝트를 담아두는 개인 공간입니다."}
          </p>
        </div>
      </section>

      <section className="section panel">
        <h2 className="section-title">Projects</h2>
        {bundle.projects.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            아직 정리된 프로젝트가 없습니다.
          </p>
        ) : (
          <div className="list">
            {bundle.projects.map((project) => (
              <div key={project.id} className="list-item">
                <div className="list-item-header">
                  <h3 style={{ margin: 0 }}>{project.title}</h3>
                  <span className="utility-path">{project.project_url}</span>
                </div>
                <p>{project.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section panel">
        <h2 className="section-title">Links</h2>
        {bundle.links.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            등록된 외부 링크가 없습니다.
          </p>
        ) : (
          <div className="link-list">
            {bundle.links.map((link) => (
              <a key={link.id} className="external-link" href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
