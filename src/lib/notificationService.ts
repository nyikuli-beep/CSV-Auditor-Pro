import { db } from '../firebase/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { 
  AppNotification, 
  NotificationCategory, 
  NotificationPriority, 
  NotificationType,
  OrganizationInvitation,
  UserBillingInfo,
  UsageMetrics,
  CSVFile,
  SlotRequest
} from '../types';
import { DEFAULT_ORG_ID, getPersistedInvitations } from './teamTenancyService';

const READ_STORAGE_KEY_PREFIX = 'csv_auditor_read_notifs_';
const DISMISSED_STORAGE_KEY_PREFIX = 'csv_auditor_dismissed_notifs_';
const CUSTOM_NOTIFS_KEY_PREFIX = 'csv_auditor_custom_notifs_';

/**
 * Retrieves list of read notification IDs for a given user.
 */
export function getReadNotificationIds(userEmail: string): Set<string> {
  if (!userEmail) return new Set();
  try {
    const raw = localStorage.getItem(`${READ_STORAGE_KEY_PREFIX}${userEmail.toLowerCase().trim()}`);
    if (raw) {
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    }
  } catch (e) {
    console.warn('Failed to load read notification IDs:', e);
  }
  return new Set();
}

/**
 * Retrieves list of dismissed notification IDs for a given user.
 */
export function getDismissedNotificationIds(userEmail: string): Set<string> {
  if (!userEmail) return new Set();
  try {
    const raw = localStorage.getItem(`${DISMISSED_STORAGE_KEY_PREFIX}${userEmail.toLowerCase().trim()}`);
    if (raw) {
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    }
  } catch (e) {
    console.warn('Failed to load dismissed notification IDs:', e);
  }
  return new Set();
}

/**
 * Marks a notification as read in persistent storage.
 */
export function markNotificationAsRead(userEmail: string, notifId: string): void {
  if (!userEmail || !notifId) return;
  const current = getReadNotificationIds(userEmail);
  current.add(notifId);
  try {
    localStorage.setItem(
      `${READ_STORAGE_KEY_PREFIX}${userEmail.toLowerCase().trim()}`,
      JSON.stringify(Array.from(current))
    );
  } catch (e) {
    console.warn('Failed to save read notification:', e);
  }
}

/**
 * Marks all active notifications as read in persistent storage.
 */
export function markAllNotificationsAsRead(userEmail: string, notifIds: string[]): void {
  if (!userEmail || notifIds.length === 0) return;
  const current = getReadNotificationIds(userEmail);
  notifIds.forEach(id => current.add(id));
  try {
    localStorage.setItem(
      `${READ_STORAGE_KEY_PREFIX}${userEmail.toLowerCase().trim()}`,
      JSON.stringify(Array.from(current))
    );
  } catch (e) {
    console.warn('Failed to save all read notifications:', e);
  }
}

/**
 * Dismisses a notification permanently from the active list.
 */
export function dismissNotification(userEmail: string, notifId: string): void {
  if (!userEmail || !notifId) return;
  const current = getDismissedNotificationIds(userEmail);
  current.add(notifId);
  try {
    localStorage.setItem(
      `${DISMISSED_STORAGE_KEY_PREFIX}${userEmail.toLowerCase().trim()}`,
      JSON.stringify(Array.from(current))
    );
  } catch (e) {
    console.warn('Failed to save dismissed notification:', e);
  }
}

/**
 * Clears all notifications for the user by adding current IDs to dismissed set.
 */
export function clearAllNotifications(userEmail: string, notifIds: string[]): void {
  if (!userEmail || notifIds.length === 0) return;
  const current = getDismissedNotificationIds(userEmail);
  notifIds.forEach(id => current.add(id));
  try {
    localStorage.setItem(
      `${DISMISSED_STORAGE_KEY_PREFIX}${userEmail.toLowerCase().trim()}`,
      JSON.stringify(Array.from(current))
    );
  } catch (e) {
    console.warn('Failed to clear notifications:', e);
  }
}

/**
 * Dispatches a custom in-app notification to be persisted and surfaced.
 */
export function dispatchInAppNotification(userEmail: string, notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
  const newNotif: AppNotification = {
    ...notif,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    read: false
  };

  if (userEmail) {
    try {
      const key = `${CUSTOM_NOTIFS_KEY_PREFIX}${userEmail.toLowerCase().trim()}`;
      const raw = localStorage.getItem(key);
      const existing: AppNotification[] = raw ? JSON.parse(raw) : [];
      const updated = [newNotif, ...existing.slice(0, 49)]; // Cap to 50
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist custom notification:', e);
    }
  }

  return newNotif;
}

