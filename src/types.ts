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

export type PhotoRole = 'bust_up' | 'full_body' | 'snap' | 'snap2' | 'snap3';

export const PHOTO_ROLE_LABEL: Record<PhotoRole, string> = {
  bust_up: 'バストアップ',
  full_body: '全身',
  snap: 'スナップ1',
  snap2: 'スナップ2',
  snap3: 'スナップ3',
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
  // 使用するテンプレートID（未指定なら標準）
  template_id?: string;
  // タレント個別のレイアウト調整（テンプレートのコピーを編集したもの。未設定ならテンプレートをそのまま使用）
  layout?: Template;
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

// 出力用フォント。利用者のPC(Mac/Windows)に標準搭載のフォントで構成
export const FONT_OPTIONS: { key: string; label: string; css: string }[] = [
  {
    key: 'sans',
    label: 'ゴシック',
    css: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif',
  },
  {
    key: 'serif',
    label: '明朝',
    css: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
  },
  {
    key: 'rounded',
    label: '丸ゴシック',
    css: '"Hiragino Maru Gothic ProN", "HGMaruGothicMPRO", "Yu Gothic", "Noto Sans JP", sans-serif',
  },
  {
    key: 'euro-serif',
    label: '欧文セリフ',
    css: 'Georgia, "Times New Roman", "Hiragino Mincho ProN", serif',
  },
  {
    key: 'euro-script',
    label: '欧文スクリプト',
    css: '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive',
  },
];

export function fontCss(key: string): string {
  return FONT_OPTIONS.find((f) => f.key === key)?.css ?? FONT_OPTIONS[0].css;
}

export interface TextStyle {
  font: string; // FONT_OPTIONS の key
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
  // 標準テンプレートの版数。アプリ更新時、未編集(modified=false)の標準テンプレートを自動更新するために使う
  factory_rev?: number;
  // ユーザーがエディタで保存したことがあるか（trueなら自動更新しない）
  modified?: boolean;
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
