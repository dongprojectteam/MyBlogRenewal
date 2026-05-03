import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DOPT",
  description: "개인 취미 공간이자 유틸 허브",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
