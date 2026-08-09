import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../firebase/auth';
import { validateEmail, validateFullName } from '../lib/validators';
import { evaluatePassword } from '../lib/passwordStrength';
import { AuthLayout } from '../components/AuthLayout';
import { AuthSuccessOverlay } from '../components/AuthSuccessOverlay';
import { 
  Mail, 
  Lock, 
  User, 
  Building2, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';

export const Register: React.FC = () => {
  const { register, loginWithGoogle, user, isEmailVerified } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const [isSuccessState, setIsSuccessState] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ title: string; message: string; subtext: string; target: string } | null>(null);

  // Auto redirect if already logged in
  useEffect(() => {
    if (user && !isSuccessState) {
      if (isEmailVerified) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/verify-email', { replace: true });
      }
    }
  }, [user, isEmailVerified, navigate, isSuccessState]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Password Strength evaluation
  const passwordEvaluation = evaluatePassword(password);
  const isEmailValid = email.length > 0 && validateEmail(email).isValid;
  const isNameValid = fullName.length > 0 && validateFullName(fullName).isValid;
  const doPasswordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const isFormValid = 
    isNameValid && 
    isEmailValid && 
    passwordEvaluation.isAllSatisfied && 
    doPasswordsMatch && 
    agreeTerms;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isNameValid) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      triggerShake();
      return;
    }

    if (!isEmailValid) {
      setErrorMsg('Please enter a valid work email address.');
      triggerShake();
      return;
    }

    if (!passwordEvaluation.isAllSatisfied) {
      setErrorMsg('Password must meet all security complexity requirements below.');
      triggerShake();
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      triggerShake();
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service and Privacy Policy to proceed.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      await register(email.trim(), password, fullName.trim());
      setIsSuccessState(true);
      const target = '/verify-email';
      setSuccessDetails({
        title: "ACCOUNT CREATED",
        message: "Registration Successful",
        subtext: "Redirecting to email verification...",
        target
      });
      setTimeout(() => {
        navigate(target, { replace: true });
      }, 1500);
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
      triggerShake();
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      setIsSuccessState(true);
      const target = '/dashboard';
      setSuccessDetails({
        title: "GOOGLE AUTH VERIFIED",
        message: "Enterprise Account Created",
        subtext: "Directing you to your enterprise workspace...",
        target
      });
      setTimeout(() => {
        navigate(target, { replace: true });
      }, 1500);
    } catch (err: any) {
      setErrorMsg(getFriendlyErrorMessage(err));
      triggerShake();
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout pageType="register">
      {isSuccessState ? (
        <AuthSuccessOverlay
          title={successDetails?.title}
          message={successDetails?.message}
          subtext={successDetails?.subtext}
        />
      ) : (
        <>
          {/* Form Header */}
      <div className="space-y-1.5">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Create your enterprise workspace</h2>
        <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
          Start validating, cleaning, and collaborating on CSV datasets with enterprise-grade tools.
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

      {/* Form */}
      <form onSubmit={handleRegister} className="space-y-4">
        
        {/* Full Name & Company Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Full Name */}
          <div>
            <label htmlFor="reg-name" className="block text-xs font-bold mb-1 text-[var(--text-primary)]">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                id="reg-name"
                type="text"
                required
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmed Ali"
                className="w-full pl-10 pr-3 py-2 h-10 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label htmlFor="reg-company" className="block text-xs font-bold mb-1 text-[var(--text-primary)]">
              Company <span className="text-slate-500 dark:text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                id="reg-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full pl-10 pr-3 py-2 h-10 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="reg-email" className="block text-xs font-bold mb-1 text-[var(--text-primary)]">
            Work Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-10 pr-10 py-2.5 h-11 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
            />
            {isEmailValid && (
              <Check className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
            )}
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="reg-password" className="block text-xs font-bold mb-1 text-[var(--text-primary)]">
            Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full pl-10 pr-10 py-2.5 h-11 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
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

          {/* Password Strength Meter & Checklist */}
          {password.length > 0 && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Password Strength:</span>
                <span className={
                  passwordEvaluation.level === 'Very Weak' || passwordEvaluation.level === 'Weak' 
                    ? 'text-rose-500' 
                    : passwordEvaluation.level === 'Fair' 
                    ? 'text-amber-500' 
                    : 'text-emerald-500'
                }>
                  {passwordEvaluation.level}
                </span>
              </div>

              {/* Strength Bar */}
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${passwordEvaluation.colorClass}`}
                  style={{ width: `${passwordEvaluation.score}%` }}
                />
              </div>

              {/* Requirements Checklist */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px]">
                <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.minChars ? 'text-emerald-600 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                  {passwordEvaluation.requirements.minChars ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>8+ characters</span>
                </div>

                <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                  {passwordEvaluation.requirements.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Uppercase letter</span>
                </div>

                <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.hasLowercase ? 'text-emerald-600 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                  {passwordEvaluation.requirements.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Lowercase letter</span>
                </div>

                <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                  {passwordEvaluation.requirements.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Number (0-9)</span>
                </div>

                <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.hasSpecialChar ? 'text-emerald-600 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                  {passwordEvaluation.requirements.hasSpecialChar ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>Special character</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="reg-confirm-password" className="block text-xs font-bold mb-1 text-[var(--text-primary)]">
            Confirm Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full pl-10 pr-10 py-2.5 h-11 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-[#334155] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && (
            <p className={`text-[11px] mt-1 font-medium flex items-center gap-1 ${doPasswordsMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
              {doPasswordsMatch ? (
                <>
                  <Check className="w-3 h-3" /> Passwords match
                </>
              ) : (
                <>
                  <X className="w-3 h-3" /> Passwords do not match
                </>
              )}
            </p>
          )}
        </div>

        {/* Accept Terms Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2 cursor-pointer text-xs text-[var(--text-primary)] font-semibold select-none">
            <input
              type="checkbox"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-[#334155] bg-white dark:bg-[#0F172A] text-[#2563EB] focus:ring-[#2563EB]/20 cursor-pointer"
            />
            <span>
              I agree to the <span className="text-[#2563EB] dark:text-[#60A5FA] font-semibold">Terms of Service</span> and <span className="text-[#2563EB] dark:text-[#60A5FA] font-semibold">Privacy Policy</span>.
            </span>
          </label>
        </div>

        {/* Create Account Button */}
        <button
          type="submit"
          disabled={!isFormValid || isLoading || isGoogleLoading}
          className="w-full h-11 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#2563EB]/40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 mt-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating Workspace...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
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

      {/* Google Sign Up Button */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
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

      {/* Switch to Login */}
      <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
        Already have an account?{' '}
        <Link 
          to="/login" 
          className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline inline-flex items-center gap-1 ml-0.5"
        >
          Sign in <ArrowRight className="w-3 h-3" />
        </Link>
      </p>
        </>
      )}
    </AuthLayout>
  );
};

export default Register;
