import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  LayoutDashboard, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ShieldCheck 
} from 'lucide-react';
import { clearAllRecoveryState } from '../lib/appStatePersistence';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] React rendering exception caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReturnToDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  private handleClearCacheAndRestart = () => {
    clearAllRecoveryState();
    try {
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/dashboard';
  };

  private handleCopyDetails = () => {
    const log = `[CSV Auditor Pro Error Diagnostic Log]\nTime: ${new Date().toISOString()}\nError: ${this.state.error?.toString()}\nStack:\n${this.state.errorInfo?.componentStack || this.state.error?.stack || 'N/A'}`;
    navigator.clipboard.writeText(log).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  public render() {
    if (this.state.hasError) {
      const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

      return (
        <div 
          className={`min-h-screen w-full flex items-center justify-center p-4 sm:p-6 select-none ${
            isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
          }`}
          role="alert"
          id="global-error-boundary-screen"
        >
          <div className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Header Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-500 shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-500 block">
                  Application Resilience Guard
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Session Recovery Activated
                </h1>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-xs leading-relaxed mb-6 ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-2 font-bold text-emerald-500 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Your Data & CSV Progress Are Safe</span>
              </div>
              An unexpected component rendering error occurred, but your workspace state, loaded CSVs, and audit parameters remain safely stored in local IndexedDB storage.
            </div>

            {/* Error Toggle for Developers/Auditors */}
            <div className="mb-6">
              <button
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className={`w-full py-2.5 px-3.5 rounded-xl border font-mono text-[11px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Diagnostic Error Information</span>
                {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {this.state.showDetails && (
                <div className={`mt-2 p-3.5 rounded-xl border text-[10px] font-mono overflow-x-auto max-h-48 leading-normal ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-rose-300' : 'bg-slate-900 border-slate-800 text-rose-300'
                }`}>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={this.handleCopyDetails}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-200 hover:text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {this.state.copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{this.state.copied ? 'Copied' : 'Copy Log'}</span>
                    </button>
                  </div>
                  <p className="font-bold mb-1">{this.state.error?.toString()}</p>
                  <pre className="whitespace-pre-wrap opacity-80">{this.state.errorInfo?.componentStack || this.state.error?.stack}</pre>
                </div>
              )}
            </div>

            {/* Recovery Action Buttons - Solid colors only */}
            <div className="space-y-3">
              <button
                onClick={this.handleReturnToDashboard}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-500"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Recover Workspace & Return to Dashboard</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={this.handleReload}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-emerald-500" />
                  <span>Reload Application</span>
                </button>

                <button
                  onClick={this.handleClearCacheAndRestart}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-rose-900/30 border-slate-700 text-slate-200 hover:text-rose-300' 
                      : 'bg-slate-100 hover:bg-rose-100 border-slate-300 text-slate-800 hover:text-rose-800'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Clear Cache & Restart</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center font-mono mt-6">
              CSV Auditor Pro • Session Protection Active
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
