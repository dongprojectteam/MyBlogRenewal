import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { RegexClient } from "./regex-client";
import { Analytics } from "@vercel/analytics/next"

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Regex Tester";
const pageDescription = "JavaScript 정규식을 테스트하고 매치 하이라이트, 캡처 그룹, 치환 결과를 바로 확인하는 정규식 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/regex",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/regex",
    type: "website",
    images: ["/images/utilities/regex-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/regex-preview.svg"],
  },
};

export default function RegexPage() {
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
        name: "DOPT Regex Tester",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/regex`,
        inLanguage: "ko-KR",
        featureList: ["Regex matching", "Capture groups", "Match highlighting", "Replacement preview"],
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
        <RegexClient />
      </div>
      <Analytics />
    </>
  );
}
