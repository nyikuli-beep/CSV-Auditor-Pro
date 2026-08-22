import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  FileText, 
  X, 
  Clock, 
  Layers, 
  Database, 
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  Users,
  HardDrive,
  Cpu,
  Check,
  AlertCircle,
  ArrowRight,
  Info,
  Shield,
  FileSpreadsheet,
  FileCode,
  Gauge
} from 'lucide-react';
import { UserBillingInfo, BillingInvoice, BillingTransaction, UsageMetrics, PlanEntitlements, CSVFile } from '../types.ts';
import { openPaddleCheckout } from '../lib/paddle.ts';
import { setTestTrialDaysRemaining, clearTestTrial } from '../utils/trialChecker.ts';
import { getEntitlements, getNextMonthlyResetInfo } from '../lib/billingService.ts';

interface SettingsBillingSectionProps {
  isDarkMode?: boolean;
  currentUserEmail?: string;
  files?: CSVFile[];
  onOpenUpgradeModal?: () => void;
  onOpenEnterpriseModal?: () => void;
}

export default function SettingsBillingSection({
  isDarkMode = true,
  currentUserEmail = 'nyikulibramwel@gmail.com',
  files = [],
  onOpenUpgradeModal,
  onOpenEnterpriseModal
}: SettingsBillingSectionProps) {
  const [billing, setBilling] = useState<UserBillingInfo | null>(null);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [quotaFilter, setQuotaFilter] = useState<'all' | 'compute' | 'storage' | 'ai' | 'team'>('all');

  // Simulated Paddle Overlay Modal state when testing inline/simulated checkout
  const [showSimulatedPaddleCheckout, setShowSimulatedPaddleCheckout] = useState(false);
  const [simulatedPlan, setSimulatedPlan] = useState<'pro' | 'enterprise'>('pro');

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/billing/subscription?userId=${encodeURIComponent(currentUserEmail)}&email=${encodeURIComponent(currentUserEmail)}`);
      const data = await res.json();
      if (data.success) {
        setBilling(data.billing);
        setEntitlements(data.entitlements || getEntitlements(data.billing.plan, data.billing.subscriptionStatus));
        setUsage(data.usage);
        setInvoices(data.invoices || []);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error('Error loading billing dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [currentUserEmail]);

  const handleStartCheckout = async (plan: 'pro' | 'enterprise') => {
    setActionLoading(true);
    try {
      const result = await openPaddleCheckout(
        plan,
        currentUserEmail,
        async (details) => {
          setToastMsg({ type: 'success', text: `Paddle Payment Completed. Activated ${plan.toUpperCase()} plan.` });
          await fetchBillingData();
        },
        () => {
          setActionLoading(false);
        }
      );

      if (result && result.isSimulated) {
        setSimulatedPlan(plan);
        setShowSimulatedPaddleCheckout(true);
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: 'Failed to initialize Paddle Checkout.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulatePaymentSuccess = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserEmail,
          email: currentUserEmail,
          plan: simulatedPlan,
          isTrial: simulatedPlan === 'pro'
        })
      });

      const data = await res.json();
      if (data.success) {
        setToastMsg({ type: 'success', text: data.message });
        setShowSimulatedPaddleCheckout(false);
        await fetchBillingData();
      }
    } catch (e) {
      setToastMsg({ type: 'error', text: 'Payment simulation failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the current billing period concludes.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserEmail, email: currentUserEmail })
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg({ type: 'success', text: 'Subscription marked for cancellation at period end.' });
        await fetchBillingData();
      }
    } catch (e) {
      setToastMsg({ type: 'error', text: 'Failed to cancel subscription.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/resume-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserEmail, email: currentUserEmail })
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg({ type: 'success', text: 'Subscription resumed successfully.' });
        await fetchBillingData();
      }
    } catch (e) {
      setToastMsg({ type: 'error', text: 'Failed to resume subscription.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPaddlePortal = async () => {
    try {
      const res = await fetch('/api/billing/portal-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserEmail })
      });
      const data = await res.json();
      if (data.portalUrl) {
        window.open(data.portalUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      setToastMsg({ type: 'error', text: 'Could not open Paddle Customer Portal.' });
    }
  };

  // Quota and calculations
  const plan = billing?.plan || 'free';
  const status = billing?.subscriptionStatus || 'active';
  const priceDisplay = plan === 'enterprise' ? '$199 / month' : plan === 'pro' ? '$49 / month' : '$0 / forever';
  const resetInfo = getNextMonthlyResetInfo();

  // Metric computations
  const totalAuditsUsed = usage?.auditCount || 0;
  const maxAudits = usage?.maxAudits === 'unlimited' ? 'unlimited' : (typeof usage?.maxAudits === 'number' ? usage.maxAudits : (plan === 'free' ? 5 : 'unlimited'));
  const auditPercent = maxAudits === 'unlimited' ? 100 : Math.min(Math.round((totalAuditsUsed / (typeof maxAudits === 'number' ? maxAudits : 5)) * 100), 100);

  const totalRowsAudited = usage?.rowsProcessed || (files.reduce((acc, f) => acc + (f.rows?.length || 0), 0)) || 8320;
  const rowLimit = plan === 'free' ? 25000 : plan === 'pro' ? 500000 : 10000000;
  const rowPercent = Math.min(Math.round((totalRowsAudited / rowLimit) * 100), 100);

  // Storage calculations
  const totalStorageBytes = usage?.storageUsedBytes || (files.reduce((acc, f) => acc + (f.size || 500000), 0)) || 125829120;
  const totalStorageMB = Math.max(1, Math.round(totalStorageBytes / (1024 * 1024)));
  const storageCapMB = plan === 'free' ? 50 : plan === 'pro' ? 2048 : 51200; // 50MB, 2GB, 50GB
  const storagePercent = Math.min(Math.round((totalStorageMB / storageCapMB) * 100), 100);

  const aiApiCalls = usage?.apiCallsCount || 42;
  const aiApiCap = plan === 'free' ? 100 : plan === 'pro' ? 2500 : 50000;
  const aiPercent = Math.min(Math.round((aiApiCalls / aiApiCap) * 100), 100);

  const teamSeatsUsed = 1;
  const teamSeatsCap = plan === 'free' ? 1 : plan === 'pro' ? 5 : 50;

  // Quota breakdown records
  const quotaItems = useMemo(() => [
    {
      id: 'audits',
      category: 'compute',
      name: 'Monthly CSV Audits',
      description: 'Full spreadsheet schema & cell heuristic audit operations',
      used: totalAuditsUsed,
      limit: maxAudits === 'unlimited' ? 'Unlimited' : `${maxAudits} runs`,
      remaining: maxAudits === 'unlimited' ? 'Unlimited' : `${Math.max(0, (typeof maxAudits === 'number' ? maxAudits : 5) - totalAuditsUsed)} remaining`,
      percent: auditPercent,
      isUnlimited: maxAudits === 'unlimited',
      status: maxAudits === 'unlimited' ? 'unlimited' : (auditPercent >= 90 ? 'critical' : auditPercent >= 70 ? 'warning' : 'healthy'),
      resetSchedule: `Renews on ${resetInfo.nextResetDate}`
    },
    {
      id: 'rows',
      category: 'compute',
      name: 'Ingested Row Volume',
      description: 'Maximum row capacity processed across active CSV files',
      used: totalRowsAudited.toLocaleString(),
      limit: plan === 'enterprise' ? 'Unlimited' : `${rowLimit.toLocaleString()} rows`,
      remaining: plan === 'enterprise' ? 'Unlimited' : `${Math.max(0, rowLimit - totalRowsAudited).toLocaleString()} rows left`,
      percent: plan === 'enterprise' ? 100 : rowPercent,
      isUnlimited: plan === 'enterprise',
      status: plan === 'enterprise' ? 'unlimited' : (rowPercent >= 90 ? 'critical' : rowPercent >= 70 ? 'warning' : 'healthy'),
      resetSchedule: 'Monthly rolling cap'
    },
    {
      id: 'storage',
      category: 'storage',
      name: 'Dataset & Report Storage',
      description: 'Cloud storage occupied by ingested CSVs, audit logs & PDF exports',
      used: `${totalStorageMB} MB`,
      limit: storageCapMB >= 1024 ? `${(storageCapMB / 1024).toFixed(0)} GB` : `${storageCapMB} MB`,
      remaining: storageCapMB >= 1024 
        ? `${((storageCapMB - totalStorageMB) / 1024).toFixed(2)} GB left` 
        : `${Math.max(0, storageCapMB - totalStorageMB)} MB left`,
      percent: storagePercent,
      isUnlimited: false,
      status: storagePercent >= 90 ? 'critical' : storagePercent >= 70 ? 'warning' : 'healthy',
      resetSchedule: 'Persistent with auto-retention'
    },
    {
      id: 'ai',
      category: 'ai',
      name: 'Gemini AI Assistant Calls',
      description: 'AI-grounded audit intelligence, anomaly explanations & chat questions',
      used: aiApiCalls,
      limit: `${aiApiCap.toLocaleString()} queries`,
      remaining: `${Math.max(0, aiApiCap - aiApiCalls).toLocaleString()} remaining`,
      percent: aiPercent,
      isUnlimited: false,
      status: aiPercent >= 90 ? 'critical' : aiPercent >= 70 ? 'warning' : 'healthy',
      resetSchedule: `Renews on ${resetInfo.nextResetDate}`
    },
    {
      id: 'team',
      category: 'team',
      name: 'Team Workspace Seats',
      description: 'Active collaboration users with access to shared data files',
      used: `${teamSeatsUsed} seat`,
      limit: plan === 'enterprise' ? 'Unlimited' : `${teamSeatsCap} seats`,
      remaining: plan === 'enterprise' ? 'Unlimited' : `${Math.max(0, teamSeatsCap - teamSeatsUsed)} seats left`,
      percent: plan === 'enterprise' ? 100 : Math.round((teamSeatsUsed / teamSeatsCap) * 100),
      isUnlimited: plan === 'enterprise',
      status: plan === 'enterprise' ? 'unlimited' : 'healthy',
      resetSchedule: 'Active seat licenses'
    },
    {
      id: 'exports',
      category: 'compute',
      name: 'Automated PDF & Excel Exports',
      description: 'Executive summaries, compliance logs & sanitized CSV downloads',
      used: '12 exports',
      limit: plan === 'free' ? '5 / month' : 'Unlimited',
      remaining: plan === 'free' ? '0 remaining' : 'Unlimited',
      percent: plan === 'free' ? 100 : 100,
      isUnlimited: plan !== 'free',
      status: plan !== 'free' ? 'unlimited' : 'warning',
      resetSchedule: `Renews on ${resetInfo.nextResetDate}`
    }
  ], [totalAuditsUsed, maxAudits, auditPercent, totalRowsAudited, rowLimit, rowPercent, totalStorageMB, storageCapMB, storagePercent, aiApiCalls, aiApiCap, aiPercent, teamSeatsUsed, teamSeatsCap, plan, resetInfo]);

  const filteredQuotaItems = useMemo(() => {
    if (quotaFilter === 'all') return quotaItems;
    return quotaItems.filter(item => item.category === quotaFilter);
  }, [quotaItems, quotaFilter]);

  if (isLoading) {
    return (
      <div className={`p-8 rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'} animate-pulse space-y-4`}>
        <div className={`h-6 w-1/3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <div className={`h-32 rounded-2xl ${isDarkMode ? 'bg-slate-800/60' : 'bg-slate-100'}`} />
        <div className={`h-48 rounded-2xl ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-50'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between shadow-md ${
          toastMsg.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 
          toastMsg.type === 'error' ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' :
          'bg-blue-950/40 border-blue-500/40 text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> :
             toastMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" /> :
             <Info className="w-4 h-4 shrink-0 text-blue-400" />}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:opacity-75 cursor-pointer text-slate-400 hover:text-slate-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Section Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-500">
              <CreditCard className="w-4 h-4" />
            </div>
            <h2 className={`text-lg font-extrabold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              Subscription & Usage Quotas
            </h2>
          </div>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Monitor active plan tier, compute and storage consumption, and quota limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchBillingData}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Refresh usage statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Usage</span>
          </button>
          
          {plan === 'free' ? (
            <button
              type="button"
              onClick={() => handleStartCheckout('pro')}
              disabled={actionLoading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Upgrade Plan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenPaddlePortal}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Billing Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Subscription Tier & Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Current Plan Tier Card */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Subscription Tier
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                plan === 'enterprise' ? 'bg-indigo-950/60 text-indigo-400 border-indigo-700/50' :
                plan === 'pro' ? 'bg-blue-950/60 text-blue-400 border-blue-700/50' :
                isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {plan} Plan
              </span>
            </div>

            <h3 className={`text-xl font-extrabold tracking-tight capitalize mb-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {plan === 'pro' ? 'Auditor Pro' : plan === 'enterprise' ? 'Enterprise Unlimited' : 'Free Auditor Tier'}
            </h3>
            <p className="text-lg font-mono font-bold text-blue-500 mb-3">{priceDisplay}</p>
            
            <div className={`text-xs space-y-1.5 mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{plan === 'free' ? '5 CSV Audits per month' : 'Unlimited CSV Audits'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{plan === 'free' ? 'Standard CSV Cleaning' : 'AI Assistant & Gemini Grounding'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>{plan === 'enterprise' ? 'PostgreSQL Developer API' : plan === 'pro' ? 'PDF Executive Reports' : 'Community Support'}</span>
              </div>
            </div>
          </div>

          <div className={`pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Merchant of Record</span>
            <span className={`font-semibold flex items-center gap-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Paddle Billing
            </span>
          </div>
        </div>

        {/* Subscription Status & Renewal Countdown Card */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <Clock className="w-3.5 h-3.5 text-emerald-500" /> Subscription Status
            </span>

            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status === 'active' ? 'bg-emerald-500' :
                status === 'trial' ? 'bg-blue-500' :
                status === 'canceled' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              <span className={`text-base font-extrabold capitalize ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {status === 'trial' ? '14-Day Free Trial' : status === 'active' ? 'Active Subscription' : status}
              </span>
            </div>

            <div className={`p-3 rounded-lg border mb-3 space-y-1.5 ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Billing Cycle:</span>
                <span className={`font-semibold capitalize ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {billing?.billingCycle || 'Monthly'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Next Renewal:</span>
                <span className={`font-semibold font-mono ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {billing?.renewalDate ? new Date(billing.renewalDate).toLocaleDateString() : resetInfo.nextResetDate}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Quota Reset:</span>
                <span className="font-semibold font-mono text-blue-400">{resetInfo.daysRemaining} days left</span>
              </div>
            </div>

            {billing?.trialEndsAt && (
              <div className="text-xs text-blue-400 flex items-center gap-1.5 font-mono mb-2">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Trial Concludes: {new Date(billing.trialEndsAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className={`pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Payment Recovery</span>
            <span className="font-semibold text-emerald-400">Automated Retries</span>
          </div>
        </div>

        {/* Quick Management & Actions Card */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tier Actions
            </span>

            <div className="space-y-2 mt-2">
              {plan === 'free' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleStartCheckout('pro')}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-3.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Upgrade to Pro ($49/mo)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartCheckout('enterprise')}
                    disabled={actionLoading}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Enterprise Tier ($199/mo)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleOpenPaddlePortal}
                    className="w-full py-2.5 px-3.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Paddle Customer Portal</span>
                  </button>

                  {plan === 'pro' && (
                    <button
                      type="button"
                      onClick={() => handleStartCheckout('enterprise')}
                      disabled={actionLoading}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        isDarkMode ? 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/50' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Upgrade to Enterprise</span>
                    </button>
                  )}

                  {status === 'active' && (
                    <button
                      type="button"
                      onClick={handleCancelSubscription}
                      disabled={actionLoading}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition-colors border border-rose-800/40 cursor-pointer text-center"
                    >
                      Cancel Subscription
                    </button>
                  )}

                  {status === 'canceled' && (
                    <button
                      type="button"
                      onClick={handleResumeSubscription}
                      disabled={actionLoading}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/40 transition-colors border border-emerald-800/50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resume Subscription</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <p className={`text-[10px] font-mono mt-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Taxes, VAT and currency conversion calculated automatically.
          </p>
        </div>
      </div>

      {/* 2. Visual Quota Consumption Gauges & Metrics */}
      <div className={`p-5 rounded-xl border ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Usage Metrics & Monthly Consumption
            </h3>
          </div>
          <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Billing Period: <strong>{usage?.periodMonth || resetInfo.currentMonth}</strong>
          </span>
        </div>

        {/* 4 Core Gauge Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Audits Gauge */}
          <div className={`p-4 rounded-lg border ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                CSV Audits Run
              </span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            </div>
            
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-xl font-extrabold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {totalAuditsUsed}
              </span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                / {maxAudits === 'unlimited' ? 'Unlimited' : `${maxAudits} max`}
              </span>
            </div>

            <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div 
                className={`h-full transition-all duration-500 ${
                  maxAudits === 'unlimited' ? 'bg-blue-600' :
                  auditPercent >= 90 ? 'bg-rose-600' :
                  auditPercent >= 70 ? 'bg-amber-600' : 'bg-blue-600'
                }`}
                style={{ width: `${maxAudits === 'unlimited' ? 100 : auditPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] mt-2">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                {maxAudits === 'unlimited' ? 'Unlimited allowance' : `${auditPercent}% used`}
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                {maxAudits === 'unlimited' ? 'Active' : `${Math.max(0, 5 - totalAuditsUsed)} left`}
              </span>
            </div>
          </div>

          {/* Rows Gauge */}
          <div className={`p-4 rounded-lg border ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Rows Ingested
              </span>
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-xl font-extrabold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {totalRowsAudited.toLocaleString()}
              </span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                / {plan === 'enterprise' ? 'Unlimited' : `${(rowLimit / 1000).toFixed(0)}k`}
              </span>
            </div>

            <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div 
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${plan === 'enterprise' ? 100 : rowPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] mt-2">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                {plan === 'enterprise' ? 'Enterprise capacity' : `${rowPercent}% of monthly limit`}
              </span>
              <span className="font-mono text-emerald-400 font-semibold">Compliant</span>
            </div>
          </div>

          {/* Storage Gauge */}
          <div className={`p-4 rounded-lg border ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Storage Consumed
              </span>
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-xl font-extrabold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {totalStorageMB} MB
              </span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                / {storageCapMB >= 1024 ? `${(storageCapMB / 1024).toFixed(0)} GB` : `${storageCapMB} MB`}
              </span>
            </div>

            <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div 
                className={`h-full transition-all duration-500 ${
                  storagePercent >= 90 ? 'bg-rose-600' :
                  storagePercent >= 70 ? 'bg-amber-600' : 'bg-indigo-600'
                }`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] mt-2">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                {storagePercent}% capacity
              </span>
              <span className="font-mono text-indigo-400 font-semibold">Postgres + Cloud</span>
            </div>
          </div>

          {/* AI Calls Gauge */}
          <div className={`p-4 rounded-lg border ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                AI Assistant API
              </span>
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
            </div>
            
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-xl font-extrabold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {aiApiCalls}
              </span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                / {aiApiCap.toLocaleString()}
              </span>
            </div>

            <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div 
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${aiPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] mt-2">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                Gemini 2.5 Flash
              </span>
              <span className="font-mono text-blue-400 font-semibold">Active</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Detailed Quota Consumption Breakdown Table */}
      <div className={`p-5 rounded-xl border ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <Gauge className="w-4 h-4 text-blue-500" /> Detailed Quota Consumption Breakdown
            </h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Resource allocation limits, consumed allowances, and next monthly rollover dates.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
            {(['all', 'compute', 'storage', 'ai', 'team'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setQuotaFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] capitalize transition-colors cursor-pointer ${
                  quotaFilter === cat 
                    ? 'bg-blue-600 text-white shadow-sm font-bold' 
                    : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quota Table */}
        <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <th className="py-3 px-4">Resource & Scope</th>
                <th className="py-3 px-4">Current Usage</th>
                <th className="py-3 px-4">Plan Limit</th>
                <th className="py-3 px-4">Remaining Quota</th>
                <th className="py-3 px-4">Consumption Gauge</th>
                <th className="py-3 px-4 text-right">Health Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {filteredQuotaItems.map((item) => (
                <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-800/30 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
                  <td className="py-3 px-4">
                    <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                      {item.name}
                    </div>
                    <div className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </td>
                  <td className={`py-3 px-4 font-mono font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {item.used}
                  </td>
                  <td className={`py-3 px-4 font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {item.limit}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                    {item.remaining}
                  </td>
                  <td className="py-3 px-4 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div 
                          className={`h-full ${
                            item.isUnlimited ? 'bg-blue-600' :
                            item.percent >= 90 ? 'bg-rose-600' :
                            item.percent >= 70 ? 'bg-amber-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.isUnlimited ? 'Unlimited' : `${item.percent}%`}
                      </span>
                    </div>
                    <span className={`text-[9px] block mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {item.resetSchedule}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.status === 'unlimited' ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40' :
                      item.status === 'healthy' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' :
                      item.status === 'warning' ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' :
                      'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                    }`}>
                      {item.status === 'unlimited' ? <Check className="w-3 h-3" /> :
                       item.status === 'healthy' ? <CheckCircle2 className="w-3 h-3" /> :
                       item.status === 'warning' ? <AlertTriangle className="w-3 h-3" /> :
                       <AlertCircle className="w-3 h-3" />}
                      <span>{item.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Active Files Storage Breakdown */}
      {files.length > 0 && (
        <div className={`p-5 rounded-xl border ${
          isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <Database className="w-4 h-4 text-indigo-400" /> Ingested Datasets Storage Distribution
            </h3>
            <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {files.length} active files in workspace
            </span>
          </div>

          <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  <th className="py-2.5 px-3">Dataset Name</th>
                  <th className="py-2.5 px-3">Row Count</th>
                  <th className="py-2.5 px-3">File Size</th>
                  <th className="py-2.5 px-3">Audit Score</th>
                  <th className="py-2.5 px-3 text-right">Quota Footprint</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {files.map(file => {
                  const fileSizeKB = Math.round((file.size || 24000) / 1024);
                  return (
                    <tr key={file.id} className={isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                      <td className={`py-2.5 px-3 font-semibold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate max-w-[220px]">{file.name}</span>
                      </td>
                      <td className={`py-2.5 px-3 font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {file.rows?.length?.toLocaleString() || 0} rows
                      </td>
                      <td className={`py-2.5 px-3 font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {fileSizeKB} KB
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          (file.score || 90) >= 80 ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40' : 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
                        }`}>
                          {file.score || 95}/100
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                        {((fileSizeKB / (totalStorageMB * 1024)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Invoices & Billing History Table */}
      <div className={`p-5 rounded-xl border ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <FileText className="w-4 h-4 text-emerald-500" /> Invoices & Payment History
          </h3>
          <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Paddle Merchant Receipts
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className={`p-6 text-center text-xs font-mono rounded-lg border ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            No formal paid invoices generated yet for Free account.
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3 text-right">Download PDF</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className={`py-3 px-3 font-mono font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                      {inv.paddleInvoiceId}
                    </td>
                    <td className={`py-3 px-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className={`py-3 px-3 font-mono font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      ${(inv.amount / 100).toFixed(2)} USD
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.status === 'paid' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/60 text-rose-400'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className={`py-3 px-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {inv.paymentMethod || 'Visa ending 4242'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={inv.invoicePdfUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-blue-400'
                            : 'bg-slate-100 hover:bg-slate-200 text-blue-600 border border-slate-200'
                        }`}
                      >
                        <Download className="w-3 h-3" /> PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Background Trial Expiration Check Utility */}
      <div className={`p-4 rounded-xl border ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Trial Expiration Check Utility
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Simulate background checks for trial expiry thresholds (7, 3, or 1 day(s))
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => {
              setTestTrialDaysRemaining(currentUserEmail, 7);
              window.location.reload();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-950/50 text-blue-300 hover:bg-blue-900/60 border border-blue-800/40 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Test 7 Days Left</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTestTrialDaysRemaining(currentUserEmail, 3);
              window.location.reload();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-950/50 text-amber-300 hover:bg-amber-900/60 border border-amber-800/40 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Test 3 Days Left</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTestTrialDaysRemaining(currentUserEmail, 1);
              window.location.reload();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/50 text-rose-300 hover:bg-rose-900/60 border border-rose-800/40 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Test 1 Day Left</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearTestTrial(currentUserEmail);
              window.location.reload();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer ml-auto"
          >
            Reset Trial State
          </button>
        </div>
      </div>

      {/* Simulated Paddle Checkout Overlay Modal (for preview environment) */}
      <AnimatePresence>
        {showSimulatedPaddleCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-slate-900 border border-blue-500/50 shadow-2xl text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="font-extrabold text-sm tracking-tight">Paddle Merchant Checkout</span>
                </div>
                <button onClick={() => setShowSimulatedPaddleCheckout(false)} className="text-slate-400 hover:text-slate-100 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Product:</span>
                  <span className="font-bold text-slate-100">CSV Auditor Pro {simulatedPlan.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Due Today:</span>
                  <span className="font-bold text-emerald-400">{simulatedPlan === 'enterprise' ? '$199.00 USD' : '$0.00 (14-Day Trial then $49.00)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Supported Methods:</span>
                  <span className="text-slate-300">Visa, Mastercard, Apple Pay, PayPal</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Paddle operates as the Merchant of Record for this order. Applicable sales tax, GST, and VAT are assessed according to local regulations.
              </p>

              <button
                type="button"
                onClick={handleSimulatePaymentSuccess}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Complete Paddle Payment</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
