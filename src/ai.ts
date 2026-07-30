import Anthropic from '@anthropic-ai/sdk';
import { Talent } from './types';

// AI提案は必ず人の確認を経て反映する方針（要件F8）。
// このモジュールは「提案の生成」のみを行い、保存は呼び出し側のUIが担う。

const API_KEY_STORAGE = 'anthropic_api_key';
const MODEL_STORAGE = 'anthropic_model';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function saveApiKey(key: string): void {
  if (key) localStorage.setItem(API_KEY_STORAGE, key.trim());
  else localStorage.removeItem(API_KEY_STORAGE);
}

// 利用モデル。日常業務の選抜・収集は軽量モデルで十分なため、既定はHaiku。
export const AI_MODELS = [
  { id: 'claude-haiku-4-5', label: '軽量・最安（Haiku 4.5）※おすすめ' },
  { id: 'claude-sonnet-5', label: 'バランス（Sonnet 5）' },
  { id: 'claude-opus-5', label: '最高精度（Opus 5）' },
];

export function getModel(): string {
  const m = localStorage.getItem(MODEL_STORAGE);
  return AI_MODELS.some((x) => x.id === m) ? (m as string) : 'claude-haiku-4-5';
}

export function saveModel(model: string): void {
  localStorage.setItem(MODEL_STORAGE, model);
}

// Web収集はサーバーサイド検索ツールの対応と情報の取捨選択の判断力が必要なため、
// Haiku選択時もSonnet 5で実行する（選抜は選択モデルをそのまま使用）。
export function getCollectModel(): string {
  const m = getModel();
  return m === 'claude-haiku-4-5' ? 'claude-sonnet-5' : m;
}

export interface CareerProposalItem {
  id: string;
  hidden: boolean;
  is_highlight: boolean;
}

export interface CareerProposal {
  items: CareerProposalItem[]; // 配列の順序 = 新しい表示順
  reason: string; // 選抜・並べ替えの方針説明（日本語）
}

const PROPOSAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'reason'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'hidden', 'is_highlight'],
        properties: {
          id: { type: 'string' },
          hidden: { type: 'boolean' },
          is_highlight: { type: 'boolean' },
        },
      },
    },
    reason: { type: 'string' },
  },
};

const SYSTEM_PROMPT = `あなたはタレント事務所のベテランマネージャーの補佐として、宣材プロフィールの経歴欄を営業先に合わせて最適化します。

タレントの経歴ストック（全出演歴）と営業先の説明を受け取り、次のルールで「表示する経歴の選抜・並べ替え・強調」を提案してください。

ルール:
- 経歴の内容（作品名・役名など）は一切変更しない。id で参照するだけ
- items 配列にはストックの全経歴の id を必ず1回ずつ含める（漏れ・重複・創作は不可）
- items の並び順が新しい表示順になる（同一カテゴリ内での順序として使われる）。営業先への訴求力が高いものを上位に
- 営業先との関連が薄い・古い・印象を弱めるものは hidden: true（削除ではなく非表示）
- **競合バッティングの回避**: 営業先の説明から競合関係を推測し、営業先と競合する企業・団体・ブランドとの仕事は hidden: true にする。例: プロ野球球団の案件なら他球団・他チームとの仕事、飲料メーカーの案件なら他の飲料メーカーのCM、通信会社なら他キャリアのCM など。作品名・局名・補足から競合との仕事と推測できるものも対象
- is_highlight: true（赤字太字で強調）は全体で1〜3件まで。営業先に最も刺さる実績に付ける
- 競合以外は迷ったら表示を残す（非表示にしすぎない）
- reason には選抜方針を日本語で簡潔に説明する。競合を理由に非表示にしたものがあれば必ず明記する`;

