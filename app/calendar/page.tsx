import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { CalendarClient } from "./calendar-client";

export const dynamic = "force-dynamic";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Calendar Memo";
const pageDescription = "월별 달력, 한국 공휴일 정보, 날짜별 메모를 함께 관리하는 브라우저 캘린더 유틸리티입니다.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/calendar",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/calendar",
    type: "website",
    images: ["/images/utilities/calendar-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/calendar-preview.svg"],
  },
};

export default function CalendarPage() {
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
        name: "DOPT Calendar Memo Utility",
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/calendar`,
        inLanguage: "ko-KR",
        featureList: ["Monthly calendar", "Korean holiday lookup", "Local date memo"],
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
      <CalendarClient />
    </div>
  );
}
