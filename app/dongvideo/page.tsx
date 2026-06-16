import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";

const siteUrl = "https://www.doptsw.org";
const pageTitle = "DongVideo";
const seoTitle = "DongVideo - 이어보기와 자막에 강한 Android 로컬 비디오 플레이어";
const pagePath = "/dongvideo";
const ogImage = "/images/dongvideo/dongvideo-hero-capture.png";
const homeCaptureImage = "/images/dongvideo/dongvideo-home-capture.png";
const playerCaptureImage = "/images/dongvideo/dongvideo-player-capture.png";
const playlistsCaptureImage = "/images/dongvideo/dongvideo-playlists-capture.png";
const settingsCaptureImage = "/images/dongvideo/dongvideo-settings-capture.png";
const pageUrl = `${siteUrl}${pagePath}`;
const ogImageUrl = `${siteUrl}${ogImage}`;
const pageDescription =
  "기기 안 영상을 MediaStore와 선택 폴더로 찾고, 이어보기, 자막 싱크, 오디오 트랙, PIP, 위젯, 재생목록을 제공하는 Android 로컬 비디오 플레이어 DongVideo입니다.";

const downloadHref =
  "https://drive.google.com/file/d/1rv4ma9xqilFrdI4StahwV8kFZrZ8iV6b/view?usp=drivesdk";
const isDownloadReady = true;
const downloadLabel = "APK 다운로드";

const heroPills = ["이어보기", "자막 싱크", "오디오 트랙", "PIP", "제스처", "자동 재생목록"];

const audienceCards = [
  {
    title: "강의와 긴 영상을 쌓아두는 사람",
    body: "중간에 끊긴 영상도 마지막 위치를 기억해 홈의 계속 보기에서 바로 이어볼 수 있습니다.",
  },
  {
    title: "폴더째 영상을 관리하는 사람",
    body: "전체 비디오 스캔과 선택 폴더 스캔을 함께 지원해 내 파일 구조를 그대로 살립니다.",
  },
  {
    title: "자막과 반복 학습이 필요한 사람",
    body: "SRT/WebVTT 자막, 싱크 보정, 마커, A/B 구간 반복으로 한 장면을 다시 붙잡습니다.",
  },
];

const featureHighlights = [
  {
    title: "보던 순간으로 돌아갑니다",
    body: "Room에 이어보기 위치와 시청 완료 상태를 저장하고, 영상별 진행 초기화와 완료 영상 숨김까지 지원합니다.",
  },
  {
    title: "자막과 소리를 맞춥니다",
    body: "외부 SRT/WebVTT 자동 매칭과 직접 선택, 자막 크기·싱크·색상·배경, 다중 오디오 트랙 선택을 제공합니다.",
  },
  {
    title: "플레이어 조작이 손에 붙습니다",
    body: "더블 탭 10초 이동, 밝기/볼륨 드래그, 화면 잠금, 화면비 전환, PIP, seek 시간 preview로 감상 흐름을 줄입니다.",
  },
  {
    title: "목록이 감상 습관을 기억합니다",
    body: "즐겨찾기, 최근 재생, 최근 추가, 전체 셔플 자동 재생목록과 직접 만든 재생목록을 한곳에서 고릅니다.",
  },
];

const journeySteps = [
  ["1", "찾기", "MediaStore 전체 스캔과 SAF 선택 폴더 스캔으로 기기 안 영상을 가져옵니다."],
  ["2", "고르기", "계속 보기, 최근 추가, 폴더, 자동 재생목록에서 다음에 볼 영상을 고릅니다."],
  ["3", "맞추기", "자막 싱크, 오디오 트랙, 속도, 화면비, 화면 잠금을 재생 중 바로 조정합니다."],
  ["4", "이어가기", "PIP, 알림, 위젯, parked 차량 카테고리 준비까지 재생 상태를 앱 밖으로 이어갑니다."],
];

