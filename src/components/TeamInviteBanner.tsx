import React from 'react';
import { Mail, CheckCircle2, X, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { OrganizationInvitation } from '../types';

interface TeamInviteBannerProps {
  invitation: OrganizationInvitation;
  isDarkMode: boolean;
  onAccept: (invitation: OrganizationInvitation) => void;
  onDismiss: () => void;
}

export default function TeamInviteBanner({
  invitation,
  isDarkMode,
  onAccept,
  onDismiss
}: TeamInviteBannerProps) {
  const expiresFormatted = new Date(invitation.expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className={`w-full border-b transition-colors ${
      isDarkMode 
        ? 'bg-[#0F172A] border-blue-900/60 text-slate-100' 
        : 'bg-[#EFF6FF] border-blue-200 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left Section */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs tracking-tight text-blue-700 dark:text-blue-400">
                Workspace Invitation
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shrink-0">
                Role: {invitation.role}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{invitation.invitedByName || invitation.invitedByEmail}</span> invited you to join <span className="font-semibold text-slate-900 dark:text-slate-100">"{invitation.organizationName || 'Enterprise Workspace'}"</span> (Expires {expiresFormatted}).
            </p>
          </div>
        </div>

        {/* Right Section / Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => onAccept(invitation)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accept & Join</span>
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
