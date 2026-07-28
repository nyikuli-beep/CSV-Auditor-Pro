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
  BadgeCheck
} from 'lucide-react';
import { TeamMember, AuditActivity } from '../types';

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
}

interface CommentThread {
  id: string;
  author: string;
  role: string;
  text: string;
  time: string;
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
  onSwitchActiveUser
}: TeamCollaborationProps) {
  const AUTHORIZED_EMAILS = ['nyikulibramwel@gmail.com', 'nyikuli@company.com'];
  const isAuthorizedUser = (currentUserRole === 'Owner' || currentUserRole === 'Admin') || AUTHORIZED_EMAILS.some(e => e.toLowerCase() === (currentUserEmail || '').toLowerCase().trim());

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

  // Local comments state
  const [comments, setComments] = useState<CommentThread[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

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
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'
    };

    onInviteMember(newMemberRecord);

    setInviteName('');
    setInviteEmail('');
    setSuccessMsg(`Successfully provisioned ${newMemberRecord.name} (${newMemberRecord.email}) into Workspace Slot #${nextSlotIndex}!`);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSuccessMsg(''), 4500);
  };

  const handleRequestSlotFromAdmin = () => {
    const activeMemberName = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())?.name || currentUserEmail;
    setComments([
      ...comments,
      {
        id: `c-${Date.now()}`,
        author: activeMemberName,
        role: 'Member',
        text: `@admin - Requested authorization/additional user slot allocation for team expansion.`,
        time: 'Just now'
      }
    ]);
    setSuccessMsg('Slot request transmitted to workspace administrator on the annotation board.');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const activeMember = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
    const authorName = activeMember?.name || currentUserEmail.split('@')[0] || 'User';
    const authorRole = activeMember?.role || (isAuthorizedUser ? 'Owner' : 'Member');

    setComments([
      ...comments,
      {
        id: `c-${Date.now()}`,
        author: authorName,
        role: authorRole,
        text: newCommentText,
        time: 'Just now'
      }
    ]);
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

          {onSwitchActiveUser && (
            <div className={`pl-3 border-l flex items-center gap-1.5 min-w-0 max-w-full shrink ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase shrink-0 flex items-center gap-1">
                {!isAuthorizedUser && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                Test As:
              </label>
              <select
                value={currentUserEmail}
                onChange={(e) => {
                  const targetMember = members.find(m => m.email === e.target.value);
                  if (targetMember) {
                    const isTargetProtected = AUTHORIZED_EMAILS.some(
                      email => email.toLowerCase() === targetMember.email.toLowerCase().trim()
                    );
                    if (isTargetProtected && !isAuthorizedUser) {
                      setErrorMsg(`Security Blocked: Your session email (${currentUserEmail}) is not authorized to access or switch to protected owner account (${targetMember.email}).`);
                      return;
                    }
                    if (onSwitchActiveUser) {
                      onSwitchActiveUser(targetMember);
                    }
                  }
                }}
                className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer truncate max-w-[170px] sm:max-w-[220px] md:max-w-[260px] ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                {members.map(m => {
                  const isProtected = AUTHORIZED_EMAILS.some(
                    email => email.toLowerCase() === m.email.toLowerCase().trim()
                  );
                  const isDisabled = isProtected && !isAuthorizedUser;
                  return (
                    <option 
                      key={m.id} 
                      value={m.email}
                      disabled={isDisabled}
                      className={isDisabled ? 'opacity-40 text-slate-400 bg-slate-900 font-mono' : ''}
                    >
                      {isDisabled 
                        ? `[Locked] ${m.name} (${m.email}) - Access Restricted` 
                        : `${m.name} (${m.email})`}
                    </option>
                  );
                })}
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
                      Only authorized owner emails <strong className="text-blue-400 underline font-mono">nyikulibramwel@gmail.com</strong> and <strong className="text-blue-400 underline font-mono">nyikuli@company.com</strong> have permission to access user slot provisioning, add new team collaborators, and delete workspace members.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 font-mono">
                      Current authenticated user: <span className="font-bold text-amber-300">{currentUserEmail}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex justify-end">
                  <button
                    onClick={handleRequestSlotFromAdmin}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
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
                  const isPrimaryOwner = ['nyikulibramwel@gmail.com', 'nyikuli@company.com'].includes(m.email.toLowerCase());

                  return (
                    <div key={m.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/10 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                          Slot #{idx + 1}
                        </span>

                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-slate-800 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0 font-bold text-[10px] flex items-center justify-center text-white border border-slate-700">
                            {m.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold truncate">{m.name}</span>
                            {isPrimaryOwner && (
                              <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded border border-violet-500/20">
                                Primary Workspace Owner
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate font-mono">{m.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        {getRoleBadge(m.role)}
                        
                        {/* Status Badge */}
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

        {/* Right column: discussion threads & cell annotation board */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-6 rounded-2xl border flex flex-col justify-between h-[520px] ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="border-b border-dashed border-slate-800/50 pb-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg"><MessageSquare className="w-4 h-4" /></div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Cell Annotation Board</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Realtime Log</span>
            </div>

            {/* Comments list feed */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-1 bg-slate-950/20 p-3 rounded-xl border border-slate-850/40 text-left">
                  <div className="flex justify-between items-baseline gap-1 flex-wrap">
                    <span className="font-bold text-blue-400">
                      {comment.author}{' '}
                      <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-400 ml-1 uppercase">
                        {comment.role}
                      </span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> {comment.time}
                    </span>
                  </div>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{comment.text}</p>
                </div>
              ))}
            </div>

            {/* Add Comment input */}
            <form onSubmit={handleAddComment} className="mt-4 pt-4 border-t border-dashed border-slate-800/50 flex gap-2">
              <input 
                type="text" 
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={`Post annotation as ${currentUserEmail}...`}
                className={`flex-1 px-3 py-2 text-xs focus:outline-none border rounded-xl ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950 focus:border-blue-600'
                }`}
              />
              <button 
                type="submit"
                className={`p-2 text-white rounded-xl shadow cursor-pointer ${accentClass}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
