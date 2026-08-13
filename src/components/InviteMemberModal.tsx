import React, { useState } from 'react';
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Users, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { OrganizationRole, OrganizationMember, OrganizationInvitation } from '../types';
import { createOrganizationInvitation } from '../lib/teamTenancyService';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName?: string;
  currentUserUid: string;
  currentUserEmail: string;
  currentUserName?: string;
  currentUserRole: OrganizationRole;
  currentMembers: OrganizationMember[];
  currentInvitations: OrganizationInvitation[];
  maxSeats: number;
  availableSeats: number;
  isDarkMode: boolean;
  onInvitationCreated?: (invitation: OrganizationInvitation) => void;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  orgId,
  orgName = 'Enterprise Data Workspace',
  currentUserUid,
  currentUserEmail,
  currentUserName,
  currentUserRole,
  currentMembers,
  currentInvitations,
  maxSeats,
  availableSeats,
  isDarkMode,
  onInvitationCreated
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Member'>('Member');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<OrganizationInvitation | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isOpen) return null;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (availableSeats <= 0) {
      setErrorMessage(`No seats available. The organization has reached its capacity limit (${maxSeats} seats). Please upgrade seats before inviting more members.`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await createOrganizationInvitation({
        orgId,
        orgName,
        email,
        role,
        inviterUid: currentUserUid,
        inviterEmail: currentUserEmail,
        inviterName: currentUserName,
        inviterRole: currentUserRole,
        currentMembers,
        currentInvitations,
        maxSeats
      });

      if (res.success && res.invitation) {
        setCreatedInvite(res.invitation);
        if (onInvitationCreated) {
          onInvitationCreated(res.invitation);
        }
      } else {
        setErrorMessage(res.error || 'Failed to generate invitation.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!createdInvite) return;
    navigator.clipboard.writeText(createdInvite.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const handleResetAndClose = () => {
    setEmail('');
    setRole('Member');
    setErrorMessage(null);
    setCreatedInvite(null);
    setCopiedToken(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn" id="invite-member-modal-overlay">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDarkMode ? 'bg-[#1E293B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight">Invite Team Member</h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Enterprise Workspace: <span className="font-semibold text-blue-400">{orgName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDarkMode ? 'border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Seat Availability Indicator */}
        <div className={`px-5 py-3 border-b text-xs flex items-center justify-between ${
          availableSeats > 0 
            ? isDarkMode ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : isDarkMode ? 'bg-rose-500/5 border-rose-500/10 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          <span className="font-mono font-semibold">
            {availableSeats > 0 ? `${availableSeats} Seats Available (${maxSeats} Max)` : `0 Seats Available (${maxSeats} Limit Reached)`}
          </span>
          <span className="text-[10px] font-mono uppercase font-bold">
            {availableSeats > 0 ? 'Capacity OK' : 'Limit Reached'}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Invitation Error</span>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {createdInvite ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Invitation Created Successfully!</span>
                </div>
                <p className="text-xs text-emerald-300/90">
                  An invitation for <strong className="text-white">{createdInvite.email}</strong> as an <strong className="text-white">{createdInvite.role}</strong> has been generated and is valid for 7 days.
                </p>
              </div>

              <div className={`p-4 rounded-xl border space-y-3 ${
                isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase font-bold text-slate-400">
                    Invitation Token & Code
                  </label>
                  <span className="text-[10px] font-mono text-cyan-400">Expires in 7 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdInvite.token}
                    className={`flex-1 px-3 py-2 text-xs font-mono rounded-lg border select-all ${
                      isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Share this secure token with <span className="font-semibold text-slate-200">{createdInvite.email}</span>. They can sign in to CSV Auditor Pro and enter this token to instantly join your team.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-4">
              {/* Email input */}
              <div>
                <label className="block text-xs font-bold uppercase font-mono text-slate-400 mb-1.5">
                  Member Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    disabled={isLoading || availableSeats <= 0}
                    className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-[#0F172A] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <span className="block text-[10px] text-slate-400 font-mono mt-1">
                  The recipient must sign in to CSV Auditor Pro using this email to redeem access.
                </span>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold uppercase font-mono text-slate-400 mb-1.5">
                  Assigned Tenancy Role <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('Member')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'Member'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-400 ring-1 ring-blue-500/30'
                        : isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Member
                      </span>
                      {role === 'Member' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Standard access to run audits, collaborate on CSV files, and post cell annotations.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('Admin')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'Admin'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-400 ring-1 ring-blue-500/30'
                        : isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> Admin
                      </span>
                      {role === 'Admin' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Administrative rights to invite teammates, manage member access, and update org settings.
                    </p>
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || availableSeats <= 0}
                  className={`px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white transition-all flex items-center gap-2 cursor-pointer ${
                    isLoading || availableSeats <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500 shadow-sm'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Invitation...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
