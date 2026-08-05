import { useState } from 'react';
import { X, Play, Plus, Trash2, SlidersHorizontal, Check, ListChecks } from 'lucide-react';
import {
  WorkflowTemplate,
  getSavedWorkflows,
  saveWorkflowTemplate,
  deleteWorkflowTemplate
} from '../../lib/cleaning/workflowEngine';

interface WorkflowManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appliedSteps: string[];
  onRunWorkflow: (template: WorkflowTemplate) => void;
  isDarkMode: boolean;
}

export default function WorkflowManagerModal({
  isOpen,
  onClose,
  appliedSteps,
  onRunWorkflow,
  isDarkMode
}: WorkflowManagerModalProps) {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(getSavedWorkflows());
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleSaveCurrentAsWorkflow = () => {
    if (!newTemplateName.trim()) return;

    const steps = appliedSteps.map((stepLabel, idx) => ({
      id: `step-${idx}`,
      actionType: 'generic_step',
      title: stepLabel,
      params: {},
      timestamp: new Date().toISOString()
    }));

    const newWf: WorkflowTemplate = {
      id: `wf-${Date.now()}`,
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim() || 'Custom recorded cleaning workflow template.',
      steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 1
    };

    const updated = saveWorkflowTemplate(newWf);
    setWorkflows(updated);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    const updated = deleteWorkflowTemplate(id);
    setWorkflows(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-3xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  Cleaning Workflow Recorder & Templates
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                  {workflows.length} Templates
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} truncate mt-0.5`}>
                Save active cleaning pipelines as reusable recipes to execute on future uploads.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors shrink-0 ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className={`p-3.5 sm:p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'}`}>
          <span className="text-xs font-mono text-slate-400">
            Active session history contains <strong className="text-blue-500">{appliedSteps.length}</strong> applied action(s).
          </span>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Record Current Session
          </button>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {isCreating && (
            <div className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="text-xs font-bold text-blue-500">Save Active History as Reusable Template</h4>
              <input
                type="text"
                placeholder="Template Name (e.g. 'My Sales Cleaning Template')..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
                }`}
              />
              <input
                type="text"
                placeholder="Optional Description..."
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-xs outline-none ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
                }`}
              />

              {appliedSteps.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Steps to record ({appliedSteps.length}):</span>
                  <div className={`p-2.5 rounded-lg border max-h-28 overflow-y-auto space-y-1 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                    {appliedSteps.map((step, idx) => (
                      <div key={idx} className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 truncate">
                        <span className="text-blue-500 font-bold shrink-0">{idx + 1}.</span>
                        <span className="truncate">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCurrentAsWorkflow}
                  disabled={!newTemplateName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Save Template
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold truncate max-w-[280px]">{wf.name}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                      {wf.steps.length} Steps
                    </span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} break-words leading-relaxed`}>{wf.description}</p>
                  
                  {wf.steps && wf.steps.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <ListChecks className="w-3 h-3 text-blue-400 shrink-0" />
                      {wf.steps.slice(0, 3).map((s, idx) => (
                        <span key={s.id || idx} className={`text-[10px] font-mono px-2 py-0.5 rounded border truncate max-w-[150px] ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          {s.title}
                        </span>
                      ))}
                      {wf.steps.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-mono">+{wf.steps.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      onRunWorkflow(wf);
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" /> Execute Workflow
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                    title="Delete Workflow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
