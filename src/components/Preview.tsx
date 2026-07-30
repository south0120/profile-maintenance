import React from 'react';
import { useStore } from '../store';
import { ProfilePage } from '../render/ProfilePage';
import { resolveTemplate } from '../defaultData';

export function Preview({ id, navigate }: { id: string; navigate: (hash: string) => void }) {
  const store = useStore();
  const talent = store.talents.find((t) => t.id === id);
  if (!talent) return <p className="hint">タレントが見つかりません。</p>;

  const template = resolveTemplate(talent, store.templates);
  const hasOverride = !!talent.layout;

  async function changeTemplate(templateId: string) {
    if (!talent) return;
    await store.saveTalent({ ...talent, template_id: templateId });
  }

  async function resetToTemplate() {
    if (!talent) return;
    if (!window.confirm('このタレント専用のレイアウト調整を破棄して、テンプレートに戻します。よろしいですか？')) return;
    await store.saveTalent({ ...talent, layout: undefined });
  }

  return (
    <div className="page-preview">
      <div className="preview-toolbar noprint">
        <button onClick={() => navigate(`#/talent/${id}`)}>← 編集に戻る</button>
        <strong>{talent.stage_name}</strong>
        {hasOverride ? (
          <>
            <span className="pill">個別レイアウト適用中</span>
            <button onClick={resetToTemplate}>テンプレートに戻す</button>
          </>
        ) : (
          <label className="tpl-select">
            テンプレート:
            <select value={template.id} onChange={(e) => changeTemplate(e.target.value)}>
              {store.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button onClick={() => navigate(`#/layout/${id}`)}>このタレント用にレイアウト調整</button>
        <span className="spacer" />
        <span className="hint">「PDFに保存」→ 送信先で「PDFに保存」を選択（余白: なし）</span>
        <button className="primary" onClick={() => window.print()}>
          PDFに保存 / 印刷
        </button>
      </div>
      <div className="preview-stage">
        <div className="print-target">
          <ProfilePage
            template={template}
            talent={talent}
            agency={store.agency}
            photos={store.photos}
            blobUrl={store.blobUrl}
          />
        </div>
      </div>
    </div>
  );
}
