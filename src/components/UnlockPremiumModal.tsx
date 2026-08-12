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
  FileCheck
} from 'lucide-react';

interface UnlockPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  featureTier?: 'pro' | 'enterprise';
  onUpgradePro: () => void;
  onUpgradeEnterprise: () => void;
  isDarkMode?: boolean;
}

export default function UnlockPremiumModal({
  isOpen,
  onClose,
  featureName = 'Pro Automated Actions',
  featureTier = 'pro',
  onUpgradePro,
  onUpgradeEnterprise,
  isDarkMode = true
}: UnlockPremiumModalProps) {
  if (!isOpen) return null;

  const isEnterprise = featureTier === 'enterprise';

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
    },
    {
      icon: FileCheck,
      iconBg: '#2563EB',
      title: 'Smart Validation & Assertions',
      desc: 'Set field rules, range bound assertions, and auto-coerce formatting anomalies.'
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
              className="p-3 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: isEnterprise ? '#D97706' : '#2563EB', color: '#FFFFFF' }}
            >
              {isEnterprise ? <Shield className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase"
                  style={{
                    backgroundColor: isEnterprise ? '#D9770620' : '#2563EB20',
                    color: isEnterprise ? '#D97706' : '#2563EB',
                    border: `1px solid ${isEnterprise ? '#D9770640' : '#2563EB40'}`
                  }}
                >
                  {isEnterprise ? 'Enterprise Action' : 'Pro Feature Locked'}
                </span>
              </div>
              <h3 className="text-lg font-extrabold tracking-tight mt-1">
                Unlock {featureName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
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
          {/* Subtitle callout */}
          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
            isDarkMode 
              ? 'bg-[#1E293B]/60 border-[#334155] text-[#94A3B8]' 
              : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
          }`}>
            You selected <strong className={isDarkMode ? 'text-[#FFFFFF]' : 'text-[#0F172A]'}>{featureName}</strong>. 
            Freemium users have access to basic deduplication, date formatting, and cell fills. 
            Upgrade your workspace to unlock advanced automation, AI modeling, and security shields.
          </div>

          {/* Premium Capabilities Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
              {isEnterprise ? 'Included in Enterprise Tier:' : 'Included in Pro Subscription:'}
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
                <div className="font-extrabold text-xs mt-1">Basic Tools</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">4 Core Actions</div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#2563EB] bg-[#2563EB]/10 relative">
                <div className="text-[10px] font-bold text-[#2563EB] uppercase">Pro</div>
                <div className="font-extrabold text-xs text-[#2563EB] mt-1">Full AI & ML</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">All 14+ Actions</div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#D97706] bg-[#D97706]/10">
                <div className="text-[10px] font-bold text-[#D97706] uppercase">Enterprise</div>
                <div className="font-extrabold text-xs text-[#D97706] mt-1">PII & Governance</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Custom Rules & API</div>
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
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#FFFFFF] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
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
