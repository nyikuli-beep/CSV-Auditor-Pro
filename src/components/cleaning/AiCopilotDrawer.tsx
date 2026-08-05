import { useState } from 'react';
import { X, Sparkles, Send, Play, CheckCircle2, ArrowRight, Loader2, Bot } from 'lucide-react';
import { parseCopilotPrompt, CopilotPlan } from '../../lib/cleaning/copilotEngine';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  onExecutePlan: (plan: CopilotPlan) => void;
  isDarkMode: boolean;
}

export default function AiCopilotDrawer({
  isOpen,
  onClose,
  headers,
  onExecutePlan,
  isDarkMode
}: AiCopilotDrawerProps) {
  const [prompt, setPrompt] = useState('');
  const [currentPlan, setCurrentPlan] = useState<CopilotPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePlan = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 600));

    const plan = parseCopilotPrompt(prompt, headers);
    setCurrentPlan(plan);
    setIsGenerating(false);
  };

  const handleExecute = () => {
    if (currentPlan) {
      onExecutePlan(currentPlan);
      onClose();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-black/50 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div
        className={`w-full max-w-lg h-full border-l shadow-2xl flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                AI Cleaning Copilot
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Interactive Assistant
                </span>
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Type natural language prompts to automatically generate & preview cleaning pipelines.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Quick Prompts */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Suggested Commands
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                'Remove duplicate customers',
                'Fix all Kenyan phone numbers',
                'Convert every date to YYYY-MM-DD',
                'Mask all emails for PII',
                'Clean invisible control characters'
              ].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => setPrompt(cmd)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border text-left cursor-pointer transition-all ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-500'
                  }`}
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          </div>

          {/* Generated Pipeline Preview */}
          {currentPlan && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-2 border-slate-800">
                <span className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Generated Pipeline
                </span>
                <span className="text-[10px] font-mono text-slate-500">{currentPlan.estimatedTimeMs}ms est.</span>
              </div>

              <p className="text-xs font-semibold text-slate-300">{currentPlan.understoodIntent}</p>

              <div className="space-y-2">
                {currentPlan.plannedSteps.map((step, idx) => (
                  <div key={step.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        {step.title}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">{step.confidence}% conf.</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-7">{step.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input & Execution Bar */}
        <div className={`p-4 border-t space-y-3 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Ask Copilot (e.g. 'Standardize dates and mask emails')..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGeneratePlan()}
              className={`w-full pl-4 pr-12 py-3 rounded-xl border text-xs outline-none ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'
              }`}
            />
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating || !prompt.trim()}
              className="absolute right-2 p-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {currentPlan && (
            <button
              onClick={handleExecute}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Play className="w-4 h-4" /> Confirm & Execute Pipeline ({currentPlan.plannedSteps.length} Steps)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
