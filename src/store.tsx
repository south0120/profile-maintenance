import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from './storage/local';
import { Agency, PhotoMeta, Talent, Template } from './types';
import { emptyAgency } from './model';
import { defaultTemplates, sampleTalent } from './defaultData';

interface Store {
  ready: boolean;
  agency: Agency;
  templates: Template[];
  talents: Talent[];
  photos: PhotoMeta[];
  blobUrl: (id?: string) => string | undefined;

  saveAgency(a: Agency): Promise<void>;
  saveTemplate(t: Template): Promise<void>; // templates配列内の該当IDを更新
  resetTemplate(id: string): Promise<Template | undefined>; // 標準の初期状態に戻す
  saveTalent(t: Talent): Promise<void>;
  deleteTalent(id: string): Promise<void>;
  addPhoto(talentId: string, file: File, role: PhotoMeta['role']): Promise<PhotoMeta>;
  updatePhoto(p: PhotoMeta): Promise<void>;
  removePhoto(id: string): Promise<void>;
  setLogo(file: File): Promise<void>;
  reload(): Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('store not ready');
  return s;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [agency, setAgency] = useState<Agency>(emptyAgency());
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates());
  const [talents, setTalents] = useState<Talent[]>([]);
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  async function loadBlobUrls(metas: PhotoMeta[], logoId?: string) {
    const ids = metas.map((p) => p.id);
    if (logoId) ids.push(logoId);
    const next: Record<string, string> = {};
    for (const id of ids) {
      const blob = await storage.loadBlob(id);
      if (blob) next[id] = URL.createObjectURL(blob);
    }
    setUrls((prev) => {
      Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
      return next;
    });
  }

  async function reload() {
    const [a, tpls, legacyTpl, ts, ps] = await Promise.all([
      storage.loadAgency(),
      storage.loadTemplates(),
      storage.loadTemplate(),
      storage.listTalents(),
      storage.listPhotos(),
    ]);
    const agencyV = a ?? emptyAgency();
    // テンプレート: 新形式(配列)がなければ標準3種を投入。旧形式(単一)があれば「写真2枚」を置き換えて引き継ぐ
    let templatesV = tpls;
    if (!templatesV || templatesV.length === 0) {
      templatesV = defaultTemplates();
      if (legacyTpl) {
        templatesV = templatesV.map((t) =>
          t.id === legacyTpl.id ? { ...legacyTpl, name: t.name, modified: true } : t,
        );
      }
      await storage.saveTemplates(templatesV);
    } else {
      // アプリ更新で標準テンプレートが改良された場合、未編集(modified≠true)のものだけ差し替える
      const factories = defaultTemplates();
      let upgraded = false;
      templatesV = templatesV.map((st) => {
        const f = factories.find((x) => x.id === st.id);
        if (f && !st.modified && (f.factory_rev ?? 1) > (st.factory_rev ?? 1)) {
          upgraded = true;
          return f;
        }
        return st;
      });
      // 新しく追加された標準テンプレートがあれば末尾に足す
      for (const f of factories) {
        if (!templatesV.some((x) => x.id === f.id)) {
          templatesV.push(f);
          upgraded = true;
        }
      }
      if (upgraded) await storage.saveTemplates(templatesV);
    }
    let talentsV = ts;
    if (ts.length === 0 && !a) {
      // 初回起動: サンプルデータを投入
      const s = sampleTalent();
      await storage.saveTalent(s);
      talentsV = [s];
    }
    setAgency(agencyV);
    setTemplates(templatesV);
    setTalents(talentsV.sort((x, y) => (x.kana ?? x.stage_name).localeCompare(y.kana ?? y.stage_name, 'ja')));
    setPhotos(ps);
    await loadBlobUrls(ps, agencyV.logoBlobId);
    setReady(true);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store = useMemo<Store>(
    () => ({
      ready,
      agency,
      templates,
      talents,
      photos,
      blobUrl: (id) => (id ? urls[id] : undefined),

      async saveAgency(a) {
        await storage.saveAgency(a);
        setAgency(a);
      },
      async saveTemplate(t) {
        const next = { ...t, modified: true, updated_at: new Date().toISOString() };
        const arr = templates.some((x) => x.id === next.id)
          ? templates.map((x) => (x.id === next.id ? next : x))
          : [...templates, next];
        await storage.saveTemplates(arr);
        setTemplates(arr);
      },
      async resetTemplate(id) {
        const factory = defaultTemplates().find((t) => t.id === id);
        if (!factory) return undefined;
        const arr = templates.map((x) => (x.id === id ? factory : x));
        await storage.saveTemplates(arr);
        setTemplates(arr);
        return factory;
      },
      async saveTalent(t) {
        const next = { ...t, updated_at: new Date().toISOString() };
        await storage.saveTalent(next);
        setTalents((prev) => {
          const i = prev.findIndex((x) => x.id === t.id);
          const arr = i >= 0 ? prev.map((x) => (x.id === t.id ? next : x)) : [...prev, next];
          return arr.sort((x, y) => (x.kana ?? x.stage_name).localeCompare(y.kana ?? y.stage_name, 'ja'));
        });
      },
      async deleteTalent(id) {
        const mine = photos.filter((p) => p.talentId === id);
        for (const p of mine) {
          await storage.deletePhoto(p.id);
          await storage.deleteBlob(p.id);
        }
        await storage.deleteTalent(id);
        setPhotos((prev) => prev.filter((p) => p.talentId !== id));
        setTalents((prev) => prev.filter((t) => t.id !== id));
      },
      async addPhoto(talentId, file, role) {
        const meta: PhotoMeta = {
          id: crypto.randomUUID(),
          talentId,
          role,
          fileName: file.name,
          crop: { x: 50, y: 30, zoom: 1 },
          createdAt: new Date().toISOString(),
        };
        await storage.saveBlob(meta.id, file);
        await storage.savePhotoMeta(meta);
        setPhotos((prev) => [...prev, meta]);
        setUrls((prev) => ({ ...prev, [meta.id]: URL.createObjectURL(file) }));
        return meta;
      },
      async updatePhoto(p) {
        await storage.savePhotoMeta(p);
        setPhotos((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      },
      async removePhoto(id) {
        await storage.deletePhoto(id);
        await storage.deleteBlob(id);
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        setUrls((prev) => {
          const { [id]: gone, ...rest } = prev;
          if (gone) URL.revokeObjectURL(gone);
          return rest;
        });
      },
      async setLogo(file) {
        const id = agency.logoBlobId ?? crypto.randomUUID();
        await storage.saveBlob(id, file);
        const next = { ...agency, logoBlobId: id };
        await storage.saveAgency(next);
        setAgency(next);
        setUrls((prev) => {
          if (prev[id]) URL.revokeObjectURL(prev[id]);
          return { ...prev, [id]: URL.createObjectURL(file) };
        });
      },
      reload,
    }),
    [ready, agency, templates, talents, photos, urls],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
