import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import {
  CAREER_CATEGORIES,
  Career,
  CareerCategory,
  PHOTO_ROLE_LABEL,
  PhotoRole,
  Talent,
  VideoLink,
} from '../types';
import { formatCareer, uid } from '../model';
import {
  CareerCandidate,
  CareerProposal,
  CollectResult,
  collectCareersFromWeb,
  proposeCareerArrangement,
} from '../ai';

type Tab = 'basic' | 'photos' | 'careers' | 'other';

export function TalentEdit({ id, navigate }: { id: string; navigate: (hash: string) => void }) {
  const store = useStore();
  const orig = store.talents.find((t) => t.id === id);
  const [t, setT] = useState<Talent | null>(orig ? JSON.parse(JSON.stringify(orig)) : null);
  const [tab, setTab] = useState<Tab>('basic');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const found = store.talents.find((x) => x.id === id);
    if (found && !dirty) setT(JSON.parse(JSON.stringify(found)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!t) return <p className="hint">タレントが見つかりません。</p>;

  function patch(p: Partial<Talent>) {
    setT((prev) => (prev ? { ...prev, ...p } : prev));
    setDirty(true);
  }

  async function save() {
    if (!t) return;
    await store.saveTalent(t);
    setDirty(false);
  }

  async function remove() {
    if (!t) return;
    if (!window.confirm(`「${t.stage_name}」を写真ごと削除します。よろしいですか？`)) return;
    await store.deleteTalent(t.id);
    navigate('#/');
  }

  const field = (
    label: string,
    key: keyof Talent,
    opts: { placeholder?: string; type?: string; width?: string } = {},
  ) => (
    <label className="field">
      <span>{label}</span>
      <input
        type={opts.type ?? 'text'}
        style={opts.width ? { width: opts.width } : undefined}
        placeholder={opts.placeholder}
        value={(t[key] as string) ?? ''}
        onChange={(e) => patch({ [key]: e.target.value } as Partial<Talent>)}
      />
    </label>
  );

  return (
    <div className="page-edit">
      <div className="edit-toolbar">
        <button onClick={() => navigate('#/')}>← 一覧</button>
        <strong>{t.stage_name || '(名称未設定)'}</strong>
        <span className="spacer" />
        <button onClick={() => navigate(`#/preview/${t.id}`)}>プレビュー / PDF</button>
        <button className="primary" onClick={save} disabled={!dirty}>
          {dirty ? '保存する' : '保存済み'}
        </button>
      </div>

      <div className="tabs">
        {(
          [
            ['basic', '基本情報'],
            ['photos', '写真'],
            ['careers', '経歴'],
            ['other', '自己紹介・動画'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} className={tab === k ? 'tab active' : 'tab'} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'basic' && (
        <div className="form-section">
          <div className="form-row">
            {field('芸名', 'stage_name')}
            {field('ふりがな', 'kana')}
            {field('ローマ字', 'romaji', { placeholder: 'Hana Yamada' })}
          </div>
          <div className="form-row">
            {field('生年月日', 'birthdate', { type: 'date' })}
            <label className="field checkbox">
              <input
                type="checkbox"
                checked={t.show_age}
                onChange={(e) => patch({ show_age: e.target.checked })}
              />
              <span>年齢を表示する</span>
            </label>
            <label className="field">
              <span>性別</span>
              <select value={t.gender ?? ''} onChange={(e) => patch({ gender: e.target.value })}>
                <option value=""></option>
                <option value="女性">女性</option>
                <option value="男性">男性</option>
                <option value="その他">その他</option>
              </select>
            </label>
            {field('出身地', 'birthplace')}
            {field('血液型', 'blood_type', { width: '4em' })}
          </div>
          <div className="form-row">
            {field('身長(cm)', 'height', { width: '5em' })}
            {field('体重(kg)', 'weight', { width: '5em' })}
            {field('B(cm)', 'bust', { width: '5em' })}
            {field('W(cm)', 'waist', { width: '5em' })}
            {field('H(cm)', 'hip', { width: '5em' })}
            {field('足(cm)', 'shoe_size', { width: '5em' })}
            {field('頭囲(cm)', 'head_size', { width: '5em' })}
            {field('服サイズ', 'clothing_size', { width: '6em', placeholder: 'L/XL' })}
          </div>
          <div className="form-row">
            <label className="field wide">
              <span>趣味・特技（カンマ区切り）</span>
              <input
                value={t.hobbies_skills.join(',')}
                placeholder="麻雀,ウクレレ,木の剪定"
                onChange={(e) =>
                  patch({ hobbies_skills: e.target.value.split(/[,、，]/).map((s) => s.trim()).filter(Boolean) })
                }
              />
            </label>
            <label className="field">
              <span>タグ（カンマ区切り）</span>
              <input
                value={t.tags.join(',')}
                placeholder="俳優,モデル"
                onChange={(e) =>
                  patch({ tags: e.target.value.split(/[,、，]/).map((s) => s.trim()).filter(Boolean) })
                }
              />
            </label>
          </div>
          <div className="danger-zone">
            <button className="danger" onClick={remove}>
              このタレントを削除
            </button>
          </div>
        </div>
      )}

      {tab === 'photos' && <PhotoTab talent={t} patch={patch} />}
      {tab === 'careers' && <CareerTab talent={t} patch={patch} />}
      {tab === 'other' && (
        <div className="form-section">
          <label className="field wide">
            <span>自己紹介文</span>
            <textarea
              rows={6}
              value={t.self_intro ?? ''}
              onChange={(e) => patch({ self_intro: e.target.value })}
            />
          </label>
          <h4>動画資料（PDF上でクリックできるリンクになります）</h4>
          {t.video_links.map((l, i) => (
            <div className="form-row" key={l.id}>
              <label className="field">
                <span>ラベル</span>
                <input
                  value={l.label}
                  onChange={(e) => {
                    const links = [...t.video_links];
                    links[i] = { ...l, label: e.target.value };
                    patch({ video_links: links });
                  }}
                />
              </label>
              <label className="field wide">
                <span>URL</span>
                <input
                  value={l.url}
                  placeholder="https://..."
                  onChange={(e) => {
                    const links = [...t.video_links];
                    links[i] = { ...l, url: e.target.value };
                    patch({ video_links: links });
                  }}
                />
              </label>
              <button onClick={() => patch({ video_links: t.video_links.filter((x) => x.id !== l.id) })}>
                削除
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              patch({
                video_links: [
                  ...t.video_links,
                  { id: uid(), label: `資料${t.video_links.length + 1}`, url: '' } as VideoLink,
                ],
              })
            }
          >
            ＋ リンクを追加
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoTab({ talent, patch }: { talent: Talent; patch: (p: Partial<Talent>) => void }) {
  const store = useStore();
  const myPhotos = store.photos.filter((p) => p.talentId === talent.id);
  const [uploadRole, setUploadRole] = useState<PhotoRole>('bust_up');

  async function onFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const meta = await store.addPhoto(talent.id, f, uploadRole);
      // その用途の枠が未割当なら自動で割り当てる
      if (!talent.photo_slots[uploadRole]) {
        patch({ photo_slots: { ...talent.photo_slots, [uploadRole]: meta.id } });
      }
    }
  }

  return (
    <div className="form-section">
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
      >
        <p>
          ここに写真をドラッグ&ドロップ、または
          <label className="filebtn">
            ファイルを選択
            <input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </label>
        </p>
        <label>
          取り込み時の用途:
          <select value={uploadRole} onChange={(e) => setUploadRole(e.target.value as PhotoRole)}>
            {(Object.keys(PHOTO_ROLE_LABEL) as PhotoRole[]).map((r) => (
              <option key={r} value={r}>
                {PHOTO_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="photo-grid">
        {myPhotos.map((p) => {
          const url = store.blobUrl(p.id);
          const used = talent.photo_slots[p.role] === p.id;
          return (
            <div key={p.id} className={`photo-item ${used ? 'used' : ''}`}>
              {url && <img src={url} alt={p.fileName} />}
              <div className="photo-meta">
                <select
                  value={p.role}
                  onChange={(e) => store.updatePhoto({ ...p, role: e.target.value as PhotoRole })}
                >
                  {(Object.keys(PHOTO_ROLE_LABEL) as PhotoRole[]).map((r) => (
                    <option key={r} value={r}>
                      {PHOTO_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  className={used ? 'primary' : ''}
                  onClick={() => patch({ photo_slots: { ...talent.photo_slots, [p.role]: p.id } })}
                >
                  {used ? '採用中' : 'この写真を採用'}
                </button>
                <div className="crop-controls">
                  <label>
                    横位置
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={p.crop.x}
                      onChange={(e) => store.updatePhoto({ ...p, crop: { ...p.crop, x: Number(e.target.value) } })}
                    />
                  </label>
                  <label>
                    縦位置
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={p.crop.y}
                      onChange={(e) => store.updatePhoto({ ...p, crop: { ...p.crop, y: Number(e.target.value) } })}
                    />
                  </label>
                  <label>
                    拡大
                    <input
                      type="range"
                      min={100}
                      max={250}
                      value={p.crop.zoom * 100}
                      onChange={(e) =>
                        store.updatePhoto({ ...p, crop: { ...p.crop, zoom: Number(e.target.value) / 100 } })
                      }
                    />
                  </label>
                </div>
                <button
                  className="danger small"
                  onClick={async () => {
                    if (!window.confirm('この写真を削除しますか？')) return;
                    const slots = { ...talent.photo_slots };
                    (Object.keys(slots) as PhotoRole[]).forEach((r) => {
                      if (slots[r] === p.id) delete slots[r];
                    });
                    patch({ photo_slots: slots });
                    await store.removePhoto(p.id);
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          );
        })}
        {myPhotos.length === 0 && <p className="hint">まだ写真がありません。上のエリアから追加してください。</p>}
      </div>
    </div>
  );
}

function CareerTab({ talent, patch }: { talent: Talent; patch: (p: Partial<Talent>) => void }) {
  function update(i: number, p: Partial<Career>) {
    const careers = [...talent.careers];
    careers[i] = { ...careers[i], ...p };
    patch({ careers });
  }
  function move(i: number, d: number) {
    const careers = [...talent.careers];
    const j = i + d;
    if (j < 0 || j >= careers.length) return;
    [careers[i], careers[j]] = [careers[j], careers[i]];
    patch({ careers });
  }

  return (
    <div className="form-section">
      <p className="hint">
        経歴は削除せず「ストック」として貯めておき、「表示」チェックでプロフィールへの掲載を切り替えます。
        「強調」にチェックすると赤字太字で目立たせます（最新作など）。
      </p>
      <CollectPanel talent={talent} patch={patch} />
      <AiArrangePanel talent={talent} patch={patch} />
      <table className="career-table">
        <thead>
          <tr>
            <th>表示</th>
            <th>カテゴリ</th>
            <th>年</th>
            <th>作品名</th>
            <th>話数・部門</th>
            <th>役名</th>
            <th>監督/局</th>
            <th>補足</th>
            <th>強調</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {talent.careers.map((c, i) => (
            <tr key={c.id} className={`${c.is_highlight ? 'hl' : ''} ${c.hidden ? 'row-hidden' : ''}`}>
              <td className="center">
                <input
                  type="checkbox"
                  checked={!c.hidden}
                  onChange={(e) => update(i, { hidden: !e.target.checked })}
                />
              </td>
              <td>
                <select
                  value={c.category}
                  onChange={(e) => update(i, { category: e.target.value as CareerCategory })}
                >
                  {CAREER_CATEGORIES.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input className="w4" value={c.year} onChange={(e) => update(i, { year: e.target.value })} />
              </td>
              <td>
                <input value={c.title} onChange={(e) => update(i, { title: e.target.value })} />
              </td>
              <td>
                <input className="w6" value={c.episode ?? ''} onChange={(e) => update(i, { episode: e.target.value })} />
              </td>
              <td>
                <input className="w8" value={c.role_name ?? ''} onChange={(e) => update(i, { role_name: e.target.value })} />
              </td>
              <td>
                <input
                  className="w8"
                  value={c.director_or_station ?? ''}
                  onChange={(e) => update(i, { director_or_station: e.target.value })}
                />
              </td>
              <td>
                <input className="w8" value={c.note ?? ''} onChange={(e) => update(i, { note: e.target.value })} />
              </td>
              <td className="center">
                <input
                  type="checkbox"
                  checked={!!c.is_highlight}
                  onChange={(e) => update(i, { is_highlight: e.target.checked })}
                />
              </td>
              <td className="row-actions">
                <button onClick={() => move(i, -1)}>↑</button>
                <button onClick={() => move(i, 1)}>↓</button>
                <button onClick={() => patch({ careers: talent.careers.filter((x) => x.id !== c.id) })}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() =>
          patch({
            careers: [
              ...talent.careers,
              { id: uid(), category: '映画', year: String(new Date().getFullYear()), title: '' },
            ],
          })
        }
      >
        ＋ 経歴を追加
      </button>
    </div>
  );
}

// 営業先の説明をもとに、AIが経歴の選抜・並べ替え・強調を提案するパネル。
// 提案は必ず人が内容を確認して「反映」した上で、さらに「保存する」で確定される二段構え。
function AiArrangePanel({ talent, patch }: { talent: Talent; patch: (p: Partial<Talent>) => void }) {
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState<CareerProposal | null>(null);

  async function run() {
    setBusy(true);
    setError('');
    setProposal(null);
    try {
      const p = await proposeCareerArrangement(talent, target.trim());
      setProposal(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!proposal) return;
    const byId = new Map(talent.careers.map((c) => [c.id, c]));
    const careers: Career[] = [];
    for (const item of proposal.items) {
      const c = byId.get(item.id);
      if (c) careers.push({ ...c, hidden: item.hidden, is_highlight: item.is_highlight });
    }
    patch({ careers });
    setProposal(null);
    setTarget('');
  }

  const byId = new Map(talent.careers.map((c) => [c.id, c]));

  return (
    <div className="ai-panel">
      <h4>営業先に合わせてAIが選抜・並べ替え</h4>
      <p className="hint">
        営業先や用途を書くと、経歴ストック全体からAIが「表示する経歴・並び順・強調」を提案します。
        内容を確認してから反映してください（経歴の文面は変更されません）。
      </p>
      <div className="ai-input-row">
        <input
          value={target}
          placeholder="例: CM中心の広告代理店向け。明るく爽やかな印象を推したい"
          onChange={(e) => setTarget(e.target.value)}
          disabled={busy}
        />
        <button className="primary" onClick={run} disabled={busy || !target.trim()}>
          {busy ? 'AIが考え中…' : 'AIに提案させる'}
        </button>
      </div>
      {error && <p className="ai-error">{error}</p>}

      {proposal && (
        <div className="ai-proposal">
          <p className="ai-reason">
            <strong>提案の方針:</strong> {proposal.reason}
          </p>
          <ul className="ai-preview">
            {proposal.items.map((item) => {
              const c = byId.get(item.id);
              if (!c) return null;
              return (
                <li key={item.id} className={item.hidden ? 'off' : item.is_highlight ? 'hl' : ''}>
                  <span className="badge">{item.hidden ? '非表示' : c.category}</span>
                  {formatCareer(c).split('\n')[0]}
                  {item.is_highlight && !item.hidden && <span className="badge hl-badge">強調</span>}
                </li>
              );
            })}
          </ul>
          <div className="ai-actions">
            <button className="primary" onClick={apply}>
              この案を反映（保存前に確認できます）
            </button>
            <button onClick={() => setProposal(null)}>破棄</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Webから出演情報を収集して経歴ストック（実績DB）への登録候補を提示するパネル。
// 収集はサーバーサイドWeb検索(Claude API)で行い、候補は人が選んでから追加する。
function CollectPanel({ talent, patch }: { talent: Talent; patch: (p: Partial<Talent>) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CollectResult | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [showSources, setShowSources] = useState(false);
  // 入力中の改行が消えないよう、表示は下書き文字列で保持し、保存データは行分割して反映する
  const [sourcesDraft, setSourcesDraft] = useState((talent.source_urls ?? []).join('\n'));

  async function run() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const r = await collectCareersFromWeb(talent);
      setResult(r);
      // 確度「高」「中」を初期選択
      setChecked(new Set(r.candidates.map((c, i) => (c.confidence !== '低' ? i : -1)).filter((i) => i >= 0)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function addSelected(hidden: boolean) {
    if (!result) return;
    const additions: Career[] = result.candidates
      .filter((_, i) => checked.has(i))
      .map((c) => ({
        id: uid(),
        category: (CAREER_CATEGORIES as string[]).includes(c.category)
          ? (c.category as CareerCategory)
          : 'その他',
        year: c.year,
        title: c.title,
        episode: c.episode,
        role_name: c.role_name,
        director_or_station: c.director_or_station,
        note: c.note,
        source_url: c.source_url,
        hidden,
      }));
    if (additions.length === 0) return;
    patch({ careers: [...talent.careers, ...additions] });
    setResult(null);
  }

  return (
    <div className="ai-panel">
      <h4>Webから出演情報を収集（実績DBに追加）</h4>
      <p className="hint">
        事務所HPのお知らせやX（SNS）、Web検索から新しい出演情報を探し、登録候補として提示します。
        候補を確認して選んだものだけがストックに追加されます。検索には1分ほどかかることがあります。
      </p>
      <div className="ai-input-row">
        <button onClick={() => setShowSources(!showSources)}>
          情報源URL {talent.source_urls?.length ? `(${talent.source_urls.length}件)` : '(未設定)'}
        </button>
        <button className="primary" onClick={run} disabled={busy}>
          {busy ? 'Webを調査中…（1分ほどかかります）' : '出演情報を収集'}
        </button>
      </div>
      {showSources && (
        <div className="prop-row">
          <label>
            情報源URL（1行に1つ。事務所HPのお知らせページ、本人のX・InstagramのURLなど。空でもWeb検索で調査します）
          </label>
          <textarea
            rows={3}
            value={sourcesDraft}
            placeholder={'https://example.com/news\nhttps://x.com/talent_account'}
            onChange={(e) => {
              setSourcesDraft(e.target.value);
              patch({ source_urls: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) });
            }}
          />
        </div>
      )}
      {error && <p className="ai-error">{error}</p>}

      {result && (
        <div className="ai-proposal">
          <p className="ai-reason">
            <strong>調査結果:</strong> {result.summary}
          </p>
          {result.candidates.length === 0 ? (
            <p className="hint">新しい出演情報は見つかりませんでした。</p>
          ) : (
            <>
              <ul className="ai-preview">
                {result.candidates.map((c, i) => (
                  <li key={i}>
                    <label className="cand">
                      <input
                        type="checkbox"
                        checked={checked.has(i)}
                        onChange={(e) => {
                          const next = new Set(checked);
                          if (e.target.checked) next.add(i);
                          else next.delete(i);
                          setChecked(next);
                        }}
                      />
                      <span className="badge">{c.category}</span>
                      {c.year && `${c.year}年`}『{c.title}』{c.episode ?? ''} {c.role_name ?? ''}{' '}
                      {c.director_or_station ?? ''}
                      <span className={`badge conf-${c.confidence}`}>確度:{c.confidence}</span>
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noreferrer" className="src-link">
                          情報源
                        </a>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="ai-actions">
                <button className="primary" onClick={() => addSelected(false)}>
                  選択した候補を表示で追加
                </button>
                <button onClick={() => addSelected(true)}>非表示（ストックのみ）で追加</button>
                <button onClick={() => setResult(null)}>破棄</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
