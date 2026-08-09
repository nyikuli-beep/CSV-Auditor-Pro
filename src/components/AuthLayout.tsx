import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  Zap, 
  Database, 
  Lock, 
  Eye, 
  Sun, 
  Moon, 
  X, 
  CheckCircle2, 
  Mail, 
  Send,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { FOOTER_DOCS } from '../data/footerDocs';

interface AuthLayoutProps {
  children: React.ReactNode;
  pageType: 'login' | 'register' | 'forgot-password' | 'verify-email';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, pageType }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('app_theme');
      if (stored) return stored === 'dark';
      return document.documentElement.classList.contains('dark');
    } catch {
      return true;
    }
  });

  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'support' | null>(null);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('app_theme', isDarkMode ? 'dark' : 'light');
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // Ignore localstorage errors
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportEmail || !supportMessage) return;
    setSupportSubmitted(true);
    setTimeout(() => {
      setSupportSubmitted(false);
      setActiveModal(null);
      setSupportMessage('');
    }, 2000);
  };

  return (
    <div className={`min-h-screen w-full transition-colors duration-200 flex flex-col justify-between ${
      isDarkMode ? 'bg-[#0F172A] text-[#F8FAFC]' : 'bg-[#F8FAFC] text-[#111827]'
    }`}>
      
      {/* Top Header Controls */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between z-20">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight block leading-none">CSV Auditor Pro</span>
            <span className={`text-[10px] font-bold tracking-widest uppercase block mt-0.5 ${
              isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'
            }`}>Enterprise Auth</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle light/dark theme"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`p-2 rounded-xl border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
              isDarkMode 
                ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]' 
                : 'bg-white border-[#E2E8F0] text-[#111827] hover:bg-[#F1F5F9]'
            }`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Enterprise Branding & Showcase Panel (Desktop) */}
          <div className="hidden lg:flex lg:col-span-6 xl:col-span-5 flex-col justify-between rounded-2xl border p-8 xl:p-10 min-h-[600px] transition-colors relative overflow-hidden bg-[#1E293B] border-[#334155] text-white">
            
            <div className="space-y-6 relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#60A5FA] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>ENTERPRISE SECURITY & DATA HYGIENE</span>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Automated CSV Audit & Data Quality Infrastructure
                </h1>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  Streamline dataset verification, anomaly detection, and schema validation with zero-retention privacy and real-time team collaboration.
                </p>
              </div>

              {/* Crisp Vector SVG Illustration */}
              <div className="p-4 rounded-xl bg-[#0F172A] border border-[#334155] my-4">
                <svg className="w-full h-32" viewBox="0 0 380 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid Lines */}
                  <line x1="10" y1="20" x2="370" y2="20" stroke="#334155" strokeDasharray="3 3" />
                  <line x1="10" y1="60" x2="370" y2="60" stroke="#334155" strokeDasharray="3 3" />
                  <line x1="10" y1="100" x2="370" y2="100" stroke="#334155" strokeDasharray="3 3" />
                  
                  {/* Left Data Ingestion Node */}
                  <rect x="20" y="35" width="70" height="50" rx="8" fill="#1E293B" stroke="#2563EB" strokeWidth="2" />
                  <text x="55" y="58" fill="#F8FAFC" fontSize="10" fontWeight="bold" textAnchor="middle">RAW CSV</text>
                  <text x="55" y="72" fill="#60A5FA" fontSize="8" textAnchor="middle">250K Rows</text>
                  
                  {/* Arrow to Audit Engine */}
                  <path d="M 95 60 L 135 60" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 2" />
                  <polygon points="135,56 142,60 135,64" fill="#2563EB" />

                  {/* Middle Audit Shield Node */}
                  <rect x="145" y="25" width="90" height="70" rx="10" fill="#2563EB" />
                  <text x="190" y="52" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">AUDIT SHIELD</text>
                  <text x="190" y="66" fill="#BFDBFE" fontSize="8" textAnchor="middle">Schema & Type Check</text>
                  <text x="190" y="78" fill="#BFDBFE" fontSize="8" textAnchor="middle">Zero Data Retention</text>

                  {/* Arrow to Clean Output */}
                  <path d="M 240 60 L 280 60" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 2" />
                  <polygon points="280,56 287,60 280,64" fill="#2563EB" />

                  {/* Right Validated Output Node */}
                  <rect x="290" y="35" width="70" height="50" rx="8" fill="#1E293B" stroke="#10B981" strokeWidth="2" />
                  <text x="325" y="58" fill="#F8FAFC" fontSize="10" fontWeight="bold" textAnchor="middle">CLEAN DATA</text>
                  <text x="325" y="72" fill="#34D399" fontSize="8" textAnchor="middle">100% Validated</text>
                </svg>
              </div>

              {/* Highlights List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs">
                  <div className="p-1.5 rounded-lg bg-[#2563EB]/20 text-[#60A5FA] shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Automated Anomaly Audit</span>
                    <span className="text-[#94A3B8]">Spot duplicates, missing fields, and type mismatches instantly.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="p-1.5 rounded-lg bg-[#2563EB]/20 text-[#60A5FA] shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Zero Data Retention</span>
                    <span className="text-[#94A3B8]">Client-side sandbox compliant with HIPAA and SOC2 standards.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="p-1.5 rounded-lg bg-[#2563EB]/20 text-[#60A5FA] shrink-0 mt-0.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Smart Column Mapping</span>
                    <span className="text-[#94A3B8]">Automated schema alignment with one-click bulk repair transforms.</span>
                  </div>
                </div>
              </div>

            </div>

            {/* SLA Chips Footer */}
            <div className="pt-6 border-t border-[#334155] flex items-center justify-between text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase relative z-10">
              <span>99.99% Uptime SLA</span>
              <span>•</span>
              <span>256-Bit TLS 1.3</span>
              <span>•</span>
              <span>SOC2 Type II</span>
            </div>

          </div>

          {/* Right Column: Centered Form Card */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-center justify-center w-full">
            
            {/* Form Card */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full max-w-[460px] rounded-2xl border p-6 sm:p-8 space-y-6 transition-colors shadow-xl ${
                isDarkMode 
                  ? 'bg-[#1E293B] border-[#334155] shadow-none text-[#F8FAFC]' 
                  : 'bg-white border-[#E2E8F0] shadow-slate-200/60 text-[#111827]'
              }`}
            >
              {children}
            </motion.div>

            {/* Security Badges Below Card */}
            <div className={`mt-6 w-full max-w-[460px] flex items-center justify-around py-2.5 px-4 rounded-xl border text-[11px] font-medium transition-colors ${
              isDarkMode 
                ? 'bg-[#1E293B]/60 border-[#334155] text-[#94A3B8]' 
                : 'bg-white/80 border-[#E2E8F0] text-[#64748B]'
            }`}>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Secure Auth
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#2563EB]" /> Encrypted TLS 1.3
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#2563EB]" /> Zero Retention
              </span>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className={`w-full border-t py-5 px-4 sm:px-6 lg:px-8 mt-auto text-xs transition-colors ${
        isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#94A3B8]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveModal('privacy')}
              className="hover:text-[#2563EB] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveModal('terms')}
              className="hover:text-[#2563EB] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveModal('support')}
              className="hover:text-[#2563EB] transition-colors cursor-pointer"
            >
              Contact Support
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
              isDarkMode ? 'bg-[#1E293B] text-[#94A3B8] border border-[#334155]' : 'bg-[#E2E8F0] text-[#475569]'
            }`}>
              v2.4.0 Enterprise
            </span>
            <span>© 2026 CSV Auditor Pro. All rights reserved.</span>
          </div>

        </div>
      </footer>

      {/* Document / Support Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-xl max-h-[85vh] rounded-2xl border p-6 overflow-y-auto shadow-2xl relative ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]' : 'bg-white border-[#E2E8F0] text-[#111827]'
              }`}
            >
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
                className={`absolute top-5 right-5 p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDarkMode ? 'bg-[#0F172A] border-[#334155] hover:bg-[#334155]' : 'bg-[#F1F5F9] border-[#E2E8F0] hover:bg-[#E2E8F0]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              {activeModal === 'support' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#2563EB] text-white">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg">Contact Enterprise Support</h3>
                      <p className={`text-xs ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                        Our dedicated technical support team responds within 1 hour.
                      </p>
                    </div>
                  </div>

                  {supportSubmitted ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-3 my-4">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Thank you! Your inquiry has been submitted. An enterprise representative will reach out shortly.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSupportSubmit} className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--text-primary)]">Your Name</label>
                        <input
                          type="text"
                          required
                          value={supportName}
                          onChange={(e) => setSupportName(e.target.value)}
                          placeholder="Jane Doe"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                            isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--text-primary)]">Work Email</label>
                        <input
                          type="email"
                          required
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          placeholder="name@company.com"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                            isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-[var(--text-primary)]">Inquiry / Issue Description</label>
                        <textarea
                          required
                          rows={4}
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          placeholder="Describe your account or technical question..."
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                            isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Send className="w-4 h-4" /> Submit Inquiry
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-lg">{FOOTER_DOCS[activeModal]?.title || 'Legal Document'}</h3>
                    <p className={`text-xs ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      {FOOTER_DOCS[activeModal]?.subtitle}
                    </p>
                  </div>

                  <div className="space-y-4 pt-2 text-xs leading-relaxed">
                    {FOOTER_DOCS[activeModal]?.sections?.map((section, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <h4 className="font-bold text-sm">{section.title}</h4>
                        {section.paragraphs.map((p, pIdx) => (
                          <p key={pIdx} className={isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}>{p}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
