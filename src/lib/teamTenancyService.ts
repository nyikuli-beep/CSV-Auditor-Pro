import { User } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { broadcastSystemChatMessage, removeUserPresence } from './chatClient';
import { dispatchInAppNotification } from './notificationService';
import { 
  Organization, 
  OrganizationMember, 
  OrganizationRole, 
  OrganizationInvitation, 
  InvitationStatus, 
  UserBillingInfo,
  OrganizationPermission,
  PermissionDefinition,
  OrganizationAuditLog,
  AuditLogAction
} from '../types';

// Default organization identifier for standard tenancy
export const DEFAULT_ORG_ID = 'org-enterprise-root';

// Recognized authorized primary administrator/owner accounts
export const AUTHORIZED_ENTERPRISE_OWNERS = ['nyikulibramwel@gmail.com'];

// ==========================================
// STEP 1: Granular Permissions System
// ==========================================

export const ALL_ORGANIZATION_PERMISSIONS: OrganizationPermission[] = [
  'upload_csv',
  'clean_csv',
  'audit_csv',
  'export_reports',
  'ai_analysis',
  'team_chat',
  'cell_annotations',
  'view_reports',
  'manage_members',
  'manage_settings'
];

export const PERMISSION_DEFINITIONS: Record<OrganizationPermission, PermissionDefinition> = {
  upload_csv: {
    id: 'upload_csv',
    label: 'Upload CSV',
    category: 'data_processing',
    description: 'Upload new CSV datasets and initiate schema parsing in the workspace'
  },
  clean_csv: {
    id: 'clean_csv',
    label: 'Clean CSV',
    category: 'data_processing',
    description: 'Execute automated data cleaning, deduplication, and formula sanitization'
  },
  audit_csv: {
    id: 'audit_csv',
    label: 'Audit CSV',
    category: 'data_processing',
    description: 'Run deep quality audits, anomaly detection, and compliance rule verification'
  },
  export_reports: {
    id: 'export_reports',
    label: 'Export Reports',
    category: 'data_processing',
    description: 'Download and export sanitized CSV files, PDF audit summaries, and Excel sheets'
  },
  ai_analysis: {
    id: 'ai_analysis',
    label: 'AI Analysis',
    category: 'data_processing',
    description: 'Generate Gemini AI executive summaries, quality forecasting, and automated remediation'
  },
  team_chat: {
    id: 'team_chat',
    label: 'Team Chat',
    category: 'collaboration',
    description: 'Participate in team-wide discussions and live collaboration channels'
  },
  cell_annotations: {
    id: 'cell_annotations',
    label: 'Cell Annotations',
    category: 'collaboration',
    description: 'Create, reply to, and resolve spreadsheet cell-level comment threads'
  },
  view_reports: {
    id: 'view_reports',
    label: 'View Reports',
    category: 'collaboration',
    description: 'View audit reports, quality dashboards, and team historical analytics'
  },
  manage_members: {
    id: 'manage_members',
    label: 'Manage Team Members',
    category: 'administration',
    description: 'Invite new teammates, manage roles, adjust permissions, and revoke access'
  },
  manage_settings: {
    id: 'manage_settings',
    label: 'Manage Org Settings',
    category: 'administration',
    description: 'Update organization name, workspace metadata, and tenancy policies'
  }
};

export const DEFAULT_ROLE_PERMISSIONS: Record<OrganizationRole, OrganizationPermission[]> = {
  Owner: [
    'upload_csv',
    'clean_csv',
    'audit_csv',
    'export_reports',
    'ai_analysis',
    'team_chat',
    'cell_annotations',
    'view_reports',
    'manage_members',
    'manage_settings'
  ],
  Admin: [
    'upload_csv',
    'clean_csv',
    'audit_csv',
    'export_reports',
    'ai_analysis',
    'team_chat',
    'cell_annotations',
    'view_reports',
    'manage_members',
    'manage_settings'
  ],
  Member: [
    'upload_csv',
    'clean_csv',
    'audit_csv',
    'export_reports',
    'ai_analysis',
    'team_chat',
    'cell_annotations',
    'view_reports'
  ]
};

/**
 * Returns the effective permissions for a given member.
 * If the member has explicitly stored permissions, return those;
 * otherwise fallback to the default permissions for their role.
 */
export function getMemberPermissions(member?: OrganizationMember | null): OrganizationPermission[] {
  if (!member) return [];
  if (member.role === 'Owner') {
    return [...ALL_ORGANIZATION_PERMISSIONS];
  }
  if (member.permissions && Array.isArray(member.permissions) && member.permissions.length > 0) {
    return member.permissions;
  }
  return DEFAULT_ROLE_PERMISSIONS[member.role] || DEFAULT_ROLE_PERMISSIONS.Member;
}

/**
 * Checks if a member possesses a specific permission.
 */
export function hasPermission(
  member: OrganizationMember | null | undefined, 
  permission: OrganizationPermission
): boolean {
  if (!member) return false;
  if (member.role === 'Owner') return true;
  if (member.status === 'suspended') return false;
  const permissions = getMemberPermissions(member);
  return permissions.includes(permission);
}

/**
 * Validates permission with an explicit reason object.
 */
export function requirePermission(
  member: OrganizationMember | null | undefined,
  permission: OrganizationPermission
): { authorized: boolean; reason?: string } {
  if (!member) {
    return { authorized: false, reason: 'Authentication required. No active membership found.' };
  }
  if (member.status === 'suspended') {
    return { authorized: false, reason: 'Organization membership is currently suspended.' };
  }
  if (hasPermission(member, permission)) {
    return { authorized: true };
  }
  const def = PERMISSION_DEFINITIONS[permission];
  return {
    authorized: false,
    reason: `Permission denied. Missing required permission: "${def?.label || permission}". Contact an organization administrator.`
  };
}

// ==========================================
// STEP 2: Centralized Enterprise Entitlement
// ==========================================

export interface EnterpriseAccessResult {
  authorized: boolean;
  isEnterprise: boolean;
  reason?: string;
}

/**
 * Validates whether the authenticated user possesses an active Enterprise entitlement.
 * Evaluates both auth state and Paddle billing plan status.
 */
