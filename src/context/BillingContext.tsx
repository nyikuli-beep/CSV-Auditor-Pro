import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserPlan, UserBillingInfo, PlanEntitlements, UsageMetrics } from '../types';
import { getEntitlements, getOrCreateUserBilling, getUserUsage } from '../lib/billingService';
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
  checkAuditLimit: () => boolean;
  checkRowLimit: (rowCount: number) => boolean;
  simulatedPlan: 'pro' | 'enterprise';
  showSimulatedPaddleCheckout: boolean;
  setShowSimulatedPaddleCheckout: (show: boolean) => void;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userEmail = user?.email || 'nyikulibramwel@gmail.com';

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
        checkAuditLimit,
        checkRowLimit,
        simulatedPlan,
        showSimulatedPaddleCheckout,
        setShowSimulatedPaddleCheckout
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
    const defaultBilling = getOrCreateUserBilling('nyikulibramwel@gmail.com', 'nyikulibramwel@gmail.com');
    const defaultEntitlements = getEntitlements(defaultBilling.plan, defaultBilling.subscriptionStatus);
    const defaultUsage = getUserUsage('nyikulibramwel@gmail.com', defaultBilling.plan);
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
      checkAuditLimit: () => true,
      checkRowLimit: () => true,
      simulatedPlan: 'pro' as const,
      showSimulatedPaddleCheckout: false,
      setShowSimulatedPaddleCheckout: () => {}
    };
  }
  return context;
};
