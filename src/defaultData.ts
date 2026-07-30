import { uid } from './model';
import { Talent, Template, TemplateElement } from './types';

// ---- 標準テンプレート（写真1枚/2枚/3枚） ----
// 実物サンプル(A4縦1枚)のレイアウトを基本に、写真枠の数だけ変えた3パターンを同梱する。

function nameHeader(): TemplateElement[] {
  return [
    {
      id: 'name',
      type: 'text',
      binding: 'name_full',
      rect: { x: 25, y: 8, w: 160, h: 15 },
      style: { font: 'serif', size: 27, bold: true, align: 'center' },
    },
    { id: 'rule', type: 'line', rect: { x: 15, y: 24.5, w: 180, h: 0.4 }, color: '#555555' },
  ];
}

function headerElements(): TemplateElement[] {
  return [
    ...nameHeader(),
    {
      id: 'birth',
      type: 'text',
      binding: 'basic_birth',
      rect: { x: 25, y: 27, w: 160, h: 6.5 },
      style: { font: 'serif', size: 12, align: 'center' },
    },
    {
      id: 'body',
      type: 'text',
      binding: 'basic_body',
      rect: { x: 25, y: 33.5, w: 160, h: 6.5 },
      style: { font: 'serif', size: 12, align: 'center' },
    },
    {
      id: 'size',
      type: 'text',
      binding: 'basic_size',
      rect: { x: 25, y: 40, w: 160, h: 6.5 },
      style: { font: 'serif', size: 12, align: 'center' },
    },
    {
      id: 'hobby',
      type: 'text',
      binding: 'basic_hobby',
      rect: { x: 25, y: 46.5, w: 160, h: 6.5 },
      style: { font: 'serif', size: 12, align: 'center' },
    },
  ];
}

// actY: 【最新の活動状況】見出しのY位置。経歴欄はそこから下部固定要素(252mm)まで
function tailElements(actY: number): TemplateElement[] {
  const listY = actY + 7;
  return [
    {
      id: 'act-label',
      type: 'text',
      text: '【最新の活動状況】',
      rect: { x: 10, y: actY, w: 60, h: 6 },
      style: { font: 'sans', size: 10.5, bold: true, align: 'left' },
    },
    {
      id: 'career-left',
      type: 'career_list',
      categories: ['映画'],
      rect: { x: 10, y: listY, w: 98, h: 248 - listY },
      style: { font: 'sans', size: 8, align: 'left', lineHeight: 1.55 },
      highlightColor: '#cc0000',
    },
    {
      id: 'career-right',
      type: 'career_list',
      categories: ['TV', 'CM', 'MV'],
      rect: { x: 114, y: listY, w: 86, h: 235 - listY },
      style: { font: 'sans', size: 8, align: 'left', lineHeight: 1.6 },
      highlightColor: '#cc0000',
    },
    {
      id: 'intro-label',
      type: 'text',
      text: '【自己紹介】',
      rect: { x: 10, y: 252, w: 40, h: 5 },
      style: { font: 'sans', size: 8.5, bold: true, align: 'left' },
    },
    {
      id: 'intro',
      type: 'text',
      binding: 'self_intro',
      rect: { x: 10, y: 257, w: 96, h: 22 },
      style: { font: 'sans', size: 7.5, align: 'left', lineHeight: 1.5 },
    },
    {
      id: 'links',
      type: 'links',
      bordered: true,
      rect: { x: 114, y: 252, w: 86, h: 22 },
      style: { font: 'sans', size: 8, align: 'left', lineHeight: 1.6 },
    },
    {
      id: 'footer',
      type: 'footer',
      rect: { x: 8, y: 282, w: 194, h: 12 },
      style: { font: 'sans', size: 8, align: 'left' },
    },
  ];
}

