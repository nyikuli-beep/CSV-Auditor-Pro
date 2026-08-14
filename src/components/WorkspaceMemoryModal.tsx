/**
 * CSV Auditor Pro - Workspace Intelligence Memory Viewer & Manager
 * Phase 3: Persistent Workspace Context Management
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  FileSpreadsheet, 
  CheckCircle2, 
  Sparkles,
  X,
  Layers,
  AlertCircle
} from 'lucide-react';
import { 
  getWorkspaceMemory, 
  clearWorkspaceMemory, 
  WorkspaceMemoryState 
} from '../lib/workspaceMemoryEngine';

interface WorkspaceMemoryModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function WorkspaceMemoryModal({
  workspaceId,
  isOpen,
  onClose,
  isDarkMode
}: WorkspaceMemoryModalProps) {
  const [memory, setMemory] = useState<WorkspaceMemoryState | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const mem = getWorkspaceMemory(workspaceId);
      setMemory(mem);
      setConfirmClear(false);
    }
  }, [isOpen, workspaceId]);

  if (!isOpen || !memory) return null;

  const handleClear = () => {
    clearWorkspaceMemory(workspaceId);
    setMemory(getWorkspaceMemory(workspaceId));
    setConfirmClear(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className={`w-full max-w-2xl rounded-3xl border p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto ${
        isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#F8FAFC]' : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#0F172A]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 dark:border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Workspace Intelligence Memory</h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Persistent AI context and audit milestones for workspace <span className="font-mono text-[#2563EB]">"{workspaceId}"</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
            <span className="text-[10px] text-[#64748B] uppercase font-bold block">Previous Datasets</span>
            <span className="text-lg font-bold font-mono text-[#2563EB]">{memory.previousDatasets.length}</span>
          </div>
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
            <span className="text-[10px] text-[#64748B] uppercase font-bold block">Audit Milestones</span>
            <span className="text-lg font-bold font-mono text-[#059669]">{memory.auditHistory.length}</span>
          </div>
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
            <span className="text-[10px] text-[#64748B] uppercase font-bold block">Hygiene Actions</span>
            <span className="text-lg font-bold font-mono text-[#7C3AED]">{memory.cleaningHistory.length}</span>
          </div>
          <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
            <span className="text-[10px] text-[#64748B] uppercase font-bold block">Learned Insights</span>
            <span className="text-lg font-bold font-mono text-[#D97706]">{memory.conversationInsightsSummary.length}</span>
          </div>
        </div>

        {/* Datasets in Memory */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
            Indexed Datasets ({memory.currentDataset ? 1 + memory.previousDatasets.length : memory.previousDatasets.length})
          </span>
          {!memory.currentDataset && memory.previousDatasets.length === 0 ? (
            <p className="text-xs text-[#64748B] italic">No datasets memorized yet. Upload and audit files to build context.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {memory.currentDataset && (
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs border-[#2563EB] ${
                  isDarkMode ? 'bg-[#1E293B]' : 'bg-[#EFF6FF]'
                }`}>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
                    <span className="font-bold">{memory.currentDataset.fileName}</span>
                    <span className="text-[10px] font-bold text-[#2563EB] px-1.5 py-0.5 rounded bg-[#DBEAFE]">(Current)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#059669]">Score: {memory.currentDataset.qualityScore}%</span>
                    <span className="text-[9px] text-[#64748B]">{new Date(memory.currentDataset.auditedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
              {memory.previousDatasets.map((d, i) => (
                <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
                }`}>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#64748B]" />
                    <span className="font-bold">{d.fileName}</span>
                    <span className="text-[10px] text-[#64748B]">({d.rowCount.toLocaleString()} rows, {d.columnCount} cols)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#059669]">Score: {d.qualityScore}%</span>
                    <span className="text-[9px] text-[#64748B]">{new Date(d.auditedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Learned Conversational Insights */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
            Learned Audit Insights & Findings ({memory.conversationInsightsSummary.length})
          </span>
          {memory.conversationInsightsSummary.length === 0 ? (
            <p className="text-xs text-[#64748B] italic">No conversational insights recorded yet.</p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {memory.conversationInsightsSummary.map((insight, i) => (
                <div key={i} className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${
                  isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t dark:border-[#334155]">
          <div>
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D]/30 border border-transparent hover:border-[#FECACA] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Memory</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#DC2626] font-bold">Clear all memory?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#DC2626] text-white hover:bg-[#B91C1C] cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1 rounded-lg text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563EB] text-white hover:bg-[#1D4ED8] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
