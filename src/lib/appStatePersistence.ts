/**
 * Application State Persistence Manager
 * Persists navigation state, selected CSV, annotations, filters, and scroll position
 * using IndexedDB with LocalStorage sync fallback.
 */

export interface SavedNavigationState {
  activeTab: string;
  pathname: string;
  timestamp: number;
}

export interface SavedFilterState {
  searchQuery?: string;
  statusFilter?: string;
  severityFilter?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  pageIndex?: number;
  pageSize?: number;
  customFilters?: Record<string, any>;
}

export interface AnnotationItem {
  id: string;
  fileId: string;
  rowIndex?: number;
  columnName?: string;
  cellKey?: string; // e.g. "row-3-col-Amount"
  author: string;
  text: string;
  severity?: 'info' | 'warning' | 'critical';
  timestamp: string;
}

export interface FullPersistedState {
  navigation: SavedNavigationState;
  activeFileId: string;
  annotations: Record<string, AnnotationItem[]>; // Keyed by fileId
  filters: Record<string, SavedFilterState>;     // Keyed by tab/view name
  scrollPositions: Record<string, number>;        // Keyed by route/tab name
}

const DB_NAME = 'CSV_Auditor_State_DB';
const DB_VERSION = 1;
const STORE_STATE = 'app_state_store';

const STORAGE_NAV_KEY = 'csv_auditor_nav_state_v1';
const STORAGE_ANNOTATIONS_KEY = 'csv_auditor_annotations_v1';
const STORAGE_FILTERS_KEY = 'csv_auditor_filters_v1';
const STORAGE_SCROLL_KEY = 'csv_auditor_scroll_v1';

function openStateDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE);
      }
    };
  });
}

// Save Navigation State
export function saveNavigationState(tab: string, pathname: string): void {
  const state: SavedNavigationState = {
    activeTab: tab,
    pathname,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(STORAGE_NAV_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[StatePersistence] Failed to save nav state:', e);
  }
}

// Load Navigation State
export function loadNavigationState(): SavedNavigationState | null {
  try {
    const raw = localStorage.getItem(STORAGE_NAV_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[StatePersistence] Failed to load nav state:', e);
  }
  return null;
}

// Save View Filters for a specific tab/component
export function saveViewFilters(viewName: string, filters: SavedFilterState): void {
  try {
    const existing = loadAllViewFilters();
    existing[viewName] = { ...existing[viewName], ...filters };
    localStorage.setItem(STORAGE_FILTERS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('[StatePersistence] Failed to save view filters:', e);
  }
}

// Load View Filters for a specific view
export function loadViewFilters(viewName: string): SavedFilterState {
  try {
    const all = loadAllViewFilters();
    return all[viewName] || {};
  } catch (e) {
    return {};
  }
}

export function loadAllViewFilters(): Record<string, SavedFilterState> {
  try {
    const raw = localStorage.getItem(STORAGE_FILTERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

// Save Annotations for a CSV File
export async function saveAnnotationsForFile(fileId: string, annotations: AnnotationItem[]): Promise<void> {
  if (!fileId) return;
  try {
    const all = await loadAllAnnotations();
    all[fileId] = annotations;

    // Save to IndexedDB
    try {
      const db = await openStateDB();
      const tx = db.transaction(STORE_STATE, 'readwrite');
      tx.objectStore(STORE_STATE).put(all, 'annotations');
    } catch (dbErr) {}

    // Fallback LocalStorage
    localStorage.setItem(STORAGE_ANNOTATIONS_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[StatePersistence] Error saving annotations:', e);
  }
}

// Load Annotations for a CSV File
export async function loadAnnotationsForFile(fileId: string): Promise<AnnotationItem[]> {
  if (!fileId) return [];
  try {
    const all = await loadAllAnnotations();
    return all[fileId] || [];
  } catch (e) {
    return [];
  }
}

export async function loadAllAnnotations(): Promise<Record<string, AnnotationItem[]>> {
  // Try IndexedDB
  try {
    const db = await openStateDB();
    const tx = db.transaction(STORE_STATE, 'readonly');
    const req = tx.objectStore(STORE_STATE).get('annotations');
    const result = await new Promise<Record<string, AnnotationItem[]> | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (result && typeof result === 'object') {
      return result;
    }
  } catch (e) {}

  // Fallback LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_ANNOTATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return {};
}

// Save Scroll Position for a route or component
export function saveScrollPosition(key: string, scrollY: number): void {
  if (!key) return;
  try {
    const all = loadAllScrollPositions();
    all[key] = Math.max(scrollY, 0);
    localStorage.setItem(STORAGE_SCROLL_KEY, JSON.stringify(all));
  } catch (e) {}
}

// Restore Scroll Position for a route or component
export function restoreScrollPosition(key: string, element?: HTMLElement | null): number {
  if (!key) return 0;
  try {
    const all = loadAllScrollPositions();
    const pos = all[key] || 0;
    if (pos > 0) {
      setTimeout(() => {
        if (element) {
          element.scrollTop = pos;
        } else if (typeof window !== 'undefined') {
          window.scrollTo({ top: pos, behavior: 'instant' as any });
        }
      }, 50);
    }
    return pos;
  } catch (e) {
    return 0;
  }
}

export function loadAllScrollPositions(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_SCROLL_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

// Clear all persisted recovery state
export function clearAllRecoveryState(): void {
  try {
    localStorage.removeItem(STORAGE_NAV_KEY);
    localStorage.removeItem(STORAGE_ANNOTATIONS_KEY);
    localStorage.removeItem(STORAGE_FILTERS_KEY);
    localStorage.removeItem(STORAGE_SCROLL_KEY);
  } catch (e) {}
}
