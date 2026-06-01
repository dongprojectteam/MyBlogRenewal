import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "DongPlayer";
const seoTitle = "DongPlayer - 내 음악을 내 방식대로 듣는 Android 로컬 음악 플레이어";
const pagePath = "/dongplayer";
const ogImage = "/images/dongplayer/dongplayer-hero-capture.png";
const homeCaptureImage = "/images/dongplayer/dongplayer-home-capture.png";
const nowPlayingCaptureImage = "/images/dongplayer/dongplayer-nowplaying-capture.png";
const playlistsCaptureImage = "/images/dongplayer/dongplayer-playlists-capture.png";
const settingsCaptureImage = "/images/dongplayer/dongplayer-settings-capture.png";
const pageUrl = `${siteUrl}${pagePath}`;
const ogImageUrl = `${siteUrl}${ogImage}`;
const pageDescription =
  "기기 안 음악을 폴더와 메타데이터로 정리하고 재생목록, 즐겨찾기, A/B 반복, 위젯, 백업까지 제공하는 Android 로컬 음악 플레이어 DongPlayer입니다.";

// 실제 APK, Play Store, GitHub Release URL이 생기면 이 값과 isDownloadReady만 바꾸면 됩니다.
const downloadHref = "#";
const isDownloadReady = false;

const heroPills = ["오프라인 파일 중심", "폴더와 메타데이터", "재생목록", "A/B 반복", "위젯", "백업"];

const audienceCards = [
  {
    title: "음악 파일을 직접 보관하는 사람",
    body: "내 폰에 쌓아둔 MP3와 로컬 음원을 스트리밍 앱의 기준이 아니라 내 파일 구조 그대로 다룹니다.",
  },
  {
    title: "폴더와 앨범을 함께 보는 사람",
    body: "폴더, 앨범, 아티스트, 장르, 날짜, 즐겨찾기를 오가며 원하는 기준으로 음악을 찾습니다.",
  },
  {
    title: "반복해서 듣고 익히는 사람",
    body: "어학 모드와 A/B 반복, 배속, 마커로 다시 듣고 싶은 구간을 빠르게 붙잡습니다.",
  },
];

const featureHighlights = [
  {
    title: "찾는 순간이 빨라집니다",
    body: "전체 음악 또는 선택 폴더를 스캔하고, 홈에서 최근 추가와 최근 재생, 많이 재생한 곡을 바로 확인합니다.",
  },
  {
    title: "내 취향이 목록으로 남습니다",
    body: "즐겨찾기, 직접 만든 재생목록, 자동 재생목록, 재생 이력으로 자주 듣는 흐름을 다시 꺼내기 쉽습니다.",
  },
  {
    title: "재생이 끊기지 않습니다",
    body: "화면이 꺼져도, 앱이 백그라운드에 있어도, 위젯과 알림에서 현재 곡과 재생 액션을 이어갑니다.",
  },
  {
    title: "데이터를 내 손에 둡니다",
    body: "재생목록, 즐겨찾기, 마커, 히스토리를 JSON으로 백업하고 복원할 수 있도록 준비했습니다.",
  },
];

const journeySteps = [
  ["1", "스캔", "기기 전체 음악 또는 선택한 폴더에서 곡을 가져옵니다."],
  ["2", "정리", "폴더, 앨범, 아티스트, 장르, 날짜, 즐겨찾기로 나눠 봅니다."],
  ["3", "재생", "큐, 셔플, 반복, 배속, 10초 이동, A/B 반복으로 듣습니다."],
  ["4", "이어가기", "위젯, 알림, 이력, 백업으로 다음 청취까지 흐름을 보관합니다."],
];

const previewScreens = [
  {
    title: "홈",
    body: "최근 추가, 재생 이력, 많이 재생한 곡과 현재 큐가 첫 화면에서 바로 보입니다.",
    image: homeCaptureImage,
  },
  {
    title: "재생",
    body: "앨범아트, 즐겨찾기, 큐, 반복, 배속, 마커를 한 화면에서 다룹니다.",
    image: nowPlayingCaptureImage,
  },
  {
    title: "재생목록",
    body: "내 재생목록과 즐겨찾기, 최근 재생, 전체 셔플 같은 자동 목록을 함께 고릅니다.",
    image: playlistsCaptureImage,
  },
  {
    title: "설정",
    body: "백그라운드 재생, 앨범아트, 강조 색상, 목록 밀도, 스캔 위치와 백업을 관리합니다.",
    image: settingsCaptureImage,
  },
];

