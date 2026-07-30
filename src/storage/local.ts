import { openDB, IDBPDatabase } from 'idb';
import { Agency, PhotoMeta, Talent, Template } from '../types';
import { StorageAdapter } from './adapter';

const DB_NAME = 'profile-maintenance';
const DB_VERSION = 1;

async function db(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('talents')) d.createObjectStore('talents', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs');
    },
  });
}

export class LocalAdapter implements StorageAdapter {
  async loadAgency(): Promise<Agency | undefined> {
    return (await db()).get('kv', 'agency');
  }
  async saveAgency(a: Agency): Promise<void> {
    await (await db()).put('kv', a, 'agency');
  }

  async loadTemplate(): Promise<Template | undefined> {
    return (await db()).get('kv', 'template');
  }
  async loadTemplates(): Promise<Template[] | undefined> {
    return (await db()).get('kv', 'templates');
  }
  async saveTemplates(ts: Template[]): Promise<void> {
    await (await db()).put('kv', ts, 'templates');
  }

  async listTalents(): Promise<Talent[]> {
    return (await db()).getAll('talents');
  }
  async saveTalent(t: Talent): Promise<void> {
    await (await db()).put('talents', t);
  }
  async deleteTalent(id: string): Promise<void> {
    await (await db()).delete('talents', id);
  }

  async listPhotos(): Promise<PhotoMeta[]> {
    return (await db()).getAll('photos');
  }
  async savePhotoMeta(p: PhotoMeta): Promise<void> {
    await (await db()).put('photos', p);
  }
  async deletePhoto(id: string): Promise<void> {
    await (await db()).delete('photos', id);
  }

  async saveBlob(id: string, blob: Blob): Promise<void> {
    await (await db()).put('blobs', blob, id);
  }
  async loadBlob(id: string): Promise<Blob | undefined> {
    return (await db()).get('blobs', id);
  }
  async deleteBlob(id: string): Promise<void> {
    await (await db()).delete('blobs', id);
  }
}

export const storage: StorageAdapter = new LocalAdapter();

// 設定値(APIキー等)用の汎用kvアクセス。バックアップ対象には含めない
export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db()).get('kv', key);
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await db()).put('kv', value, key);
}
