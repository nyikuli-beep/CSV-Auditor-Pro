import React from 'react';
import { Loader2, CheckCircle2, FileText, Layers, Sparkles } from 'lucide-react';

export interface ProcessingFileItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface BulkProcessingProgressBarProps {
  isDarkMode: boolean;
  isProcessing: boolean;
  progress: number; // 0 to 100
  currentStep: string;
  processedCount: number;
  totalCount: number;
  currentFileName?: string;
  filesList?: ProcessingFileItem[];
}

export default function BulkProcessingProgressBar({
  isDarkMode,
  isProcessing,
  progress,
  currentStep,
  processedCount,
  totalCount,
  currentFileName,
  filesList = []
}: BulkProcessingProgressBarProps) {
  if (!isProcessing) return null;

  const filesPercentage = totalCount > 0 ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : progress;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        className={`p-6 sm:p-8 rounded-3xl border shadow-2xl max-w-lg w-full space-y-6 transition-all ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header Header */}
        <div className="flex items-center justify-between border-b border-slate-800/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Bulk File Processing Engine</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">Executing automated cleaning & standardization rules</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl font-extrabold text-blue-500 block">{progress}%</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Overall</span>
          </div>
        </div>

        {/* Files Processed Stat & Primary Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Files Processed:
            </span>
            <span className="font-mono font-bold text-blue-400">
              {processedCount} of {totalCount} ({filesPercentage}%)
            </span>
          </div>

          {/* Visual Progress Bar Track */}
          <div className={`relative w-full h-3.5 rounded-full overflow-hidden p-0.5 border ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300 relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-white/20 animate-[pulse_1.5s_infinite]" />
            </div>
          </div>

          {/* Percentage ticks */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Current File Activity Card */}
        <div className={`p-4 rounded-2xl border space-y-1.5 ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider">Current Target File</span>
            <span className="text-blue-400 font-mono text-[11px] font-bold truncate max-w-[200px]">
              {currentFileName || 'Processing...'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-mono animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="truncate">{currentStep}</span>
          </div>
        </div>

        {/* File Queue List */}
        {filesList.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Batch Queue Breakdown ({filesList.length} files)
            </div>
            <div className={`max-h-36 overflow-y-auto rounded-xl border p-2 space-y-1.5 ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
            }`}>
              {filesList.map((item) => (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                    item.status === 'processing' 
                      ? isDarkMode ? 'bg-blue-950/40 text-blue-300 border border-blue-800/50' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      : item.status === 'completed'
                      ? isDarkMode ? 'text-slate-300' : 'text-slate-700'
                      : 'text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : item.status === 'processing' ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="truncate font-medium">{item.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                    item.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : item.status === 'processing'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-slate-800/40 text-slate-400 border border-slate-700/50'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
