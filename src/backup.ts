import JSZip from 'jszip';
import { storage } from './storage/local';

// データ一式をZIPに書き出し（データフォルダ丸ごとのバックアップに相当）
export async function exportBackup(): Promise<void> {
  const [agency, templates, talents, photos] = await Promise.all([
    storage.loadAgency(),
    storage.loadTemplates(),
    storage.listTalents(),
    storage.listPhotos(),
  ]);
  const zip = new JSZip();
  zip.file(
    'data.json',
    JSON.stringify({ version: 2, exported_at: new Date().toISOString(), agency, templates, talents, photos }, null, 2),
  );
  const blobsDir = zip.folder('blobs')!;
  const blobIds = new Set<string>(photos.map((p) => p.id));
  if (agency?.logoBlobId) blobIds.add(agency.logoBlobId);
  for (const id of blobIds) {
    const blob = await storage.loadBlob(id);
    if (blob) blobsDir.file(id, blob);
  }
  const out = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(out);
  const d = new Date();
  a.download = `profile-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importBackup(file: File): Promise<void> {
  const zip = await JSZip.loadAsync(file);
  const dataFile = zip.file('data.json');
  if (!dataFile) throw new Error('バックアップファイルに data.json が見つかりません');
  const data = JSON.parse(await dataFile.async('string'));

  if (data.agency) await storage.saveAgency(data.agency);
  if (data.templates) {
    await storage.saveTemplates(data.templates);
  } else if (data.template) {
    // 旧形式(単一テンプレート): 編集済み扱いで保持。不足する標準テンプレートは
    // 復元後の再読み込み時に自動補充される(store.reloadの補充処理)
    await storage.saveTemplates([{ ...data.template, modified: true }]);
  }
  for (const t of data.talents ?? []) await storage.saveTalent(t);
  for (const p of data.photos ?? []) await storage.savePhotoMeta(p);

  const blobsDir = zip.folder('blobs');
  if (blobsDir) {
    const files: { name: string; f: JSZip.JSZipObject }[] = [];
    blobsDir.forEach((name, f) => {
      if (!f.dir) files.push({ name, f });
    });
    for (const { name, f } of files) {
      const blob = await f.async('blob');
      await storage.saveBlob(name, blob);
    }
  }
}
