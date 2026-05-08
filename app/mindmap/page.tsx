import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { MindMapClient } from "./mindmap-client";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Mind Map Studio - 브라우저 마인드맵 만들기";
const pageDescription =
  "드래그로 구조를 바꾸고 브라우저에 저장하며 JSON, Markdown, OPML, FreeMind, Mermaid, CSV, SVG, PNG로 가져오고 내보내는 로컬 마인드맵 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "마인드맵",
    "마인드맵 만들기",
    "브레인스토밍",
    "브라우저 마인드맵",
    "OPML",
    "FreeMind",
    "Mermaid mindmap",
    "mind map tool",
  ],
  alternates: {
    canonical: "/mindmap",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/mindmap",
    type: "website",
    images: ["/images/utilities/mindmap-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/mindmap-preview.svg"],
  },
};

export default function MindMapPage() {
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
        name: "DOPT Mind Map Studio",
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/mindmap`,
        image: `${siteUrl}/images/utilities/mindmap-preview.svg`,
        inLanguage: "ko-KR",
        isAccessibleForFree: true,
        browserRequirements: "Requires a modern browser with SVG, localStorage, and canvas support.",
        featureList: [
          "캔버스 노드 편집",
          "노드 드래그 위치 조정",
          "드래그 앤 드롭 계층 변경",
          "마우스 휠 확대/축소",
          "브라우저 로컬 저장 및 저장 목록",
          "JSON, Markdown, OPML, FreeMind, Mermaid, CSV 가져오기와 내보내기",
          "파일 선택 및 파일 드롭 가져오기",
          "SVG와 PNG 이미지 내보내기",
          "Leaf 노드 기준 자동 진행률 계산",
          "Outline 편집과 삭제",
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
      <MindMapClient />
    </div>
  );
}
