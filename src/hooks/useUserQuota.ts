import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './useAuth';
import { 
  checkAndDecrementUploadQuota, 
  resetUserUploadQuota, 
  getOrCreateUserQuota,
  getCurrentQuotaPeriod,
  DEFAULT_MAX_UPLOADS,
  QuotaCheckResult, 
  UploadMetadata 
} from '../lib/quotaService';

export interface UserQuotaState {
  uploadsUsed: number;
  monthlyUploadsUsed: number;
  uploadsRemaining: number;
  maxUploads: number;
  monthlyUploadLimit: number;
  quotaPeriod: string;
  quotaMonth: string;
  updatedAt: string | null;
  email: string | null;
  role: string | null;
  plan: string | null;
  loading: boolean;
  error: string | null;
  isExhausted: boolean;
  syncTimestamp: number;
  lastUploadedFile: string | null;
  lastUploadDeviceId: string | null;
  lastUploadTimestamp: string | null;
  deviceId: string;
  consumeUpload: (metadata?: UploadMetadata) => Promise<QuotaCheckResult>;
  resetQuota: (amount?: number) => Promise<{ success: boolean; uploadsUsed: number; uploadsRemaining: number }>;
}

// Generate or retrieve a persistent client device identifier for multi-device sync diagnostics
function getClientDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem('csv_auditor_device_id');
  if (!id) {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    id = `device-${randomSuffix}`;
    sessionStorage.setItem('csv_auditor_device_id', id);
  }
  return id;
}

/**
 * Authoritative Real-Time User Quota Hook:
 * Subscribes to changes on the user document in Firestore.
 * Automatically synchronizes remaining upload quota and consumption across Device A and Device B in real-time.
 * Strictly derives remaining quota as: uploadsRemaining = maxUploads - uploadsUsed.
 */
