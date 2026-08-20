import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  FileCheck, 
  ShieldAlert, 
  Database, 
  Users, 
  Activity, 
  ArrowUpRight, 
  Plus, 
  Minus, 
  Sun, 
  Moon,
  TrendingUp,
  FileText,
  X,
  Mail,
  Check,
  Loader2
} from 'lucide-react';
import { FAQ_ITEMS } from '../sampleData';
import { FOOTER_DOCS } from '../data/footerDocs';
import { AboutFounder } from './AboutFounder';
import { SocialLinksGroup } from './SocialLinks';

const VALUE_BLOCKS = [
  {
    title: 'Save Hours Every Week',
    description: 'Automate tedious CSV validation tasks and eliminate repetitive manual data cleaning across your workflows.'
  },
  {
    title: 'Improve Data Accuracy',
    description: 'Detect missing values, duplicate records, invalid formats, inconsistent data types, and schema issues before they impact your business.'
  },
  {
    title: 'Maintain Schema Integrity',
    description: 'Ensure every uploaded CSV follows a consistent structure, making your datasets reliable for reporting, analytics, AI models, and database imports.'
  },
  {
    title: 'Export With Confidence',
    description: 'Generate professional validation reports and export clean, trusted CSV files that are ready for analysis or production use.'
  }
];

interface LandingPageProps {
  onStartTrial: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  accentClass: string;
  onOpenEnterpriseModal?: () => void;
  onSelectPlan?: (plan: 'free' | 'pro' | 'enterprise') => void;
}

