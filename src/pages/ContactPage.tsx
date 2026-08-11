import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, 
  ArrowLeft, 
  FileSpreadsheet, 
  Sun, 
  Moon, 
  ChevronRight, 
  Send, 
  CheckCircle2, 
  HelpCircle,
  MessageSquare,
  Globe
} from 'lucide-react';
import { SITE_DOMAIN, SITE_URL, SUPPORT_EMAIL } from './PrivacyPolicyPage';

export default function ContactPage() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || true;
  });

  const [formData, setFormData] = useState({ name: '', email: '', subject: 'general', message: '' });
  const [submitted, setSubmitted] = useState(false);

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
    document.title = "Contact Support | CSV Auditor Pro";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            <Mail className="w-3.5 h-3.5" />
            <span>Dedicated Support & Inquiry Hub</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Contact Support
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
          }`}>
            Have questions about CSV Auditor Pro, enterprise custom schemas, or subscription billing? Our technical team is ready to help.
          </p>
        </div>
      </section>

      {/* Form Content */}
      <main className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className={`p-8 rounded-3xl border space-y-6 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-md'
        }`}>
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#16A34A]/20 text-[#16A34A] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Inquiry Sent Successfully!</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                Thank you for reaching out. A support engineer will review your message and respond within 24 hours to your email.
              </p>
              <button
                type="button"
                onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: 'general', message: '' }); }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-all"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Doe"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                      isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white focus:border-[#2563EB]' : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">Work Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@company.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                      isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white focus:border-[#2563EB]' : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">Inquiry Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                    isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white focus:border-[#2563EB]' : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB]'
                  }`}
                >
                  <option value="general">General Support Inquiry</option>
                  <option value="enterprise">Enterprise Custom Schema & Security</option>
                  <option value="billing">Paddle Billing & Invoicing</option>
                  <option value="privacy">Privacy & Data Governance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">Message / Details</label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we assist you with CSV Auditor Pro?"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                    isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white focus:border-[#2563EB]' : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB]'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between text-xs text-[#94A3B8] gap-2">
            <div>Direct Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">{SUPPORT_EMAIL}</a></div>
            <div>Response Time: Within 24 Business Hours</div>
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
            <Link to="/about" className="hover:text-[#2563EB] transition-colors">About</Link>
            <span>•</span>
            <Link to="/contact" className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline">Contact</Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} CSV Auditor Pro. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
