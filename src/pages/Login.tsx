import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../firebase/auth';
import { validateEmail } from '../lib/validators';
import { AuthLayout } from '../components/AuthLayout';
import { AuthSuccessOverlay } from '../components/AuthSuccessOverlay';
import { 
  Mail, 
  Lock, 
  LogIn, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  ChevronLeft
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, loginWithGoogle, user, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const [isSuccessState, setIsSuccessState] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ title: string; message: string; subtext: string; target: string } | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Redirect if already authenticated and verified
  useEffect(() => {
    if (user && !isSuccessState) {
      if (isEmailVerified) {
        navigate(from, { replace: true });
      } else {
        navigate('/verify-email', { replace: true });
      }
    }
  }, [user, isEmailVerified, navigate, from, isSuccessState]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setErrorMsg(emailCheck.message || 'Please enter a valid work email address.');
      triggerShake();
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      
      const verified = loggedInUser.emailVerified || loggedInUser.providerData?.some(p => p.providerId === 'google.com');

      setIsSuccessState(true);
      if (!verified) {
        const target = '/verify-email';
        setSuccessDetails({
          title: "SIGN IN VERIFIED",
          message: "Welcome Back",
          subtext: "Redirecting to email verification...",
          target
        });
        setTimeout(() => {
          navigate(target, { replace: true });
        }, 1500);
      } else {
        setSuccessDetails({
          title: "AUTHENTICATION VERIFIED",
          message: "Welcome Back",
          subtext: "Directing you to your enterprise workspace...",
          target: from
        });
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
      triggerShake();
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      setIsSuccessState(true);
      setSuccessDetails({
        title: "GOOGLE AUTH VERIFIED",
        message: "Signed In Successfully",
        subtext: "Preparing your workspace dashboard...",
        target: from
      });
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
      triggerShake();
      setIsGoogleLoading(false);
    }
  };

  const isEmailValid = email.length > 0 && validateEmail(email).isValid;

  return (
    <AuthLayout pageType="login">
      {isSuccessState ? (
        <AuthSuccessOverlay
          title={successDetails?.title}
          message={successDetails?.message}
          subtext={successDetails?.subtext}
        />
      ) : (
        <>
          {/* Back to Home Button */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Back to Home"
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-[#334155] border border-slate-200 dark:border-[#334155] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E293B]"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* Form Header */}
      <div className="space-y-1.5">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
        <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
          Sign in to continue managing, validating, and collaborating on your CSV data securely.
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

      {/* Main Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        
        {/* Email Field */}
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold mb-1.5 text-[var(--text-primary)]">
            Work Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="login-email"
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

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="text-xs font-bold text-[var(--text-primary)]">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline transition-all"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 h-11 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)] font-semibold select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#2563EB] focus:ring-[#2563EB]/20 cursor-pointer"
            />
            <span>Remember me on this device</span>
          </label>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full h-11 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#2563EB]/50 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 mt-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-[#334155]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-[#1E293B] px-3 text-slate-400 font-semibold tracking-wider">
            or continue with
          </span>
        </div>
      </div>

      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading || isGoogleLoading}
        className="w-full h-11 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
      >
        {isGoogleLoading ? (
          <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.3-.8-.5-1.7-.5-2.6z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>

      {/* Switch to Register */}
      <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
        Don't have an account?{' '}
        <Link 
          to="/register" 
          className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline inline-flex items-center gap-1 ml-0.5"
        >
          Create an account <ArrowRight className="w-3 h-3" />
        </Link>
      </p>
        </>
      )}
    </AuthLayout>
  );
};

export default Login;
