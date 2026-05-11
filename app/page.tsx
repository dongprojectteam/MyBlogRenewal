import type { Metadata } from "next";

import { CurrentTimeCard } from "@/components/current-time-card";
import { SiteHeader } from "@/components/site-header";
import { UtilitySearchSection } from "@/components/utility-search-section";
import { getPublicVisualizations } from "@/lib/data";
import { getVisualizationCategory } from "@/lib/visualization-categories";

export const dynamic = "force-dynamic";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "DOPT";
const pageDescription = "개인 프로젝트와 직접 만든 웹 유틸리티를 모아두는 DOPT 아카이브입니다.";
const utilitySeoDescriptions: Record<string, string> = {
  "/diff": "텍스트를 라인 단위와 문자 단위로 비교해 변경점을 빠르게 확인하는 문서 비교 유틸리티입니다.",
  "/diagram": "Mermaid, PlantUML, Markdown 문서 안의 다이어그램을 브라우저에서 바로 렌더링하고 미리보는 유틸리티입니다.",
  "/calendar": "월별 달력, 한국 공휴일 정보, 날짜별 메모를 함께 관리하는 브라우저 캘린더 유틸리티입니다.",
  "/tetris": "여러 게임 모드와 글로벌 리더보드를 지원하는 브라우저 테트리스 게임입니다.",
  "/animal-merge": "Drop and merge animals in a browser physics puzzle game with combos and leaderboards.",
  "/ladder": "참가자와 결과를 입력해 사다리 경로 애니메이션으로 매칭을 확인하고 기록하는 유틸리티입니다.",
  "/codec": "JSON 포맷팅, URL 인코딩, Base64 변환, JWT 페이로드 확인을 한 화면에서 처리하는 개발자 유틸리티입니다.",
  "/mojibake": "UTF-8, CP949, EUC-KR, Windows-1252, URI 인코딩 문제로 깨진 한국어 텍스트의 복구 후보를 찾아주는 유틸리티입니다.",
  "/time": "Unix timestamp, ISO 날짜, 로컬 시간, UTC, KST와 주요 시간대를 변환하고 날짜 계산을 돕는 시간 유틸리티입니다.",
  "/regex": "JavaScript 정규식을 테스트하고 매치 하이라이트, 캡처 그룹, 치환 결과를 바로 확인하는 정규식 유틸리티입니다.",
  "/table-converter": "CSV, TSV, Markdown 표, JSON 형식의 표 데이터를 서로 변환하고 미리보는 테이블 변환 유틸리티입니다.",
  "/exif": "사진을 업로드하지 않고 브라우저에서 EXIF 메타데이터를 확인, 정리, 편집, 내보내는 로컬 유틸리티입니다.",
  "/mindmap": "드래그 편집, 브라우저 저장, 다양한 가져오기/내보내기 형식을 지원하는 로컬 마인드맵 만들기 유틸리티입니다.",
};

export const metadata: Metadata = {
  title: {
    absolute: pageTitle,
  },
  description: pageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
};

export default async function HomePage() {
  const items = await getPublicVisualizations();
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
        "@type": "CollectionPage",
        name: pageTitle,
        description: pageDescription,
        url: siteUrl,
        inLanguage: "ko-KR",
        hasPart: items.map((item) => ({
          "@type": "SoftwareApplication",
          name: item.title,
          description: utilitySeoDescriptions[item.url] ?? item.description,
          url: `${siteUrl}${item.url}`,
          operatingSystem: "Web",
          applicationCategory: getVisualizationCategory(item) === "game" ? "GameApplication" : "UtilitiesApplication",
          isAccessibleForFree: true,
        })),
      },
    ],
  };

  return (
    <div className="page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader current="home" />

      <section className="hero-panel hero-grid home-hero">
        <div>
          <div className="eyebrow">personal space</div>
          <h1 className="hero-title">A quiet archive for things I build.</h1>
          <p className="hero-copy">
            좋아하는 것들, 직접 만든 작은 도구들, 그리고 차분하게 쌓아가는 기록을 모아두는 개인 공간입니다.
          </p>
        </div>

        <div className="hero-aside">
          <CurrentTimeCard />
        </div>
      </section>

      <UtilitySearchSection items={items} />

      <p className="footer-note">DOPT는 개인 취향과 직접 만든 도구들을 모아두는 조용한 개인 공간을 목표로 합니다.</p>
    </div>
  );
}
