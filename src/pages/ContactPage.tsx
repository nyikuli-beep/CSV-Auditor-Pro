import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
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
  Globe,
  Home,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { SITE_DOMAIN, SITE_URL, SUPPORT_EMAIL } from '../constants/siteConfig';

// Zod validation schema for contact form fields
const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Full Name must be at least 2 characters long."),
  email: z.string().trim().email("Please enter a valid email address."),
  subject: z.enum(["general", "enterprise", "billing", "refund", "bug"], {
    message: "Please select a valid inquiry subject."
  }),
  message: z.string().trim().min(10, "Message must be at least 10 characters long.").max(2000, "Message cannot exceed 2000 characters.")
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: "How do subscriptions work?",
    answer: "CSV Auditor Pro offers Monthly and Annual subscription plans (Free, Professional, and Enterprise). All payments and recurring billing are handled securely by Paddle as our Merchant of Record. You can upgrade, downgrade, or cancel your plan at any time in Account Settings."
  },
  {
    question: "How can I request a refund?",
    answer: "We offer a 100% 14-day money-back guarantee. To request a refund, simply email support@csvauditorpro.com with your account email and Paddle receipt order ID. Approved refunds are processed within 3-5 business days."
  },
  {
    question: "Where are CSV files processed?",
    answer: "CSV files are parsed and audited 100% locally inside your web browser memory. Your raw spreadsheet data rows are never uploaded or stored on our external servers."
  },
  {
    question: "How do I report a bug or request a feature?",
    answer: "You can send bug reports or feature requests using the contact form on this page or by emailing support@csvauditorpro.com directly. Please include details about your browser and a sample CSV column structure if applicable."
  },
  {
    question: "How do I upgrade my plan?",
    answer: "Navigate to your dashboard, click on 'Settings' or 'Upgrade Plan' in the navigation bar, select your preferred plan (Professional or Enterprise), and complete checkout securely via Paddle."
  }
];

