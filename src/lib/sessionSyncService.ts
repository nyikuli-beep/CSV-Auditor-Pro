import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  increment,
  serverTimestamp,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import {
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationInvitation,
  OrganizationPermission,
  CSVFile
} from '../types';
import {
  DEFAULT_ORG_ID,
  DEFAULT_ROLE_PERMISSIONS,
  getOrCreateDefaultOrganization
} from './teamTenancyService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DeviceSession {
  uid: string;
  sessionId: string;
  deviceId: string;
  platform: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  status: 'active' | 'idle' | 'terminated';
  appVersion: string;
  activeWorkspaceId: string;
}

export interface UserSyncState {
  uid: string;
  sessionVersion: number;
  membershipVersion: number;
  workspaceVersion: number;
  notificationVersion: number;
  activeWorkspaceId?: string;
  updatedAt: string;
  lastUpdatedBySessionId?: string;
  lastReason?: string;
}

export type SyncConnectionStatus = 'idle' | 'syncing' | 'synced' | 'reconnecting' | 'error';

export const APP_VERSION = '2.5.0';
const DEVICE_ID_KEY = 'csv_auditor_device_id_v1';
const PREFERRED_WORKSPACE_KEY = 'csv_auditor_preferred_workspace_id';

// ============================================================================
// DIAGNOSTIC LOGGING ENGINE
// ============================================================================

export type DiagnosticCategory =
  | 'SESSION'
  | 'AUTH'
  | 'MEMBERSHIP'
  | 'WORKSPACE'
  | 'SYNC'
  | 'INVITATIONS'
  | 'PERMISSIONS'
  | 'LISTENER';

