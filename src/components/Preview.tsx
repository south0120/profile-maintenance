import React from 'react';
import { useStore } from '../store';
import { ProfilePage } from '../render/ProfilePage';

export function Preview({ id, navigate }: { id: string; navigate: (hash: string) => void }) {
  const store = useStore();
  const talent = store.talents.find((t) => t.id === id);
  if (!talent) return <p className="hint">タレントが見つかりません。</p>;

  return (
    <div className="page-preview">
      <div className="preview-toolbar noprint">
        <button onClick={() => navigate(`#/talent/${id}`)}>← 編集に戻る</button>
        <strong>{talent.stage_name} のプレビュー</strong>
        <span className="spacer" />
        <span className="hint">
          「PDFに保存」を押すと印刷ダイアログが開きます。送信先で「PDFに保存」を選んでください（余白: なし）。
        </span>
        <button className="primary" onClick={() => window.print()}>
          PDFに保存 / 印刷
        </button>
      </div>
      <div className="preview-stage">
        <div className="print-target">
          <ProfilePage
            template={store.template}
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
