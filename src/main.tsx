import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// ブラウザにデータの永続保持を要求（容量逼迫時などの自動削除を防ぐ）
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
