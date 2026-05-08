import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

import { ExifClient } from "./exif-client";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "EXIF Toolkit";
const pageDescription =
  "Inspect, clean, edit, and export photo EXIF metadata locally in the browser without uploading images.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: ["EXIF", "photo metadata", "metadata remover", "사진 메타데이터", "EXIF 제거", "GPS 메타데이터"],
  alternates: {
    canonical: "/exif",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/exif",
    type: "website",
    images: ["/images/utilities/exif-preview.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: ["/images/utilities/exif-preview.svg"],
  },
};

export default function ExifPage() {
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
        name: "DOPT EXIF Toolkit",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        description: pageDescription,
        url: `${siteUrl}/exif`,
        inLanguage: "ko-KR",
        featureList: [
          "File picker and drag/drop import",
          "EXIF viewer",
          "GPS metadata cleanup",
          "Capture date correction",
          "Browser-only batch export",
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
      <ExifClient />
    </div>
  );
}
