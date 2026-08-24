import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  ReactNode,
  useCallback
} from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import {
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationInvitation,
  OrganizationPermission,
  OrganizationAuditLog,
  CSVFile
} from '../types';
import {
  DEFAULT_ORG_ID,
  DEFAULT_ROLE_PERMISSIONS,
  getOrCreateDefaultOrganization,
  recordOrganizationAuditLog,
  broadcastSystemChatMessage
} from '../lib/teamTenancyService';
import {
  DeviceSession,
  UserSyncState,
  SyncConnectionStatus,
  getOrCreateDeviceId,
  generateSessionId,
  savePreferredWorkspaceId,
  getPreferredWorkspaceId,
  registerDeviceSession,
  updateSessionHeartbeat,
  terminateDeviceSession,
  initUserSyncStateIfMissing,
  bumpUserSyncVersion,
  resolveAuthoritativeTenancy,
  logSyncDiagnostic
} from '../lib/sessionSyncService';
import {
  saveWorkspaceFilesToStorage,
  loadWorkspaceFilesFromStorage
} from '../lib/fileStorage';
import { useAuth } from './AuthProvider';
import { useBilling } from './BillingContext';

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

export interface TeamTenancyContextType {
  // Session & Identity
  uid: string;
  sessionId: string;
  deviceId: string;
  userEmail: string;
  isOnline: boolean;
  isFromCache: boolean;
  isReconciling: boolean;
  synchronizationStatus: SyncConnectionStatus;
  lastSyncTimestamp: string;

  // Versions
  sessionVersion: number;
  membershipVersion: number;
  workspaceVersion: number;
  notificationVersion: number;

  // Tenancy & Authoritative Workspace
  activeWorkspaceId: string;
  activeOrganization: Organization | null;
  workspaces: Organization[];
  members: OrganizationMember[];
  currentMember: OrganizationMember | null;
  currentRole: OrganizationRole;
  permissions: OrganizationPermission[];
  hasPermission: (permission: OrganizationPermission) => boolean;
  isOwnerOrAdmin: boolean;
  isPrimaryOwner: boolean;
  isAuthorized: boolean;

  // Real-Time Invitations, Notifications & Logs
  incomingInvitations: OrganizationInvitation[];
  activeOrgInvitations: OrganizationInvitation[];
  pendingInviteForBanner: OrganizationInvitation | null;
  auditLogs: OrganizationAuditLog[];
  workspaceFiles: CSVFile[];
  isLoading: boolean;

  // Tenancy Actions
  reconcileSession: (reason?: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createInvite: (params: {
    email: string;
    role: 'Admin' | 'Member';
    orgName?: string;
  }) => Promise<{ success: boolean; invitation?: OrganizationInvitation; error?: string }>;
  acceptInvite: (tokenOrId: string) => Promise<{ success: boolean; member?: OrganizationMember; error?: string }>;
  cancelInvite: (inviteId: string) => Promise<{ success: boolean; error?: string }>;
  resendInvite: (inviteId: string) => Promise<{ success: boolean; invitation?: OrganizationInvitation; error?: string }>;
  updateMemberRole: (memberUid: string, role: OrganizationRole) => Promise<{ success: boolean; error?: string }>;
  updateMemberPermissions: (memberUid: string, permissions: OrganizationPermission[]) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberUid: string) => Promise<{ success: boolean; error?: string }>;
  updateOrgDetails: (name: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  dismissBannerInvite: (inviteId: string) => void;
  refreshTenancyState: () => Promise<void>;
}

const TeamTenancyContext = createContext<TeamTenancyContextType | undefined>(undefined);

// ============================================================================
// CENTRAL SESSION PROVIDER & COORDINATOR
// ============================================================================

export const TeamTenancyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const { billing } = useBilling();

  // Stable Client Device & Session Identifiers
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const sessionId = useMemo(() => generateSessionId(), []);

  // Connection & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [synchronizationStatus, setSynchronizationStatus] = useState<SyncConnectionStatus>('idle');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(new Date().toISOString());

  // Versions from users/{uid}/sync/state
  const [sessionVersion, setSessionVersion] = useState<number>(1);
  const [membershipVersion, setMembershipVersion] = useState<number>(1);
  const [workspaceVersion, setWorkspaceVersion] = useState<number>(1);
  const [notificationVersion, setNotificationVersion] = useState<number>(1);

