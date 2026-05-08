import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { TableConverterClient } from "./table-converter-client";
import { Analytics } from "@vercel/analytics/next";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Table Converter";
const pageDescription = "CSV, TSV, Markdown 표, JSON 형식의 표 데이터를 서로 변환하고 미리보는 테이블 변환 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/table-converter",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/table-converter",
    type: "website",
    images: ["/images/utilities/table-converter-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/table-converter-preview.svg"],
  },
};

export default function TableConverterPage() {
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
        name: "DOPT Table Converter",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/table-converter`,
        inLanguage: "ko-KR",
        featureList: ["CSV conversion", "TSV conversion", "Markdown table conversion", "JSON export"],
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
        <TableConverterClient />
      </div>
      <Analytics />
    </>
  );
}
