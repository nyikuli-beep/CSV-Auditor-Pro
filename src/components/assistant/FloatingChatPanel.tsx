import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Minus, 
  Trash2, 
  Send, 
  Database, 
  Upload, 
  AlertCircle, 
  Check, 
  Copy, 
  FileSpreadsheet,
  ChevronDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAssistant } from '../../context/AssistantContext';
import { AssistantMessage } from '../../types/assistant';

interface FloatingChatPanelProps {
  isDarkMode: boolean;
  accentClass?: string;
  onNavigate?: (tabId: string) => void;
}

const DEFAULT_SUGGESTED_QUESTIONS = [
  'What are the biggest data-quality issues?',
  'Which columns contain missing values?',
  'What are the most important anomalies?',
  'Summarize this dataset.'
];

export const FloatingChatPanel: React.FC<FloatingChatPanelProps> = ({
  isDarkMode,
  accentClass = 'bg-blue-600 hover:bg-blue-700',
  onNavigate
}) => {
  const {
    isOpen,
    isMinimized,
    closeAssistant,
    toggleMinimize,
    messages,
    sendMessage,
    clearMessages,
    pageContext,
    datasetContext,
    recommendationContext,
    isProcessing
  } = useAssistant();

  const [inputPrompt, setInputPrompt] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of message list
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing, isOpen, isMinimized]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (!inputPrompt.trim() || isProcessing) return;
    const promptToSend = inputPrompt;
    setInputPrompt('');
    sendMessage(promptToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSelectSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="floating-assistant-panel"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          height: isMinimized ? 'auto' : undefined
        }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed z-50 rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-colors ${
          isMinimized 
            ? 'bottom-20 right-5 sm:right-6 w-[340px] sm:w-[380px]' 
            : 'bottom-20 right-3 left-3 sm:left-auto sm:right-6 sm:w-[410px] h-[580px] max-h-[82vh]'
        } ${
          isDarkMode 
            ? 'bg-[#111827] border-[#374151] text-[#F9FAFB]' 
            : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#111827]'
        }`}
        role="dialog"
        aria-modal="false"
        aria-label="CSV Auditor AI Assistant Panel"
      >
        {/* Header */}
        <div 
          className={`px-4 py-3.5 border-b flex items-center justify-between select-none shrink-0 ${
            isDarkMode ? 'bg-[#1F2937]/90 border-[#374151]' : 'bg-[#F8FAFC] border-[#E5E7EB]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm leading-tight truncate">CSV Auditor AI</h3>
                <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                  isDarkMode ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  Phase 1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate leading-tight">
                Your data assistant
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && !isMinimized && (
              <button
                id="btn-assistant-clear-chat"
                onClick={() => setShowClearConfirm(true)}
                title="Clear conversation"
                aria-label="Clear conversation history"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              id="btn-assistant-toggle-minimize"
              onClick={toggleMinimize}
              title={isMinimized ? 'Expand panel' : 'Minimize panel'}
              aria-label={isMinimized ? 'Expand assistant' : 'Minimize assistant'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-assistant-close"
              onClick={closeAssistant}
              title="Close panel"
              aria-label="Close assistant panel"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Clear Confirmation Modal / Bar */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`px-4 py-2.5 border-b text-xs flex items-center justify-between shrink-0 ${
                isDarkMode ? 'bg-rose-950/70 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>Clear conversation history?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    clearMessages();
                    setShowClearConfirm(false);
                  }}
                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className={`px-2 py-1 rounded font-semibold text-[10px] cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context Status Sub-bar */}
        {!isMinimized && (
          <div 
            className={`px-3.5 py-1.5 border-b text-[10px] flex items-center justify-between shrink-0 font-medium ${
              isDarkMode ? 'bg-[#1A2234] border-[#374151] text-slate-400' : 'bg-[#F1F5F9] border-[#E2E8F0] text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-slate-500">Page:</span>
              <span className="capitalize font-mono text-blue-500 dark:text-blue-400 truncate">
                {pageContext.page}
              </span>
            </div>

            <div className="flex items-center gap-1.5 truncate">
              {datasetContext ? (
                <>
                  <FileSpreadsheet className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate max-w-[150px]" title={datasetContext.fileName}>
                    {datasetContext.fileName}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 shrink-0">
                    ({datasetContext.rowCount?.toLocaleString()} rows)
                  </span>
                </>
              ) : (
                <span className="text-slate-400 italic">No active CSV</span>
              )}
            </div>
          </div>
        )}

        {/* Chat Body */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Empty State / Initial Greeting */}
            {messages.length === 0 && (
              <div className="space-y-4 py-2">
                {datasetContext ? (
                  <>
                    <div 
                      className={`p-3.5 rounded-xl border ${
                        isDarkMode ? 'bg-slate-800/60 border-slate-700/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-blue-500 font-bold">
                        <Sparkles className="w-4 h-4" />
                        <span>Ready to assist</span>
                      </div>
                      <p className="leading-relaxed">
                        Hi! I'm your CSV Auditor AI. Ask me anything about your current dataset.
                      </p>
                    </div>

                    {/* Recommendation Quick Prompt if viewing recommendations */}
                    {recommendationContext && recommendationContext.title && (
                      <div 
                        className={`p-3 rounded-xl border ${
                          isDarkMode ? 'bg-amber-950/40 border-amber-800/70 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px]">
                          <Info className="w-3.5 h-3.5 text-amber-500" />
                          <span>Active Recommendation Context</span>
                        </div>
                        <p className="text-[11px] mb-2 font-medium">
                          {recommendationContext.title} ({recommendationContext.columnName || 'General'})
                        </p>
                        <button
                          onClick={() => handleSelectSuggestedQuestion(`How should I implement the remediation for: "${recommendationContext.title}"?`)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          Ask about this remediation
                        </button>
                      </div>
                    )}

                    {/* Suggested Questions */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                        Suggested Inquiries
                      </span>
                      <div className="space-y-1.5">
                        {DEFAULT_SUGGESTED_QUESTIONS.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSuggestedQuestion(question)}
                            className={`w-full text-left p-2 rounded-lg border text-[11px] font-medium transition-colors flex items-center justify-between gap-2 cursor-pointer group ${
                              isDarkMode 
                                ? 'bg-slate-800/40 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white' 
                                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            <span className="truncate">{question}</span>
                            <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              &rarr;
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div 
                    className={`p-6 rounded-xl border border-dashed text-center space-y-3 ${
                      isDarkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        No Active CSV Selected
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Upload or select a CSV to start analyzing your data.
                      </p>
                    </div>
                    {onNavigate && (
                      <button
                        onClick={() => {
                          onNavigate('upload');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        Go to Upload Center
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 relative group text-xs ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : isDarkMode
                        ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-xs'
                        : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {/* Content with basic formatting */}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Message Meta / Copy button */}
                  <div className={`flex items-center justify-between gap-2 mt-1 pt-1 border-t text-[9px] ${
                    msg.role === 'user' ? 'border-blue-500/40 text-blue-100' : 'border-slate-700/40 dark:border-slate-700 text-slate-400'
                  }`}>
                    <span>{msg.timestamp}</span>

                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      title="Copy message text"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                    >
                      {copiedMsgId === msg.id ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Processing / Thinking indicator */}
            {isProcessing && (
              <div className="flex items-start gap-2">
                <div 
                  className={`rounded-2xl rounded-bl-xs px-3.5 py-2.5 border text-xs flex items-center gap-2 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    Capturing context...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        {!isMinimized && (
          <div 
            className={`p-3 border-t shrink-0 ${
              isDarkMode ? 'bg-[#1F2937]/90 border-[#374151]' : 'bg-[#F8FAFC] border-[#E5E7EB]'
            }`}
          >
            <div className="relative flex items-end gap-2">
              <textarea
                ref={textareaRef}
                id="input-assistant-prompt"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={datasetContext ? "Ask about your data..." : "Upload a CSV to start analyzing..."}
                rows={1}
                aria-label="Ask CSV Auditor AI"
                className={`w-full max-h-24 min-h-[38px] resize-none px-3 py-2 rounded-xl text-xs outline-none transition-colors border ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                }`}
              />

              <button
                id="btn-assistant-send"
                onClick={handleSend}
                disabled={!inputPrompt.trim() || isProcessing}
                aria-label="Send message to AI assistant"
                className={`p-2.5 rounded-xl text-white font-bold transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  inputPrompt.trim() && !isProcessing ? 'bg-blue-600 hover:bg-blue-700 shadow-xs' : 'bg-slate-500'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1.5 px-0.5">
              <span>Press <strong className="font-mono text-slate-500">Enter</strong> to send, <strong className="font-mono text-slate-500">Shift+Enter</strong> for newline</span>
              <span className="font-medium text-slate-500">Phase 1 Architecture</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
