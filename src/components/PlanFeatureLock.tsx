import React from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Zap, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  Layers,
  Crown
} from 'lucide-react';
import { UserPlan } from '../types';

interface PlanFeatureLockProps {
  featureName: string;
  featureDescription: string;
  requiredPlan: 'pro' | 'enterprise';
  currentPlan: UserPlan;
  isDarkMode?: boolean;
  onUpgradePro?: () => void;
  onUpgradeEnterprise?: () => void;
  featureBenefits?: string[];
  compact?: boolean;
}

export default function PlanFeatureLock({
  featureName,
  featureDescription,
  requiredPlan,
  currentPlan,
  isDarkMode = true,
  onUpgradePro,
  onUpgradeEnterprise,
  featureBenefits,
  compact = false
}: PlanFeatureLockProps) {
  const isEnterpriseRequired = requiredPlan === 'enterprise';

  const defaultProBenefits = [
    'Unlimited CSV file audits and dataset row processing',
    'AI Intelligence & Conversational Gemini Assistant',
    'Custom white-label branding & high-res PDF compliance reports',
    'Standardized date, case, and hygiene automated cleaners'
  ];

  const defaultEnterpriseBenefits = [
    'Multi-user team tenancy and granular role management',
    'High-speed Developer REST API & Webhooks integration',
    'Dedicated SLA support & custom data retention policies',
    'Admin dashboard & cluster-wide telemetry controls'
  ];

  const benefits = featureBenefits || (isEnterpriseRequired ? defaultEnterpriseBenefits : defaultProBenefits);

  if (compact) {
    return (
      <div 
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDarkMode 
            ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]' 
            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg shrink-0 ${
            isEnterpriseRequired ? 'bg-[#7C3AED] text-[#FFFFFF]' : 'bg-[#2563EB] text-[#FFFFFF]'
          }`}>
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{featureName}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                isEnterpriseRequired 
                  ? 'bg-[#7C3AED] text-[#FFFFFF]' 
                  : 'bg-[#2563EB] text-[#FFFFFF]'
              }`}>
                {requiredPlan.toUpperCase()} TIER
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              {featureDescription}
            </p>
          </div>
        </div>

        <button
          onClick={isEnterpriseRequired ? onUpgradeEnterprise : onUpgradePro}
          className={`px-4 py-2 rounded-lg text-xs font-bold text-[#FFFFFF] flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 ${
            isEnterpriseRequired 
              ? 'bg-[#7C3AED] hover:bg-[#6D28D9]' 
              : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
          }`}
        >
          {isEnterpriseRequired ? (
            <>
              <Building2 className="w-3.5 h-3.5" />
              <span>Contact Enterprise Sales</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              <span>Upgrade to Pro ($49/mo)</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full py-8 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-2xl p-6 sm:p-8 rounded-2xl border shadow-xl relative overflow-hidden ${
          isDarkMode 
            ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]' 
            : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#0F172A]'
        }`}
      >
        {/* Top Accent Stripe */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            isEnterpriseRequired ? 'bg-[#7C3AED]' : 'bg-[#2563EB]'
          }`} 
        />

        {/* Lock Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#334155]/40 dark:border-[#334155]/40 border-[#E2E8F0]">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-xl shrink-0 ${
              isEnterpriseRequired 
                ? 'bg-[#7C3AED] text-[#FFFFFF]' 
                : 'bg-[#2563EB] text-[#FFFFFF]'
            }`}>
              {isEnterpriseRequired ? (
                <Crown className="w-7 h-7" />
              ) : (
                <Lock className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                  isEnterpriseRequired 
                    ? 'bg-[#7C3AED] text-[#FFFFFF]' 
                    : 'bg-[#2563EB] text-[#FFFFFF]'
                }`}>
                  {requiredPlan.toUpperCase()} PLAN FEATURE
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isDarkMode ? 'bg-[#0F172A] text-[#94A3B8]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}>
                  Current Plan: {currentPlan.toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1.5">
                {featureName}
              </h2>
              <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'
              }`}>
                {featureDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Included Benefits List */}
        <div className="mb-8">
          <h3 className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${
            isDarkMode ? 'text-[#CBD5E1]' : 'text-[#334155]'
          }`}>
            Unlocked with {requiredPlan === 'enterprise' ? 'Enterprise' : 'Pro'} Plan:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map((benefit, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  isDarkMode 
                    ? 'bg-[#0F172A]/60 border-[#334155]/60 text-[#E2E8F0]' 
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B]'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isEnterpriseRequired ? 'text-[#7C3AED]' : 'text-[#2563EB]'
                }`} />
                <span className="font-medium leading-snug">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {isEnterpriseRequired ? (
            <button
              onClick={onUpgradeEnterprise}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-[#FFFFFF] bg-[#7C3AED] hover:bg-[#6D28D9] flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Contact Sales for Enterprise ($199/mo)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onUpgradePro}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-[#FFFFFF] bg-[#2563EB] hover:bg-[#1D4ED8] flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Upgrade to Pro ($49/mo)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentPlan === 'free' && isEnterpriseRequired && (
            <button
              onClick={onUpgradePro}
              className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isDarkMode 
                  ? 'border-[#334155] text-[#CBD5E1] hover:bg-[#334155]' 
                  : 'border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              <Zap className="w-4 h-4 text-[#2563EB]" />
              <span>Upgrade to Pro First ($49/mo)</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
