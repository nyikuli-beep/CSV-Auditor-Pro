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
  Lock,
  Home,
  Check,
  Cpu,
  Zap,
  Code,
  Layers,
  Award,
  BookOpen,
  Terminal,
  Shield,
  FileCheck
} from 'lucide-react';
import { SITE_DOMAIN, SITE_URL, SUPPORT_EMAIL } from '../constants/siteConfig';

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

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Learn about CSV Auditor Pro - Our mission, vision, key AI features, enterprise tech stack, and developer Nyikuli Bramwel.'
    );

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}/about`);

    // Open Graph Metadata
    const ogTags = [
      { property: 'og:title', content: 'About Us | CSV Auditor Pro' },
      { property: 'og:description', content: 'CSV Auditor Pro - Enterprise platform for intelligent CSV analysis, validation, and automated cleaning.' },
      { property: 'og:url', content: `${SITE_URL}/about` },
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
          <span className="font-semibold text-[#2563EB] dark:text-[#60A5FA]">About Us</span>
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
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Data Integrity Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            About CSV Auditor Pro
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
          }`}>
            Empowering data analysts, compliance officers, and business teams to clean, validate, audit, and improve CSV datasets securely and efficiently.
          </p>
        </div>
      </section>

      {/* Content Container (~900px centered reading canvas) */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Section 1: Our Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}>
            <div className="flex items-center gap-2 text-sm font-bold text-[#2563EB] dark:text-[#60A5FA]">
              <Globe className="w-5 h-5" />
              <h2>Our Mission</h2>
            </div>
            <p className="text-xs leading-relaxed text-[#94A3B8]">
              To help businesses, researchers, and enterprises clean, validate, audit, and improve CSV datasets securely and efficiently without compromising data privacy or exposing confidential records to untrusted cloud servers.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}>
            <div className="flex items-center gap-2 text-sm font-bold text-[#16A34A]">
              <Sparkles className="w-5 h-5" />
              <h2>Our Vision</h2>
            </div>
            <p className="text-xs leading-relaxed text-[#94A3B8]">
              To become the world's most trusted enterprise platform for intelligent CSV analysis, schema enforcement, and automated dataset quality assurance powered by privacy-first local processing and ethical AI.
            </p>
          </div>
        </div>

        {/* Section 2: Key Features */}
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <span>Key Platform Capabilities</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <Cpu className="w-5 h-5 text-[#2563EB]" />
              <div className="font-bold text-sm">AI-Powered CSV Analysis</div>
              <p className="text-[#94A3B8]">Smart anomaly detection and semantic column classification powered by Google Gemini AI.</p>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              <div className="font-bold text-sm">Data Validation</div>
              <p className="text-[#94A3B8]">Instant scoring, type checks, missing value flags, and rule-based validation engines.</p>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <Zap className="w-5 h-5 text-[#F59E0B]" />
              <div className="font-bold text-sm">Advanced Cleaning</div>
              <p className="text-[#94A3B8]">One-click removal of trailing whitespace, special character scrubbing, and auto-formatting.</p>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <FileSpreadsheet className="w-5 h-5 text-[#9333EA]" />
              <div className="font-bold text-sm">Duplicate Detection</div>
              <p className="text-[#94A3B8]">Fuzzy matching and exact row key analysis to eliminate redundant customer records.</p>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <Code className="w-5 h-5 text-[#06B6D4]" />
              <div className="font-bold text-sm">Pattern Recognition</div>
              <p className="text-[#94A3B8]">Automated detection of emails, phone numbers, SSNs, credit cards, and date formats.</p>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <FileCheck className="w-5 h-5 text-[#10B981]" />
              <div className="font-bold text-sm">Compliance Reporting</div>
              <p className="text-[#94A3B8]">Export audit certificates and formatted PDF summary reports for compliance review.</p>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <Lock className="w-5 h-5 text-[#2563EB]" />
              <div className="font-bold text-sm">Secure Local Processing</div>
              <p className="text-[#94A3B8]">Client-side browser parsing ensures spreadsheet rows never leave local memory.</p>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <Shield className="w-5 h-5 text-[#DC2626]" />
              <div className="font-bold text-sm">Enterprise Security</div>
              <p className="text-[#94A3B8]">Firebase Auth protection, AES-256 IndexedDB caching, and zero AI model training.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Why CSV Auditor Pro */}
        <section className={`p-8 rounded-3xl border space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Why CSV Auditor Pro?</h2>
          <p className="leading-relaxed text-sm">
            Spreadsheets remain the lifeblood of business workflows. Yet bad data costs organizations millions in operational mistakes, failed data migrations, and compliance penalties. CSV Auditor Pro was engineered with a strict focus on four pillars:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <strong>Privacy:</strong> Local-first architecture means sensitive customer data stays in your browser.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <strong>Speed:</strong> Instant multi-threaded Web Worker parsing handles 100,000+ rows in seconds.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <strong>Automation:</strong> One-click cleaning steps convert hours of manual spreadsheet work into seconds.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <strong>Reliability:</strong> Deterministic rule engines paired with AI provide trustworthy audit metrics.
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Technology Stack */}
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <span>Technology Stack</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className={`p-4 rounded-xl border text-center ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#06B6D4]">React</div>
              <div className="text-[11px] text-[#94A3B8] mt-1">Component UI Engine</div>
            </div>
            <div className={`p-4 rounded-xl border text-center ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#2563EB]">TypeScript</div>
              <div className="text-[11px] text-[#94A3B8] mt-1">Type-Safe Architecture</div>
            </div>
            <div className={`p-4 rounded-xl border text-center ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#F59E0B]">Firebase Auth</div>
              <div className="text-[11px] text-[#94A3B8] mt-1">Identity & Authentication</div>
            </div>
            <div className={`p-4 rounded-xl border text-center ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#9333EA]">Google Gemini AI</div>
              <div className="text-[11px] text-[#94A3B8] mt-1">Smart Copilot Engine</div>
            </div>
            <div className={`p-4 rounded-xl border text-center ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#10B981]">Vercel</div>
              <div className="text-[11px] text-[#94A3B8] mt-1">Global Edge Deployment</div>
            </div>
            <div className={`p-4 rounded-xl border text-center ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
              <div className="font-bold text-sm text-[#EC4899]">Paddle</div>
              <div className="text-[11px] text-[#94A3B8] mt-1">Merchant of Record Billing</div>
            </div>
          </div>
        </section>

        {/* Section 5: Developer Section */}
        <section className={`p-8 rounded-3xl border space-y-4 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-lg shadow-md">
              NB
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">Platform Architect & Lead Developer</div>
              <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">Developed by Nyikuli Bramwel</h2>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-[#94A3B8]">
            Nyikuli Bramwel is a passionate Computer Science student and software developer focused on building secure, high-performance, AI-powered SaaS applications for modern businesses. With a deep commitment to data privacy, clean code principles, and intuitive user experiences, he designed CSV Auditor Pro to solve real-world spreadsheet challenges faced by enterprise teams globally.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <a 
              href="mailto:nyikulibramwel@gmail.com" 
              className="px-3 py-1.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Nyikuli</span>
            </a>
            <span className="text-slate-500">•</span>
            <span className="text-[#94A3B8]">Computer Science Student & Software Engineer</span>
          </div>
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
