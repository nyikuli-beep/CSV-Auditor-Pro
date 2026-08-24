import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Clock, 
  Calendar, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Lock, 
  ChevronDown,
  RefreshCw,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { CSVFile, RetentionPeriodOption, RetentionPolicy, TeamMember } from '../types';
import { 
  RETENTION_OPTIONS, 
  getRetentionOptionDetail, 
  formatTimeRemaining, 
  canManageRetention, 
  calculateExpiration 
} from '../lib/retentionService';

interface RetentionUploadSelectorProps {
  selectedOption: RetentionPeriodOption;
  onChangeOption: (option: RetentionPeriodOption) => void;
  userRole?: TeamMember['role'] | string;
  isDarkMode?: boolean;
}

export const RetentionUploadSelector: React.FC<RetentionUploadSelectorProps> = ({
  selectedOption,
  onChangeOption,
  userRole = 'Owner',
  isDarkMode = false,
}) => {
  const isAllowed = canManageRetention(userRole);

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              CSV File Retention Policy
            </h4>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Configure how long the raw original CSV remains in system storage before automatic purging.
            </p>
          </div>
        </div>
        {!isAllowed && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-2 py-1 rounded">
            <Lock className="w-3 h-3" /> Owner/Admin Only
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2">
        {RETENTION_OPTIONS.map((opt) => {
          const isSelected = selectedOption === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={!isAllowed}
              onClick={() => isAllowed && onChangeOption(opt.id)}
              className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                isSelected
                  ? isDarkMode
                    ? 'bg-[#1D4ED8]/20 border-[#2563EB] text-white ring-1 ring-[#2563EB]'
                    : 'bg-[#EFF6FF] border-[#2563EB] text-[#0F172A] ring-1 ring-[#2563EB]'
                  : isDarkMode
                  ? 'bg-[#0F172A] border-[#334155] text-slate-300 hover:border-slate-500'
                  : 'bg-white border-[#CBD5E1] text-slate-700 hover:bg-[#F8FAFC]'
              } ${!isAllowed ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between w-full mb-1">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${isSelected ? 'text-[#1D4ED8] dark:text-blue-400' : ''}`}>
                  {opt.id === 'immediate' && <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500 shrink-0" />}
                  {opt.id === '24h' && <Clock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />}
                  {(opt.id === '3d' || opt.id === '7d' || opt.id === '14d' || opt.id === '30d') && <Calendar className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />}
                  {opt.id === 'forever' && <Shield className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-500 shrink-0" />}
                  <span>{opt.badge}</span>
                </span>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </span>
                )}
              </div>
              <p className={`text-[11px] leading-snug line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface RetentionPolicyBannerProps {
  file: CSVFile;
  userRole?: TeamMember['role'] | string;
  isDarkMode?: boolean;
  onUpdatePolicy: (fileId: string, newOption: RetentionPeriodOption) => void;
  onManualDelete: (fileId: string) => void;
}

export const RetentionPolicyBanner: React.FC<RetentionPolicyBannerProps> = ({
  file,
  userRole = 'Owner',
  isDarkMode = false,
  onUpdatePolicy,
  onManualDelete,
}) => {
  const policy = file.retentionPolicy || {
    option: '24h',
    selectedAt: new Date().toISOString(),
    expiresAt: calculateExpiration('24h', new Date()),
    status: 'scheduled_deletion',
    originalFileDeleted: false,
  };

  const isAllowed = canManageRetention(userRole);
  const [timeInfo, setTimeInfo] = useState(() => formatTimeRemaining(policy.expiresAt, policy.originalFileDeleted));
  const [isChangingPolicy, setIsChangingPolicy] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(formatTimeRemaining(policy.expiresAt, policy.originalFileDeleted));
    }, 1000);
    return () => clearInterval(interval);
  }, [policy.expiresAt, policy.originalFileDeleted]);

  const detail = getRetentionOptionDetail(policy.option);

  return (
    <div className={`p-4 rounded-xl border mb-4 transition-all ${
      isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#CBD5E1] shadow-sm'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Status & Details */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            policy.originalFileDeleted
              ? 'bg-slate-500/10 text-slate-500'
              : timeInfo.isUrgent
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}>
            {policy.originalFileDeleted ? (
              <Trash2 className="w-5 h-5" />
            ) : timeInfo.isUrgent ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                CSV File Retention Policy:
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#DBEAFE] text-[#2563EB] dark:bg-[#1D4ED8]/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700 inline-flex items-center gap-1">
                {detail.id === 'immediate' && <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />}
                {detail.id === '24h' && <Clock className="w-3 h-3 text-blue-500 shrink-0" />}
                {(detail.id === '3d' || detail.id === '7d' || detail.id === '14d' || detail.id === '30d') && <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />}
                {detail.id === 'forever' && <Shield className="w-3 h-3 text-emerald-500 shrink-0" />}
                <span>{detail.badge}</span>
              </span>

              {/* Status Badge */}
              {policy.status === 'deleted_immediately' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Original CSV securely deleted after validation
                </span>
              )}

              {policy.status === 'scheduled_deletion' && !policy.originalFileDeleted && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 px-2 py-0.5 rounded">
                  <Clock className="w-3.5 h-3.5" /> Scheduled for automatic deletion
                </span>
              )}

              {policy.originalFileDeleted && policy.status !== 'deleted_immediately' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded">
                  <FileCheck2 className="w-3.5 h-3.5" /> Original CSV Purged ({policy.deletedBy || 'Purged'})
                </span>
              )}

              {policy.option === 'forever' && !policy.originalFileDeleted && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded">
                  <Shield className="w-3.5 h-3.5" /> Kept until manually deleted
                </span>
              )}
            </div>

            {/* Countdown timer / Info line */}
            <div className="mt-1 flex items-center gap-3 text-xs flex-wrap">
              {!policy.originalFileDeleted && policy.expiresAt && (
                <div className="flex items-center gap-1.5">
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Time Remaining:</span>
                  <span className={`font-mono font-bold ${
                    timeInfo.isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-[#2563EB] dark:text-blue-400'
                  }`}>
                    {timeInfo.label}
                  </span>
                </div>
              )}

              {policy.originalFileDeleted && (
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Original CSV raw rows purged. Reports, AI insights, and cleaned audit data remain fully accessible.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!policy.originalFileDeleted && (
            <>
              {/* Change Retention Button */}
              <button
                type="button"
                disabled={!isAllowed}
                onClick={() => isAllowed && setIsChangingPolicy(!isChangingPolicy)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  isAllowed
                    ? isDarkMode
                      ? 'bg-[#1E293B] hover:bg-[#334155] border-[#334155] text-slate-200'
                      : 'bg-white hover:bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                }`}
                title={!isAllowed ? 'Owner or Admin permissions required to modify retention policy' : 'Change Retention Period'}
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Change Policy
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Manual Delete Button */}
              <button
                type="button"
                disabled={!isAllowed}
                onClick={() => isAllowed && setShowConfirmDeleteModal(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isAllowed
                    ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm'
                    : 'bg-red-100 text-red-300 dark:bg-red-950/40 dark:text-red-900 cursor-not-allowed'
                }`}
                title={!isAllowed ? 'Owner or Admin permissions required to delete raw file' : 'Delete Original CSV Now'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Original CSV Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expandable Change Retention Dropdown / Grid */}
      {isChangingPolicy && !policy.originalFileDeleted && (
        <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
          <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            Select new retention period:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {RETENTION_OPTIONS.map((opt) => {
              const isSelected = policy.option === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onUpdatePolicy(file.id, opt.id);
                    setIsChangingPolicy(false);
                  }}
                  className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2563EB] text-white border-[#2563EB] font-bold'
                      : isDarkMode
                      ? 'bg-[#0F172A] border-[#334155] text-slate-300 hover:bg-[#1E293B]'
                      : 'bg-white border-[#CBD5E1] text-slate-700 hover:bg-[#EFF6FF]'
                  }`}
                >
                  <span className="text-xs block font-bold flex items-center justify-center gap-1">
                    {opt.id === 'immediate' && <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />}
                    {opt.id === '24h' && <Clock className="w-3 h-3 text-blue-400 shrink-0" />}
                    {(opt.id === '3d' || opt.id === '7d' || opt.id === '14d' || opt.id === '30d') && <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />}
                    {opt.id === 'forever' && <Shield className="w-3 h-3 text-emerald-400 shrink-0" />}
                    <span>{opt.badge}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Manual Deletion */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-xl border shadow-xl ${
            isDarkMode ? 'bg-[#1E293B] border-[#334155] text-white' : 'bg-white border-[#CBD5E1] text-[#0F172A]'
          }`}>
            <div className="flex items-center gap-3 mb-3 text-[#DC2626]">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/80">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">Delete original CSV permanently?</h3>
            </div>
            
            <p className={`text-xs leading-relaxed mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              This action cannot be undone. The raw original file rows will be purged from storage immediately. 
              <br /><br />
              <strong>Retained data:</strong> Generated reports, AI insights, cleaned datasets, annotations, and audit logs will remain completely intact and accessible.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteModal(false)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                  isDarkMode ? 'border-[#334155] hover:bg-[#0F172A] text-slate-300' : 'border-[#CBD5E1] hover:bg-[#F8FAFC] text-slate-700'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowConfirmDeleteModal(false);
                  onManualDelete(file.id);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
