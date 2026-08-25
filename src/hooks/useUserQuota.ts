import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './useAuth';
import { checkAndDecrementUploadQuota, resetUserUploadQuota, QuotaCheckResult, UploadMetadata } from '../lib/quotaService';

export interface UserQuotaState {
  uploadsRemaining: number;
  monthlyUploadsUsed: number;
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
  resetQuota: (amount?: number) => Promise<{ success: boolean; uploadsRemaining: number; monthlyUploadsUsed: number }>;
}

const DEFAULT_QUOTA = 5;

// Generate or retrieve a persistent client device identifier for multi-device testing
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
 * Real-Time Client Synchronization Hook (onSnapshot):
 * Subscribes to changes on the user document in Firestore.
 * Automatically synchronizes remaining upload quota and state across Device A and Device B in real-time.
 */
export function useUserQuota(): UserQuotaState {
  const { user } = useAuth();
  const [uploadsRemaining, setUploadsRemaining] = useState<number>(DEFAULT_QUOTA);
  const [monthlyUploadsUsed, setMonthlyUploadsUsed] = useState<number>(0);
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

  const activeUserId = user?.uid || auth?.currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem('user_profile_uid') : null) || 'usr-nyikuli';

  useEffect(() => {
    if (!activeUserId) {
      setLoading(false);
      setUploadsRemaining(DEFAULT_QUOTA);
      setMonthlyUploadsUsed(0);
      return;
    }

    setLoading(true);
    setError(null);

    const userDocRef = doc(db, 'users', activeUserId);
    const docPath = `users/${activeUserId}`;
    let fallbackUnsubscribe: (() => void) | null = null;

    // Attach real-time snapshot listener on Firestore
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const quota = typeof data?.uploadsRemaining === 'number' ? data.uploadsRemaining : DEFAULT_QUOTA;
          const used = typeof data?.monthlyUploadsUsed === 'number' ? data.monthlyUploadsUsed : Math.max(0, DEFAULT_QUOTA - quota);
          
          setUploadsRemaining(quota);
          setMonthlyUploadsUsed(used);
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

          console.log(`[SYNC] device=${deviceIdRef.current} source=onSnapshot doc=${activeUserId} remaining=${quota} used=${used}`);
        } else {
          // If primary user document does not exist yet, check fallback document
          if (activeUserId !== 'usr-nyikuli') {
            const fallbackRef = doc(db, 'users', 'usr-nyikuli');
            if (fallbackUnsubscribe) fallbackUnsubscribe();
            fallbackUnsubscribe = onSnapshot(fallbackRef, (fallbackSnap) => {
              if (fallbackSnap.exists()) {
                const fbData = fallbackSnap.data();
                const quota = typeof fbData?.uploadsRemaining === 'number' ? fbData.uploadsRemaining : DEFAULT_QUOTA;
                const used = typeof fbData?.monthlyUploadsUsed === 'number' ? fbData.monthlyUploadsUsed : Math.max(0, DEFAULT_QUOTA - quota);
                setUploadsRemaining(quota);
                setMonthlyUploadsUsed(used);
                setUpdatedAt(fbData?.updatedAt || null);
                setLastUploadedFile(fbData?.lastUploadedFile || null);
                setLastUploadDeviceId(fbData?.lastUploadDeviceId || null);
                setLastUploadTimestamp(fbData?.lastUploadTimestamp || null);
                setSyncTimestamp(Date.now());
                console.log(`[SYNC] device=${deviceIdRef.current} source=onSnapshot-fallback remaining=${quota} used=${used}`);
              } else {
                setUploadsRemaining(DEFAULT_QUOTA);
                setMonthlyUploadsUsed(0);
                setUpdatedAt(null);
              }
              setLoading(false);
            }, () => {
              setUploadsRemaining(DEFAULT_QUOTA);
              setMonthlyUploadsUsed(0);
              setLoading(false);
            });
          } else {
            setUploadsRemaining(DEFAULT_QUOTA);
            setMonthlyUploadsUsed(0);
            setUpdatedAt(null);
            setLoading(false);
          }
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
      if (fallbackUnsubscribe) fallbackUnsubscribe();
    };
  }, [activeUserId, user?.email]);

  const consumeUpload = useCallback(async (metadata?: UploadMetadata): Promise<QuotaCheckResult> => {
    if (!activeUserId) {
      return {
        allowed: false,
        uploadsRemaining: 0,
        monthlyUploadsUsed: DEFAULT_QUOTA,
        error: 'Authentication required. Please log in before uploading CSV files.'
      };
    }

    const res = await checkAndDecrementUploadQuota(activeUserId, {
      ...metadata,
      deviceId: metadata?.deviceId || deviceIdRef.current
    });

    if (res.allowed) {
      setUploadsRemaining(res.uploadsRemaining);
      if (typeof res.monthlyUploadsUsed === 'number') {
        setMonthlyUploadsUsed(res.monthlyUploadsUsed);
      }
      setUpdatedAt(res.updatedAt || new Date().toISOString());
      setSyncTimestamp(Date.now());
    }

    return res;
  }, [activeUserId]);

  const resetQuota = useCallback(async (amount: number = DEFAULT_QUOTA) => {
    if (!activeUserId) return { success: false, uploadsRemaining: 0, monthlyUploadsUsed: DEFAULT_QUOTA };
    const res = await resetUserUploadQuota(activeUserId, amount);
    if (res.success) {
      setUploadsRemaining(res.uploadsRemaining);
      setMonthlyUploadsUsed(res.monthlyUploadsUsed);
      setSyncTimestamp(Date.now());
    }
    return res;
  }, [activeUserId]);

  return {
    uploadsRemaining,
    monthlyUploadsUsed,
    updatedAt,
    email,
    role,
    plan,
    loading,
    error,
    isExhausted: uploadsRemaining <= 0,
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
