import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { SudokuClient } from "./sudoku-client";

export const dynamic = "force-dynamic";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Sudoku";
const pageDescription =
  "10단계 난이도의 자동 생성 스도쿠입니다. Canvas 보드와 숫자 패드로 플레이하고, 클리어 시간으로 전 세계 리더보드에 도전해 보세요.";
const previewImage = "/images/utilities/sudoku-preview.svg";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: ["Sudoku", "스도쿠", "온라인 스도쿠", "스도쿠 게임", "숫자 퍼즐", "DOPT"],
  alternates: {
    canonical: "/sudoku",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/sudoku",
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

export default function SudokuPage() {
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
        name: "DOPT Sudoku",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/sudoku`,
        image: `${siteUrl}${previewImage}`,
        inLanguage: "ko-KR",
        featureList: [
          "10 difficulty levels",
          "Auto-generated puzzles",
          "Canvas board",
          "Keyboard and numpad input",
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
      <SudokuClient />
    </div>
  );
}
