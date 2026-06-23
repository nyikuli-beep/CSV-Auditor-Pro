import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  Globe, 
  Sparkles, 
  UserPlus, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: { name: string; email: string; role: 'Owner' | 'Admin' | 'Editor' | 'Viewer' }) => void;
  onBackToLanding: () => void;
  isDarkMode: boolean;
  accentClass: string;
}

type AuthScreen = 'signin' | 'signup' | 'forgot' | 'verification' | 'reset';

export default function AuthView({ onLoginSuccess, onBackToLanding, isDarkMode, accentClass }: AuthViewProps) {
  const [screen, setScreen] = useState<AuthScreen>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Owner' | 'Admin' | 'Editor' | 'Viewer'>('Admin');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    // Simulate Login Success
    onLoginSuccess({
      name: name || email.split('@')[0] || 'Sarah Jenkins',
      email: email,
      role: role
    });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setErrorMsg('Please fill in all details.');
      return;
    }
    setScreen('verification');
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess({
      name: name || 'Demo Auditor',
      email: email || 'demo@auditor.com',
      role: role
    });
  };

  const selectQuickRole = (selectedRole: 'Owner' | 'Admin' | 'Editor' | 'Viewer', demoEmail: string, demoName: string) => {
    setEmail(demoEmail);
    setName(demoName);
    setPassword('demopassword123');
    setRole(selectedRole);
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Left panel: Info & Testimonial */}
      <div className={`hidden lg:flex lg:w-5/12 flex-col justify-between p-12 border-r relative overflow-hidden ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-blue-600/5 border-slate-200'}`}>
        <button 
          onClick={onBackToLanding}
          className={`flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Landing Page
        </button>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-600/10 text-blue-600'}`}>
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <span className="text-xl font-bold tracking-tight">CSV Auditor Pro</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight leading-snug">
            Real-time audit telemetry & database sanitization.
          </h2>

          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
            <p className={`text-sm italic mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              "We connected our financial ingestion pipelines directly to CSV Auditor Pro. Over 99% of formatting errors are caught and corrected before touching our warehouse."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 font-bold text-xs flex items-center justify-center text-white">MV</div>
              <div>
                <h4 className="text-xs font-bold">Marcus Vance</h4>
                <p className="text-[10px] text-slate-400">Database Director, Initech</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" /> Trusted by users globally. ISO 27001 Compliant.
        </div>
      </div>

      {/* Right panel: Forms */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 md:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-between items-center lg:hidden">
            <button 
              onClick={onBackToLanding}
              className={`flex items-center gap-1.5 text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              <span className="font-bold text-sm">CSV Auditor Pro</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
              {screen === 'signin' && 'Welcome Back'}
              {screen === 'signup' && 'Create your workspace'}
              {screen === 'forgot' && 'Reset Password'}
              {screen === 'verification' && 'Verify your email'}
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {screen === 'signin' && "Auditing, cleaning, and validating at light speed."}
              {screen === 'signup' && 'Get started with a 14-day premium free trial.'}
              {screen === 'forgot' && 'We will send you a secure password recovery link.'}
              {screen === 'verification' && 'Enter the 6-digit confirmation code we sent.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {screen === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
                    placeholder="name@company.com" 
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100 focus:border-blue-500 focus:ring-blue-500' : 'bg-white border-slate-200 text-slate-950 focus:border-blue-600 focus:ring-blue-600'}`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
                  <button 
                    type="button"
                    onClick={() => setScreen('forgot')}
                    className="text-xs font-semibold text-blue-500 hover:opacity-80 transition-all"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                    placeholder="••••••••" 
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100 focus:border-blue-500 focus:ring-blue-500' : 'bg-white border-slate-200 text-slate-950 focus:border-blue-600 focus:ring-blue-600'}`}
                  />
                </div>
              </div>

              {/* DEMO PERSONA/ROLE INJECTOR */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/30 border-slate-800/80' : 'bg-blue-50/20 border-slate-200/50'}`}>
                <div className="text-xs font-semibold mb-3 flex items-center gap-1 text-slate-400 uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-blue-500" /> Demo Quick-Load Personas
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button 
                    type="button" 
                    onClick={() => selectQuickRole('Owner', 'sarah@company.com', 'Sarah Jenkins')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${email === 'sarah@company.com' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 font-bold' : 'bg-slate-900/10 dark:bg-slate-950 hover:opacity-80 border-slate-700/30'}`}
                  >
                    Sarah <span className="block opacity-60 text-[10px] font-normal">Owner (Full Access)</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => selectQuickRole('Admin', 'marcus@company.com', 'Marcus Vance')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${email === 'marcus@company.com' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 font-bold' : 'bg-slate-900/10 dark:bg-slate-950 hover:opacity-80 border-slate-700/30'}`}
                  >
                    Marcus <span className="block opacity-60 text-[10px] font-normal">Admin (Settings & Logs)</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => selectQuickRole('Editor', 'leila.c@company.com', 'Leila Chen')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${email === 'leila.c@company.com' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 font-bold' : 'bg-slate-900/10 dark:bg-slate-950 hover:opacity-80 border-slate-700/30'}`}
                  >
                    Leila <span className="block opacity-60 text-[10px] font-normal">Editor (Can Clean/Audit)</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => selectQuickRole('Viewer', 'd.kim@company.com', 'David Kim')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${email === 'd.kim@company.com' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 font-bold' : 'bg-slate-900/10 dark:bg-slate-950 hover:opacity-80 border-slate-700/30'}`}
                  >
                    David <span className="block opacity-60 text-[10px] font-normal">Viewer (View-Only)</span>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className={`w-full py-3.5 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl ${accentClass}`}
                id="btn-submit-signin"
              >
                Sign In with Workspace <ArrowRight className="w-4 h-4" />
              </button>

              {/* Social Login Integrations */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}></div></div>
                <span className={`relative px-4 text-xs font-semibold uppercase tracking-widest ${isDarkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>Or continue with</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <button 
                  type="button"
                  onClick={() => selectQuickRole('Admin', 'google.demo@company.com', 'Google Dev User')}
                  className={`py-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-102 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-100' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.63 14.98 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99C6.18 7.37 8.87 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z" />
                    <path fill="#FBBC05" d="M5.24 14.81c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31L1.39 7.19C.5 8.93 0 10.88 0 12.91s.5 3.98 1.39 5.72l3.85-2.82z" />
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.51 1.18-4.23 1.18-3.13 0-5.82-2.33-6.76-5.51l-3.85 2.82C3.39 19.33 7.35 23 12 23z" />
                  </svg>
                  Google
                </button>
                <button 
                  type="button"
                  onClick={() => selectQuickRole('Admin', 'ms.demo@company.com', 'MS Analyst')}
                  className={`py-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-102 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-100' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 23 23">
                    <path fill="#F35325" d="M0 0h11v11H0z" />
                    <path fill="#80BB0A" d="M12 0h11v11H12z" />
                    <path fill="#00A4EF" d="M0 12h11v11H0z" />
                    <path fill="#FFB900" d="M12 12h11v11H12z" />
                  </svg>
                  Microsoft
                </button>
              </div>

              <p className={`text-center text-xs mt-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Don't have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setScreen('signup')} 
                  className="font-bold text-blue-500 hover:opacity-80"
                >
                  Sign up
                </button>
              </p>
            </form>
          )}

          {screen === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Jenkins" 
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950 focus:border-blue-600'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com" 
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950 focus:border-blue-600'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create strong password" 
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950 focus:border-blue-600'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Default Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-950'}`}
                >
                  <option value="Owner">Owner (Full Admin Access)</option>
                  <option value="Admin">Admin (Oversight & settings)</option>
                  <option value="Editor">Editor (Interactive editing/cleaning)</option>
                  <option value="Viewer">Viewer (View-only analysis)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className={`w-full py-3.5 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg ${accentClass}`}
              >
                Create Free Account <UserPlus className="w-4 h-4" />
              </button>

              <p className={`text-center text-xs mt-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setScreen('signin')} 
                  className="font-bold text-blue-500 hover:opacity-80"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {screen === 'forgot' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-slate-400">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com" 
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-950'}`}
                />
              </div>
              <button 
                onClick={() => {
                  if (!email) {
                    setErrorMsg('Please specify an email address.');
                    return;
                  }
                  setSuccessMsg('Reset instruction email dispatched!');
                  setErrorMsg('');
                  setTimeout(() => {
                    setScreen('signin');
                    setSuccessMsg('');
                  }, 2000);
                }}
                className={`w-full py-3.5 text-white font-medium rounded-xl ${accentClass}`}
              >
                Send Recovery Link
              </button>
              {successMsg && <p className="text-xs text-emerald-500 font-bold text-center mt-2">{successMsg}</p>}
              <button 
                onClick={() => setScreen('signin')}
                className={`w-full py-2.5 text-xs font-semibold text-center hover:opacity-80 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
              >
                Return to Login
              </button>
            </div>
          )}

          {screen === 'verification' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex gap-2 justify-center">
                {[...Array(6)].map((_, i) => (
                  <input 
                    key={i}
                    type="text" 
                    maxLength={1}
                    placeholder="•"
                    defaultValue={i === 0 ? '7' : i === 1 ? '9' : i === 2 ? '4' : '2'}
                    className={`w-12 h-14 rounded-xl border text-xl font-bold text-center focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-950'}`}
                  />
                ))}
              </div>
              <p className={`text-xs text-center leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Didn't receive the verification email?{' '}
                <button type="button" className="text-blue-500 font-bold hover:underline">Resend code</button>
              </p>
              <button 
                type="submit" 
                className={`w-full py-3.5 text-white font-semibold rounded-xl ${accentClass}`}
              >
                Verify Code & Enter Workspace
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
