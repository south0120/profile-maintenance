import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { emptyTalent, uid } from '../model';
import { ImportedTalent, importTalentFromText } from '../ai';
import { CareerCategory, Talent } from '../types';

export function TalentList({ navigate }: { navigate: (hash: string) => void }) {
  const store = useStore();
  const [q, setQ] = useState('');
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(() => {
    const k = q.trim();
    if (!k) return store.talents;
    return store.talents.filter(
      (t) =>
        t.stage_name.includes(k) ||
        (t.kana ?? '').includes(k) ||
        (t.romaji ?? '').toLowerCase().includes(k.toLowerCase()) ||
        t.tags.some((tag) => tag.includes(k)),
    );
  }, [store.talents, q]);

  async function addTalent() {
    const t = emptyTalent();
    t.stage_name = '新規タレント';
    await store.saveTalent(t);
    navigate(`#/talent/${t.id}`);
  }

  return (
    <div className="page-list">
      <div className="list-toolbar">
        <input
          type="search"
          placeholder="名前・ふりがな・タグで検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="count">{filtered.length} 名</span>
        <span className="spacer" />
        <button onClick={() => setShowImport(!showImport)}>既存プロフィールからインポート</button>
        <button className="primary" onClick={addTalent}>
          ＋ タレントを追加
        </button>
      </div>

      {showImport && <ImportPanel navigate={navigate} onClose={() => setShowImport(false)} />}

      <div className="talent-grid">
        {filtered.map((t) => {
          const photoId = t.photo_slots.bust_up ?? t.photo_slots.full_body ?? t.photo_slots.snap;
          const url = store.blobUrl(photoId);
          return (
            <div key={t.id} className="talent-card" onClick={() => navigate(`#/talent/${t.id}`)}>
              <div className="thumb">
                {url ? <img src={url} alt="" /> : <span className="noimg">写真なし</span>}
              </div>
              <div className="card-body">
                <div className="card-name">{t.stage_name || '(名称未設定)'}</div>
                <div className="card-kana">{t.kana}</div>
                <div className="card-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`#/preview/${t.id}`);
                    }}
                  >
                    プレビュー
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="hint">該当するタレントがいません。</p>}
      </div>
    </div>
  );
}

// 既存のWord/Excel等のプロフィール文面を貼り付けて、AIが構造化 → 確認して取り込むパネル
function ImportPanel({ navigate, onClose }: { navigate: (h: string) => void; onClose: () => void }) {
  const store = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<ImportedTalent | null>(null);

  async function run() {
    setBusy(true);
    setError('');
    setParsed(null);
    try {
      const p = await importTalentFromText(text);
      setParsed(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addAsTalent() {
    if (!parsed) return;
    const t: Talent = {
      ...emptyTalent(),
      stage_name: parsed.stage_name,
      kana: parsed.kana,
      romaji: parsed.romaji,
      gender: parsed.gender,
      birthdate: parsed.birthdate,
      birthplace: parsed.birthplace,
      blood_type: parsed.blood_type,
      height: parsed.height,
      weight: parsed.weight,
      bust: parsed.bust,
      waist: parsed.waist,
      hip: parsed.hip,
      shoe_size: parsed.shoe_size,
      head_size: parsed.head_size,
      clothing_size: parsed.clothing_size,
      hobbies_skills: parsed.hobbies_skills ?? [],
      self_intro: parsed.self_intro,
      careers: parsed.careers.map((c) => ({
        id: uid(),
        category: c.category as CareerCategory,
        year: c.year,
        title: c.title,
        episode: c.episode,
        role_name: c.role_name,
        director_or_station: c.director_or_station,
        note: c.note,
      })),
    };
    await store.saveTalent(t);
    onClose();
    navigate(`#/talent/${t.id}`);
  }

  const filledFields = parsed
    ? (
        [
          ['ふりがな', parsed.kana],
          ['ローマ字', parsed.romaji],
          ['生年月日', parsed.birthdate],
          ['身長', parsed.height],
          ['B/W/H', parsed.bust && `${parsed.bust}/${parsed.waist}/${parsed.hip}`],
          ['趣味・特技', parsed.hobbies_skills?.length ? `${parsed.hobbies_skills.length}件` : ''],
          ['自己紹介', parsed.self_intro ? 'あり' : ''],
        ] as [string, string | undefined][]
      ).filter(([, v]) => v)
    : [];

  return (
    <div className="ai-panel" style={{ marginBottom: 18 }}>
      <h4>既存プロフィールからインポート</h4>
      <p className="hint">
        今までWordやExcelで作っていたプロフィールの文面を、そのままコピーして貼り付けてください。
        AIが基本情報と経歴に整理します（内容を確認してから登録されます）。
      </p>
      <textarea
        rows={7}
        value={text}
        placeholder={'例:\n山田 花（やまだ はな）\n1995年4月12日生 東京都出身 162cm B80 W60 H85\n【映画】2025年『春のかけら』主演 …\n【TV】2024年 NHK『朝のドラマ』…'}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />
      <div className="ai-actions" style={{ marginTop: 10 }}>
        <button className="primary" onClick={run} disabled={busy || !text.trim()}>
          {busy ? 'AIが読み取り中…' : 'AIで読み取る'}
        </button>
        <button onClick={onClose}>閉じる</button>
      </div>
      {error && <p className="ai-error">{error}</p>}

      {parsed && (
        <div className="ai-proposal">
          <p className="ai-reason">
            <strong>{parsed.stage_name}</strong> さんとして読み取りました ─ 経歴 {parsed.careers.length} 件
            {filledFields.length > 0 && (
              <span className="hint">
                {' '}
                ／ 取り込む項目: {filledFields.map(([k]) => k).join('・')}
              </span>
            )}
          </p>
          <ul className="ai-preview">
            {parsed.careers.slice(0, 12).map((c, i) => (
              <li key={i}>
                <span className="badge">{c.category}</span>
                {c.year && `${c.year}年`}『{c.title}』{c.episode ?? ''} {c.role_name ?? ''} {c.director_or_station ?? ''}
              </li>
            ))}
            {parsed.careers.length > 12 && (
              <li className="hint">…ほか {parsed.careers.length - 12} 件</li>
            )}
          </ul>
          <div className="ai-actions">
            <button className="primary" onClick={addAsTalent}>
              この内容でタレントを登録
            </button>
            <button onClick={() => setParsed(null)}>破棄</button>
          </div>
        </div>
      )}
    </div>
  );
}
