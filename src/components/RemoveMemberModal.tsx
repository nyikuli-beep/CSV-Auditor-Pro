import React, { useState } from 'react';
import { UserX, AlertTriangle, ShieldAlert, X, Info } from 'lucide-react';
import { OrganizationMember, OrganizationRole } from '../types';
import { removeOrganizationMember } from '../lib/teamTenancyService';

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  member: OrganizationMember | null;
  actorUid: string;
  actorRole: OrganizationRole;
  isDarkMode: boolean;
  onMemberRemoved: (memberUid: string) => void;
}

export default function RemoveMemberModal({
  isOpen,
  onClose,
  orgId,
  member,
  actorUid,
  actorRole,
  isDarkMode,
  onMemberRemoved
}: RemoveMemberModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const handleConfirmRemoval = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await removeOrganizationMember({
        orgId,
        memberUid: member.uid,
        memberRole: member.role,
        actorUid,
        actorRole
      });

      if (res.success) {
        onMemberRemoved(member.uid);
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to remove member.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while removing member.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn" id="remove-member-modal-overlay">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDarkMode ? 'bg-[#1E293B] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight">Remove Organization Member</h2>
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Access Revocation</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDarkMode ? 'border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Member Card */}
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
            isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <img
              src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.displayName || member.email)}&backgroundColor=3b82f6`}
              alt={member.displayName}
              className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs truncate">{member.displayName}</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {member.role}
                </span>
              </div>
              <span className={`text-[11px] font-mono block truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {member.email}
              </span>
              <span className="text-[9px] font-mono text-slate-500 block mt-0.5 truncate">
                UID: {member.uid}
              </span>
            </div>
          </div>

          {/* Explicit Notice on Tenancy Revocation vs Auth Account */}
          <div className={`p-4 rounded-xl border text-xs space-y-2 ${
            isDarkMode ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>Tenancy Access Policy Notice:</span>
            </div>
            <ul className="space-y-1 text-[11px] list-disc list-inside leading-relaxed">
              <li>Removing this user will <strong>immediately revoke their access</strong> to this Enterprise Organization, its shared CSV workspaces, and team features.</li>
              <li>Their personal <strong>Firebase Authentication account will NOT be deleted</strong>.</li>
              <li>Any allocated seat occupied by this member will be freed immediately.</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRemoval}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Revoking Access...</span>
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5" />
                  <span>Confirm Revoke Access</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
