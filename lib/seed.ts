import type { AdminNote, ProfileBundle, UploadedFile, Visualization } from "@/types";

export const seedVisualizations: Visualization[] = [
  {
    id: "seed-diff",
    title: "Diff",
    description: "텍스트 차이를 라인/문자 단위로 빠르게 비교하는 유틸리티입니다.",
    url: "/diff",
    visible: true,
    sort_order: 1,
  },
];

export const seedProfile: ProfileBundle = {
  profile: {
    id: "seed-profile",
    greeting: "안녕하세요. DOPT입니다.",
    bio: "기록과 실험, 그리고 직접 만든 작은 도구를 차분히 모아두는 개인 공간입니다.",
    photo_path: null,
  },
  projects: [
    {
      id: "seed-project-1",
      title: "Diff",
      description: "문장을 빠르게 비교해 변경점을 확인할 수 있도록 만든 텍스트 비교 유틸리티",
      project_url: "/diff",
      start_year: 2026,
      end_year: null,
      screenshot_url: null,
      sort_order: 1,
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