const previewScreens = [
  {
    title: "홈",
    body: "영상 수, 폴더, 이어보기, 내 재생목록을 첫 화면에서 확인하고 보던 영상을 바로 재개합니다.",
    image: homeCaptureImage,
  },
  {
    title: "플레이어",
    body: "즐겨찾기, 잠금, 자막, 오디오, 비디오 정보, 화면비, 전체화면 컨트롤을 영상 위에 배치합니다.",
    image: playerCaptureImage,
  },
  {
    title: "재생목록",
    body: "즐겨찾기, 최근 재생, 최근 추가, 전체 셔플 같은 자동 목록과 직접 만든 목록을 함께 사용합니다.",
    image: playlistsCaptureImage,
  },
  {
    title: "설정",
    body: "백그라운드 재생, 자동 재생, 썸네일, seek 프레임 미리보기, 완료 기준, 자막 스타일을 조정합니다.",
    image: settingsCaptureImage,
  },
];

const techFacts = [
  ["Android", "8.0+"],
  ["UI", "Jetpack Compose Material3"],
  ["Playback", "Media3 ExoPlayer"],
  ["Library", "MediaStore + SAF"],
  ["Storage", "Room + DataStore"],
  ["Subtitles", "SRT/WebVTT"],
  ["Controls", "PIP, gestures, screen lock"],
  ["Tests", "core 45 + app 37"],
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
    "DongVideo",
    "DongVideo 다운로드",
    "Android video player",
    "로컬 비디오 플레이어",
    "안드로이드 비디오 플레이어",
    "오프라인 동영상 플레이어",
    "이어보기",
    "시청 완료",
    "자막 플레이어",
    "자막 싱크",
    "SRT",
    "WebVTT",
    "오디오 트랙",
    "PIP",
    "동영상 재생목록",
    "SAF 폴더 스캔",
    "Media3",
    "ExoPlayer",
    "Jetpack Compose",
    "Android Automotive parked video",
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
        alt: "DongVideo Android 로컬 비디오 플레이어 실제 앱 캡처",
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
        alt: "DongVideo Android 로컬 비디오 플레이어 실제 앱 캡처",
      },
    ],
  },
};

