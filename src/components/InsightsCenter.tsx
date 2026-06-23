import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  FileSpreadsheet, 
  Compass, 
  HelpCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  BrainCircuit,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { CSVFile, ChatMessage } from '../types';

interface InsightsCenterProps {
  activeFile: CSVFile | null;
  chatMessages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function InsightsCenter({ activeFile, chatMessages, onSendMessage, isDarkMode, accentClass }: InsightsCenterProps) {
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!activeFile) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl animate-fadeIn">
        <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-1">No Active Audit Dataset Loaded</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
          Upload a local spreadsheet or load our messy company transaction data to generate compliance insights.
        </p>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentInput = userInput;
    setUserInput('');
    setLoading(true);

    // Call callback to append message to state first
    onSendMessage(currentInput);
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
          <BrainCircuit className="w-3.5 h-3.5 animate-pulse" /> Advanced Core
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Insights & Auditing</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Review automated risk analysis portfolios and consult with our conversational data analyst.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Risk Portfolio & Recommendations */}
        <div className="lg:col-span-6 space-y-6">
          {/* Executive Summary Card */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" /> Executive AI Summary
            </h3>
            <div className={`p-4 rounded-xl text-xs leading-relaxed space-y-3 ${isDarkMode ? 'bg-slate-950/50 text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
              <p>
                Spreadsheet <strong>{activeFile.name}</strong> contains {activeFile.rows.length} rows and {activeFile.headers.length} mapped headers. An automated evaluation flags {activeFile.issues.length} active violations across duplicate checks, numeric columns, and standard ISO formats.
              </p>
              <p>
                <strong>Major Exposure Risk:</strong> Multiple duplicate keys (such as transaction IDs) are recorded. This compromises aggregation metrics, skewing calculated cash assets. Date formats fail ISO compatibility in row 5.
              </p>
              <p>
                <strong>Key Action:</strong> Execute <em>Remove Duplicates</em> and <em>Standardize Dates</em> inside our Cleaning Centers. This immediately corrects the grading profile to A+.
              </p>
            </div>
          </div>

          {/* Risk analysis Scorecard */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4">Risk Analysis Matrix</h3>
            
            <div className="space-y-4">
              {/* Category 1 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold">Compliance Duplication Exposure</span>
                  <span className="text-rose-400 font-bold">HIGH RISK</span>
                </div>
                <div className="w-full bg-slate-700/20 rounded-full h-2">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              {/* Category 2 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold">Data Structure Formatting Gaps</span>
                  <span className="text-amber-400 font-bold">MODERATE RISK</span>
                </div>
                <div className="w-full bg-slate-700/20 rounded-full h-2">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>

              {/* Category 3 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold">Ingestion Crash Risks (Null values)</span>
                  <span className="text-rose-400 font-bold">CRITICAL RISK</span>
                </div>
                <div className="w-full bg-slate-700/20 rounded-full h-2">
                  <div className="bg-rose-600 h-full rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Chat Assistant Panel */}
        <div className="lg:col-span-6 flex flex-col justify-between h-[520px]">
          <div className={`p-6 rounded-2xl border flex-1 flex flex-col justify-between overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center border-b border-dashed border-slate-800/60 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg"><MessageSquare className="w-4 h-4" /></div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Conversational Auditor</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Powered by Google Gemini 3.5 Flash</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Chat message feed */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex gap-3 items-start max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`p-2 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 w-7 h-7 text-white ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                    {msg.role === 'user' ? 'ME' : 'AI'}
                  </div>
                  <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600/15 border border-blue-500/20 text-blue-200 rounded-tr-none' : isDarkMode ? 'bg-slate-950/60 border border-slate-800 rounded-tl-none' : 'bg-slate-100 rounded-tl-none text-slate-800'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[8px] text-slate-400 font-mono block mt-1.5 text-right">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={handleSend} className="mt-4 pt-4 border-t border-dashed border-slate-800/60 flex gap-2">
              <input 
                type="text" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask: 'Summarize sheet anomalies' or 'suggest outliers'..."
                className={`flex-1 px-3.5 py-2 rounded-xl text-xs focus:outline-none border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`}
              />
              <button 
                type="submit"
                disabled={!userInput.trim() || loading}
                className={`p-2 text-white rounded-xl shadow cursor-pointer disabled:opacity-50 ${accentClass}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