const techFacts = [
  ["Android", "8.0+"],
  ["UI", "Jetpack Compose"],
  ["Playback", "Media3 ExoPlayer"],
  ["Library", "MediaStore + SAF"],
  ["Cache", "Room + WorkManager"],
  ["Settings", "DataStore"],
  ["User Data", "Playlists, favorites, history"],
  ["Widget", "Adaptive App Widget"],
];

export const metadata: Metadata = {
  title: seoTitle,
  description: pageDescription,
  authors: [{ name: "DOPT" }],
  creator: "DOPT",
  publisher: "DOPT",
  category: "Android application",
  classification: "SoftwareApplication",
  alternates: {
    canonical: pagePath,
  },
  keywords: [
    "DongPlayer",
    "DongPlayer 다운로드",
    "Android music player",
    "로컬 음악 플레이어",
    "오프라인 음악 플레이어",
    "안드로이드 음악 플레이어",
    "음악 파일 관리",
    "재생목록",
    "즐겨찾기",
    "재생 이력",
    "A/B 반복",
    "어학 모드",
    "홈 화면 위젯",
    "SAF 폴더 스캔",
    "Media3",
    "ExoPlayer",
    "Jetpack Compose",
    "JSON 백업",
  ],
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
    title: seoTitle,
    description: pageDescription,
    url: pagePath,
    siteName: "DOPT",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DongPlayer Android 로컬 음악 플레이어 소개 화면",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: pageDescription,
    images: [
      {
        url: ogImage,
        alt: "DongPlayer Android 로컬 음악 플레이어 소개 화면",
      },
    ],
  },
};

