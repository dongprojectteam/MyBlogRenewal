import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { ChartStudioClient } from "./chart-studio-client";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Chart Studio";
const pageDescription =
  "Create polished 3D-style bar and line charts from manual data, CSV, TSV, or JSON directly in the browser.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "3D chart",
    "line chart",
    "bar chart",
    "CSV chart",
    "JSON chart",
    "chart maker",
    "data visualization",
  ],
  alternates: {
    canonical: "/chart-studio",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/chart-studio",
    type: "website",
    images: ["/images/utilities/chart-studio-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/chart-studio-preview.svg"],
  },
};

export default function ChartStudioPage() {
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
        name: "DOPT Chart Studio",
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/chart-studio`,
        image: `${siteUrl}/images/utilities/chart-studio-preview.svg`,
        inLanguage: "ko-KR",
        isAccessibleForFree: true,
        browserRequirements: "Requires a modern browser with Canvas, FileReader, and local download support.",
        featureList: [
          "Manual chart data editing",
          "CSV import",
          "TSV import",
          "JSON import",
          "3D bar chart rendering",
          "3D line chart rendering",
          "Multi-series chart rendering",
          "Palette and presentation controls",
          "PNG export",
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
      <ChartStudioClient />
    </div>
  );
}
