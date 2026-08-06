import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  FileSpreadsheet, 
  Bot, 
  Building2, 
  CreditCard 
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeToPro: () => void;
  title?: string;
  featureName?: string;
  isDarkMode?: boolean;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  onUpgradeToPro,
  title = 'Upgrade to CSV Auditor Pro',
  featureName = 'AI-powered features',
  isDarkMode = true
}: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className={`relative w-full max-w-lg p-6 md:p-8 rounded-3xl border shadow-2xl overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Accent top banner */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unlock Pro Access</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight mb-2">
            {title}
          </h2>

          <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Upgrade to Pro to unlock {featureName}, unlimited audits, advanced cleaning, branding, compliance reporting, and much more.
          </p>

          {/* Included Features Grid */}
          <div className={`p-4 rounded-2xl border mb-6 space-y-3 ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-500" /> What's Included in Pro ($49/mo)
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Unlimited CSV Audits & Rows</strong> — No monthly record limits</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>AI Insights & Conversational Assistant</strong> — Gemini-powered anomaly detection</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Advanced Cleaning & Transformation</strong> — Automated fuzzy duplicates & control char cleanup</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Custom Branding & PDF Compliance Reports</strong> — Executive audit certificates</span>
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                onUpgradeToPro();
                onClose();
              }}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Upgrade to Pro (14-Day Free Trial)</span>
            </button>

            <button
              onClick={onClose}
              className={`w-full sm:w-auto py-3.5 px-5 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
                isDarkMode 
                  ? 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' 
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Maybe Later
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-500 font-mono mt-4">
            Secure Merchant of Record checkout powered by Paddle Billing. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
