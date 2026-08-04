import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../firebase/auth';
import { validateEmail } from '../lib/validators';
import { 
  FileSpreadsheet, 
  Mail, 
  Lock, 
  LogIn, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Eye,
  EyeOff
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

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Redirect if already authenticated and verified
  React.useEffect(() => {
    if (user) {
      if (isEmailVerified) {
        navigate(from, { replace: true });
      } else {
        navigate('/verify-email', { replace: true });
      }
    }
  }, [user, isEmailVerified, navigate, from]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setErrorMsg(emailCheck.message || 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      
      // Check if email is verified
      const verified = loggedInUser.emailVerified || loggedInUser.providerData?.some(p => p.providerId === 'google.com');

      if (!verified) {
        setSuccessMsg('Signed in successfully. Redirecting to email verification...');
        setTimeout(() => {
          navigate('/verify-email', { replace: true });
        }, 800);
      } else {
        setSuccessMsg('Authentication successful! Directing to workspace...');
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      setSuccessMsg('Google authentication verified! Accessing workspace...');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-[#F8FAFC] flex flex-col justify-center items-center px-4 py-10 transition-colors">
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Enterprise Security Active
          </div>
          <div className="flex items-center justify-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">CSV Auditor Pro</h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Sign in to your account to manage data hygiene</p>
        </div>

        {/* Card Box */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl space-y-5">
          
          {/* Status Banners */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
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

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-[#334155] bg-white dark:bg-[#0F172A] text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
                Remember me on this device
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
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
              <span className="bg-white dark:bg-[#1E293B] px-3 text-slate-500 dark:text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>Sign in with Google</span>
          </button>

        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-600 dark:text-slate-400 mt-6">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold inline-flex items-center gap-1">
            Create an account <ArrowRight className="w-3 h-3" />
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Login;