  // Authoritative Tenancy State
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return getPreferredWorkspaceId() || DEFAULT_ORG_ID;
  });
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [workspaces, setWorkspaces] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null);
  const [currentRole, setCurrentRole] = useState<OrganizationRole>('Member');
  const [permissions, setPermissions] = useState<OrganizationPermission[]>([]);

  // Invitations, Logs, Files
  const [incomingInvitations, setIncomingInvitations] = useState<OrganizationInvitation[]>([]);
  const [activeOrgInvitations, setActiveOrgInvitations] = useState<OrganizationInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<OrganizationAuditLog[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<CSVFile[]>([]);
  const [dismissedInviteIds, setDismissedInviteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active Unsubscription References
  const unsubSyncStateRef = useRef<Unsubscribe | null>(null);
  const unsubIncomingInvitesRef = useRef<Unsubscribe | null>(null);
  const unsubOrgRef = useRef<Unsubscribe | null>(null);
  const unsubMembersRef = useRef<Unsubscribe | null>(null);
  const unsubOrgInvitesRef = useRef<Unsubscribe | null>(null);
  const unsubAuditLogsRef = useRef<Unsubscribe | null>(null);
  const unsubFilesRef = useRef<Unsubscribe | null>(null);
  const heartbeatTimerRef = useRef<any>(null);

  // Version tracking ref to avoid stale reconciliation loops
  const lastKnownVersionsRef = useRef({
    sessionVersion: 1,
    membershipVersion: 1,
    workspaceVersion: 1,
    notificationVersion: 1
  });

  const userEmail = (authUser?.email || '').toLowerCase().trim();
  const userUid = authUser?.uid || '';

  // Clean all active listeners
  const cleanupAllListeners = useCallback(() => {
    logSyncDiagnostic('LISTENER', 'Cleaning up all active Firestore listeners');
    if (unsubSyncStateRef.current) { unsubSyncStateRef.current(); unsubSyncStateRef.current = null; }
    if (unsubIncomingInvitesRef.current) { unsubIncomingInvitesRef.current(); unsubIncomingInvitesRef.current = null; }
    if (unsubOrgRef.current) { unsubOrgRef.current(); unsubOrgRef.current = null; }
    if (unsubMembersRef.current) { unsubMembersRef.current(); unsubMembersRef.current = null; }
    if (unsubOrgInvitesRef.current) { unsubOrgInvitesRef.current(); unsubOrgInvitesRef.current = null; }
    if (unsubAuditLogsRef.current) { unsubAuditLogsRef.current(); unsubAuditLogsRef.current = null; }
    if (unsubFilesRef.current) { unsubFilesRef.current(); unsubFilesRef.current = null; }
    if (heartbeatTimerRef.current) { clearInterval(heartbeatTimerRef.current); heartbeatTimerRef.current = null; }
  }, []);

  // ==========================================================================
  // AUTHORITATIVE SESSION RECONCILIATION
  // ==========================================================================
  const reconcileSession = useCallback(async (reason: string = 'manual_reconcile') => {
    if (!userUid) return;

    logSyncDiagnostic('SYNC', `Reconciling session for UID "${userUid}". Reason: "${reason}"`);
    setIsReconciling(true);
    setSynchronizationStatus('syncing');

    try {
      // 1. Resolve Authoritative Tenancy (workspaces, memberships, active workspace)
      const resolution = await resolveAuthoritativeTenancy({
        uid: userUid,
        email: userEmail,
        preferredWorkspaceId: activeWorkspaceId
      });

      setWorkspaces(resolution.workspaces);
      setActiveWorkspaceId(resolution.activeWorkspaceId);
      setActiveOrganization(resolution.activeOrganization);
      setCurrentMember(resolution.currentMember);
      setCurrentRole(resolution.currentRole);
      setPermissions(resolution.permissions);
      savePreferredWorkspaceId(resolution.activeWorkspaceId);

      // 2. Fetch Active Workspace Members
      try {
        const membersRef = collection(db, 'organizations', resolution.activeWorkspaceId, 'members');
        const membersSnap = await getDocs(membersRef);
        const membersList: OrganizationMember[] = [];
        membersSnap.forEach(d => {
          membersList.push({ ...(d.data() as OrganizationMember), uid: d.id });
        });
        setMembers(membersList);
      } catch (err) {
        logSyncDiagnostic('MEMBERSHIP', 'Error fetching members during reconcile:', err);
      }

      // 3. Fetch Workspace Files / Datasets
      try {
        const filesRef = query(
          collection(db, 'files'),
          where('workspaceId', '==', resolution.activeWorkspaceId)
        );
        const filesSnap = await getDocs(filesRef);
        const filesList: CSVFile[] = [];
        filesSnap.forEach(d => filesList.push(d.data() as CSVFile));
        setWorkspaceFiles(filesList);
        saveWorkspaceFilesToStorage(resolution.activeWorkspaceId, filesList);
      } catch (err) {
        logSyncDiagnostic('WORKSPACE', 'Error fetching workspace files during reconcile:', err);
      }

      setSynchronizationStatus('synced');
      setLastSyncTimestamp(new Date().toISOString());
      logSyncDiagnostic('SYNC', `Session reconciliation completed successfully for workspace "${resolution.activeWorkspaceId}"`);
    } catch (error) {
      logSyncDiagnostic('SYNC', `Error during session reconciliation:`, error);
      setSynchronizationStatus('error');
    } finally {
      setIsReconciling(false);
      setIsLoading(false);
    }
  }, [userUid, userEmail, activeWorkspaceId]);

  // ==========================================================================
  // 1. AUTH LIFECYCLE & GLOBAL SYNC STATE LISTENER (users/{uid}/sync/state)
  // ==========================================================================
  useEffect(() => {
    if (!authUser || !userUid) {
      cleanupAllListeners();
      setMembers([]);
      setWorkspaces([]);
      setIncomingInvitations([]);
      setActiveOrgInvitations([]);
      setAuditLogs([]);
      setWorkspaceFiles([]);
      setCurrentMember(null);
      setCurrentRole('Member');
      setPermissions([]);
      setSynchronizationStatus('idle');
      setIsLoading(false);
      return;
    }

    logSyncDiagnostic('AUTH', `Auth identity confirmed: UID="${userUid}", Email="${userEmail}"`);
    setSynchronizationStatus('syncing');

    // (a) Register active device session in Firestore
    registerDeviceSession({
      uid: userUid,
      sessionId,
      deviceId,
      activeWorkspaceId
    });

    // (b) Start Session Heartbeat Interval
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setInterval(() => {
      updateSessionHeartbeat({
        uid: userUid,
        sessionId,
        status: 'active',
        activeWorkspaceId
      });
    }, 30000);

    // (c) Initialize user sync document if missing
    initUserSyncStateIfMissing(userUid, activeWorkspaceId);

    // (d) Attach Real-time listener on users/{uid}/sync/state
    try {
      const syncDocRef = doc(db, 'users', userUid, 'sync', 'state');
      unsubSyncStateRef.current = onSnapshot(syncDocRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const syncState = docSnap.data() as UserSyncState;
        const fromCache = docSnap.metadata.fromCache;
        setIsFromCache(fromCache);

        logSyncDiagnostic('SYNC', `Received sync state snapshot (v: S${syncState.sessionVersion}/M${syncState.membershipVersion}/W${syncState.workspaceVersion}/N${syncState.notificationVersion}, cache: ${fromCache})`, {
          lastReason: syncState.lastReason,
          lastBySession: syncState.lastUpdatedBySessionId
        });

        const prev = lastKnownVersionsRef.current;
        const isNewer =
          (syncState.sessionVersion || 1) > prev.sessionVersion ||
          (syncState.membershipVersion || 1) > prev.membershipVersion ||
          (syncState.workspaceVersion || 1) > prev.workspaceVersion ||
          (syncState.notificationVersion || 1) > prev.notificationVersion;

        setSessionVersion(syncState.sessionVersion || 1);
        setMembershipVersion(syncState.membershipVersion || 1);
        setWorkspaceVersion(syncState.workspaceVersion || 1);
        setNotificationVersion(syncState.notificationVersion || 1);

        lastKnownVersionsRef.current = {
          sessionVersion: syncState.sessionVersion || 1,
          membershipVersion: syncState.membershipVersion || 1,
          workspaceVersion: syncState.workspaceVersion || 1,
          notificationVersion: syncState.notificationVersion || 1
        };

        if (isNewer && syncState.lastUpdatedBySessionId !== sessionId) {
          logSyncDiagnostic('SYNC', `Detected newer server version from another session. Triggering automated reconciliation...`);
          reconcileSession('cross_device_version_bump');
        }
      }, (err) => {
        logSyncDiagnostic('SYNC', `Error listening to sync state:`, err);
      });
    } catch (e) {
      logSyncDiagnostic('SYNC', `Failed to attach sync state listener:`, e);
    }

    // (e) Attach Inbound Invitations Listener across workspaceInvitations
    try {
      logSyncDiagnostic('INVITATIONS', `Attaching real-time listener for incoming invitations for ${userEmail}`);
      const invitesQuery = query(
        collection(db, 'workspaceInvitations'),
        where('status', '==', 'pending')
      );

      unsubIncomingInvitesRef.current = onSnapshot(invitesQuery, (snap) => {
        const list: OrganizationInvitation[] = [];
        const now = Date.now();
        snap.forEach((docSnap) => {
          const inv = docSnap.data() as OrganizationInvitation;
          if (
            inv &&
            inv.status === 'pending' &&
            new Date(inv.expiresAt).getTime() > now &&
            ((inv.email && inv.email.toLowerCase().trim() === userEmail) || (inv as any).inviteeUid === userUid)
          ) {
            list.push(inv);
          }
        });

        logSyncDiagnostic('INVITATIONS', `Discovered ${list.length} pending incoming invitation(s) for "${userEmail}"`);
        setIncomingInvitations(list);
      }, (err) => {
        logSyncDiagnostic('INVITATIONS', 'Error in workspaceInvitations listener:', err);
      });
    } catch (e) {
      logSyncDiagnostic('INVITATIONS', 'Failed to attach incoming invites listener:', e);
    }

    // Initial session reconciliation
    reconcileSession('initial_mount');

    // Cleanup on unmount or auth change
    return () => {
      terminateDeviceSession({ uid: userUid, sessionId });
      cleanupAllListeners();
    };
  }, [userUid, userEmail, sessionId, deviceId]);

  // ==========================================================================
  // 2. ACTIVE WORKSPACE REAL-TIME LISTENERS
  // ==========================================================================
  useEffect(() => {
    if (!authUser || !userUid || !activeWorkspaceId) return;

    logSyncDiagnostic('WORKSPACE', `Attaching real-time listeners for workspace "${activeWorkspaceId}"`);

    // Clean previous workspace-scoped listeners
    if (unsubOrgRef.current) { unsubOrgRef.current(); unsubOrgRef.current = null; }
    if (unsubMembersRef.current) { unsubMembersRef.current(); unsubMembersRef.current = null; }
    if (unsubOrgInvitesRef.current) { unsubOrgInvitesRef.current(); unsubOrgInvitesRef.current = null; }
    if (unsubAuditLogsRef.current) { unsubAuditLogsRef.current(); unsubAuditLogsRef.current = null; }
    if (unsubFilesRef.current) { unsubFilesRef.current(); unsubFilesRef.current = null; }

    // (a) Active Organization Document Listener
    try {
      const orgRef = doc(db, 'organizations', activeWorkspaceId);
      unsubOrgRef.current = onSnapshot(orgRef, (docSnap) => {
        if (docSnap.exists()) {
          const orgData = docSnap.data() as Organization;
          logSyncDiagnostic('WORKSPACE', `Organization details updated: "${orgData.name}"`);
          setActiveOrganization(orgData);
          setWorkspaces(prev => {
            const map = new Map<string, Organization>();
            map.set(orgData.id, orgData);
            prev.forEach(w => { if (w.id !== orgData.id) map.set(w.id, w); });
            return Array.from(map.values());
          });
        }
      }, (err) => {
        logSyncDiagnostic('WORKSPACE', 'Error listening to organization document:', err);
      });
    } catch (e) {
      logSyncDiagnostic('WORKSPACE', 'Org listener setup error:', e);
    }

    // (b) Active Workspace Members Collection Listener
    try {
      const membersRef = collection(db, 'organizations', activeWorkspaceId, 'members');
      unsubMembersRef.current = onSnapshot(membersRef, (snap) => {
        const membersList: OrganizationMember[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as OrganizationMember;
          membersList.push({
            ...data,
            uid: docSnap.id || data.uid
          });
        });

        logSyncDiagnostic('MEMBERSHIP', `Workspace members updated: ${membersList.length} member(s)`);
        setMembers(membersList);

        // Update current member & role
        const me = membersList.find(m => m.uid === userUid || (m.email && m.email.toLowerCase().trim() === userEmail));
        if (me) {
          setCurrentMember(me);
          setCurrentRole(me.role);
          setPermissions(me.permissions || DEFAULT_ROLE_PERMISSIONS[me.role] || DEFAULT_ROLE_PERMISSIONS.Member);
        }
      }, (err) => {
        logSyncDiagnostic('MEMBERSHIP', 'Error listening to workspace members:', err);
      });
    } catch (e) {
      logSyncDiagnostic('MEMBERSHIP', 'Members listener setup error:', e);
    }

    // (c) Active Workspace Outgoing Invitations Listener
    try {
      const orgInvitesRef = collection(db, 'organizations', activeWorkspaceId, 'invitations');
      unsubOrgInvitesRef.current = onSnapshot(orgInvitesRef, (snap) => {
        const list: OrganizationInvitation[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as OrganizationInvitation);
        });
        setActiveOrgInvitations(list);
      }, (err) => {
        logSyncDiagnostic('INVITATIONS', 'Error listening to org invitations:', err);
      });
    } catch (e) {
      logSyncDiagnostic('INVITATIONS', 'Org invites listener setup error:', e);
    }

    // (d) Active Workspace Audit Logs Listener
    try {
      const auditLogsRef = collection(db, 'organizations', activeWorkspaceId, 'audit_logs');
      unsubAuditLogsRef.current = onSnapshot(auditLogsRef, (snap) => {
        const list: OrganizationAuditLog[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as OrganizationAuditLog);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(list);
      }, (err) => {
        logSyncDiagnostic('LISTENER', 'Audit logs listener notice:', err);
      });
    } catch (e) {
      logSyncDiagnostic('LISTENER', 'Audit logs setup error:', e);
    }

    // (e) Workspace Datasets Listener (Fixes 11 vs 6,058 record discrepancy!)
    try {
      logSyncDiagnostic('WORKSPACE', `Attaching real-time files listener for workspace "${activeWorkspaceId}"`);
      const filesQuery = query(
        collection(db, 'files'),
        where('workspaceId', '==', activeWorkspaceId)
      );

      unsubFilesRef.current = onSnapshot(filesQuery, (snap) => {
        const filesList: CSVFile[] = [];
        snap.forEach((docSnap) => {
          filesList.push(docSnap.data() as CSVFile);
        });

        logSyncDiagnostic('WORKSPACE', `Received ${filesList.length} authoritative dataset(s) for workspace "${activeWorkspaceId}"`);
        setWorkspaceFiles(filesList);
        saveWorkspaceFilesToStorage(activeWorkspaceId, filesList);
      }, (err) => {
        logSyncDiagnostic('WORKSPACE', 'Error querying workspace files:', err);
      });
    } catch (e) {
      logSyncDiagnostic('WORKSPACE', 'Files listener setup error:', e);
    }

    return () => {
      if (unsubOrgRef.current) unsubOrgRef.current();
      if (unsubMembersRef.current) unsubMembersRef.current();
      if (unsubOrgInvitesRef.current) unsubOrgInvitesRef.current();
      if (unsubAuditLogsRef.current) unsubAuditLogsRef.current();
      if (unsubFilesRef.current) unsubFilesRef.current();
    };
  }, [activeWorkspaceId, userUid, userEmail]);

  // ==========================================================================
  // 3. NETWORK RECONNECTION & VISIBILITY SYNC HANDLERS
  // ==========================================================================
  useEffect(() => {
    const handleOnline = () => {
      logSyncDiagnostic('SYNC', 'Network connection restored. Reconnecting listeners and reconciling...');
      setIsOnline(true);
      setSynchronizationStatus('reconnecting');
      reconcileSession('network_online_reconnect');
    };

    const handleOffline = () => {
      logSyncDiagnostic('SYNC', 'Network connection lost. Entering offline cache mode.');
      setIsOnline(false);
      setSynchronizationStatus('reconnecting');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userUid) {
        logSyncDiagnostic('SYNC', 'Tab visibility restored. Verifying session...');
        updateSessionHeartbeat({ uid: userUid, sessionId, status: 'active', activeWorkspaceId });
        reconcileSession('tab_visibility_focused');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userUid, sessionId, activeWorkspaceId, reconcileSession]);

  // ==========================================================================
  // 4. DERIVED PERMISSIONS & HELPERS
  // ==========================================================================
  const isPrimaryOwner = useMemo(() => {
    if (!userEmail) return false;
    return userEmail === 'nyikulibramwel@gmail.com' || (activeOrganization?.ownerEmail?.toLowerCase() === userEmail);
  }, [userEmail, activeOrganization?.ownerEmail]);

  const isOwnerOrAdmin = useMemo(() => {
    return isPrimaryOwner || currentRole === 'Owner' || currentRole === 'Admin';
  }, [isPrimaryOwner, currentRole]);

  const isAuthorized = Boolean(authUser && (isPrimaryOwner || currentMember || userEmail === 'nyikulibramwel@gmail.com'));

  const hasPermission = useCallback((permission: OrganizationPermission): boolean => {
    if (isPrimaryOwner) return true;
    return permissions.includes(permission);
  }, [isPrimaryOwner, permissions]);

  const pendingInviteForBanner = useMemo(() => {
    if (!userEmail) return null;
    return incomingInvitations.find(
      inv => inv.status === 'pending' &&
             !dismissedInviteIds.has(inv.id) &&
             new Date(inv.expiresAt).getTime() > Date.now()
    ) || null;
  }, [incomingInvitations, userEmail, dismissedInviteIds]);

  const dismissBannerInvite = useCallback((inviteId: string) => {
    setDismissedInviteIds(prev => new Set(prev).add(inviteId));
  }, []);

  // ==========================================================================
  // 5. TENANCY ACTIONS & MUTATIONS
  // ==========================================================================
  const switchWorkspace = async (workspaceId: string) => {
    logSyncDiagnostic('WORKSPACE', `Switching active workspace to: "${workspaceId}"`);
    setActiveWorkspaceId(workspaceId);
    savePreferredWorkspaceId(workspaceId);
    if (userUid) {
      updateSessionHeartbeat({ uid: userUid, sessionId, activeWorkspaceId: workspaceId });
      bumpUserSyncVersion({ uid: userUid, workspaceVersion: true, activeWorkspaceId: workspaceId, sessionId, reason: 'switch_workspace' });
    }
  };

  const createInvite = async (params: {
    email: string;
    role: 'Admin' | 'Member';
    orgName?: string;
  }): Promise<{ success: boolean; invitation?: OrganizationInvitation; error?: string }> => {
    if (!userUid || !userEmail) {
      return { success: false, error: 'You must be authenticated to invite members.' };
    }
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required to invite new members.' };
    }

    const targetEmail = params.email.toLowerCase().trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const existingMember = members.find(m => m.email.toLowerCase().trim() === targetEmail && m.status === 'active');
    if (existingMember) {
      return { success: false, error: `${targetEmail} is already an active member of this organization.` };
    }

    const inviteId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitation: OrganizationInvitation = {
      id: inviteId,
      organizationId: activeWorkspaceId,
      organizationName: params.orgName || activeOrganization?.name || 'Enterprise Data Workspace',
      email: targetEmail,
      role: params.role,
      status: 'pending',
      invitedBy: userUid,
      invitedByEmail: userEmail,
      invitedByName: authUser?.displayName || userEmail.split('@')[0],
      token,
      createdAt: nowIso,
      expiresAt: expiresIso
    };

    try {
      logSyncDiagnostic('INVITATIONS', `Creating invitation for "${targetEmail}" (${params.role}) in workspace "${activeWorkspaceId}"`);

      // Write to both subcollection and top-level
      await setDoc(doc(db, 'organizations', activeWorkspaceId, 'invitations', inviteId), invitation);
      await setDoc(doc(db, 'workspaceInvitations', inviteId), invitation);

      // Record Audit Log
      recordOrganizationAuditLog({
        orgId: activeWorkspaceId,
        action: 'member.invited',
        actor: {
          uid: userUid,
          email: userEmail,
          displayName: authUser?.displayName || userEmail.split('@')[0],
          role: currentRole
        },
        target: { id: inviteId, email: targetEmail, type: 'invitation' },
        metadata: { role: params.role, expiresAt: expiresIso }
      }).catch(() => {});

      // Broadcast Chat notice
      broadcastSystemChatMessage({
        tenantId: activeWorkspaceId,
        text: `${authUser?.displayName || userEmail.split('@')[0]} dispatched an invitation to ${targetEmail} (${params.role}).`
      }).catch(() => {});

      // Bump sync version for instant cross-device pickup
      bumpUserSyncVersion({
        uid: userUid,
        notificationVersion: true,
        membershipVersion: true,
        sessionId,
        reason: 'invite_created'
      });

      return { success: true, invitation };
    } catch (err: any) {
      logSyncDiagnostic('INVITATIONS', 'Error creating invitation:', err);
      return { success: false, error: err?.message || 'Failed to create invitation in Firestore.' };
    }
  };

  const acceptInvite = async (
    tokenOrId: string
  ): Promise<{ success: boolean; member?: OrganizationMember; error?: string }> => {
    if (!userUid || !userEmail) {
      return { success: false, error: 'Authentication required. Please sign in to accept this invitation.' };
    }

    logSyncDiagnostic('INVITATIONS', `Accepting invitation "${tokenOrId}" for user "${userEmail}"`);

    try {
      let matchedInvitation: OrganizationInvitation | null = null;
      let matchedOrgId = activeWorkspaceId;

      // Locate invitation in top-level
      const topSnap = await getDocs(query(collection(db, 'workspaceInvitations'), where('status', '==', 'pending')));
      topSnap.forEach(d => {
        const data = d.data() as OrganizationInvitation;
        if (data.id === tokenOrId || data.token === tokenOrId || (data.email.toLowerCase().trim() === userEmail && data.status === 'pending')) {
          matchedInvitation = data;
          if (data.organizationId) matchedOrgId = data.organizationId;
        }
      });

      if (!matchedInvitation) {
        // Check subcollection
        const subSnap = await getDocs(collection(db, 'organizations', activeWorkspaceId, 'invitations'));
        subSnap.forEach(d => {
          const data = d.data() as OrganizationInvitation;
          if (data.id === tokenOrId || data.token === tokenOrId || (data.email.toLowerCase().trim() === userEmail && data.status === 'pending')) {
            matchedInvitation = data;
            matchedOrgId = activeWorkspaceId;
          }
        });
      }

      if (!matchedInvitation) {
        return { success: false, error: 'Invitation not found or expired. Please request a new invitation.' };
      }

      const inv: OrganizationInvitation = matchedInvitation;
      if (inv.status === 'accepted') {
        return { success: false, error: 'This invitation has already been accepted.' };
      }
      if (inv.status === 'cancelled') {
        return { success: false, error: 'This invitation has been cancelled by an administrator.' };
      }
      if (new Date(inv.expiresAt).getTime() <= Date.now()) {
        return { success: false, error: 'This invitation has expired.' };
      }

      const nowIso = new Date().toISOString();
      const assignedPermissions = DEFAULT_ROLE_PERMISSIONS[inv.role] || DEFAULT_ROLE_PERMISSIONS.Member;

      const newMember: OrganizationMember = {
        uid: userUid,
        organizationId: matchedOrgId,
        email: userEmail,
        displayName: authUser?.displayName || userEmail.split('@')[0] || 'Team Member',
        role: inv.role,
        permissions: assignedPermissions,
        status: 'active',
        joinedAt: nowIso,
        lastActive: nowIso,
        avatar: authUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authUser?.displayName || userEmail)}&backgroundColor=3b82f6`
      };

      // 1. Create member in Firestore
      await setDoc(doc(db, 'organizations', matchedOrgId, 'members', userUid), newMember);

      // 2. Mark accepted in both collections
      await updateDoc(doc(db, 'workspaceInvitations', inv.id), {
        status: 'accepted',
        acceptedAt: nowIso,
        acceptedByUid: userUid
      }).catch(() => {});

      await updateDoc(doc(db, 'organizations', matchedOrgId, 'invitations', inv.id), {
        status: 'accepted',
        acceptedAt: nowIso,
        acceptedByUid: userUid
      }).catch(() => {});

      // 3. Switch workspace & bump sync
      setActiveWorkspaceId(matchedOrgId);
      savePreferredWorkspaceId(matchedOrgId);

      bumpUserSyncVersion({
        uid: userUid,
        membershipVersion: true,
        workspaceVersion: true,
        activeWorkspaceId: matchedOrgId,
        sessionId,
        reason: 'invite_accepted'
      });

      if (inv.invitedBy) {
        bumpUserSyncVersion({
          uid: inv.invitedBy,
          membershipVersion: true,
          reason: 'member_joined'
        });
      }

      // 4. Record audit log
      recordOrganizationAuditLog({
        orgId: matchedOrgId,
        action: 'member.accepted',
        actor: {
          uid: userUid,
          email: userEmail,
          displayName: newMember.displayName,
          role: newMember.role
        },
        target: { id: inv.id, uid: userUid, email: userEmail, name: newMember.displayName, type: 'member' },
        metadata: { role: inv.role, inviteId: inv.id }
      }).catch(() => {});

      // 5. Broadcast Chat event
      broadcastSystemChatMessage({
        tenantId: matchedOrgId,
        text: `${newMember.displayName} accepted the team invitation and joined as ${newMember.role}.`
      }).catch(() => {});

      logSyncDiagnostic('MEMBERSHIP', `Successfully joined workspace "${matchedOrgId}" as ${newMember.role}`);
      return { success: true, member: newMember };
    } catch (err: any) {
      logSyncDiagnostic('INVITATIONS', 'Error accepting invitation:', err);
      return { success: false, error: err?.message || 'Failed to accept invitation.' };
    }
  };

  const cancelInvite = async (inviteId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required.' };
    }

    try {
      const updates = { status: 'cancelled' as const, cancelledAt: new Date().toISOString() };
      await updateDoc(doc(db, 'organizations', activeWorkspaceId, 'invitations', inviteId), updates).catch(() => {});
      await updateDoc(doc(db, 'workspaceInvitations', inviteId), updates).catch(() => {});

      bumpUserSyncVersion({
        uid: userUid,
        notificationVersion: true,
        membershipVersion: true,
        sessionId,
        reason: 'invite_cancelled'
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to cancel invitation.' };
    }
  };

  const resendInvite = async (inviteId: string): Promise<{ success: boolean; invitation?: OrganizationInvitation; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required.' };
    }

    try {
      const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const updates = {
        expiresAt: expiresIso,
        status: 'pending' as const,
        resurrectedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'organizations', activeWorkspaceId, 'invitations', inviteId), updates);
      await updateDoc(doc(db, 'workspaceInvitations', inviteId), updates).catch(() => {});

      bumpUserSyncVersion({
        uid: userUid,
        notificationVersion: true,
        sessionId,
        reason: 'invite_resent'
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to resend invitation.' };
    }
  };

  const updateMemberRole = async (memberUid: string, role: OrganizationRole): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required to modify roles.' };
    }

    try {
      logSyncDiagnostic('PERMISSIONS', `Updating role for member "${memberUid}" to "${role}"`);
      const assignedPermissions = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.Member;
      const memberRef = doc(db, 'organizations', activeWorkspaceId, 'members', memberUid);

      await updateDoc(memberRef, {
        role,
        permissions: assignedPermissions,
        updatedAt: new Date().toISOString()
      });

      bumpUserSyncVersion({
        uid: userUid,
        membershipVersion: true,
        sessionId,
        reason: 'role_updated'
      });

      if (memberUid !== userUid) {
        bumpUserSyncVersion({
          uid: memberUid,
          membershipVersion: true,
          reason: 'role_updated_by_admin'
        });
      }

      recordOrganizationAuditLog({
        orgId: activeWorkspaceId,
        action: 'member.role_updated',
        actor: {
          uid: userUid,
          email: userEmail,
          displayName: authUser?.displayName || userEmail.split('@')[0],
          role: currentRole
        },
        target: { uid: memberUid, type: 'member' },
        metadata: { newRole: role }
      }).catch(() => {});

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update member role.' };
    }
  };

  const updateMemberPermissions = async (memberUid: string, perms: OrganizationPermission[]): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required to modify permissions.' };
    }

    try {
      logSyncDiagnostic('PERMISSIONS', `Updating permissions for member "${memberUid}":`, perms);
      const memberRef = doc(db, 'organizations', activeWorkspaceId, 'members', memberUid);

      await updateDoc(memberRef, {
        permissions: perms,
        updatedAt: new Date().toISOString()
      });

      bumpUserSyncVersion({
        uid: userUid,
        membershipVersion: true,
        sessionId,
        reason: 'permissions_updated'
      });

      if (memberUid !== userUid) {
        bumpUserSyncVersion({
          uid: memberUid,
          membershipVersion: true,
          reason: 'permissions_updated_by_admin'
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update permissions.' };
    }
  };

  const removeMember = async (memberUid: string): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required to remove members.' };
    }

    try {
      logSyncDiagnostic('MEMBERSHIP', `Removing member "${memberUid}" from workspace "${activeWorkspaceId}"`);
      const memberRef = doc(db, 'organizations', activeWorkspaceId, 'members', memberUid);
      await deleteDoc(memberRef);

      bumpUserSyncVersion({
        uid: userUid,
        membershipVersion: true,
        sessionId,
        reason: 'member_removed'
      });

      if (memberUid !== userUid) {
        bumpUserSyncVersion({
          uid: memberUid,
          membershipVersion: true,
          workspaceVersion: true,
          reason: 'removed_from_workspace'
        });
      }

      recordOrganizationAuditLog({
        orgId: activeWorkspaceId,
        action: 'member.removed',
        actor: {
          uid: userUid,
          email: userEmail,
          displayName: authUser?.displayName || userEmail.split('@')[0],
          role: currentRole
        },
        target: { uid: memberUid, type: 'member' },
        metadata: { removedAt: new Date().toISOString() }
      }).catch(() => {});

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to remove member.' };
    }
  };

  const updateOrgDetails = async (name: string, description?: string): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required to update workspace details.' };
    }

    try {
      const orgRef = doc(db, 'organizations', activeWorkspaceId);
      await updateDoc(orgRef, {
        name,
        description: description || '',
        updatedAt: new Date().toISOString()
      });

      bumpUserSyncVersion({
        uid: userUid,
        workspaceVersion: true,
        sessionId,
        reason: 'workspace_details_updated'
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update organization details.' };
    }
  };

  const refreshTenancyState = async (): Promise<void> => {
    await reconcileSession('manual_refresh_request');
  };

  return (
    <TeamTenancyContext.Provider
      value={{
        uid: userUid,
        sessionId,
        deviceId,
        userEmail,
        isOnline,
        isFromCache,
        isReconciling,
        synchronizationStatus,
        lastSyncTimestamp,
        sessionVersion,
        membershipVersion,
        workspaceVersion,
        notificationVersion,
        activeWorkspaceId,
        activeOrganization,
        workspaces,
        members,
        currentMember,
        currentRole,
        permissions,
        hasPermission,
        isOwnerOrAdmin,
        isPrimaryOwner,
        isAuthorized,
        incomingInvitations,
        activeOrgInvitations,
        pendingInviteForBanner,
        auditLogs,
        workspaceFiles,
        isLoading,
        reconcileSession,
        switchWorkspace,
        createInvite,
        acceptInvite,
        cancelInvite,
        resendInvite,
        updateMemberRole,
        updateMemberPermissions,
        removeMember,
        updateOrgDetails,
        dismissBannerInvite,
        refreshTenancyState
      }}
    >
      {children}
    </TeamTenancyContext.Provider>
  );
};

export const useTeamTenancy = (): TeamTenancyContextType => {
  const context = useContext(TeamTenancyContext);
  if (!context) {
    throw new Error('useTeamTenancy must be used within a TeamTenancyProvider');
  }
  return context;
};

// Aliases for explicit SessionCoordinator naming
export const SessionCoordinator = TeamTenancyContext;
export const SessionProvider = TeamTenancyProvider;
export const useSessionCoordinator = useTeamTenancy;
