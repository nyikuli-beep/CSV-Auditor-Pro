import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../firebase/auth';
import { validateEmail } from '../lib/validators';
import { AuthLayout } from '../components/AuthLayout';
import { 
  Mail, 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowLeft,
  Check
} from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setErrorMsg('Please enter a valid account email address.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword(email.trim());
      setSuccessMsg(`Password reset instructions sent to ${email.trim()}. Please check your inbox and spam folder.`);
      setEmail('');
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailValid = email.length > 0 && validateEmail(email).isValid;

  return (
    <AuthLayout pageType="forgot-password">
      {/* Form Header */}
      <div className="space-y-1.5">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Reset your password</h2>
        <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
          Enter your verified work email address and we will dispatch a secure password reset link.
        </p>
      </div>

      {/* Status Alerts */}
      {errorMsg && (
        <div className={`p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 ${
          isShaking ? 'animate-shake' : ''
        }`}>
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-normal">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-normal">{successMsg}</span>
        </div>
      )}

      {/* Reset Form */}
      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-xs font-bold mb-1.5 text-[var(--text-primary)]">
            Registered Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="reset-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-10 pr-10 py-2.5 h-11 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
            />
            {isEmailValid && (
              <Check className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isEmailValid}
          className="w-full h-11 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#2563EB]/40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 mt-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending Instructions...</span>
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Send Reset Link</span>
            </>
          )}
        </button>
      </form>

      {/* Back Link */}
      <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
        Remember your password?{' '}
        <Link 
          to="/login" 
          className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline inline-flex items-center gap-1 ml-0.5"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Sign In
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPassword;