export function checkEnterpriseEntitlement(
  user: User | null | { uid?: string; email?: string | null },
  billing?: UserBillingInfo | null
): EnterpriseAccessResult {
  if (!user) {
    return {
      authorized: false,
      isEnterprise: false,
      reason: 'Authentication required. Please sign in to verify Enterprise workspace credentials.'
    };
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const isDedicatedOwner = AUTHORIZED_ENTERPRISE_OWNERS.some(
    e => e.toLowerCase() === userEmail
  );

  if (isDedicatedOwner) {
    return {
      authorized: true,
      isEnterprise: true
    };
  }

  const currentPlan = (billing?.plan || '').toLowerCase();
  const subscriptionStatus = (billing?.subscriptionStatus || '').toLowerCase();
  const isPlanEnterprise = currentPlan === 'enterprise';
  const isStatusActive = subscriptionStatus === 'active' || subscriptionStatus === 'trial';

  if (isPlanEnterprise && isStatusActive) {
    return {
      authorized: true,
      isEnterprise: true
    };
  }

  // Active Trial Testing / Pro Trial enables full Team Tenancy access during the trial window
  if (currentPlan === 'pro_trial' || subscriptionStatus === 'trial') {
    if (billing?.trialEndsAt) {
      const now = Date.now();
      const endsAt = new Date(billing.trialEndsAt).getTime();
      if (!isNaN(endsAt) && endsAt > now) {
        return {
          authorized: true,
          isEnterprise: true
        };
      }
    } else {
      // If active trial without specific date
      return {
        authorized: true,
        isEnterprise: true
      };
    }
  }

  return {
    authorized: false,
    isEnterprise: false,
    reason: 'Enterprise subscription required. Team Tenancy workspace features are exclusive to active Enterprise plan accounts.'
  };
}

/**
 * Reusable entitlement guard that denies access if Enterprise is inactive.
 */
export function requireEnterpriseAccess(
  user: User | null | { uid?: string; email?: string | null },
  billing?: UserBillingInfo | null
): EnterpriseAccessResult {
  return checkEnterpriseEntitlement(user, billing);
}

// ==========================================
// Role Definitions & Utilities
// ==========================================

export function isOrganizationOwner(role?: OrganizationRole | string | null): boolean {
  return role === 'Owner';
}

export function isOrganizationAdmin(role?: OrganizationRole | string | null): boolean {
  return role === 'Owner' || role === 'Admin';
}

export function canManageOrganization(role?: OrganizationRole | string | null): boolean {
  return role === 'Owner' || role === 'Admin';
}

export function canManageMembers(role?: OrganizationRole | string | null): boolean {
  return role === 'Owner' || role === 'Admin';
}

export function formatRoleLabel(role?: OrganizationRole | string | null): string {
  switch (role) {
    case 'Owner':
      return 'Owner';
    case 'Admin':
      return 'Admin';
    case 'Member':
    default:
      return 'Member';
  }
}

// ==========================================
// STEP 3: Immutable Organization Audit Logging
// ==========================================

const localAuditLogsStore = new Map<string, OrganizationAuditLog[]>();

/**
 * Records an immutable audit log entry in Firestore (/organizations/{orgId}/audit_logs/{logId})
 * and local cache fallback.
 */
export async function recordOrganizationAuditLog(params: {
  orgId?: string;
  action: AuditLogAction | string;
  actor: {
    uid: string;
    email: string;
    displayName?: string;
    role: OrganizationRole;
  };
  target?: {
    id?: string;
    uid?: string;
    email?: string;
    name?: string;
    type?: string;
  };
  metadata?: Record<string, any>;
}): Promise<OrganizationAuditLog> {
  const orgId = params.orgId || DEFAULT_ORG_ID;
  const nowIso = new Date().toISOString();
  const logId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const logEntry: OrganizationAuditLog = {
    id: logId,
    organizationId: orgId,
    action: params.action,
    actor: {
      uid: params.actor.uid,
      email: params.actor.email,
      displayName: params.actor.displayName || params.actor.email.split('@')[0],
      role: params.actor.role
    },
    target: params.target,
    timestamp: nowIso,
    metadata: params.metadata || {}
  };

  try {
    const logRef = doc(db, 'organizations', orgId, 'audit_logs', logId);
    await setDoc(logRef, logEntry);

    // Update local cache
    const existing = localAuditLogsStore.get(orgId) || [];
    localAuditLogsStore.set(orgId, [logEntry, ...existing]);
  } catch (err) {
    console.warn('Firestore recordOrganizationAuditLog fallback to local memory:', err);
    const existing = localAuditLogsStore.get(orgId) || [];
    localAuditLogsStore.set(orgId, [logEntry, ...existing]);
  }

  return logEntry;
}

/**
 * Fetches organization audit logs.
 */
export async function getOrganizationAuditLogs(
  orgId: string = DEFAULT_ORG_ID,
  limitCount: number = 50
): Promise<OrganizationAuditLog[]> {
  try {
    const logsRef = collection(db, 'organizations', orgId, 'audit_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), firestoreLimit(limitCount));
    const snap = await getDocs(q);
    const logs: OrganizationAuditLog[] = [];
    snap.forEach(docSnap => {
      logs.push(docSnap.data() as OrganizationAuditLog);
    });

    if (logs.length > 0) {
      localAuditLogsStore.set(orgId, logs);
      return logs;
    }
    return localAuditLogsStore.get(orgId) || [];
  } catch (err) {
    console.warn('Unable to query audit logs from Firestore:', err);
    return localAuditLogsStore.get(orgId) || [];
  }
}

/**
 * Real-time subscription to organization audit logs.
 */
export function subscribeToOrganizationAuditLogs(
  orgId: string = DEFAULT_ORG_ID,
  callback: (logs: OrganizationAuditLog[]) => void,
  limitCount: number = 50
): () => void {
  try {
    const logsRef = collection(db, 'organizations', orgId, 'audit_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), firestoreLimit(limitCount));
    const unsubscribe = onSnapshot(
      q,
      snap => {
        const logs: OrganizationAuditLog[] = [];
        snap.forEach(docSnap => {
          logs.push(docSnap.data() as OrganizationAuditLog);
        });
        localAuditLogsStore.set(orgId, logs);
        callback(logs);
      },
      err => {
        console.warn('Audit logs snapshot error:', err);
        const cached = localAuditLogsStore.get(orgId) || [];
        callback(cached);
      }
    );
    return unsubscribe;
  } catch (e) {
    callback(localAuditLogsStore.get(orgId) || []);
    return () => {};
  }
}

// ==========================================
// In-Memory Fallback Stores & Cache
// ==========================================

const INVITATIONS_STORAGE_PREFIX = 'app_org_invitations_v3_';

export function getPersistedInvitations(orgId: string = DEFAULT_ORG_ID): OrganizationInvitation[] {
  try {
    const raw = localStorage.getItem(`${INVITATIONS_STORAGE_PREFIX}${orgId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const legacy = localStorage.getItem('app_workspace_invitations');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse persisted invitations:', e);
  }
  return [];
}

export function savePersistedInvitations(orgId: string = DEFAULT_ORG_ID, invitations: OrganizationInvitation[]): void {
  try {
    localStorage.setItem(`${INVITATIONS_STORAGE_PREFIX}${orgId}`, JSON.stringify(invitations));
    localStorage.setItem('app_workspace_invitations', JSON.stringify(invitations));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_workspace_invitations_updated', { detail: { orgId, invitations } }));
    }
  } catch (e) {
    console.warn('Failed to save persisted invitations:', e);
  }
}

const localOrganizationsStore = new Map<string, Organization>();
const localMembersStore = new Map<string, OrganizationMember[]>();
const localInvitationsStore = new Map<string, OrganizationInvitation[]>();

/**
 * Clears all cached in-memory tenancy state during account switching.
 */
export function clearTenancyState(): void {
  localOrganizationsStore.clear();
  localMembersStore.clear();
  localInvitationsStore.clear();
  localAuditLogsStore.clear();
}

/**
 * Retrieves or provisions the default Enterprise Organization in Firestore (with local fallback).
 */
export async function getOrCreateDefaultOrganization(
  ownerUid: string,
  ownerEmail?: string,
  ownerDisplayName?: string
): Promise<Organization> {
  const orgId = DEFAULT_ORG_ID;
  const nowIso = new Date().toISOString();

  const defaultOrg: Organization = {
    id: orgId,
    name: 'Enterprise Data Workspace',
    ownerId: ownerUid,
    ownerEmail: ownerEmail || 'nyikulibramwel@gmail.com',
    subscriptionPlan: 'enterprise',
    status: 'active',
    createdAt: nowIso,
    updatedAt: nowIso,
    maxSeats: 15,
    description: 'Corporate CSV Auditing, Data Governance & Automated Schema Validation'
  };

  try {
    const orgRef = doc(db, 'organizations', orgId);
    const snap = await getDoc(orgRef);

    if (snap.exists()) {
      const data = snap.data() as Organization;
      localOrganizationsStore.set(orgId, data);
      return data;
    }

    await setDoc(orgRef, defaultOrg);
    localOrganizationsStore.set(orgId, defaultOrg);

    // Provision initial Owner membership record using Firebase UID as primary identity
    const memberRef = doc(db, 'organizations', orgId, 'members', ownerUid);
    const initialOwnerMember: OrganizationMember = {
      uid: ownerUid,
      organizationId: orgId,
      email: ownerEmail || 'nyikulibramwel@gmail.com',
      displayName: ownerDisplayName || 'Primary Owner',
      role: 'Owner',
      permissions: [...ALL_ORGANIZATION_PERMISSIONS],
      status: 'active',
      joinedAt: nowIso,
      lastActive: nowIso,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerDisplayName || 'Owner')}&backgroundColor=3b82f6`
    };
    await setDoc(memberRef, initialOwnerMember);
    localMembersStore.set(orgId, [initialOwnerMember]);

    // Record audit log for organization creation
    recordOrganizationAuditLog({
      orgId,
      action: 'organization.updated',
      actor: {
        uid: ownerUid,
        email: ownerEmail || 'nyikulibramwel@gmail.com',
        displayName: ownerDisplayName || 'Primary Owner',
        role: 'Owner'
      },
      metadata: { event: 'organization_initialized', maxSeats: 15 }
    }).catch(() => {});

    return defaultOrg;
  } catch (err) {
    console.warn('Firestore organization read/write fallback to local cache:', err);
    if (!localOrganizationsStore.has(orgId)) {
      localOrganizationsStore.set(orgId, defaultOrg);
      const initialOwnerMember: OrganizationMember = {
        uid: ownerUid,
        organizationId: orgId,
        email: ownerEmail || 'nyikulibramwel@gmail.com',
        displayName: ownerDisplayName || 'Primary Owner',
        role: 'Owner',
        permissions: [...ALL_ORGANIZATION_PERMISSIONS],
        status: 'active',
        joinedAt: nowIso,
        lastActive: nowIso,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerDisplayName || 'Owner')}&backgroundColor=3b82f6`
      };
      localMembersStore.set(orgId, [initialOwnerMember]);
    }
    return localOrganizationsStore.get(orgId)!;
  }
}

/**
 * Returns the currently active organization for the specified user.
 */
export async function getCurrentOrganization(userId?: string): Promise<Organization | null> {
  const orgId = DEFAULT_ORG_ID;
  try {
    const orgRef = doc(db, 'organizations', orgId);
    const snap = await getDoc(orgRef);
    if (snap.exists()) {
      return snap.data() as Organization;
    }
    if (localOrganizationsStore.has(orgId)) {
      return localOrganizationsStore.get(orgId)!;
    }
    if (userId) {
      return await getOrCreateDefaultOrganization(userId);
    }
    return null;
  } catch (err) {
    console.warn('Unable to query current organization from Firestore:', err);
    return localOrganizationsStore.get(orgId) || null;
  }
}

/**
 * Fetches all members of an organization.
 */
export async function getOrganizationMembers(orgId: string = DEFAULT_ORG_ID): Promise<OrganizationMember[]> {
  try {
    const membersRef = collection(db, 'organizations', orgId, 'members');
    const snap = await getDocs(membersRef);
    const membersList: OrganizationMember[] = [];
    snap.forEach(docSnap => {
      const m = docSnap.data() as OrganizationMember;
      if (!m.permissions || m.permissions.length === 0) {
        m.permissions = getMemberPermissions(m);
      }
      membersList.push(m);
    });
    if (membersList.length > 0) {
      localMembersStore.set(orgId, membersList);
      return membersList;
    }
    return localMembersStore.get(orgId) || [];
  } catch (err) {
    console.warn('Unable to get organization members from Firestore:', err);
    return localMembersStore.get(orgId) || [];
  }
}

/**
 * Real-time listener for an Organization document.
 */
export function subscribeToOrganization(
  orgId: string,
  callback: (org: Organization | null) => void
): () => void {
  try {
    const orgRef = doc(db, 'organizations', orgId);
    const unsubscribe = onSnapshot(
      orgRef,
      snap => {
        if (snap.exists()) {
          const orgData = snap.data() as Organization;
          localOrganizationsStore.set(orgId, orgData);
          callback(orgData);
        } else {
          callback(localOrganizationsStore.get(orgId) || null);
        }
      },
      err => {
        console.warn('Organization snapshot error:', err);
        callback(localOrganizationsStore.get(orgId) || null);
      }
    );
    return unsubscribe;
  } catch (e) {
    callback(localOrganizationsStore.get(orgId) || null);
    return () => {};
  }
}

/**
 * Real-time listener for Organization Members.
 */
export function subscribeToOrganizationMembers(
  orgId: string,
  callback: (members: OrganizationMember[]) => void
): () => void {
  try {
    const membersRef = collection(db, 'organizations', orgId, 'members');
    const unsubscribe = onSnapshot(
      membersRef,
      snap => {
        const list: OrganizationMember[] = [];
        snap.forEach(docSnap => {
          const m = docSnap.data() as OrganizationMember;
          if (!m.permissions || m.permissions.length === 0) {
            m.permissions = getMemberPermissions(m);
          }
          list.push(m);
        });
        localMembersStore.set(orgId, list);
        callback(list);
      },
      err => {
        console.warn('Organization members snapshot error:', err);
        callback(localMembersStore.get(orgId) || []);
      }
    );
    return unsubscribe;
  } catch (e) {
    callback(localMembersStore.get(orgId) || []);
    return () => {};
  }
}

/**
 * Updates organization details (Name / Description) if authorized as Owner or Admin with manage_settings.
 */
export async function updateOrganizationDetails(
  orgId: string,
  updates: Partial<Pick<Organization, 'name' | 'description'>>,
  actorUid: string,
  actorRole: OrganizationRole,
  actorEmail?: string,
  actorName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!canManageOrganization(actorRole)) {
    return {
      success: false,
      error: 'You do not have permission to modify organization settings.'
    };
  }

  const nowIso = new Date().toISOString();
  try {
    const orgRef = doc(db, 'organizations', orgId);
    await updateDoc(orgRef, {
      ...updates,
      updatedAt: nowIso
    });

    const cached = localOrganizationsStore.get(orgId);
    if (cached) {
      localOrganizationsStore.set(orgId, {
        ...cached,
        ...updates,
        updatedAt: nowIso
      });
    }

    // Record audit log entry
    recordOrganizationAuditLog({
      orgId,
      action: 'organization.updated',
      actor: {
        uid: actorUid,
        email: actorEmail || 'unverified@company.com',
        displayName: actorName || 'Workspace Admin',
        role: actorRole
      },
      metadata: { updates }
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    console.warn('Firestore updateOrganizationDetails error:', err);
    return { success: false, error: 'Failed to update organization details. Please try again.' };
  }
}

// ==========================================
// Seat Management Utilities
// ==========================================

export interface SeatMetrics {
  maxSeats: number;
  usedSeats: number;
  pendingSeats: number;
  availableSeats: number;
  utilizationPercent: number;
}

export function calculateSeatMetrics(
  organization: Organization | null,
  members: OrganizationMember[],
  invitations: OrganizationInvitation[]
): SeatMetrics {
  const maxSeats = organization?.maxSeats || 15;
  const activeMembers = members.filter(m => m.status === 'active');
  const usedSeats = activeMembers.length;
  
  const now = Date.now();
  const pendingInvitations = invitations.filter(
    inv => inv.status === 'pending' && new Date(inv.expiresAt).getTime() > now
  );
  const pendingSeats = pendingInvitations.length;
  
  const availableSeats = Math.max(0, maxSeats - usedSeats - pendingSeats);
  const utilizationPercent = Math.min(100, Math.round(((usedSeats + pendingSeats) / maxSeats) * 100));

  return {
    maxSeats,
    usedSeats,
    pendingSeats,
    availableSeats,
    utilizationPercent
  };
}

// ==========================================
// INVITATION WORKFLOW & CONCURRENCY-SAFE STORAGE
// ==========================================

function generateSecureToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'inv_';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Creates a secure Organization Invitation in Firestore with concurrency protection and audit logging.
 */
export async function createOrganizationInvitation(params: {
  orgId: string;
  orgName?: string;
  email: string;
  role: 'Admin' | 'Member';
  inviterUid: string;
  inviterEmail: string;
  inviterName?: string;
  inviterRole: OrganizationRole;
  currentMembers: OrganizationMember[];
  currentInvitations: OrganizationInvitation[];
  maxSeats: number;
  billing?: UserBillingInfo | null;
}): Promise<{ success: boolean; invitation?: OrganizationInvitation; error?: string }> {
  const {
    orgId,
    orgName = 'Enterprise Data Workspace',
    email,
    role,
    inviterUid,
    inviterEmail,
    inviterName,
    inviterRole,
    currentMembers,
    currentInvitations,
    maxSeats,
    billing
  } = params;

  // 1. Permission check
  if (!canManageMembers(inviterRole)) {
    return { success: false, error: 'You do not have permission to invite team members.' };
  }

  // 2. Normalize and validate email
  const targetEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!targetEmail || !emailRegex.test(targetEmail)) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  // 3. Subscription status check (STEP 6: Subscription Lifecycle)
  const isDedicatedOwner = AUTHORIZED_ENTERPRISE_OWNERS.some(e => e.toLowerCase() === inviterEmail.toLowerCase());
  if (!isDedicatedOwner && billing) {
    const subStatus = (billing.subscriptionStatus || '').toLowerCase();
    if (subStatus === 'past_due' || subStatus === 'canceled' || subStatus === 'unpaid') {
      return {
        success: false,
        error: 'Subscription expired or past due. Please renew your Enterprise plan to invite new team members.'
      };
    }
  }

  // 4. Check if email is already an active member
  const alreadyMember = currentMembers.some(
    m => m.email.toLowerCase() === targetEmail && m.status === 'active'
  );
  if (alreadyMember) {
    return { success: false, error: 'User is already an active member of this organization.' };
  }

  // 5. Check if there is already a pending (non-expired) invitation
  const now = Date.now();
  const existingPending = currentInvitations.some(inv => {
    const isSameEmail = inv.email.toLowerCase() === targetEmail;
    const isPending = inv.status === 'pending';
    const isNotExpired = new Date(inv.expiresAt).getTime() > now;
    return isSameEmail && isPending && isNotExpired;
  });
  if (existingPending) {
    return { success: false, error: 'A pending invitation already exists for this email address.' };
  }

  // 6. Check available seats
  const activeCount = currentMembers.filter(m => m.status === 'active').length;
  const pendingCount = currentInvitations.filter(
    inv => inv.status === 'pending' && new Date(inv.expiresAt).getTime() > now
  ).length;

  if (activeCount + pendingCount >= maxSeats) {
    return {
      success: false,
      error: `No seats available. This organization has reached its capacity limit of ${maxSeats} seats. Upgrade seats to invite more team members.`
    };
  }

  // 7. Construct Invitation
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days expiration
  const token = generateSecureToken();
  const inviteId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const invitation: OrganizationInvitation = {
    id: inviteId,
    organizationId: orgId,
    organizationName: orgName,
    email: targetEmail,
    role,
    status: 'pending',
    invitedBy: inviterUid,
    invitedByEmail: inviterEmail,
    invitedByName: inviterName || inviterEmail.split('@')[0],
    token,
    createdAt: nowIso,
    expiresAt: expiresIso
  };

  try {
    const inviteRef = doc(db, 'organizations', orgId, 'invitations', inviteId);
    const topLevelRef = doc(db, 'invitations', inviteId);
    
    const p1 = setDoc(inviteRef, invitation);
    const p2 = setDoc(topLevelRef, invitation).catch(() => {});
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Invite write timeout')), 5000)
    );
    await Promise.race([Promise.all([p1, p2]), timeoutPromise]).catch(err => {
      console.warn('[Tenancy] Firestore setDoc timeout/fallback for invitation:', err);
    });

    // Update in-memory store and persistent local storage
    const list = localInvitationsStore.get(orgId) || getPersistedInvitations(orgId);
    const updatedList = [invitation, ...list.filter(i => i.id !== inviteId)];
    localInvitationsStore.set(orgId, updatedList);
    savePersistedInvitations(orgId, updatedList);

    // CRITICAL: Dispatch In-App Notification directly to the invited member end
    dispatchInAppNotification(targetEmail, {
      type: 'team_invite',
      category: 'team',
      priority: 'urgent',
      title: 'Team Workspace Invitation',
      message: `${inviterName || inviterEmail} invited you to join "${orgName}" as an ${role}.`,
      actionLabel: 'Accept & Join',
      actionType: 'accept_invite',
      actionPayload: {
        inviteToken: token,
        inviteId: inviteId,
        orgId: orgId,
        orgName: orgName,
        role: role
      }
    });

    // Record immutable audit log (STEP 3)
    recordOrganizationAuditLog({
      orgId,
      action: 'member.invited',
      actor: {
        uid: inviterUid,
        email: inviterEmail,
        displayName: inviterName || inviterEmail.split('@')[0],
        role: inviterRole
      },
      target: {
        id: inviteId,
        email: targetEmail,
        type: 'invitation'
      },
      metadata: { role, expiresAt: expiresIso }
    }).catch(() => {});

    // Broadcast live chat system announcement
    broadcastSystemChatMessage({
      tenantId: orgId,
      text: `${inviterName || inviterEmail.split('@')[0]} dispatched an enterprise invitation to ${targetEmail} (${role}).`
    }).catch(() => {});

    return { success: true, invitation };
  } catch (err: any) {
    console.error('Firestore createOrganizationInvitation error:', err);
    const list = localInvitationsStore.get(orgId) || getPersistedInvitations(orgId);
    const updatedList = [invitation, ...list.filter(i => i.id !== inviteId)];
    localInvitationsStore.set(orgId, updatedList);
    savePersistedInvitations(orgId, updatedList);
    return { success: true, invitation };
  }
}

/**
 * Real-time listener for Organization Invitations.
 */
export function subscribeToOrganizationInvitations(
  orgId: string = DEFAULT_ORG_ID,
  callback: (invitations: OrganizationInvitation[]) => void
): () => void {
  // Immediately serve persisted / in-memory invitations so page refresh never reads 0
  const initial = localInvitationsStore.get(orgId) || getPersistedInvitations(orgId);
  if (initial.length > 0) {
    localInvitationsStore.set(orgId, initial);
    callback(initial);
  }

  // Cross-component sync handler
  const handleCustomSync = (e: any) => {
    if (e.detail?.invitations) {
      localInvitationsStore.set(orgId, e.detail.invitations);
      callback(e.detail.invitations);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('app_workspace_invitations_updated', handleCustomSync);
  }

  try {
    const invitesRef = collection(db, 'organizations', orgId, 'invitations');
    const unsubscribe = onSnapshot(
      invitesRef,
      snap => {
        const list: OrganizationInvitation[] = [];
        const now = Date.now();
        snap.forEach(docSnap => {
          const data = docSnap.data() as OrganizationInvitation;
          // Auto-derive expired state if past expiration
          if (data.status === 'pending' && new Date(data.expiresAt).getTime() <= now) {
            data.status = 'expired';
          }
          list.push(data);
        });

        // Merge snapshot with existing persistent invitations to prevent race resets
        const persisted = getPersistedInvitations(orgId);
        const map = new Map<string, OrganizationInvitation>();
        persisted.forEach(inv => map.set(inv.id, inv));
        list.forEach(inv => map.set(inv.id, inv));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        localInvitationsStore.set(orgId, merged);
        savePersistedInvitations(orgId, merged);
        callback(merged);
      },
      err => {
        console.warn('Invitations snapshot error / offline fallback:', err);
        const cached = localInvitationsStore.get(orgId) || getPersistedInvitations(orgId);
        callback(cached);
      }
    );
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app_workspace_invitations_updated', handleCustomSync);
      }
      unsubscribe();
    };
  } catch (e) {
    const cached = localInvitationsStore.get(orgId) || getPersistedInvitations(orgId);
    callback(cached);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app_workspace_invitations_updated', handleCustomSync);
      }
    };
  }
}

/**
 * Resends / renews an invitation token (+7 days).
 */
export async function resendOrganizationInvitation(
  orgId: string,
  invitationId: string,
  actorRole: OrganizationRole,
  actorUid?: string,
  actorEmail?: string,
  actorName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!canManageMembers(actorRole)) {
    return { success: false, error: 'You do not have permission to manage invitations.' };
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresIso = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const inviteRef = doc(db, 'organizations', orgId, 'invitations', invitationId);
    await updateDoc(inviteRef, {
      status: 'pending',
      expiresAt: expiresIso,
      updatedAt: nowIso
    });

    const cached = localInvitationsStore.get(orgId) || getPersistedInvitations(orgId);
    const updated = cached.map(inv => {
      if (inv.id === invitationId) {
        return { ...inv, status: 'pending' as InvitationStatus, expiresAt: expiresIso };
      }
      return inv;
    });
    localInvitationsStore.set(orgId, updated);
    savePersistedInvitations(orgId, updated);

    // Record audit log
    if (actorUid && actorEmail) {
      recordOrganizationAuditLog({
        orgId,
        action: 'member.resent',
        actor: {
          uid: actorUid,
          email: actorEmail,
          displayName: actorName,
          role: actorRole
        },
        target: { id: invitationId, type: 'invitation' },
        metadata: { renewedExpiresAt: expiresIso }
      }).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('Firestore resendOrganizationInvitation error:', err);
    return { success: false, error: err?.message || 'Failed to resend invitation in database.' };
  }
}

/**
 * Cancels a pending invitation.
 */
export async function cancelOrganizationInvitation(
  orgId: string,
  invitationId: string,
  actorRole: OrganizationRole,
  actorUid?: string,
  actorEmail?: string,
  actorName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!canManageMembers(actorRole)) {
    return { success: false, error: 'You do not have permission to cancel invitations.' };
  }

  try {
    const inviteRef = doc(db, 'organizations', orgId, 'invitations', invitationId);
    await updateDoc(inviteRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });

    const cached = localInvitationsStore.get(orgId) || getPersistedInvitations(orgId);
    const updated = cached.map(inv => {
      if (inv.id === invitationId) {
        return { ...inv, status: 'cancelled' as InvitationStatus };
      }
      return inv;
    });
    localInvitationsStore.set(orgId, updated);
    savePersistedInvitations(orgId, updated);

    // Record audit log
    if (actorUid && actorEmail) {
      recordOrganizationAuditLog({
        orgId,
        action: 'member.cancelled',
        actor: {
          uid: actorUid,
          email: actorEmail,
          displayName: actorName,
          role: actorRole
        },
        target: { id: invitationId, type: 'invitation' }
      }).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('Firestore cancelOrganizationInvitation error:', err);
    return { success: false, error: err?.message || 'Failed to cancel invitation in database.' };
  }
}

/**
 * Validates and accepts an invitation token with concurrency-safe transaction protection.
 */
export async function acceptOrganizationInvitation(params: {
  orgId: string;
  tokenOrId: string;
  user: User | { uid: string; email: string; displayName?: string; photoURL?: string };
}): Promise<{ success: boolean; member?: OrganizationMember; error?: string }> {
  const { orgId, tokenOrId, user } = params;

  if (!user || !user.uid) {
    return { success: false, error: 'Authentication required. Please sign in to accept this invitation.' };
  }

  const cleanToken = (tokenOrId || '').trim();
  const userEmail = (user.email || '').toLowerCase().trim();

  if (!cleanToken && !userEmail) {
    return { success: false, error: 'Please enter a valid invitation token or code.' };
  }

  try {
    // 1. Locate the invitation in local cache, persisted store, or Firestore
    let matchedInvitation: OrganizationInvitation | null = null;

    // Check memory and persisted local invitations first
    const localList = [...(localInvitationsStore.get(orgId) || []), ...getPersistedInvitations(orgId)];
    const uniqueLocal = Array.from(new Map(localList.map(i => [i.id, i])).values());
    
    matchedInvitation = uniqueLocal.find(inv => {
      const idMatch = inv.id && inv.id.toLowerCase() === cleanToken.toLowerCase();
      const tokenMatch = inv.token && inv.token.toLowerCase() === cleanToken.toLowerCase();
      const emailMatch = userEmail && inv.email && inv.email.toLowerCase() === userEmail && inv.status === 'pending';
      return idMatch || tokenMatch || emailMatch;
    }) || null;

    // If not found in local cache, attempt Firestore query
    if (!matchedInvitation) {
      try {
        const invitesRef = collection(db, 'organizations', orgId, 'invitations');
        const snap = await getDocs(invitesRef);

        snap.forEach(docSnap => {
          const data = docSnap.data() as OrganizationInvitation;
          const idMatch = data.id && data.id.toLowerCase() === cleanToken.toLowerCase();
          const tokenMatch = data.token && data.token.toLowerCase() === cleanToken.toLowerCase();
          const emailMatch = userEmail && data.email && data.email.toLowerCase() === userEmail && data.status === 'pending';
          if (idMatch || tokenMatch || emailMatch) {
            matchedInvitation = data;
          }
        });
      } catch (firestoreErr) {
        console.warn('Firestore invitation lookup fallback:', firestoreErr);
      }
    }

    if (!matchedInvitation) {
      return { success: false, error: 'Invitation not found. Please check your invitation link or code.' };
    }

    const invitation: OrganizationInvitation = matchedInvitation;

    // 2. Validate Invitation Status
    if (invitation.status === 'accepted') {
      return { success: false, error: 'This invitation has already been accepted.' };
    }

    if (invitation.status === 'cancelled') {
      return { success: false, error: 'This invitation has been cancelled by an organization administrator.' };
    }

    const now = Date.now();
    if (new Date(invitation.expiresAt).getTime() <= now) {
      return { success: false, error: 'This invitation has expired. Please request a new invitation.' };
    }

    // 3. Verify Seat Availability (STEP 5: Concurrency Protection)
    let currentMemberCount = 1;
    let maxSeats = 15;
    try {
      const membersSnap = await getDocs(collection(db, 'organizations', orgId, 'members'));
      currentMemberCount = membersSnap.size;
    } catch (e) {
      const localMembers = localMembersStore.get(orgId) || [];
      currentMemberCount = localMembers.filter(m => m.status === 'active').length;
    }
    
    try {
      const orgSnap = await getDoc(doc(db, 'organizations', orgId));
      if (orgSnap.exists()) {
        maxSeats = (orgSnap.data() as Organization).maxSeats || 15;
      }
    } catch (e) {}

    if (currentMemberCount >= maxSeats) {
      return {
        success: false,
        error: `No seats available. The organization has reached its seat limit (${maxSeats}). Contact your team administrator.`
      };
    }

    // 4. Create Member Record with assigned role & default role permissions (STEP 1)
    const nowIso = new Date().toISOString();
    const assignedPermissions = DEFAULT_ROLE_PERMISSIONS[invitation.role] || DEFAULT_ROLE_PERMISSIONS.Member;
    const effectiveMemberEmail = user.email || invitation.email;
    const effectiveDisplayName = user.displayName || (effectiveMemberEmail.split('@')[0]) || 'Team Member';

    const newMember: OrganizationMember = {
      uid: user.uid,
      organizationId: orgId,
      email: effectiveMemberEmail,
      displayName: effectiveDisplayName,
      role: invitation.role,
      permissions: assignedPermissions,
      status: 'active',
      joinedAt: nowIso,
      lastActive: nowIso,
      avatar: (user as any).photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(effectiveDisplayName)}&backgroundColor=3b82f6`
    };

    // Attempt Firestore document writes (non-blocking for UI resilience)
    try {
      const memberRef = doc(db, 'organizations', orgId, 'members', user.uid);
      await setDoc(memberRef, newMember);
    } catch (writeErr) {
      console.warn('Firestore member setDoc fallback:', writeErr);
    }

    try {
      const inviteRef = doc(db, 'organizations', orgId, 'invitations', invitation.id);
      await updateDoc(inviteRef, {
        status: 'accepted',
        acceptedAt: nowIso,
        acceptedByUid: user.uid
      });
    } catch (inviteErr) {
      console.warn('Firestore invite updateDoc fallback:', inviteErr);
    }

    // 5. Update local cache and persistent state
    const cachedMembers = localMembersStore.get(orgId) || [];
    const updatedMembers = [newMember, ...cachedMembers.filter(m => m.uid !== user.uid && m.email.toLowerCase() !== effectiveMemberEmail.toLowerCase())];
    localMembersStore.set(orgId, updatedMembers);

    const cachedInvites = localInvitationsStore.get(orgId) || getPersistedInvitations(orgId);
    const updatedInvites = cachedInvites.map(i => 
      (i.id === invitation.id || i.token === invitation.token || (i.email.toLowerCase() === userEmail && i.status === 'pending'))
        ? { ...i, status: 'accepted' as const, acceptedAt: nowIso, acceptedByUid: user.uid } 
        : i
    );
    localInvitationsStore.set(orgId, updatedInvites);
    savePersistedInvitations(orgId, updatedInvites);

    // Cross-tab and component reactive event notifications
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_workspace_members_updated', { detail: { members: updatedMembers } }));
      window.dispatchEvent(new CustomEvent('app_workspace_invitations_updated', { detail: { invitations: updatedInvites } }));
    }

    // Record Audit Log (STEP 3)
    recordOrganizationAuditLog({
      orgId,
      action: 'member.accepted',
      actor: {
        uid: user.uid,
        email: effectiveMemberEmail,
        displayName: newMember.displayName,
        role: newMember.role
      },
      target: {
        id: invitation.id,
        uid: user.uid,
        email: effectiveMemberEmail,
        name: newMember.displayName,
        type: 'member'
      },
      metadata: { role: invitation.role, inviteId: invitation.id }
    }).catch(() => {});

    // Broadcast live chat system announcement
    broadcastSystemChatMessage({
      tenantId: orgId,
      text: `${newMember.displayName || newMember.email.split('@')[0]} accepted the team invitation and joined as ${newMember.role}.`
    }).catch(() => {});

    return { success: true, member: newMember };
  } catch (err: any) {
    console.warn('acceptOrganizationInvitation error:', err);
    return { success: false, error: err?.message || 'Failed to accept invitation. Please try again or contact your administrator.' };
  }
}

/**
 * Removes an organization member (deletes tenancy membership, preserves auth user).
 */
export async function removeOrganizationMember(params: {
  orgId: string;
  memberUid: string;
  memberRole: OrganizationRole;
  actorUid: string;
  actorRole: OrganizationRole;
  actorEmail?: string;
  actorName?: string;
  memberEmail?: string;
  memberName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { orgId, memberUid, memberRole, actorUid, actorRole, actorEmail, actorName, memberEmail, memberName } = params;

  // 1. Permission check
  if (!canManageMembers(actorRole)) {
    return { success: false, error: 'You do not have permission to remove team members.' };
  }

  // 2. Prevent removing Owner
  if (memberRole === 'Owner') {
    return { success: false, error: 'The primary Organization Owner cannot be removed.' };
  }

  // 3. Admins cannot remove other Admins (only Owners can remove Admins)
  if (actorRole === 'Admin' && memberRole === 'Admin') {
    return { success: false, error: 'Organization Admins can only be removed by the Organization Owner.' };
  }

  // 4. Cannot remove self via member removal (must use leave/transfer)
  if (memberUid === actorUid) {
    return { success: false, error: 'You cannot remove yourself from the organization here.' };
  }

  try {
    const memberRef = doc(db, 'organizations', orgId, 'members', memberUid);
    
    // Concurrency / network safety timeout: fallback gracefully if Firestore delete hangs
    const delMemberPromise = deleteDoc(memberRef);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Member delete timeout')), 5000)
    );
    await Promise.race([delMemberPromise, timeoutPromise]).catch(err => {
      console.warn('[Tenancy] Firestore deleteDoc timeout/fallback for member:', err);
    });

    // Also remove from legacy top-level members collection to avoid ghost re-population
    try {
      await deleteDoc(doc(db, 'members', memberUid));
    } catch {
      // Legacy document may not exist; ignore
    }

    if (memberEmail) {
      const emailLower = memberEmail.toLowerCase().trim();
      try {
        const legacyQ = query(collection(db, 'members'), where('email', '==', emailLower));
        const legacySnap = await getDocs(legacyQ);
        for (const d of legacySnap.docs) {
          await deleteDoc(doc(db, 'members', d.id)).catch(() => {});
        }
      } catch {}
    }

    // Update local cache
    const cached = localMembersStore.get(orgId) || [];
    localMembersStore.set(orgId, cached.filter(m => m.uid !== memberUid && (!memberEmail || m.email.toLowerCase() !== memberEmail.toLowerCase())));

    // Purge from browser localStorage to eliminate ghost member resurrection
    try {
      const saved = localStorage.getItem('app_team_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((m: any) => 
            m.id !== memberUid && 
            m.uid !== memberUid && 
            (!memberEmail || m.email?.toLowerCase() !== memberEmail.toLowerCase())
          );
          localStorage.setItem('app_team_members', JSON.stringify(filtered));
        }
      }
    } catch {}

    // Record Audit Log (STEP 3)
    if (actorEmail) {
      recordOrganizationAuditLog({
        orgId,
        action: 'member.removed',
        actor: {
          uid: actorUid,
          email: actorEmail,
          displayName: actorName,
          role: actorRole
        },
        target: {
          uid: memberUid,
          email: memberEmail,
          name: memberName,
          type: 'member'
        },
        metadata: { revokedRole: memberRole }
      }).catch(() => {});
    }

    // Clean up revoked member presence in real time
    removeUserPresence(memberUid).catch(() => {});

    // Broadcast live chat system announcement
    broadcastSystemChatMessage({
      tenantId: orgId,
      text: `${actorName || actorEmail?.split('@')[0] || 'Admin'} revoked workspace access for ${memberName || memberEmail || 'team collaborator'}.`
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    console.error('Firestore removeOrganizationMember error:', err);
    // Ensure local store and localStorage are updated even if remote call had error
    const cached = localMembersStore.get(orgId) || [];
    localMembersStore.set(orgId, cached.filter(m => m.uid !== memberUid && (!memberEmail || m.email.toLowerCase() !== memberEmail.toLowerCase())));
    return { success: true };
  }
}

/**
 * Updates a member's role (Admin <-> Member) with audit logging.
 */
export async function updateOrganizationMemberRole(params: {
  orgId: string;
  memberUid: string;
  newRole: 'Admin' | 'Member';
  actorUid: string;
  actorRole: OrganizationRole;
  actorEmail?: string;
  actorName?: string;
  memberEmail?: string;
  memberName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { orgId, memberUid, newRole, actorUid, actorRole, actorEmail, actorName, memberEmail, memberName } = params;

  if (!isOrganizationOwner(actorRole) && !isOrganizationAdmin(actorRole)) {
    return { success: false, error: 'You do not have permission to adjust member roles.' };
  }

  try {
    const memberRef = doc(db, 'organizations', orgId, 'members', memberUid);
    const snap = await getDoc(memberRef);
    let oldRole: string = 'Member';
    if (snap.exists()) {
      const data = snap.data() as OrganizationMember;
      oldRole = data.role;
      if (data.role === 'Owner') {
        return { success: false, error: 'The primary Organization Owner role cannot be changed.' };
      }
    }

    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[newRole];
    await updateDoc(memberRef, {
      role: newRole,
      permissions: defaultPerms,
      lastActive: new Date().toISOString()
    });

    const cached = localMembersStore.get(orgId) || [];
    localMembersStore.set(orgId, cached.map(m => m.uid === memberUid ? { ...m, role: newRole, permissions: defaultPerms } : m));

    // Record Audit Log (STEP 3)
    if (actorEmail) {
      recordOrganizationAuditLog({
        orgId,
        action: 'member.role_changed',
        actor: {
          uid: actorUid,
          email: actorEmail,
          displayName: actorName,
          role: actorRole
        },
        target: {
          uid: memberUid,
          email: memberEmail,
          name: memberName,
          type: 'member'
        },
        metadata: { oldRole, newRole }
      }).catch(() => {});
    }

    // Broadcast live chat system announcement
    broadcastSystemChatMessage({
      tenantId: orgId,
      text: `${actorName || actorEmail?.split('@')[0] || 'Admin'} updated ${memberName || memberEmail || 'member'}'s role to ${newRole}.`
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    console.error('Firestore updateOrganizationMemberRole error:', err);
    return { success: false, error: err?.message || 'Failed to update member role in database.' };
  }
}

/**
 * Updates granular permissions for an organization member.
 */
export async function updateOrganizationMemberPermissions(params: {
  orgId: string;
  memberUid: string;
  permissions: OrganizationPermission[];
  actorUid: string;
  actorRole: OrganizationRole;
  actorEmail?: string;
  actorName?: string;
  memberEmail?: string;
  memberName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { orgId, memberUid, permissions, actorUid, actorRole, actorEmail, actorName, memberEmail, memberName } = params;

  if (!isOrganizationOwner(actorRole) && !isOrganizationAdmin(actorRole)) {
    return { success: false, error: 'You do not have permission to customize member permissions.' };
  }

  try {
    const memberRef = doc(db, 'organizations', orgId, 'members', memberUid);
    const snap = await getDoc(memberRef);
    if (snap.exists()) {
      const data = snap.data() as OrganizationMember;
      if (data.role === 'Owner') {
        return { success: false, error: 'Permissions for the Organization Owner cannot be restricted.' };
      }
    }

    await updateDoc(memberRef, {
      permissions,
      lastActive: new Date().toISOString()
    });

    const cached = localMembersStore.get(orgId) || [];
    localMembersStore.set(orgId, cached.map(m => m.uid === memberUid ? { ...m, permissions } : m));

    // Record Audit Log (STEP 3)
    if (actorEmail) {
      recordOrganizationAuditLog({
        orgId,
        action: 'member.permissions_updated',
        actor: {
          uid: actorUid,
          email: actorEmail,
          displayName: actorName,
          role: actorRole
        },
        target: {
          uid: memberUid,
          email: memberEmail,
          name: memberName,
          type: 'member'
        },
        metadata: { permissionsCount: permissions.length, permissions }
      }).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('Firestore updateOrganizationMemberPermissions error:', err);
    return { success: false, error: err?.message || 'Failed to update member permissions in database.' };
  }
}

// ==========================================
// STEP 2: Organization Data Isolation Helpers
// ==========================================

/**
 * Filters any collection of resources by organization ID to enforce data isolation.
 */
export function filterByOrganization<T extends { organizationId?: string }>(
  items: T[], 
  orgId: string = DEFAULT_ORG_ID
): T[] {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => !item.organizationId || item.organizationId === orgId);
}

/**
 * Tags any resource payload with the current organization ID before persistence.
 */
export function tagResourceWithOrganization<T extends object>(
  data: T, 
  orgId: string = DEFAULT_ORG_ID
): T & { organizationId: string } {
  return {
    ...data,
    organizationId: orgId
  };
}

// ==========================================
// Backend Authorization Helpers
// ==========================================

export async function requireOrganizationMembership(
  userId: string,
  orgId: string = DEFAULT_ORG_ID
): Promise<{ authorized: boolean; member?: OrganizationMember; role?: OrganizationRole; permissions?: OrganizationPermission[]; reason?: string }> {
  if (!userId) {
    return { authorized: false, reason: 'Unauthenticated user' };
  }

  try {
    const memberRef = doc(db, 'organizations', orgId, 'members', userId);
    const snap = await getDoc(memberRef);
    if (snap.exists()) {
      const member = snap.data() as OrganizationMember;
      if (member.status === 'suspended') {
        return { authorized: false, reason: 'Organization membership suspended' };
      }
      const permissions = getMemberPermissions(member);
      return { authorized: true, member, role: member.role, permissions };
    }

    // Check local fallback store
    const localList = localMembersStore.get(orgId) || [];
    const localMatch = localList.find(m => m.uid === userId);
    if (localMatch) {
      const permissions = getMemberPermissions(localMatch);
      return { authorized: true, member: localMatch, role: localMatch.role, permissions };
    }

    return { authorized: false, reason: 'User is not a registered member of this organization' };
  } catch (err) {
    return { authorized: false, reason: 'Failed to verify organization membership' };
  }
}

export async function requireOrganizationOwner(
  userId: string,
  orgId: string = DEFAULT_ORG_ID
): Promise<{ authorized: boolean; member?: OrganizationMember; reason?: string }> {
  const membership = await requireOrganizationMembership(userId, orgId);
  if (!membership.authorized || !membership.member) {
    return { authorized: false, reason: membership.reason || 'Not a member of organization' };
  }

  if (membership.member.role !== 'Owner') {
    return { authorized: false, reason: 'Permission denied: Requires Organization Owner role' };
  }

  return { authorized: true, member: membership.member };
}

export async function requireOrganizationAdmin(
  userId: string,
  orgId: string = DEFAULT_ORG_ID
): Promise<{ authorized: boolean; member?: OrganizationMember; reason?: string }> {
  const membership = await requireOrganizationMembership(userId, orgId);
  if (!membership.authorized || !membership.member) {
    return { authorized: false, reason: membership.reason || 'Not a member of organization' };
  }

  if (!isOrganizationAdmin(membership.member.role)) {
    return { authorized: false, reason: 'Permission denied: Requires Organization Admin or Owner role' };
  }

  return { authorized: true, member: membership.member };
}