export function defaultTemplates(): Template[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'photo1',
      name: '写真1枚',
      page: { w: 210, h: 297 },
      updated_at: now,
      factory_rev: 2,
      elements: [
        ...nameHeader(),
        // 写真は左に寄せ、右側の空きに基本情報・自己紹介・動画リンクのボックスを配置
        { id: 'photo1', type: 'photo', slot: 'bust_up', rect: { x: 14, y: 30, w: 86, h: 115 } },
        {
          id: 'birth',
          type: 'text',
          binding: 'basic_birth',
          rect: { x: 108, y: 31, w: 94, h: 6.5 },
          style: { font: 'serif', size: 11, align: 'left' },
        },
        {
          id: 'body',
          type: 'text',
          binding: 'basic_body',
          rect: { x: 108, y: 38, w: 94, h: 6.5 },
          style: { font: 'serif', size: 11, align: 'left' },
        },
        {
          id: 'size',
          type: 'text',
          binding: 'basic_size',
          rect: { x: 108, y: 45, w: 94, h: 8 },
          style: { font: 'serif', size: 10, align: 'left' },
        },
        {
          id: 'hobby',
          type: 'text',
          binding: 'basic_hobby',
          rect: { x: 108, y: 53, w: 94, h: 9 },
          style: { font: 'serif', size: 10, align: 'left', lineHeight: 1.4 },
        },
        {
          id: 'birthplace',
          type: 'text',
          binding: 'birthplace',
          rect: { x: 108, y: 62, w: 94, h: 6 },
          style: { font: 'serif', size: 10, align: 'left' },
        },
        {
          id: 'intro-label',
          type: 'text',
          text: '【自己紹介】',
          rect: { x: 108, y: 72, w: 40, h: 5 },
          style: { font: 'sans', size: 9, bold: true, align: 'left' },
        },
        {
          id: 'intro',
          type: 'text',
          binding: 'self_intro',
          rect: { x: 108, y: 78, w: 94, h: 36 },
          style: { font: 'sans', size: 8.5, align: 'left', lineHeight: 1.6 },
        },
        {
          id: 'links',
          type: 'links',
          bordered: true,
          rect: { x: 108, y: 119, w: 94, h: 24 },
          style: { font: 'sans', size: 8, align: 'left', lineHeight: 1.6 },
        },
        {
          id: 'act-label',
          type: 'text',
          text: '【最新の活動状況】',
          rect: { x: 10, y: 150, w: 60, h: 6 },
          style: { font: 'sans', size: 10.5, bold: true, align: 'left' },
        },
        {
          id: 'career-left',
          type: 'career_list',
          categories: ['映画'],
          rect: { x: 10, y: 157, w: 98, h: 121 },
          style: { font: 'sans', size: 8, align: 'left', lineHeight: 1.55 },
          highlightColor: '#cc0000',
        },
        {
          id: 'career-right',
          type: 'career_list',
          categories: ['TV', 'CM', 'MV'],
          rect: { x: 114, y: 157, w: 86, h: 121 },
          style: { font: 'sans', size: 8, align: 'left', lineHeight: 1.6 },
          highlightColor: '#cc0000',
        },
        {
          id: 'footer',
          type: 'footer',
          rect: { x: 8, y: 282, w: 194, h: 12 },
          style: { font: 'sans', size: 8, align: 'left' },
        },
      ],
    },
    {
      id: 'eigyo',
      name: '写真2枚',
      page: { w: 210, h: 297 },
      updated_at: now,
      elements: [
        ...headerElements(),
        { id: 'photo1', type: 'photo', slot: 'bust_up', rect: { x: 20, y: 56, w: 80, h: 107 } },
        { id: 'photo2', type: 'photo', slot: 'full_body', rect: { x: 112, y: 56, w: 80, h: 107 } },
        ...tailElements(166),
      ],
    },
    {
      id: 'photo3',
      name: '写真3枚',
      page: { w: 210, h: 297 },
      updated_at: now,
      elements: [
        ...headerElements(),
        { id: 'photo1', type: 'photo', slot: 'bust_up', rect: { x: 12, y: 56, w: 60, h: 80 } },
        { id: 'photo2', type: 'photo', slot: 'full_body', rect: { x: 75, y: 56, w: 60, h: 80 } },
        { id: 'photo3', type: 'photo', slot: 'snap', rect: { x: 138, y: 56, w: 60, h: 80 } },
        ...tailElements(142),
      ],
    },
  ];
}

// タレントに適用されるレイアウトの解決: 個別調整 > 指定テンプレート > 写真2枚 > 先頭
export function resolveTemplate(talent: Talent, templates: Template[]): Template {
  if (talent.layout) return talent.layout;
  return (
    templates.find((t) => t.id === talent.template_id) ??
    templates.find((t) => t.id === 'eigyo') ??
    templates[0]
  );
}

// 初回起動時のサンプルタレント（架空の人物・操作の練習用）
export function sampleTalent(): Talent {
  return {
    id: uid(),
    stage_name: '山田 花',
    kana: 'やまだ はな',
    romaji: 'Hana Yamada',
    gender: '女性',
    birthdate: '1995-04-12',
    show_age: true,
    birthplace: '東京都',
    height: '162',
    weight: '48',
    bust: '80',
    waist: '60',
    hip: '85',
    shoe_size: '23.5',
    head_size: '55',
    clothing_size: 'S/M',
    hobbies_skills: ['ダンス', 'ピアノ', '英会話', '殺陣'],
    self_intro:
      '東京都出身。学生時代よりミュージカルの舞台に立ち、卒業後は映像作品を中心に活動。明るい役から影のある役まで演じ分けが持ち味です。',
    tags: ['俳優'],
    careers: [
      {
        id: uid(),
        category: '映画',
        year: '2025',
        title: '春のかけら',
        director_or_station: '佐藤一郎',
        role_name: '主演 森田美咲役',
        note: '全国20館上映。',
        is_highlight: true,
      },
      { id: uid(), category: '映画', year: '2024', title: '夜明けの街', director_or_station: '田中次郎', role_name: '花屋の店員役' },
      { id: uid(), category: 'TV', year: '2025', title: '刑事の花道', episode: '3話', role_name: '受付嬢役', director_or_station: 'EX' },
      { id: uid(), category: 'TV', year: '2024', title: '朝のドラマ', role_name: 'カフェ店員役', director_or_station: 'NHK' },
      { id: uid(), category: 'CM', year: '2024', title: '飲料メーカーWebCM', role_name: 'OL役' },
      { id: uid(), category: 'MV', year: '2023', title: 'サンプルバンド『花束』', role_name: 'ヒロイン役' },
    ],
    video_links: [
      { id: uid(), label: '資料1', url: 'https://www.youtube.com/watch?v=xxxxxxx' },
    ],
    photo_slots: {},
    updated_at: new Date().toISOString(),
  };
}
