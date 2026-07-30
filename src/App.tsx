import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { TalentList } from './components/TalentList';
import { TalentEdit } from './components/TalentEdit';
import { Preview } from './components/Preview';
import { Settings } from './components/Settings';
import { LayoutEditor } from './editor/LayoutEditor';

function useHashRoute(): [string, (h: string) => void] {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = (h: string) => {
    window.location.hash = h;
  };
  return [hash, navigate];
}

function Shell() {
  const store = useStore();
  const [hash, navigate] = useHashRoute();

  if (!store.ready) return <div className="loading">読み込み中…</div>;

  let page: React.ReactNode;
  const mTalent = hash.match(/^#\/talent\/(.+)$/);
  const mPreview = hash.match(/^#\/preview\/(.+)$/);
  if (mTalent) page = <TalentEdit id={mTalent[1]} navigate={navigate} />;
  else if (mPreview) page = <Preview id={mPreview[1]} navigate={navigate} />;
  else if (hash === '#/editor') page = <LayoutEditor />;
  else if (hash === '#/settings') page = <Settings />;
  else page = <TalentList navigate={navigate} />;

  const nav = (h: string, label: string) => (
    <a className={hash === h ? 'active' : ''} href={h}>
      {label}
    </a>
  );

  return (
    <div className="app">
      <nav className="topnav noprint">
        <span className="brand">タレントプロフィール管理</span>
        {nav('#/', 'タレント一覧')}
        {nav('#/editor', 'レイアウト')}
        {nav('#/settings', '設定')}
      </nav>
      <main>{page}</main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
