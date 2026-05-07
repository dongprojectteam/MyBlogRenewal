import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { TimeClient } from "./time-client";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Time Converter";
const pageDescription = "Unix timestamp, ISO 날짜, 로컬 시간, UTC, KST와 주요 시간대를 변환하고 날짜 계산을 돕는 시간 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/time",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/time",
    type: "website",
    images: ["/images/utilities/time-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/time-preview.svg"],
  },
};

export default function TimePage() {
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
        name: "DOPT Time Converter",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/time`,
        inLanguage: "ko-KR",
        featureList: ["Unix timestamp conversion", "Timezone comparison", "Date arithmetic"],
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
      <TimeClient />
    </div>
  );
}
