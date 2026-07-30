import { Agency, Career, Talent } from './types';

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function calcAge(birthdate?: string): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function formatBirth(t: Talent): string {
  const parts: string[] = [];
  if (t.birthdate) {
    const d = new Date(t.birthdate);
    if (!isNaN(d.getTime())) {
      let s = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
      if (t.show_age) {
        const age = calcAge(t.birthdate);
        if (age !== null) s += `（${age}歳）`;
      }
      parts.push(s);
    }
  }
  if (t.gender) parts.push(t.gender);
  return parts.join(' ');
}

export function formatBody(t: Talent): string {
  const parts: string[] = [];
  if (t.height) parts.push(`身長 ${t.height}cm`);
  if (t.weight) parts.push(`体重 ${t.weight}kg`);
  return parts.join('　');
}

export function formatSize(t: Talent): string {
  const parts: string[] = [];
  if (t.bust) parts.push(`B${t.bust}cm`);
  if (t.waist) parts.push(`W${t.waist}cm`);
  if (t.hip) parts.push(`H${t.hip}cm`);
  if (t.shoe_size) parts.push(`足${t.shoe_size}cm`);
  if (t.head_size) parts.push(`頭${t.head_size}cm`);
  if (t.clothing_size) parts.push(`サイズ${t.clothing_size}`);
  return parts.join(' ');
}

export function formatHobby(t: Talent): string {
  if (!t.hobbies_skills.length) return '';
  return `趣味・特技　${t.hobbies_skills.join(',')}`;
}

export function resolveBinding(key: string, t: Talent): string {
  switch (key) {
    case 'stage_name':
      return t.stage_name;
    case 'kana':
      return t.kana ?? '';
    case 'romaji':
      return t.romaji ?? '';
    case 'basic_birth':
      return formatBirth(t);
    case 'basic_body':
      return formatBody(t);
    case 'basic_size':
      return formatSize(t);
    case 'basic_hobby':
      return formatHobby(t);
    case 'self_intro':
      return t.self_intro ?? '';
    case 'birthplace':
      return t.birthplace ? `出身地 ${t.birthplace}` : '';
    default:
      return '';
  }
}

// カテゴリごとの慣行に合わせて経歴1行を組み立てる
export function formatCareer(c: Career): string {
  const title = c.title ? `『${c.title}』` : '';
  const year = c.year ? `${c.year}年` : '';
  const parts: string[] = [];
  if (c.category === 'TV') {
    parts.push(`${year}${c.director_or_station ?? ''}${title}`);
    if (c.episode) parts.push(c.episode);
    if (c.role_name) parts.push(c.role_name);
  } else if (c.category === '映画') {
    parts.push(`${year}${title}`);
    if (c.director_or_station) parts.push(`監督：${c.director_or_station}`);
    if (c.episode) parts.push(c.episode);
    if (c.role_name) parts.push(c.role_name);
  } else {
    parts.push(`${year}${c.director_or_station ?? ''}${title}`);
    if (c.episode) parts.push(c.episode);
    if (c.role_name) parts.push(c.role_name);
  }
  let line = parts.filter(Boolean).join('　');
  if (c.note) line += `\n${c.note}`;
  return line;
}

export function emptyTalent(): Talent {
  return {
    id: uid(),
    stage_name: '',
    show_age: true,
    hobbies_skills: [],
    tags: [],
    careers: [],
    video_links: [],
    photo_slots: {},
    updated_at: new Date().toISOString(),
  };
}

export function emptyAgency(): Agency {
  return { name: '' };
}
