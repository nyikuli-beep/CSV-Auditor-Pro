import React, { createContext, useContext, useEffect, useState, useRef, useMemo, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
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
  Unsubscribe
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
  isOrganizationAdmin,
  isOrganizationOwner,
  getMemberPermissions,
  hasPermission as checkHasPermission,
  getOrCreateDefaultOrganization,
  recordOrganizationAuditLog,
  broadcastSystemChatMessage
} from '../lib/teamTenancyService';
import { useAuth } from './AuthProvider';
import { useBilling } from './BillingContext';

export interface TeamTenancyContextType {
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
  incomingInvitations: OrganizationInvitation[];
  activeOrgInvitations: OrganizationInvitation[];
  pendingInviteForBanner: OrganizationInvitation | null;
  auditLogs: OrganizationAuditLog[];
  workspaceFiles: CSVFile[];
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => void;
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

export const TeamTenancyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const { billing } = useBilling();

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(DEFAULT_ORG_ID);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [workspaces, setWorkspaces] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<OrganizationInvitation[]>([]);
  const [activeOrgInvitations, setActiveOrgInvitations] = useState<OrganizationInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<OrganizationAuditLog[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<CSVFile[]>([]);
  const [dismissedInviteIds, setDismissedInviteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active unsubscription refs for bullet-proof listener lifecycles
  const unsubOrgRef = useRef<Unsubscribe | null>(null);
  const unsubMembersRef = useRef<Unsubscribe | null>(null);
  const unsubOrgInvitesRef = useRef<Unsubscribe | null>(null);
  const unsubUserInvitesRef = useRef<Unsubscribe | null>(null);
  const unsubTopLevelInvitesRef = useRef<Unsubscribe | null>(null);
  const unsubAuditLogsRef = useRef<Unsubscribe | null>(null);
  const unsubFilesRef = useRef<Unsubscribe | null>(null);

  const cleanupListeners = () => {
    console.log('[TEAM LISTENER] Cleaning up all active Firestore listeners');
    if (unsubOrgRef.current) { unsubOrgRef.current(); unsubOrgRef.current = null; }
    if (unsubMembersRef.current) { unsubMembersRef.current(); unsubMembersRef.current = null; }
    if (unsubOrgInvitesRef.current) { unsubOrgInvitesRef.current(); unsubOrgInvitesRef.current = null; }
    if (unsubUserInvitesRef.current) { unsubUserInvitesRef.current(); unsubUserInvitesRef.current = null; }
    if (unsubTopLevelInvitesRef.current) { unsubTopLevelInvitesRef.current(); unsubTopLevelInvitesRef.current = null; }
    if (unsubAuditLogsRef.current) { unsubAuditLogsRef.current(); unsubAuditLogsRef.current = null; }
    if (unsubFilesRef.current) { unsubFilesRef.current(); unsubFilesRef.current = null; }
  };

  const userEmail = (authUser?.email || '').toLowerCase().trim();
  const userUid = authUser?.uid || '';

  // -------------------------------------------------------------
  // 1. Core Auth & User-Directed Inbound Invitation Listener
  // -------------------------------------------------------------
  useEffect(() => {
    if (!authUser || !userEmail) {
      cleanupListeners();
      setMembers([]);
      setIncomingInvitations([]);
      setActiveOrgInvitations([]);
      setAuditLogs([]);
      setWorkspaceFiles([]);
      setIsLoading(false);
      return;
    }

    console.log(`[TEAM AUTH] User authenticated with UID: "${userUid}", email: "${userEmail}"`);

    // Clean previous user-specific listeners
    if (unsubUserInvitesRef.current) { unsubUserInvitesRef.current(); unsubUserInvitesRef.current = null; }
    if (unsubTopLevelInvitesRef.current) { unsubTopLevelInvitesRef.current(); unsubTopLevelInvitesRef.current = null; }

    // Listener A: Query top-level `workspaceInvitations` matching recipient email or UID
    try {
      console.log(`[TEAM INVITATIONS] Attaching real-time listener for incoming user invitations`);
      const invitesQuery = query(
        collection(db, 'workspaceInvitations'),
        where('status', '==', 'pending')
      );

      unsubTopLevelInvitesRef.current = onSnapshot(invitesQuery, (snap) => {
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

        console.log(`[TEAM INVITATIONS] Received ${list.length} pending incoming invitation(s) for ${userEmail}`);
        setIncomingInvitations(list);
      }, (err) => {
        console.warn('[TEAM INVITATIONS] Error listening to workspaceInvitations:', err);
      });
    } catch (e) {
      console.warn('[TEAM INVITATIONS] Failed to attach workspaceInvitations listener:', e);
    }

    // Listener B: Also listen to default org subcollection invitations
    try {
      const defaultOrgInvitesQuery = collection(db, 'organizations', DEFAULT_ORG_ID, 'invitations');
      unsubUserInvitesRef.current = onSnapshot(defaultOrgInvitesQuery, (snap) => {
        const list: OrganizationInvitation[] = [];
        const now = Date.now();
        snap.forEach((docSnap) => {
          const inv = docSnap.data() as OrganizationInvitation;
          if (
            inv &&
            inv.status === 'pending' &&
            new Date(inv.expiresAt).getTime() > now &&
            inv.email && inv.email.toLowerCase().trim() === userEmail
          ) {
            list.push(inv);
          }
        });
        
        setIncomingInvitations(prev => {
          const map = new Map<string, OrganizationInvitation>();
          prev.forEach(i => map.set(i.id, i));
          list.forEach(i => map.set(i.id, i));
          return Array.from(map.values());
        });
      }, (err) => {
        console.warn('[TEAM INVITATIONS] Default org invitations listener warning:', err);
      });
    } catch (e) {
      console.warn('[TEAM INVITATIONS] Failed to attach default org invites listener:', e);
    }

    return () => {
      if (unsubUserInvitesRef.current) unsubUserInvitesRef.current();
      if (unsubTopLevelInvitesRef.current) unsubTopLevelInvitesRef.current();
    };
  }, [userUid, userEmail]);

  // -------------------------------------------------------------
  // 2. Active Workspace & Scoped Tenancy Listeners
  // -------------------------------------------------------------
  useEffect(() => {
    if (!authUser || !userUid) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    console.log(`[TEAM WORKSPACE] Resolving active workspace for ID: "${activeWorkspaceId}"`);

    // (a) Ensure Organization doc exists and subscribe
    getOrCreateDefaultOrganization(userUid, userEmail, authUser.displayName || userEmail.split('@')[0])
      .then((org) => {
        if (isMounted && org) {
          setActiveOrganization(org);
          setWorkspaces([org]);
        }
      })
      .catch((err) => {
        console.warn('[TEAM WORKSPACE] Error getting/creating default organization:', err);
      });

    // Clean up previous workspace listeners
    if (unsubOrgRef.current) { unsubOrgRef.current(); unsubOrgRef.current = null; }
    if (unsubMembersRef.current) { unsubMembersRef.current(); unsubMembersRef.current = null; }
    if (unsubOrgInvitesRef.current) { unsubOrgInvitesRef.current(); unsubOrgInvitesRef.current = null; }
    if (unsubAuditLogsRef.current) { unsubAuditLogsRef.current(); unsubAuditLogsRef.current = null; }
    if (unsubFilesRef.current) { unsubFilesRef.current(); unsubFilesRef.current = null; }

    // 1. Subscribe to active Organization doc
    try {
      const orgRef = doc(db, 'organizations', activeWorkspaceId);
      unsubOrgRef.current = onSnapshot(orgRef, (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const orgData = docSnap.data() as Organization;
          console.log(`[TEAM WORKSPACE] Organization details updated: "${orgData.name}"`);
          setActiveOrganization(orgData);
          setWorkspaces(prev => {
            const map = new Map<string, Organization>();
            map.set(orgData.id, orgData);
            prev.forEach(w => { if (w.id !== orgData.id) map.set(w.id, w); });
            return Array.from(map.values());
          });
        }
      }, (err) => {
        console.warn('[TEAM WORKSPACE] Error listening to organization doc:', err);
      });
    } catch (e) {
      console.warn('[TEAM WORKSPACE] Listener setup error for org:', e);
    }

    // 2. Subscribe to Organization Members
    try {
      console.log(`[TEAM MEMBERSHIP] Attaching real-time listener for workspace "${activeWorkspaceId}" members`);
      const membersRef = collection(db, 'organizations', activeWorkspaceId, 'members');
      unsubMembersRef.current = onSnapshot(membersRef, (snap) => {
        if (!isMounted) return;
        const membersList: OrganizationMember[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as OrganizationMember;
          membersList.push({
            ...data,
            uid: docSnap.id || data.uid
          });
        });

        console.log(`[TEAM MEMBERSHIP] Snapshot updated: ${membersList.length} active member(s)`);
        setMembers(membersList);
        setIsLoading(false);
      }, (err) => {
        console.warn('[TEAM MEMBERSHIP] Error listening to members:', err);
        setIsLoading(false);
      });
    } catch (e) {
      console.warn('[TEAM MEMBERSHIP] Listener setup error for members:', e);
      setIsLoading(false);
    }

    // 3. Subscribe to Organization Outgoing Invitations
    try {
      const orgInvitesRef = collection(db, 'organizations', activeWorkspaceId, 'invitations');
      unsubOrgInvitesRef.current = onSnapshot(orgInvitesRef, (snap) => {
        if (!isMounted) return;
        const list: OrganizationInvitation[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as OrganizationInvitation);
        });
        setActiveOrgInvitations(list);
      }, (err) => {
        console.warn('[TEAM INVITATIONS] Error listening to org invitations:', err);
      });
    } catch (e) {
      console.warn('[TEAM INVITATIONS] Listener setup error for org invitations:', e);
    }

