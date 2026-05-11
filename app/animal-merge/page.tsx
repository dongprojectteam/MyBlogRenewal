import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { MergeClient } from "./merge-client";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Animal Merge";
const pageDescription =
  "동물을 떨어뜨리고 합쳐 진화시키는 브라우저 물리 퍼즐 게임입니다. 콤보와 셰이크를 활용해 최고 점수를 만들고 글로벌 리더보드에 도전해 보세요.";
const previewImage = "/images/utilities/animal-merge-preview.svg";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: ["Animal Merge", "동물 머지", "머지 게임", "물리 퍼즐", "브라우저 게임", "DOPT"],
  alternates: { canonical: "/animal-merge" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/animal-merge",
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

export default function AnimalMergePage() {
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
        name: "DOPT Animal Merge",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/animal-merge`,
        image: `${siteUrl}${previewImage}`,
        inLanguage: "ko-KR",
        featureList: [
          "Physics-based animal merging",
          "Endless mode",
          "Whale Rush mode",
          "Time Attack mode",
          "Shake power-up",
          "Global leaderboard",
        ],
        offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
      },
    ],
  };

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />
      <MergeClient />
    </div>
  );
}
