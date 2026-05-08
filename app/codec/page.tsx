import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CodecClient } from "./codec-client";
import { Analytics } from "@vercel/analytics/next";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Codec Toolkit";
const pageDescription = "JSON 포맷팅, URL 인코딩, Base64 변환, JWT 페이로드 확인을 한 화면에서 처리하는 개발자 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/codec",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/codec",
    type: "website",
    images: ["/images/utilities/codec-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/codec-preview.svg"],
  },
};

export default function CodecPage() {
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
        name: "DOPT Codec Toolkit",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/codec`,
        inLanguage: "ko-KR",
        featureList: ["JSON formatter", "URL encoder", "Base64 decoder", "JWT inspector"],
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
        <CodecClient />
      </div>
      <Analytics />
    </>
  );
}
