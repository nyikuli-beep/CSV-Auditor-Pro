import { UserBillingInfo, BillingInvoice, BillingTransaction, UsageMetrics, PlanEntitlements } from '../types.ts';
import { dispatchGmailEmail } from './gmailService.ts';

// Local fallbacks & active cache
export const userSubscriptionsStore = new Map<string, UserBillingInfo>();
export const userInvoicesStore = new Map<string, BillingInvoice[]>();
export const userTransactionsStore = new Map<string, BillingTransaction[]>();
export const userUsageStore = new Map<string, UsageMetrics>();
export const webhookLogsStore: any[] = [];

// Initialize default billing state for a user
export function getOrCreateUserBilling(userId: string, email?: string): UserBillingInfo {
  const isOwner = (email || userId || '').toLowerCase().trim() === 'nyikulibramwel@gmail.com';
  let billing = userSubscriptionsStore.get(userId);
  if (!billing || isOwner) {
    billing = {
      plan: isOwner ? 'enterprise' : 'free',
      subscriptionStatus: 'active',
      subscriptionId: isOwner ? 'sub_paddle_owner_enterprise_01' : null,
      customerId: isOwner ? 'ctm_paddle_owner_01' : null,
      billingCycle: 'monthly',
      renewalDate: isOwner ? new Date(Date.now() + 365 * 86400000).toISOString() : null,
      trialEndsAt: null
    };
    userSubscriptionsStore.set(userId, billing);
  }
  return billing;
}

// Get plan entitlements
export function getEntitlements(plan: 'free' | 'pro' | 'enterprise', status: string): PlanEntitlements {
  const isExpiredOrCanceled = status === 'expired' || (status === 'canceled' && false);
  const effectivePlan = isExpiredOrCanceled ? 'free' : plan;

  if (effectivePlan === 'enterprise') {
    return {
      allowAiInsights: true,
      allowAiAssistant: true,
      allowUnlimitedRows: true,
      allowAdvancedCleaning: true,
      allowCustomBranding: true,
      allowPdfReports: true,
      allowTeamCollab: true,
      allowDeveloperApi: true,
    };
  }

  if (effectivePlan === 'pro') {
    return {
      allowAiInsights: true,
      allowAiAssistant: true,
      allowUnlimitedRows: true,
      allowAdvancedCleaning: true,
      allowCustomBranding: true,
      allowPdfReports: true,
      allowTeamCollab: false,
      allowDeveloperApi: false,
    };
  }

  // Free Plan
  return {
    allowAiInsights: false,
    allowAiAssistant: false,
    allowUnlimitedRows: false,
    allowAdvancedCleaning: false,
    allowCustomBranding: false,
    allowPdfReports: false,
    allowTeamCollab: false,
    allowDeveloperApi: false,
  };
}

// Initialize usage for current month
export function getUserUsage(userId: string, plan: string): UsageMetrics {
  const currentMonth = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
  let usage = userUsageStore.get(userId);
  
  if (!usage || usage.periodMonth !== currentMonth) {
    usage = {
      auditCount: 0,
      maxAudits: plan === 'free' ? 5 : 'unlimited',
      rowsProcessed: 0,
      storageUsedBytes: 0,
      apiCallsCount: 0,
      periodMonth: currentMonth
    };
    userUsageStore.set(userId, usage);
  }

  // Update maxAudits if plan changed
  usage.maxAudits = plan === 'free' ? 5 : 'unlimited';
  return usage;
}

export function incrementUserUsage(
  userId: string, 
  plan: string, 
  auditAdd = 0, 
  rowsAdd = 0, 
  bytesAdd = 0, 
  apiCallsAdd = 0
): UsageMetrics {
  const usage = getUserUsage(userId, plan);
  usage.auditCount += auditAdd;
  usage.rowsProcessed += rowsAdd;
  usage.storageUsedBytes += bytesAdd;
  usage.apiCallsCount += apiCallsAdd;
  userUsageStore.set(userId, usage);
  return usage;
}

// Seed sample invoices and transactions for active accounts
export function getSampleInvoices(userId: string, plan: string): BillingInvoice[] {
  let list = userInvoicesStore.get(userId);
  if (!list || list.length === 0) {
    if (plan === 'free') {
      list = [];
    } else {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 86400000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 86400000);

      list = [
        {
          id: `inv-${Date.now()}-1`,
          paddleInvoiceId: `inv_paddle_${Math.random().toString(36).substring(2, 9)}`,
          amount: plan === 'enterprise' ? 19900 : 4900,
          currency: 'USD',
          status: 'paid',
          invoicePdfUrl: `https://paddle.com/invoices/inv_paddle_sample_${userId}.pdf`,
          paymentMethod: 'Visa ending in 4242',
          createdAt: lastMonth.toISOString()
        },
        {
          id: `inv-${Date.now()}-2`,
          paddleInvoiceId: `inv_paddle_${Math.random().toString(36).substring(2, 9)}`,
          amount: plan === 'enterprise' ? 19900 : 4900,
          currency: 'USD',
          status: 'paid',
          invoicePdfUrl: `https://paddle.com/invoices/inv_paddle_sample_${userId}_prev.pdf`,
          paymentMethod: 'Visa ending in 4242',
          createdAt: twoMonthsAgo.toISOString()
        }
      ];
    }
    userInvoicesStore.set(userId, list);
  }
  return list;
}