/**
 * Retrieves custom in-app notifications stored locally for the user.
 */
export function getCustomInAppNotifications(userEmail: string): AppNotification[] {
  if (!userEmail) return [];
  try {
    const key = `${CUSTOM_NOTIFS_KEY_PREFIX}${userEmail.toLowerCase().trim()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load custom notifications:', e);
  }
  return [];
}

interface ComputeNotificationsParams {
  userEmail: string;
  userRole?: string;
  userName?: string;
  invitations: OrganizationInvitation[];
  billing?: UserBillingInfo | null;
  usageMetrics?: UsageMetrics | null;
  files?: CSVFile[];
  slotRequests?: SlotRequest[];
  orgName?: string;
  isOwner?: boolean;
}

/**
 * Computes the unified dynamic list of notifications for the current user,
 * checking team invites, subscription depletion, quota warnings, security alerts, and system status.
 */
export function computeUserNotifications(params: ComputeNotificationsParams): AppNotification[] {
  const {
    userEmail,
    userRole = 'Member',
    userName,
    invitations = [],
    billing,
    usageMetrics,
    files = [],
    slotRequests = [],
    orgName = 'Enterprise Data Workspace',
    isOwner = false
  } = params;

  if (!userEmail) return [];

  const readIds = getReadNotificationIds(userEmail);
  const dismissedIds = getDismissedNotificationIds(userEmail);
  const normalizedEmail = userEmail.toLowerCase().trim();
  const notifs: AppNotification[] = [];

  // =========================================================================
  // 1. TEAM COLLABORATION INVITATIONS (High Priority for Non-Owners / Prospects)
  // =========================================================================
  const allInvites = invitations && invitations.length > 0 ? invitations : getPersistedInvitations(DEFAULT_ORG_ID);
  const myPendingInvites = allInvites.filter(
    inv => inv.email.toLowerCase().trim() === normalizedEmail && 
           inv.status === 'pending' && 
           new Date(inv.expiresAt).getTime() > Date.now()
  );

  myPendingInvites.forEach(inv => {
    const notifId = `inv_${inv.id}_${inv.token}`;
    if (!dismissedIds.has(notifId)) {
      const expiresFormatted = new Date(inv.expiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      notifs.push({
        id: notifId,
        type: 'team_invite',
        category: 'team',
        priority: 'urgent',
        title: 'Team Workspace Invitation',
        message: `${inv.invitedByName || inv.invitedByEmail} invited you to join "${inv.organizationName || orgName}" as an ${inv.role}. Expires on ${expiresFormatted}.`,
        timestamp: inv.createdAt,
        read: readIds.has(notifId),
        actionLabel: 'Accept & Join',
        actionType: 'accept_invite',
        actionPayload: {
          inviteToken: inv.token,
          inviteId: inv.id,
          orgId: inv.organizationId,
          orgName: inv.organizationName || orgName,
          role: inv.role
        }
      });
    }
  });

  // =========================================================================
  // 2. SUBSCRIPTION STATUS & EXPIRATION DEPLETION (Crucial for Non-Owners & Members)
  // =========================================================================
  if (billing) {
    const subStatus = (billing.subscriptionStatus || '').toLowerCase();
    
    // (a) Trial Depletion Check
    if (subStatus === 'trial' && billing.trialEndsAt) {
      const trialEndTime = new Date(billing.trialEndsAt).getTime();
      const msDiff = trialEndTime - Date.now();
      const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      const formattedDate = new Date(billing.trialEndsAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      if (daysRemaining <= 0) {
        const notifId = `trial_expired_${billing.trialEndsAt}`;
        if (!dismissedIds.has(notifId)) {
          notifs.push({
            id: notifId,
            type: 'subscription_deplete',
            category: 'subscription',
            priority: 'urgent',
            title: 'Trial Period Expired',
            message: `Your ${billing.plan.toUpperCase()} trial expired on ${formattedDate}. Premium analysis, unlimited cleaning, and export features are currently restricted.`,
            timestamp: new Date().toISOString(),
            read: readIds.has(notifId),
            actionLabel: isOwner ? 'Upgrade Subscription' : 'View Subscription',
            actionType: 'view_subscription',
            actionPayload: { plan: 'pro', tab: 'settings' }
          });
        }
      } else if (daysRemaining <= 1) {
        const notifId = `trial_1day_${billing.trialEndsAt}`;
        if (!dismissedIds.has(notifId)) {
          notifs.push({
            id: notifId,
            type: 'subscription_deplete',
            category: 'subscription',
            priority: 'urgent',
            title: 'Trial Depleting Tomorrow',
            message: `Only 1 day left in your Pro trial (${formattedDate}). Upgrade your plan to prevent service interruption for your CSV auditing pipeline.`,
            timestamp: new Date().toISOString(),
            read: readIds.has(notifId),
            actionLabel: isOwner ? 'Renew Plan' : 'View Plan Details',
            actionType: 'view_subscription',
            actionPayload: { plan: 'pro', tab: 'settings' }
          });
        }
      } else if (daysRemaining <= 3) {
        const notifId = `trial_3days_${billing.trialEndsAt}`;
        if (!dismissedIds.has(notifId)) {
          notifs.push({
            id: notifId,
            type: 'subscription_deplete',
            category: 'subscription',
            priority: 'warning',
            title: 'Trial Expiring Soon (3 Days Left)',
            message: `Your Pro trial will conclude on ${formattedDate} (${daysRemaining} days remaining). Ensure seamless team collaboration by choosing a plan.`,
            timestamp: new Date().toISOString(),
            read: readIds.has(notifId),
            actionLabel: isOwner ? 'Select Plan' : 'View Details',
            actionType: 'view_subscription',
            actionPayload: { plan: 'pro', tab: 'settings' }
          });
        }
      } else if (daysRemaining <= 7) {
        const notifId = `trial_7days_${billing.trialEndsAt}`;
        if (!dismissedIds.has(notifId)) {
          notifs.push({
            id: notifId,
            type: 'subscription_deplete',
            category: 'subscription',
            priority: 'info',
            title: 'Pro Trial Active (7 Days Remaining)',
            message: `Your trial is active until ${formattedDate}. Full access to AI Insights, automated hygiene, and branded exports is enabled.`,
            timestamp: new Date().toISOString(),
            read: readIds.has(notifId),
            actionLabel: 'View Plan',
            actionType: 'view_subscription',
            actionPayload: { plan: 'pro', tab: 'settings' }
          });
        }
      }
    }

    // (b) Past Due or Canceled Status
    if (subStatus === 'past_due') {
      const notifId = `billing_past_due_${billing.subscriptionId || 'default'}`;
      if (!dismissedIds.has(notifId)) {
        notifs.push({
          id: notifId,
          type: 'subscription_deplete',
          category: 'subscription',
          priority: 'urgent',
          title: 'Payment Past Due',
          message: isOwner 
            ? 'Your organization subscription payment could not be processed. Update payment method immediately to avoid account suspension.'
            : 'Your organization workspace payment is past due. Workspace administrative tools and exports may be temporarily locked.',
          timestamp: new Date().toISOString(),
          read: readIds.has(notifId),
          actionLabel: isOwner ? 'Update Payment' : 'Contact Admin',
          actionType: 'view_subscription',
          actionPayload: { tab: 'settings' }
        });
      }
    } else if (subStatus === 'canceled' || subStatus === 'expired') {
      const notifId = `billing_canceled_${billing.subscriptionId || 'default'}`;
      if (!dismissedIds.has(notifId)) {
        notifs.push({
          id: notifId,
          type: 'subscription_deplete',
          category: 'subscription',
          priority: 'urgent',
          title: 'Subscription Inactive / Canceled',
          message: isOwner
            ? 'Your subscription is currently inactive. Reactivate your plan to restore full team tenancy, AI audits, and large file parsing.'
            : 'The workspace subscription is inactive. Contact the workspace owner to re-enable full team features.',
          timestamp: new Date().toISOString(),
          read: readIds.has(notifId),
          actionLabel: isOwner ? 'Reactivate Plan' : 'View Plan',
          actionType: 'view_subscription',
          actionPayload: { tab: 'settings' }
        });
      }
    }
  }

  // =========================================================================
  // 3. USAGE & QUOTA DEPLETION WARNINGS
  // =========================================================================
  if (usageMetrics) {
    const { auditCount, maxAudits } = usageMetrics;
    if (maxAudits !== 'unlimited' && typeof maxAudits === 'number' && maxAudits > 0) {
      const usageRatio = auditCount / maxAudits;
      
      if (auditCount >= maxAudits) {
        const notifId = `quota_100_${usageMetrics.periodMonth}`;
        if (!dismissedIds.has(notifId)) {
          notifs.push({
            id: notifId,
            type: 'quota_deplete',
            category: 'subscription',
            priority: 'urgent',
            title: 'Monthly Audit Limit Reached (100%)',
            message: `You have consumed all ${maxAudits} dataset audits for this billing period (${usageMetrics.periodMonth}). Additional file audits are locked until reset or plan upgrade.`,
            timestamp: new Date().toISOString(),
            read: readIds.has(notifId),
            actionLabel: isOwner ? 'Upgrade Tier' : 'View Usage',
            actionType: 'view_subscription',
            actionPayload: { tab: 'settings' }
          });
        }
      } else if (usageRatio >= 0.8) {
        const notifId = `quota_80_${usageMetrics.periodMonth}`;
        if (!dismissedIds.has(notifId)) {
          const remaining = maxAudits - auditCount;
          notifs.push({
            id: notifId,
            type: 'quota_deplete',
            category: 'subscription',
            priority: 'warning',
            title: 'Audit Quota Nearing Capacity (80%+)',
            message: `You have used ${auditCount} of ${maxAudits} audits (${Math.round(usageRatio * 100)}%). Only ${remaining} audit${remaining === 1 ? '' : 's'} remaining this month.`,
            timestamp: new Date().toISOString(),
            read: readIds.has(notifId),
            actionLabel: 'Check Usage',
            actionType: 'view_subscription',
            actionPayload: { tab: 'settings' }
          });
        }
      }
    }
  }

  // =========================================================================
  // 4. SLOT REQUEST STATUS (For Non-Owners who requested an invite slot)
  // =========================================================================
  const mySlotRequests = slotRequests.filter(
    req => req.userEmail.toLowerCase().trim() === normalizedEmail
  );

  mySlotRequests.forEach(req => {
    if (req.status === 'approved') {
      const notifId = `slot_approved_${req.id}`;
      if (!dismissedIds.has(notifId)) {
        notifs.push({
          id: notifId,
          type: 'slot_request_status',
          category: 'team',
          priority: 'success',
          title: 'Team Slot Request Approved!',
          message: `The workspace administrator approved your seat request for "${orgName}". You can now access all shared team workspaces.`,
          timestamp: new Date(req.timestamp || Date.now()).toISOString(),
          read: readIds.has(notifId),
          actionLabel: 'Open Team View',
          actionType: 'view_team',
          actionPayload: { tab: 'team' }
        });
      }
    } else if (req.status === 'declined') {
      const notifId = `slot_declined_${req.id}`;
      if (!dismissedIds.has(notifId)) {
        notifs.push({
          id: notifId,
          type: 'slot_request_status',
          category: 'team',
          priority: 'warning',
          title: 'Team Slot Request Declined',
          message: `Your request to join "${orgName}" was declined by the administrator due to seat capacity or policy restrictions.`,
          timestamp: new Date(req.timestamp || Date.now()).toISOString(),
          read: readIds.has(notifId),
          actionLabel: 'Dismiss',
          actionType: 'open_modal',
          actionPayload: { tab: 'dashboard' }
        });
      }
    }
  });

  // =========================================================================
  // 5. SECURITY & DATA HYGIENE ALERTS IN ACTIVE DATASETS
  // =========================================================================
  files.forEach(file => {
    if (file.securityScanSummary) {
      const threats = file.securityScanSummary.maliciousThreatsDetected || 0;
      const formulas = file.securityScanSummary.formulasSanitized || 0;

      if (threats > 0 || formulas > 0) {
        const notifId = `sec_threat_${file.id}`;
        if (!dismissedIds.has(notifId)) {
          notifs.push({
            id: notifId,
            type: 'security_alert',
            category: 'security',
            priority: 'urgent',
            title: `Security Violation in ${file.name}`,
            message: `Detected ${threats > 0 ? `${threats} malicious threat(s)` : ''}${threats > 0 && formulas > 0 ? ' and ' : ''}${formulas > 0 ? `${formulas} formula injection(s)` : ''}. Review and sanitize before exporting.`,
            timestamp: file.uploadedAt || new Date().toISOString(),
            read: readIds.has(notifId),
            actionLabel: 'Inspect Dataset',
            actionType: 'view_audit',
            actionPayload: { tab: 'schema', fileId: file.id }
          });
        }
      }
    }

    // Retention approaching purge warning (within 2 hours)
    if (file.retentionPolicy?.expiresAt && file.retentionPolicy.status === 'scheduled_deletion' && !file.retentionPolicy.originalFileDeleted) {
      const expTime = new Date(file.retentionPolicy.expiresAt).getTime();
      if (!isNaN(expTime) && expTime > Date.now()) {
        const diffMs = expTime - Date.now();
        const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
        if (diffMs <= 2 * 60 * 60 * 1000) {
          const notifId = `retention_warning_${file.id}`;
          if (!dismissedIds.has(notifId)) {
            notifs.push({
              id: notifId,
              type: 'retention_warning',
              category: 'security',
              priority: 'warning',
              title: `Scheduled Auto-Purge: ${file.name}`,
              message: `Per compliance retention schedule, this dataset will be permanently deleted in ~${hoursLeft} hour(s). Export any necessary reports.`,
              timestamp: new Date().toISOString(),
              read: readIds.has(notifId),
              actionLabel: 'View File Archive',
              actionType: 'navigate',
              actionPayload: { tab: 'history', fileId: file.id }
            });
          }
        }
      }
    }
  });

  // =========================================================================
  // 6. CUSTOM IN-APP NOTIFICATIONS (From local actions or broadcast events)
  // =========================================================================
  const customNotifs = getCustomInAppNotifications(userEmail);
  customNotifs.forEach(cn => {
    // Avoid duplicate team_invite if already generated from active pending invitation in Section 1
    if (cn.type === 'team_invite' && cn.actionPayload?.inviteId) {
      const alreadyHas = notifs.some(
        n => n.type === 'team_invite' && (n.id.includes(cn.actionPayload.inviteId) || n.actionPayload?.inviteId === cn.actionPayload.inviteId)
      );
      if (alreadyHas) return;
    }
    if (!dismissedIds.has(cn.id)) {
      notifs.push({
        ...cn,
        read: readIds.has(cn.id) || cn.read
      });
    }
  });

  // Sort descending by timestamp
  notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return notifs;
}

/**
 * Listens for real-time invitations directed to the user across the organization.
 */
export function subscribeToUserInvitations(
  userEmail: string,
  orgId: string = DEFAULT_ORG_ID,
  callback: (invitations: OrganizationInvitation[]) => void
): () => void {
  if (!userEmail) {
    callback([]);
    return () => {};
  }

  const normalized = userEmail.toLowerCase().trim();
  const initial = getPersistedInvitations(orgId).filter(
    inv => inv.email.toLowerCase().trim() === normalized
  );
  if (initial.length > 0) {
    callback(initial);
  }

  // Cross-component sync handler
  const handleCustomSync = (e: any) => {
    if (e.detail?.invitations) {
      const userInvites = (e.detail.invitations as OrganizationInvitation[]).filter(
        inv => inv.email.toLowerCase().trim() === normalized
      );
      callback(userInvites);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('app_workspace_invitations_updated', handleCustomSync);
  }

  try {
    const invitesRef = collection(db, 'organizations', orgId, 'invitations');
    const q = query(invitesRef, where('email', '==', normalized));

    const unsubscribe = onSnapshot(
      q,
      snap => {
        const list: OrganizationInvitation[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data() as OrganizationInvitation;
          list.push(data);
        });
        if (list.length > 0) {
          callback(list);
        } else {
          const fallback = getPersistedInvitations(orgId).filter(
            inv => inv.email.toLowerCase().trim() === normalized
          );
          callback(fallback);
        }
      },
      err => {
        console.warn('[NotificationService] Invitations subscription fallback:', err);
        const fallback = getPersistedInvitations(orgId).filter(
          inv => inv.email.toLowerCase().trim() === normalized
        );
        callback(fallback);
      }
    );

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app_workspace_invitations_updated', handleCustomSync);
      }
      unsubscribe();
    };
  } catch (e) {
    console.warn('[NotificationService] Failed to initialize invitations listener:', e);
    const fallback = getPersistedInvitations(orgId).filter(
      inv => inv.email.toLowerCase().trim() === normalized
    );
    callback(fallback);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app_workspace_invitations_updated', handleCustomSync);
      }
    };
  }
}
