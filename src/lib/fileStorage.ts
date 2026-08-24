import { CSVFile } from '../types';
import { SAMPLE_MESSY_FILE } from '../sampleData';

const STORAGE_KEY_FILES_PREFIX = 'csv_auditor_workspace_files_';
const STORAGE_KEY_FILES_LEGACY = 'app_uploaded_files_v2';
const STORAGE_KEY_ACTIVE_ID = 'app_active_file_id_v2';
const DB_NAME = 'CSV_Auditor_Pro_DB';
const DB_VERSION = 2;
const STORE_NAME = 'csv_files_v2';

// Helper to open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Workspace-scoped file persistence
export async function saveWorkspaceFilesToStorage(workspaceId: string, files: CSVFile[]): Promise<void> {
  if (!workspaceId || !files || !Array.isArray(files)) return;

  const scopedKey = `${STORAGE_KEY_FILES_PREFIX}${workspaceId}`;

  // 1. IndexedDB persistence
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const file of files) {
      if (file && file.id) {
        store.put({ ...file, workspaceId });
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[FileStorage] IndexedDB save error:', err);
  }

  // 2. LocalStorage fast synchronous cache
  try {
    localStorage.setItem(scopedKey, JSON.stringify(files));
    localStorage.setItem(STORAGE_KEY_FILES_LEGACY, JSON.stringify(files));
  } catch (err) {
    console.warn('[FileStorage] LocalStorage quota reached for workspace files:', err);
  }
}

export async function loadWorkspaceFilesFromStorage(workspaceId: string): Promise<CSVFile[]> {
  if (!workspaceId) return [];

  const scopedKey = `${STORAGE_KEY_FILES_PREFIX}${workspaceId}`;

  // 1. Try LocalStorage for immediate return
  try {
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[FileStorage] LocalStorage read error:', err);
  }

  // 2. Try IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    const result = await new Promise<CSVFile[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as CSVFile[]);
      request.onerror = () => reject(request.error);
    });

    if (result && Array.isArray(result)) {
      const scoped = result.filter(f => f.workspaceId === workspaceId || (!f.workspaceId && workspaceId === 'org-enterprise-root'));
      return scoped;
    }
  } catch (err) {
    console.warn('[FileStorage] IndexedDB read error:', err);
  }

  return [];
}

export function loadWorkspaceFilesFromLocalStorageSync(workspaceId?: string): CSVFile[] {
  if (workspaceId) {
    const scopedKey = `${STORAGE_KEY_FILES_PREFIX}${workspaceId}`;
    try {
      const raw = localStorage.getItem(scopedKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  // Default fallback for demo / unauthenticated preview only
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FILES_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return [SAMPLE_MESSY_FILE];
}

// Backwards compatibility legacy wrappers
export async function saveFilesToStorage(files: CSVFile[]): Promise<void> {
  const wsId = files[0]?.workspaceId || 'org-enterprise-root';
  return saveWorkspaceFilesToStorage(wsId, files);
}

export async function loadFilesFromStorage(): Promise<CSVFile[]> {
  return loadWorkspaceFilesFromStorage('org-enterprise-root');
}

export function loadFilesFromLocalStorageSync(): CSVFile[] {
  return loadWorkspaceFilesFromLocalStorageSync();
}

// Active File ID tracking
export function saveActiveFileIdToStorage(id: string): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
    }
  } catch (e) {
    console.warn('[FileStorage] Error saving active file ID:', e);
  }
}

export function loadActiveFileIdFromStorage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (saved) return saved;
  } catch (e) {
    console.warn('[FileStorage] Error loading active file ID:', e);
  }
  return 'file-active';
}

export async function deleteFileFromStorage(id: string, workspaceId?: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn('[FileStorage] IndexedDB delete error:', err);
  }

  if (workspaceId) {
    const scopedKey = `${STORAGE_KEY_FILES_PREFIX}${workspaceId}`;
    try {
      const raw = localStorage.getItem(scopedKey);
      if (raw) {
        const parsed: CSVFile[] = JSON.parse(raw);
        const filtered = parsed.filter(f => f && f.id !== id);
        localStorage.setItem(scopedKey, JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_FILES_LEGACY);
    if (raw) {
      const parsed: CSVFile[] = JSON.parse(raw);
      const filtered = parsed.filter(f => f && f.id !== id);
      localStorage.setItem(STORAGE_KEY_FILES_LEGACY, JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}
