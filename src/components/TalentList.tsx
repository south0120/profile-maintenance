import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { emptyTalent } from '../model';

export function TalentList({ navigate }: { navigate: (hash: string) => void }) {
  const store = useStore();
  const [q, setQ] = useState('');

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
        <button className="primary" onClick={addTalent}>
          ＋ タレントを追加
        </button>
      </div>

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
