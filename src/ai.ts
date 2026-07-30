import Anthropic from '@anthropic-ai/sdk';
import { Talent } from './types';

// AI提案は必ず人の確認を経て反映する方針（要件F8）。
// このモジュールは「提案の生成」のみを行い、保存は呼び出し側のUIが担う。

const API_KEY_STORAGE = 'anthropic_api_key';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function saveApiKey(key: string): void {
  if (key) localStorage.setItem(API_KEY_STORAGE, key.trim());
  else localStorage.removeItem(API_KEY_STORAGE);
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
- is_highlight: true（赤字太字で強調）は全体で1〜3件まで。営業先に最も刺さる実績に付ける
- 迷ったら表示を残す（非表示にしすぎない）。各カテゴリ最低1件は表示を残すことが望ましい
- reason には選抜方針を日本語で3行以内で簡潔に説明する`;

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

  let response;
  try {
    response = await client.beta.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
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
