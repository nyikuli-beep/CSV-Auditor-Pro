import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../firebase/auth';
import { 
  FileSpreadsheet, 
  Mail, 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft 
} from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your account email address.');
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword(email.trim());
      setSuccessMsg(`Password reset email dispatched to ${email.trim()}. Please check your inbox and spam folder for instructions.`);
      setEmail('');
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors">
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Password Recovery Service
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Reset Password</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Enter your email to receive password reset instructions</p>
        </div>

        {/* Card Box */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending Reset Email...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <p className="text-center text-xs text-slate-600 dark:text-slate-400 mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