    // 4. Subscribe to Organization Audit Logs
    try {
      const auditLogsRef = collection(db, 'organizations', activeWorkspaceId, 'audit_logs');
      unsubAuditLogsRef.current = onSnapshot(auditLogsRef, (snap) => {
        if (!isMounted) return;
        const list: OrganizationAuditLog[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as OrganizationAuditLog);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(list);
      }, (err) => {
        console.warn('[TEAM LISTENER] Audit logs listener notice:', err);
      });
    } catch (e) {
      console.warn('[TEAM LISTENER] Error setting up audit logs listener:', e);
    }

    // 5. Subscribe to Workspace Files / Datasets (Resolves 11 vs 6,058 discrepancy across browsers!)
    try {
      console.log(`[TEAM WORKSPACE] Attaching real-time listener for workspace "${activeWorkspaceId}" datasets`);
      const filesQuery = query(
        collection(db, 'files'),
        where('workspaceId', '==', activeWorkspaceId)
      );

      unsubFilesRef.current = onSnapshot(filesQuery, (snap) => {
        if (!isMounted) return;
        const filesList: CSVFile[] = [];
        snap.forEach((docSnap) => {
          filesList.push(docSnap.data() as CSVFile);
        });

        console.log(`[TEAM WORKSPACE] Received ${filesList.length} authoritative dataset(s) for workspace "${activeWorkspaceId}"`);
        setWorkspaceFiles(filesList);
      }, (err) => {
        console.warn('[TEAM WORKSPACE] Error querying workspace files:', err);
      });
    } catch (e) {
      console.warn('[TEAM WORKSPACE] Error setting up files listener:', e);
    }

