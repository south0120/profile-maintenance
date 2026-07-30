import { Agency, PhotoMeta, Talent, Template } from '../types';

// ストレージ抽象化: MVPはローカル(IndexedDB)実装。
// 将来 GoogleDriveAdapter / MicrosoftGraphAdapter を追加しても
// アプリ側(画面・エディタ)は無改修で差し替えられるよう、この境界に集約する。
export interface StorageAdapter {
  loadAgency(): Promise<Agency | undefined>;
  saveAgency(a: Agency): Promise<void>;

  loadTemplate(): Promise<Template | undefined>;
  saveTemplate(t: Template): Promise<void>;

  listTalents(): Promise<Talent[]>;
  saveTalent(t: Talent): Promise<void>;
  deleteTalent(id: string): Promise<void>;

  listPhotos(): Promise<PhotoMeta[]>;
  savePhotoMeta(p: PhotoMeta): Promise<void>;
  deletePhoto(id: string): Promise<void>;

  saveBlob(id: string, blob: Blob): Promise<void>;
  loadBlob(id: string): Promise<Blob | undefined>;
  deleteBlob(id: string): Promise<void>;
}