export async function proposeCareerArrangement(
  talent: Talent,
  target: string,
): Promise<CareerProposal> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Anthropic APIキーが未設定です。「設定」画面のAI設定から登録してください。');
  }
  if (talent.careers.length === 0) {
    throw new Error('経歴が1件も登録されていません。先に経歴を入力してください。');
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const stock = talent.careers.map((c) => ({
    id: c.id,
    category: c.category,
    year: c.year,
    title: c.title,
    episode: c.episode ?? '',
    role: c.role_name ?? '',
    director_or_station: c.director_or_station ?? '',
    note: c.note ?? '',
    current_hidden: !!c.hidden,
    current_highlight: !!c.is_highlight,
  }));

  const userContent = [
    `# 営業先・用途`,
    target,
    '',
    `# タレント`,
    `${talent.stage_name}（${talent.tags.join('/') || 'タレント'}）`,
    talent.self_intro ? `自己紹介: ${talent.self_intro}` : '',
    '',
    `# 経歴ストック（JSON）`,
    JSON.stringify(stock, null, 2),
  ].join('\n');

  const model = getModel();
  let response;
  try {
    response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // 安全分類のフォールバックはOpus系のみ対応
      ...(model === 'claude-opus-5'
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
        : { betas: [] }),
      output_config: {
        format: { type: 'json_schema', schema: PROPOSAL_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error('APIキーが正しくありません。「設定」画面で確認してください。');
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error('利用制限に達しました。しばらく待ってからお試しください。');
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new Error('ネットワークに接続できませんでした。接続を確認してください。');
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`AIの呼び出しに失敗しました (${err.status ?? '不明'}): ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('AIがこの内容の処理を実行できませんでした。営業先の記述を変えてお試しください。');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('経歴が多すぎて処理しきれませんでした。件数を分けてお試しください。');
  }

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  let parsed: CareerProposal;
  try {
    parsed = JSON.parse(text) as CareerProposal;
  } catch {
    throw new Error('AIの応答を読み取れませんでした。もう一度お試しください。');
  }

  // 検証: 既知のidのみ・全id網羅（欠けは末尾に現状維持で補完）
  const known = new Map(talent.careers.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const items: CareerProposalItem[] = [];
  for (const item of parsed.items ?? []) {
    if (!known.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push({ id: item.id, hidden: !!item.hidden, is_highlight: !!item.is_highlight });
  }
  for (const c of talent.careers) {
    if (!seen.has(c.id)) {
      items.push({ id: c.id, hidden: !!c.hidden, is_highlight: !!c.is_highlight });
    }
  }

  return { items, reason: parsed.reason ?? '' };
}

// ---- Webからの出演情報収集 ----

export interface CareerCandidate {
  category: string;
  year: string;
  title: string;
  episode?: string;
  role_name?: string;
  director_or_station?: string;
  note?: string;
  source_url?: string;
  confidence: '高' | '中' | '低';
}

export interface CollectResult {
  candidates: CareerCandidate[];
  summary: string;
}

const COLLECT_PROMPT = `あなたはタレント事務所のデスク担当の補佐です。指定されたタレントの最近の出演情報・活動情報をWebから収集し、経歴データベースへの登録候補として整理します。

手順:
1. 指定された情報源URL（事務所HPのお知らせ、本人のSNSなど）があれば web_fetch で内容を確認する
2. web_search でタレント名（＋既知の出演作品名を組み合わせて同姓同名を排除）を検索し、新しい出演情報を探す
3. 見つかった情報を経歴候補として整理する

ルール:
- **同姓同名に注意**: 既知の出演歴・プロフィールと矛盾する人物の情報は候補にしない
- **既に登録済みの経歴（一覧を渡す）と同じものは候補にしない**（新規のみ）
- 未確定情報・噂は含めない。公式発表・本人/事務所の発信を優先する
- 各候補に必ず情報源のURL (source_url) を付ける。確認できた度合いを confidence（高=公式発表を直接確認/中=信頼できる媒体の記事/低=断片的な情報）で示す
- category は「映画」「TV」「CM」「MV」「舞台」「その他」のいずれか
- 見つからなければ candidates は空配列でよい。無理に候補を作らない
- summary には調査の要約（何を調べて何が見つかったか）を日本語で簡潔に書く

最終的な回答は次のJSONのみを出力する（前後に説明文を付けない）:
{"candidates": [{"category": "TV", "year": "2026", "title": "作品名", "episode": "3話", "role_name": "〇〇役", "director_or_station": "NHK", "note": "", "source_url": "https://...", "confidence": "高"}], "summary": "..."}`;

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('JSONが見つかりません');
  return JSON.parse(text.slice(start, end + 1));
}

export async function collectCareersFromWeb(talent: Talent): Promise<CollectResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Anthropic APIキーが未設定です。「設定」画面のAI設定から登録してください。');
  }
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const existing = talent.careers.map(
    (c) => `${c.category} / ${c.year}年 / ${c.title} / ${c.role_name ?? ''}`,
  );
  const sources = (talent.source_urls ?? []).filter(Boolean);

  const userContent = [
    `# 調査対象タレント`,
    `名前: ${talent.stage_name}${talent.kana ? `（${talent.kana}）` : ''}${talent.romaji ? ` / ${talent.romaji}` : ''}`,
    talent.tags.length ? `職種: ${talent.tags.join('/')}` : '',
    talent.self_intro ? `プロフィール: ${talent.self_intro}` : '',
    '',
    `# 情報源URL（あれば優先して確認）`,
    sources.length ? sources.join('\n') : '（指定なし。Web検索のみで調査）',
    '',
    `# 登録済みの経歴（これらは候補に含めない。同姓同名の判別にも使う）`,
    existing.length ? existing.join('\n') : '（未登録）',
  ]
    .filter((l) => l !== '')
    .join('\n');

  const collectModel = getCollectModel();
  const baseParams = {
    model: collectModel,
    max_tokens: 16000,
    ...(collectModel === 'claude-opus-5'
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : { betas: [] as string[] }),
    tools: [
      { type: 'web_search_20260209' as const, name: 'web_search' as const, max_uses: 8 },
      { type: 'web_fetch_20260209' as const, name: 'web_fetch' as const, max_uses: 8 },
    ],
    system: COLLECT_PROMPT,
  };

  let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: userContent }];
  let response;
  try {
    response = await client.beta.messages.create({ ...baseParams, messages });
    // サーバーサイドツールのループが上限に達した場合は継続する
    let guard = 0;
    while (response.stop_reason === 'pause_turn' && guard++ < 5) {
      messages = [...messages, { role: 'assistant', content: response.content }];
      response = await client.beta.messages.create({ ...baseParams, messages });
    }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error('APIキーが正しくありません。「設定」画面で確認してください。');
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error('利用制限に達しました。しばらく待ってからお試しください。');
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new Error('ネットワークに接続できませんでした。接続を確認してください。');
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`AIの呼び出しに失敗しました (${err.status ?? '不明'}): ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('AIがこの調査を実行できませんでした。');
  }

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  let parsed: CollectResult;
  try {
    parsed = extractJson(text) as CollectResult;
  } catch {
    throw new Error('AIの応答を読み取れませんでした。もう一度お試しください。');
  }

  // 検証と正規化 + 登録済みタイトルとの重複除外
  const validCats = ['映画', 'TV', 'CM', 'MV', '舞台', 'その他'];
  const existingTitles = new Set(talent.careers.map((c) => `${c.title}`.trim()));
  const candidates: CareerCandidate[] = (parsed.candidates ?? [])
    .filter((c) => c && typeof c.title === 'string' && c.title.trim() !== '')
    .filter((c) => !existingTitles.has(c.title.trim()))
    .map((c) => ({
      category: validCats.includes(c.category) ? c.category : 'その他',
      year: String(c.year ?? ''),
      title: c.title.trim(),
      episode: c.episode || undefined,
      role_name: c.role_name || undefined,
      director_or_station: c.director_or_station || undefined,
      note: c.note || undefined,
      source_url: c.source_url || undefined,
      confidence: c.confidence === '高' || c.confidence === '低' ? c.confidence : '中',
    }));

  return { candidates, summary: parsed.summary ?? '' };
}
