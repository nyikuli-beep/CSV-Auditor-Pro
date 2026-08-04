import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  LayoutDashboard, 
  FolderOpen, 
  ArrowLeft, 
  X, 
  ArrowRight,
  ShieldCheck,
  SearchX
} from 'lucide-react';
import { CSVFile } from '../types';
import { loadFilesFromLocalStorageSync } from '../lib/fileStorage';

export default function BrandedNotFound({ isDarkMode = true }: { isDarkMode?: boolean }) {
  const navigate = useNavigate();
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [cachedFiles] = useState<CSVFile[]>(() => loadFilesFromLocalStorageSync());

  return (
    <div 
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 select-none ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      id="branded-404-page"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border shadow-2xl text-center relative ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* CSV Auditor Pro Logo Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="font-black text-base tracking-tight">CSV Auditor Pro</span>
        </div>

        {/* 404 Badge */}
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600/10 border-2 border-blue-500/30 text-blue-500 flex items-center justify-center mb-6">
          <SearchX className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
          404 - Page Not Found
        </h1>

        <p className={`text-xs sm:text-sm font-medium leading-relaxed mb-6 ${
          isDarkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          Looks like the route or CSV view you requested does not exist or was relocated.
        </p>

        <div className={`p-4 rounded-2xl border text-xs leading-relaxed mb-8 ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <span className="font-bold text-emerald-500 block mb-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Your Workspace Projects Are Intact
          </span>
          Don't worry. All your uploaded datasets, audit findings, and custom schemas remain safely saved in your local workspace session.
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-500"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

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

        <p className="text-[10px] text-slate-500 font-mono mt-6">
          CSV Auditor Pro • Branded SPA Router
        </p>
      </motion.div>

      {/* Modal to pick recent project */}
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
                  <h3 className="text-base font-extrabold">Saved CSV Projects</h3>
                </div>
                <button
                  onClick={() => setShowRecentModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {cachedFiles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono">
                    No cached CSV projects found.
                  </div>
                ) : (
                  cachedFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        navigate('/results');
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
