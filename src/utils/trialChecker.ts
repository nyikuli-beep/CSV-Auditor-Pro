import { getOrCreateUserBilling } from '../lib/billingService';

export interface TrialAlert {
  daysRemaining: number;
  level: 'urgent' | 'warning' | 'info';
  title: string;
  message: string;
  trialEndDate: string;
  userEmail: string;
  plan: string;
}

/**
 * Background Check Utility: Runs upon user login to verify if a trial is within 7, 3, or 1 day(s) of expiry.
 * 
 * Thresholds:
 * - 1 Day Left: Urgent notification
 * - 3 Days Left: Warning notification
 * - 7 Days Left: Info notification
 */
export async function runTrialExpirationCheck(userEmail: string): Promise<TrialAlert | null> {
  if (!userEmail) return null;

  try {
    // 1. Fetch subscription status from API or local billing store
    let billingData: any = null;
    try {
      const res = await fetch(`/api/billing/subscription?userId=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.billing) {
          billingData = json.billing;
        }
      }
    } catch (e) {
      console.warn('[TrialCheck] Server API fetch fallback to local store:', e);
    }

    if (!billingData) {
      billingData = getOrCreateUserBilling(userEmail, userEmail);
    }

    // If user has a simulated or active trial set in localStorage for test override
    const testTrialEndsAt = localStorage.getItem(`test_trial_ends_at_${userEmail}`);
    if (testTrialEndsAt) {
      billingData.trialEndsAt = testTrialEndsAt;
      billingData.subscriptionStatus = 'trial';
    }

    // 2. Validate if user is in trial mode
    const isTrial = billingData.plan === 'pro_trial' || billingData.subscriptionStatus === 'trial' || (billingData.plan === 'pro' && billingData.trialEndsAt);
    if (!isTrial || !billingData.trialEndsAt) {
      return null; // Not in trial or no trial end date specified
    }

    // 3. Compute remaining days
    const trialEndTime = new Date(billingData.trialEndsAt).getTime();
    const now = Date.now();
    const msDiff = trialEndTime - now;

    // Convert milliseconds to remaining days (rounded up to handle partial days accurately)
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    // Expiry already passed or non-expiring
    if (daysRemaining <= 0 || daysRemaining > 7) {
      return null;
    }

    // Formatted date
    const endDateFormatted = new Date(billingData.trialEndsAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // 4. Categorize by exact threshold range: 1 Day, 3 Days, or 7 Days
    let level: 'urgent' | 'warning' | 'info' = 'info';
    let title = '';
    let message = '';
    let thresholdTag = '';

    if (daysRemaining <= 1) {
      level = 'urgent';
      thresholdTag = '1_day';
      title = 'Trial Ending Tomorrow!';
      message = `Your 14-day Pro trial expires in ${daysRemaining === 1 ? '1 day' : 'less than 24 hours'} (${endDateFormatted}). Upgrade today to retain unlimited CSV audits and AI Insights.`;
    } else if (daysRemaining <= 3) {
      level = 'warning';
      thresholdTag = '3_days';
      title = 'Trial Expiry Notice (3 Days Remaining)';
      message = `Your Pro trial ends in ${daysRemaining} days on ${endDateFormatted}. Upgrade now to keep advanced compliance tools and automated cleaning active.`;
    } else { // 4 to 7 days
      level = 'info';
      thresholdTag = '7_days';
      title = 'Trial Expiry Reminder (7 Days Remaining)';
      message = `You have ${daysRemaining} days left in your 14-day Pro trial. Explore team collaboration, Gmail audit sync, and custom PDF reporting.`;
    }

    // 5. Check if user already dismissed this specific threshold in this session
    const dismissedKey = `trial_banner_dismissed_${userEmail}_${thresholdTag}`;
    if (sessionStorage.getItem(dismissedKey) === 'true') {
      return null; // Respect non-intrusiveness: user closed this threshold banner during this session
    }

    return {
      daysRemaining,
      level,
      title,
      message,
      trialEndDate: endDateFormatted,
      userEmail,
      plan: billingData.plan || 'pro'
    };

  } catch (err) {
    console.error('[TrialCheck Utility Error]:', err);
    return null;
  }
}

/**
 * Dismiss a trial notification for current session
 */
export function dismissTrialAlert(userEmail: string, daysRemaining: number) {
  let thresholdTag = '7_days';
  if (daysRemaining <= 1) thresholdTag = '1_day';
  else if (daysRemaining <= 3) thresholdTag = '3_days';

  const dismissedKey = `trial_banner_dismissed_${userEmail}_${thresholdTag}`;
  sessionStorage.setItem(dismissedKey, 'true');
}

/**
 * Helper utility to set a trial state for quick testing and verification
 */
export function setTestTrialDaysRemaining(userEmail: string, days: number) {
  const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(`test_trial_ends_at_${userEmail}`, targetDate);
  // Clear dismissal memory so test alert shows immediately
  sessionStorage.removeItem(`trial_banner_dismissed_${userEmail}_1_day`);
  sessionStorage.removeItem(`trial_banner_dismissed_${userEmail}_3_days`);
  sessionStorage.removeItem(`trial_banner_dismissed_${userEmail}_7_days`);
}

/**
 * Clear test trial override
 */
export function clearTestTrial(userEmail: string) {
  localStorage.removeItem(`test_trial_ends_at_${userEmail}`);
}
