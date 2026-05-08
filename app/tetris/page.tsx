import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { TetrisClient } from "./tetris-client";
import { Analytics } from "@vercel/analytics/next";

export const dynamic = "force-dynamic";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Tetris Arena";
const pageDescription =
  "고스트 블록, Hold, Next 큐, 여러 게임 모드와 글로벌 리더보드를 지원하는 브라우저 테트리스 게임입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/tetris",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/tetris",
    type: "website",
    images: ["/images/utilities/tetris-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/tetris-preview.svg"],
  },
};

export default function TetrisPage() {
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
        name: "DOPT Tetris Arena",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/tetris`,
        inLanguage: "ko-KR",
        featureList: [
          "Marathon mode",
          "Sprint 40 lines mode",
          "Ultra two-minute mode",
          "Survival mode",
          "Daily challenge",
          "Ghost piece",
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
    <>
      <div className="page-shell">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <SiteHeader />
        <TetrisClient />
      </div>
      <Analytics />
    </>
  );
}
