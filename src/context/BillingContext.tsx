import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserPlan, UserBillingInfo, PlanEntitlements, UsageMetrics } from '../types';
import { getEntitlements, getOrCreateUserBilling, getUserUsage, incrementUserUsage, getNextMonthlyResetInfo, MonthlyResetInfo } from '../lib/billingService';
import { openPaddleCheckout } from '../lib/paddle';
import { useAuth } from './AuthProvider';

interface BillingContextType {
  plan: UserPlan;
  subscriptionStatus: string;
  entitlements: PlanEntitlements;
  usage: UsageMetrics | null;
  billing: UserBillingInfo | null;
  isLoading: boolean;
  isTrialActive: boolean;
  hasProAccess: boolean;
  trialDaysRemaining: number;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialUsed: boolean;
  startFreeTrial: () => Promise<{ success: boolean; message?: string; error?: string }>;
  startTrialSimulation: (days: number) => Promise<{ success: boolean; message?: string; error?: string }>;
  rollbackTrialSimulation: () => Promise<{ success: boolean; message?: string; error?: string }>;
  fastForwardTrialSimulation: (days: number) => Promise<{ success: boolean; message?: string; error?: string }>;
  isEnterpriseModalOpen: boolean;
  setIsEnterpriseModalOpen: (open: boolean) => void;
  openProCheckout: () => Promise<void>;
  openEnterpriseModal: () => void;
  refreshBilling: () => Promise<void>;
  recordUsage: (params: {
    auditAdd?: number;
    rowsAdd?: number;
    bytesAdd?: number;
    apiCallsAdd?: number;
  }) => Promise<{ allowed: boolean; limitReached?: boolean; usage: UsageMetrics }>;
  checkAuditLimit: () => boolean;
  checkRowLimit: (rowCount: number) => boolean;
  simulatedPlan: 'pro' | 'enterprise';
  showSimulatedPaddleCheckout: boolean;
  setShowSimulatedPaddleCheckout: (show: boolean) => void;
  resetInfo: MonthlyResetInfo;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userEmail = user?.email || (typeof window !== 'undefined' ? localStorage.getItem('user_profile_email') : '') || 'freemium_user';

  const [billing, setBilling] = useState<UserBillingInfo | null>(() => {
    return getOrCreateUserBilling(userEmail, userEmail);
  });

  const [entitlements, setEntitlementsState] = useState<PlanEntitlements>(() => {
    const current = billing || getOrCreateUserBilling(userEmail, userEmail);
    return getEntitlements(current.plan, current.subscriptionStatus);
  });