export function getSampleTransactions(userId: string, plan: string): BillingTransaction[] {
  let txs = userTransactionsStore.get(userId);
  if (!txs || txs.length === 0) {
    if (plan === 'free') {
      txs = [];
    } else {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 86400000);
      txs = [
        {
          id: `tx-1`,
          paddleTransactionId: `txn_01h80x_${Math.random().toString(36).substring(2, 8)}`,
          amount: plan === 'enterprise' ? 19900 : 4900,
          currency: 'USD',
          status: 'completed',
          paymentMethod: 'Visa ****4242',
          description: `Paddle Billing - ${plan.toUpperCase()} Monthly Subscription`,
          createdAt: lastMonth.toISOString()
        }
      ];
    }
    userTransactionsStore.set(userId, txs);
  }
  return txs;
}

// Send Email Notifications on Billing Lifecycle Events
export async function sendBillingLifecycleNotification(
  type: 
    | 'subscription_created' 
    | 'trial_started' 
    | 'trial_ending' 
    | 'payment_succeeded' 
    | 'payment_failed' 
    | 'renewal_reminder' 
    | 'subscription_canceled' 
    | 'invoice_available' 
    | 'payment_refunded',
  toEmail: string,
  data: {
    planName?: string;
    amountFormatted?: string;
    renewalDate?: string;
    trialEndDate?: string;
    invoiceId?: string;
    invoicePdfUrl?: string;
  }
) {
  let subject = 'CSV Auditor Pro Billing Update';
  let body = '';

  const plan = data.planName || 'Pro';

  switch (type) {
    case 'subscription_created':
      subject = `[CSV Auditor Pro] Welcome to your ${plan} Plan!`;
      body = `Hello,\n\nYour subscription to CSV Auditor Pro (${plan} Plan) is now active! You now have full access to unlimited CSV audits, AI Insights, conversational AI assistant, custom branding, and compliance reporting.\n\nThank you for choosing CSV Auditor Pro.\n\nBest regards,\nCSV Auditor Pro Team`;
      break;

    case 'trial_started':
      subject = `[CSV Auditor Pro] Your 14-Day Free Trial has Started!`;
      body = `Hello,\n\nWelcome to your 14-day free trial of CSV Auditor Pro Pro Plan! Enjoy full access to all AI features and compliance tools.\nYour trial ends on: ${data.trialEndDate || 'in 14 days'}.\n\nBest regards,\nCSV Auditor Pro Team`;
      break;

    case 'trial_ending':
      subject = `[CSV Auditor Pro] Reminder: Your Free Trial is Ending Soon`;
      body = `Hello,\n\nYour CSV Auditor Pro 14-day free trial will expire on ${data.trialEndDate}.\nTo maintain uninterrupted access to unlimited audits and AI analysis, please verify your Paddle billing details.\n\nBest regards,\nCSV Auditor Pro Team`;
      break;

    case 'payment_succeeded':
      subject = `[CSV Auditor Pro] Receipt for your payment (${data.amountFormatted || '$49.00'})`;
      body = `Hello,\n\nYour payment of ${data.amountFormatted || '$49.00'} for CSV Auditor Pro (${plan} Plan) was processed successfully.\nInvoice Ref: ${data.invoiceId || 'N/A'}.\n\nThank you for your business!`;
      break;

    case 'payment_failed':
      subject = `[CSV Auditor Pro] Action Required: Payment Failed for your ${plan} Plan`;
      body = `Hello,\n\nWe were unable to process your payment for your CSV Auditor Pro subscription. Please update your payment method in Settings -> Billing to ensure continuous access.`;
      break;

    case 'renewal_reminder':
      subject = `[CSV Auditor Pro] Upcoming Subscription Renewal Reminder`;
      body = `Hello,\n\nThis is a friendly reminder that your ${plan} Plan subscription will renew on ${data.renewalDate || 'soon'} for ${data.amountFormatted || '$49.00'}.`;
      break;

    case 'subscription_canceled':
      subject = `[CSV Auditor Pro] Subscription Cancellation Confirmation`;
      body = `Hello,\n\nYour subscription to CSV Auditor Pro (${plan} Plan) has been cancelled as requested. You will continue to have access until the end of your current billing period (${data.renewalDate || 'end of cycle'}).`;
      break;

    case 'invoice_available':
      subject = `[CSV Auditor Pro] New Invoice Available`;
      body = `Hello,\n\nYour latest invoice (${data.invoiceId || 'Invoice'}) is now available in your Billing Dashboard.`;
      break;

    case 'payment_refunded':
      subject = `[CSV Auditor Pro] Payment Refund Processed`;
      body = `Hello,\n\nA refund of ${data.amountFormatted || '$49.00'} has been issued to your original payment method.`;
      break;
  }

  try {
    await dispatchGmailEmail({
      to: toEmail,
      subject,
      body,
      fallbackToGateway: true
    });
  } catch (e) {
    console.warn(`[Billing Notification] Failed to send email (${type}) to ${toEmail}:`, e);
  }
}
