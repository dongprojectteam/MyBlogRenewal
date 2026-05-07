import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { DiagramClient } from "./diagram-client";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Diagram Previewer";
const pageDescription =
  "Mermaid, PlantUML, Markdown 문서 안의 다이어그램을 브라우저에서 바로 렌더링하고 미리보는 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/diagram",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/diagram",
    type: "website",
    images: ["/images/utilities/diagram-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/diagram-preview.svg"],
  },
};

export default function DiagramPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "DOPT",
        url: siteUrl,
        inLanguage: "ko-KR",
      },
      {
        "@type": "SoftwareApplication",
        name: "DOPT Diagram Previewer",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/diagram`,
        inLanguage: "ko-KR",
        featureList: ["Mermaid rendering", "PlantUML rendering", "Markdown preview"],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
        },
      },
    ],
  };

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />
      <DiagramClient />
    </div>
  );
}
