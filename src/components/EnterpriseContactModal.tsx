import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, X, Send, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface EnterpriseContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export default function EnterpriseContactModal({
  isOpen,
  onClose,
  isDarkMode = true
}: EnterpriseContactModalProps) {
  const [company, setCompany] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [employees, setEmployees] = useState('50-200');
  const [csvVolume, setCsvVolume] = useState('100k - 1M rows/month');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !fullName || !email) {
      setErrorMsg('Please fill in Company, Full Name, and Work Email.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/enterprise/contact-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          fullName,
          email,
          employees,
          csvVolume,
          message
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Thank you! Our Enterprise sales team will contact you shortly.');
      } else {
        setErrorMsg(data.error || 'Failed to submit request.');
      }
    } catch (err: any) {
      setErrorMsg('Failed to connect to sales server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className={`relative w-full max-w-lg p-6 md:p-8 rounded-3xl border shadow-2xl overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Top accent border */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 mb-3">
            <Building2 className="w-3.5 h-3.5" />
            <span>Enterprise Plan ($199/mo)</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight mb-2">
            Contact Sales & Book Demo
          </h2>
          <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Get a tailored enterprise audit pipeline, custom team role provisioning, and dedicated Paddle invoicing.
          </p>

          {successMsg ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-emerald-400 text-base">Request Received!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{successMsg}</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Financial Corp"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Number of Employees</label>
                  <select
                    value={employees}
                    onChange={(e) => setEmployees(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="50-200">50-200 employees</option>
                    <option value="200-1000">200-1,000 employees</option>
                    <option value="1000+">1,000+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Expected CSV Volume</label>
                  <select
                    value={csvVolume}
                    onChange={(e) => setCsvVolume(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="< 50k rows/mo">&lt; 50,000 rows/month</option>
                    <option value="50k - 500k rows/mo">50k - 500k rows/month</option>
                    <option value="500k - 5M rows/mo">500k - 5M rows/month</option>
                    <option value="5M+ rows/mo">5M+ rows/month</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Message / Requirements</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your team size, custom API requirements, or compliance SLAs..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending Request...' : 'Submit Enterprise Inquiry'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
