import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";

import { ProfilePhoto } from "@/components/profile-photo";
import { SiteHeader } from "@/components/site-header";
import { getProfileBundle, getProfilePhotoUrl } from "@/lib/data";

const pageTitle = "About - DOPT";
const pageDescription = "DOPT의 소개, 프로젝트 이력, 외부 링크를 모아둔 프로필 페이지입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/about",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
};

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function formatProjectYears(startYear: number | null, endYear: number | null) {
  if (startYear && endYear) return startYear === endYear ? String(startYear) : `${startYear} - ${endYear}`;
  if (startYear) return `${startYear} -`;
  if (endYear) return String(endYear);
  return "";
}

export default async function AboutPage() {
  noStore();
  const bundle = await getProfileBundle();
  const photoUrl = await getProfilePhotoUrl(bundle.profile.photo_path);

  return (
    <div className="page-shell">
      <SiteHeader current="about" />

      <section className="panel about-flow-panel">
        <div className="stack">
          <div className="eyebrow">about</div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              fontSize: "clamp(2.1rem, 3.4vw, 3.2rem)",
              marginBottom: 12,
            }}
          >
            {bundle.profile.greeting || "안녕하세요. DOPT입니다."}
          </h1>
          <div className="about-flow-copy">
            <div className="about-inline-photo">
              <ProfilePhoto url={photoUrl} />
            </div>
            <p className="hero-copy preserve-lines" style={{ margin: 0, maxWidth: "unset" }}>
              {bundle.profile.bio || "내가 좋아하는 것들과 직접 만든 프로젝트를 모아두는 개인 공간입니다."}
            </p>
          </div>
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
            {bundle.projects.map((project) => {
              const years = formatProjectYears(project.start_year, project.end_year);
              const external = isExternalUrl(project.project_url);

              return (
                <div key={project.id} className="list-item project-item">
                  {project.screenshot_url ? (
                    <img className="project-screenshot" src={project.screenshot_url} alt={`${project.title} screenshot`} />
                  ) : null}
                  <div className="project-content">
                    <div className="list-item-header">
                      <div>
                        <h3 style={{ margin: 0 }}>{project.title}</h3>
                        {years ? <div className="project-years">{years}</div> : null}
                      </div>
                      <a
                        className="utility-path"
                        href={project.project_url}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noreferrer" : undefined}
                      >
                        {project.project_url}
                      </a>
                    </div>
                    <p>{project.description}</p>
                  </div>
                </div>
              );
            })}
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
