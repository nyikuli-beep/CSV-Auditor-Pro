import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  WifiOff, 
  RefreshCw, 
  LayoutDashboard, 
  FolderOpen, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight, 
  X,
  Database,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { CSVFile } from '../types';

interface NetworkOfflineOverlayProps {
  isOffline: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  onRetry: () => void;
  onReturnToDashboard: () => void;
  cachedFiles: CSVFile[];
  onSelectRecentProject: (fileId: string) => void;
  isDarkMode: boolean;
}

export default function NetworkOfflineOverlay({
  isOffline,
  isReconnecting,
  reconnectAttempts,
  onRetry,
  onReturnToDashboard,
  cachedFiles,
  onSelectRecentProject,
  isDarkMode
}: NetworkOfflineOverlayProps) {
  const [showRecentModal, setShowRecentModal] = useState(false);

  if (!isOffline) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto ${
        isDarkMode 
          ? 'bg-slate-950 text-slate-100' 
          : 'bg-slate-50 text-slate-900'
      }`}
      id="network-offline-recovery-screen"
      role="alertdialog"
      aria-labelledby="offline-heading"
      aria-describedby="offline-description"
    >
      {/* Reconnecting Status Banner Indicator at top */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-amber-500 text-slate-950 text-center text-xs font-mono font-bold flex items-center justify-center gap-2 border-b border-amber-600 shadow-md">
        <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
        <span>
          {isReconnecting 
            ? `Reconnecting to CSV Auditor Pro servers (Attempt ${reconnectAttempts})...` 
            : 'Offline mode active • Local IndexedDB state preserved'}
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border shadow-2xl relative text-center mt-8 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Brand Icon Badge - Solid colors only, NO gradients */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 flex items-center justify-center mb-6 shadow-inner">
          <WifiOff className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* Required Headline Emoji & Text */}
        <h1 
          id="offline-heading"
          className="text-2xl sm:text-3xl font-black tracking-tight mb-2 flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-7 h-7 text-amber-500 shrink-0" />
          <span>Oops!</span>
        </h1>

        <h2 className={`text-lg sm:text-xl font-extrabold mb-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          Looks like your connection was interrupted.
        </h2>

        {/* Required Preserved Work Message */}
        <p 
          id="offline-description"
          className={`text-xs sm:text-sm font-medium leading-relaxed mb-6 p-4 rounded-2xl border ${
            isDarkMode 
              ? 'bg-slate-950/80 border-slate-800 text-slate-300' 
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <span className="font-bold text-emerald-500 block mb-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Local Work Safe & Preserved
          </span>
          Don't worry. Your work has been preserved and we'll reconnect automatically.
        </p>

        {/* Preserved Session Statistics Pill */}
        <div className="flex items-center justify-center gap-4 text-[11px] font-mono font-bold mb-8 text-slate-400">
          <span className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            {cachedFiles.length} Cached CSV Projects
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Auto-Sync Ready
          </span>
        </div>

        {/* Required Buttons: Retry, Return to Dashboard, Open Recent Project */}
        <div className="flex flex-col gap-3 w-full">
          {/* 1. Retry Button */}
          <button
            onClick={onRetry}
            disabled={isReconnecting}
            className={`w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-500 ${
              isReconnecting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>{isReconnecting ? 'Testing Connection...' : 'Retry'}</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {/* 2. Return to Dashboard Button */}
            <button
              onClick={onReturnToDashboard}
              className={`py-3 px-4 rounded-2xl font-bold text-xs border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-500" />
              <span>Return to Dashboard</span>
            </button>

            {/* 3. Open Recent Project Button */}
            <button
              onClick={() => setShowRecentModal(true)}
              className={`py-3 px-4 rounded-2xl font-bold text-xs border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-amber-500" />
              <span>Open Recent Project</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-500 font-mono mt-6">
          CSV Auditor Pro Offline Engine v2.5 • Network Resilience Active
        </p>
      </motion.div>

      {/* Modal to pick recent offline project */}
      <AnimatePresence>
        {showRecentModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <FolderOpen className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-extrabold">Locally Preserved CSV Projects</h3>
                </div>
                <button
                  onClick={() => setShowRecentModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Select a cached CSV file to continue auditing and cleaning offline without internet access:
              </p>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {cachedFiles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono">
                    No cached CSV projects found in local storage.
                  </div>
                ) : (
                  cachedFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        onSelectRecentProject(file.id);
                        setShowRecentModal(false);
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                        isDarkMode
                          ? 'bg-slate-950/70 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50'
                          : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-500 shrink-0 border border-blue-500/20">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold truncate group-hover:text-blue-500 transition-colors">
                            {file.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{file.rows ? file.rows.length : 0} rows</span>
                          </div>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                    </button>
                  ))
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowRecentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
