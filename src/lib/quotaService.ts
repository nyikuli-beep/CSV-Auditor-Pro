import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export interface QuotaCheckResult {
  allowed: boolean;
  uploadsUsed: number;
  uploadsRemaining: number;
  maxUploads: number;
  quotaPeriod?: string;
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
  uploadsRemaining: number;
  maxUploads: number;
  quotaPeriod: string;
  updatedAt: string;
}

const USERS_COLLECTION = 'users';
export const DEFAULT_MAX_UPLOADS = 5;

/**
 * Returns the current calendar period key: 'YYYY-MM'
 */
export function getCurrentQuotaPeriod(): string {
  return new Date().toISOString().substring(0, 7);
}

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
        maxUploads: DEFAULT_MAX_UPLOADS,
        uploadsUsed: 0,
        uploadsRemaining: DEFAULT_MAX_UPLOADS,
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
        uploadsRemaining: DEFAULT_MAX_UPLOADS, 
        maxUploads: DEFAULT_MAX_UPLOADS, 
        quotaPeriod: currentPeriod, 
        updatedAt: nowIso 
      };
    }

    const data = snap.data();
    const maxUploads = typeof data?.maxUploads === 'number' && data.maxUploads > 0 
      ? data.maxUploads 
      : DEFAULT_MAX_UPLOADS;
    const docPeriod = typeof data?.quotaPeriod === 'string' ? data.quotaPeriod : currentPeriod;

    let uploadsUsed = 0;
    // TASK 7 & 10: Check monthly reset or legacy migration
    if (docPeriod !== currentPeriod) {
      // Month rolled over -> reset usage to 0
      uploadsUsed = 0;
      await updateDoc(userDocRef, {
        uploadsUsed: 0,
        uploadsRemaining: maxUploads,
        quotaPeriod: currentPeriod,
        updatedAt: nowIso
      }).catch(err => console.warn('[QuotaService] Monthly rollover update notice:', err));
    } else if (typeof data?.uploadsUsed === 'number') {
      uploadsUsed = Math.max(0, Math.min(maxUploads, data.uploadsUsed));
    } else if (typeof data?.uploadsRemaining === 'number') {
      // Safe migration for legacy documents storing only uploadsRemaining
      uploadsUsed = Math.max(0, Math.min(maxUploads, maxUploads - data.uploadsRemaining));
      await updateDoc(userDocRef, {
        uploadsUsed,
        quotaPeriod: currentPeriod,
        maxUploads,
        updatedAt: nowIso
      }).catch(err => console.warn('[QuotaService] Legacy migration notice:', err));
    } else {
      uploadsUsed = 0;
    }

    const uploadsRemaining = Math.max(0, maxUploads - uploadsUsed);
    const updatedAt = data?.updatedAt || nowIso;

    return { uploadsUsed, uploadsRemaining, maxUploads, quotaPeriod: currentPeriod, updatedAt };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${userId}`);
    return {
      uploadsUsed: 0,
      uploadsRemaining: DEFAULT_MAX_UPLOADS,
      maxUploads: DEFAULT_MAX_UPLOADS,
      quotaPeriod: currentPeriod,
      updatedAt: nowIso
    };
  }
}

/**
 * Atomic Quota Check & Decrement Logic:
 * 1. Executes in a Firestore transaction to prevent race conditions across devices.
 * 2. Verifies current uploadsUsed < maxUploads for the active month.
 * 3. Atomically increments uploadsUsed and derives uploadsRemaining.
 * 4. Strictly isolated per authenticated user ID; no cross-user pollution.
 */
export async function checkAndDecrementUploadQuota(
  userId: string,
  metadata?: UploadMetadata
): Promise<QuotaCheckResult> {
  if (!userId) {
    return {
      allowed: false,
      uploadsUsed: 0,
      uploadsRemaining: 0,
      maxUploads: DEFAULT_MAX_UPLOADS,
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
          maxUploads: DEFAULT_MAX_UPLOADS,
          uploadsUsed: 1,
          uploadsRemaining: DEFAULT_MAX_UPLOADS - 1,
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
          uploadsRemaining: DEFAULT_MAX_UPLOADS - 1,
          maxUploads: DEFAULT_MAX_UPLOADS,
          quotaPeriod: currentPeriod,
          updatedAt: nowIso
        };
      }

      const userData = userSnapshot.data();
      const maxUploads = typeof userData?.maxUploads === 'number' && userData.maxUploads > 0 
        ? userData.maxUploads 
        : DEFAULT_MAX_UPLOADS;
      const docPeriod = typeof userData?.quotaPeriod === 'string' ? userData.quotaPeriod : currentPeriod;

      let currentUsed = 0;
      if (docPeriod !== currentPeriod) {
        // Month has rolled over; reset usage for this new period
        currentUsed = 0;
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
          uploadsRemaining: 0,
          maxUploads,
          quotaPeriod: currentPeriod,
          isFreemiumExhausted: true,
          error: `Monthly upload quota reached (${currentUsed} / ${maxUploads} uploads used). Freemium users are restricted to ${maxUploads} uploads per month.`
        };
      }

      const newUploadsUsed = currentUsed + 1;
      const newUploadsRemaining = Math.max(0, maxUploads - newUploadsUsed);

      transaction.update(userDocRef, {
        uploadsUsed: newUploadsUsed,
        uploadsRemaining: newUploadsRemaining,
        maxUploads,
        quotaPeriod: currentPeriod,
        updatedAt: nowIso,
        lastUploadedFile: metadata?.fileName || userData?.lastUploadedFile || 'file.csv',
        lastUploadDeviceId: metadata?.deviceId || 'device-primary',
        lastUploadTimestamp: nowIso
      });

      return {
        allowed: true,
        uploadsUsed: newUploadsUsed,
        uploadsRemaining: newUploadsRemaining,
        maxUploads,
        quotaPeriod: currentPeriod,
        updatedAt: nowIso
      };
    });

    return result;
  } catch (error: any) {
    console.error('[checkAndDecrementUploadQuota] Transaction failed:', error);
    return {
      allowed: false,
      uploadsUsed: 0,
      uploadsRemaining: 0,
      maxUploads: DEFAULT_MAX_UPLOADS,
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
      uploadsUsed: 0,
      uploadsRemaining: quotaAmount,
      maxUploads: quotaAmount,
      quotaPeriod: currentPeriod,
      updatedAt: nowIso
    });

    return { success: true, uploadsUsed: 0, uploadsRemaining: quotaAmount };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    return { success: false, uploadsUsed: 0, uploadsRemaining: 0 };
  }
}