export default function DongPlayerPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "DOPT",
        url: siteUrl,
        inLanguage: "ko-KR",
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: seoTitle,
        description: pageDescription,
        inLanguage: "ko-KR",
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
        breadcrumb: {
          "@id": `${pageUrl}#breadcrumb`,
        },
        mainEntity: {
          "@id": `${pageUrl}#software`,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "DOPT",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: pageTitle,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${pageUrl}#software`,
        name: pageTitle,
        alternateName: "Android 로컬 음악 플레이어 DongPlayer",
        applicationCategory: "MultimediaApplication",
        applicationSubCategory: "Music player",
        operatingSystem: "Android 8.0+",
        description: pageDescription,
        url: pageUrl,
        image: ogImageUrl,
        screenshot: [
          ogImageUrl,
          `${siteUrl}${homeCaptureImage}`,
          `${siteUrl}${nowPlayingCaptureImage}`,
          `${siteUrl}${playlistsCaptureImage}`,
          `${siteUrl}${settingsCaptureImage}`,
        ],
        inLanguage: "ko-KR",
        featureList: featureHighlights.map((feature) => `${feature.title}: ${feature.body}`),
        softwareRequirements: "Android 8.0 이상",
        ...(isDownloadReady ? { downloadUrl: downloadHref } : {}),
        offers: {
          "@type": "Offer",
          availability: isDownloadReady ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
          price: "0",
          priceCurrency: "KRW",
        },
      },
    ],
  };

  return (
    <div className="dongplayer-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="page-shell dongplayer-shell">
        <SiteHeader />

        <section className="dongplayer-hero" aria-labelledby="dongplayer-title">
          <div className="dongplayer-hero-copy">
            <p className="dongplayer-kicker">Android local music player</p>
            <h1 id="dongplayer-title">DongPlayer</h1>
            <p className="dongplayer-hero-lead">
              스트리밍 앱에 맞춰 듣는 대신, 내 폰에 보관한 음악을 내 폴더와 내 재생 습관 그대로 듣는
              로컬 음악 플레이어입니다.
            </p>
            <div className="dongplayer-hero-actions">
              <a className="dongplayer-action dongplayer-action-primary" href="#dongplayer-download">
                다운로드 준비 상태 보기
              </a>
              <a className="dongplayer-action dongplayer-action-secondary" href="#dongplayer-preview">
                실제 화면 보기
              </a>
            </div>
            <ul className="dongplayer-hero-pills" aria-label="DongPlayer 핵심 가치">
              {heroPills.map((pill) => (
                <li key={pill}>{pill}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="dongplayer-section dongplayer-positioning" aria-labelledby="dongplayer-positioning-title">
          <div className="dongplayer-positioning-copy">
            <p className="dongplayer-kicker">Why it exists</p>
            <h2 id="dongplayer-positioning-title">내 음악 파일을 앱에 맞추는 대신, 앱이 내 파일에 맞춰집니다</h2>
            <p>
              DongPlayer는 수집해 둔 로컬 음악을 빠르게 찾고, 자주 듣는 흐름을 잃지 않으며, 반복 청취와
              백업까지 자연스럽게 이어지도록 만든 Android 플레이어입니다.
            </p>
          </div>
          <div className="dongplayer-audience-grid">
            {audienceCards.map((card) => (
              <article key={card.title} className="dongplayer-audience-card">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dongplayer-section" aria-labelledby="dongplayer-benefit-title">
          <div className="dongplayer-section-head">
            <p className="dongplayer-kicker">Benefits</p>
            <h2 id="dongplayer-benefit-title">기능을 나열하기보다, 듣는 흐름을 바꿉니다</h2>
          </div>
          <div className="dongplayer-benefit-grid">
            {featureHighlights.map((feature) => (
              <article key={feature.title} className="dongplayer-benefit-card">
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="dongplayer-preview" className="dongplayer-section" aria-labelledby="dongplayer-preview-title">
          <div className="dongplayer-section-head">
            <p className="dongplayer-kicker">Product tour</p>
            <h2 id="dongplayer-preview-title">실제 앱 화면으로 보는 DongPlayer</h2>
          </div>
          <div className="dongplayer-preview-grid">
            {previewScreens.map((screen) => (
              <figure key={screen.title} className="dongplayer-preview-card">
                <img
                  className="dongplayer-preview-capture"
                  src={screen.image}
                  alt={`DongPlayer ${screen.title} 실제 앱 캡처`}
                  loading="lazy"
                />
                <figcaption>
                  <strong>{screen.title}</strong>
                  <span>{screen.body}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="dongplayer-section dongplayer-journey-section" aria-labelledby="dongplayer-journey-title">
          <div className="dongplayer-journey-copy">
            <p className="dongplayer-kicker">Listening flow</p>
            <h2 id="dongplayer-journey-title">스캔부터 다음 재생까지 한 번에 이어집니다</h2>
            <ol className="dongplayer-journey-list">
              {journeySteps.map(([step, title, body]) => (
                <li key={step}>
                  <span>{step}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="dongplayer-widget-feature">
            <DongPlayerWidgetMock />
          </div>
        </section>

        <section className="dongplayer-section dongplayer-under-hood" aria-labelledby="dongplayer-under-hood-title">
          <div className="dongplayer-section-head">
            <p className="dongplayer-kicker">Under the hood</p>
            <h2 id="dongplayer-under-hood-title">겉으로는 단순하게, 안쪽은 오래 쓸 수 있게</h2>
            <p>
              Compose UI, Media3 재생 서비스, Room 캐시, DataStore 설정, WorkManager 갱신을 나눠 구성해
              라이브러리와 재생 상태를 안정적으로 다룹니다.
            </p>
          </div>
          <dl className="dongplayer-fact-grid">
            {techFacts.map(([label, value]) => (
              <div key={label} className="dongplayer-fact">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="dongplayer-download" className="dongplayer-download" aria-labelledby="dongplayer-download-title">
          <div>
            <p className="dongplayer-kicker">Download</p>
            <h2 id="dongplayer-download-title">배포 링크를 연결할 준비가 되어 있습니다</h2>
            <p>
              APK, Play Store, GitHub Release 등 실제 배포 위치가 정해지면 페이지 상단의
              <code>downloadHref</code>와 <code>isDownloadReady</code> 값만 바꾸면 됩니다.
            </p>
          </div>
          <a
            className="dongplayer-download-link"
            href={downloadHref}
            aria-disabled={!isDownloadReady}
            data-disabled={isDownloadReady ? "false" : "true"}
          >
            다운로드 링크 준비 중
          </a>
        </section>
      </div>
    </div>
  );
}

function DongPlayerWidgetMock() {
  return (
    <div className="dongplayer-widget-demo" aria-hidden="true">
      <div className="dongplayer-widget">
        <div className="dongplayer-widget-art">D</div>
        <div>
          <strong>Seoul Night Walk</strong>
          <span>Local Files</span>
        </div>
        <b>‹</b>
        <b>Ⅱ</b>
        <b>›</b>
      </div>
      <div className="dongplayer-notification">
        <span>Media3 session</span>
        <strong>잠금화면과 알림 컨트롤 동기화</strong>
      </div>
    </div>
  );
}
