import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Shield, 
  Sparkles, 
  Check, 
  ArrowRight, 
  GitMerge, 
  Code, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  Lock, 
  Bot, 
  FileCheck, 
  AlertCircle, 
  Clock, 
  Layers,
  Mail,
  Send,
  UserCheck
} from 'lucide-react';

interface UnlockPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  featureTier?: 'pro' | 'enterprise';
  onUpgradePro: () => void;
  onUpgradeEnterprise: () => void;
  isDarkMode?: boolean;
  currentUsageCount?: number;
  resetDate?: string;
  daysRemaining?: number;
  userRole?: string;
  isOwner?: boolean;
}

export default function UnlockPremiumModal({
  isOpen,
  onClose,
  featureName = 'Pro Automated Actions',
  featureTier = 'pro',
  onUpgradePro,
  onUpgradeEnterprise,
  isDarkMode = true,
  currentUsageCount = 5,
  resetDate,
  daysRemaining,
  userRole = 'Owner',
  isOwner = true
}: UnlockPremiumModalProps) {
  const [requestSent, setRequestSent] = useState(false);

  if (!isOpen) return null;

  const isEnterprise = featureTier === 'enterprise';
  const isMonthlyUploadLimit = 
    featureName.toLowerCase().includes('monthly upload') || 
    featureName.toLowerCase().includes('5 monthly') ||
    featureName.toLowerCase().includes('upgrade required') ||
    featureName.toLowerCase().includes('quota');

  const handlePrimaryClick = () => {
    if (!isOwner) {
      setRequestSent(true);
      return;
    }
    onClose();
    if (isEnterprise) {
      onUpgradeEnterprise();
    } else {
      onUpgradePro();
    }
  };

  const proFeatures = [
    {
      icon: Layers,
      iconBg: '#163A5F',
      title: 'Unlimited File Ingestions',
      desc: 'Remove the 5-upload monthly limit. Ingest and audit as many CSV files as your team needs.'
    },
    {
      icon: Sparkles,
      iconBg: '#163A5F',
      title: 'AI Smart Data Correction',
      desc: 'Automated spelling fixes, city/country standardization, and entity resolution powered by Gemini.'
    },
    {
      icon: Bot,
      iconBg: '#163A5F',
      title: 'AI Missing Value Imputation',
      desc: 'Predicts missing metrics and categories from cross-column relational patterns.'
    },
    {
      icon: GitMerge,
      iconBg: '#163A5F',
      title: 'ML Fuzzy Duplicate Resolution',
      desc: 'Levenshtein distance similarity matching with side-by-side record merging.'
    },
    {
      icon: Code,
      iconBg: '#163A5F',
      title: 'Invisible Character & Unicode Repair',
      desc: 'Strips zero-width spaces (\\u200B), control codes, and fixes broken UTF encodings.'
    },
    {
      icon: Sliders,
      iconBg: '#163A5F',
      title: 'Pattern & Regex Engine',
      desc: 'Extract, remove, or split phone numbers, emails, and custom regex streams.'
    }
  ];

  const enterpriseFeatures = [
    {
      icon: Shield,
      iconBg: '#163A5F',
      title: 'PII Masking & Anonymization',
      desc: 'Detect and redact SSNs, Credit Cards, Emails, and Phone Numbers for GDPR & HIPAA.'
    },
    {
      icon: Lock,
      iconBg: '#163A5F',
      title: 'Salted SHA-256 Hashing',
      desc: 'Irreversible cryptographic masking for sensitive customer PII fields.'
    },
    {
      icon: Cpu,
      iconBg: '#163A5F',
      title: 'Batch Processing & API Access',
      desc: 'Process dozens of datasets concurrently with direct REST API integration.'
    }
  ];

  const modalTitle = !isOwner
    ? isMonthlyUploadLimit 
      ? 'Workspace Monthly Upload Limit Reached' 
      : `Request ${featureName} Access`
    : isMonthlyUploadLimit 
      ? 'Upgrade Required: Monthly Upload Limit Reached' 
      : isEnterprise 
      ? `Unlock ${featureName}` 
      : `Unlock ${featureName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-xs">
      <div 
        className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDarkMode 
            ? 'bg-[#0B1523] border-[#1E3A5A] text-[#F8FAFC]' 
            : 'bg-[#FFFFFF] border-[#D5E0EA] text-[#0F172A]'
        }`}
      >
        {/* Modal Header */}
        <div className={`px-6 py-5 border-b flex items-start justify-between ${
          isDarkMode ? 'border-[#1E3A5A] bg-[#16283C]' : 'border-[#E2E8F0] bg-[#F3F7FA]'
        }`}>
          <div className="flex items-center gap-3.5">
            <div 
              className="p-3 rounded-xl flex items-center justify-center shadow-sm shrink-0"
              style={{ 
                backgroundColor: isMonthlyUploadLimit ? '#DC2626' : '#163A5F', 
                color: '#FFFFFF' 
              }}
            >
              {isMonthlyUploadLimit ? (
                <Lock className="w-5 h-5" />
              ) : isEnterprise ? (
                <Shield className="w-5 h-5" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                    isMonthlyUploadLimit 
                      ? isDarkMode ? 'bg-[#450A0A] text-[#FCA5A5] border-[#991B1B]' : 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                      : isDarkMode ? 'bg-[#163A5F] text-[#93C5FD] border-[#2B5A8A]' : 'bg-[#EAEFF4] text-[#163A5F] border-[#D5E0EA]'
                  }`}
                >
                  {!isOwner ? 'Workspace Quota Exhausted • Team Member Access' : isMonthlyUploadLimit ? 'Upgrade Required' : isEnterprise ? 'Enterprise Action' : 'Pro Feature Locked'}
                </span>
                {isMonthlyUploadLimit && (
                  <span className="text-[10px] font-bold text-[#DC2626] dark:text-[#F87171] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Quota Exhausted
                  </span>
                )}
              </div>
              <h3 className={`text-lg font-extrabold tracking-tight mt-1 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                {modalTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode 
                ? 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#16283C]' 
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EAEFF4]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Subtitle callout / Usage quota breakdown */}
          {isMonthlyUploadLimit ? (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-3 ${
              isDarkMode 
                ? 'bg-[#16283C] border-[#1E3A5A] text-[#E2E8F0]' 
                : 'bg-[#F3F7FA] border-[#D5E0EA] text-[#0F172A]'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 ${
                isDarkMode ? 'border-[#1E3A5A]' : 'border-[#D5E0EA]'
              }`}>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span className={`font-extrabold text-sm ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                    Workspace Monthly Usage: {currentUsageCount} / 5 Uploads Used
                  </span>
                </div>
                {resetDate && (
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 w-fit ${
                    isDarkMode ? 'bg-[#0B1523] text-[#93C5FD] border-[#1E3A5A]' : 'bg-[#FFFFFF] text-[#163A5F] border-[#D5E0EA]'
                  }`}>
                    <Clock className="w-3 h-3 text-[#163A5F] dark:text-[#93C5FD]" /> Resets in {daysRemaining || 1} day{daysRemaining === 1 ? '' : 's'} ({resetDate})
                  </span>
                )}
              </div>

              {!isOwner ? (
                <div className="space-y-2">
                  <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    isDarkMode ? 'bg-[#0B1523] border-[#1E3A5A] text-[#E2E8F0]' : 'bg-[#FFFFFF] border-[#D5E0EA] text-[#0F172A]'
                  }`}>
                    <UserCheck className="w-4 h-4 text-[#163A5F] dark:text-[#93C5FD] shrink-0 mt-0.5" />
                    <div>
                      <strong className={`block text-xs font-bold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                        Team Role: {userRole || 'Member'}
                      </strong>
                      <p className={`text-[11px] mt-0.5 leading-relaxed ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                        You are participating in a shared team workspace. The workspace has reached its free limit of <strong>5 monthly uploads</strong>. As a non-owner, you cannot alter workspace billing. Upgrading to the Pro or Enterprise plan must be performed by the primary Workspace Owner (<strong>nyikulibramwel@gmail.com</strong>).
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`text-xs ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                  Your account is currently on the <strong>Freemium Tier</strong>, which permits a maximum of <strong>5 spreadsheet uploads per calendar month</strong>. All 5 allocations have been exhausted for the current monthly period across your connected devices.
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className={`p-2.5 rounded-lg border text-center ${isDarkMode ? 'bg-[#0B1523] border-[#1E3A5A]' : 'bg-[#FFFFFF] border-[#D5E0EA]'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Current Plan</span>
                  <span className="text-xs font-bold text-[#DC2626]">Freemium</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-center ${isDarkMode ? 'bg-[#0B1523] border-[#1E3A5A]' : 'bg-[#FFFFFF] border-[#D5E0EA]'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Monthly Quota</span>
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>5 Uploads</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-center ${isDarkMode ? 'bg-[#0B1523] border-[#1E3A5A]' : 'bg-[#FFFFFF] border-[#D5E0EA]'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Remaining</span>
                  <span className="text-xs font-bold text-[#DC2626]">0 Uploads</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-center ${isDarkMode ? 'bg-[#0B1523] border-[#1E3A5A]' : 'bg-[#FFFFFF] border-[#D5E0EA]'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Pro Plan Quota</span>
                  <span className="text-xs font-bold text-[#163A5F] dark:text-[#93C5FD]">Unlimited</span>
                </div>
              </div>

              {isOwner ? (
                <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                  To continue uploading and auditing datasets without waiting for the automatic monthly quota reset, upgrade to <strong>Pro Tier</strong> for <strong>unlimited uploads</strong>, higher file size ceilings (25MB), and advanced AI cleaning.
                </p>
              ) : (
                <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                  Click the button below to notify the Workspace Owner (<strong>nyikulibramwel@gmail.com</strong>) that your team needs a plan upgrade for unlimited spreadsheet audits.
                </p>
              )}
            </div>
          ) : (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
              isDarkMode 
                ? 'bg-[#16283C] border-[#1E3A5A] text-[#CBD5E1]' 
                : 'bg-[#F3F7FA] border-[#D5E0EA] text-[#475569]'
            }`}>
              You selected <strong className={isDarkMode ? 'text-[#FFFFFF]' : 'text-[#0F172A]'}>{featureName}</strong>. 
              Freemium users have access to basic deduplication, date formatting, and cell fills. 
              Upgrade your workspace to unlock advanced automation, AI modeling, and security shields.
            </div>
          )}

          {requestSent && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isDarkMode ? 'bg-[#0B1E17] border-[#065F46] text-[#A7F3D0]' : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] shadow-sm'
            }`}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                <span className="text-xs font-semibold">
                  Upgrade request sent to workspace owner (<strong>nyikulibramwel@gmail.com</strong>).
                </span>
              </div>
              <button
                onClick={() => setRequestSent(false)}
                className="text-xs font-bold hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Premium Capabilities Grid */}
          <div>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              {isEnterprise ? 'Included in Enterprise Tier:' : 'Unlocked with Pro Subscription:'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(isEnterprise ? enterpriseFeatures : proFeatures).map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                      isDarkMode 
                        ? 'bg-[#16283C] border-[#1E3A5A]' 
                        : 'bg-[#F3F7FA] border-[#D5E0EA]'
                    }`}
                  >
                    <div 
                      className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-[#163A5F] text-[#FFFFFF]"
                    >
                      <ItemIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>{item.title}</div>
                      <div className={`text-[11px] mt-0.5 leading-snug ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan Tier Highlight comparison */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-[#16283C] border-[#1E3A5A]' : 'bg-[#F3F7FA] border-[#D5E0EA]'
          }`}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className={`font-bold uppercase tracking-wider text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Plan Comparison</span>
              <span className="text-[11px] font-mono font-semibold text-[#16A34A] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> Instant Activation
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-[#0B1523] border-[#1E3A5A]' : 'bg-[#FFFFFF] border-[#D5E0EA]'}`}>
                <div className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Freemium</div>
                <div className="font-extrabold text-xs mt-1 text-[#DC2626]">5 Uploads / Mo</div>
                <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>5MB Max File Size</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-[#0B1523] border-[#2B5A8A]' : 'bg-[#FFFFFF] border-[#163A5F]'}`}>
                <div className="text-[10px] font-bold text-[#163A5F] dark:text-[#93C5FD] uppercase">Pro ($49/mo)</div>
                <div className="font-extrabold text-xs text-[#163A5F] dark:text-[#93C5FD] mt-1">Unlimited Uploads</div>
                <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>25MB + AI Correction</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-[#0B1523] border-[#1E3A5A]' : 'bg-[#FFFFFF] border-[#D5E0EA]'}`}>
                <div className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Enterprise</div>
                <div className={`font-extrabold text-xs mt-1 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>Unlimited + Custom</div>
                <div className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>50MB + REST API</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'border-[#1E3A5A] bg-[#16283C]' : 'border-[#E2E8F0] bg-[#F3F7FA]'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDarkMode 
                ? 'text-[#94A3B8] hover:text-[#FFFFFF] bg-[#0B1523] hover:bg-[#16283C] border border-[#1E3A5A]' 
                : 'text-[#475569] hover:text-[#0F172A] bg-[#FFFFFF] hover:bg-[#EAEFF4] border border-[#D5E0EA]'
            }`}
          >
            {!isOwner ? 'Close' : 'Maybe Later'}
          </button>

          {!isOwner ? (
            <button
              type="button"
              onClick={handlePrimaryClick}
              disabled={requestSent}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-[#FFFFFF] shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                requestSent ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#163A5F] hover:bg-[#0F2D4A]'
              }`}
            >
              {requestSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Request Sent to Owner</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 text-white" />
                  <span>Notify Workspace Owner</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrimaryClick}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#FFFFFF] shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:opacity-95 bg-[#163A5F] hover:bg-[#0F2D4A]"
            >
              {isEnterprise ? (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Upgrade to Enterprise</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Upgrade to Pro ($49/mo)</span>
                </>
              )}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


