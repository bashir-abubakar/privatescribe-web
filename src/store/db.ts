export type Seg = { t0: number; t1: number; text: string; conf?: number };
export type Session = {
  id: string;
  title: string;
  createdAt: number; // epoch ms
  durationSec: number;
  segments: Seg[];
  summary?: any;
};

const DB_NAME = 'pt-db';
const STORE = 'sessions';
let dbp: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

export async function saveSession(s: Session) {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(s);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function listSessions(): Promise<Session[]> {
  const db = await openDB();
  return await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const arr = (req.result || []) as Session[];
      arr.sort((a,b) => b.createdAt - a.createdAt);
      res(arr);
    };
    req.onerror = () => rej(req.error);
  });
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await openDB();
  return await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => res(req.result as Session | undefined);
    req.onerror = () => rej(req.error);
  });
}

export async function deleteSession(id: string) {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
