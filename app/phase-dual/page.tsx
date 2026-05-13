import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { PhaseDualClient } from "./phase-dual-client";

export const dynamic = "force-dynamic";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Phase Dual";
const pageDescription =
  "두 격자가 연동된 빙판 슬라이딩 퍼즐. 6종 연동 규칙 아래 캠페인 퍼즐과 매일 갱신되는 데일리 챌린지를 풀고 리더보드에 도전하세요.";
const previewImage = "/images/utilities/phase-dual-preview.svg";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/phase-dual",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/phase-dual",
    type: "website",
    images: [previewImage],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [previewImage],
  },
};

export default function PhaseDualPage() {
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
        name: "DOPT Phase Dual",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/phase-dual`,
        image: `${siteUrl}${previewImage}`,
        inLanguage: "ko-KR",
        featureList: [
          "Twin linked grids",
          "Six link rules",
          "Campaign puzzles",
          "Daily challenge",
          "Canvas board",
          "Global leaderboard",
        ],
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
      <PhaseDualClient />
    </div>
  );
}
