import type { AdminNote, ProfileBundle, UploadedFile, Visualization } from "@/types";

export const seedVisualizations: Visualization[] = [
  {
    id: "seed-week-calendar",
    title: "Week Calendar",
    description: "주간 계획을 빠르게 정리할 수 있는 유틸입니다.",
    url: "/week-calendar",
    visible: true,
    sort_order: 1,
  },
  {
    id: "seed-diff",
    title: "Diff",
    description: "텍스트 차이를 간단하게 비교할 수 있는 유틸입니다.",
    url: "/diff",
    visible: true,
    sort_order: 2,
  },
];

export const seedProfile: ProfileBundle = {
  profile: {
    id: "seed-profile",
    greeting: "안녕하세요. DOPT입니다.",
    bio: "이곳은 제가 좋아하는 것들, 작은 실험, 그리고 직접 만든 프로젝트를 차분하게 모아두는 개인 공간입니다.",
    photo_path: null,
  },
  projects: [
    {
      id: "seed-project-1",
      title: "Week Calendar",
      description: "반복되는 일상을 조금 더 정리해서 보기 위해 만든 작은 캘린더 프로젝트",
      project_url: "/week-calendar",
      start_year: 2026,
      end_year: null,
      screenshot_url: null,
      sort_order: 1,
    },
    {
      id: "seed-project-2",
      title: "Diff",
      description: "문장 비교를 빠르게 해보고 싶어서 만든 텍스트 비교 유틸",
      project_url: "/diff",
      start_year: 2026,
      end_year: null,
      screenshot_url: null,
      sort_order: 2,
    },
  ],
  links: [
    {
      id: "seed-link-1",
      label: "LinkedIn",
      url: "https://www.linkedin.com/",
      sort_order: 1,
    },
    {
      id: "seed-link-2",
      label: "GitHub",
      url: "https://github.com/",
      sort_order: 2,
    },
  ],
};

export const seedNote: AdminNote = {
  id: "seed-note",
  content: "여기에 관리자 메모를 작성할 수 있습니다.",
};

export const seedFiles: UploadedFile[] = [];
