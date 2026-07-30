import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Agency } from '../types';
import { exportBackup, importBackup } from '../backup';
import { getApiKey, saveApiKey } from '../ai';

export function Settings() {
  const store = useStore();
  const [a, setA] = useState<Agency>({ ...store.agency });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const logoUrl = store.blobUrl(store.agency.logoBlobId);

  function patch(p: Partial<Agency>) {
    setA((prev) => ({ ...prev, ...p }));
    setDirty(true);
  }

  async function save() {
    await store.saveAgency({ ...a, logoBlobId: store.agency.logoBlobId });
    setDirty(false);
  }

  const field = (label: string, key: keyof Agency, placeholder?: string) => (
    <label className="field wide">
      <span>{label}</span>
      <input value={(a[key] as string) ?? ''} placeholder={placeholder} onChange={(e) => patch({ [key]: e.target.value })} />
    </label>
  );

  return (
    <div className="page-settings">
      <h2>事務所情報（全タレントのフッターに反映されます）</h2>
      <div className="form-section">
        {field('事務所名', 'name', '株式会社〇〇プロダクション')}
        {field('電話番号', 'tel', '03-0000-0000')}
        {field('住所', 'address', '〒000-0000 東京都…')}
        {field('メールアドレス', 'email', 'info@example.com')}
        {field('WebサイトURL', 'website', 'https://example.com')}
        <div className="form-row">
          <label className="field">
            <span>ロゴ・マーク画像</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) store.setLogo(f);
              }}
            />
          </label>
          {logoUrl && <img src={logoUrl} alt="ロゴ" style={{ height: 48, objectFit: 'contain' }} />}
        </div>
        <button className="primary" onClick={save} disabled={!dirty}>
          {dirty ? '保存する' : '保存済み'}
        </button>
      </div>

      <h2>AI設定</h2>
      <div className="form-section">
        <p className="hint">
          経歴の「営業先向けAI提案」機能に使う Anthropic APIキーを登録します（
          <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
          で発行、従量課金）。キーはこのPCのブラウザ内にのみ保存され、バックアップZIPには含まれません。
        </p>
        <ApiKeyField />
      </div>

      <h2>バックアップ</h2>
      <div className="form-section">
        <p className="hint">
          データはこのPCのブラウザ内に保存されています。定期的にバックアップZIPを書き出して、
          Googleドライブなどに保管してください。別のPCへの移行や復元は「読み込み」から行えます。
        </p>
        <div className="form-row">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await exportBackup();
              } finally {
                setBusy(false);
              }
            }}
          >
            バックアップZIPを書き出し
          </button>
          <label className="filebtn">
            バックアップZIPを読み込み
            <input
              type="file"
              accept=".zip"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!window.confirm('バックアップを読み込みます。同じIDのデータは上書きされます。よろしいですか？')) return;
                setBusy(true);
                try {
                  await importBackup(f);
                  await store.reload();
                  alert('読み込みが完了しました');
                } catch (err) {
                  alert(`読み込みに失敗しました: ${err}`);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function ApiKeyField() {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    getApiKey().then((k) => setKey(k));
  }, []);
  return (
    <div className="form-row">
      <label className="field wide">
        <span>Anthropic APIキー</span>
        <input
          type="password"
          value={key}
          placeholder="sk-ant-..."
          onChange={(e) => {
            setKey(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <button
        className="primary"
        onClick={async () => {
          await saveApiKey(key);
          setSaved(true);
        }}
      >
        {saved ? '保存済み' : 'キーを保存'}
      </button>
    </div>
  );
}
