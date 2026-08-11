import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  ArrowLeft, 
  FileSpreadsheet, 
  Sun, 
  Moon, 
  ChevronRight, 
  CheckCircle2, 
  HelpCircle, 
  Mail, 
  RefreshCw,
  Home,
  AlertCircle,
  XCircle,
  Clock,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { SITE_DOMAIN, SITE_URL, SUPPORT_EMAIL, LAST_UPDATED_DATE } from '../constants/siteConfig';

export default function RefundPolicyPage() {
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
    document.title = "Refund Policy | CSV Auditor Pro";

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'CSV Auditor Pro Refund Policy - 14-day money-back guarantee, Paddle billing terms, cancellation guidelines, and refund eligibility.'
    );

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}/refund-policy`);

    // Open Graph Metadata
    const ogTags = [
      { property: 'og:title', content: 'Refund Policy | CSV Auditor Pro' },
      { property: 'og:description', content: 'CSV Auditor Pro Refund Policy - Transparent 14-day refund guarantee and cancellation policies.' },
      { property: 'og:url', content: `${SITE_URL}/refund-policy` },
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
          <span className="font-semibold text-[#2563EB] dark:text-[#60A5FA]">Refund Policy</span>
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
            <CreditCard className="w-3.5 h-3.5" />
            <span>Billing Guarantee & Cancellation Terms</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Refund Policy
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
          }`}>
            Complete billing transparency. Review our 14-day money-back guarantee, refund eligibility criteria, and subscription cancellation terms below.
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

        {/* Highlight Guarantee Box */}
        <div className={`p-6 rounded-2xl border space-y-3 ${
          isDarkMode ? 'bg-[#1E293B]/80 border-[#334155]' : 'bg-[#EFF6FF] border-[#BFDBFE]'
        }`}>
          <div className="flex items-center gap-2 font-extrabold text-sm text-[#2563EB] dark:text-[#60A5FA]">
            <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
            <span>14-Day 100% Money-Back Guarantee</span>
          </div>
          <p className="text-xs leading-relaxed">
            If you are dissatisfied with CSV Auditor Pro Professional or Enterprise plans for any reason within the first 14 days of your initial purchase, contact our support team for a full 100% refund—no questions asked.
          </p>
        </div>

        {/* Section 1: Subscription Billing via Paddle */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <CreditCard className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>1. Subscription Billing Overview</h2>
          </div>
          <p>
            CSV Auditor Pro uses <strong>Paddle</strong> as our Merchant of Record for all online checkout processing and recurring subscription management. Paddle handles payments, invoice generation, VAT/sales tax compliance, and automated receipts. Paid subscriptions renew automatically on a monthly or annual cadence according to your selected billing plan.
          </p>
        </section>

        {/* Section 2: Refund Eligibility */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
            <h2>2. Refund Eligibility Criteria</h2>
          </div>
          <p>
            Refunds will be granted under the following eligible conditions:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>First 14 Days:</strong> Request submitted within 14 calendar days of your initial subscription payment.</li>
            <li><strong>Accidental Duplicate Payment:</strong> You were charged twice due to a payment gateway processing delay.</li>
            <li><strong>Billing System Error:</strong> You were billed an incorrect amount or charged after a confirmed cancellation.</li>
            <li><strong>Technical Access Prevention:</strong> Prolonged platform outage or technical issue preventing access to core services that support could not resolve within 48 hours.</li>
          </ul>
        </section>

        {/* Section 3: Non-refundable Situations */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <XCircle className="w-5 h-5 text-[#DC2626]" />
            <h2>3. Non-Refundable Situations</h2>
          </div>
          <p>
            Refunds are not granted in the following scenarios:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li>Requests submitted after the 14-day guarantee period has expired.</li>
            <li>Change of mind or lack of feature usage during the active paid period.</li>
            <li>Partial period usage or unused recurring billing months.</li>
            <li>Failure to cancel auto-renewal before the renewal charge date (access remains active for the paid term).</li>
            <li>Account suspension resulting from violations of our Acceptable Use Policy.</li>
          </ul>
        </section>

        {/* Section 4: Subscription Cancellation */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <Clock className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>4. Subscription Cancellation</h2>
          </div>
          <p>
            You can cancel your subscription at any time with zero hassle:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li>Navigate to <strong>Settings &gt; Plan & Billing</strong> in your CSV Auditor Pro dashboard and click "Cancel Subscription".</li>
            <li>Or click the management link contained in any email receipt sent by Paddle.</li>
          </ul>
          <p className="text-xs pt-1">
            After cancellation, your account retains full access to all paid features until the end of your current paid billing cycle. You will not be charged again.
          </p>
        </section>

        {/* Section 5: How to Request a Refund */}
        <section className={`p-6 rounded-2xl border text-sm leading-relaxed space-y-3 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1]' : 'bg-white border-[#E2E8F0] text-[#475569]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base text-[#0F172A] dark:text-[#F8FAFC]">
            <Mail className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2>5. How to Request a Refund</h2>
          </div>
          <p>
            To submit a refund request:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-xs">
            <li>Email our support desk at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">{SUPPORT_EMAIL}</a>.</li>
            <li>Use the subject line: <strong>Refund Request - [Your Order ID]</strong>.</li>
            <li>Provide your registered account email and a brief explanation of the request.</li>
          </ol>
          <p className="text-xs pt-2">
            Approved refunds are credited directly back to your original payment method via Paddle within <strong>3 to 5 business days</strong>.
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
            <Link to="/terms" className="hover:text-[#2563EB] transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link to="/refund-policy" className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">Refund Policy</Link>
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
