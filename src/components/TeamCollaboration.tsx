import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Building2,
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Mail, 
  Clock, 
  Activity, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  Sparkles, 
  Layers, 
  MessageSquare, 
  Edit3, 
  Save, 
  X, 
  Shield, 
  ShieldAlert,
  Globe, 
  Calendar,
  Send,
  Trash2,
  PlusCircle,
  UserX,
  BadgeCheck,
  Tag,
  Radio,
  ExternalLink,
  ChevronRight,
  Info,
  RotateCw,
  Ban,
  Copy,
  Check,
  MoreVertical,
  ArrowUpDown,
  Hash
} from 'lucide-react';
import { 
  TeamMember, 
  AuditActivity, 
  SlotRequest, 
  Organization, 
  OrganizationMember, 
  OrganizationRole,
  OrganizationInvitation,
  OrganizationPermission,
  OrganizationAuditLog
} from '../types';
import { useBilling } from '../context/BillingContext';
import { useAuth } from '../context/AuthProvider';
import PlanFeatureLock from './PlanFeatureLock';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, limit } from 'firebase/firestore';
import CollaborationChat from './CollaborationChat';
import InviteMemberModal from './InviteMemberModal';
import RemoveMemberModal from './RemoveMemberModal';
import AcceptInviteModal from './AcceptInviteModal';
import MemberPermissionsModal from './MemberPermissionsModal';
import OrganizationAuditLogsTab from './OrganizationAuditLogsTab';
import { 
  DEFAULT_ORG_ID,
  checkEnterpriseEntitlement,
  isOrganizationOwner,
  isOrganizationAdmin,
  canManageOrganization,
  canManageMembers,
  formatRoleLabel,
  subscribeToOrganization,
  subscribeToOrganizationMembers,
  subscribeToOrganizationInvitations,
  subscribeToOrganizationAuditLogs,
  getOrganizationAuditLogs,
  updateOrganizationDetails,
  getOrCreateDefaultOrganization,
  calculateSeatMetrics,
  resendOrganizationInvitation,
  cancelOrganizationInvitation,
  updateOrganizationMemberRole,
  updateOrganizationMemberPermissions,
  getMemberPermissions,
  hasPermission,
  acceptOrganizationInvitation,
  clearTenancyState
} from '../lib/teamTenancyService';

interface TeamCollaborationProps {
  members: TeamMember[];
  onInviteMember: (newMember: TeamMember) => void;
  onDeleteMember?: (id: string, email: string) => void;
  onUpdateMemberAccess?: (id: string, email: string, accessDenied: boolean) => void;
  activities: AuditActivity[];
  isDarkMode: boolean;
  accentClass: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  onSwitchActiveUser?: (member: TeamMember) => void;
  slotRequests?: SlotRequest[];
  onApproveSlotRequest?: (req: SlotRequest) => void;
  onDeclineSlotRequest?: (req: SlotRequest) => void;
  activeFileId?: string;
  activeFileName?: string;
}

interface CommentThread {
  id: string;
  author: string;
  role: string;
  text: string;
  time: string;
  timestamp?: number;
  userEmail?: string;
  avatar?: string;
  cellRef?: string;
  isLiveBroadcast?: boolean;
}

