import {scopedKey, PROFILE_ID} from './profiles';
import {newPVProject, validPVProject, pvId, type DatasheetRef, type PVProject} from './pv-report-engine';

const draftKey = scopedKey('bioenergia.pv-report.v1');
export function readPVProject(): PVProject {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
    return validPVProject(value) ? value : newPVProject();
  } catch {return newPVProject();}
}
export function savePVProject(project: PVProject) {
  if (!validPVProject(project)) return false;
  try {localStorage.setItem(draftKey, JSON.stringify(project));return true;}
  catch {return false;}
}
export function parsePVBackup(text: string) {
  if (text.length > 120000) throw new Error('BACKUP_SIZE');
  const value: unknown = JSON.parse(text);
  if (!validPVProject(value)) throw new Error('BACKUP_INVALID');
  return value;
}

function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bioenergia-pv-datasheets-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
async function fileTransaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openFiles();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('files', mode);
    const request = action(transaction.objectStore('files'));
    transaction.oncomplete = () => {db.close();resolve(request.result);};
    transaction.onerror = () => {db.close();reject(transaction.error);};
    transaction.onabort = () => {db.close();reject(transaction.error ?? new Error('STORAGE_ABORT'));};
  });
}
const fileKey = (id: string) => PROFILE_ID + ':' + id;
export async function storeDatasheet(file: File): Promise<DatasheetRef> {
  if (file.size < 5 || file.size > 10000000 || !/\.pdf$/i.test(file.name)) throw new Error('PDF_SIZE_TYPE');
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== '%PDF-') throw new Error('PDF_SIGNATURE');
  const ref = {id: pvId(), name: file.name.slice(0, 200), size: file.size, addedAt: new Date().toISOString()};
  // Atomic IndexedDB commit completes before the project references the new attachment.
  await fileTransaction('readwrite', store => store.put(new Blob([file], {type: 'application/pdf'}), fileKey(ref.id)));
  return ref;
}
export async function getDatasheet(id: string) {
  return fileTransaction<Blob | undefined>('readonly', store => store.get(fileKey(id)));
}
export async function removeDatasheet(id: string) {
  await fileTransaction('readwrite', store => store.delete(fileKey(id)));
}
