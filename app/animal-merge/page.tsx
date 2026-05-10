import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { MergeClient } from "./merge-client";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "Animal Merge";
const pageDescription = "Drop and merge animals in a physics sandbox, build combos, and compete on the global leaderboard.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/animal-merge" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/animal-merge",
    type: "website",
  },
};

export default function AnimalMergePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DOPT Animal Merge",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    description: pageDescription,
    url: `${siteUrl}/animal-merge`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  };

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />
      <MergeClient />
    </div>
  );
}

