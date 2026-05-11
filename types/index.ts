export type VisualizationCategory = "utility" | "game";

export type Visualization = {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url?: string | null;
  category?: VisualizationCategory | null;
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

export type SudokuLevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type SudokuScore = {
  id: string;
  player_name: string;
  level_id: number;
  time_ms: number;
  score: number;
  seed: number;
  created_at?: string;
};