  const [usage, setUsage] = useState<UsageMetrics | null>(() => {
    const current = billing || getOrCreateUserBilling(userEmail, userEmail);
    return getUserUsage(userEmail, current.plan);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);

  // Simulated Paddle Modal State when external CDN or payment is offline
  const [showSimulatedPaddleCheckout, setShowSimulatedPaddleCheckout] = useState(false);
  const [simulatedPlan, setSimulatedPlan] = useState<'pro' | 'enterprise'>('pro');

  const fetchBillingData = useCallback(async () => {
    if (!userEmail) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/billing/subscription?userId=${encodeURIComponent(userEmail)}&email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.success && data.billing) {
        setBilling(data.billing);
        setEntitlementsState(data.entitlements || getEntitlements(data.billing.plan, data.billing.subscriptionStatus, data.billing.trialEndsAt));
        setUsage(data.usage || getUserUsage(userEmail, data.billing.plan));
      } else {
        const local = getOrCreateUserBilling(userEmail, userEmail);
        setBilling(local);
        setEntitlementsState(getEntitlements(local.plan, local.subscriptionStatus, local.trialEndsAt));
        setUsage(getUserUsage(userEmail, local.plan));
      }
    } catch (e) {
      console.warn('Fallback to local billing engine:', e);
      const local = getOrCreateUserBilling(userEmail, userEmail);
      setBilling(local);
      setEntitlementsState(getEntitlements(local.plan, local.subscriptionStatus, local.trialEndsAt));
      setUsage(getUserUsage(userEmail, local.plan));
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  const [cloudQuotaRemaining, setCloudQuotaRemaining] = useState<number | null>(null);

  const activeUserId = user?.uid || auth?.currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem('user_profile_uid') : null) || 'usr-nyikuli';

  // Sync real-time Firestore user quota into Billing state
  useEffect(() => {
    if (!activeUserId) return;
    try {
      const userRef = doc(db, 'users', activeUserId);
      const unsubscribe = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data?.uploadsRemaining === 'number') {
            const quota = data.uploadsRemaining;
            setCloudQuotaRemaining(quota);
            const cloudUsed = Math.max(0, 5 - quota);
            setUsage(prev => {
              const current = prev || getUserUsage(userEmail, billing?.plan || 'free');
              return {
                ...current,
                auditCount: Math.max(current.auditCount, cloudUsed)
              };
            });
          }
        } else if (activeUserId !== 'usr-nyikuli') {
          // Check fallback
          const fallbackRef = doc(db, 'users', 'usr-nyikuli');
          onSnapshot(fallbackRef, (fallbackSnap) => {
            if (fallbackSnap.exists()) {
              const fbData = fallbackSnap.data();
              if (typeof fbData?.uploadsRemaining === 'number') {
                const quota = fbData.uploadsRemaining;
                setCloudQuotaRemaining(quota);
                const cloudUsed = Math.max(0, 5 - quota);
                setUsage(prev => {
                  const current = prev || getUserUsage(userEmail, billing?.plan || 'free');
                  return {
                    ...current,
                    auditCount: Math.max(current.auditCount, cloudUsed)
                  };
                });
              }
            }
          });
        }
      }, (err) => {
        console.warn('BillingContext firestore quota listener notice:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('BillingContext firestore subscription error:', e);
    }
  }, [activeUserId, userEmail, billing?.plan]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Free Trial Activation Method
  const startFreeTrial = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          email: userEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.billing) {
          setBilling(data.billing);
          setEntitlementsState(data.entitlements || getEntitlements(data.billing.plan, data.billing.subscriptionStatus, data.billing.trialEndsAt));
        }
        await fetchBillingData();
        return { success: true, message: data.message || '14-day Pro Free Trial activated!' };
      } else {
        return { success: false, error: data.error || 'Failed to start free trial' };
      }
    } catch (err: any) {
      console.error('startFreeTrial error:', err);
      return { success: false, error: err.message || 'Network error activating free trial' };
    } finally {
      setIsLoading(false);
    }
  };

  // Simulation Environment for Trial Testing (Selected Days, Fast Forward, Rollback)
  const startTrialSimulation = async (days: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/simulation-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          email: userEmail,
          durationDays: days
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.billing) {
          setBilling(data.billing);
          setEntitlementsState(data.entitlements || getEntitlements(data.billing.plan, data.billing.subscriptionStatus, data.billing.trialEndsAt));
        }
        await fetchBillingData();
        return { 
          success: true, 
          message: data.message || `Simulation environment trial activated for ${days} days! Team tenancy, branded reports, and restricted cleaning actions enabled.` 
        };
      } else {
        return { success: false, error: data.error || 'Failed to initialize simulation trial' };
      }
    } catch (err: any) {
      console.error('startTrialSimulation error:', err);
      return { success: false, error: err.message || 'Network error activating trial simulation' };
    } finally {
      setIsLoading(false);
    }
  };

  const rollbackTrialSimulation = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/simulation-rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          email: userEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.billing) {
          setBilling(data.billing);
          setEntitlementsState(data.entitlements || getEntitlements(data.billing.plan, data.billing.subscriptionStatus, data.billing.trialEndsAt));
        }
        await fetchBillingData();
        return { 
          success: true, 
          message: data.message || 'Trial concluded. Account successfully rolled back to the Free plan.' 
        };
      } else {
        return { success: false, error: data.error || 'Failed to roll back trial simulation' };
      }
    } catch (err: any) {
      console.error('rollbackTrialSimulation error:', err);
      return { success: false, error: err.message || 'Network error rolling back trial simulation' };
    } finally {
      setIsLoading(false);
    }
  };

  const fastForwardTrialSimulation = async (days: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/simulation-time-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          email: userEmail,
          shiftDays: days
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.billing) {
          setBilling(data.billing);
          setEntitlementsState(data.entitlements || getEntitlements(data.billing.plan, data.billing.subscriptionStatus, data.billing.trialEndsAt));
        }
        await fetchBillingData();
        return { 
          success: true, 
          message: data.message || `Simulated time shifted by ${days} day(s).` 
        };
      } else {
        return { success: false, error: data.error || 'Failed to advance simulated time' };
      }
    } catch (err: any) {
      console.error('fastForwardTrialSimulation error:', err);
      return { success: false, error: err.message || 'Network error adjusting simulation time' };
    } finally {
      setIsLoading(false);
    }
  };

  // Periodic Trial Expiration Check (auto rolls back to free plan once trialEndsAt is passed)
  useEffect(() => {
    const checkTrialExpiry = () => {
      if (billing?.plan === 'pro_trial' && billing?.trialEndsAt) {
        const now = Date.now();
        const endsAt = new Date(billing.trialEndsAt).getTime();
        if (!isNaN(endsAt) && endsAt <= now) {
          // Auto rollback
          rollbackTrialSimulation();
        }
      }
    };

    const interval = setInterval(checkTrialExpiry, 15000);
    return () => clearInterval(interval);
  }, [billing?.plan, billing?.trialEndsAt]);

  const recordUsage = async (params: {
    auditAdd?: number;
    rowsAdd?: number;
    bytesAdd?: number;
    apiCallsAdd?: number;
  }): Promise<{ allowed: boolean; limitReached?: boolean; usage: UsageMetrics }> => {
    const currentPlan = billing?.plan || 'free';
    const currentUsage = usage || getUserUsage(userEmail, currentPlan);
    const auditIncrement = params.auditAdd !== undefined ? params.auditAdd : 1;

    // Check Freemium monthly quota limit (max 5 uploads per month for free plan)
    if (currentPlan === 'free' && currentUsage.auditCount >= 5 && auditIncrement > 0) {
      return {
        allowed: false,
        limitReached: true,
        usage: currentUsage
      };
    }

    // Instantly update local state synchronously for instantaneous UI responsiveness
    const updated = incrementUserUsage(
      userEmail,
      currentPlan,
      auditIncrement,
      params.rowsAdd || 0,
      params.bytesAdd || 0,
      params.apiCallsAdd || 0
    );

    setUsage({ ...updated });

    // Sync to backend non-blockingly
    try {
      fetch('/api/billing/track-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          auditAdd: auditIncrement,
          rowsAdd: params.rowsAdd || 0,
          bytesAdd: params.bytesAdd || 0,
          apiCallsAdd: params.apiCallsAdd || 0
        })
      }).catch(err => console.warn('Background usage sync notice:', err));
    } catch (err) {
      console.warn('Usage tracking fetch error:', err);
    }

    return {
      allowed: true,
      limitReached: currentPlan === 'free' && updated.auditCount >= 5,
      usage: updated
    };
  };

  const openProCheckout = async () => {
    try {
      const res = await openPaddleCheckout(
        'pro',
        userEmail,
        async () => {
          await fetchBillingData();
        },
        () => {}
      );
      if (res && res.isSimulated) {
        setSimulatedPlan('pro');
        setShowSimulatedPaddleCheckout(true);
      }
    } catch (e) {
      setSimulatedPlan('pro');
      setShowSimulatedPaddleCheckout(true);
    }
  };

  const openEnterpriseModal = () => {
    setIsEnterpriseModalOpen(true);
  };

  const checkAuditLimit = (): boolean => {
    const currentPlan = billing?.plan || 'free';
    if (currentPlan === 'free') {
      if (cloudQuotaRemaining !== null && cloudQuotaRemaining <= 0) {
        return false;
      }
      const currentUsage = usage || getUserUsage(userEmail, 'free');
      if (currentUsage.auditCount >= 5) {
        return false;
      }
    }
    return true;
  };

  const checkRowLimit = (rowCount: number): boolean => {
    const currentPlan = billing?.plan || 'free';
    if (currentPlan === 'free' && rowCount > 10000) {
      return false;
    }
    return true;
  };

  const plan = billing?.plan || 'free';
  const subscriptionStatus = billing?.subscriptionStatus || 'active';
  const trialStartedAt = billing?.trialStartedAt || null;
  const trialEndsAt = billing?.trialEndsAt || null;
  const trialUsed = Boolean(billing?.trialUsed);

  // Compute trial status & days remaining
  let isTrialActive = false;
  let trialDaysRemaining = 0;
  if (plan === 'pro_trial' && trialEndsAt) {
    const msDiff = new Date(trialEndsAt).getTime() - Date.now();
    if (msDiff > 0) {
      isTrialActive = true;
      trialDaysRemaining = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
    }
  }

  const hasProAccess = plan === 'pro' || plan === 'enterprise' || isTrialActive;
  const resetInfo = getNextMonthlyResetInfo();

  return (
    <BillingContext.Provider
      value={{
        plan,
        subscriptionStatus,
        entitlements,
        usage,
        billing,
        isLoading,
        isTrialActive,
        hasProAccess,
        trialDaysRemaining,
        trialStartedAt,
        trialEndsAt,
        trialUsed,
        startFreeTrial,
        startTrialSimulation,
        rollbackTrialSimulation,
        fastForwardTrialSimulation,
        isEnterpriseModalOpen,
        setIsEnterpriseModalOpen,
        openProCheckout,
        openEnterpriseModal,
        refreshBilling: fetchBillingData,
        recordUsage,
        checkAuditLimit,
        checkRowLimit,
        simulatedPlan,
        showSimulatedPaddleCheckout,
        setShowSimulatedPaddleCheckout,
        resetInfo
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    // Provide a safe fallback if used outside provider
    const defaultBilling = getOrCreateUserBilling('freemium_user', 'freemium_user');
    const defaultEntitlements = getEntitlements(defaultBilling.plan, defaultBilling.subscriptionStatus, defaultBilling.trialEndsAt);
    const defaultUsage = getUserUsage('freemium_user', defaultBilling.plan);
    const resetInfo = getNextMonthlyResetInfo();
    return {
      plan: defaultBilling.plan,
      subscriptionStatus: defaultBilling.subscriptionStatus,
      entitlements: defaultEntitlements,
      usage: defaultUsage,
      billing: defaultBilling,
      isLoading: false,
      isTrialActive: false,
      hasProAccess: false,
      trialDaysRemaining: 0,
      trialStartedAt: null,
      trialEndsAt: null,
      trialUsed: false,
      startFreeTrial: async () => ({ success: false, error: 'Billing provider not mounted' }),
      startTrialSimulation: async () => ({ success: false, error: 'Billing provider not mounted' }),
      rollbackTrialSimulation: async () => ({ success: false, error: 'Billing provider not mounted' }),
      fastForwardTrialSimulation: async () => ({ success: false, error: 'Billing provider not mounted' }),
      isEnterpriseModalOpen: false,
      setIsEnterpriseModalOpen: () => {},
      openProCheckout: async () => {},
      openEnterpriseModal: () => {},
      refreshBilling: async () => {},
      recordUsage: async () => ({ allowed: true, usage: defaultUsage }),
      checkAuditLimit: () => true,
      checkRowLimit: () => true,
      simulatedPlan: 'pro' as const,
      showSimulatedPaddleCheckout: false,
      setShowSimulatedPaddleCheckout: () => {},
      resetInfo
    };
  }
  return context;
};
