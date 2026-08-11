import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Sun, 
  Moon, 
  ChevronRight, 
  CheckCircle2, 
  Globe, 
  Mail, 
  Lock 
} from 'lucide-react';
import { SITE_DOMAIN, SITE_URL, SUPPORT_EMAIL } from './PrivacyPolicyPage';

export default function AboutPage() {
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
    document.title = "About Us | CSV Auditor Pro";
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
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Data Integrity Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            About CSV Auditor Pro
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
          }`}>
            Empowering data analysts, compliance officers, and finance teams to transform messy, error-prone spreadsheets into verified, audit-ready data.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className={`p-8 rounded-3xl border space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Our Mission</h2>
          <p className="leading-relaxed">
            Spreadsheets remain the backbone of global business decision-making, yet human formatting errors, duplicate rows, missing fields, and schema drift cause millions in lost revenue and compliance risk every year.
          </p>
          <p className="leading-relaxed">
            CSV Auditor Pro was engineered from the ground up to eliminate spreadsheet friction through <strong>local client-side processing</strong>, rule-based anomaly detection, and privacy-first AI assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-2xl border space-y-2 ${
            isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'
          }`}>
            <Lock className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
            <h3 className="font-bold text-sm">Privacy First</h3>
            <p className="text-xs text-[#94A3B8]">Client-side parsing ensures spreadsheet rows never leave browser memory.</p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-2 ${
            isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'
          }`}>
            <ShieldCheck className="w-6 h-6 text-[#16A34A]" />
            <h3 className="font-bold text-sm">Audit Compliance</h3>
            <p className="text-xs text-[#94A3B8]">Instant scoring, duplicate detection, and schema validation heuristics.</p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-2 ${
            isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'
          }`}>
            <Sparkles className="w-6 h-6 text-[#9333EA]" />
            <h3 className="font-bold text-sm">Smart Copilot</h3>
            <p className="text-xs text-[#94A3B8]">AI-powered explanations and cleaning steps with zero model retraining.</p>
          </div>
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
            <Link to="/terms" className="hover:text-[#2563EB] transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-[#2563EB] transition-colors">Refund Policy</Link>
            <span>•</span>
            <Link to="/about" className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">About</Link>
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
