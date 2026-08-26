import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export interface QuotaCheckResult {
  allowed: boolean;
  uploadsRemaining: number;
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

/**
 * Ensures a user document exists in Firestore and returns current quota.
 * Keyed by user's UID.
 */
export async function getOrCreateUserQuota(userId: string, email?: string): Promise<{ uploadsRemaining: number; updatedAt: string }> {
  if (!userId) {
    throw new Error('User ID is required to fetch or create user quota.');
  }

  const userDocRef = doc(db, USERS_COLLECTION, userId);

  try {
    const snap = await getDoc(userDocRef);
    const nowIso = new Date().toISOString();

    if (!snap.exists()) {
      const initialData = {
        id: userId,
        uid: userId,
        email: email || auth.currentUser?.email || '',
        uploadsRemaining: DEFAULT_INITIAL_QUOTA,
        updatedAt: nowIso,
        createdAt: nowIso,
        lastLogin: nowIso,
        role: 'Editor',
        plan: 'Free'
      };
      await setDoc(userDocRef, initialData);
      return { uploadsRemaining: DEFAULT_INITIAL_QUOTA, updatedAt: nowIso };
    }

    const data = snap.data();
    const uploadsRemaining = typeof data?.uploadsRemaining === 'number' ? data.uploadsRemaining : DEFAULT_INITIAL_QUOTA;
    const updatedAt = data?.updatedAt || nowIso;

    return { uploadsRemaining, updatedAt };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${userId}`);
    return { uploadsRemaining: DEFAULT_INITIAL_QUOTA, updatedAt: new Date().toISOString() };
  }
}

/**
 * Atomic Quota Check & Decrement Logic:
 * 1. Fetches the user's document from Firestore.
 * 2. Verifies if uploadsRemaining > 0. If not, returns error message.
 * 3. If allowed, atomically decrements uploadsRemaining using increment(-1) and updates updatedAt.
 */
export async function checkAndDecrementUploadQuota(
  userId: string,
  metadata?: UploadMetadata
): Promise<QuotaCheckResult> {
  if (!userId) {
    return {
      allowed: false,
      uploadsRemaining: 0,
      error: 'Authentication required. Please sign in to upload CSV files.'
    };
  }

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();

  try {
    // Perform transactional or atomic check to prevent race conditions across multiple devices
    const result = await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userDocRef);

      if (!userSnapshot.exists()) {
        // Initialize if doc doesn't exist
        const initialDoc = {
          id: userId,
          uid: userId,
          email: auth.currentUser?.email || '',
          uploadsRemaining: DEFAULT_INITIAL_QUOTA - 1, // First upload used
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
          uploadsRemaining: DEFAULT_INITIAL_QUOTA - 1,
          updatedAt: nowIso
        };
      }

      const userData = userSnapshot.data();
      const currentQuota = typeof userData?.uploadsRemaining === 'number' 
        ? userData.uploadsRemaining 
        : DEFAULT_INITIAL_QUOTA;

      if (currentQuota <= 0) {
        return {
          allowed: false,
          uploadsRemaining: 0,
          isFreemiumExhausted: true,
          error: 'Upload limit reached. You have 0 remaining CSV audit uploads on your free tier.'
        };
      }

      const newQuota = currentQuota - 1;
      transaction.update(userDocRef, {
        uploadsRemaining: increment(-1),
        updatedAt: nowIso,
        lastUploadedFile: metadata?.fileName || userData?.lastUploadedFile || 'file.csv',
        lastUploadDeviceId: metadata?.deviceId || 'device-primary',
        lastUploadTimestamp: nowIso
      });

      // Synchronize linked documents if applicable
      try {
        if (userId !== 'usr-nyikuli') {
          const fallbackRef = doc(db, USERS_COLLECTION, 'usr-nyikuli');
          transaction.set(fallbackRef, {
            id: 'usr-nyikuli',
            uid: 'usr-nyikuli',
            uploadsRemaining: newQuota,
            updatedAt: nowIso,
            lastUploadedFile: metadata?.fileName || userData?.lastUploadedFile || 'file.csv',
            lastUploadDeviceId: metadata?.deviceId || 'device-primary',
            lastUploadTimestamp: nowIso
          }, { merge: true });
        } else if (auth.currentUser?.uid && auth.currentUser.uid !== 'usr-nyikuli') {
          const authUserRef = doc(db, USERS_COLLECTION, auth.currentUser.uid);
          transaction.set(authUserRef, {
            uploadsRemaining: newQuota,
            updatedAt: nowIso,
            lastUploadedFile: metadata?.fileName || userData?.lastUploadedFile || 'file.csv',
            lastUploadDeviceId: metadata?.deviceId || 'device-primary',
            lastUploadTimestamp: nowIso
          }, { merge: true });
        }
      } catch (mirrorErr) {
        // non-blocking
      }

      return {
        allowed: true,
        uploadsRemaining: newQuota,
        updatedAt: nowIso
      };
    });

    return result;
  } catch (error: any) {
    // If transaction failed or offline fallback, try direct atomic updateDoc
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentQuota = typeof data?.uploadsRemaining === 'number' ? data.uploadsRemaining : DEFAULT_INITIAL_QUOTA;
        if (currentQuota <= 0) {
          return {
            allowed: false,
            uploadsRemaining: 0,
            isFreemiumExhausted: true,
            error: 'Upload limit reached. You have 0 remaining CSV audit uploads on your free tier.'
          };
        }
        await updateDoc(userDocRef, {
          uploadsRemaining: increment(-1),
          updatedAt: nowIso,
          lastUploadedFile: metadata?.fileName || 'file.csv',
          lastUploadTimestamp: nowIso
        });
        return {
          allowed: true,
          uploadsRemaining: currentQuota - 1,
          updatedAt: nowIso
        };
      }
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.WRITE, `${USERS_COLLECTION}/${userId}`);
    }

    return {
      allowed: false,
      uploadsRemaining: 0,
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
): Promise<{ success: boolean; uploadsRemaining: number }> {
  if (!userId) throw new Error('User ID is required');

  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const nowIso = new Date().toISOString();

  try {
    await updateDoc(userDocRef, {
      uploadsRemaining: quotaAmount,
      updatedAt: nowIso
    });

    if (userId !== 'usr-nyikuli') {
      try {
        const fallbackRef = doc(db, USERS_COLLECTION, 'usr-nyikuli');
        await updateDoc(fallbackRef, {
          uploadsRemaining: quotaAmount,
          updatedAt: nowIso
        });
      } catch (e) {}
    }

    return { success: true, uploadsRemaining: quotaAmount };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    return { success: false, uploadsRemaining: 0 };
  }
}