export default function TeamCollaboration({ 
  members, 
  onInviteMember, 
  onDeleteMember, 
  onUpdateMemberAccess,
  activities, 
  isDarkMode, 
  accentClass,
  currentUserEmail = '',
  currentUserRole,
  onSwitchActiveUser,
  slotRequests = [],
  onApproveSlotRequest,
  onDeclineSlotRequest,
  activeFileId,
  activeFileName
}: TeamCollaborationProps) {
  const { user } = useAuth();
  const { plan, billing, openProCheckout, openEnterpriseModal } = useBilling();

  // STEP 2: Centralized Enterprise Access Check
  const accessCheck = checkEnterpriseEntitlement(user, billing);

  // Active view section tab
  const [activeSection, setActiveSection] = useState<'members' | 'invitations' | 'activity' | 'chat'>('members');

  // Organization state & Members state & Invitations state & Audit Logs state
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [orgInvitations, setOrgInvitations] = useState<OrganizationInvitation[]>([]);
  const [orgAuditLogs, setOrgAuditLogs] = useState<OrganizationAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Organization editing state
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [orgNameInput, setOrgNameInput] = useState('');
  const [orgDescInput, setOrgDescInput] = useState('');
  const [orgUpdateStatus, setOrgUpdateStatus] = useState<{ success?: boolean; msg?: string } | null>(null);

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [permissionsMemberToEdit, setPermissionsMemberToEdit] = useState<OrganizationMember | null>(null);
  const [activeMenuMemberUid, setActiveMenuMemberUid] = useState<string | null>(null);
  const [actionLoadingUid, setActionLoadingUid] = useState<string | null>(null);

  // Filters & Clipboard
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [inviteFilter, setInviteFilter] = useState<'all' | 'pending' | 'accepted' | 'cancelled_expired'>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Toast / Alerts
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const timeoutRef = useRef<any>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch / Refresh Audit Logs manually
  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await getOrganizationAuditLogs(DEFAULT_ORG_ID);
      setOrgAuditLogs(logs);
    } catch (e) {
      console.warn('Error fetching audit logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // STEP 9: Account Switching & State Subscriptions
  useEffect(() => {
    if (!accessCheck.authorized) return;

    // Reset cached state cleanly on user account switch
    clearTenancyState();

    const currentUid = user?.uid || 'usr-root-owner';
    const currentEmail = user?.email || currentUserEmail || 'nyikulibramwel@gmail.com';
    const currentName = user?.displayName || (currentEmail.split('@')[0]) || 'Enterprise Admin';

    // Provision or fetch default Organization
    getOrCreateDefaultOrganization(currentUid, currentEmail, currentName).then(org => {
      setOrganization(org);
      setOrgNameInput(org.name);
      setOrgDescInput(org.description || '');
    });

    const unsubOrg = subscribeToOrganization(DEFAULT_ORG_ID, (org) => {
      if (org) {
        setOrganization(org);
        setOrgNameInput(org.name);
        setOrgDescInput(org.description || '');
      }
    });

    const unsubMembers = subscribeToOrganizationMembers(DEFAULT_ORG_ID, (mList) => {
      if (mList && mList.length > 0) {
        setOrgMembers(mList);
      }
    });

    const unsubInvites = subscribeToOrganizationInvitations(DEFAULT_ORG_ID, (iList) => {
      setOrgInvitations(iList || []);
    });

    const unsubAuditLogs = subscribeToOrganizationAuditLogs(DEFAULT_ORG_ID, (logs) => {
      setOrgAuditLogs(logs || []);
    });

    return () => {
      unsubOrg();
      unsubMembers();
      unsubInvites();
      unsubAuditLogs();
    };
  }, [accessCheck.authorized, user?.uid, user?.email, currentUserEmail]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Determine current user's role in the organization
  const effectiveEmail = (user?.email || currentUserEmail || '').toLowerCase().trim();
  const isPrimaryEnterpriseOwner = effectiveEmail === 'nyikulibramwel@gmail.com' || (organization?.ownerEmail?.toLowerCase() === effectiveEmail);
  
  const currentMemberRecord = orgMembers.find(m => m.uid === user?.uid || m.email.toLowerCase() === effectiveEmail);
  const currentRole: OrganizationRole = isPrimaryEnterpriseOwner 
    ? 'Owner' 
    : (currentMemberRecord?.role || (currentUserRole === 'Admin' ? 'Admin' : (currentUserRole === 'Owner' ? 'Owner' : 'Member')));

  const isOwnerOrAdmin = isOrganizationAdmin(currentRole) || isPrimaryEnterpriseOwner;

  // Resolve combined member list (merging Firestore org members & active session members)
  const combinedMembers: OrganizationMember[] = useMemo(() => {
    const list: OrganizationMember[] = [...orgMembers];
    
    // Ensure primary owner is always present
    if (!list.some(m => m.email.toLowerCase() === 'nyikulibramwel@gmail.com')) {
      list.unshift({
        uid: organization?.ownerId || 'usr-owner-root',
        organizationId: DEFAULT_ORG_ID,
        email: organization?.ownerEmail || 'nyikulibramwel@gmail.com',
        displayName: 'Nyikuli Bramwel',
        role: 'Owner',
        status: 'active',
        joinedAt: organization?.createdAt || new Date().toISOString(),
        lastActive: 'Active now',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Nyikuli&backgroundColor=3b82f6'
      });
    }

    // Only populate from legacy fallback if Firestore orgMembers is completely uninitialized
    if (orgMembers.length === 0) {
      members.forEach((legacyMember) => {
        const email = (legacyMember.email || '').toLowerCase().trim();
        if (!list.some(m => m.email.toLowerCase() === email)) {
          const mappedRole: OrganizationRole = legacyMember.role === 'Owner' ? 'Owner' : legacyMember.role === 'Admin' ? 'Admin' : 'Member';
          list.push({
            uid: legacyMember.id || `usr-${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
            organizationId: DEFAULT_ORG_ID,
            email: legacyMember.email,
            displayName: legacyMember.name,
            role: mappedRole,
            status: legacyMember.status === 'denied' || legacyMember.accessDenied ? 'suspended' : 'active',
            joinedAt: new Date().toISOString(),
            lastActive: 'Session active',
            avatar: legacyMember.avatar
          });
        }
      });
    }

    return list;
  }, [orgMembers, organization, members]);

  // Dynamically mapped active workspace members for live collaboration chat synchronization
  const liveChatMembers: TeamMember[] = useMemo(() => {
    return combinedMembers
      .filter(m => m.status === 'active')
      .map(m => ({
        id: m.uid,
        name: m.displayName || m.email.split('@')[0],
        email: m.email,
        role: m.role,
        status: 'active' as const,
        avatar: m.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.displayName || m.email)}&backgroundColor=3b82f6`
      }));
  }, [combinedMembers]);

  // STEP 7: Seat Metrics Calculation
  const seatMetrics = useMemo(() => {
    return calculateSeatMetrics(organization, combinedMembers, orgInvitations);
  }, [organization, combinedMembers, orgInvitations]);

  // STEP 4: Auto-detect pending invitation for currently logged-in user
  const userPendingInvitation = useMemo(() => {
    if (!effectiveEmail) return null;
    const now = Date.now();
    return orgInvitations.find(
      inv => inv.email.toLowerCase() === effectiveEmail && 
             inv.status === 'pending' && 
             new Date(inv.expiresAt).getTime() > now
    ) || null;
  }, [orgInvitations, effectiveEmail]);

  // Handle Organization Name / Description Update
  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrAdmin) {
      setOrgUpdateStatus({ success: false, msg: 'You do not have permission to perform this action.' });
      return;
    }

    if (!orgNameInput.trim()) {
      setOrgUpdateStatus({ success: false, msg: 'Organization name cannot be empty.' });
      return;
    }

    const res = await updateOrganizationDetails(
      DEFAULT_ORG_ID,
      { name: orgNameInput.trim(), description: orgDescInput.trim() },
      user?.uid || 'usr-actor',
      currentRole
    );

    if (res.success) {
      setOrgUpdateStatus({ success: true, msg: 'Organization settings updated successfully.' });
      setIsEditingOrg(false);
      setOrganization(prev => prev ? { ...prev, name: orgNameInput.trim(), description: orgDescInput.trim(), updatedAt: new Date().toISOString() } : null);
    } else {
      setOrgUpdateStatus({ success: false, msg: res.error || 'Failed to update organization.' });
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOrgUpdateStatus(null), 4000);
  };

  // STEP 1: Handle Member Role Change (Admin <-> Member)
  const handleRoleChange = async (targetMember: OrganizationMember, newRole: 'Admin' | 'Member') => {
    if (!canManageMembers(currentRole)) {
      showToast('error', 'You do not have permission to perform this action.');
      return;
    }

    if (targetMember.role === 'Owner') {
      showToast('error', 'The primary Organization Owner role cannot be changed.');
      return;
    }

    if (currentRole === 'Admin' && targetMember.role === 'Admin') {
      showToast('error', 'Organization Admins can only be modified by the Organization Owner.');
      return;
    }

    setActionLoadingUid(targetMember.uid);
    setActiveMenuMemberUid(null);

    const res = await updateOrganizationMemberRole({
      orgId: DEFAULT_ORG_ID,
      memberUid: targetMember.uid,
      newRole,
      actorUid: user?.uid || 'usr-actor',
      actorRole: currentRole
    });

    setActionLoadingUid(null);

    if (res.success) {
      showToast('success', `Updated ${targetMember.displayName}'s role to ${newRole}.`);
      setOrgMembers(prev => prev.map(m => m.uid === targetMember.uid ? { ...m, role: newRole } : m));
    } else {
      showToast('error', res.error || 'Failed to update member role.');
    }
  };

  // STEP 1: Handle Member Permissions Update
  const handleSaveMemberPermissions = async (memberUid: string, permissions: OrganizationPermission[]) => {
    if (!canManageMembers(currentRole)) {
      return { success: false, error: 'You do not have permission to modify member permissions.' };
    }

    const targetMember = combinedMembers.find(m => m.uid === memberUid);
    const res = await updateOrganizationMemberPermissions({
      orgId: DEFAULT_ORG_ID,
      memberUid,
      permissions,
      actorUid: user?.uid || 'usr-actor',
      actorRole: currentRole,
      actorEmail: effectiveEmail,
      actorName: user?.displayName || effectiveEmail.split('@')[0],
      memberEmail: targetMember?.email,
      memberName: targetMember?.displayName
    });

    if (res.success) {
      showToast('success', `Updated operational permissions for ${targetMember?.displayName || targetMember?.email || 'member'}.`);
      setOrgMembers(prev => prev.map(m => m.uid === memberUid ? { ...m, permissions } : m));
    }
    return res;
  };

  // STEP 5: Handle Resend Invitation
  const handleResendInvite = async (invitation: OrganizationInvitation) => {
    if (!canManageMembers(currentRole)) {
      showToast('error', 'You do not have permission to perform this action.');
      return;
    }

    setActionLoadingUid(invitation.id);
    const res = await resendOrganizationInvitation(
      DEFAULT_ORG_ID, 
      invitation.id, 
      currentRole,
      user?.uid || 'usr-actor',
      effectiveEmail,
      user?.displayName || effectiveEmail.split('@')[0]
    );
    setActionLoadingUid(null);

    if (res.success) {
      showToast('success', `Renewed invitation for ${invitation.email} for 7 days.`);
      setOrgInvitations(prev => prev.map(inv => inv.id === invitation.id ? { ...inv, status: 'pending', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() } : inv));
    } else {
      showToast('error', res.error || 'Failed to resend invitation.');
    }
  };

  // STEP 5: Handle Cancel Invitation
  const handleCancelInvite = async (invitation: OrganizationInvitation) => {
    if (!canManageMembers(currentRole)) {
      showToast('error', 'You do not have permission to perform this action.');
      return;
    }

    setActionLoadingUid(invitation.id);
    const res = await cancelOrganizationInvitation(
      DEFAULT_ORG_ID, 
      invitation.id, 
      currentRole,
      user?.uid || 'usr-actor',
      effectiveEmail,
      user?.displayName || effectiveEmail.split('@')[0]
    );
    setActionLoadingUid(null);

    if (res.success) {
      showToast('success', `Cancelled invitation for ${invitation.email}.`);
      setOrgInvitations(prev => prev.map(inv => inv.id === invitation.id ? { ...inv, status: 'cancelled' } : inv));
    } else {
      showToast('error', res.error || 'Failed to cancel invitation.');
    }
  };

  // Handle Quick Copy Invite Token
  const handleCopyInviteToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 3000);
    showToast('success', 'Invitation token copied to clipboard.');
  };

  // STEP 4: Direct Acceptance of Pending Invitation for Current User
  const handleAcceptCurrentUserInvite = async () => {
    if (!userPendingInvitation || !user) return;

    setActionLoadingUid(userPendingInvitation.id);
    const res = await acceptOrganizationInvitation({
      orgId: DEFAULT_ORG_ID,
      tokenOrId: userPendingInvitation.token,
      user: {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined
      }
    });
    setActionLoadingUid(null);

    if (res.success && res.member) {
      showToast('success', `Welcome! You have joined the organization as ${res.member.role}.`);
      setOrgMembers(prev => [res.member!, ...prev.filter(m => m.uid !== user.uid)]);
    } else {
      showToast('error', res.error || 'Failed to accept invitation.');
    }
  };

  // --- Real-Time Cell Annotations State & Handlers (Preserved Feature) ---
  const [comments, setComments] = useState<CommentThread[]>(() => {
    try {
      const saved = localStorage.getItem('cell_annotations_store');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'c-seed-1',
        author: 'Nyikuli Bramwel',
        role: 'Owner',
        text: 'Verified Row #14 Gross Pay calculation anomaly against Q3 tax receipts.',
        time: '10:15 AM',
        timestamp: Date.now() - 3600000,
        userEmail: 'nyikulibramwel@gmail.com',
        cellRef: 'Row 14, Col B',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Nyikuli&backgroundColor=3b82f6'
      }
    ];
  });

  const [newCommentText, setNewCommentText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Row 14');

  // Real-time annotations listener
  useEffect(() => {
    try {
      const q = query(collection(db, 'annotations'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const remoteComments: CommentThread[] = [];
        snapshot.forEach((docSnap) => {
          remoteComments.push(docSnap.data() as CommentThread);
        });
        if (remoteComments.length > 0) {
          setComments(prev => {
            const map = new Map<string, CommentThread>();
            [...prev, ...remoteComments].forEach(c => map.set(c.id, c));
            return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          });
        }
      }, () => {});
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  const postAnnotationMessage = async (rawText: string, customTag?: string) => {
    if (!rawText.trim()) return;
    const authorName = user?.displayName || effectiveEmail.split('@')[0] || 'Active User';
    const newComment: CommentThread = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: authorName,
      role: currentRole,
      text: rawText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      userEmail: effectiveEmail,
      avatar: user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authorName)}&backgroundColor=3b82f6`,
      cellRef: customTag || selectedTag || undefined,
      isLiveBroadcast: true
    };

    setComments(prev => {
      const updated = [...prev, newComment];
      try {
        localStorage.setItem('cell_annotations_store', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await setDoc(doc(db, 'annotations', newComment.id), newComment);
    } catch (e) {
      console.warn('Annotation write handled locally:', e);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    postAnnotationMessage(newCommentText);
    setNewCommentText('');
  };

  // If Enterprise entitlement check fails, render PlanFeatureLock
  if (!accessCheck.authorized) {
    return (
      <PlanFeatureLock
        featureName="Enterprise Team Tenancy & Multi-User Organization"
        featureDescription="Organize enterprise workspaces, assign administrative roles, manage member credentials, and govern multi-user compliance."
        requiredPlan="enterprise"
        currentPlan={plan}
        isDarkMode={isDarkMode}
        onUpgradePro={openProCheckout}
        onUpgradeEnterprise={openEnterpriseModal}
      />
    );
  }

  // Render role badge with strict color coding (Owner: Violet, Admin: Blue, Member: Slate)
  const renderRoleBadge = (role: OrganizationRole | string) => {
    switch (role) {
      case 'Owner':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono tracking-wider uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1 shrink-0">
            <ShieldCheck className="w-3 h-3" />
            <span>Owner</span>
          </span>
        );
      case 'Admin':
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 shrink-0">
            <Shield className="w-3 h-3" />
            <span>Admin</span>
          </span>
        );
      case 'Member':
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono tracking-wider uppercase bg-slate-500/10 text-slate-400 border border-slate-700 flex items-center gap-1 shrink-0">
            <Users className="w-3 h-3" />
            <span>Member</span>
          </span>
        );
    }
  };

  // Render status badge with strict color coding
  const renderStatusBadge = (status: string) => {
    if (status === 'suspended') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 shrink-0">
          <UserX className="w-3 h-3" />
          <span>Suspended</span>
        </span>
      );
    }
    if (status === 'invited' || status === 'pending') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1 shrink-0">
          <Mail className="w-3 h-3" />
          <span>Pending</span>
        </span>
      );
    }
    if (status === 'accepted') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-3 h-3" />
          <span>Accepted</span>
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-slate-500/10 text-slate-400 border border-slate-700 flex items-center gap-1 shrink-0">
          <Ban className="w-3 h-3" />
          <span>Cancelled</span>
        </span>
      );
    }
    if (status === 'expired') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" />
          <span>Expired</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
        <CheckCircle2 className="w-3 h-3" />
        <span>Active</span>
      </span>
    );
  };

  const filteredMembers = combinedMembers.filter(m => {
    if (memberFilter === 'active') return m.status === 'active';
    if (memberFilter === 'suspended') return m.status === 'suspended';
    return true;
  });

  const nowTime = Date.now();
  const filteredInvitations = orgInvitations.filter(inv => {
    const isExpired = new Date(inv.expiresAt).getTime() <= nowTime;
    if (inviteFilter === 'pending') return inv.status === 'pending' && !isExpired;
    if (inviteFilter === 'accepted') return inv.status === 'accepted';
    if (inviteFilter === 'cancelled_expired') return inv.status === 'cancelled' || inv.status === 'expired' || (inv.status === 'pending' && isExpired);
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="enterprise-team-tenancy">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-md animate-fadeIn ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Organization Settings Alert Banner */}
      {orgUpdateStatus && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
          orgUpdateStatus.success 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {orgUpdateStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{orgUpdateStatus.msg}</span>
        </div>
      )}

      {/* STEP 4: Auto-Detected Pending Invitation Banner for Authenticated User */}
      {userPendingInvitation && (
        <div className="p-4 rounded-2xl border bg-blue-500/10 border-blue-500/30 text-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">Pending Team Invitation Detected</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {userPendingInvitation.role} Role
                </span>
              </div>
              <p className="text-xs text-blue-200/90 leading-relaxed">
                You have been invited by <strong className="text-white">{userPendingInvitation.invitedByName || userPendingInvitation.invitedByEmail}</strong> to join <strong className="text-white">{organization?.name || 'Enterprise Data Workspace'}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAcceptCurrentUserInvite}
              disabled={actionLoadingUid === userPendingInvitation.id}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {actionLoadingUid === userPendingInvitation.id ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept & Join Team</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 8: TEAM DASHBOARD FOUNDATION - ORGANIZATION HERO & STATS CARD        */}
      {/* ========================================================================= */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDarkMode ? 'bg-[#1E293B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/40">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>Enterprise Team Tenancy</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" />
                <span>Enterprise Active</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {organization?.name || 'Enterprise Data Workspace'}
              </h1>
              {isOwnerOrAdmin && !isEditingOrg && (
                <button
                  type="button"
                  onClick={() => setIsEditingOrg(true)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Edit Organization Name"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className={`text-xs md:text-sm max-w-3xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {organization?.description || 'Centralized enterprise governance, team access controls, and collaborative CSV compliance.'}
            </p>
          </div>

          {/* Action buttons & User Role Pill */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite New Member</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAcceptModalOpen(true)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-2 cursor-pointer ${
                isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>Redeem Invite Code</span>
            </button>

            <div className={`p-2.5 px-3.5 rounded-xl border flex items-center gap-3 ${
              isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-left">
                <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Your Role:
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold font-mono truncate max-w-[120px]">
                    {effectiveEmail}
                  </span>
                  {renderRoleBadge(currentRole)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Organization Edit Form */}
        {isEditingOrg && (
          <form onSubmit={handleSaveOrganization} className={`mt-4 p-4 rounded-xl border animate-fadeIn ${
            isDarkMode ? 'bg-[#0F172A] border-slate-700' : 'bg-slate-50 border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold font-mono uppercase text-blue-400 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Edit Organization Details
              </span>
              <button
                type="button"
                onClick={() => setIsEditingOrg(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <label className="block text-[10px] font-bold uppercase font-mono text-slate-400 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgNameInput}
                  onChange={(e) => setOrgNameInput(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Acme Global Data Operations"
                />
              </div>
              <div className="md:col-span-6">
                <label className="block text-[10px] font-bold uppercase font-mono text-slate-400 mb-1">
                  Description / Workspace Scope
                </label>
                <input
                  type="text"
                  value={orgDescInput}
                  onChange={(e) => setOrgDescInput(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. Financial data integrity & CSV auditing"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setIsEditingOrg(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 8: TEAM OVERVIEW SUMMARY CARDS                                       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Total Members */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Total Members
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="font-extrabold text-2xl font-mono text-blue-400">
                  {combinedMembers.length}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {combinedMembers.filter(m => m.status === 'active').length} Active
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block mt-2">
              Registered workspace identities
            </span>
          </div>

          {/* Card 2: Pending Invitations */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Pending Invitations
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-sky-400 shrink-0" />
                <span className="font-extrabold text-2xl font-mono text-sky-400">
                  {seatMetrics.pendingSeats}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                7d Expiration
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block mt-2">
              Awaiting recipient sign in
            </span>
          </div>

          {/* Card 3: Seats Used */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Seats Used
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-400 shrink-0" />
                <span className="font-extrabold text-2xl font-mono text-violet-400">
                  {seatMetrics.usedSeats + seatMetrics.pendingSeats}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {seatMetrics.maxSeats} Total
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-violet-400">
                {seatMetrics.utilizationPercent}%
              </span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-700/40 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div 
                className="bg-violet-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${seatMetrics.utilizationPercent}%` }}
              />
            </div>
          </div>

          {/* Card 4: Seats Available */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Seats Available
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className={`w-5 h-5 shrink-0 ${seatMetrics.availableSeats > 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className={`font-extrabold text-2xl font-mono ${seatMetrics.availableSeats > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {seatMetrics.availableSeats}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                seatMetrics.availableSeats > 0 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {seatMetrics.availableSeats > 0 ? 'Ready' : 'Limit Reached'}
              </span>
            </div>
            <span className={`text-[10px] font-mono block mt-2 ${seatMetrics.availableSeats > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {seatMetrics.availableSeats > 0 ? `${seatMetrics.availableSeats} remaining for new invites` : 'Upgrade seats to expand team'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION TABS: MEMBERS | INVITATIONS (PHASE 2) | ACTIVITY (PHASE 3) | CHAT */}
      {/* ========================================================================= */}
      <div className={`flex items-center gap-2 p-1.5 rounded-xl border max-w-full overflow-x-auto ${
        isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {/* Members Directory */}
        <button
          type="button"
          onClick={() => setActiveSection('members')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSection === 'members'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members Directory</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            activeSection === 'members' ? 'bg-blue-700 text-white' : 'bg-slate-700/40 text-slate-400'
          }`}>
            {combinedMembers.length}
          </span>
        </button>

        {/* Invitations (Phase 2 Active) */}
        <button
          type="button"
          onClick={() => setActiveSection('invitations')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSection === 'invitations'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Invitations</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            activeSection === 'invitations' ? 'bg-blue-700 text-white' : 'bg-slate-700/40 text-slate-400'
          }`}>
            {orgInvitations.length}
          </span>
          {seatMetrics.pendingSeats > 0 && (
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          )}
        </button>

        {/* Activity / Audit Ledger (Phase 3 Complete) */}
        <button
          type="button"
          onClick={() => setActiveSection('activity')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSection === 'activity'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Audit Trail</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            activeSection === 'activity' ? 'bg-blue-700 text-white' : 'bg-slate-700/40 text-slate-400'
          }`}>
            {orgAuditLogs.length}
          </span>
        </button>

        {/* Live Chat & Cell Notes (Preserved Existing Feature) */}
        <button
          type="button"
          onClick={() => setActiveSection('chat')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSection === 'chat'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Live Chat & Cell Notes</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MEMBERS DIRECTORY (STEP 1 & STEP 6: MEMBER MANAGEMENT)         */}
      {/* ========================================================================= */}
      {activeSection === 'members' && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/40">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span>Organization Members Directory</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Verified Firebase identities. {isOwnerOrAdmin ? 'You have administrative permissions to manage roles and access.' : 'You have view-only access to the team directory.'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter Pills */}
              <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setMemberFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    memberFilter === 'all' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({combinedMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('active')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    memberFilter === 'active' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({combinedMembers.filter(m => m.status === 'active').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('suspended')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    memberFilter === 'suspended' 
                      ? 'bg-rose-600 text-white shadow-xs' 
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Suspended ({combinedMembers.filter(m => m.status === 'suspended').length})
                </button>
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-bold font-mono uppercase tracking-wider ${
                  isDarkMode ? 'border-slate-800 text-slate-400 bg-[#0F172A]' : 'border-slate-200 text-slate-600 bg-slate-50'
                }`}>
                  <th className="py-3 px-4 rounded-l-xl">Member & Identity</th>
                  <th className="py-3 px-3">Firebase UID</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Permissions</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-3">Last Active</th>
                  {isOwnerOrAdmin && <th className="py-3 px-4 rounded-r-xl text-right">Management</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {filteredMembers.map((member) => {
                  const isOwner = member.role === 'Owner' || member.email.toLowerCase() === 'nyikulibramwel@gmail.com';
                  const isSelf = member.uid === user?.uid || member.email.toLowerCase() === effectiveEmail;
                  const canManageThisMember = isOwnerOrAdmin && !isOwner && !isSelf && (currentRole === 'Owner' || member.role === 'Member');
                  const memberPerms = getMemberPermissions(member);

                  return (
                    <tr key={member.uid} className={`transition-colors ${
                      isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                    }`}>
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.displayName || member.email)}&backgroundColor=3b82f6`}
                            alt={member.displayName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=User&backgroundColor=3b82f6`;
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold truncate">{member.displayName || 'Enterprise User'}</span>
                              {isOwner && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                                  Owner
                                </span>
                              )}
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <span className={`text-[11px] block font-mono truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Firebase UID */}
                      <td className="py-3.5 px-3 font-mono text-[10px]">
                        <span className={`px-2 py-1 rounded border inline-block max-w-[130px] truncate ${
                          isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`} title={member.uid}>
                          {member.uid}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-3">
                        {renderRoleBadge(member.role)}
                      </td>

                      {/* Permissions (Granular Phase 3) */}
                      <td className="py-3.5 px-3">
                        {isOwner ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Full Access
                          </span>
                        ) : isOwnerOrAdmin && canManageThisMember ? (
                          <button
                            type="button"
                            onClick={() => setPermissionsMemberToEdit(member)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border inline-flex items-center gap-1 cursor-pointer transition-colors ${
                              isDarkMode 
                                ? 'bg-slate-800/80 border-slate-700 text-blue-400 hover:bg-slate-700' 
                                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                            }`}
                            title="Click to customize operational permissions"
                          >
                            <Shield className="w-3 h-3 text-blue-400" />
                            <span>{memberPerms.length} Active</span>
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800/50 text-slate-400 border border-slate-700 inline-flex items-center gap-1">
                            <Shield className="w-3 h-3 text-slate-400" /> {memberPerms.length} Active
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {renderStatusBadge(member.status)}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-3 font-mono text-[10px] text-slate-400">
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-3 font-mono text-[10px]">
                        <div className="flex items-center gap-1.5 text-cyan-400">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{member.lastActive || 'Active now'}</span>
                        </div>
                      </td>

                      {/* STEP 1 & 6: Management Actions (Owners / Admins only) */}
                      {isOwnerOrAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          {canManageThisMember ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Permissions Modal Trigger */}
                              <button
                                type="button"
                                onClick={() => setPermissionsMemberToEdit(member)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono border border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Configure Granular Permissions"
                              >
                                <Shield className="w-3 h-3" />
                                <span>Perms</span>
                              </button>

                              {/* Toggle Role (Admin <-> Member) */}
                              <button
                                type="button"
                                onClick={() => handleRoleChange(member, member.role === 'Admin' ? 'Member' : 'Admin')}
                                disabled={actionLoadingUid === member.uid}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono border transition-colors flex items-center gap-1 cursor-pointer ${
                                  member.role === 'Admin'
                                    ? isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    : 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                }`}
                                title={member.role === 'Admin' ? 'Demote to Member' : 'Promote to Admin'}
                              >
                                <ArrowUpDown className="w-3 h-3" />
                                <span>{member.role === 'Admin' ? 'Demote' : 'Promote'}</span>
                              </button>

                              {/* Remove Member */}
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(member)}
                                className="p-1 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title="Revoke Organization Access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500 italic">
                              {isOwner ? 'Owner Protected' : isSelf ? 'Active Session' : 'Protected Admin'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: INVITATIONS DIRECTORY (STEP 3 & STEP 5: PENDING INVITATIONS)   */}
      {/* ========================================================================= */}
      {activeSection === 'invitations' && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/40">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-400" />
                <span>Organization Invitations</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Manage pending team invitations, renew expiring tokens, or copy invite links.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter Pills */}
              <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setInviteFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    inviteFilter === 'all' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({orgInvitations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInviteFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    inviteFilter === 'pending' 
                      ? 'bg-sky-600 text-white shadow-xs' 
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({seatMetrics.pendingSeats})
                </button>
                <button
                  type="button"
                  onClick={() => setInviteFilter('accepted')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    inviteFilter === 'accepted' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Accepted ({orgInvitations.filter(i => i.status === 'accepted').length})
                </button>
                <button
                  type="button"
                  onClick={() => setInviteFilter('cancelled_expired')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    inviteFilter === 'cancelled_expired' 
                      ? 'bg-slate-600 text-white shadow-xs' 
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  History
                </button>
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Send Invite</span>
                </button>
              )}
            </div>
          </div>

          {/* Invitations Table */}
          {filteredInvitations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b text-[10px] font-bold font-mono uppercase tracking-wider ${
                    isDarkMode ? 'border-slate-800 text-slate-400 bg-[#0F172A]' : 'border-slate-200 text-slate-600 bg-slate-50'
                  }`}>
                    <th className="py-3 px-4 rounded-l-xl">Invited Email</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3">Invited By</th>
                    <th className="py-3 px-3">Invitation Date</th>
                    <th className="py-3 px-3">Expiration Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {filteredInvitations.map((inv) => {
                    const isExpired = new Date(inv.expiresAt).getTime() <= nowTime && inv.status === 'pending';
                    const displayStatus = isExpired ? 'expired' : inv.status;
                    const isPending = inv.status === 'pending' && !isExpired;

                    return (
                      <tr key={inv.id} className={`transition-colors ${
                        isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                      }`}>
                        {/* Email & Token */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold block truncate">{inv.email}</span>
                              <span className="text-[10px] font-mono text-slate-400 truncate block">
                                Token: {inv.token.substring(0, 10)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Role */}
                        <td className="py-3.5 px-3">
                          {renderRoleBadge(inv.role)}
                        </td>

                        {/* Invited By */}
                        <td className="py-3.5 px-3 font-mono text-[10px] text-slate-400">
                          <span className="truncate block max-w-[130px]">{inv.invitedByName || inv.invitedByEmail}</span>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-3 font-mono text-[10px] text-slate-400">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>

                        {/* Expiration Date */}
                        <td className="py-3.5 px-3 font-mono text-[10px]">
                          <span className={isExpired ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {renderStatusBadge(displayStatus)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Copy Token Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyInviteToken(inv.token, inv.id)}
                              className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Copy Token"
                            >
                              {copiedTokenId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {isOwnerOrAdmin && isPending && (
                              <>
                                {/* Resend / Renew */}
                                <button
                                  type="button"
                                  onClick={() => handleResendInvite(inv)}
                                  disabled={actionLoadingUid === inv.id}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Renew invitation for 7 days"
                                >
                                  <RotateCw className="w-3 h-3" />
                                  <span>Resend</span>
                                </button>

                                {/* Cancel */}
                                <button
                                  type="button"
                                  onClick={() => handleCancelInvite(inv)}
                                  disabled={actionLoadingUid === inv.id}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Cancel invitation"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}

                            {isOwnerOrAdmin && (isExpired || inv.status === 'cancelled') && (
                              <button
                                type="button"
                                onClick={() => handleResendInvite(inv)}
                                disabled={actionLoadingUid === inv.id}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Re-activate invitation"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>Re-invite</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/40 text-slate-400 mx-auto flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm">No Invitations in this View</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isOwnerOrAdmin ? 'Click "Send Invite" to invite team members and assign roles to your workspace.' : 'No invitations currently pending.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: IMMUTABLE AUDIT TRAIL (PHASE 3 COMPLETE)                        */}
      {/* ========================================================================= */}
      {activeSection === 'activity' && (
        <OrganizationAuditLogsTab
          logs={orgAuditLogs}
          isLoading={isLoadingLogs}
          actorRole={currentRole}
          isDarkMode={isDarkMode}
          onRefresh={fetchAuditLogs}
        />
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: LIVE COLLABORATION CHAT & CELL NOTES (PRESERVED FEATURE)       */}
      {/* ========================================================================= */}
      {activeSection === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Cell Annotations Board */}
          <div className={`lg:col-span-6 p-6 rounded-2xl border space-y-4 ${
            isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm">Real-Time Cell Annotations</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Broadcast
              </span>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className={`text-xs px-2.5 py-2 rounded-xl border focus:outline-none ${
                    isDarkMode ? 'bg-[#0F172A] border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Row 14">Row 14</option>
                  <option value="Col B">Col B</option>
                  <option value="Header">Header</option>
                  <option value="General">General</option>
                </select>
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Annotate anomaly or cell note..."
                  className={`flex-1 px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-[#0F172A] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={comment.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.author)}&backgroundColor=3b82f6`}
                        alt={comment.author}
                        className="w-6 h-6 rounded-full object-cover border border-slate-700"
                      />
                      <span className="font-bold text-xs">{comment.author}</span>
                      {comment.cellRef && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {comment.cellRef}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{comment.time}</span>
                  </div>
                  <p className={`pl-8 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Collaboration Chat Component */}
          <div className="lg:col-span-6">
            <CollaborationChat
              tenantId={DEFAULT_ORG_ID}
              activeFileId={activeFileId}
              activeFileName={activeFileName}
              currentUserEmail={effectiveEmail}
              currentUserRole={currentRole}
              members={liveChatMembers}
              isDarkMode={isDarkMode}
              accentClass={accentClass}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS FOR PHASE 2 TEAM MANAGEMENT                                       */}
      {/* ========================================================================= */}
      {/* 1. Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        orgId={DEFAULT_ORG_ID}
        orgName={organization?.name}
        currentUserUid={user?.uid || 'usr-actor'}
        currentUserEmail={effectiveEmail}
        currentUserName={user?.displayName || effectiveEmail.split('@')[0]}
        currentUserRole={currentRole}
        currentMembers={combinedMembers}
        currentInvitations={orgInvitations}
        maxSeats={seatMetrics.maxSeats}
        availableSeats={seatMetrics.availableSeats}
        isDarkMode={isDarkMode}
        onInvitationCreated={(newInv) => {
          showToast('success', `Created invitation for ${newInv.email}.`);
          setOrgInvitations(prev => [newInv, ...prev.filter(i => i.id !== newInv.id)]);
        }}
      />

      {/* 2. Remove Member Modal */}
      <RemoveMemberModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        orgId={DEFAULT_ORG_ID}
        member={memberToRemove}
        actorUid={user?.uid || 'usr-actor'}
        actorRole={currentRole}
        actorEmail={effectiveEmail}
        actorName={user?.displayName || effectiveEmail.split('@')[0]}
        isDarkMode={isDarkMode}
        onMemberRemoved={(removedUid) => {
          showToast('success', 'Organization access has been revoked for this member.');
          setOrgMembers(prev => prev.filter(m => m.uid !== removedUid));
          if (memberToRemove) {
            onDeleteMember?.(memberToRemove.uid, memberToRemove.email);
          }
          setMemberToRemove(null);
        }}
      />

      {/* 3. Accept / Redeem Invite Modal */}
      <AcceptInviteModal
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        orgId={DEFAULT_ORG_ID}
        user={user}
        isDarkMode={isDarkMode}
        onJoined={(newMember) => {
          showToast('success', `Joined ${organization?.name || 'Enterprise Workspace'} as ${newMember.role}!`);
          setOrgMembers(prev => [newMember, ...prev.filter(m => m.uid !== newMember.uid)]);
          onInviteMember?.({
            id: newMember.uid,
            name: newMember.displayName || newMember.email.split('@')[0],
            email: newMember.email,
            role: newMember.role,
            status: 'active',
            avatar: newMember.avatar || ''
          });
        }}
      />

      {/* 4. Member Granular Permissions Modal (Phase 3) */}
      <MemberPermissionsModal
        isOpen={Boolean(permissionsMemberToEdit)}
        onClose={() => setPermissionsMemberToEdit(null)}
        member={permissionsMemberToEdit}
        actorRole={currentRole}
        onSavePermissions={handleSaveMemberPermissions}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
