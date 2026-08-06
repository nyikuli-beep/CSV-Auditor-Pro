import React from 'react';
import { AlertTriangle, Clock, ShieldAlert, Sparkles, X, ArrowRight } from 'lucide-react';
import { TrialAlert } from '../utils/trialChecker';

interface TrialExpirationBannerProps {
  alert: TrialAlert;
  isDarkMode: boolean;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export default function TrialExpirationBanner({
  alert,
  isDarkMode,
  onUpgrade,
  onDismiss
}: TrialExpirationBannerProps) {
  const { daysRemaining, level, title, message, trialEndDate } = alert;

  // Level-based styling using strict color codes without gradients
  let bgClass = '';
  let borderClass = '';
  let textPrimaryClass = '';
  let textSecondaryClass = '';
  let badgeBgClass = '';
  let badgeTextClass = '';
  let buttonBgClass = '';
  let buttonTextClass = '';
  let IconComponent = Clock;

  if (level === 'urgent') { // 1 day left
    IconComponent = ShieldAlert;
    if (isDarkMode) {
      bgClass = 'bg-[#1D1115]';
      borderClass = 'border-[#7F1D1D]';
      textPrimaryClass = 'text-[#FECDD3]';
      textSecondaryClass = 'text-[#FDA4AF]';
      badgeBgClass = 'bg-[#881337]';
      badgeTextClass = 'text-[#FFE4E6]';
      buttonBgClass = 'bg-[#E11D48] hover:bg-[#BE123C]';
      buttonTextClass = 'text-white';
    } else {
      bgClass = 'bg-[#FFF1F2]';
      borderClass = 'border-[#FECDD3]';
      textPrimaryClass = 'text-[#881337]';
      textSecondaryClass = 'text-[#9F1239]';
      badgeBgClass = 'bg-[#FFE4E6]';
      badgeTextClass = 'text-[#9F1239]';
      buttonBgClass = 'bg-[#E11D48] hover:bg-[#BE123C]';
      buttonTextClass = 'text-white';
    }
  } else if (level === 'warning') { // 3 days left
    IconComponent = AlertTriangle;
    if (isDarkMode) {
      bgClass = 'bg-[#1C1917]';
      borderClass = 'border-[#78350F]';
      textPrimaryClass = 'text-[#FEF3C7]';
      textSecondaryClass = 'text-[#FDE68A]';
      badgeBgClass = 'bg-[#78350F]';
      badgeTextClass = 'text-[#FEF3C7]';
      buttonBgClass = 'bg-[#D97706] hover:bg-[#B45309]';
      buttonTextClass = 'text-white';
    } else {
      bgClass = 'bg-[#FFFBEB]';
      borderClass = 'border-[#FDE68A]';
      textPrimaryClass = 'text-[#78350F]';
      textSecondaryClass = 'text-[#92400E]';
      badgeBgClass = 'bg-[#FEF3C7]';
      badgeTextClass = 'text-[#92400E]';
      buttonBgClass = 'bg-[#D97706] hover:bg-[#B45309]';
      buttonTextClass = 'text-white';
    }
  } else { // 7 days left (info)
    IconComponent = Clock;
    if (isDarkMode) {
      bgClass = 'bg-[#0F172A]';
      borderClass = 'border-[#1E3A8A]';
      textPrimaryClass = 'text-[#DBEAFE]';
      textSecondaryClass = 'text-[#93C5FD]';
      badgeBgClass = 'bg-[#1E3A8A]';
      badgeTextClass = 'text-[#BFDBFE]';
      buttonBgClass = 'bg-[#2563EB] hover:bg-[#1D4ED8]';
      buttonTextClass = 'text-white';
    } else {
      bgClass = 'bg-[#EFF6FF]';
      borderClass = 'border-[#BFDBFE]';
      textPrimaryClass = 'text-[#1E3A8A]';
      textSecondaryClass = 'text-[#1E40AF]';
      badgeBgClass = 'bg-[#DBEAFE]';
      badgeTextClass = 'text-[#1E40AF]';
      buttonBgClass = 'bg-[#2563EB] hover:bg-[#1D4ED8]';
      buttonTextClass = 'text-white';
    }
  }

  return (
    <div 
      className={`w-full border-b transition-all duration-300 px-4 py-3 sm:px-6 ${bgClass} ${borderClass}`}
      id="trial-expiration-banner"
      role="region"
      aria-label="Trial expiration notice"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${badgeBgClass}`}>
            <IconComponent className={`w-5 h-5 ${badgeTextClass}`} />
          </div>
          
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-bold ${textPrimaryClass}`}>
                {title}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeBgClass} ${badgeTextClass}`}>
                {daysRemaining === 1 ? '1 Day Left' : `${daysRemaining} Days Left`}
              </span>
            </div>
            <p className={`text-xs ${textSecondaryClass}`}>
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={onUpgrade}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 flex items-center gap-1.5 shadow-sm cursor-pointer ${buttonBgClass} ${buttonTextClass}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade Now</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss trial notification"
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 ${textSecondaryClass}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
