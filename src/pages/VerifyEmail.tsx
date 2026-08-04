import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, RefreshCw, LogOut, AlertCircle, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../utils/firebaseErrors';

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
      navigate('/dashboard');
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
        setTimeout(() => navigate('/dashboard'), 1000);
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
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 transition-colors">
      {/* Container */}
      <div className="w-full max-w-md space-y-6">
        
        {/* Header Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> CSV Auditor Pro Security
          </div>
          <div className="flex items-center justify-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Verify Your Email</h1>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl space-y-6">
          
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
              <Mail className="w-10 h-10 animate-bounce" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              We've sent a verification email to{' '}
              <span className="font-bold text-slate-900 dark:text-white underline decoration-blue-500">{user?.email || 'your email address'}</span>.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Please open your inbox and click the verification link before signing in to access CSV Auditor Pro.
            </p>
          </div>

          {/* Inline Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400'
                  : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Check Verification Status */}
            <button
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Resend Email Button */}
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || isSending || resendCount >= 3}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" /> Sending Email...
                </>
              ) : cooldown > 0 ? (
                `Resend Verification Email (${cooldown}s)`
              ) : (
                'Resend Verification Email'
              )}
            </button>
          </div>

          {/* Spam Warning Callout */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 text-center leading-normal">
            💡 Didn't receive the email? Check your <span className="text-slate-900 dark:text-slate-200 font-semibold">Spam/Junk</span> folder or ensure your email address was entered correctly.
          </div>

          {/* Footer Back/Logout */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VerifyEmail;
