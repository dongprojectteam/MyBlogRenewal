import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { MojibakeClient } from "./mojibake-client";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Korean Text Repair";
const pageDescription = "UTF-8, CP949, EUC-KR, Windows-1252, URI 인코딩 문제로 깨진 한글 텍스트의 복구 후보를 찾아주는 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/mojibake",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/mojibake",
    type: "website",
    images: ["/images/utilities/mojibake-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/mojibake-preview.svg"],
  },
};

export default function MojibakePage() {
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
        name: "DOPT Korean Text Repair",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/mojibake`,
        inLanguage: "ko-KR",
        featureList: ["CP949 repair", "EUC-KR repair", "Latin-1 repair", "URI decoding"],
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
      <MojibakeClient />
    </div>
  );
}
