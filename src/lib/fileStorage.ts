import { CSVFile } from '../types';
import { SAMPLE_MESSY_FILE } from '../sampleData';

const STORAGE_KEY_FILES = 'app_uploaded_files_v2';
const STORAGE_KEY_ACTIVE_ID = 'app_active_file_id_v2';
const DB_NAME = 'CSV_Auditor_Pro_DB';
const DB_VERSION = 1;
const STORE_NAME = 'csv_files';

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

// Save all files to IndexedDB with localStorage fallback
export async function saveFilesToStorage(files: CSVFile[]): Promise<void> {
  if (!files || !Array.isArray(files)) return;

  // 1. Persist in IndexedDB for high-capacity offline storage
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Put each file into object store
    for (const file of files) {
      if (file && file.id) {
        store.put(file);
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[FileStorage] IndexedDB save error:', err);
  }

  // 2. Also keep in localStorage as synchronous fallback
  try {
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
  } catch (err) {
    console.warn('[FileStorage] localStorage save fallback warning (quota limit reached for large file):', err);
  }
}

// Load all files from IndexedDB or localStorage, returning default sample file if none found
export async function loadFilesFromStorage(): Promise<CSVFile[]> {
  // 1. Try IndexedDB first
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    const result = await new Promise<CSVFile[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as CSVFile[]);
      request.onerror = () => reject(request.error);
    });

    if (result && Array.isArray(result) && result.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn('[FileStorage] IndexedDB load failed, falling back to localStorage:', err);
  }

  // 2. Try localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[FileStorage] localStorage load error:', err);
  }

  // 3. Fallback default dataset
  return [SAMPLE_MESSY_FILE];
}

// Synchronously load cached files from localStorage for initial React state
export function loadFilesFromLocalStorageSync(): CSVFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[FileStorage] localStorage sync load error:', err);
  }
  return [SAMPLE_MESSY_FILE];
}

// Save current active file ID
export function saveActiveFileIdToStorage(id: string): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
    }
  } catch (e) {
    console.warn('[FileStorage] Error saving active file ID:', e);
  }
}

// Load active file ID from storage
export function loadActiveFileIdFromStorage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (saved) return saved;
  } catch (e) {
    console.warn('[FileStorage] Error loading active file ID:', e);
  }
  return 'file-active';
}

// Delete file from storage
export async function deleteFileFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.warn('[FileStorage] IndexedDB delete error:', err);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_FILES);
    if (raw) {
      const parsed: CSVFile[] = JSON.parse(raw);
      const filtered = parsed.filter(f => f && f.id !== id);
      localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('[FileStorage] localStorage delete error:', e);
  }
}
