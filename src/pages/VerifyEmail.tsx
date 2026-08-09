import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle2, RefreshCw, AlertCircle, ArrowLeft, Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../utils/firebaseErrors';
import { AuthLayout } from '../components/AuthLayout';

export const VerifyEmail: React.FC = () => {
  const { user, isEmailVerified, resendVerification, checkVerification, logout } = useAuth();
  const navigate = useNavigate();

  const [cooldown, setCooldown] = useState<number>(0);
  const [resendCount, setResendCount] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Auto redirect if already verified
  useEffect(() => {
    if (isEmailVerified) {
      navigate('/dashboard', { replace: true });
    }
  }, [isEmailVerified, navigate]);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    if (resendCount >= 3) {
      setStatusMessage({
        type: 'error',
        text: 'Maximum resend attempts reached for this session. Please check your spam folder or try again later.'
      });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    try {
      await resendVerification();
      setResendCount((prev) => prev + 1);
      setCooldown(60);
      setStatusMessage({
        type: 'success',
        text: 'Verification email sent successfully. Please check your inbox and spam folder.'
      });
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err) || 'Unable to send verification email. Please try again later.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const verified = await checkVerification();
      if (verified) {
        setStatusMessage({
          type: 'success',
          text: 'Email verified! Redirecting to your workspace dashboard...'
        });
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Email is not verified yet. Please open the verification link sent to your email.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Could not refresh verification status. Please try again.'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout pageType="verify-email">
      {/* Icon Badge */}
      <div className="flex justify-center">
        <div className="p-3.5 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA]">
          <Mail className="w-8 h-8 animate-bounce" />
        </div>
      </div>

      {/* Form Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight">Verify Your Email</h2>
        <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
          We've dispatched a verification link to{' '}
          <span className="font-bold text-slate-900 dark:text-white underline decoration-[#2563EB]">
            {user?.email || 'your email address'}
          </span>.
        </p>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
          Please click the verification link in your email to enable full workspace privileges.
        </p>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : 'bg-[#2563EB]/10 border-[#2563EB]/30 text-[#2563EB] dark:text-[#60A5FA]'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="leading-normal">{statusMessage.text}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pt-1">
        <button
          onClick={handleCheckStatus}
          disabled={isChecking}
          className="w-full h-11 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
        >
          {isChecking ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Email Status...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> I've Verified My Email
            </>
          )}
        </button>

        <button
          onClick={handleResend}
          disabled={cooldown > 0 || isSending || resendCount >= 3}
          className="w-full h-10 py-2 rounded-xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" /> Sending Email...
            </>
          ) : cooldown > 0 ? (
            `Resend Verification Email (${cooldown}s)`
          ) : (
            'Resend Verification Email'
          )}
        </button>
      </div>

      {/* Spam Warning */}
      <div className="p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl text-[11px] text-slate-600 dark:text-[#94A3B8] leading-relaxed flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>Didn't receive the email? Check your <span className="font-semibold text-slate-900 dark:text-white">Spam / Junk</span> folder or confirm your email address.</span>
      </div>

      {/* Navigation Footer */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-[#334155] text-xs text-slate-500 dark:text-[#94A3B8]">
        <Link
          to="/login"
          className="flex items-center gap-1.5 hover:text-[#2563EB] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </Link>

        <button
          onClick={handleLogout}
          className="hover:text-rose-500 transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
