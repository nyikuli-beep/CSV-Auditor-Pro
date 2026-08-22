import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
        setEntitlementsState(data.entitlements || getEntitlements(data.billing.plan, data.billing.subscriptionStatus));
        setUsage(data.usage || getUserUsage(userEmail, data.billing.plan));
      } else {
        const local = getOrCreateUserBilling(userEmail, userEmail);
        setBilling(local);
        setEntitlementsState(getEntitlements(local.plan, local.subscriptionStatus));
        setUsage(getUserUsage(userEmail, local.plan));
      }
    } catch (e) {
      console.warn('Fallback to local billing engine:', e);
      const local = getOrCreateUserBilling(userEmail, userEmail);
      setBilling(local);
      setEntitlementsState(getEntitlements(local.plan, local.subscriptionStatus));
      setUsage(getUserUsage(userEmail, local.plan));
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const recordUsage = async (params: {
    auditAdd?: number;
    rowsAdd?: number;
    bytesAdd?: number;
    apiCallsAdd?: number;
  }): Promise<{ allowed: boolean; limitReached?: boolean; usage: UsageMetrics }> => {
    const currentPlan = billing?.plan || 'free';
    const currentUsage = usage || getUserUsage(userEmail, currentPlan);
    const auditIncrement = params.auditAdd !== undefined ? params.auditAdd : 1;

    // Check Freemium monthly quota limit (max 5 uploads per month)
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
    const defaultEntitlements = getEntitlements(defaultBilling.plan, defaultBilling.subscriptionStatus);
    const defaultUsage = getUserUsage('freemium_user', defaultBilling.plan);
    const resetInfo = getNextMonthlyResetInfo();
    return {
      plan: defaultBilling.plan,
      subscriptionStatus: defaultBilling.subscriptionStatus,
      entitlements: defaultEntitlements,
      usage: defaultUsage,
      billing: defaultBilling,
      isLoading: false,
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
