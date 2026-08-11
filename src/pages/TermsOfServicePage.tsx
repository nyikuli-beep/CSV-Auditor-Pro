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
  HelpCircle,
  UserCheck,
  Zap,
  Clock,
  Shield,
  FileCheck
} from 'lucide-react';
import { SITE_DOMAIN, SITE_URL, SUPPORT_EMAIL, LAST_UPDATED_DATE } from '../constants/siteConfig';

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

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'CSV Auditor Pro Terms of Service - Legal guidelines, subscription terms, acceptable use policies, and AI disclaimers.'
    );

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}/terms`);

    // Open Graph Metadata
    const ogTags = [
      { property: 'og:title', content: 'Terms of Service | CSV Auditor Pro' },
      { property: 'og:description', content: 'CSV Auditor Pro Terms of Service - Terms, subscription policies, and legal framework.' },
      { property: 'og:url', content: `${SITE_URL}/terms` },
      { property: 'og:type', content: 'website' }
    ];

    ogTags.forEach(tag => {
      let el = document.querySelector(`meta[property="${tag.property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', tag.property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', tag.content);
    });

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
              aria-label="Toggle dark mode"
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

      {/* Breadcrumb Navigation */}
      <div className={`border-b py-3 px-4 sm:px-6 lg:px-8 text-xs ${
        isDarkMode ? 'bg-[#1E293B]/40 border-[#334155] text-[#94A3B8]' : 'bg-[#F1F5F9]/50 border-[#E2E8F0] text-[#64748B]'
      }`}>
        <div className="max-w-[900px] mx-auto flex items-center gap-2">
          <Link to="/" className="hover:text-[#2563EB] transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-500" />
          <span className="font-semibold text-[#2563EB] dark:text-[#60A5FA]">Terms of Service</span>
        </div>
      </div>

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
            Operational guidelines, permitted use, subscription policies, acceptable use, and AI disclaimers for CSV Auditor Pro.
          </p>

          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-mono text-[#94A3B8]">
            <span>Last Updated: {LAST_UPDATED_DATE}</span>
            <span>•</span>
            <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold">{SITE_DOMAIN}</span>
          </div>
        </div>
      </section>

      {/* Content Container (~900px centered reading canvas) */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Section 1: Acceptance of Terms */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <CheckCircle2 className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>1. Acceptance of Terms</h2>
          </div>
          <p>
            By accessing, browsing, or using CSV Auditor Pro (available at <a href={SITE_URL} className="text-[#2563EB] dark:text-[#60A5FA] font-semibold hover:underline">{SITE_DOMAIN}</a>), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you must immediately discontinue use of the platform and software.
          </p>
        </section>

        {/* Section 2: Eligibility */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <UserCheck className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>2. Eligibility</h2>
          </div>
          <p>
            You must be at least 18 years old or the legal age of majority in your jurisdiction to use CSV Auditor Pro. By using the platform, you represent and warrant that you have the legal capacity to enter into a binding contract with us.
          </p>
        </section>

        {/* Section 3: User Accounts */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <Lock className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>3. User Accounts</h2>
          </div>
          <p>
            When creating an account with CSV Auditor Pro, you agree to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li>Provide accurate, complete, and up-to-date registration information.</li>
            <li>Maintain the confidentiality and security of your account credentials and password.</li>
            <li>Promptly notify us of any unauthorized access or security breach involving your account.</li>
            <li>Accept full responsibility for all activities occurring under your account credentials.</li>
          </ul>
        </section>

        {/* Section 4: Subscription Plans & Billing */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <CreditCard className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>4. Subscription Plans & Billing</h2>
          </div>
          <p>
            CSV Auditor Pro offers flexible subscription tiers designed for individuals, growing teams, and enterprises:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2 text-xs">
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">Free Plan</div>
              <p className="mt-1 text-[#94A3B8]">Core browser-based CSV auditing, single file uploads, and standard anomaly scoring.</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#2563EB] dark:text-[#60A5FA]">Professional Plan</div>
              <p className="mt-1 text-[#94A3B8]">Unlimited file sizes, automated data cleaning, AI copilot, and PDF report downloads.</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#16A34A]">Enterprise Plan</div>
              <p className="mt-1 text-[#94A3B8]">Custom schema enforcement, team collaboration slots, priority support, and dedicated SLA.</p>
            </div>
          </div>
          <p className="text-xs">
            <strong>Paddle Merchant of Record:</strong> All financial transactions and recurring billing subscriptions are securely processed by Paddle, our Merchant of Record. Paid subscriptions automatically renew according to your selected billing period unless cancelled prior to the renewal date.
          </p>
        </section>

        {/* Section 5: Acceptable Use */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
            <h2>5. Acceptable Use Policy</h2>
          </div>
          <p>
            You agree not to misuse CSV Auditor Pro. Specifically, you agree NOT to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li>Upload or process malicious files, malware, viruses, or harmful code.</li>
            <li>Attempt unauthorized access to any part of our servers, backend infrastructure, or user accounts.</li>
            <li>Abuse, overload, or flood API endpoints or client-side worker processes.</li>
            <li>Reverse engineer, decompile, or attempt to extract source code from the software.</li>
            <li>Disrupt, impair, or interfere with the proper operation of the platform for other users.</li>
            <li>Circumvent or bypass security features, rate limits, or access restrictions.</li>
          </ul>
        </section>

        {/* Section 6: Intellectual Property */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <Shield className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>6. Intellectual Property</h2>
          </div>
          <p>
            All content, visual interfaces, branding, software code, validation algorithms, documentation, and trademarks associated with CSV Auditor Pro remain the exclusive intellectual property of CSV Auditor Pro and its creator. You are granted a limited, non-exclusive, non-transferable license to access and use the service in accordance with these terms.
          </p>
        </section>

        {/* Section 7: AI Features Disclaimer */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <Zap className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>7. AI Features & Output Review</h2>
          </div>
          <p>
            CSV Auditor Pro includes AI-powered dataset analysis, column classification, and automated cleaning recommendations powered by Google Gemini AI. AI-generated insights are provided for assistance purposes only. Users must independently review and verify all cleaned datasets before using them in critical business, compliance, or production applications.
          </p>
        </section>

        {/* Section 8: Service Availability */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <Clock className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>8. Service Availability & Uptime</h2>
          </div>
          <p>
            While we make commercially reasonable efforts to ensure 99.9% uptime and reliable performance, we do not guarantee uninterrupted, error-free operation. Maintenance windows, cloud infrastructure updates, or third-party outage events may occasionally affect access.
          </p>
        </section>

        {/* Section 9: Limitation of Liability */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <Scale className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>9. Limitation of Liability</h2>
          </div>
          <p>
            To the maximum extent permitted by law, CSV Auditor Pro shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business interruption arising from your use of or inability to use the service.
          </p>
        </section>

        {/* Section 10: Termination */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <FileCheck className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>10. Account Suspension & Termination</h2>
          </div>
          <p>
            We reserve the right to suspend or terminate your account immediately without prior notice if you violate these Terms of Service, engage in abusive behavior, or attempt to compromise platform security. You may terminate your account at any time via Account Settings.
          </p>
        </section>

        {/* Section 11: Changes to Terms */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <HelpCircle className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>11. Modifications & Contact</h2>
          </div>
          <p>
            We may update these Terms of Service from time to time. Continued use of the platform following any modifications constitutes your agreement to the revised terms.
          </p>
          <p className="text-xs pt-2">
            Questions regarding these terms? Contact support at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">{SUPPORT_EMAIL}</a>.
          </p>
        </section>

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
