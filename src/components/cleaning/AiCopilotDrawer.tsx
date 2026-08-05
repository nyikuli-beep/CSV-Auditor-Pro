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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div
        className={`w-full max-w-lg max-h-[540px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                AI Cleaning Copilot
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Medium Assistant
                </span>
              </h2>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Type natural language prompts to automatically generate & preview cleaning pipelines.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOP CHAT BOX INPUT (Reach immediately without scrolling) */}
        <div className={`p-3.5 border-b shrink-0 ${isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="relative flex items-center">
            <input
              type="text"
              autoFocus
              placeholder="Ask Copilot (e.g. 'Standardize dates and mask emails')..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGeneratePlan()}
              className={`w-full pl-3.5 pr-12 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500 shadow-inner' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 shadow-sm'
              }`}
            />
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating || !prompt.trim()}
              className="absolute right-1.5 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 cursor-pointer transition-all"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Compact Suggested Commands (Horizontal Scrollable Pills) */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" /> Prompts:
            </span>
            {[
              'Remove duplicate rows',
              'Fix Kenyan phone numbers',
              'Convert dates to YYYY-MM-DD',
              'Mask emails for PII',
              'Clean control characters'
            ].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setPrompt(cmd)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border whitespace-nowrap cursor-pointer transition-all ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-500'
                }`}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body / Medium Preview Panel */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {/* Generated Pipeline Preview */}
          {currentPlan ? (
            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-2 border-slate-800/60">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Generated Cleaning Pipeline
                </span>
                <span className="text-[10px] font-mono text-slate-500">{currentPlan.estimatedTimeMs}ms est.</span>
              </div>

              <p className="text-xs font-semibold text-slate-300">{currentPlan.understoodIntent}</p>

              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {currentPlan.plannedSteps.map((step, idx) => (
                  <div key={step.id} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-0.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        {step.title}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">{step.confidence}% conf.</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-5 leading-tight">{step.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`p-6 text-center rounded-2xl border border-dashed ${isDarkMode ? 'border-slate-800 bg-slate-950/20 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
              <Bot className="w-7 h-7 mx-auto mb-2 opacity-40 text-blue-400" />
              <p className="text-xs font-medium">Type a prompt in the top chat box above or select a prompt pill to generate a cleaning pipeline.</p>
            </div>
          )}
        </div>

        {/* Sticky Confirm & Execute Footer */}
        {currentPlan && (
          <div className={`p-3 border-t shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-100 bg-slate-50'}`}>
            <button
              onClick={handleExecute}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Play className="w-3.5 h-3.5" /> Confirm & Execute Pipeline ({currentPlan.plannedSteps.length} Steps)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
