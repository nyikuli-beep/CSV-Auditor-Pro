import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Sparkles,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { UserBillingInfo, BillingInvoice, BillingTransaction, UsageMetrics, PlanEntitlements } from '../types.ts';
import { openPaddleCheckout } from '../lib/paddle.ts';
import { setTestTrialDaysRemaining, clearTestTrial } from '../utils/trialChecker.ts';

interface BillingDashboardProps {
  isDarkMode?: boolean;
  currentUserEmail?: string;
  onOpenUpgradeModal?: () => void;
  onOpenEnterpriseModal?: () => void;
}

export default function BillingDashboard({
  isDarkMode = true,
  currentUserEmail = 'nyikulibramwel@gmail.com',
  onOpenUpgradeModal,
  onOpenEnterpriseModal
}: BillingDashboardProps) {
  const [billing, setBilling] = useState<UserBillingInfo | null>(null);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        setEntitlements(data.entitlements);
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
          setToastMsg({ type: 'success', text: `Paddle Payment Completed! Activated ${plan.toUpperCase()} plan.` });
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
      setToastMsg({ type: 'error', text: 'Payment simulation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the current period ends.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserEmail, email: currentUserEmail })
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg({ type: 'success', text: 'Subscription marked for cancellation.' });
        await fetchBillingData();
      }
    } catch (e) {
      setToastMsg({ type: 'error', text: 'Failed to cancel subscription' });
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
        setToastMsg({ type: 'success', text: 'Subscription resumed successfully!' });
        await fetchBillingData();
      }
    } catch (e) {
      setToastMsg({ type: 'error', text: 'Failed to resume subscription' });
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

  if (isLoading) {
    return (
      <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse space-y-4">
        <div className="h-6 w-1/3 bg-slate-800 rounded-lg" />
        <div className="h-32 bg-slate-800/60 rounded-2xl" />
        <div className="h-48 bg-slate-800/40 rounded-2xl" />
      </div>
    );
  }

  const plan = billing?.plan || 'free';
  const status = billing?.subscriptionStatus || 'active';
  const priceDisplay = plan === 'enterprise' ? '$199 / month' : plan === 'pro' ? '$49 / month' : '$0 / forever';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg ${
          toastMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* 1. Current Plan Card */}
        <div className={`p-6 rounded-2xl border relative flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Current Plan
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                plan === 'enterprise' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                plan === 'pro' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {plan} Plan
              </span>
            </div>

            <h3 className={`text-2xl font-extrabold tracking-tight capitalize mb-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {plan === 'pro' ? 'Pro Monthly' : plan === 'enterprise' ? 'Enterprise Unlimited' : 'Free Auditor'}
            </h3>
            <p className="text-xl font-mono font-bold text-blue-500 mb-4">{priceDisplay}</p>
          </div>

          <div className={`pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Merchant of Record:</span>
            <span className={`font-bold flex items-center gap-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Paddle Billing
            </span>
          </div>
        </div>

        {/* 2. Subscription Status & Renewal */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <Clock className="w-3.5 h-3.5 text-emerald-500" /> Subscription Status
            </span>

            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status === 'active' ? 'bg-emerald-500 animate-pulse' :
                status === 'trial' ? 'bg-blue-500 animate-pulse' :
                status === 'canceled' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              <span className={`text-base font-extrabold capitalize ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {status === 'trial' ? '14-Day Free Trial' : status}
              </span>
            </div>

            {billing?.renewalDate && (
              <p className={`text-xs flex items-center gap-1.5 mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Next Billing Date: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-900'}>{new Date(billing.renewalDate).toLocaleDateString()}</strong></span>
              </p>
            )}

            {billing?.trialEndsAt && (
              <p className="text-xs text-blue-500 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>Trial Expires: {new Date(billing.trialEndsAt).toLocaleDateString()}</span>
              </p>
            )}
          </div>

          <div className={`pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Payment Retry:</span>
            <span className="font-bold text-emerald-500">Automated Dunning</span>
          </div>
        </div>

        {/* 3. Quick Actions & Customer Portal */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Management
            </span>

            <div className="space-y-2">
              {plan === 'free' ? (
                <button
                  onClick={() => handleStartCheckout('pro')}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" /> Upgrade to Pro ($49/mo)
                </button>
              ) : (
                <button
                  onClick={handleOpenPaddlePortal}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-100 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" /> Paddle Customer Portal
                </button>
              )}

              {status === 'active' && plan !== 'free' && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading}
                  className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 transition-colors border border-rose-500/20 cursor-pointer"
                >
                  Cancel Subscription
                </button>
              )}

              {status === 'canceled' && (
                <button
                  onClick={handleResumeSubscription}
                  disabled={actionLoading}
                  className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 cursor-pointer"
                >
                  Resume Subscription
                </button>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-mono mt-3">
            VAT, Sales Tax & Invoices handled natively by Paddle.
          </p>
        </div>
      </div>

      {/* Usage Tracking Section */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center justify-between ${
          isDarkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Monthly Plan Usage Tracking
          </span>
          <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Period: {usage?.periodMonth || 'Current Month'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Audits */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[10px] font-bold uppercase block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>CSV Audits Run</span>
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-lg font-extrabold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{usage?.auditCount || 0}</span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>/ {usage?.maxAudits === 'unlimited' ? '∞ Unlimited' : '5 limit'}</span>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div 
                className={`h-full ${usage?.maxAudits === 'unlimited' ? 'bg-blue-500' : (usage?.auditCount || 0) >= 5 ? 'bg-rose-500' : 'bg-blue-500'}`}
                style={{ width: `${usage?.maxAudits === 'unlimited' ? 100 : Math.min(((usage?.auditCount || 0) / 5) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Rows */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[10px] font-bold uppercase block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Rows Processed</span>
            <span className={`text-lg font-extrabold block mb-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {(usage?.rowsProcessed || 8320).toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Fully Audited
            </span>
          </div>

          {/* Storage */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[10px] font-bold uppercase block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Storage Used</span>
            <span className={`text-lg font-extrabold block mb-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {Math.round((usage?.storageUsedBytes || 125829120) / (1024 * 1024))} MB
            </span>
            <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Auto retention active</span>
          </div>

          {/* API Calls */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[10px] font-bold uppercase block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>AI Assistant API Calls</span>
            <span className={`text-lg font-extrabold block mb-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {usage?.apiCallsCount || 42}
            </span>
            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">Gemini Grounded</span>
          </div>
        </div>
      </div>

      {/* Background Trial Expiration Check Tester */}
      <div className={`p-5 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Trial Expiration Background Check Utility
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate background login checks for trial expiry thresholds (7, 3, or 1 day(s))
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
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
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
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
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
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
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

      {/* Invoices & Billing History Table */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <FileText className="w-4 h-4 text-emerald-500" /> Invoices & Payment History
          </h3>
          <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>VAT & GST Receipts</span>
        </div>

        {invoices.length === 0 ? (
          <div className={`p-6 text-center text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            No invoices generated yet for Free account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                  isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}>
                  <th className="py-2.5 px-3">Invoice ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/40' : 'divide-slate-200'}`}>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={isDarkMode ? 'hover:bg-slate-800/20' : 'hover:bg-slate-50 transition-colors'}>
                    <td className={`py-3 px-3 font-mono font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{inv.paddleInvoiceId}</td>
                    <td className={`py-3 px-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className={`py-3 px-3 font-mono font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>${(inv.amount / 100).toFixed(2)} USD</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className={`py-3 px-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{inv.paymentMethod || 'Visa ending 4242'}</td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={inv.invoicePdfUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
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

      {/* Simulated Paddle Checkout Overlay Modal (for preview environment) */}
      <AnimatePresence>
        {showSimulatedPaddleCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-blue-500/50 shadow-2xl text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="font-extrabold text-sm tracking-tight">Paddle Merchant Checkout</span>
                </div>
                <button onClick={() => setShowSimulatedPaddleCheckout(false)} className="text-slate-400 hover:text-slate-100">
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
                Paddle acts as the Merchant of Record for this transaction. Applicable VAT, GST, and Local Tax are calculated automatically.
              </p>

              <button
                onClick={handleSimulatePaymentSuccess}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow cursor-pointer transition-all flex items-center justify-center gap-2"
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
