import type { Metadata } from "next";

const pageTitle = "문서 비교 유틸 - DOPT";
const pageDescription = "텍스트를 라인/문자 단위로 비교해 변경점을 빠르게 확인하는 문서 비교 유틸입니다.";
const siteUrl = "https://www.doptsw.org";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/diff",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/diff",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
};

export default function DiffLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "DOPT",
        url: siteUrl,
      },
      {
        "@type": "SoftwareApplication",
        name: "DOPT Text Diff Utility",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/diff`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      {children}
    </>
  );
}


