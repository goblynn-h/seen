export interface CategoryInfo {
  id: string;
  name: string;
}

export interface Entry {
  id: string;
  title: string;
  date: string;
  coverFileName: string;
  noteFileName: string;
  createdAt: string;
  hasNote?: boolean;
}

export interface AppConfig {
  rootPath: string;
}
