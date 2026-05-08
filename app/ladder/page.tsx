import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LadderClient } from "./ladder-client";
import { Analytics } from "@vercel/analytics/next"

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Ladder Game";
const pageDescription =
  "참가자와 결과를 입력해 랜덤 사다리로 매칭하고, 애니메이션 경로와 브라우저 기록으로 결과를 다시 확인하는 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/ladder",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/ladder",
    type: "website",
    images: ["/images/utilities/ladder-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/ladder-preview.svg"],
  },
};

export default function LadderPage() {
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
        name: "DOPT Ladder Game",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/ladder`,
        inLanguage: "ko-KR",
        featureList: [
          "Random ladder matching",
          "Animated route reveal",
          "Local browser history",
          "Saved result replay",
          "Complexity control",
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
    <>
      <div className="page-shell">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <SiteHeader />
        <LadderClient />
      </div>
      <Analytics />
    </>
  );
}