export default function DongVideoPage() {
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
        alternateName: "Android 로컬 비디오 플레이어 DongVideo",
        applicationCategory: "MultimediaApplication",
        applicationSubCategory: "Video player",
        operatingSystem: "Android 8.0+",
        description: pageDescription,
        url: pageUrl,
        image: ogImageUrl,
        screenshot: [
          ogImageUrl,
          `${siteUrl}${homeCaptureImage}`,
          `${siteUrl}${playerCaptureImage}`,
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
    <div className="dongplayer-page dongvideo-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="page-shell dongplayer-shell">
        <SiteHeader />

        <section className="dongplayer-hero dongvideo-hero" aria-labelledby="dongvideo-title">
          <div className="dongplayer-hero-copy">
            <p className="dongplayer-kicker">Android local video player</p>
            <h1 id="dongvideo-title">DongVideo</h1>
            <p className="dongplayer-hero-lead">
              폴더에 흩어진 강의, 클립, 자료 영상을 찾고 보던 지점에서 다시 시작하며, 자막과 오디오 트랙까지
              재생 중 바로 맞추는 로컬 비디오 플레이어입니다.
            </p>
            <div className="dongplayer-hero-actions">
              <a
                className="dongplayer-action dongplayer-action-primary"
                href={downloadHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {downloadLabel}
              </a>
              <a className="dongplayer-action dongplayer-action-secondary" href="#dongvideo-preview">
                실제 화면 보기
              </a>
            </div>
            <ul className="dongplayer-hero-pills" aria-label="DongVideo 핵심 가치">
              {heroPills.map((pill) => (
                <li key={pill}>{pill}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="dongplayer-section dongplayer-positioning" aria-labelledby="dongvideo-positioning-title">
          <div className="dongplayer-positioning-copy">
            <p className="dongplayer-kicker">Why it exists</p>
            <h2 id="dongvideo-positioning-title">영상은 길고, 중간에 끊깁니다. DongVideo는 그 지점을 기억합니다</h2>
            <p>
              DongVideo는 DongPlayer의 로컬 미디어 탐색과 재생 상태 관리 방식을 비디오 감상에 맞춰 확장한
              Android 앱입니다. 파일을 찾고, 보던 위치를 저장하고, 자막과 화면 조작을 한 흐름 안에서 다룹니다.
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

        <section className="dongplayer-section" aria-labelledby="dongvideo-benefit-title">
          <div className="dongplayer-section-head">
            <p className="dongplayer-kicker">Benefits</p>
            <h2 id="dongvideo-benefit-title">기능을 많이 넣기보다, 다시 보는 시간을 줄입니다</h2>
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

        <section id="dongvideo-preview" className="dongplayer-section" aria-labelledby="dongvideo-preview-title">
          <div className="dongplayer-section-head">
            <p className="dongplayer-kicker">Product tour</p>
            <h2 id="dongvideo-preview-title">실제 앱 화면으로 보는 DongVideo</h2>
          </div>
          <div className="dongplayer-preview-grid">
            {previewScreens.map((screen) => (
              <figure key={screen.title} className="dongplayer-preview-card">
                <img
                  className="dongplayer-preview-capture"
                  src={screen.image}
                  alt={`DongVideo ${screen.title} 실제 앱 캡처`}
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

        <section className="dongplayer-section dongplayer-journey-section" aria-labelledby="dongvideo-journey-title">
          <div className="dongplayer-journey-copy">
            <p className="dongplayer-kicker">Viewing flow</p>
            <h2 id="dongvideo-journey-title">스캔부터 다음 시청까지 한 번에 이어집니다</h2>
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
            <DongVideoContinuityPanel />
          </div>
        </section>

        <section className="dongplayer-section dongplayer-under-hood" aria-labelledby="dongvideo-under-hood-title">
          <div className="dongplayer-section-head">
            <p className="dongplayer-kicker">Under the hood</p>
            <h2 id="dongvideo-under-hood-title">화면은 가볍게, 재생 상태는 단단하게</h2>
            <p>
              Compose UI는 탐색과 제스처를 맡고, Media3 서비스는 재생과 MediaSession을 유지합니다. Room은
              라이브러리와 이어보기 상태를 저장하고, core 모듈은 검색, 그룹화, 재생목록, 자막 매칭 규칙을 테스트
              가능한 형태로 분리합니다.
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

        <section id="dongvideo-download" className="dongplayer-download" aria-labelledby="dongvideo-download-title">
          <div>
            <p className="dongplayer-kicker">Download</p>
            <h2 id="dongvideo-download-title">Android APK를 다운로드할 수 있습니다</h2>
            <p>
              Google Drive에서 APK를 받아 설치할 수 있습니다. Android 8.0 이상 기기에서 사용할 수
              있으며, 알 수 없는 출처 설치 허용이 필요할 수 있습니다.
            </p>
          </div>
          <a
            className="dongplayer-download-link"
            href={downloadHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!isDownloadReady}
            data-disabled={isDownloadReady ? "false" : "true"}
          >
            {downloadLabel}
          </a>
        </section>
      </div>
    </div>
  );
}

function DongVideoContinuityPanel() {
  return (
    <div className="dongvideo-continuity-panel" aria-hidden="true">
      <div className="dongvideo-signal-card is-primary">
        <span>Continue</span>
        <strong>이어보기 위치 저장</strong>
        <p>긴 영상도 마지막 장면으로 돌아갑니다.</p>
      </div>
      <div className="dongvideo-signal-grid">
        <div className="dongvideo-signal-card">
          <span>Subtitles</span>
          <strong>SRT/WebVTT</strong>
          <p>싱크, 크기, 색상, 배경 조정</p>
        </div>
        <div className="dongvideo-signal-card">
          <span>Audio</span>
          <strong>트랙 선택</strong>
          <p>다중 음성 트랙 전환</p>
        </div>
      </div>
      <div className="dongvideo-signal-strip">
        <span>PIP</span>
        <span>Widget</span>
        <span>MediaSession</span>
      </div>
    </div>
  );
}
