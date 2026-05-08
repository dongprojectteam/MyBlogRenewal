import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const siteName = "DOPT";
const siteDescription = "개인 프로젝트와 유틸리티를 모아두는 DOPT 아카이브";
const siteUrl = "https://www.doptsw.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "DOPT",
    "개인 프로젝트",
    "개발자 유틸리티",
    "웹 유틸리티",
    "텍스트 비교",
    "다이어그램 미리보기",
    "JSON 포맷터",
    "정규식 테스트",
    "마인드맵",
    "마인드맵 만들기",
    "브레인스토밍 도구",
    "OPML",
    "Mermaid",
  ],
  creator: "DOPT",
  publisher: "DOPT",
  category: "developer tools",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}


