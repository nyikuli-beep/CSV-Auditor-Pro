import React from 'react';
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
  Layers 
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
  daysRemaining
}: UnlockPremiumModalProps) {
  if (!isOpen) return null;

  const isEnterprise = featureTier === 'enterprise';
  const isMonthlyUploadLimit = 
    featureName.toLowerCase().includes('monthly upload') || 
    featureName.toLowerCase().includes('5 monthly') ||
    featureName.toLowerCase().includes('upgrade required') ||
    featureName.toLowerCase().includes('quota');

  const handlePrimaryClick = () => {
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
      iconBg: '#2563EB',
      title: 'Unlimited File Ingestions',
      desc: 'Remove the 5-upload monthly limit. Ingest and audit as many CSV files as your team needs.'
    },
    {
      icon: Sparkles,
      iconBg: '#2563EB',
      title: 'AI Smart Data Correction',
      desc: 'Automated spelling fixes, city/country standardization, and entity resolution powered by Gemini.'
    },
    {
      icon: Bot,
      iconBg: '#4F46E5',
      title: 'AI Missing Value Imputation',
      desc: 'Predicts missing metrics and categories from cross-column relational patterns.'
    },
    {
      icon: GitMerge,
      iconBg: '#9333EA',
      title: 'ML Fuzzy Duplicate Resolution',
      desc: 'Levenshtein distance similarity matching with side-by-side record merging.'
    },
    {
      icon: Code,
      iconBg: '#059669',
      title: 'Invisible Character & Unicode Repair',
      desc: 'Strips zero-width spaces (\\u200B), control codes, and fixes broken UTF encodings.'
    },
    {
      icon: Sliders,
      iconBg: '#D97706',
      title: 'Pattern & Regex Engine',
      desc: 'Extract, remove, or split phone numbers, emails, and custom regex streams.'
    }
  ];

  const enterpriseFeatures = [
    {
      icon: Shield,
      iconBg: '#D97706',
      title: 'PII Masking & Anonymization',
      desc: 'Detect and redact SSNs, Credit Cards, Emails, and Phone Numbers for GDPR & HIPAA.'
    },
    {
      icon: Lock,
      iconBg: '#DC2626',
      title: 'Salted SHA-256 Hashing',
      desc: 'Irreversible cryptographic masking for sensitive customer PII fields.'
    },
    {
      icon: Cpu,
      iconBg: '#2563EB',
      title: 'Batch Processing & API Access',
      desc: 'Process dozens of datasets concurrently with direct REST API integration.'
    }
  ];

  const modalTitle = isMonthlyUploadLimit 
    ? 'Upgrade Required: Monthly Upload Limit Reached' 
    : isEnterprise 
    ? `Unlock ${featureName}` 
    : `Unlock ${featureName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-xs">
      <div 
        className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDarkMode 
            ? 'bg-[#0F172A] border-[#334155] text-[#F8FAFC]' 
            : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#0F172A]'
        }`}
      >
        {/* Modal Header */}
        <div className={`px-6 py-5 border-b flex items-start justify-between ${
          isDarkMode ? 'border-[#1E293B] bg-[#020617]/40' : 'border-[#F1F5F9] bg-[#F8FAFC]'
        }`}>
          <div className="flex items-center gap-3.5">
            <div 
              className="p-3 rounded-xl flex items-center justify-center shadow-sm shrink-0"
              style={{ 
                backgroundColor: isMonthlyUploadLimit ? '#DC2626' : isEnterprise ? '#D97706' : '#2563EB', 
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
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase"
                  style={{
                    backgroundColor: isMonthlyUploadLimit ? '#DC262620' : isEnterprise ? '#D9770620' : '#2563EB20',
                    color: isMonthlyUploadLimit ? '#DC2626' : isEnterprise ? '#D97706' : '#2563EB',
                    border: `1px solid ${isMonthlyUploadLimit ? '#DC262640' : isEnterprise ? '#D9770640' : '#2563EB40'}`
                  }}
                >
                  {isMonthlyUploadLimit ? 'Upgrade Required' : isEnterprise ? 'Enterprise Action' : 'Pro Feature Locked'}
                </span>
                {isMonthlyUploadLimit && (
                  <span className="text-[10px] font-bold text-[#DC2626] dark:text-[#F87171] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Quota Exhausted
                  </span>
                )}
              </div>
              <h3 className="text-lg font-extrabold tracking-tight mt-1">
                {modalTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode 
                ? 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]' 
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
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
                ? 'bg-[#1E293B]/80 border-[#334155] text-[#94A3B8]' 
                : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-[#334155]/40 dark:border-[#334155]/40">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span className="font-extrabold text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                    Freemium Monthly Usage: {currentUsageCount} / 5 Uploads Used
                  </span>
                </div>
                {resetDate && (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/30 flex items-center gap-1 w-fit">
                    <Clock className="w-3 h-3" /> Resets in {daysRemaining || 1} day{daysRemaining === 1 ? '' : 's'} ({resetDate})
                  </span>
                )}
              </div>

              <p className="text-xs">
                Your account is currently on the <strong>Freemium Tier</strong>, which permits a maximum of <strong>5 spreadsheet uploads per calendar month</strong>. All 5 allocations have been exhausted for the current monthly period across your connected devices.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className={`p-2.5 rounded-lg border text-center ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#CBD5E1]'}`}>
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Current Plan</span>
                  <span className="text-xs font-bold text-[#DC2626]">Freemium</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-center ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#CBD5E1]'}`}>
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Monthly Quota</span>
                  <span className="text-xs font-bold">5 Uploads</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-center ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#CBD5E1]'}`}>
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Remaining</span>
                  <span className="text-xs font-bold text-[#DC2626]">0 Uploads</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-center ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#CBD5E1]'}`}>
                  <span className="text-[10px] uppercase font-bold text-[#64748B] block">Pro Plan Quota</span>
                  <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA]">Unlimited</span>
                </div>
              </div>

              <p className="text-[11px] opacity-90 leading-relaxed">
                To continue uploading and auditing datasets without waiting for the automatic monthly quota reset, upgrade to <strong>Pro Tier</strong> for <strong>unlimited uploads</strong>, higher file size ceilings (25MB), and advanced AI cleaning.
              </p>
            </div>
          ) : (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
              isDarkMode 
                ? 'bg-[#1E293B]/60 border-[#334155] text-[#94A3B8]' 
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
            }`}>
              You selected <strong className={isDarkMode ? 'text-[#FFFFFF]' : 'text-[#0F172A]'}>{featureName}</strong>. 
              Freemium users have access to basic deduplication, date formatting, and cell fills. 
              Upgrade your workspace to unlock advanced automation, AI modeling, and security shields.
            </div>
          )}

          {/* Premium Capabilities Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
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
                        ? 'bg-[#020617]/50 border-[#1E293B]' 
                        : 'bg-[#F8FAFC] border-[#E2E8F0]'
                    }`}
                  >
                    <div 
                      className="p-1.5 rounded-lg shrink-0 mt-0.5"
                      style={{ backgroundColor: `${item.iconBg}20`, color: item.iconBg }}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{item.title}</div>
                      <div className="text-[11px] text-[#64748B] mt-0.5 leading-snug">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan Tier Highlight comparison */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-[#020617]/60 border-[#1E293B]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-[#64748B] uppercase tracking-wider text-[10px]">Plan Comparison</span>
              <span className="text-[11px] font-mono font-semibold text-[#16A34A] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Instant Activation
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-[#0F172A] border-[#1E293B]' : 'bg-[#FFFFFF] border-[#E2E8F0]'}`}>
                <div className="text-[10px] font-bold text-[#64748B] uppercase">Freemium</div>
                <div className="font-extrabold text-xs mt-1 text-[#DC2626]">5 Uploads / Mo</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">5MB Max File Size</div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#2563EB] bg-[#2563EB]/10 relative">
                <div className="text-[10px] font-bold text-[#2563EB] uppercase">Pro ($49/mo)</div>
                <div className="font-extrabold text-xs text-[#2563EB] mt-1">Unlimited Uploads</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">25MB + AI Correction</div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#D97706] bg-[#D97706]/10">
                <div className="text-[10px] font-bold text-[#D97706] uppercase">Enterprise</div>
                <div className="font-extrabold text-xs text-[#D97706] mt-1">Unlimited + Custom</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">50MB + REST API</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'border-[#1E293B] bg-[#020617]/40' : 'border-[#F1F5F9] bg-[#F8FAFC]'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDarkMode 
                ? 'text-[#94A3B8] hover:text-[#FFFFFF] bg-[#1E293B] hover:bg-[#334155]' 
                : 'text-[#475569] hover:text-[#0F172A] bg-[#E2E8F0] hover:bg-[#CBD5E1]'
            }`}
          >
            Maybe Later
          </button>

          <button
            type="button"
            onClick={handlePrimaryClick}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#FFFFFF] shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:opacity-95"
            style={{ backgroundColor: isEnterprise ? '#D97706' : '#2563EB' }}
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
        </div>
      </div>
    </div>
  );
}

