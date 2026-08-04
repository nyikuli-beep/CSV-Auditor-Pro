import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Bot, RefreshCw, Sparkles, Brain, CheckCircle2, MessageSquare, ShieldCheck, ShieldAlert, Lock } from 'lucide-react';

export const AISettings: React.FC<{ isDarkMode: boolean; isOwner?: boolean }> = ({ isDarkMode, isOwner = true }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const ai = settings.aiAssistant;

  const handleToggle = (key: keyof SystemSettings['aiAssistant']) => {
    if (!isOwner) return;
    updateSettings({
      aiAssistant: { ...ai, [key]: !ai[key] },
    });
  };

  const handleSelect = (key: keyof SystemSettings['aiAssistant'], val: any) => {
    if (!isOwner) return;
    updateSettings({
      aiAssistant: { ...ai, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Non-owner Warning Banner */}
      {!isOwner && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" /> API & Model Settings Restricted
            </span>
            <p className="mt-0.5 text-[11px] opacity-90">
              Only primary workspace owners (e.g., nyikulibramwel@gmail.com) have permissions to modify Gemini API configuration, preferred inference models, and AI engine capabilities.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            AI Assistant & Gemini Model Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure Gemini AI model selection, response verbosity, technical depth, reasoning summaries, and conversational Q&A behavior.
          </p>
        </div>
        <button
          type="button"
          disabled={!isOwner}
          onClick={() => resetCategory('ai')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Restore Defaults
        </button>
      </div>

      {/* Model Selection & Persona */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Model */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Primary AI Model
          </label>
          <select
            disabled={!isOwner}
            value={ai.preferredModel || 'gemini-2.5-flash'}
            onChange={(e) => handleSelect('preferredModel', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 disabled:opacity-50 cursor-pointer"
          >
            <option value="gemini-2.5-flash" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Gemini 2.5 Flash (Ultra Fast / Low Latency)</option>
            <option value="gemini-2.5-pro" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Gemini 2.5 Pro (Deep Reasoning & Analytics)</option>
            <option value="gemini-2.0-flash" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Gemini 2.0 Flash (Balanced)</option>
          </select>
        </div>

        {/* Response Style */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Response Style</label>
          <select
            disabled={!isOwner}
            value={ai.responseStyle || 'balanced'}
            onChange={(e) => handleSelect('responseStyle', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 disabled:opacity-50 cursor-pointer"
          >
            <option value="short" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Concise Bullet Points</option>
            <option value="balanced" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Balanced Explanation & Code</option>
            <option value="detailed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">In-Depth Audit Analysis with Proofs</option>
          </select>
        </div>

        {/* Technical Level */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Auditor Expertise Depth</label>
          <select
            disabled={!isOwner}
            value={ai.technicalLevel || 'intermediate'}
            onChange={(e) => handleSelect('technicalLevel', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 disabled:opacity-50 cursor-pointer"
          >
            <option value="beginner" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Beginner Friendly (Plain English)</option>
            <option value="intermediate" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Intermediate (Data Science / Analysts)</option>
            <option value="expert" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Expert / Senior Enterprise Compliance</option>
          </select>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'autoAnalyzeUploads', label: 'Auto-Analyze New Uploads', desc: 'Trigger anomaly detection immediately when a new CSV file is imported.' },
          { key: 'autoSummarizeDatasets', label: 'Auto-Summarize Datasets', desc: 'Generate high-level metadata, column types, and record totals automatically.' },
          { key: 'autoDetectAnomalies', label: 'Proactive Anomaly Detection', desc: 'Highlight outliers, missing values, and corrupted data types automatically.' },
          { key: 'suggestCleaningOperations', label: 'Suggest Cleaning Recipes', desc: 'Provide 1-click recipes for deduplication, null filling, and trimming whitespace.' },
          { key: 'suggestFormulas', label: 'Suggest Excel / SQL Formulas', desc: 'Suggest calculated columns and transformations in SQL / Regex.' },
          { key: 'generateCharts', label: 'Suggest Data Visualizations', desc: 'Recommend bar charts, scatter plots, or trendlines based on dataset columns.' },
          { key: 'displayConfidenceScore', label: 'Display AI Confidence Score', desc: 'Show percentage confidence rating for statistical recommendations.' },
          { key: 'showReasoningSummary', label: 'Show Chain-of-Thought Reasoning', desc: 'Expandable step-by-step reasoning summary for complex AI computations.' },
          { key: 'allowConversationalGeneralQA', label: 'Allow Conversational General Q&A', desc: 'Answer general knowledge, coding, or math questions (e.g., "What is Python?", "How to write SQL JOIN").' },
        ].map((item) => (
          <div
            key={item.key}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.label}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            <input
              type="checkbox"
              disabled={!isOwner}
              checked={Boolean((ai as any)[item.key])}
              onChange={() => handleToggle(item.key as any)}
              className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0 disabled:opacity-50"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