export function logSyncDiagnostic(
  category: DiagnosticCategory,
  message: string,
  data?: any
) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  const prefix = `[${category}] [${ts}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// ============================================================================
// DEVICE & SESSION IDENTIFIER MANAGEMENT
// ============================================================================

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length > 5) {
      return existing;
    }
    const newId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch (e) {
    return `dev_fallback_${Date.now()}`;
  }
}

export function generateSessionId(): string {
  const rand = Math.random().toString(36).substring(2, 9);
  const time = Date.now().toString(36);
  return `sess_${time}_${rand}`;
}

export function savePreferredWorkspaceId(workspaceId: string): void {
  try {
    if (workspaceId) {
      localStorage.setItem(PREFERRED_WORKSPACE_KEY, workspaceId);
    }
  } catch (e) {
    // Ignore storage errors
  }
}

export function getPreferredWorkspaceId(): string | null {
  try {
    return localStorage.getItem(PREFERRED_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

// ============================================================================
// FIRESTORE SESSION TRACKING (users/{uid}/sessions/{sessionId})
// ============================================================================

export async function registerDeviceSession(params: {
  uid: string;
  sessionId: string;
  deviceId: string;
  activeWorkspaceId: string;
}): Promise<void> {
  const { uid, sessionId, deviceId, activeWorkspaceId } = params;
  if (!uid || !sessionId) return;

  const sessionDocRef = doc(db, 'users', uid, 'sessions', sessionId);
  const now = new Date().toISOString();

  const sessionData: DeviceSession = {
    uid,
    sessionId,
    deviceId,
    platform: typeof navigator !== 'undefined' ? navigator.platform || 'web' : 'web',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || 'unknown' : 'unknown',
    createdAt: now,
    lastSeenAt: now,
    status: 'active',
    appVersion: APP_VERSION,
    activeWorkspaceId
  };

  try {
    await setDoc(sessionDocRef, sessionData, { merge: true });
    logSyncDiagnostic('SESSION', `Registered active browser session: "${sessionId}" for UID: "${uid}"`, {
      deviceId,
      workspaceId: activeWorkspaceId
    });
  } catch (err) {
    logSyncDiagnostic('SESSION', `Failed to register session in Firestore (offline or rule error):`, err);
  }
}

export async function updateSessionHeartbeat(params: {
  uid: string;
  sessionId: string;
  status?: 'active' | 'idle';
  activeWorkspaceId?: string;
}): Promise<void> {
  const { uid, sessionId, status = 'active', activeWorkspaceId } = params;
  if (!uid || !sessionId) return;

  const sessionDocRef = doc(db, 'users', uid, 'sessions', sessionId);
  const payload: any = {
    lastSeenAt: new Date().toISOString(),
    status
  };
  if (activeWorkspaceId) {
    payload.activeWorkspaceId = activeWorkspaceId;
  }

  try {
    await setDoc(sessionDocRef, payload, { merge: true });
  } catch (err) {
    // Non-blocking heartbeat error
  }
}

export async function terminateDeviceSession(params: {
  uid: string;
  sessionId: string;
}): Promise<void> {
  const { uid, sessionId } = params;
  if (!uid || !sessionId) return;

  const sessionDocRef = doc(db, 'users', uid, 'sessions', sessionId);
  try {
    await setDoc(
      sessionDocRef,
      {
        status: 'terminated',
        lastSeenAt: new Date().toISOString()
      },
      { merge: true }
    );
    logSyncDiagnostic('SESSION', `Terminated session: "${sessionId}" for UID: "${uid}"`);
  } catch (err) {
    // ignore
  }
}

// ============================================================================
// GLOBAL SYNCHRONIZATION STATE (users/{uid}/sync/state)
// ============================================================================

export async function initUserSyncStateIfMissing(uid: string, initialWorkspaceId: string = DEFAULT_ORG_ID): Promise<UserSyncState> {
  const syncDocRef = doc(db, 'users', uid, 'sync', 'state');
  const now = new Date().toISOString();

  try {
    const snap = await getDoc(syncDocRef);
    if (snap.exists()) {
      return snap.data() as UserSyncState;
    }
  } catch (e) {
    logSyncDiagnostic('SYNC', `Reading initial sync state error:`, e);
  }

  const defaultState: UserSyncState = {
    uid,
    sessionVersion: 1,
    membershipVersion: 1,
    workspaceVersion: 1,
    notificationVersion: 1,
    activeWorkspaceId: initialWorkspaceId,
    updatedAt: now,
    lastReason: 'initial_creation'
  };

  try {
    await setDoc(syncDocRef, defaultState, { merge: true });
    logSyncDiagnostic('SYNC', `Initialized sync state for UID: "${uid}" at v1`);
  } catch (e) {
    logSyncDiagnostic('SYNC', `Failed to write initial sync state:`, e);
  }

  return defaultState;
}

export async function bumpUserSyncVersion(params: {
  uid: string;
  sessionVersion?: boolean;
  membershipVersion?: boolean;
  workspaceVersion?: boolean;
  notificationVersion?: boolean;
  activeWorkspaceId?: string;
  sessionId?: string;
  reason?: string;
}): Promise<void> {
  const {
    uid,
    sessionVersion,
    membershipVersion,
    workspaceVersion,
    notificationVersion,
    activeWorkspaceId,
    sessionId,
    reason = 'state_mutation'
  } = params;

  if (!uid) return;

  const syncDocRef = doc(db, 'users', uid, 'sync', 'state');
  const updates: any = {
    updatedAt: new Date().toISOString(),
    lastReason: reason
  };

  if (sessionId) updates.lastUpdatedBySessionId = sessionId;
  if (activeWorkspaceId) updates.activeWorkspaceId = activeWorkspaceId;
  if (sessionVersion) updates.sessionVersion = increment(1);
  if (membershipVersion) updates.membershipVersion = increment(1);
  if (workspaceVersion) updates.workspaceVersion = increment(1);
  if (notificationVersion) updates.notificationVersion = increment(1);

  try {
    await setDoc(syncDocRef, updates, { merge: true });
    logSyncDiagnostic('SYNC', `Bumped sync version for UID "${uid}". Reason: "${reason}"`, {
      sessionVersion,
      membershipVersion,
      workspaceVersion,
      notificationVersion
    });
  } catch (err) {
    logSyncDiagnostic('SYNC', `Failed to bump sync version in Firestore:`, err);
  }
}

// ============================================================================
// AUTHORITATIVE WORKSPACE & MEMBERSHIP RESOLUTION
// ============================================================================

export interface AuthoritativeTenancyResolution {
  workspaces: Organization[];
  memberships: Map<string, OrganizationMember>;
  activeWorkspaceId: string;
  activeOrganization: Organization | null;
  currentMember: OrganizationMember | null;
  currentRole: OrganizationRole;
  permissions: OrganizationPermission[];
}

export async function resolveAuthoritativeTenancy(params: {
  uid: string;
  email: string;
  preferredWorkspaceId?: string | null;
}): Promise<AuthoritativeTenancyResolution> {
  const { uid, email, preferredWorkspaceId } = params;
  const normalizedEmail = (email || '').toLowerCase().trim();

  logSyncDiagnostic('WORKSPACE', `Resolving authoritative tenancy for UID: "${uid}", Email: "${normalizedEmail}"`);

  const workspacesMap = new Map<string, Organization>();
  const membershipsMap = new Map<string, OrganizationMember>();

  // 1. Always check / initialize Default Organization
  try {
    const defaultOrg = await getOrCreateDefaultOrganization(uid, normalizedEmail);
    if (defaultOrg) {
      workspacesMap.set(defaultOrg.id, defaultOrg);
    }
  } catch (err) {
    logSyncDiagnostic('WORKSPACE', `Failed to fetch default organization:`, err);
  }

  // 2. Fetch Organizations owned by user
  try {
    const ownedQuery = query(collection(db, 'organizations'), where('ownerId', '==', uid));
    const ownedSnap = await getDocs(ownedQuery);
    ownedSnap.forEach(docSnap => {
      if (docSnap.exists()) {
        const org = docSnap.data() as Organization;
        workspacesMap.set(org.id, org);
      }
    });

    if (normalizedEmail) {
      const emailOwnedQuery = query(collection(db, 'organizations'), where('ownerEmail', '==', normalizedEmail));
      const emailOwnedSnap = await getDocs(emailOwnedQuery);
      emailOwnedSnap.forEach(docSnap => {
        if (docSnap.exists()) {
          const org = docSnap.data() as Organization;
          workspacesMap.set(org.id, org);
        }
      });
    }
  } catch (err) {
    logSyncDiagnostic('WORKSPACE', `Error querying owned organizations:`, err);
  }

  // 3. For every discovered workspace, fetch the membership for this UID
  for (const orgId of workspacesMap.keys()) {
    try {
      const memberDocRef = doc(db, 'organizations', orgId, 'members', uid);
      const memberSnap = await getDoc(memberDocRef);
      if (memberSnap.exists()) {
        const member = memberSnap.data() as OrganizationMember;
        membershipsMap.set(orgId, member);
      } else {
        const org = workspacesMap.get(orgId);
        // If user is owner or system admin, synthesize authoritative membership
        if (org && (org.ownerId === uid || org.ownerEmail === normalizedEmail || normalizedEmail === 'nyikulibramwel@gmail.com')) {
          const synthMember: OrganizationMember = {
            uid,
            organizationId: orgId,
            email: normalizedEmail || 'owner@enterprise.com',
            displayName: normalizedEmail === 'nyikulibramwel@gmail.com' ? 'System Administrator' : 'Workspace Owner',
            role: 'Owner',
            permissions: [...DEFAULT_ROLE_PERMISSIONS.Owner],
            status: 'active',
            joinedAt: org.createdAt || new Date().toISOString(),
            lastActive: new Date().toISOString()
          };
          membershipsMap.set(orgId, synthMember);
          // Persist in background
          setDoc(memberDocRef, synthMember, { merge: true }).catch(() => {});
        }
      }
    } catch (err) {
      logSyncDiagnostic('MEMBERSHIP', `Error fetching member doc for org "${orgId}":`, err);
    }
  }

  const allWorkspaces = Array.from(workspacesMap.values());

  // 4. Resolve Active Workspace:
  // Hierarchy:
  // a. Check if preferredWorkspaceId is valid and user has membership
  // b. Or pick the first workspace user has an 'Owner' role in
  // c. Or pick the first workspace in list
  // d. Fallback to DEFAULT_ORG_ID
  let resolvedActiveWorkspaceId = DEFAULT_ORG_ID;

  if (preferredWorkspaceId && workspacesMap.has(preferredWorkspaceId)) {
    resolvedActiveWorkspaceId = preferredWorkspaceId;
  } else {
    const ownedOrg = allWorkspaces.find(w => membershipsMap.get(w.id)?.role === 'Owner');
    if (ownedOrg) {
      resolvedActiveWorkspaceId = ownedOrg.id;
    } else if (allWorkspaces.length > 0) {
      resolvedActiveWorkspaceId = allWorkspaces[0].id;
    }
  }

  const activeOrganization = workspacesMap.get(resolvedActiveWorkspaceId) || null;
  const currentMember = membershipsMap.get(resolvedActiveWorkspaceId) || null;
  const currentRole: OrganizationRole = currentMember?.role || (normalizedEmail === 'nyikulibramwel@gmail.com' ? 'Owner' : 'Member');
  const permissions: OrganizationPermission[] = currentMember?.permissions || DEFAULT_ROLE_PERMISSIONS[currentRole] || [];

  logSyncDiagnostic('WORKSPACE', `Authoritative workspace resolved: "${resolvedActiveWorkspaceId}" (Role: ${currentRole}, Perms: ${permissions.length})`, {
    totalWorkspaces: allWorkspaces.length,
    activeOrgName: activeOrganization?.name
  });

  return {
    workspaces: allWorkspaces,
    memberships: membershipsMap,
    activeWorkspaceId: resolvedActiveWorkspaceId,
    activeOrganization,
    currentMember,
    currentRole,
    permissions
  };
}
