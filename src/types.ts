export type CareerCategory = '映画' | 'TV' | 'CM' | 'MV' | '舞台' | 'その他';

export const CAREER_CATEGORIES: CareerCategory[] = ['映画', 'TV', 'CM', 'MV', '舞台', 'その他'];

export interface Career {
  id: string;
  category: CareerCategory;
  year: string;
  title: string;
  episode?: string; // 話数・部門など
  role_name?: string; // 「浩二役」など
  director_or_station?: string; // 監督名 or 局名
  note?: string; // 補足（映画祭入選など）
  is_highlight?: boolean; // 赤字太字で強調
  hidden?: boolean; // ストックには残すがプロフィールには表示しない
  source_url?: string; // Web収集で取り込んだ場合の情報源URL
}

export interface VideoLink {
  id: string;
  label: string;
  url: string;
}

export type PhotoRole = 'bust_up' | 'full_body' | 'snap';

export const PHOTO_ROLE_LABEL: Record<PhotoRole, string> = {
  bust_up: 'バストアップ',
  full_body: '全身',
  snap: 'スナップ',
};

export interface PhotoMeta {
  id: string;
  talentId: string;
  role: PhotoRole;
  fileName: string;
  // 写真枠内の表示位置(object-position %)と拡大率
  crop: { x: number; y: number; zoom: number };
  createdAt: string;
}

export interface Talent {
  id: string;
  stage_name: string;
  kana?: string;
  romaji?: string;
  gender?: string;
  birthdate?: string; // YYYY-MM-DD
  show_age: boolean;
  birthplace?: string;
  blood_type?: string;
  height?: string;
  weight?: string;
  bust?: string;
  waist?: string;
  hip?: string;
  shoe_size?: string;
  head_size?: string;
  clothing_size?: string;
  hobbies_skills: string[];
  self_intro?: string;
  tags: string[];
  // Web収集の情報源（事務所HPのお知らせページ、本人のX/InstagramのURLなど）
  source_urls?: string[];
  careers: Career[];
  video_links: VideoLink[];
  // 写真枠(role) -> 採用する写真ID
  photo_slots: Partial<Record<PhotoRole, string>>;
  updated_at: string;
}

export interface Agency {
  name: string;
  tel?: string;
  address?: string;
  email?: string;
  website?: string;
  logoBlobId?: string;
  brand_color?: string;
}

export interface TextStyle {
  font: 'serif' | 'sans';
  size: number; // pt
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export interface RectMM {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ElementBase {
  id: string;
  rect: RectMM;
  z?: number;
}

export interface TextElement extends ElementBase {
  type: 'text';
  binding?: string; // データ項目キー。未指定なら固定文言
  text?: string;
  style: TextStyle;
}

export interface PhotoElement extends ElementBase {
  type: 'photo';
  slot: PhotoRole;
}

export interface CareerListElement extends ElementBase {
  type: 'career_list';
  categories: CareerCategory[];
  style: TextStyle;
  highlightColor: string;
}

export interface LineElement extends ElementBase {
  type: 'line';
  color?: string;
}

export interface LinksElement extends ElementBase {
  type: 'links';
  style: TextStyle;
  bordered?: boolean;
}

export interface FooterElement extends ElementBase {
  type: 'footer';
  style: TextStyle;
}

export type TemplateElement =
  | TextElement
  | PhotoElement
  | CareerListElement
  | LineElement
  | LinksElement
  | FooterElement;

export interface Template {
  id: string;
  name: string;
  page: { w: number; h: number }; // mm
  elements: TemplateElement[];
  updated_at: string;
}

// テキスト要素で選べるデータ項目
export const TEXT_BINDINGS: { key: string; label: string }[] = [
  { key: 'name_full', label: '氏名＋ローマ字' },
  { key: 'stage_name', label: '氏名' },
  { key: 'kana', label: 'ふりがな' },
  { key: 'romaji', label: 'ローマ字' },
  { key: 'basic_birth', label: '生年月日（年齢）性別' },
  { key: 'basic_body', label: '身長・体重' },
  { key: 'basic_size', label: 'B/W/H・足・頭・服サイズ' },
  { key: 'basic_hobby', label: '趣味・特技' },
  { key: 'self_intro', label: '自己紹介文' },
  { key: 'birthplace', label: '出身地' },
];
