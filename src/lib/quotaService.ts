import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export interface QuotaCheckResult {
  allowed: boolean;
  uploadsUsed: number;
  monthlyUploadsUsed?: number;
  uploadsRemaining: number;
  maxUploads: number;
  monthlyUploadLimit?: number;
  quotaPeriod?: string;
  quotaMonth?: string;
  updatedAt?: string;
  error?: string;
  isFreemiumExhausted?: boolean;
}

export interface UploadMetadata {
  fileName?: string;
  fileSize?: number;
  rowCount?: number;
  deviceId?: string;
  deviceLabel?: string;
}

export interface UserQuotaRecord {
  uploadsUsed: number;
  monthlyUploadsUsed: number;
  uploadsRemaining: number;
  maxUploads: number;
  monthlyUploadLimit: number;
  quotaPeriod: string;
  quotaMonth: string;
  updatedAt: string;
}

const USERS_COLLECTION = 'users';
export const DEFAULT_MAX_UPLOADS = 5;

/**
 * Returns the deterministic calendar month key: 'YYYY-MM' in UTC.
 * Never subject to local browser timezone distortion or clock drift.
 */
export function getCurrentQuotaPeriod(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export const getCurrentQuotaMonth = getCurrentQuotaPeriod;

/**
 * Ensures a user document exists in Firestore and returns the authoritative quota.
 * Keyed strictly by the user's authentic Firebase UID.
 */
export async function getOrCreateUserQuota(
  userId: string, 
  email?: string
): Promise<UserQuotaRecord> {
  if (!userId) {
    throw new Error('User ID is required to fetch or create user quota.');
  }

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();
  const currentPeriod = getCurrentQuotaPeriod();

  try {
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      const initialData = {
        id: userId,
        uid: userId,
        email: email || auth.currentUser?.email || '',
        monthlyUploadLimit: DEFAULT_MAX_UPLOADS,
        maxUploads: DEFAULT_MAX_UPLOADS,
        monthlyUploadsUsed: 0,
        uploadsUsed: 0,
        uploadsRemaining: DEFAULT_MAX_UPLOADS,
        quotaMonth: currentPeriod,
        quotaPeriod: currentPeriod,
        updatedAt: nowIso,
        createdAt: nowIso,
        lastLogin: nowIso,
        role: 'Editor',
        plan: 'Free'
      };
      await setDoc(userDocRef, initialData);
      return { 
        uploadsUsed: 0, 
        monthlyUploadsUsed: 0,
        uploadsRemaining: DEFAULT_MAX_UPLOADS, 
        maxUploads: DEFAULT_MAX_UPLOADS, 
        monthlyUploadLimit: DEFAULT_MAX_UPLOADS,
        quotaPeriod: currentPeriod, 
        quotaMonth: currentPeriod,
        updatedAt: nowIso 
      };
    }

    const data = snap.data();
    const maxUploads = typeof data?.monthlyUploadLimit === 'number' && data.monthlyUploadLimit > 0
      ? data.monthlyUploadLimit
      : (typeof data?.maxUploads === 'number' && data.maxUploads > 0 ? data.maxUploads : DEFAULT_MAX_UPLOADS);
    
    // Check both quotaMonth and quotaPeriod
    const docPeriod = (typeof data?.quotaMonth === 'string' && data.quotaMonth.trim()) ||
                      (typeof data?.quotaPeriod === 'string' && data.quotaPeriod.trim()) ||
                      '';

    let uploadsUsed = 0;
    // TASK: Automatic calendar-month reset or reconciliation
    if (docPeriod !== currentPeriod) {
      // Month rolled over (or stale month record) -> reset usage to 0 and persist
      uploadsUsed = 0;
      await updateDoc(userDocRef, {
        monthlyUploadsUsed: 0,
        uploadsUsed: 0,
        monthlyUploadLimit: maxUploads,
        maxUploads: maxUploads,
        uploadsRemaining: maxUploads,
        quotaMonth: currentPeriod,
        quotaPeriod: currentPeriod,
        updatedAt: nowIso
      }).catch(err => console.warn('[QuotaService] Monthly rollover update notice:', err));
    } else if (typeof data?.monthlyUploadsUsed === 'number') {
      uploadsUsed = Math.max(0, Math.min(maxUploads, data.monthlyUploadsUsed));
    } else if (typeof data?.uploadsUsed === 'number') {
      uploadsUsed = Math.max(0, Math.min(maxUploads, data.uploadsUsed));
    } else if (typeof data?.uploadsRemaining === 'number') {
      // Safe migration for legacy documents storing only uploadsRemaining
      uploadsUsed = Math.max(0, Math.min(maxUploads, maxUploads - data.uploadsRemaining));
      await updateDoc(userDocRef, {
        monthlyUploadsUsed: uploadsUsed,
        uploadsUsed,
        quotaMonth: currentPeriod,
        quotaPeriod: currentPeriod,
        monthlyUploadLimit: maxUploads,
        maxUploads,
        updatedAt: nowIso
      }).catch(err => console.warn('[QuotaService] Legacy migration notice:', err));
    } else {
      uploadsUsed = 0;
    }

    const uploadsRemaining = Math.max(0, maxUploads - uploadsUsed);
    const updatedAt = data?.updatedAt || nowIso;

    return { 
      uploadsUsed, 
      monthlyUploadsUsed: uploadsUsed,
      uploadsRemaining, 
      maxUploads, 
      monthlyUploadLimit: maxUploads,
      quotaPeriod: currentPeriod, 
      quotaMonth: currentPeriod,
      updatedAt 
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${userId}`);
    return {
      uploadsUsed: 0,
      monthlyUploadsUsed: 0,
      uploadsRemaining: DEFAULT_MAX_UPLOADS,
      maxUploads: DEFAULT_MAX_UPLOADS,
      monthlyUploadLimit: DEFAULT_MAX_UPLOADS,
      quotaPeriod: currentPeriod,
      quotaMonth: currentPeriod,
      updatedAt: nowIso
    };
  }
}

/**
 * Atomic Quota Check & Decrement Logic:
 * 1. Executes in a Firestore transaction to prevent race conditions across devices.
 * 2. Verifies current monthlyUploadsUsed < maxUploads for the active month.
 * 3. Handles automatic calendar-month reset directly inside the transaction if the stored month differs from currentPeriod.
 * 4. Atomically increments uploadsUsed and derives uploadsRemaining.
 * 5. Strictly isolated per authenticated user ID; no cross-user pollution.
 */
export async function checkAndDecrementUploadQuota(
  userId: string,
  metadata?: UploadMetadata
): Promise<QuotaCheckResult> {
  if (!userId) {
    return {
      allowed: false,
      uploadsUsed: 0,
      monthlyUploadsUsed: 0,
      uploadsRemaining: 0,
      maxUploads: DEFAULT_MAX_UPLOADS,
      monthlyUploadLimit: DEFAULT_MAX_UPLOADS,
      error: 'Authentication required. Please sign in to upload CSV files.'
    };
  }

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();
  const currentPeriod = getCurrentQuotaPeriod();

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userDocRef);

      if (!userSnapshot.exists()) {
        // Deterministically create user quota doc with 1 upload consumed
        const initialDoc = {
          id: userId,
          uid: userId,
          email: auth.currentUser?.email || '',
          monthlyUploadLimit: DEFAULT_MAX_UPLOADS,
          maxUploads: DEFAULT_MAX_UPLOADS,
          monthlyUploadsUsed: 1,
          uploadsUsed: 1,
          uploadsRemaining: DEFAULT_MAX_UPLOADS - 1,
          quotaMonth: currentPeriod,
          quotaPeriod: currentPeriod,
          updatedAt: nowIso,
          createdAt: nowIso,
          lastLogin: nowIso,
          lastUploadedFile: metadata?.fileName || 'file.csv',
          lastUploadDeviceId: metadata?.deviceId || 'device-primary',
          lastUploadTimestamp: nowIso,
          role: 'Editor',
          plan: 'Free'
        };
        transaction.set(userDocRef, initialDoc);
        return {
          allowed: true,
          uploadsUsed: 1,
          monthlyUploadsUsed: 1,
          uploadsRemaining: DEFAULT_MAX_UPLOADS - 1,
          maxUploads: DEFAULT_MAX_UPLOADS,
          monthlyUploadLimit: DEFAULT_MAX_UPLOADS,
          quotaPeriod: currentPeriod,
          quotaMonth: currentPeriod,
          updatedAt: nowIso
        };
      }

      const userData = userSnapshot.data();
      const maxUploads = typeof userData?.monthlyUploadLimit === 'number' && userData.monthlyUploadLimit > 0
        ? userData.monthlyUploadLimit
        : (typeof userData?.maxUploads === 'number' && userData.maxUploads > 0 ? userData.maxUploads : DEFAULT_MAX_UPLOADS);

      const docPeriod = (typeof userData?.quotaMonth === 'string' && userData.quotaMonth.trim()) ||
                        (typeof userData?.quotaPeriod === 'string' && userData.quotaPeriod.trim()) ||
                        '';

      let currentUsed = 0;
      // Stored quotaMonth !== currentMonth -> automatic calendar-month reset
      if (docPeriod !== currentPeriod) {
        currentUsed = 0;
      } else if (typeof userData?.monthlyUploadsUsed === 'number') {
        currentUsed = Math.max(0, Math.min(maxUploads, userData.monthlyUploadsUsed));
      } else if (typeof userData?.uploadsUsed === 'number') {
        currentUsed = Math.max(0, Math.min(maxUploads, userData.uploadsUsed));
      } else if (typeof userData?.uploadsRemaining === 'number') {
        currentUsed = Math.max(0, Math.min(maxUploads, maxUploads - userData.uploadsRemaining));
      } else {
        currentUsed = 0;
      }

      // Check quota exhaustion
      if (currentUsed >= maxUploads) {
        return {
          allowed: false,
          uploadsUsed: currentUsed,
          monthlyUploadsUsed: currentUsed,
          uploadsRemaining: 0,
          maxUploads,
          monthlyUploadLimit: maxUploads,
          quotaPeriod: currentPeriod,
          quotaMonth: currentPeriod,
          isFreemiumExhausted: true,
          error: `Monthly upload limit reached. Your Free plan upload allowance resets on the next calendar month.`
        };
      }

      const newUploadsUsed = currentUsed + 1;
      const newUploadsRemaining = Math.max(0, maxUploads - newUploadsUsed);

      transaction.update(userDocRef, {
        monthlyUploadsUsed: newUploadsUsed,
        uploadsUsed: newUploadsUsed,
        monthlyUploadLimit: maxUploads,
        maxUploads: maxUploads,
        uploadsRemaining: newUploadsRemaining,
        quotaMonth: currentPeriod,
        quotaPeriod: currentPeriod,
        updatedAt: nowIso,
        lastUploadedFile: metadata?.fileName || userData?.lastUploadedFile || 'file.csv',
        lastUploadDeviceId: metadata?.deviceId || 'device-primary',
        lastUploadTimestamp: nowIso
      });

      return {
        allowed: true,
        uploadsUsed: newUploadsUsed,
        monthlyUploadsUsed: newUploadsUsed,
        uploadsRemaining: newUploadsRemaining,
        maxUploads,
        monthlyUploadLimit: maxUploads,
        quotaPeriod: currentPeriod,
        quotaMonth: currentPeriod,
        updatedAt: nowIso
      };
    });

    return result;
  } catch (error: any) {
    console.error('[checkAndDecrementUploadQuota] Transaction failed:', error);
    return {
      allowed: false,
      uploadsUsed: 0,
      monthlyUploadsUsed: 0,
      uploadsRemaining: 0,
      maxUploads: DEFAULT_MAX_UPLOADS,
      monthlyUploadLimit: DEFAULT_MAX_UPLOADS,
      error: error?.message || 'Failed to update upload quota in Firestore.'
    };
  }
}

/**
 * Resets user's upload quota back to default (0 used, 5 remaining).
 * Triggered ONLY by explicit user interaction via "Reset Quota (Test Sync)".
 */
export async function resetUserUploadQuota(
  userId: string,
  quotaAmount: number = DEFAULT_MAX_UPLOADS
): Promise<{ success: boolean; uploadsUsed: number; uploadsRemaining: number }> {
  if (!userId) throw new Error('User ID is required');

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();
  const currentPeriod = getCurrentQuotaPeriod();

  try {
    await updateDoc(userDocRef, {
      monthlyUploadsUsed: 0,
      uploadsUsed: 0,
      uploadsRemaining: quotaAmount,
      monthlyUploadLimit: quotaAmount,
      maxUploads: quotaAmount,
      quotaMonth: currentPeriod,
      quotaPeriod: currentPeriod,
      updatedAt: nowIso
    });

    return { success: true, uploadsUsed: 0, uploadsRemaining: quotaAmount };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    return { success: false, uploadsUsed: 0, uploadsRemaining: 0 };
  }
}
