import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  ArrowLeft, 
  ChevronRight, 
  Lock, 
  Database, 
  Cpu, 
  Key, 
  Cookie, 
  Clock, 
  Shield, 
  ExternalLink, 
  UserCheck, 
  Globe, 
  RefreshCw, 
  Mail, 
  CheckCircle2, 
  Sun, 
  Moon, 
  FileText,
  HelpCircle,
  Home,
  ArrowUpRight
} from 'lucide-react';

// Configurable Constants (Easy domain swap for future custom domain)
export const SITE_DOMAIN = "csv-auditor-pro.vercel.app";
export const SITE_URL = "https://csv-auditor-pro.vercel.app";
export const SUPPORT_EMAIL = "support@csvauditorpro.com";
export const LAST_UPDATED_DATE = "August 11, 2026";

interface SectionItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionItem[] = [
  { id: 'introduction', title: '1. Introduction', icon: ShieldCheck },
  { id: 'information-we-collect', title: '2. Information We Collect', icon: Database },
  { id: 'information-we-do-not-collect', title: '3. Information We Do Not Collect', icon: Lock },
  { id: 'local-csv-processing', title: '4. Local CSV Processing', icon: FileSpreadsheet },
  { id: 'ai-processing', title: '5. AI Processing', icon: Cpu },
  { id: 'firebase-authentication', title: '6. Firebase Authentication', icon: Key },
  { id: 'cookies-local-storage', title: '7. Cookies & Local Storage', icon: Cookie },
  { id: 'data-retention', title: '8. Data Retention', icon: Clock },
  { id: 'security', title: '9. Security', icon: Shield },
  { id: 'third-party-services', title: '10. Third-Party Services', icon: ExternalLink },
  { id: 'user-rights', title: '11. User Rights', icon: UserCheck },
  { id: 'childrens-privacy', title: '12. Children\'s Privacy', icon: ShieldCheck },
  { id: 'international-users', title: '13. International Users', icon: Globe },
  { id: 'policy-updates', title: '14. Policy Updates', icon: RefreshCw },
  { id: 'contact-information', title: '15. Contact Information', icon: Mail },
];

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || true;
  });
  const [activeSection, setActiveSection] = useState<string>('introduction');
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(false);

  // Toggle Theme
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

  // SEO & Head Metadata Setup
  useEffect(() => {
    document.title = "Privacy Policy | CSV Auditor Pro";

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'CSV Auditor Pro Privacy Policy - Learn how our local-first architecture protects customer dataset privacy, zero third-party AI model training, and secure authentication.'
    );

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}/privacy`);

    // Open Graph Metadata
    const ogTags = [
      { property: 'og:title', content: 'Privacy Policy | CSV Auditor Pro' },
      { property: 'og:description', content: 'CSV Auditor Pro Privacy Policy - Privacy-first, local CSV auditing.' },
      { property: 'og:url', content: `${SITE_URL}/privacy` },
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

  // Track active visible section during scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${
      isDarkMode ? 'bg-[#0F172A] text-[#F8FAFC]' : 'bg-[#F8FAFC] text-[#0F172A]'
    }`}>
      {/* Sticky Header Navbar */}
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

            <Link to="/" className="flex items-center gap-2.5 group">
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
              title="Toggle Light/Dark Theme"
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

      {/* Hero Banner Header */}
      <section className={`py-12 px-4 sm:px-6 lg:px-8 border-b ${
        isDarkMode ? 'bg-[#1E293B]/60 border-[#334155]' : 'bg-white border-[#E2E8F0]'
      }`}>
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-semibold ${
            isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#60A5FA]' : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Legal Documentation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
          }`}>
            Your trust is fundamental to CSV Auditor Pro. We are committed to protecting your information while providing secure, privacy-first CSV auditing.
          </p>

          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-mono text-[#94A3B8]">
            <span>Last Updated: {LAST_UPDATED_DATE}</span>
            <span>•</span>
            <span className="text-[#2563EB] dark:text-[#60A5FA] font-bold">{SITE_DOMAIN}</span>
          </div>
        </div>
      </section>

      {/* Main Layout Container (Toc + Content) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Desktop Sticky Table of Contents Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className={`sticky top-24 p-5 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                  Table of Contents
                </span>
                <span className="text-[10px] font-mono text-slate-400">15 Sections</span>
              </div>

              <nav className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                {SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-[#2563EB] text-white font-bold shadow-sm'
                          : isDarkMode 
                            ? 'text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white' 
                            : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{sec.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Document Content Column (~900px centered reading canvas) */}
          <article className="flex-1 max-w-[900px] mx-auto space-y-10">

            {/* Quick Summary Highlights Box */}
            <div className={`p-6 rounded-2xl border space-y-3 ${
              isDarkMode ? 'bg-[#1E293B]/80 border-[#334155]' : 'bg-[#EFF6FF] border-[#BFDBFE]'
            }`}>
              <div className="flex items-center gap-2 font-extrabold text-sm text-[#2563EB] dark:text-[#60A5FA]">
                <ShieldCheck className="w-5 h-5" />
                <span>Privacy Highlights at a Glance</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span><strong>100% Local Processing:</strong> CSV rows are parsed directly inside your browser memory.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span><strong>No AI Model Training:</strong> Your files and dataset columns are never used to train external AI models.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span><strong>Zero Third-Party Data Sales:</strong> We do not sell or monetize customer metrics or records.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span><strong>Full Data Custody:</strong> Clear workspace cache or request full account deletion at any time.</span>
                </li>
              </ul>
            </div>

            {/* Section 1: Introduction */}
            <section id="introduction" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h2 className="text-xl font-bold tracking-tight">1. Introduction</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>
                  Welcome to CSV Auditor Pro (accessible at <a href={SITE_URL} className="text-[#2563EB] dark:text-[#60A5FA] font-semibold hover:underline">{SITE_DOMAIN}</a>). Your privacy and information confidentiality are fundamental to our mission. This Privacy Policy outlines how CSV Auditor Pro ("we", "us", or "our") collects, protects, uses, and handles your information when you interact with our web application, software, and services.
                </p>
                <p>
                  By accessing or using CSV Auditor Pro, you acknowledge that you have read, understood, and agree to the data management standards set forth in this policy.
                </p>
              </div>
            </section>

            {/* Section 2: Information We Collect */}
            <section id="information-we-collect" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h2 className="text-xl font-bold tracking-tight">2. Information We Collect</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-4 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>We strictly limit data collection to the minimum details necessary to provide secure authentication, workspace settings, and reliable application performance:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Account Information:</strong> Your email address, display name, and unique authentication identifier provided during registration or Firebase sign-in.</li>
                  <li><strong>Subscription & Plan Details:</strong> Plan tier (Free Trial, Pro, Enterprise), subscription status, and payment transaction references generated by our merchant processor (Paddle).</li>
                  <li><strong>Technical Telemetry & Error Logs:</strong> Anonymized metrics such as browser type, operating system version, page load performance, and error stack traces to optimize platform reliability.</li>
                </ul>
              </div>
            </section>

            {/* Section 3: Information We Do Not Collect */}
            <section id="information-we-do-not-collect" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h2 className="text-xl font-bold tracking-tight">3. Information We Do Not Collect</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>CSV Auditor Pro adheres to a strict zero-custody standard regarding customer datasets:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>No Spreadsheet Row Content:</strong> We DO NOT collect, store, transmit to backend servers, or inspect the rows, cells, text, or numbers contained in your uploaded CSV, TSV, or XLSX files.</li>
                  <li><strong>No Third-Party Data Monetization:</strong> We DO NOT sell, rent, trade, or share your personal data or business information with advertisers or data brokers.</li>
                  <li><strong>No Cross-Site Tracking:</strong> We DO NOT track your browsing behavior across external websites.</li>
                </ul>
              </div>
            </section>

            {/* Section 4: Local CSV Processing */}
            <section id="local-csv-processing" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  04
                </div>
                <h2 className="text-xl font-bold tracking-tight">4. Local CSV Processing</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>
                  CSV Auditor Pro runs on a client-first architecture. Spreadsheet parsing, anomaly detection, data cleaning, deduplication, statistical calculation, and schema validation execute directly inside your browser memory using local JavaScript processing.
                </p>
                <p>
                  Your files remain isolated on your local device. They are not uploaded to central application databases unless you choose to use explicit team cloud sharing features.
                </p>
              </div>
            </section>

            {/* Section 5: AI Processing */}
            <section id="ai-processing" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  05
                </div>
                <h2 className="text-xl font-bold tracking-tight">5. AI Processing</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>
                  When you utilize AI Insights, formula assistance, or natural language cleaning copilot features:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Minimal Schema Context:</strong> API prompts send structural summaries, column headers, or statistical metrics required for explanations.</li>
                  <li><strong>Zero Third-Party Training:</strong> Customer data and prompts are <strong>NEVER</strong> used to train, retrain, or fine-tune third-party AI models or Google AI models.</li>
                  <li><strong>Transient Payload Lifecycle:</strong> Transmitted prompts are processed transiently in server memory and immediately purged upon returning responses.</li>
                </ul>
              </div>
            </section>

            {/* Section 6: Firebase Authentication */}
            <section id="firebase-authentication" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  06
                </div>
                <h2 className="text-xl font-bold tracking-tight">6. Firebase Authentication</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>
                  User identity and authentication sessions are managed via Google Firebase Authentication. Firebase encrypts authentication tokens, password hashes, and OAuth state in transit and at rest using enterprise security protocols compliant with ISO 27001, SOC 2, and GDPR standards.
                </p>
              </div>
            </section>

            {/* Section 7: Cookies & Local Storage */}
            <section id="cookies-local-storage" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  07
                </div>
                <h2 className="text-xl font-bold tracking-tight">7. Cookies & Local Storage</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>We use essential cookies and browser local storage strictly for core app functionality:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Essential Cookies:</strong> Maintain your active login session and cookie consent status.</li>
                  <li><strong>Theme Preferences:</strong> Store your Dark/Light mode preference and UI accent color selection (`app_accent`).</li>
                  <li><strong>Local IndexedDB Caching:</strong> Retains active workspace state so progress is not lost on tab refresh. You can clear this anytime in Settings via "Clear Workspace Storage".</li>
                </ul>
              </div>
            </section>

            {/* Section 8: Data Retention */}
            <section id="data-retention" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  08
                </div>
                <h2 className="text-xl font-bold tracking-tight">8. Data Retention</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>
                  Account credentials and profile settings are stored as long as your account remains active. You may request account deletion at any time by emailing <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">{SUPPORT_EMAIL}</a>. Spreadsheet files in browser storage are purged upon session end or according to your automated retention rules (24 hours, 7 days, or 30 days).
                </p>
              </div>
            </section>

            {/* Section 9: Security */}
            <section id="security" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  09
                </div>
                <h2 className="text-xl font-bold tracking-tight">9. Security</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>
                  We employ rigorous security standards including TLS 1.3 encrypted data transmission, server-side API key proxying (preventing key exposure in client code), Role-Based Access Controls (Owner, Admin, Editor, Viewer), and local containerized sandbox execution.
                </p>
              </div>
            </section>

            {/* Section 10: Third-Party Services */}
            <section id="third-party-services" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  10
                </div>
                <h2 className="text-xl font-bold tracking-tight">10. Third-Party Services</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>CSV Auditor Pro integrates with vetted enterprise service providers who adhere to strict privacy safeguards:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Google Firebase:</strong> User authentication and cloud database state.</li>
                  <li><strong>Google Gemini AI:</strong> Natural language formula assistance & anomaly explanations.</li>
                  <li><strong>Paddle:</strong> Payment processing & subscription management (Merchant of Record).</li>
                  <li><strong>Vercel:</strong> Cloud edge hosting & static infrastructure delivery.</li>
                </ul>
              </div>
            </section>

            {/* Section 11: User Rights */}
            <section id="user-rights" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  11
                </div>
                <h2 className="text-xl font-bold tracking-tight">11. User Rights</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>Under applicable global regulations (GDPR, CCPA/CPRA, UK GDPR), you hold full rights to access, correct, export, or permanently delete your account data. To submit a data subject access request, contact <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">{SUPPORT_EMAIL}</a>.</p>
              </div>
            </section>

            {/* Section 12: Children's Privacy */}
            <section id="childrens-privacy" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  12
                </div>
                <h2 className="text-xl font-bold tracking-tight">12. Children's Privacy</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>CSV Auditor Pro is designed for business and professional users aged 18 and older. We do not knowingly collect personal data from minors under the age of 16.</p>
              </div>
            </section>

            {/* Section 13: International Users */}
            <section id="international-users" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  13
                </div>
                <h2 className="text-xl font-bold tracking-tight">13. International Users</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>Cross-border data transfers necessary for account authentication are protected using Standard Contractual Clauses (SCCs) and GDPR-aligned data processor agreements.</p>
              </div>
            </section>

            {/* Section 14: Policy Updates */}
            <section id="policy-updates" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  14
                </div>
                <h2 className="text-xl font-bold tracking-tight">14. Policy Updates</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>We may periodically update this policy to reflect platform updates or legal requirements. Material revisions will be posted on this page with an updated "Last Updated" date.</p>
              </div>
            </section>

            {/* Section 15: Contact Information */}
            <section id="contact-information" className="scroll-mt-28 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs">
                  15
                </div>
                <h2 className="text-xl font-bold tracking-tight">15. Contact Information</h2>
              </div>
              <div className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-4 ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
              }`}>
                <p>For any questions regarding this Privacy Policy or your personal data rights, please reach out to our team:</p>
                <div className={`p-4 rounded-xl border space-y-2 font-mono text-xs ${
                  isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                }`}>
                  <div><strong>CSV Auditor Pro Support</strong></div>
                  <div>Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">{SUPPORT_EMAIL}</a></div>
                  <div>Website: <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">{SITE_URL}</a></div>
                </div>
              </div>
            </section>

            {/* Acknowledgment Bar & Page Action Footer */}
            <div className={`p-8 rounded-3xl border space-y-6 ${
              isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-md'
            }`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    hasAcknowledged 
                      ? 'bg-[#16A34A] text-white' 
                      : 'bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA]'
                  }`}>
                    {hasAcknowledged ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Policy Acknowledgment</h4>
                    <p className="text-xs text-[#94A3B8]">"I have read and understood this Privacy Policy."</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasAcknowledged(!hasAcknowledged)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    hasAcknowledged
                      ? 'bg-[#16A34A] text-white border-[#16A34A]'
                      : isDarkMode 
                        ? 'bg-[#0F172A] border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155]' 
                        : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {hasAcknowledged ? 'Acknowledged' : 'Confirm Read & Understood'}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                      isDarkMode ? 'bg-[#0F172A] border-[#334155] text-slate-300 hover:text-white' : 'bg-white border-[#E2E8F0] text-[#0F172A] shadow-sm'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span>Return Home</span>
                  </button>

                  <Link
                    to="/contact"
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                      isDarkMode ? 'bg-[#0F172A] border-[#334155] text-slate-300 hover:text-white' : 'bg-white border-[#E2E8F0] text-[#0F172A] shadow-sm'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Contact Support</span>
                  </Link>
                </div>

                <Link
                  to="/login"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Start Auditing</span>
                </Link>
              </div>
            </div>

          </article>
        </div>
      </main>

      {/* Global Page Footer */}
      <footer className={`border-t py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs ${
        isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#94A3B8]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy" className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-[#2563EB] transition-colors">Terms of Service</Link>
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
