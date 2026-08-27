import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, X, Sparkles, Building2, ShieldCheck } from 'lucide-react';
import { OrganizationMember } from '../types';
import { acceptOrganizationInvitation } from '../lib/teamTenancyService';
import { User } from 'firebase/auth';

interface AcceptInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  user: User | null;
  isDarkMode: boolean;
  prefilledToken?: string;
  onJoined: (member: OrganizationMember) => void;
}

export default function AcceptInviteModal({
  isOpen,
  onClose,
  orgId,
  user,
  isDarkMode,
  prefilledToken = '',
  onJoined
}: AcceptInviteModalProps) {
  const [tokenInput, setTokenInput] = useState(prefilledToken);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMember, setSuccessMember] = useState<OrganizationMember | null>(null);

  if (!isOpen) return null;

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const activeUid = user?.uid || localStorage.getItem('user_profile_uid') || `usr-${Date.now().toString(36)}`;
    const activeEmail = (user?.email || localStorage.getItem('user_profile_email') || '').toLowerCase().trim();
    const activeDisplayName = user?.displayName || localStorage.getItem('user_profile_name') || (activeEmail ? activeEmail.split('@')[0] : 'Team Member');
    const activeAvatar = user?.photoURL || localStorage.getItem('user_profile_avatar') || undefined;

    if (!activeUid) {
      setErrorMessage('You must be signed in to accept an invitation.');
      return;
    }

    if (!tokenInput.trim()) {
      setErrorMessage('Please enter an invitation token or code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await acceptOrganizationInvitation({
        orgId,
        tokenOrId: tokenInput.trim(),
        user: {
          uid: activeUid,
          email: activeEmail,
          displayName: activeDisplayName,
          photoURL: activeAvatar
        }
      });

      if (res.success && res.member) {
        setSuccessMember(res.member);
        onJoined(res.member);
      } else {
        setErrorMessage(res.error || 'Failed to accept invitation.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while accepting the invitation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTokenInput('');
    setErrorMessage(null);
    setSuccessMember(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn" id="accept-invite-modal-overlay">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDarkMode ? 'bg-[#1E293B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight">Redeem Invitation Code</h2>
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">Join Enterprise Workspace</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDarkMode ? 'border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          {successMember ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-lg">Welcome to the Team!</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You have joined as an <strong className="text-blue-600 dark:text-blue-400 font-mono">{successMember.role}</strong>. Your account now has full access to the shared Enterprise workspace.
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  Enter Workspace
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase font-mono text-slate-700 dark:text-slate-300 mb-1.5">
                  Invitation Token or ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="e.g. inv_ab12cd34ef56gh78..."
                  className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-[#0F172A] border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                  Paste the 24-character token provided in your team invite.
                </span>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 ${
                isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block uppercase font-bold">Signed in as</span>
                  <span className="font-bold text-xs truncate block text-slate-900 dark:text-slate-100">{user?.email || 'Authenticated User'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !tokenInput.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validating Token...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Accept & Join</span>
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
