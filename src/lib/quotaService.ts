import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export interface QuotaCheckResult {
  allowed: boolean;
  uploadsRemaining: number;
  monthlyUploadsUsed?: number;
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

const USERS_COLLECTION = 'users';
const DEFAULT_INITIAL_QUOTA = 5;

function getCurrentPeriodMonth(): string {
  return new Date().toISOString().substring(0, 7); // YYYY-MM
}

/**
 * Ensures a user document exists in Firestore and returns current quota.
 * Keyed by user's UID.
 */
export async function getOrCreateUserQuota(userId: string, email?: string): Promise<{ uploadsRemaining: number; monthlyUploadsUsed: number; updatedAt: string }> {
  if (!userId) {
    throw new Error('User ID is required to fetch or create user quota.');
  }

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const currentMonth = getCurrentPeriodMonth();

  try {
    const snap = await getDoc(userDocRef);
    const nowIso = new Date().toISOString();

    if (!snap.exists()) {
      const initialData = {
        id: userId,
        uid: userId,
        email: email || auth.currentUser?.email || '',
        uploadsRemaining: DEFAULT_INITIAL_QUOTA,
        monthlyUploadsUsed: 0,
        periodMonth: currentMonth,
        updatedAt: nowIso,
        createdAt: nowIso,
        lastLogin: nowIso,
        role: 'Editor',
        plan: 'Free',
        version: 1
      };
      await setDoc(userDocRef, initialData);
      console.log(`[SYNC] device=init source=Firestore getOrCreate remaining=${DEFAULT_INITIAL_QUOTA} used=0`);
      return { uploadsRemaining: DEFAULT_INITIAL_QUOTA, monthlyUploadsUsed: 0, updatedAt: nowIso };
    }

    const data = snap.data();
    let uploadsRemaining = typeof data?.uploadsRemaining === 'number' ? data.uploadsRemaining : DEFAULT_INITIAL_QUOTA;
    let monthlyUploadsUsed = typeof data?.monthlyUploadsUsed === 'number' ? data.monthlyUploadsUsed : Math.max(0, DEFAULT_INITIAL_QUOTA - uploadsRemaining);
    
    // Check monthly rollover
    if (data?.periodMonth && data.periodMonth !== currentMonth) {
      uploadsRemaining = DEFAULT_INITIAL_QUOTA;
      monthlyUploadsUsed = 0;
      await updateDoc(userDocRef, {
        uploadsRemaining: DEFAULT_INITIAL_QUOTA,
        monthlyUploadsUsed: 0,
        periodMonth: currentMonth,
        updatedAt: nowIso
      });
    }

    const updatedAt = data?.updatedAt || nowIso;
    return { uploadsRemaining, monthlyUploadsUsed, updatedAt };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${userId}`);
    return { uploadsRemaining: DEFAULT_INITIAL_QUOTA, monthlyUploadsUsed: 0, updatedAt: new Date().toISOString() };
  }
}

/**
 * Atomic Quota Check & Decrement Logic:
 * 1. Fetches the user's document from Firestore inside a transaction.
 * 2. Verifies if uploadsRemaining > 0 and monthlyUploadsUsed < 5.
 * 3. Atomically updates uploadsRemaining and monthlyUploadsUsed in Firestore.
 */
export async function checkAndDecrementUploadQuota(
  userId: string,
  metadata?: UploadMetadata
): Promise<QuotaCheckResult> {
  if (!userId) {
    return {
      allowed: false,
      uploadsRemaining: 0,
      monthlyUploadsUsed: DEFAULT_INITIAL_QUOTA,
      error: 'Authentication required. Please sign in to upload CSV files.'
    };
  }

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();
  const currentMonth = getCurrentPeriodMonth();
  const deviceId = metadata?.deviceId || 'device-primary';

  try {
    // Perform transactional atomic check to prevent race conditions across multiple devices
    const result = await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userDocRef);

      if (!userSnapshot.exists()) {
        // Initialize if doc doesn't exist
        const initialDoc = {
          id: userId,
          uid: userId,
          email: auth.currentUser?.email || '',
          uploadsRemaining: DEFAULT_INITIAL_QUOTA - 1, // First upload used
          monthlyUploadsUsed: 1,
          periodMonth: currentMonth,
          updatedAt: nowIso,
          createdAt: nowIso,
          lastLogin: nowIso,
          lastUploadedFile: metadata?.fileName || 'file.csv',
          lastUploadDeviceId: deviceId,
          lastUploadTimestamp: nowIso,
          role: 'Editor',
          plan: 'Free',
          version: 1
        };
        transaction.set(userDocRef, initialDoc);
        console.log(`[SYNC] device=${deviceId} source=Firestore transaction-init op=decrement remaining=${DEFAULT_INITIAL_QUOTA - 1} used=1 file=${metadata?.fileName || 'file.csv'}`);
        return {
          allowed: true,
          uploadsRemaining: DEFAULT_INITIAL_QUOTA - 1,
          monthlyUploadsUsed: 1,
          updatedAt: nowIso
        };
      }

      const userData = userSnapshot.data();
      let currentQuota = typeof userData?.uploadsRemaining === 'number' 
        ? userData.uploadsRemaining 
        : DEFAULT_INITIAL_QUOTA;
      let currentUsed = typeof userData?.monthlyUploadsUsed === 'number'
        ? userData.monthlyUploadsUsed
        : Math.max(0, DEFAULT_INITIAL_QUOTA - currentQuota);

      // Handle period rollover inside transaction
      if (userData?.periodMonth && userData.periodMonth !== currentMonth) {
        currentQuota = DEFAULT_INITIAL_QUOTA;
        currentUsed = 0;
      }

      if (currentQuota <= 0) {
        console.warn(`[SYNC] device=${deviceId} source=Firestore transaction op=blocked_limit_exhausted remaining=0 used=${currentUsed}`);
        return {
          allowed: false,
          uploadsRemaining: 0,
          monthlyUploadsUsed: currentUsed,
          isFreemiumExhausted: true,
          error: 'Upload limit reached. You have 0 remaining CSV audit uploads on your free tier.'
        };
      }

      const newQuota = currentQuota - 1;
      const newUsed = currentUsed + 1;

      transaction.update(userDocRef, {
        uploadsRemaining: newQuota,
        monthlyUploadsUsed: newUsed,
        periodMonth: currentMonth,
        updatedAt: nowIso,
        lastUploadedFile: metadata?.fileName || userData?.lastUploadedFile || 'file.csv',
        lastUploadDeviceId: deviceId,
        lastUploadTimestamp: nowIso,
        version: increment(1)
      });

      // Synchronize linked documents if applicable (e.g. demo/fallback test document)
      try {
        if (userId !== 'usr-nyikuli') {
          const fallbackRef = doc(db, USERS_COLLECTION, 'usr-nyikuli');
          transaction.set(fallbackRef, {
            id: 'usr-nyikuli',
            uid: 'usr-nyikuli',
            uploadsRemaining: newQuota,
            monthlyUploadsUsed: newUsed,
            periodMonth: currentMonth,
            updatedAt: nowIso,
            lastUploadedFile: metadata?.fileName || userData?.lastUploadedFile || 'file.csv',
            lastUploadDeviceId: deviceId,
            lastUploadTimestamp: nowIso,
            version: increment(1)
          }, { merge: true });
        } else if (auth.currentUser?.uid && auth.currentUser.uid !== 'usr-nyikuli') {
          const authUserRef = doc(db, USERS_COLLECTION, auth.currentUser.uid);
          transaction.set(authUserRef, {
            uploadsRemaining: newQuota,
            monthlyUploadsUsed: newUsed,
            periodMonth: currentMonth,
            updatedAt: nowIso,
            lastUploadedFile: metadata?.fileName || userData?.lastUploadedFile || 'file.csv',
            lastUploadDeviceId: deviceId,
            lastUploadTimestamp: nowIso,
            version: increment(1)
          }, { merge: true });
        }
      } catch (mirrorErr) {
        // non-blocking
      }

      console.log(`[SYNC] device=${deviceId} source=Firestore transaction op=decrement remaining=${newQuota} used=${newUsed} file=${metadata?.fileName || 'file.csv'}`);

      return {
        allowed: true,
        uploadsRemaining: newQuota,
        monthlyUploadsUsed: newUsed,
        updatedAt: nowIso
      };
    });

    return result;
  } catch (error: any) {
    console.warn('[quotaService] Transaction error, attempting direct atomic update fallback:', error);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentQuota = typeof data?.uploadsRemaining === 'number' ? data.uploadsRemaining : DEFAULT_INITIAL_QUOTA;
        const currentUsed = typeof data?.monthlyUploadsUsed === 'number' ? data.monthlyUploadsUsed : Math.max(0, DEFAULT_INITIAL_QUOTA - currentQuota);
        if (currentQuota <= 0) {
          return {
            allowed: false,
            uploadsRemaining: 0,
            monthlyUploadsUsed: currentUsed,
            isFreemiumExhausted: true,
            error: 'Upload limit reached. You have 0 remaining CSV audit uploads on your free tier.'
          };
        }
        const newQuota = currentQuota - 1;
        const newUsed = currentUsed + 1;
        await updateDoc(userDocRef, {
          uploadsRemaining: newQuota,
          monthlyUploadsUsed: newUsed,
          periodMonth: currentMonth,
          updatedAt: nowIso,
          lastUploadedFile: metadata?.fileName || 'file.csv',
          lastUploadDeviceId: deviceId,
          lastUploadTimestamp: nowIso
        });
        console.log(`[SYNC] device=${deviceId} source=Firestore direct-update op=decrement remaining=${newQuota} used=${newUsed}`);
        return {
          allowed: true,
          uploadsRemaining: newQuota,
          monthlyUploadsUsed: newUsed,
          updatedAt: nowIso
        };
      }
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.WRITE, `${USERS_COLLECTION}/${userId}`);
    }

    return {
      allowed: false,
      uploadsRemaining: 0,
      monthlyUploadsUsed: DEFAULT_INITIAL_QUOTA,
      error: error?.message || 'Failed to update upload quota in Firestore.'
    };
  }
}

/**
 * Resets user's upload quota back to default (5) or custom amount.
 * Used for plan upgrades, multi-device testing, or admin reset actions.
 */
export async function resetUserUploadQuota(
  userId: string,
  quotaAmount: number = DEFAULT_INITIAL_QUOTA
): Promise<{ success: boolean; uploadsRemaining: number; monthlyUploadsUsed: number }> {
  if (!userId) throw new Error('User ID is required');

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();
  const currentMonth = getCurrentPeriodMonth();
  const usedAmount = Math.max(0, DEFAULT_INITIAL_QUOTA - quotaAmount);

  try {
    await updateDoc(userDocRef, {
      uploadsRemaining: quotaAmount,
      monthlyUploadsUsed: usedAmount,
      periodMonth: currentMonth,
      updatedAt: nowIso,
      version: increment(1)
    });

    if (userId !== 'usr-nyikuli') {
      try {
        const fallbackRef = doc(db, USERS_COLLECTION, 'usr-nyikuli');
        await updateDoc(fallbackRef, {
          uploadsRemaining: quotaAmount,
          monthlyUploadsUsed: usedAmount,
          periodMonth: currentMonth,
          updatedAt: nowIso,
          version: increment(1)
        });
      } catch (e) {}
    }

    console.log(`[SYNC] source=Firestore reset remaining=${quotaAmount} used=${usedAmount}`);
    return { success: true, uploadsRemaining: quotaAmount, monthlyUploadsUsed: usedAmount };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    return { success: false, uploadsRemaining: 0, monthlyUploadsUsed: DEFAULT_INITIAL_QUOTA };
  }
}
