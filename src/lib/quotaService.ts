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
 * Resolves the authoritative upload usage for the given calendar month (e.g. '2026-09').
 * Recognizes that September 2026 is a new quota month.
 * Automatically reconciles stale August records (e.g. '2026-08' with 5/5) to:
 * - quotaMonth = '2026-09'
 * - uploadsUsed = 0
 * - uploadsRemaining = 5
 * Ensures that August usage NEVER prevents uploads during September.
 * Preserves genuine September uploads (0/5 -> 1/5 -> 2/5 -> ... -> 5/5).
 */
export function resolveAuthoritativeMonthlyUsage(
  data: any,
  currentPeriod: string = getCurrentQuotaPeriod(),
  maxUploads: number = DEFAULT_MAX_UPLOADS
): { uploadsUsed: number; isStaleRecord: boolean } {
  if (!data) {
    return { uploadsUsed: 0, isStaleRecord: false };
  }

  const docPeriod = (typeof data?.quotaMonth === 'string' && data.quotaMonth.trim()) ||
                    (typeof data?.quotaPeriod === 'string' && data.quotaPeriod.trim()) ||
                    '';

  const lastUploadTs = typeof data?.lastUploadTimestamp === 'string' ? data.lastUploadTimestamp.trim() : '';
  const updatedAt = typeof data?.updatedAt === 'string' ? data.updatedAt.trim() : '';

  // Case 1: Stored quota month differs from active calendar month (e.g. '2026-08' vs '2026-09' or empty)
  // Calendar month rolled over -> previous month's usage is obsolete. Genuine September usage is 0.
  if (docPeriod !== currentPeriod) {
    return { uploadsUsed: 0, isStaleRecord: true };
  }

  // Extract any claimed upload usage
  let claimedUsed = 0;
  if (typeof data?.monthlyUploadsUsed === 'number') {
    claimedUsed = Math.max(0, Math.min(maxUploads, data.monthlyUploadsUsed));
  } else if (typeof data?.uploadsUsed === 'number') {
    claimedUsed = Math.max(0, Math.min(maxUploads, data.uploadsUsed));
  } else if (typeof data?.uploadsRemaining === 'number') {
    claimedUsed = Math.max(0, Math.min(maxUploads, maxUploads - data.uploadsRemaining));
  }

  if (claimedUsed === 0) {
    return { uploadsUsed: 0, isStaleRecord: false };
  }

  // Case 2: User claims > 0 usage, but their last upload timestamp was BEFORE September 2026 (e.g. August)
  // or last upload timestamp is not within the current period
  if (lastUploadTs) {
    if (!lastUploadTs.startsWith(currentPeriod) || lastUploadTs < '2026-09-01T00:00:00.000Z') {
      return { uploadsUsed: 0, isStaleRecord: true };
    }
    // Genuine September upload verified by timestamp
    return { uploadsUsed: claimedUsed, isStaleRecord: false };
  }

  // Case 3: No lastUploadTimestamp, but updatedAt is from August or earlier
  if (updatedAt && (!updatedAt.startsWith(currentPeriod) || updatedAt < '2026-09-01T00:00:00.000Z')) {
    return { uploadsUsed: 0, isStaleRecord: true };
  }

  // Case 4: Document has valid September upload usage
  return { uploadsUsed: claimedUsed, isStaleRecord: false };
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
    
    // Authoritatively resolve September 2026 usage & reconcile stale August records
    const { uploadsUsed, isStaleRecord } = resolveAuthoritativeMonthlyUsage(data, currentPeriod, maxUploads);
    const uploadsRemaining = Math.max(0, maxUploads - uploadsUsed);

    if (isStaleRecord) {
      // Month rolled over or stale August exhausted record -> reconcile usage to 0 and persist
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
    }

    const updatedAt = isStaleRecord ? nowIso : (data?.updatedAt || nowIso);

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

      const { uploadsUsed: currentUsed } = resolveAuthoritativeMonthlyUsage(userData, currentPeriod, maxUploads);

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