export default function LandingPage({ 
  onStartTrial, 
  isDarkMode, 
  toggleTheme, 
  accentClass,
  onOpenEnterpriseModal,
  onSelectPlan 
}: LandingPageProps) {

  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [activeModalKey, setActiveModalKey] = useState<string | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0F172A';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#FFFFFF';
    }
  }, [isDarkMode]);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    setNewsletterStatus('loading');
    setTimeout(() => {
      setNewsletterStatus('success');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterStatus('idle'), 4000);
    }, 850);
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${isDarkMode ? 'bg-[#0F172A] text-[#F8FAFC]' : 'bg-[#FFFFFF] text-[#0F172A]'}`}>
      {/* Header / Navbar */}
      <header className={`sticky top-0 z-50 border-b ${isDarkMode ? 'border-[#334155] bg-[#0F172A]' : 'border-[#E2E8F0] bg-white'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-[#1E293B] text-[#2563EB]' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
              <FileSpreadsheet className="w-6 h-6 text-[#2563EB]" id="app-logo-icon" />
            </div>
            <div>
              <span className={`font-bold tracking-tight text-lg ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>CSV Auditor</span>
              <span className={`ml-1.5 px-2 py-0.5 text-xs font-bold rounded-md ${isDarkMode ? 'bg-[#1E293B] text-[#60A5FA] border border-[#334155]' : 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'}`}>PRO</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className={`hover:text-[#2563EB] transition-colors duration-200 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>Features</a>
            <a href="#value-proposition" className={`hover:text-[#2563EB] transition-colors duration-200 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>Why CSV Auditor</a>
            <a href="#pricing" className={`hover:text-[#2563EB] transition-colors duration-200 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>Pricing</a>
            <a href="#faq" className={`hover:text-[#2563EB] transition-colors duration-200 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>FAQ</a>
            <a href="#about-founder" className={`hover:text-[#2563EB] transition-colors duration-200 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>Meet Founder</a>
          </nav>

          <div className="flex items-center gap-4">
            <motion.button 
              onClick={toggleTheme} 
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className={`p-2 rounded-xl border transition-colors duration-200 cursor-pointer ${isDarkMode ? 'bg-[#1E293B] border-[#334155] text-amber-400 hover:bg-[#334155]' : 'bg-white border-[#E2E8F0] text-[#2563EB] hover:bg-[#F8FAFC] shadow-sm'}`}
              aria-label="Toggle theme"
              id="theme-toggle"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isDarkMode ? 'dark' : 'light'}
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#2563EB]" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
            
            {/* Primary Button */}
            <button 
              onClick={onStartTrial}
              className="hidden sm:inline-flex px-4 py-2 text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-xl transition-colors duration-200 shadow-sm cursor-pointer"
              id="btn-header-try-free"
            >
              Start Free Trial
            </button>
            <button 
              onClick={onStartTrial}
              className="sm:hidden px-3.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-xl transition-colors duration-200 shadow-sm cursor-pointer"
            >
              Start Trial
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden ${isDarkMode ? 'bg-[#0F172A]' : 'bg-[#FFFFFF]'}`}>
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 border ${isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#60A5FA]' : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]'}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
              <span>Next-Gen AI Auditing Suite</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={`text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}
            >
              Audit CSV Files in <span className="text-[#2563EB]">Minutes</span>, Not Hours.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className={`text-lg md:text-xl mb-8 max-w-xl leading-relaxed ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}
            >
              Transform messy spreadsheets into trusted insights. Automatically detect duplicates, outliers, missing values, and structure inconsistencies using intelligent rule-engines and deep AI analysis.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              {/* Primary CTA Button */}
              <button 
                onClick={onStartTrial}
                className="px-8 py-4 text-base font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                id="hero-start-trial-btn"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Secondary CTA Button */}
              <a 
                href="#features"
                className={`px-6 py-4 text-base font-bold rounded-xl border border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA] dark:border-[#60A5FA] bg-transparent hover:bg-[#EFF6FF] dark:hover:bg-[#1E293B] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2`}
              >
                Explore Features
              </a>
            </motion.div>
          </div>

          {/* Product Mockup Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className={`w-full max-w-md p-6 rounded-2xl border transition-all duration-200 ${isDarkMode ? 'bg-[#1E293B] border-[#334155] shadow-md' : 'bg-white border-[#E2E8F0] shadow-md'}`}
            >
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
                <span className={`text-xs font-semibold uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
                  <Database className="w-3.5 h-3.5 text-[#2563EB]" /> File Pipeline
                </span>
                <span className="text-xs bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded font-mono font-bold">Completed</span>
              </div>

              {/* Before Section */}
              <div className={`p-4 rounded-xl mb-4 border relative overflow-hidden ${isDarkMode ? 'bg-[#0F172A] border-[#DC2626]/40' : 'bg-[#FEF2F2] border-[#FCA5A5]'}`}>
                <div className="absolute top-2 right-2 text-[#DC2626]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-[#DC2626] mb-2 uppercase tracking-wider">Messy_Source.csv</h4>
                <div className="font-mono text-[11px] leading-relaxed space-y-1 text-[#475569] dark:text-[#CBD5E1]">
                  <div>TXN-101,,Acme Corp,$1250,NY</div>
                  <div className="bg-[#DC2626]/10 text-[#DC2626] line-through px-1 rounded">TXN-101,,Acme Corp,$1250,NY</div>
                  <div>TXN-102,04/06/16,Hooli,350.00,us</div>
                </div>
              </div>

              {/* Transformation Indicator */}
              <div className="flex flex-col items-center justify-center py-2 text-[#2563EB]">
                <div className="w-0.5 h-5 bg-[#2563EB]"></div>
                <div className="my-1 text-xs font-mono font-bold tracking-wide flex items-center gap-1.5 text-[#2563EB] dark:text-[#60A5FA]">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" /> Gemini Engine Audit
                </div>
                <div className="w-0.5 h-5 bg-[#2563EB]"></div>
              </div>

              {/* After Section */}
              <div className={`p-4 rounded-xl border relative overflow-hidden ${isDarkMode ? 'bg-[#0F172A] border-[#16A34A]/40' : 'bg-[#F0FDF4] border-[#86EFAC]'}`}>
                <div className="absolute top-2 right-2 text-[#16A34A]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                </div>
                <h4 className="text-xs font-bold text-[#16A34A] mb-2 uppercase tracking-wider">Cleaned_Transactions.csv</h4>
                <div className="font-mono text-[11px] leading-relaxed space-y-1 text-[#16A34A]">
                  <div>TXN_ID,Date,Company,Amount,Region</div>
                  <div>TXN-0101,2026-06-01,Acme Corp,1250.00,US</div>
                  <div>TXN-0102,2026-06-04,Hooli Inc,35.00,US</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section id="features" className={`py-20 border-t border-b ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight mb-4 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              Engineered for absolute data integrity.
            </h2>
            <p className={`text-lg ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              CSV Auditor Pro comes loaded with state-of-the-art diagnostics and corrections workflows designed to handle complex datasets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`p-8 rounded-2xl border transition-all duration-200 hover:-translate-y-1 ${isDarkMode ? 'bg-[#1E293B] border-[#334155] shadow-sm hover:shadow-md' : 'bg-white border-[#E2E8F0] shadow-sm hover:shadow-md'}`}>
              <div className="p-3 bg-[#EFF6FF] text-[#2563EB] dark:bg-[#0F172A] dark:text-[#60A5FA] rounded-xl w-fit mb-6">
                <FileCheck className="w-6 h-6 text-[#2563EB] dark:text-[#60A5FA]" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>100% Client-Side Sandbox</h3>
              <p className={isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}>
                Perform complete dry-run validation directly inside your browser cache. Zero files are stored long-term without explicit permission.
              </p>
            </div>

            <div className={`p-8 rounded-2xl border transition-all duration-200 hover:-translate-y-1 ${isDarkMode ? 'bg-[#1E293B] border-[#334155] shadow-sm hover:shadow-md' : 'bg-white border-[#E2E8F0] shadow-sm hover:shadow-md'}`}>
              <div className="p-3 bg-[#F0FDF4] text-[#16A34A] dark:bg-[#0F172A] dark:text-[#16A34A] rounded-xl w-fit mb-6">
                <Sparkles className="w-6 h-6 text-[#16A34A]" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>AI Deep Explanations</h3>
              <p className={isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}>
                Never wonder why a value was flagged. Get detailed Gemini intelligence outlining what looks abnormal and how it should ideally be formatted.
              </p>
            </div>

            <div className={`p-8 rounded-2xl border transition-all duration-200 hover:-translate-y-1 ${isDarkMode ? 'bg-[#1E293B] border-[#334155] shadow-sm hover:shadow-md' : 'bg-white border-[#E2E8F0] shadow-sm hover:shadow-md'}`}>
              <div className="p-3 bg-[#FEF3C7] text-[#F59E0B] dark:bg-[#0F172A] dark:text-[#F59E0B] rounded-xl w-fit mb-6">
                <TrendingUp className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>Advanced Clean-Up Centers</h3>
              <p className={isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}>
                Apply bulk modifications like filling missing values using mean/medians, deduplication with custom row rules, and automatic uppercase standardizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section id="value-proposition" className={`py-24 border-t border-b transition-colors duration-200 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight mb-6 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              Built for Reliable Data Quality
            </h2>
            <p className={`text-base md:text-lg leading-relaxed ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              Every CSV deserves accurate validation. CSV Auditor Pro helps businesses, analysts, developers, researchers, and operations teams detect errors, validate data, and generate clean, analysis-ready datasets in seconds. Eliminate manual spreadsheet work and improve confidence in every dataset.
            </p>
          </motion.div>

          {/* Vertically Stacked Feature Rows */}
          <div className={`divide-y border-t border-b mb-16 ${isDarkMode ? 'divide-[#334155] border-[#334155]' : 'divide-[#E2E8F0] border-[#E2E8F0]'}`}>
            {VALUE_BLOCKS.map((block, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className="py-8 flex flex-col sm:flex-row items-start gap-5 sm:gap-6"
              >
                <div className="w-10 h-10 rounded-full bg-[#EFF6FF] dark:bg-[#0F172A] border border-[#DBEAFE] dark:border-[#334155] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
                </div>
                <div className="space-y-2">
                  <h3 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                    {block.title}
                  </h3>
                  <p className={`text-sm md:text-base leading-relaxed ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                    {block.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom Statement */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="text-center pt-2"
          >
            <p className="text-xl md:text-2xl font-bold text-[#2563EB] dark:text-[#60A5FA] tracking-tight">
              Clean Data. Trusted Decisions. Better Outcomes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={`py-20 border-t ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight mb-4 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              Transparent, utility-driven pricing.
            </h2>
            <p className={isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}>
              Choose the perfect tier for your data demands. All tiers support fully custom branding & compliance reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className={`p-8 rounded-2xl border flex flex-col justify-between transition-all duration-200 ${isDarkMode ? 'bg-[#1E293B] border-[#334155] shadow-sm hover:shadow-md' : 'bg-white border-[#E2E8F0] shadow-sm hover:shadow-md'}`}>
              <div>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>Free</h3>
                <p className="text-sm text-[#94A3B8] mb-6">For single analysts & hobbyists.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-extrabold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>$0</span>
                  <span className="text-xs text-[#94A3B8]">/ forever</span>
                </div>
                <ul className="space-y-3.5 text-sm mb-8">
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> 5 file audits per month</li>
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Basic standard validation checks</li>
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> CSV exports only</li>
                  <li className="flex items-center gap-2 text-[#94A3B8]"><Minus className="w-4 h-4" /> No AI Insights & Explanations</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  if (onSelectPlan) onSelectPlan('free');
                  else onStartTrial();
                }}
                className={`w-full py-3 rounded-xl text-sm font-bold border transition-all duration-200 cursor-pointer border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA] dark:border-[#60A5FA] bg-transparent hover:bg-[#EFF6FF] dark:hover:bg-[#0F172A]`}
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Tier (Featured) */}
            <div className={`p-8 rounded-2xl border flex flex-col justify-between relative transition-all duration-200 shadow-md ${isDarkMode ? 'bg-[#1E293B] border-[#2563EB]' : 'bg-white border-[#2563EB]'}`}>
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#2563EB] text-white text-[11px] font-bold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-sm">
                Most Popular
              </div>
              <div>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>Pro</h3>
                <p className="text-sm text-[#94A3B8] mb-6">For growing businesses & active auditors.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-extrabold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>$49</span>
                  <span className="text-xs text-[#94A3B8]">/ month</span>
                </div>
                <ul className="space-y-3.5 text-sm mb-8">
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Unlimited audits & rows</li>
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> AI Insights & conversational assistant</li>
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Standardized date & case cleaning</li>
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Custom branding & PDF compliance</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  if (onSelectPlan) onSelectPlan('pro');
                  else onStartTrial();
                }}
                className="w-full py-3 text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-sm font-bold rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className={`p-8 rounded-2xl border flex flex-col justify-between transition-all duration-200 ${isDarkMode ? 'bg-[#1E293B] border-[#334155] shadow-sm hover:shadow-md' : 'bg-white border-[#E2E8F0] shadow-sm hover:shadow-md'}`}>
              <div>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>Enterprise</h3>
                <p className="text-sm text-[#94A3B8] mb-6">For high-throughput finance sectors.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-extrabold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>$199</span>
                  <span className="text-xs text-[#94A3B8]">/ month</span>
                </div>
                <ul className="space-y-3.5 text-sm mb-8">
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Everything in Pro</li>
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Multi-user team collaboration & roles</li>
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Secure developer API and Webhooks</li>
                  <li className={`flex items-center gap-2 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}><CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Dedicated SLA priority support</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  if (onOpenEnterpriseModal) onOpenEnterpriseModal();
                  else if (onSelectPlan) onSelectPlan('enterprise');
                  else onStartTrial();
                }}
                className={`w-full py-3 rounded-xl text-sm font-bold border transition-all duration-200 cursor-pointer border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA] dark:border-[#60A5FA] bg-transparent hover:bg-[#EFF6FF] dark:hover:bg-[#0F172A]`}
              >
                Contact Sales
              </button>

            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={`py-20 ${isDarkMode ? 'bg-[#0F172A]' : 'bg-[#FFFFFF]'}`}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl font-bold tracking-tight mb-4 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              Frequently Asked Questions
            </h2>
            <p className={isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}>
              Find quick answers regarding our CSV standardizations, model usage, and enterprise configurations.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((faq, idx) => (
              <div 
                key={idx}
                className={`border rounded-xl transition-all duration-200 ${isDarkMode ? 'bg-[#1E293B] border-[#334155] hover:bg-[#334155]/50' : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className={`w-full text-left px-6 py-4.5 flex justify-between items-center font-bold text-base cursor-pointer ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}
                >
                  <span>{faq.q}</span>
                  <span className="text-[#94A3B8]">
                    {activeFaq === idx ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className={`px-6 pb-5 pt-1 text-sm leading-relaxed border-t ${isDarkMode ? 'text-[#CBD5E1] border-[#334155]' : 'text-[#475569] border-[#E2E8F0]'}`}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About the Founder Section */}
      <AboutFounder isDarkMode={isDarkMode} />

      {/* CTA Section Banner */}
      <section className={`py-20 ${isDarkMode ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}>
        <div className="max-w-5xl mx-auto px-6">
          <div className={`p-12 rounded-2xl border text-center transition-all duration-200 ${isDarkMode ? 'bg-[#1E293B] border-[#334155] shadow-md' : 'bg-white border-[#E2E8F0] shadow-md'}`}>
            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight mb-4 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              Start audit-proofing your sheets today.
            </h2>
            <p className={`text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              Join hundreds of data analysts and accounting teams that trust CSV Auditor Pro to deliver error-free spreadsheets. Setup takes less than a minute.
            </p>
            <button 
              onClick={onStartTrial}
              className="px-8 py-3.5 text-base font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              id="cta-bottom-btn"
            >
              Get Started with CSV Auditor Pro
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-12 text-sm transition-colors duration-200 ${isDarkMode ? 'border-[#334155] bg-[#0F172A] text-[#CBD5E1]' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'}`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-[#1E293B] text-[#2563EB]' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
                <FileSpreadsheet className="w-5 h-5 text-[#2563EB]" />
              </div>
              <span className={`font-bold text-base ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>CSV Auditor Pro</span>
            </div>
            <p className="text-xs leading-relaxed text-[#94A3B8]">
              Transform messy spreadsheets into trusted insights. Built for enterprise compliance audits and daily analytical cleanups.
            </p>
          </div>

          <div>
            <h4 className={`font-bold mb-4 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>Product</h4>
            <ul className="space-y-2.5 text-xs flex flex-col items-start">
              <li><a href="#features" className="hover:text-[#2563EB] transition-colors">Features</a></li>
              <li><a href="#about-founder" className="hover:text-[#2563EB] transition-colors">Meet the Founder</a></li>
              <li><a href="#pricing" className="hover:text-[#2563EB] transition-colors">Pricing</a></li>
              <li><button onClick={() => setActiveModalKey('api')} className="hover:text-[#2563EB] transition-colors text-left cursor-pointer bg-transparent border-none p-0 outline-none">API Documentation</button></li>
              <li><button onClick={() => setActiveModalKey('integrations')} className="hover:text-[#2563EB] transition-colors text-left cursor-pointer bg-transparent border-none p-0 outline-none">Integrations</button></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold mb-4 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>Legal & Company</h4>
            <ul className="space-y-2.5 text-xs flex flex-col items-start">
              <li><Link to="/privacy" className="hover:text-[#2563EB] transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#2563EB] transition-colors">Terms of Service</Link></li>
              <li><Link to="/refund-policy" className="hover:text-[#2563EB] transition-colors">Refund Policy</Link></li>
              <li><Link to="/about" className="hover:text-[#2563EB] transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-[#2563EB] transition-colors">Contact Support</Link></li>
              <li><button onClick={() => setActiveModalKey('privacy')} className="hover:text-[#2563EB] transition-colors text-left cursor-pointer bg-transparent border-none p-0 outline-none text-[11px] text-[#94A3B8]">Privacy Summary</button></li>
            </ul>
          </div>

          <div>
            <h4 className={`font-bold mb-4 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>Join our newsletter</h4>
            <p className="text-xs mb-4 text-[#94A3B8]">Stay informed about data auditing standards and modern spreadsheet hygiene.</p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input 
                  type="email" 
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="you@domain.com" 
                  disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                  className={`px-3 py-2 text-xs rounded-lg border w-full focus:outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-[#1E293B] border-[#334155] text-white focus:border-[#2563EB] disabled:opacity-50' 
                      : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB] disabled:opacity-50'
                  }`}
                />
                <button 
                  type="submit"
                  disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-lg transition-colors duration-200 shrink-0 flex items-center justify-center min-w-[85px] cursor-pointer disabled:opacity-85 shadow-sm"
                >
                  {newsletterStatus === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : newsletterStatus === 'success' ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </div>
              {newsletterStatus === 'success' && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#16A34A] font-bold text-[11px] flex items-center gap-1 mt-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                  Subscription confirmed!
                </motion.p>
              )}
            </form>
          </div>
        </div>

        <div className={`max-w-7xl mx-auto px-6 mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between text-xs ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
          <span>&copy; {new Date().getFullYear()} CSV Auditor Pro. All rights reserved.</span>
          <div className="mt-4 sm:mt-0">
            <SocialLinksGroup isDarkMode={isDarkMode} iconSize={18} />
          </div>
        </div>
      </footer>

      {/* Footer Document Modal */}
      {activeModalKey && FOOTER_DOCS[activeModalKey] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#0F172A]/80"
            onClick={() => setActiveModalKey(null)}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border flex flex-col shadow-xl z-10 ${
              isDarkMode 
                ? 'bg-[#0F172A] border-[#334155] text-[#F8FAFC]' 
                : 'bg-white border-[#E2E8F0] text-[#0F172A]'
            }`}
          >
            {/* Header */}
            <div className={`p-6 border-b flex items-start justify-between gap-4 ${
              isDarkMode ? 'border-[#334155] bg-[#1E293B]' : 'border-[#E2E8F0] bg-[#F8FAFC]'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                    isDarkMode ? 'bg-[#0F172A] text-[#60A5FA] border border-[#334155]' : 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'
                  }`}>
                    Interactive Document
                  </span>
                  <span className="text-[#94A3B8] text-[10px] font-medium">{FOOTER_DOCS[activeModalKey].lastUpdated}</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">{FOOTER_DOCS[activeModalKey].title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed max-w-lg">{FOOTER_DOCS[activeModalKey].subtitle}</p>
              </div>
              <button 
                onClick={() => setActiveModalKey(null)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-[#0F172A] border-[#334155] hover:bg-[#334155] text-[#CBD5E1] hover:text-white' 
                    : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm leading-relaxed">
              {FOOTER_DOCS[activeModalKey].sections.map((sec, sIdx) => (
                <div key={sIdx} className="space-y-2.5">
                  <h4 className="font-bold text-sm text-[#2563EB] dark:text-[#60A5FA] flex items-center gap-1.5">
                    {sec.title}
                  </h4>
                  {sec.paragraphs.map((p, pIdx) => {
                    const isHeaderSnippet = p.includes(':') && (p.startsWith('Authorization') || p.startsWith('Endpoint') || p.startsWith('{') || p.startsWith('}'));
                    return (
                      <p 
                        key={pIdx} 
                        className={`text-xs ${
                          isHeaderSnippet 
                            ? 'font-mono bg-[#1E293B] border border-[#334155] p-2.5 rounded-lg text-[#60A5FA] block break-all whitespace-pre-wrap'
                            : isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
                        }`}
                      >
                        {p}
                      </p>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 ${
              isDarkMode ? 'border-[#334155] bg-[#1E293B]' : 'border-[#E2E8F0] bg-[#F8FAFC]'
            }`}>
              {activeModalKey === 'privacy' ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalKey(null);
                    navigate('/privacy');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Read Full Privacy Policy</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalKey(null)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-[#0F172A] border-[#334155] hover:bg-[#334155] text-[#CBD5E1]' 
                      : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] shadow-sm'
                  }`}
                >
                  Close Document
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalKey(null);
                    onStartTrial();
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl transition-colors duration-200 shadow-sm cursor-pointer"
                >
                  Start Auditing Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
