export type Visualization = {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url?: string | null;
  visible: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type AdminNote = {
  id: string;
  content: string;
  created_at?: string;
  updated_at?: string;
};

export type UploadedFile = {
  id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  created_at?: string;
};

export type Profile = {
  id: string;
  greeting: string;
  bio: string;
  photo_path: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProfileProject = {
  id: string;
  title: string;
  description: string;
  project_url: string;
  start_year: number | null;
  end_year: number | null;
  screenshot_url: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProfileLink = {
  id: string;
  label: string;
  url: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProfileBundle = {
  profile: Profile;
  projects: ProfileProject[];
  links: ProfileLink[];
};

export type TetrisMode = "marathon" | "sprint" | "ultra" | "survival" | "daily";

export type TetrisScore = {
  id: string;
  player_name: string;
  mode: TetrisMode;
  score: number;
  lines: number;
  level: number;
  time_ms: number;
  pieces: number;
  seed: number;
  daily_key: string | null;
  created_at?: string;
};