export function useUserQuota(): UserQuotaState {
  const { user, loading: authLoading } = useAuth();
  const [uploadsUsed, setUploadsUsed] = useState<number>(0);
  const [uploadsRemaining, setUploadsRemaining] = useState<number>(DEFAULT_MAX_UPLOADS);
  const [maxUploads, setMaxUploads] = useState<number>(DEFAULT_MAX_UPLOADS);
  const [quotaPeriod, setQuotaPeriod] = useState<string>(getCurrentQuotaPeriod());
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(user?.email || null);
  const [role, setRole] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<number>(Date.now());
  const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);
  const [lastUploadDeviceId, setLastUploadDeviceId] = useState<string | null>(null);
  const [lastUploadTimestamp, setLastUploadTimestamp] = useState<string | null>(null);

  const deviceIdRef = useRef<string>(getClientDeviceId());

  const activeUserId = user?.uid || auth?.currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem('user_profile_uid') : null);

  useEffect(() => {
    // TASK 6: Wait for authentication resolution; avoid early default overwriting
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!activeUserId) {
      setLoading(false);
      setUploadsUsed(0);
      setUploadsRemaining(DEFAULT_MAX_UPLOADS);
      setMaxUploads(DEFAULT_MAX_UPLOADS);
      return;
    }

    setLoading(true);
    setError(null);

    const userDocRef = doc(db, 'users', activeUserId);
    const docPath = `users/${activeUserId}`;
    const currentPeriod = getCurrentQuotaPeriod();

    // Attach real-time snapshot listener on Firestore
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const docMax = typeof data?.monthlyUploadLimit === 'number' && data.monthlyUploadLimit > 0
            ? data.monthlyUploadLimit
            : (typeof data?.maxUploads === 'number' && data.maxUploads > 0 ? data.maxUploads : DEFAULT_MAX_UPLOADS);
          
          const docPeriod = (typeof data?.quotaMonth === 'string' && data.quotaMonth.trim()) ||
                            (typeof data?.quotaPeriod === 'string' && data.quotaPeriod.trim()) ||
                            '';

          let used = 0;
          // Stored quotaMonth !== currentMonth -> automatic calendar-month reset
          if (docPeriod !== currentPeriod) {
            used = 0;
            // Proactively reconcile Firestore in the background for multi-device sync
            updateDoc(userDocRef, {
              monthlyUploadsUsed: 0,
              uploadsUsed: 0,
              monthlyUploadLimit: docMax,
              maxUploads: docMax,
              uploadsRemaining: docMax,
              quotaMonth: currentPeriod,
              quotaPeriod: currentPeriod,
              updatedAt: new Date().toISOString()
            }).catch(err => console.warn('[useUserQuota] Background month reset notice:', err));
          } else if (typeof data?.monthlyUploadsUsed === 'number') {
            used = Math.max(0, Math.min(docMax, data.monthlyUploadsUsed));
          } else if (typeof data?.uploadsUsed === 'number') {
            used = Math.max(0, Math.min(docMax, data.uploadsUsed));
          } else if (typeof data?.uploadsRemaining === 'number') {
            used = Math.max(0, Math.min(docMax, docMax - data.uploadsRemaining));
          } else {
            used = 0;
          }

          // TASK 3: Strictly derive remaining = max - used
          const remaining = Math.max(0, docMax - used);

          setUploadsUsed(used);
          setUploadsRemaining(remaining);
          setMaxUploads(docMax);
          setQuotaPeriod(currentPeriod);
          setUpdatedAt(data?.updatedAt || null);
          setEmail(data?.email || user?.email || auth?.currentUser?.email || null);
          setRole(data?.role || 'Editor');
          setPlan(data?.plan || 'Free');
          setLastUploadedFile(data?.lastUploadedFile || null);
          setLastUploadDeviceId(data?.lastUploadDeviceId || null);
          setLastUploadTimestamp(data?.lastUploadTimestamp || null);
          setSyncTimestamp(Date.now());
          setError(null);
          setLoading(false);

          // TASK 12: Diagnostic Logging
          if (typeof window !== 'undefined' && (window as any).__DEBUG_QUOTA__) {
            console.log('[useUserQuota Diagnostic]', {
              authenticatedUID: activeUserId,
              quotaDocumentPath: docPath,
              maxUploads: docMax,
              uploadsUsed: used,
              uploadsRemaining: remaining,
              quotaPeriod: currentPeriod,
              currentDeviceId: deviceIdRef.current,
              sourceOfState: 'Firestore'
            });
          }
        } else {
          // Document does not exist yet. Safe initialization without overwriting
          setUploadsUsed(0);
          setUploadsRemaining(DEFAULT_MAX_UPLOADS);
          setMaxUploads(DEFAULT_MAX_UPLOADS);
          setQuotaPeriod(currentPeriod);
          setLoading(false);

          // Deterministically create default record in background
          getOrCreateUserQuota(activeUserId, user?.email || undefined).catch((err) => {
            console.warn('[useUserQuota] Background initial doc creation notice:', err);
          });
        }
      },
      (err) => {
        console.warn('[useUserQuota] onSnapshot listener notice:', err);
        try {
          handleFirestoreError(err, OperationType.GET, docPath);
        } catch (e: any) {
          setError(e?.message || 'Firestore sync error');
        }
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeUserId, authLoading, user?.email]);

  const consumeUpload = useCallback(async (metadata?: UploadMetadata): Promise<QuotaCheckResult> => {
    if (!activeUserId) {
      return {
        allowed: false,
        uploadsUsed,
        uploadsRemaining,
        maxUploads,
        error: 'Authentication required. Please log in before uploading CSV files.'
      };
    }

    const res = await checkAndDecrementUploadQuota(activeUserId, {
      ...metadata,
      deviceId: metadata?.deviceId || deviceIdRef.current
    });

    if (res.allowed) {
      setUploadsUsed(res.uploadsUsed);
      setUploadsRemaining(res.uploadsRemaining);
      setMaxUploads(res.maxUploads);
      setUpdatedAt(res.updatedAt || new Date().toISOString());
      setSyncTimestamp(Date.now());
    }

    return res;
  }, [activeUserId, uploadsUsed, uploadsRemaining, maxUploads]);

  const resetQuota = useCallback(async (amount: number = DEFAULT_MAX_UPLOADS) => {
    if (!activeUserId) return { success: false, uploadsUsed: 0, uploadsRemaining: 0 };
    const res = await resetUserUploadQuota(activeUserId, amount);
    if (res.success) {
      setUploadsUsed(0);
      setUploadsRemaining(res.uploadsRemaining);
      setMaxUploads(amount);
      setSyncTimestamp(Date.now());
    }
    return res;
  }, [activeUserId]);

  return {
    uploadsUsed,
    monthlyUploadsUsed: uploadsUsed,
    uploadsRemaining,
    maxUploads,
    monthlyUploadLimit: maxUploads,
    quotaPeriod,
    quotaMonth: quotaPeriod,
    updatedAt,
    email,
    role,
    plan,
    loading,
    error,
    isExhausted: uploadsRemaining <= 0 || uploadsUsed >= maxUploads,
    syncTimestamp,
    lastUploadedFile,
    lastUploadDeviceId,
    lastUploadTimestamp,
    deviceId: deviceIdRef.current,
    consumeUpload,
    resetQuota
  };
}

export default useUserQuota;
