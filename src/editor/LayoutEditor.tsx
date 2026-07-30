import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { ElementView, PX_PER_MM } from '../render/ProfilePage';
import {
  CAREER_CATEGORIES,
  CareerCategory,
  RectMM,
  Template,
  TemplateElement,
  TEXT_BINDINGS,
  TextStyle,
} from '../types';
import { sampleTalent } from '../defaultData';
import { uid } from '../model';

type Dir = { n?: boolean; s?: boolean; e?: boolean; w?: boolean };

const SNAP = 0.5; // mm

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

export function LayoutEditor() {
  const store = useStore();
  const [tpl, setTpl] = useState<Template>(() => JSON.parse(JSON.stringify(store.template)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [previewTalentId, setPreviewTalentId] = useState<string | ''>('');
  const [dirty, setDirty] = useState(false);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    orig: RectMM;
    dir: Dir | null; // null = 移動
  } | null>(null);
  const demo = useMemo(() => sampleTalent(), []);

  const previewTalent = store.talents.find((t) => t.id === previewTalentId) ?? store.talents[0] ?? demo;
  const selected = tpl.elements.find((e) => e.id === selectedId) ?? null;

  function updateElement(id: string, patch: Partial<TemplateElement>) {
    setTpl((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as TemplateElement) : e)),
    }));
    setDirty(true);
  }

  function updateRect(id: string, rect: RectMM) {
    updateElement(id, { rect });
  }

  function updateStyle(id: string, patch: Partial<TextStyle>) {
    const el = tpl.elements.find((e) => e.id === id);
    if (!el || !('style' in el)) return;
    updateElement(id, { style: { ...el.style, ...patch } } as Partial<TemplateElement>);
  }

  function onPointerDown(e: React.PointerEvent, id: string, dir: Dir | null) {
    e.stopPropagation();
    e.preventDefault();
    const el = tpl.elements.find((x) => x.id === id);
    if (!el) return;
    setSelectedId(id);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, orig: { ...el.rect }, dir };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / (PX_PER_MM * zoom);
    const dy = (e.clientY - d.startY) / (PX_PER_MM * zoom);
    let { x, y, w, h } = d.orig;
    if (!d.dir) {
      x = snap(d.orig.x + dx);
      y = snap(d.orig.y + dy);
    } else {
      if (d.dir.e) w = Math.max(2, snap(d.orig.w + dx));
      if (d.dir.s) h = Math.max(1, snap(d.orig.h + dy));
      if (d.dir.w) {
        const nx = snap(d.orig.x + dx);
        w = Math.max(2, d.orig.w + (d.orig.x - nx));
        x = nx;
      }
      if (d.dir.n) {
        const ny = snap(d.orig.y + dy);
        h = Math.max(1, d.orig.h + (d.orig.y - ny));
        y = ny;
      }
    }
    updateRect(d.id, { x, y, w, h });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!selected) return;
    const step = e.shiftKey ? 5 : 0.5;
    const r = { ...selected.rect };
    if (e.key === 'ArrowLeft') r.x -= step;
    else if (e.key === 'ArrowRight') r.x += step;
    else if (e.key === 'ArrowUp') r.y -= step;
    else if (e.key === 'ArrowDown') r.y += step;
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      setTpl((prev) => ({ ...prev, elements: prev.elements.filter((x) => x.id !== selected.id) }));
      setSelectedId(null);
      setDirty(true);
      e.preventDefault();
      return;
    } else return;
    e.preventDefault();
    updateRect(selected.id, r);
  }

  function addElement(type: string) {
    const base = { id: uid(), rect: { x: 20, y: 20, w: 60, h: 10 } };
    let el: TemplateElement;
    if (type === 'text')
      el = { ...base, type: 'text', text: 'テキスト', style: { font: 'sans', size: 10, align: 'left' } };
    else if (type === 'photo') el = { ...base, type: 'photo', slot: 'snap', rect: { x: 20, y: 20, w: 50, h: 65 } };
    else if (type === 'career_list')
      el = {
        ...base,
        type: 'career_list',
        categories: ['舞台'],
        style: { font: 'sans', size: 8, align: 'left', lineHeight: 1.5 },
        highlightColor: '#cc0000',
        rect: { x: 20, y: 20, w: 90, h: 40 },
      };
    else if (type === 'line') el = { ...base, type: 'line', rect: { x: 20, y: 20, w: 100, h: 0.4 } };
    else if (type === 'links')
      el = { ...base, type: 'links', bordered: true, style: { font: 'sans', size: 8, align: 'left' }, rect: { x: 20, y: 20, w: 80, h: 20 } };
    else el = { ...base, type: 'footer', style: { font: 'sans', size: 8, align: 'left' }, rect: { x: 8, y: 282, w: 194, h: 12 } };
    setTpl((prev) => ({ ...prev, elements: [...prev.elements, el] }));
    setSelectedId(el.id);
    setDirty(true);
  }

  function moveZ(id: string, delta: number) {
    const el = tpl.elements.find((x) => x.id === id);
    if (!el) return;
    updateElement(id, { z: Math.max(0, (el.z ?? 1) + delta) });
  }

  async function save() {
    await store.saveTemplate(tpl);
    setDirty(false);
  }

  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty]);

  return (
    <div className="editor-layout">
      <div className="editor-toolbar">
        <strong>レイアウトエディタ</strong>
        <span className="tpl-name">{tpl.name}</span>
        <label>
          表示データ:
          <select value={previewTalentId} onChange={(e) => setPreviewTalentId(e.target.value)}>
            {store.talents.map((t) => (
              <option key={t.id} value={t.id}>
                {t.stage_name || '(名称未設定)'}
              </option>
            ))}
          </select>
        </label>
        <label>
          倍率:
          <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
            <option value={0.6}>60%</option>
            <option value={0.85}>85%</option>
            <option value={1}>100%</option>
            <option value={1.4}>140%</option>
          </select>
        </label>
        <span className="spacer" />
        <div className="add-buttons">
          追加:
          <button onClick={() => addElement('text')}>テキスト</button>
          <button onClick={() => addElement('photo')}>写真枠</button>
          <button onClick={() => addElement('career_list')}>経歴リスト</button>
          <button onClick={() => addElement('line')}>罫線</button>
          <button onClick={() => addElement('links')}>動画リンク</button>
        </div>
        <button className="primary" onClick={save} disabled={!dirty}>
          {dirty ? 'テンプレートを保存' : '保存済み'}
        </button>
      </div>

      <div className="editor-body">
        <div className="editor-canvas-wrap" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <div
            className="editor-canvas"
            tabIndex={0}
            onKeyDown={onKeyDown}
            style={{
              width: tpl.page.w * PX_PER_MM * zoom,
              height: tpl.page.h * PX_PER_MM * zoom,
            }}
            onPointerDown={() => setSelectedId(null)}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: `${tpl.page.w}mm`,
                height: `${tpl.page.h}mm`,
                position: 'relative',
                background: '#fff',
                boxShadow: '0 2px 12px rgba(0,0,0,.25)',
              }}
            >
              {tpl.elements.map((el) => (
                <ElementView
                  key={el.id}
                  el={el}
                  talent={previewTalent}
                  agency={store.agency}
                  photos={store.photos}
                  blobUrl={store.blobUrl}
                />
              ))}
              {/* 操作用オーバーレイ */}
              {tpl.elements.map((el) => {
                const sel = el.id === selectedId;
                return (
                  <div
                    key={`ov-${el.id}`}
                    className={`el-overlay ${sel ? 'selected' : ''}`}
                    style={{
                      position: 'absolute',
                      left: `${el.rect.x}mm`,
                      top: `${el.rect.y}mm`,
                      width: `${el.rect.w}mm`,
                      height: `${el.rect.h}mm`,
                      zIndex: 1000,
                    }}
                    onPointerDown={(e) => onPointerDown(e, el.id, null)}
                  >
                    {sel &&
                      (
                        [
                          [{ n: true, w: true }, 'nw'],
                          [{ n: true }, 'n'],
                          [{ n: true, e: true }, 'ne'],
                          [{ e: true }, 'e'],
                          [{ s: true, e: true }, 'se'],
                          [{ s: true }, 's'],
                          [{ s: true, w: true }, 'sw'],
                          [{ w: true }, 'w'],
                        ] as [Dir, string][]
                      ).map(([dir, name]) => (
                        <div
                          key={name}
                          className={`handle handle-${name}`}
                          onPointerDown={(e) => onPointerDown(e, el.id, dir)}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <PropertyPanel
          el={selected}
          onRect={(r) => selected && updateRect(selected.id, r)}
          onStyle={(p) => selected && updateStyle(selected.id, p)}
          onPatch={(p) => selected && updateElement(selected.id, p)}
          onZ={(d) => selected && moveZ(selected.id, d)}
          onDelete={() => {
            if (!selected) return;
            setTpl((prev) => ({ ...prev, elements: prev.elements.filter((x) => x.id !== selected.id) }));
            setSelectedId(null);
            setDirty(true);
          }}
        />
      </div>
    </div>
  );
}

function PropertyPanel({
  el,
  onRect,
  onStyle,
  onPatch,
  onZ,
  onDelete,
}: {
  el: TemplateElement | null;
  onRect: (r: RectMM) => void;
  onStyle: (p: Partial<TextStyle>) => void;
  onPatch: (p: Partial<TemplateElement>) => void;
  onZ: (delta: number) => void;
  onDelete: () => void;
}) {
  if (!el)
    return (
      <div className="prop-panel">
        <p className="hint">
          要素をクリックして選択すると、ここで位置・サイズ・書式を調整できます。
          <br />
          ドラッグで移動、角のハンドルで大きさ変更、矢印キーで微調整（Shift+矢印で大きく移動）、Delete で削除。
        </p>
      </div>
    );

  const typeLabel: Record<string, string> = {
    text: 'テキスト',
    photo: '写真枠',
    career_list: '経歴リスト',
    line: '罫線',
    links: '動画リンク',
    footer: '事務所フッター',
  };

  const num = (v: number, f: (n: number) => void) => (
    <input type="number" step={0.5} value={v} onChange={(e) => f(Number(e.target.value))} />
  );

  return (
    <div className="prop-panel">
      <h3>{typeLabel[el.type]}</h3>
      <div className="prop-grid">
        <label>X (mm)</label>
        {num(el.rect.x, (n) => onRect({ ...el.rect, x: n }))}
        <label>Y (mm)</label>
        {num(el.rect.y, (n) => onRect({ ...el.rect, y: n }))}
        <label>幅 (mm)</label>
        {num(el.rect.w, (n) => onRect({ ...el.rect, w: n }))}
        <label>高さ (mm)</label>
        {num(el.rect.h, (n) => onRect({ ...el.rect, h: n }))}
      </div>

      {el.type === 'text' && (
        <>
          <div className="prop-row">
            <label>データ項目</label>
            <select
              value={el.binding ?? ''}
              onChange={(e) => onPatch({ binding: e.target.value || undefined } as Partial<TemplateElement>)}
            >
              <option value="">（固定文言）</option>
              {TEXT_BINDINGS.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          {!el.binding && (
            <div className="prop-row">
              <label>文言</label>
              <textarea
                value={el.text ?? ''}
                rows={2}
                onChange={(e) => onPatch({ text: e.target.value } as Partial<TemplateElement>)}
              />
            </div>
          )}
        </>
      )}

      {el.type === 'photo' && (
        <div className="prop-row">
          <label>写真の用途</label>
          <select value={el.slot} onChange={(e) => onPatch({ slot: e.target.value } as Partial<TemplateElement>)}>
            <option value="bust_up">バストアップ</option>
            <option value="full_body">全身</option>
            <option value="snap">スナップ</option>
          </select>
        </div>
      )}

      {el.type === 'career_list' && (
        <div className="prop-row">
          <label>カテゴリ（表示順）</label>
          <div className="cat-checks">
            {CAREER_CATEGORIES.map((c) => (
              <label key={c} className="check">
                <input
                  type="checkbox"
                  checked={el.categories.includes(c)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...el.categories, c]
                      : el.categories.filter((x) => x !== c);
                    onPatch({ categories: next as CareerCategory[] } as Partial<TemplateElement>);
                  }}
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      )}

      {'style' in el && (
        <>
          <h4>書式</h4>
          <div className="prop-grid">
            <label>フォント</label>
            <select value={el.style.font} onChange={(e) => onStyle({ font: e.target.value as 'serif' | 'sans' })}>
              <option value="sans">ゴシック</option>
              <option value="serif">明朝</option>
            </select>
            <label>サイズ (pt)</label>
            {num(el.style.size, (n) => onStyle({ size: n }))}
            <label>太字</label>
            <input type="checkbox" checked={!!el.style.bold} onChange={(e) => onStyle({ bold: e.target.checked })} />
            <label>色</label>
            <input
              type="color"
              value={el.style.color ?? '#111111'}
              onChange={(e) => onStyle({ color: e.target.value })}
            />
            <label>揃え</label>
            <select
              value={el.style.align ?? 'left'}
              onChange={(e) => onStyle({ align: e.target.value as TextStyle['align'] })}
            >
              <option value="left">左</option>
              <option value="center">中央</option>
              <option value="right">右</option>
            </select>
          </div>
        </>
      )}

      <div className="prop-actions">
        <button onClick={() => onZ(1)}>前面へ</button>
        <button onClick={() => onZ(-1)}>背面へ</button>
        <button className="danger" onClick={onDelete}>
          要素を削除
        </button>
      </div>
    </div>
  );
}