export default function ContactPage() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || true;
  });

  const [formData, setFormData] = useState<ContactFormData>({ name: '', email: '', subject: 'general', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Get in touch with CSV Auditor Pro support. Submit inquiries, review FAQs, or contact our engineering team.'
    );

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${SITE_URL}/contact`);

    // Open Graph Metadata
    const ogTags = [
      { property: 'og:title', content: 'Contact Support | CSV Auditor Pro' },
      { property: 'og:description', content: 'Contact CSV Auditor Pro support, review FAQs, business hours, and technical help.' },
      { property: 'og:url', content: `${SITE_URL}/contact` },
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

  // Real-time single field validation using Zod
  const validateField = (field: keyof ContactFormData, value: string) => {
    const updatedForm = { ...formData, [field]: value };
    const result = contactFormSchema.safeParse(updatedForm);

    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof ContactFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all fields as touched for full validation feedback
    setTouched({ name: true, email: true, subject: true, message: true });

    const result = contactFormSchema.safeParse(formData);
    if (result.success) {
      setErrors({});
      setSubmitted(true);
    } else {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(newErrors);
    }
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
          <span className="font-semibold text-[#2563EB] dark:text-[#60A5FA]">Contact Support</span>
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
            <Mail className="w-3.5 h-3.5" />
            <span>Dedicated Support & Inquiry Hub</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Contact Support
          </h1>

          <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
          }`}>
            Have questions about CSV Auditor Pro, custom enterprise schemas, or subscription billing? Our engineering team is ready to assist you.
          </p>
        </div>
      </section>

      {/* Content Container (~900px centered reading canvas) */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Top Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-5 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
            <Mail className="w-5 h-5 text-[#2563EB]" />
            <div className="font-bold text-sm">Support Email</div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline block truncate">
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
            <Globe className="w-5 h-5 text-[#16A34A]" />
            <div className="font-bold text-sm">Website</div>
            <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline block truncate">
              {SITE_URL}
            </a>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'}`}>
            <Clock className="w-5 h-5 text-[#F59E0B]" />
            <div className="font-bold text-sm">Business Hours</div>
            <div className="text-[#94A3B8]">Monday–Friday 09:00–17:00 UTC</div>
          </div>
        </div>

        {/* Contact Form Section */}
        <div className={`p-8 rounded-3xl border space-y-6 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-md'
        }`}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2 className="text-xl font-bold">Send Us a Message</h2>
          </div>

          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#16A34A]/20 text-[#16A34A] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Inquiry Sent Successfully!</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                Thank you for reaching out. A support engineer will review your message and respond to <strong>{formData.email}</strong> within 24 business hours.
              </p>
              <button
                type="button"
                onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: 'general', message: '' }); setErrors({}); }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-all cursor-pointer shadow-md"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold">Full Name *</label>
                    {touched.name && !errors.name && formData.name.trim().length >= 2 && (
                      <span className="text-[10px] text-[#16A34A] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder="Jane Doe"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                      errors.name 
                        ? 'border-[#DC2626] bg-[#DC2626]/5' 
                        : touched.name && !errors.name && formData.name.trim().length >= 2
                        ? 'border-[#16A34A] focus:border-[#16A34A] ' + (isDarkMode ? 'bg-[#0F172A] text-white' : 'bg-white text-[#0F172A]')
                        : isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white focus:border-[#2563EB]' : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB]'
                    }`}
                  />
                  {errors.name && (
                    <div className="flex items-center gap-1 text-[11px] text-[#DC2626] mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold">Email Address *</label>
                    {touched.email && !errors.email && formData.email.trim().length > 0 && (
                      <span className="text-[10px] text-[#16A34A] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="jane@company.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                      errors.email 
                        ? 'border-[#DC2626] bg-[#DC2626]/5' 
                        : touched.email && !errors.email && formData.email.trim().length > 0
                        ? 'border-[#16A34A] focus:border-[#16A34A] ' + (isDarkMode ? 'bg-[#0F172A] text-white' : 'bg-white text-[#0F172A]')
                        : isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white focus:border-[#2563EB]' : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB]'
                    }`}
                  />
                  {errors.email && (
                    <div className="flex items-center gap-1 text-[11px] text-[#DC2626] mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">Inquiry Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value as any)}
                  onBlur={() => handleBlur('subject')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                    isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white focus:border-[#2563EB]' : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB]'
                  }`}
                >
                  <option value="general">General Support Inquiry</option>
                  <option value="enterprise">Enterprise Custom Schema & Licensing</option>
                  <option value="billing">Paddle Billing & Invoicing</option>
                  <option value="refund">Refund Request</option>
                  <option value="bug">Report a Bug / Issue</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold">Message *</label>
                  <span className={`text-[10px] ${
                    formData.message.length > 2000 ? 'text-[#DC2626]' : 'text-slate-400'
                  }`}>
                    {formData.message.length}/2000 characters
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  onBlur={() => handleBlur('message')}
                  placeholder="How can our technical support team assist you today? (Minimum 10 characters)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                    errors.message 
                      ? 'border-[#DC2626] bg-[#DC2626]/5' 
                      : touched.message && !errors.message && formData.message.trim().length >= 10
                      ? 'border-[#16A34A] focus:border-[#16A34A] ' + (isDarkMode ? 'bg-[#0F172A] text-white' : 'bg-white text-[#0F172A]')
                      : isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white focus:border-[#2563EB]' : 'bg-white border-[#E2E8F0] text-[#0F172A] focus:border-[#2563EB]'
                  }`}
                />
                {errors.message && (
                  <div className="flex items-center gap-1 text-[11px] text-[#DC2626] mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.message}</span>
                  </div>
                )}
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
        </div>

        {/* FAQ Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
            <h2 className="text-xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs font-bold cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#2563EB]" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className={`px-4 pb-4 text-xs leading-relaxed border-t pt-3 ${
                      isDarkMode ? 'border-[#334155] text-[#CBD5E1]' : 'border-[#E2E8F0] text-[#475569]'
                    }`}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
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
