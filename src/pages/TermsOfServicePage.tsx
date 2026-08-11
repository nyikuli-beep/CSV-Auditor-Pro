import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ArrowLeft, 
  ShieldCheck, 
  FileSpreadsheet, 
  Sun, 
  Moon, 
  ChevronRight, 
  Home, 
  Mail, 
  CheckCircle2,
  Lock,
  Scale,
  CreditCard,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { SITE_DOMAIN, SITE_URL, SUPPORT_EMAIL, LAST_UPDATED_DATE } from './PrivacyPolicyPage';

export default function TermsOfServicePage() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || true;
  });

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0F172A';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#FFFFFF';
    }
  };

  useEffect(() => {
    document.title = "Terms of Service | CSV Auditor Pro";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${
      isDarkMode ? 'bg-[#0F172A] text-[#F8FAFC]' : 'bg-[#F8FAFC] text-[#0F172A]'
    }`}>
      {/* Header Navbar */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isDarkMode ? 'bg-[#0F172A]/90 border-[#334155]' : 'bg-white/90 border-[#E2E8F0]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1] hover:text-white' : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to App</span>
            </Link>

            <div className="h-5 w-px bg-slate-700/50 hidden sm:block" />

            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm tracking-tight">CSV Auditor Pro</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#F59E0B]' : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#0F172A]'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Start Auditing</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className={`py-12 px-4 sm:px-6 lg:px-8 border-b ${
        isDarkMode ? 'bg-[#1E293B]/60 border-[#334155]' : 'bg-white border-[#E2E8F0]'
      }`}>
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-semibold ${
            isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#60A5FA]' : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]'
          }`}>
            <Scale className="w-3.5 h-3.5" />
            <span>Operational & Legal Framework</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Terms of Service
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
          }`}>
            Operational guidelines, permitted use, subscription policies, and data processing liabilities for CSV Auditor Pro.
          </p>

          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-mono text-[#94A3B8]">
            <span>Last Updated: {LAST_UPDATED_DATE}</span>
            <span>•</span>
            <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold">{SITE_DOMAIN}</span>
          </div>
        </div>
      </section>

      {/* Content Container */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">1. Acceptance of Terms</h2>
          <p>By accessing or using CSV Auditor Pro, you agree to be bound by these Terms of Service. If you do not agree, you must refrain from using the platform.</p>
        </div>

        <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">2. Permitted Use & Software License</h2>
          <p>CSV Auditor Pro grants you a non-exclusive, non-transferable, revocable license to access our web application for auditing, cleaning, and validating spreadsheet datasets.</p>
        </div>

        <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">3. Subscriptions & Billing</h2>
          <p>Subscriptions (Free, Pro, Enterprise) are billed via our Merchant of Record (Paddle). Charges auto-renew according to your chosen billing period unless cancelled prior to the renewal date.</p>
        </div>

        <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">4. Data Liability & Accuracy Disclaimer</h2>
          <p>While our automated algorithms achieve over 99% validation accuracy, users remain responsible for verifying cleaned datasets prior to importing them into critical downstream production databases or financial tools.</p>
        </div>

        <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">5. Contact</h2>
          <p>Questions regarding these terms? Contact support at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">{SUPPORT_EMAIL}</a>.</p>
        </div>
      </main>

      {/* Global Footer */}
      <footer className={`border-t py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs ${
        isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#94A3B8]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy" className="hover:text-[#2563EB] transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">Terms of Service</Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-[#2563EB] transition-colors">Refund Policy</Link>
            <span>•</span>
            <Link to="/about" className="hover:text-[#2563EB] transition-colors">About</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-[#2563EB] transition-colors">Contact</Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} CSV Auditor Pro. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