    return () => {
      isMounted = false;
      cleanupListeners();
    };
  }, [activeWorkspaceId, userUid, userEmail]);

  // -------------------------------------------------------------
  // 3. Derived Current Member, Role & Permissions Resolution
  // -------------------------------------------------------------
  const isPrimaryOwner = useMemo(() => {
    if (!userEmail) return false;
    return userEmail === 'nyikulibramwel@gmail.com' || (activeOrganization?.ownerEmail?.toLowerCase() === userEmail);
  }, [userEmail, activeOrganization?.ownerEmail]);

  const currentMember = useMemo(() => {
    if (!userUid && !userEmail) return null;
    return members.find(m => m.uid === userUid || (m.email && m.email.toLowerCase().trim() === userEmail)) || null;
  }, [members, userUid, userEmail]);

  const currentRole: OrganizationRole = useMemo(() => {
    if (isPrimaryOwner) return 'Owner';
    if (currentMember?.role) return currentMember.role;
    if (userEmail === 'nyikulibramwel@gmail.com') return 'Owner';
    return 'Member';
  }, [isPrimaryOwner, currentMember?.role, userEmail]);

  const permissions: OrganizationPermission[] = useMemo(() => {
    if (isPrimaryOwner) return ['upload_csv', 'clean_csv', 'audit_csv', 'export_reports', 'ai_analysis', 'team_chat', 'cell_annotations', 'view_reports'];
    if (currentMember && currentMember.permissions && currentMember.permissions.length > 0) {
      return currentMember.permissions;
    }
    return DEFAULT_ROLE_PERMISSIONS[currentRole] || DEFAULT_ROLE_PERMISSIONS.Member;
  }, [isPrimaryOwner, currentMember, currentRole]);

  const hasPermission = (permission: OrganizationPermission): boolean => {
    if (isPrimaryOwner) return true;
    return permissions.includes(permission);
  };

  const isOwnerOrAdmin = useMemo(() => {
    return isPrimaryOwner || currentRole === 'Owner' || currentRole === 'Admin';
  }, [isPrimaryOwner, currentRole]);

  const isAuthorized = Boolean(authUser && (isPrimaryOwner || currentMember || userEmail === 'nyikulibramwel@gmail.com'));

  // Pending user invitation specifically to show in banner
  const pendingInviteForBanner = useMemo(() => {
    if (!userEmail) return null;
    return incomingInvitations.find(
      inv => inv.status === 'pending' &&
             !dismissedInviteIds.has(inv.id) &&
             new Date(inv.expiresAt).getTime() > Date.now()
    ) || null;
  }, [incomingInvitations, userEmail, dismissedInviteIds]);

  const dismissBannerInvite = (inviteId: string) => {
    setDismissedInviteIds(prev => new Set(prev).add(inviteId));
  };

  const switchWorkspace = (workspaceId: string) => {
    console.log(`[TEAM WORKSPACE] Switching active workspace to: "${workspaceId}"`);
    setActiveWorkspaceId(workspaceId);
  };

  // -------------------------------------------------------------
  // 4. Tenancy Actions & Mutations
  // -------------------------------------------------------------
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

    // Check duplicate active membership
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
      console.log(`[TEAM INVITATIONS] Creating invitation for "${targetEmail}" (${params.role}) in "${activeWorkspaceId}"`);
      
      // Write 1: Subcollection under organization
      const subRef = doc(db, 'organizations', activeWorkspaceId, 'invitations', inviteId);
      await setDoc(subRef, invitation);

      // Write 2: Top-level workspaceInvitations collection for recipient real-time discovery
      const topRef = doc(db, 'workspaceInvitations', inviteId);
      await setDoc(topRef, invitation);

      // Write 3: Record audit log
      recordOrganizationAuditLog({
        orgId: activeWorkspaceId,
        action: 'member.invited',
        actor: {
          uid: userUid,
          email: userEmail,
          displayName: authUser?.displayName || userEmail.split('@')[0],
          role: currentRole
        },
        target: {
          id: inviteId,
          email: targetEmail,
          type: 'invitation'
        },
        metadata: { role: params.role, expiresAt: expiresIso }
      }).catch(() => {});

      // Write 4: Broadcast chat notice
      broadcastSystemChatMessage({
        tenantId: activeWorkspaceId,
        text: `${authUser?.displayName || userEmail.split('@')[0]} dispatched an invitation to ${targetEmail} (${params.role}).`
      }).catch(() => {});

      // Sync to backend API endpoint for cross-session pickup
      if (typeof fetch !== 'undefined') {
        fetch('/api/workspaces/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invitation)
        }).catch(err => console.warn('[TEAM INVITATIONS] Backend invitation sync notice:', err));
      }

      return { success: true, invitation };
    } catch (err: any) {
      console.error('[TEAM INVITATIONS] Error creating invitation:', err);
      return { success: false, error: err?.message || 'Failed to create invitation in Firestore.' };
    }
  };

  const acceptInvite = async (
    tokenOrId: string
  ): Promise<{ success: boolean; member?: OrganizationMember; error?: string }> => {
    if (!userUid || !userEmail) {
      return { success: false, error: 'Authentication required. Please sign in to accept this invitation.' };
    }

    console.log(`[TEAM INVITATIONS] Accepting invitation with token/ID: "${tokenOrId}" for user: "${userEmail}"`);

    try {
      // 1. Locate the invitation in top-level or subcollection
      let matchedInvitation: OrganizationInvitation | null = null;
      let matchedOrgId = activeWorkspaceId;

      // Check top-level workspaceInvitations first
      const topSnap = await getDocs(query(collection(db, 'workspaceInvitations'), where('status', '==', 'pending')));
      topSnap.forEach(d => {
        const data = d.data() as OrganizationInvitation;
        if (data.id === tokenOrId || data.token === tokenOrId || (data.email.toLowerCase().trim() === userEmail && data.status === 'pending')) {
          matchedInvitation = data;
          if (data.organizationId) matchedOrgId = data.organizationId;
        }
      });

      if (!matchedInvitation) {
        // Fallback to active org subcollection
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
        return { success: false, error: 'Invitation not found or has already expired. Please request a new invitation.' };
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

      // 1. Create or update member doc in Firestore under organizations/{orgId}/members/{uid}
      const memberRef = doc(db, 'organizations', matchedOrgId, 'members', userUid);
      await setDoc(memberRef, newMember);

      // 2. Mark invitation accepted in both places
      const topInviteRef = doc(db, 'workspaceInvitations', inv.id);
      await updateDoc(topInviteRef, {
        status: 'accepted',
        acceptedAt: nowIso,
        acceptedByUid: userUid
      }).catch(() => {});

      const subInviteRef = doc(db, 'organizations', matchedOrgId, 'invitations', inv.id);
      await updateDoc(subInviteRef, {
        status: 'accepted',
        acceptedAt: nowIso,
        acceptedByUid: userUid
      }).catch(() => {});

      // 3. Switch active workspace to the joined organization
      setActiveWorkspaceId(matchedOrgId);

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
        target: {
          id: inv.id,
          uid: userUid,
          email: userEmail,
          name: newMember.displayName,
          type: 'member'
        },
        metadata: { role: inv.role, inviteId: inv.id }
      }).catch(() => {});

      // 5. Broadcast live chat event
      broadcastSystemChatMessage({
        tenantId: matchedOrgId,
        text: `${newMember.displayName} accepted the team invitation and joined as ${newMember.role}.`
      }).catch(() => {});

      // 6. Sync to backend endpoint
      if (typeof fetch !== 'undefined') {
        fetch(`/api/workspaces/invitations/${inv.id}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userUid, userEmail })
        }).catch(() => {});
      }

      console.log(`[TEAM MEMBERSHIP] Successfully joined workspace "${matchedOrgId}" as ${newMember.role}`);
      return { success: true, member: newMember };
    } catch (err: any) {
      console.error('[TEAM INVITATIONS] Error accepting invitation:', err);
      return { success: false, error: err?.message || 'Failed to accept invitation.' };
    }
  };

  const cancelInvite = async (inviteId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required.' };
    }

    try {
      console.log(`[TEAM INVITATIONS] Cancelling invitation: "${inviteId}" in org: "${activeWorkspaceId}"`);
      await updateDoc(doc(db, 'organizations', activeWorkspaceId, 'invitations', inviteId), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      }).catch(() => {});

      await updateDoc(doc(db, 'workspaceInvitations', inviteId), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      }).catch(() => {});

      if (typeof fetch !== 'undefined') {
        fetch(`/api/workspaces/invitations/${inviteId}/cancel`, { method: 'POST' }).catch(() => {});
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to cancel invitation.' };
    }
  };

  const resendInvite = async (
    inviteId: string
  ): Promise<{ success: boolean; invitation?: OrganizationInvitation; error?: string }> => {
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

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to resend invitation.' };
    }
  };

  const updateMemberRole = async (
    memberUid: string,
    role: OrganizationRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required to modify roles.' };
    }

    try {
      console.log(`[TEAM PERMISSIONS] Updating role for member "${memberUid}" to "${role}"`);
      const assignedPermissions = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.Member;
      
      const memberRef = doc(db, 'organizations', activeWorkspaceId, 'members', memberUid);
      await updateDoc(memberRef, {
        role,
        permissions: assignedPermissions,
        updatedAt: new Date().toISOString()
      });

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

  const updateMemberPermissions = async (
    memberUid: string,
    perms: OrganizationPermission[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerOrAdmin) {
      return { success: false, error: 'Administrative privileges required to modify permissions.' };
    }

    try {
      console.log(`[TEAM PERMISSIONS] Updating granular permissions for member "${memberUid}":`, perms);
      const memberRef = doc(db, 'organizations', activeWorkspaceId, 'members', memberUid);
      await updateDoc(memberRef, {
        permissions: perms,
        updatedAt: new Date().toISOString()
      });

      recordOrganizationAuditLog({
        orgId: activeWorkspaceId,
        action: 'member.permissions_updated',
        actor: {
          uid: userUid,
          email: userEmail,
          displayName: authUser?.displayName || userEmail.split('@')[0],
          role: currentRole
        },
        target: { uid: memberUid, type: 'member' },
        metadata: { permissions: perms }
      }).catch(() => {});

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
      console.log(`[TEAM MEMBERSHIP] Removing member "${memberUid}" from workspace "${activeWorkspaceId}"`);
      const memberRef = doc(db, 'organizations', activeWorkspaceId, 'members', memberUid);
      await deleteDoc(memberRef);

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

  const updateOrgDetails = async (
    name: string,
    description?: string
  ): Promise<{ success: boolean; error?: string }> => {
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
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update organization details.' };
    }
  };

  const refreshTenancyState = async (): Promise<void> => {
    if (!authUser) return;
    try {
      const snap = await getDocs(collection(db, 'organizations', activeWorkspaceId, 'members'));
      const membersList: OrganizationMember[] = [];
      snap.forEach(d => membersList.push(d.data() as OrganizationMember));
      setMembers(membersList);
    } catch (e) {
      console.warn('[TEAM LISTENER] Manual tenancy refresh notice:', e);
    }
  };

  return (
    <TeamTenancyContext.Provider
      value={{
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
