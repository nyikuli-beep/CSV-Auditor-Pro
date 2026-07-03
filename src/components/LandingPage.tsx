import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Play, 
  FileCheck, 
  ShieldAlert, 
  Database, 
  Users, 
  Activity, 
  ArrowUpRight, 
  Star, 
  Plus, 
  Minus, 
  Sun, 
  Moon,
  TrendingUp,
  FileText
} from 'lucide-react';
import { TESTIMONIALS, FAQ_ITEMS } from '../sampleData';

interface LandingPageProps {
  onStartTrial: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  accentClass: string;
}

export default function LandingPage({ onStartTrial, isDarkMode, toggleTheme, accentClass }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/80'} transition-all`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-500/10 text-blue-600'}`}>
              <FileSpreadsheet className="w-6 h-6" id="app-logo-icon" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg">CSV Auditor</span>
              <span className={`ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-md ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>PRO</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className={`hover:opacity-80 transition-opacity ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Features</a>
            <a href="#testimonials" className={`hover:opacity-80 transition-opacity ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Customers</a>
            <a href="#pricing" className={`hover:opacity-80 transition-opacity ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Pricing</a>
            <a href="#faq" className={`hover:opacity-80 transition-opacity ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme} 
              className={`p-2 rounded-lg border transition-all hover:scale-105 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white border-slate-200 text-slate-600'}`}
              aria-label="Toggle theme"
              id="theme-toggle"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={onStartTrial}
              className={`hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:shadow-lg ${accentClass}`}
              id="btn-header-try-free"
            >
              Sign In
            </button>
            <button 
              onClick={onStartTrial}
              className="sm:hidden px-3.5 py-1.5 text-xs font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen AI Auditing Suite</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
            >
              Audit CSV Files in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400">Minutes</span>, Not Hours.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`text-lg md:text-xl mb-8 max-w-xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
            >
              Transform messy spreadsheets into trusted insights. Automatically detect duplicates, outliers, missing values, and structure inconsistencies using intelligent rule-engines and deep AI analysis.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button 
                onClick={onStartTrial}
                className={`px-8 py-4 text-base font-medium text-white rounded-xl flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-all cursor-pointer ${accentClass}`}
                id="hero-start-trial-btn"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={onStartTrial}
                className={`px-6 py-4 text-base font-medium rounded-xl flex items-center justify-center gap-2 border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                id="hero-watch-demo-btn"
              >
                <Play className="w-4 h-4 fill-current text-slate-500" />
                Watch Demo
              </button>
            </motion.div>
          </div>

          {/* Interactive Transforming Illustration */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-75 -z-10"></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`w-full max-w-md p-6 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-2xl shadow-blue-500/5' : 'bg-white border-slate-200 shadow-xl'}`}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-dashed border-slate-700/50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" /> File Pipeline
                </span>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Completed</span>
              </div>

              {/* Before Section */}
              <div className={`p-4 rounded-xl mb-4 border relative overflow-hidden ${isDarkMode ? 'bg-slate-950/80 border-rose-500/20' : 'bg-rose-50/30 border-rose-100'}`}>
                <div className="absolute top-2 right-2 text-rose-500">
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold text-rose-500 mb-2 uppercase tracking-wider">Messy_Source.csv</h4>
                <div className="font-mono text-[11px] leading-relaxed space-y-1 opacity-70">
                  <div>TXN-101,,Acme Corp,$1250,NY</div>
                  <div className="bg-rose-500/10 text-rose-400 line-through">TXN-101,,Acme Corp,$1250,NY</div>
                  <div>TXN-102,04/06/16,Hooli,350.00,us</div>
                </div>
              </div>

              {/* Transformation Indicator */}
              <div className="flex flex-col items-center justify-center py-2 text-blue-500">
                <div className="w-0.5 h-6 bg-gradient-to-b from-rose-500 via-blue-500 to-emerald-500 animate-pulse"></div>
                <div className="my-1 text-xs font-mono font-medium tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Gemini Engine Audit
                </div>
                <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 to-emerald-500"></div>
              </div>

              {/* After Section */}
              <div className={`p-4 rounded-xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-950/80 border-emerald-500/20' : 'bg-emerald-50/30 border-emerald-100'}`}>
                <div className="absolute top-2 right-2 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-emerald-500 mb-2 uppercase tracking-wider">Cleaned_Transactions.csv</h4>
                <div className="font-mono text-[11px] leading-relaxed space-y-1 text-emerald-400/90">
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
      <section id="features" className="py-20 border-t border-b border-dashed border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Engineered for absolute data integrity.</h2>
            <p className={`text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              CSV Auditor Pro comes loaded with state-of-the-art diagnostics and corrections workflows designed to handle the hairiest spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`p-8 rounded-2xl border transition-all hover:translate-y-[-4px] ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl w-fit mb-6">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">100% Client-Side Sandbox</h3>
              <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                Perform complete dry-run validation directly inside your browser cache. Zero files are stored long-term without explicit permission.
              </p>
            </div>

            <div className={`p-8 rounded-2xl border transition-all hover:translate-y-[-4px] ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Deep Explanations</h3>
              <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                Never wonder why a value was flagged. Get detailed Gemini intelligence outlining what looks abnormal and how it should ideally be formatted.
              </p>
            </div>

            <div className={`p-8 rounded-2xl border transition-all hover:translate-y-[-4px] ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
              <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl w-fit mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Advanced Clean-Up Centers</h3>
              <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                Apply bulk modifications like filling missing values using mean/medians, deduplication with custom row rules, and automatic uppercase standardizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Trusted by modern finance & engineering squads.</h2>
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              See how business professionals utilize our platform to maintain complete schema sanity and export ready-for-ingestion datasets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div 
                key={idx}
                className={`p-6 rounded-2xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
              >
                <div>
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className={`italic mb-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>"{t.quote}"</p>
                </div>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.author} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <h4 className="text-sm font-bold">{t.author}</h4>
                    <span className="text-xs text-slate-400">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-dashed border-slate-800 bg-slate-900/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Transparent, utility-driven pricing.</h2>
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              Choose the perfect tier for your data demands. All tiers support fully custom branding & compliance reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className={`p-8 rounded-2xl border flex flex-col justify-between transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
              <div>
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <p className="text-sm text-slate-400 mb-6">For single analysts & hobbyists.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="text-xs text-slate-400">/ forever</span>
                </div>
                <ul className="space-y-3.5 text-sm mb-8">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 5 file audits per month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Basic standard validation checks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> CSV exports only</li>
                  <li className="flex items-center gap-2 text-slate-500"><Minus className="w-4 h-4" /> No AI Insights & Explanations</li>
                </ul>
              </div>
              <button 
                onClick={onStartTrial}
                className={`w-full py-2.5 rounded-lg border text-sm font-medium transition-all ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                Get Started
              </button>
            </div>

            {/* Pro - Featured */}
            <div className={`p-8 rounded-2xl border flex flex-col justify-between relative scale-105 transition-all shadow-xl ${isDarkMode ? 'bg-slate-900 border-blue-500 shadow-blue-500/5' : 'bg-white border-blue-600'}`}>
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                Most Popular
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <p className="text-sm text-slate-400 mb-6">For growing businesses & active auditors.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold">$49</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <ul className="space-y-3.5 text-sm mb-8">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unlimited audits & rows</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> AI Insights & conversational assistant</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Standardized date & case cleaning</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Custom branding & PDF compliance</li>
                </ul>
              </div>
              <button 
                onClick={onStartTrial}
                className={`w-full py-2.5 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg ${accentClass}`}
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className={`p-8 rounded-2xl border flex flex-col justify-between transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
              <div>
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <p className="text-sm text-slate-400 mb-6">For high-throughput finance sectors.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold">$199</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <ul className="space-y-3.5 text-sm mb-8">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Everything in Pro</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multi-user team collaboration & roles</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Secure developer API and Webhooks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Dedicated SLA priority support</li>
                </ul>
              </div>
              <button 
                onClick={onStartTrial}
                className={`w-full py-2.5 rounded-lg border text-sm font-medium transition-all ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
              Find quick answers regarding our CSV standardizations, model usage, and enterprise configurations.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((faq, idx) => (
              <div 
                key={idx}
                className={`border rounded-xl transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/60' : 'bg-white border-slate-200 hover:bg-slate-50/50'}`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-6 py-4.5 flex justify-between items-center font-semibold text-base"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 transition-transform">
                    {activeFaq === idx ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className={`px-6 pb-5 pt-1 text-sm leading-relaxed border-t border-dashed ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-600 border-slate-100'}`}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section banner */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className={`relative z-10 p-12 rounded-3xl overflow-hidden border text-center ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-lg'}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3"></div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Start audit-proofing your sheets today.</h2>
            <p className={`text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Join hundreds of data analysts and accounting teams that trust CSV Auditor Pro to deliver error-free spreadsheets. Setup takes less than a minute.
            </p>
            <button 
              onClick={onStartTrial}
              className={`px-8 py-3.5 text-base font-semibold text-white rounded-xl shadow-lg hover:scale-[1.02] transition-all cursor-pointer ${accentClass}`}
              id="cta-bottom-btn"
            >
              Get Started with CSV Auditor Pro
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-12 text-sm transition-colors ${isDarkMode ? 'border-slate-900 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 text-blue-500 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-100 text-base dark:text-slate-100 text-slate-900">CSV Auditor Pro</span>
            </div>
            <p className="text-xs leading-relaxed">
              Transform messy spreadsheets into trusted insights. Built for enterprise compliance audits and daily analytical cleanups.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 dark:text-slate-100 text-slate-900">Product</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#features" className="hover:text-blue-500 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-blue-500 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">API Documentation</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Integrations</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 dark:text-slate-100 text-slate-900">Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-blue-500 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">GDPR & HIPAA Compliance</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Security Overview</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 dark:text-slate-100 text-slate-900">Join our newsletter</h4>
            <p className="text-xs mb-4">Stay informed about data auditing standards and modern spreadsheet hygiene.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="you@domain.com" 
                className={`px-3 py-2 text-xs rounded-lg border w-full ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'} focus:outline-none`}
              />
              <button className={`px-3 py-2 text-xs font-semibold text-white rounded-lg ${accentClass}`}>Subscribe</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-slate-900/10 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs">
          <span>&copy; {new Date().getFullYear()} CSV Auditor Pro. All rights reserved.</span>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">Twitter</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">GitHub</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
