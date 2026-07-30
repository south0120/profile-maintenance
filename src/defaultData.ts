import { uid } from './model';
import { Talent, Template } from './types';

// 営業用テンプレート: 実物サンプル(A4縦1枚)のレイアウトを再現
export function defaultTemplate(): Template {
  return {
    id: 'eigyo',
    name: '営業用（1枚）',
    page: { w: 210, h: 297 },
    updated_at: new Date().toISOString(),
    elements: [
      {
        id: 'name',
        type: 'text',
        binding: 'name_full',
        rect: { x: 25, y: 8, w: 160, h: 15 },
        style: { font: 'serif', size: 27, bold: true, align: 'center' },
      },
      { id: 'rule', type: 'line', rect: { x: 15, y: 24.5, w: 180, h: 0.4 }, color: '#555555' },
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
      { id: 'photo1', type: 'photo', slot: 'bust_up', rect: { x: 20, y: 56, w: 80, h: 107 } },
      { id: 'photo2', type: 'photo', slot: 'full_body', rect: { x: 112, y: 56, w: 80, h: 107 } },
      {
        id: 'act-label',
        type: 'text',
        text: '【最新の活動状況】',
        rect: { x: 10, y: 166, w: 60, h: 6 },
        style: { font: 'sans', size: 10.5, bold: true, align: 'left' },
      },
      {
        id: 'career-left',
        type: 'career_list',
        categories: ['映画'],
        rect: { x: 10, y: 173, w: 98, h: 77 },
        style: { font: 'sans', size: 8, align: 'left', lineHeight: 1.55 },
        highlightColor: '#cc0000',
      },
      {
        id: 'career-right',
        type: 'career_list',
        categories: ['TV', 'CM', 'MV'],
        rect: { x: 114, y: 173, w: 86, h: 62 },
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
    ],
  };
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
