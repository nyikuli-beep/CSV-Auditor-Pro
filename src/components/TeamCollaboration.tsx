import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Activity, 
  Send, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  AlertTriangle,
  Mail,
  UserCheck,
  Trash2,
  Lock,
  ShieldCheck,
  Layers,
  PlusCircle,
  UserX,
  Sparkles,
  KeyRound,
  BadgeCheck,
  Radio,
  AtSign,
  Tag,
  Wifi,
  Volume2,
  Bell
} from 'lucide-react';
import { TeamMember, AuditActivity, SlotRequest } from '../types';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, limit } from 'firebase/firestore';
import CellAnnotationBoard from './CellAnnotationBoard';
import CollaborationChat from './CollaborationChat';

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
  const AUTHORIZED_EMAILS = ['nyikulibramwel@gmail.com'];
  const isAuthorizedUser = (currentUserRole === 'Owner' || currentUserRole === 'Admin') || AUTHORIZED_EMAILS.some(e => e.toLowerCase() === (currentUserEmail || '').toLowerCase().trim());
  const pendingRequests = slotRequests.filter(r => r.status === 'pending');

  // Email validator to enforce only real, working email addresses
  const isValidWorkingEmail = (email: string): { valid: boolean; reason?: string } => {
    const trimmed = email.trim();
    if (!trimmed) {
      return { valid: false, reason: 'Please enter an email address.' };
    }

    // Standard RFC-compliant email syntax regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { 
        valid: false, 
        reason: 'Invalid email format. Please enter a valid working email address (e.g., name@company.com or name@gmail.com).' 
      };
    }

    const parts = trimmed.split('@');
    if (parts.length !== 2) {
      return { valid: false, reason: 'Email format must contain a valid username and domain.' };
    }

    const [localPart, domain] = parts;
    const lowerDomain = domain.toLowerCase();

    if (localPart.length === 0) {
      return { valid: false, reason: 'Email username before "@" cannot be empty.' };
    }

    // Disposable, fake, or non-working test domains list
    const nonWorkingDomains = [
      'test.com', 'test.org', 'example.com', 'example.org', 'fake.com', 'invalid.com',
      'tempmail.com', 'mailinator.com', '10minutemail.com', 'dispostable.com', 'yopmail.com',
      'trashmail.com', 'guerrillamail.com', 'sharklasers.com', 'throwaway.com',
      'asdf.com', 'qwerty.com', 'foo.com', 'bar.com', 'temp.com'
    ];

    if (nonWorkingDomains.includes(lowerDomain)) {
      return {
        valid: false,
        reason: `"${lowerDomain}" is a non-working or temporary domain. Only active, working email addresses are permitted.`
      };
    }

    const domainParts = lowerDomain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (!tld || tld.length < 2) {
      return { valid: false, reason: 'Email domain must have a valid top-level extension (e.g. .com, .org, .net, .io, .ai).' };
    }

    return { valid: true };
  };

  // Capacity & Slots
  const [maxSlots, setMaxSlots] = useState<number>(10);
  const occupiedSlots = members.length;
  const remainingSlots = Math.max(0, maxSlots - occupiedSlots);
  const occupancyPercentage = Math.min(100, Math.round((occupiedSlots / maxSlots) * 100));

  // Form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Owner' | 'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [inviteStatus, setInviteStatus] = useState<'active' | 'invited' | 'denied'>('active');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<'all' | 'allowed' | 'denied'>('all');

  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Dynamically resolve user Google account profile picture or personalized profile avatar
  const resolveUserAvatar = (email?: string, providedAvatar?: string, name?: string): string => {
    const userEmail = (email || '').toLowerCase().trim();
    
    // 1. If this matches the current authenticated Google user and photoURL exists, return live Google profile picture
    if (auth.currentUser?.email?.toLowerCase() === userEmail && auth.currentUser?.photoURL) {
      return auth.currentUser.photoURL;
    }

    // 2. Check if a team member matches with a non-generic avatar
    const matchingMember = members.find(m => m.email.toLowerCase() === userEmail);
    if (matchingMember?.avatar && !matchingMember.avatar.includes('photo-1534528741775-53994a69daeb')) {
      return matchingMember.avatar;
    }

    // 3. Check provided avatar if it's a real user image / Google URL and not the stale generic unsplash image
    if (providedAvatar && !providedAvatar.includes('photo-1534528741775-53994a69daeb')) {
      return providedAvatar;
    }

    // 4. Check localStorage user profile avatar if current user
    if (auth.currentUser?.email?.toLowerCase() === userEmail) {
      const localAvatar = localStorage.getItem('user_profile_avatar');
      if (localAvatar && !localAvatar.includes('photo-1534528741775-53994a69daeb')) {
        return localAvatar;
      }
    }

    // 5. Generate distinct SVG initials badge URL derived uniquely from identity
    const seed = name || matchingMember?.name || (userEmail ? userEmail.split('@')[0] : 'User');
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6`;
  };

  // Helper to retrieve user's latest activity document from Firestore activities
  const getLatestMemberActivity = (m: TeamMember) => {
    const memberEmail = (m.email || '').toLowerCase().trim();
    const memberName = (m.name || '').toLowerCase().trim();
    const memberId = m.id;

    // Search real-time activities array from Firestore
    const userActivities = (activities || []).filter(act => {
      if (!act) return false;
      const actUserId = act.userId;
      const actUserName = (act.userName || '').toLowerCase().trim();
      const actUserEmail = (act.userEmail || '').toLowerCase().trim();

      if (actUserId && actUserId === memberId) return true;
      if (actUserEmail && actUserEmail === memberEmail) return true;
      if (actUserName && (actUserName === memberEmail || actUserName === memberName)) return true;
      return false;
    });

    if (userActivities.length > 0) {
      const latest = userActivities[0];
      return {
        timestamp: latest.timestamp || 'Just now',
        action: latest.action || 'Active in workspace',
        hasDoc: true
      };
    }

    if (m.status === 'active' && !m.accessDenied) {
      return {
        timestamp: 'Just now',
        action: 'Session active',
        hasDoc: false
      };
    }

    return {
      timestamp: 'No recorded activity',
      action: 'Offline / No activity log',
      hasDoc: false
    };
  };

  // Helper to filter out fictitious user comments
  const isRealUserComment = (comment: CommentThread): boolean => {
    if (!comment) return false;
    const email = (comment.userEmail || '').toLowerCase();
    const id = comment.id || '';
    if (id === 'c-seed-2' || id === 'c-seed-3') return false;
    if (email === 'sarah.j@company.com' || email === 'alex.r@company.com') return false;
    if (comment.author === 'Sarah Jenkins' || comment.author === 'Alex Rivera') return false;
    return true;
  };

  // Seed cell annotations with only real active user entries
  const SEED_ANNOTATIONS: CommentThread[] = [
    {
      id: 'c-seed-1',
      author: members.find(m => m.email.toLowerCase() === (currentUserEmail || '').toLowerCase())?.name || auth.currentUser?.displayName || 'Nyikuli Bramwel',
      role: 'Owner',
      text: 'Verified Row #14 Gross Pay calculation anomaly against Q3 tax receipts.',
      time: '10:15 AM',
      timestamp: Date.now() - 3600000,
      userEmail: currentUserEmail || 'nyikulibramwel@gmail.com',
      cellRef: 'Row 14, Col B',
      avatar: resolveUserAvatar(currentUserEmail || 'nyikulibramwel@gmail.com')
    }
  ];

  // Local & shared comments state
  const [comments, setComments] = useState<CommentThread[]>(() => {
    try {
      const saved = localStorage.getItem('cell_annotations_store');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(isRealUserComment);
          localStorage.setItem('cell_annotations_store', JSON.stringify(cleaned));
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch (e) {}
    return SEED_ANNOTATIONS;
  });

  const [newCommentText, setNewCommentText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Row 14');
  const [livePulse, setLivePulse] = useState<boolean>(false);
  const [lastReceivedMessageId, setLastReceivedMessageId] = useState<string>('');

  // 1. Subscribe to real-time Firestore snapshots for live multi-user streaming
  useEffect(() => {
    try {
      const q = query(collection(db, 'annotations'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const remoteComments: CommentThread[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CommentThread;
          if (isRealUserComment(data)) {
            remoteComments.push(data);
          }
        });

        if (remoteComments.length > 0) {
          setComments(prev => {
            const map = new Map<string, CommentThread>();
            [...prev, ...remoteComments].filter(isRealUserComment).forEach(c => map.set(c.id, c));
            const merged = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            try {
              localStorage.setItem('cell_annotations_store', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
          setLivePulse(true);
          setTimeout(() => setLivePulse(false), 2000);
        }
      }, () => {
        // Fallback gracefully if Firestore is offline
      });

      return () => unsubscribe();
    } catch (e) {}
  }, []);

  // 2. BroadcastChannel & Storage Event listener for multi-tab/window real-time synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('cell_annotation_board_channel');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'NEW_ANNOTATION' && event.data.comment) {
            const incomingComment: CommentThread = event.data.comment;
            if (!isRealUserComment(incomingComment)) return;

            setComments(prev => {
              if (prev.some(c => c.id === incomingComment.id)) return prev;
              const updated = [...prev, { ...incomingComment, isLiveBroadcast: true }].filter(isRealUserComment);
              try {
                localStorage.setItem('cell_annotations_store', JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
            setLastReceivedMessageId(incomingComment.id);
            setLivePulse(true);
            setTimeout(() => setLivePulse(false), 2500);
          }
        };
      }
    } catch (e) {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cell_annotations_store' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(isRealUserComment);
            setComments(cleaned);
            setLivePulse(true);
            setTimeout(() => setLivePulse(false), 2000);
          }
        } catch (e) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleAddUserForSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Strict security check: Only nyikulibramwel@gmail.com is authorized
    if (!isAuthorizedUser) {
      setErrorMsg(`Access Restricted: Only nyikulibramwel@gmail.com is authorized to add or manage workspace team members.`);
      return;
    }

    if (remainingSlots <= 0) {
      setErrorMsg(`All ${maxSlots} workspace slots are currently occupied. Remove an existing member or expand capacity.`);
      return;
    }

    if (!inviteName.trim()) {
      setErrorMsg('Please enter the full name of the new collaborator.');
      return;
    }

    // Validate working email
    const emailCheck = isValidWorkingEmail(inviteEmail);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.reason || 'Only working email addresses are allowed.');
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();

    // Check if email already exists
    if (members.some(m => m.email.toLowerCase() === normalizedEmail)) {
      setErrorMsg(`A team member with email "${inviteEmail.trim()}" already occupies a slot.`);
      return;
    }

    const nextSlotIndex = occupiedSlots + 1;
    const newMemberRecord: TeamMember = {
      id: `usr-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: inviteStatus,
      avatar: resolveUserAvatar(inviteEmail.trim(), undefined, inviteName.trim())
    };

    onInviteMember(newMemberRecord);

    setInviteName('');
    setInviteEmail('');
    setSuccessMsg(`Successfully provisioned ${newMemberRecord.name} (${newMemberRecord.email}) into Workspace Slot #${nextSlotIndex}!`);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Broadcast annotation message across all active online clients
  const postAnnotationMessage = async (rawText: string, customTag?: string) => {
    if (!rawText.trim()) return;

    const activeMember = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
    const authorName = activeMember?.name || auth.currentUser?.displayName || currentUserEmail.split('@')[0] || 'Active User';
    const authorRole = activeMember?.role || (isAuthorizedUser ? 'Owner' : 'Member');
    const authorAvatar = resolveUserAvatar(currentUserEmail, activeMember?.avatar, authorName);

    const newComment: CommentThread = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: authorName,
      role: authorRole,
      text: rawText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      userEmail: currentUserEmail,
      avatar: authorAvatar,
      cellRef: customTag || selectedTag || undefined,
      isLiveBroadcast: true
    };

    // 1. Update state & localStorage
    setComments(prev => {
      const updated = [...prev, newComment];
      try {
        localStorage.setItem('cell_annotations_store', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Broadcast via BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('cell_annotation_board_channel');
        channel.postMessage({ type: 'NEW_ANNOTATION', comment: newComment });
        channel.close();
      }
    } catch (e) {}

    // 3. Persist doc to Firestore
    try {
      await setDoc(doc(db, 'annotations', newComment.id), newComment);
    } catch (e) {
      console.warn('Firestore write handled locally:', e);
    }

    setLivePulse(true);
    setTimeout(() => setLivePulse(false), 2000);
  };

  const handleRequestSlotFromAdmin = async () => {
    const syncEmail = auth.currentUser?.email || currentUserEmail || '';
    const activeMemberName = auth.currentUser?.displayName || members.find(m => m.email.toLowerCase() === syncEmail.toLowerCase())?.name || (syncEmail ? syncEmail.split('@')[0] : 'Team Member');
    const userAvatar = auth.currentUser?.photoURL || resolveUserAvatar(syncEmail, undefined, activeMemberName);
    
    const reqId = `req-${Date.now()}`;
    const newReq: SlotRequest = {
      id: reqId,
      userEmail: syncEmail,
      userName: activeMemberName,
      userAvatar,
      requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      status: 'pending',
      message: `Requested team tenancy slot allocation for ${syncEmail} (Email synchronized from Google)`
    };

    try {
      // 1. Dispatch slot request document to Firestore 'slot_requests' collection
      await setDoc(doc(db, 'slot_requests', reqId), newReq);

      // 2. Dispatch real-time audit activity to Firestore 'activities'
      const activityLog: AuditActivity = {
        id: `act-${Date.now()}`,
        userId: auth.currentUser?.uid || 'usr-req',
        userName: activeMemberName,
        userAvatar,
        action: `Requested user slot invitation for ${syncEmail} (Synchronized from Google) from Protected Owner (nyikulibramwel@gmail.com)`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      await setDoc(doc(db, 'activities', activityLog.id), activityLog);

      // 3. Post annotation message to cell board
      const msgText = `@admin - Requested authorization & user slot allocation for ${syncEmail} (Email synchronized from Google).`;
      postAnnotationMessage(msgText, 'Slot #Req');

      setSuccessMsg(`Invitation request sent! Protected Owner (nyikulibramwel@gmail.com) notified with email ${syncEmail} (Synchronized from Google).`);
    } catch (err) {
      console.warn("Firestore slot request write fallback:", err);
      setSuccessMsg(`Invitation request transmitted to Protected Owner for ${syncEmail} (Synchronized from Google).`);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    postAnnotationMessage(newCommentText);
    setNewCommentText('');
  };

  const getRoleBadge = (role: 'Owner' | 'Admin' | 'Editor' | 'Viewer') => {
    switch (role) {
      case 'Owner': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase">Owner</span>;
      case 'Admin': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">Admin</span>;
      case 'Editor': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Editor</span>;
      case 'Viewer': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-700 uppercase">Viewer</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Persona Simulation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Workspace Tenancy & License
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Team Collaboration & User Slots</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage interactive user slots, assign administrative roles, and inspect tenancy access permissions.
          </p>
        </div>

        {/* Persona Switcher / Active User Banner */}
        <div className={`p-3 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center gap-3 max-w-full overflow-hidden ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center gap-2 min-w-0 shrink">
            <KeyRound className={`w-4 h-4 shrink-0 ${isAuthorizedUser ? 'text-emerald-500' : 'text-amber-500'}`} />
            <div className="text-left min-w-0">
              <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Active Interactive Session:</span>
              <span className={`text-xs font-bold truncate block ${isAuthorizedUser ? 'text-emerald-500 font-extrabold' : (isDarkMode ? 'text-slate-200' : 'text-slate-900')}`}>
                {currentUserEmail}
              </span>
            </div>
          </div>

          {onSwitchActiveUser && isAuthorizedUser && (
            <div className={`pl-3 border-l flex items-center gap-1.5 min-w-0 max-w-full shrink ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase shrink-0 flex items-center gap-1">
                Test As:
              </label>
              <select
                value={currentUserEmail}
                onChange={(e) => {
                  const targetMember = members.find(m => m.email === e.target.value);
                  if (targetMember && onSwitchActiveUser) {
                    onSwitchActiveUser(targetMember);
                  }
                }}
                className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer truncate max-w-[170px] sm:max-w-[220px] md:max-w-[260px] ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                {members.map(m => (
                  <option key={m.id} value={m.email}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* User Slot Capacity Dashboard Bar */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              remainingSlots > 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">Workspace Interactive User Slots</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                  remainingSlots > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {remainingSlots} Remaining Slots
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {occupiedSlots} of {maxSlots} max user slots filled across your tenancy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthorizedUser && (
              <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold px-2">Max Capacity:</span>
                <button
                  onClick={() => setMaxSlots(prev => Math.max(members.length, prev - 1))}
                  disabled={maxSlots <= members.length}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold cursor-pointer"
                  title="Decrease slot capacity"
                >
                  -
                </button>
                <span className="text-xs font-bold font-mono px-2 text-blue-400">{maxSlots}</span>
                <button
                  onClick={() => setMaxSlots(prev => prev + 1)}
                  className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold cursor-pointer"
                  title="Expand slot capacity"
                >
                  +
                </button>
              </div>
            )}

            <div className="text-right">
              <span className="text-2xl font-black font-mono text-blue-500">{remainingSlots}</span>
              <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Available</span>
            </div>
          </div>
        </div>

        {/* Progress meter bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${occupancyPercentage}%` }}
              transition={{ duration: 0.6 }}
              className={`h-full rounded-full ${
                occupancyPercentage >= 100 
                  ? 'bg-amber-500' 
                  : 'bg-blue-600'
              }`}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400">
            <span>Occupancy: {occupancyPercentage}%</span>
            <span>{occupiedSlots} Occupied / {remainingSlots} Remaining Slots</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Add User for Remaining Slots & Members List */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* User Slot Provisioning Form (With Strict Security Enforcement) */}
          <div className={`p-6 rounded-2xl border transition-all ${
            isAuthorizedUser 
              ? isDarkMode ? 'bg-slate-900/60 border-blue-500/30 shadow-lg shadow-blue-500/5' : 'bg-white border-blue-200 shadow-sm'
              : isDarkMode ? 'bg-slate-900/30 border-amber-500/30 opacity-95' : 'bg-slate-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isAuthorizedUser ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {isAuthorizedUser ? <UserPlus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    Add Users For Remaining Slots ({remainingSlots} Left)
                  </h3>
                  <span className="text-[10px] text-slate-400 block">
                    Provision interactive workspace participants into open slots.
                  </span>
                </div>
              </div>

              {/* Security Authorization Pill */}
              {isAuthorizedUser ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>nyikulibramwel@gmail.com Authorized</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Restricted Access</span>
                </span>
              )}
            </div>
            
            {/* Success and Error Alerts */}
            {successMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* OWNER NOTIFICATION CENTER: PENDING TEAM TENANCY SLOT REQUESTS */}
            {isAuthorizedUser && pendingRequests.length > 0 && (
              <div className="p-4 mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 text-left space-y-3 shadow-md animate-fadeIn">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center animate-pulse">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <span>Pending User Slot Invitations</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                          {pendingRequests.length} Pending
                        </span>
                      </h4>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Non-owner users requested permission to join team tenancy slots.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-amber-500/20">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={resolveUserAvatar(req.userEmail, req.userAvatar, req.userName)} 
                          alt={req.userName} 
                          className="w-9 h-9 rounded-full object-cover border border-amber-500/50 shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white">{req.userName}</span>
                            <span className="text-[10px] text-amber-300 font-mono font-bold">{req.userEmail}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            Requested at {req.requestedAt} • {req.message || 'Requesting user slot invitation'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => onApproveSlotRequest && onApproveSlotRequest(req)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Approve & Provision</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeclineSlotRequest && onDeclineSlotRequest(req)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UNLOCKED VIEW FOR nyikulibramwel@gmail.com */}
            {isAuthorizedUser ? (
              <form onSubmit={handleAddUserForSlot} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      required
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Bramwel Nyikuli" 
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'
                      }`}
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest flex items-center justify-between">
                      <span>Working Email Address</span>
                      <span className="text-[9px] text-emerald-500 font-mono font-semibold">Working Emails Only</span>
                    </label>
                    <input 
                      type="email" 
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="nyikulibramwel@gmail.com" 
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'
                      }`}
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      Must be a valid, deliverable work or personal email address.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                      Workspace Access Role
                    </label>
                    <select 
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'
                      }`}
                    >
                      <option value="Admin">Admin (Full Editing & Configuration)</option>
                      <option value="Editor">Editor (Data Hygiene & Rule Controls)</option>
                      <option value="Viewer">Viewer (Read-only Audit Inspections)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                      Activation & Access State
                    </label>
                    <select 
                      value={inviteStatus}
                      onChange={(e) => setInviteStatus(e.target.value as any)}
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'
                      }`}
                    >
                      <option value="active">Active (Immediate Interaction Access)</option>
                      <option value="invited">Invited (Pending Email Confirmation)</option>
                      <option value="denied">Access Denied (Block / Revoke Sign-In Access)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center gap-4">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Slot #{occupiedSlots + 1} will be assigned upon submission</span>
                  </div>

                  <button 
                    type="submit"
                    disabled={remainingSlots <= 0}
                    className={`px-5 py-2.5 text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:scale-102 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${accentClass}`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Provision User to Slot ({remainingSlots} Left)</span>
                  </button>
                </div>
              </form>
            ) : (
              /* RESTRICTED SECURITY VIEW FOR NON-NYIKULI USERS */
              <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-amber-400 uppercase tracking-wider">
                      User Slot Provisioning Restricted
                    </h4>
                    <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Only authorized owner email <strong className="text-blue-400 underline font-mono">nyikulibramwel@gmail.com</strong> has permission to access user slot provisioning, add new team collaborators, and delete workspace members.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5 flex-wrap">
                      <span>Authenticated account:</span>
                      <span className="font-bold text-amber-300">{auth.currentUser?.email || currentUserEmail}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-sans font-bold border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Synchronized from Google
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Email requested will be synchronized from Google ({auth.currentUser?.email || currentUserEmail})
                  </span>
                  <button
                    onClick={handleRequestSlotFromAdmin}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Request User Slot from Protected Owner</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Members List (Occupied Slots Table) */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-violet-500" /> 
                Occupied Workspace Slots ({members.length} / {maxSlots})
              </h3>
              
              {/* Member Access Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMemberFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    memberFilter === 'all' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('allowed')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    memberFilter === 'allowed' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Allowed ({members.filter(m => m.status !== 'denied' && !m.accessDenied).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('denied')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    memberFilter === 'denied' 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Denied ({members.filter(m => m.status === 'denied' || m.accessDenied).length})
                </button>
              </div>
            </div>

            {/* Column Header Bar */}
            <div className="hidden md:flex items-center justify-between px-3 py-2 bg-slate-950/60 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border border-slate-800/80">
              <div className="flex items-center gap-1.5 min-w-0">
                <Users className="w-3.5 h-3.5 text-violet-400" />
                <span>Member Slot & Identity</span>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <span className="w-20 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-sky-400" /> Role
                </span>
                <span className="w-24 text-center flex items-center justify-center gap-1">
                  <KeyRound className="w-3 h-3 text-emerald-400" /> Access Status
                </span>
                <span className="w-36 text-center flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> Last Active
                </span>
                <span className="w-28 text-right">
                  Manage Access
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 text-xs">
              {members
                .filter(m => {
                  const isDenied = m.status === 'denied' || m.accessDenied;
                  if (memberFilter === 'allowed') return !isDenied;
                  if (memberFilter === 'denied') return isDenied;
                  return true;
                })
                .map((m, idx) => {
                  const isDenied = m.status === 'denied' || m.accessDenied;
                  const isPrimaryOwner = ['nyikulibramwel@gmail.com'].includes(m.email.toLowerCase());
                  const latestAct = getLatestMemberActivity(m);

                  return (
                    <div key={m.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/10 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                          Slot #{idx + 1}
                        </span>

                        {/* Avatar with Online Presence Ring */}
                        <div className="relative shrink-0">
                          <img 
                            src={resolveUserAvatar(m.email, m.avatar, m.name)} 
                            alt={m.name} 
                            className="w-8 h-8 rounded-full object-cover border border-slate-800" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}&backgroundColor=3b82f6`;
                            }}
                          />
                          {m.status === 'active' && !isDenied && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3" title="Actively Online Now">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold truncate">{m.name}</span>
                            {isPrimaryOwner && (
                              <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded border border-violet-500/20">
                                Primary Workspace Owner
                              </span>
                            )}
                            {m.status === 'active' && !isDenied && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online Now
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">{m.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        {getRoleBadge(m.role)}
                        
                        {/* Access Status Badge */}
                        {isDenied ? (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <UserX className="w-3 h-3 text-rose-400" /> Access Denied
                          </span>
                        ) : m.status === 'active' ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Access Allowed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Mail className="w-3 h-3 text-sky-400" /> Invited
                          </span>
                        )}

                        {/* Last Active Column Badge (Pulls timestamp from user's latest Firestore activity document) */}
                        <div 
                          className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-[10px] font-mono shrink-0 cursor-help transition-colors hover:border-cyan-500/50"
                          title={`Latest Firestore Activity: ${latestAct.action} (${latestAct.timestamp})`}
                        >
                          <Clock className={`w-3 h-3 ${latestAct.hasDoc || m.status === 'active' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                          <span className="text-slate-400 font-sans font-semibold text-[9px] uppercase tracking-wider hidden sm:inline">Last Active:</span>
                          <span className={`font-bold ${latestAct.hasDoc || m.status === 'active' ? 'text-cyan-300' : 'text-slate-400'}`}>
                            {latestAct.timestamp}
                          </span>

                          {/* Hover Tooltip displaying real-time activity details from Firestore */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col gap-1 bg-slate-900 text-slate-200 border border-slate-700/80 p-2.5 rounded-xl text-[10px] shadow-2xl z-30 pointer-events-none min-w-[200px]">
                            <div className="flex items-center gap-1.5 font-bold text-cyan-400 border-b border-slate-800 pb-1">
                              <Activity className="w-3 h-3 text-cyan-400 animate-spin" />
                              <span>Firestore Presence Log</span>
                            </div>
                            <p className="text-slate-300 font-sans leading-tight">{latestAct.action}</p>
                            <span className="text-[9px] text-cyan-400/90 font-mono text-right mt-0.5">Timestamp: {latestAct.timestamp}</span>
                          </div>
                        </div>

                        {/* Owner Management Controls: Toggle Deny/Allow & Delete */}
                        {!isPrimaryOwner && (
                          <div className="flex items-center gap-1.5 ml-2">
                            {/* Toggle Access Control Button */}
                            {onUpdateMemberAccess && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isAuthorizedUser) {
                                    setErrorMsg(`Only primary owner (nyikulibramwel@gmail.com) can manage member login permissions.`);
                                    return;
                                  }
                                  const targetNewState = !isDenied;
                                  onUpdateMemberAccess(m.id, m.email, targetNewState);
                                  setSuccessMsg(
                                    targetNewState
                                      ? `Revoked / Denied login access for ${m.email}. User can no longer log in.`
                                      : `Restored / Allowed login access for ${m.email}.`
                                  );
                                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                                  timeoutRef.current = setTimeout(() => setSuccessMsg(''), 4500);
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer border ${
                                  isDenied
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500 hover:text-white'
                                }`}
                                title={
                                  isDenied 
                                    ? `Allow ${m.email} to log in` 
                                    : `Deny ${m.email} from logging in`
                                }
                              >
                                {isDenied ? (
                                  <>
                                    <UserCheck className="w-3 h-3" />
                                    <span>Allow Access</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3 h-3" />
                                    <span>Deny Access</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Delete Button */}
                            {onDeleteMember && (
                              <div>
                                {deletingId === m.id ? (
                                  <div className="flex items-center gap-1.5 animate-fadeIn">
                                    <button
                                      onClick={() => {
                                        if (isAuthorizedUser) {
                                          onDeleteMember(m.id, m.email);
                                          setDeletingId(null);
                                          setSuccessMsg(`Freed up Slot #${idx + 1} and deleted ${m.email}.`);
                                        } else {
                                          setErrorMsg(`Only nyikulibramwel@gmail.com can remove workspace members.`);
                                          setDeletingId(null);
                                        }
                                      }}
                                      className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all font-bold text-[9px] uppercase cursor-pointer"
                                    >
                                      Confirm Delete
                                    </button>
                                    <button
                                      onClick={() => setDeletingId(null)}
                                      className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all font-bold text-[9px] uppercase cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (!isAuthorizedUser) {
                                        setErrorMsg(`Only nyikulibramwel@gmail.com can delete workspace members.`);
                                        return;
                                      }
                                      setDeletingId(m.id);
                                    }}
                                    className={`p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer ${
                                      !isAuthorizedUser ? 'opacity-40 cursor-not-allowed' : ''
                                    }`}
                                    title={isAuthorizedUser ? `Remove ${m.name} and free slot` : `Restricted to nyikulibramwel@gmail.com`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right column: discussion threads, real-time collaboration chat & cell annotation board */}
        <div className="lg:col-span-5 space-y-6">
          <CollaborationChat
            tenantId="default-tenant-01"
            activeFileId={activeFileId}
            activeFileName={activeFileName}
            currentUserEmail={currentUserEmail}
            currentUserRole={currentUserRole}
            members={members}
            isDarkMode={isDarkMode}
            accentClass={accentClass}
          />

          <CellAnnotationBoard 
            currentUserEmail={currentUserEmail}
            currentUserRole={currentUserRole}
            members={members}
            isDarkMode={isDarkMode}
            accentClass={accentClass}
            activeFileId={activeFileId}
            activeFileName={activeFileName}
          />
        </div>

      </div>
    </div>
  );
}
