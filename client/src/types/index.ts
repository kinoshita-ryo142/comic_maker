export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  created_at?: string;
}

export interface Character {
  id: string;
  name: string;
  profile: string;
  image_url: string;
  updated_at: string;
}

export interface PanelPlan {
  panelNumber: 1 | 2 | 3 | 4;
  scene: string;
  dialogue: string;
}

export interface ComicPlan {
  title: string;
  scenario: string;
  panels: PanelPlan[];
}

export interface Comic {
  id: string;
  title: string;
  synopsis: string;
  scenario: string;
  panels: PanelPlan[];
  image_url: string;
  created_at: string;
}
