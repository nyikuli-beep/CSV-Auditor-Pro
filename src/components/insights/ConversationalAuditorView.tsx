import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Database, 
  Trash2, 
  CheckCircle2, 
  Activity, 
  HelpCircle, 
  ShieldAlert, 
  Search, 
  Brain, 
  Mic, 
  MicOff, 
  Paperclip, 
  X, 
  ArrowRight,
  RefreshCw,
  Terminal,
  Layers,
  Copy,
  Check,
  Table,
  Target,
  FileCode
} from 'lucide-react';
import { ChatMessage } from '../../types';

interface ConversationalAuditorViewProps {
  activeFile: any;
  chatMessages: ChatMessage[] | any[];
  onSendMessage: (
    prompt: string, 
    model?: string, 
    persona?: string, 
    image?: { data: string; mimeType: string }, 
    thinkingMode?: boolean, 
    enableSearchGrounding?: boolean
  ) => void;
  isDarkMode: boolean;
  accentClass: string;
  onClearChat?: () => void;
}

const QUICK_DIAGNOSTIC_PROMPTS = [
  'Audit overall data quality and missing values',
  'What are the statistical outliers in numeric columns?',
  'Show me the top 5 error patterns and remediation steps',
  'Generate an executive summary of this dataset',
  'Check for formula injection and security risks',
  'What is the category distribution of the main classes?'
];

export default function ConversationalAuditorView({
  activeFile,
  chatMessages,
  onSendMessage,
  isDarkMode,
  accentClass,
  onClearChat
}: ConversationalAuditorViewProps) {
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('auditor');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [searchGrounding, setSearchGrounding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Voice speech-to-text initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        setIsRecording(false);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({
        data: base64String,
        mimeType: file.type || 'image/png',
        preview: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    const trimmed = inputPrompt.trim();
    if (!trimmed && !selectedImage) return;

    const imgPayload = selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined;

    onSendMessage(
      trimmed || 'Analyze the attached image regarding the dataset',
      'gemini-3.7-flash',
      selectedPersona,
      imgPayload,
      thinkingMode,
      searchGrounding
    );

    setInputPrompt('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const getGroundingBadge = (msg: any, isUser: boolean) => {
    if (isUser) return null;
    const status = msg.groundingStatus || msg.confidenceStatus || (msg.statusStep ? 'derived' : 'verified');

    switch (status) {
      case 'verified':
      case 'high_confidence':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Data verified
          </span>
        );
      case 'derived':
      case 'moderate_confidence':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
            <Activity className="w-3 h-3 text-blue-500" />
            Data derived
          </span>
        );
      case 'interpretation':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-500" />
            Interpretation
          </span>
        );
      case 'insufficient_data':
      case 'low_confidence':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-amber-500" />
            Insufficient data
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[720px] rounded-2xl border overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Control Bar Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              Conversational Auditor
              <span className="text-[10px] font-mono font-normal text-slate-400">Gemini 3.7 Flash</span>
            </h3>
            <p className="text-[10px] text-slate-500">
              {activeFile ? `Grounded in: ${activeFile.name} (${activeFile.rows?.length || 0} rows)` : 'No dataset active'}
            </p>
          </div>
        </div>

        {/* Auditor Specialist Persona Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
            {[
              { id: 'auditor', label: 'Auditor' },
              { id: 'scientist', label: 'Scientist' },
              { id: 'developer', label: 'SQL / Dev' },
              { id: 'compliance', label: 'Compliance' }
            ].map(persona => (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(persona.id)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  selectedPersona === persona.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {persona.label}
              </button>
            ))}
          </div>

          {/* Thinking Mode Toggle */}
          <button
            onClick={() => setThinkingMode(!thinkingMode)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
              thinkingMode
                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
            title="Enable deep analytical step-by-step thinking (2,048 token budget)"
          >
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            Thinking
          </button>

          {/* Search Grounding Toggle */}
          <button
            onClick={() => setSearchGrounding(!searchGrounding)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
              searchGrounding
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
            title="Ground answers with Google Search for external standards and compliance regulations"
          >
            <Search className="w-3.5 h-3.5 text-blue-500" />
            Search
          </button>

          {onClearChat && chatMessages.length > 0 && (
            <button
              onClick={onClearChat}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Clear conversation history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Empty State Banner if no messages */}
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {activeFile ? `Ask questions about "${activeFile.name}"` : 'Upload or select a CSV to start auditing'}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activeFile 
                  ? 'Ask any natural question about columns, statistics, anomalies, or formulas. Every calculation is performed deterministically before Gemini explains the findings.'
                  : 'Upload a CSV file to inspect distributions, detect anomalies, or run complex transformations.'}
              </p>
            </div>

            {/* Quick Diagnostic Prompt Chips */}
            {activeFile && (
              <div className="w-full max-w-lg pt-2 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block text-left">
                  Suggested Diagnostic Prompts:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {QUICK_DIAGNOSTIC_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(prompt, 'gemini-3.7-flash', selectedPersona, undefined, thinkingMode, searchGrounding)}
                      className="p-2.5 rounded-xl border text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 hover:bg-blue-50/50 dark:bg-slate-950/40 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 transition-all text-left flex items-start gap-2 cursor-pointer group"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0 mt-0.5" />
                      <span className="truncate">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Bubble List */}
        {chatMessages.map(msg => {
          // Normalize role/sender and content/text across all message payloads
          const isUser = msg.role === 'user' || msg.sender === 'user';
          const messageContent = (msg.content !== undefined ? msg.content : msg.text) || '';
          const isStreaming = Boolean(msg.isStreaming);
          const activeAgentLabel = msg.activeAgentName || msg.activeAgentTitle || `Auditor (${selectedPersona})`;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {isUser ? 'You' : activeAgentLabel}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {msg.timestamp || ''}
                </span>
                {getGroundingBadge(msg, isUser)}
              </div>

              <div
                className={`p-4 rounded-2xl max-w-2xl text-xs leading-relaxed transition-all relative group ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800/95 text-slate-100 border border-slate-700 rounded-tl-xs shadow-xs'
                    : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-xs shadow-xs'
                }`}
              >
                {/* If attached image exists in message */}
                {msg.image && (
                  <div className="mb-2 max-w-xs rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img 
                      src={typeof msg.image === 'string' ? msg.image : (msg.image.data ? `data:${msg.image.mimeType || 'image/png'};base64,${msg.image.data}` : '')} 
                      alt="User attachment" 
                      className="w-full object-cover" 
                    />
                  </div>
                )}

                {/* Message Content */}
                <div className="whitespace-pre-wrap font-sans">
                  {messageContent ? (
                    messageContent
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 italic flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                      Analyzing dataset & computing forensic evidence...
                    </span>
                  )}
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-3 bg-blue-500 ml-1 animate-pulse" />
                  )}
                </div>

                {/* Copy Message Tool Button */}
                {!isUser && messageContent && (
                  <button
                    onClick={() => handleCopyMessage(msg.id, messageContent)}
                    className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-opacity cursor-pointer"
                    title="Copy message"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Citations and Metadata Footer if present */}
              {!isUser && ((msg.citations && msg.citations.length > 0) || (msg.relevantColumns && msg.relevantColumns.length > 0) || msg.intent) && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap max-w-2xl">
                  {msg.citations && msg.citations.length > 0 && (
                    <>
                      <span className="text-[9px] uppercase font-bold text-slate-400">Sources:</span>
                      {msg.citations.map((c: any, idx: number) => (
                        <span
                          key={`cit-${idx}`}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        >
                          {c.label || c}
                        </span>
                      ))}
                    </>
                  )}

                  {msg.relevantColumns && msg.relevantColumns.length > 0 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                      <Table className="w-2.5 h-2.5" />
                      {msg.relevantColumns.join(', ')}
                    </span>
                  )}

                  {msg.intent && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                      <Target className="w-2.5 h-2.5" />
                      {msg.intent}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0 space-y-2">
        {/* Selected Image Preview Pill */}
        {selectedImage && (
          <div className="flex items-center gap-2 p-1.5 pl-2 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 w-fit">
            <img src={selectedImage.preview} alt="Thumb" className="w-6 h-6 rounded object-cover" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Attached Image</span>
            <button
              onClick={handleRemoveImage}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Attachment Input (Hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Paperclip Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer shrink-0"
            title="Attach image or chart for analysis"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isRecording
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
            }`}
            title={isRecording ? 'Listening... click to stop' : 'Voice input'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Textarea Input */}
          <div className="flex-1 relative">
            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeFile ? `Ask the Auditor anything about ${activeFile.name}...` : 'Upload a CSV to start asking data questions...'}
              rows={1}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 resize-none max-h-32 min-h-[42px]"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputPrompt.trim() && !selectedImage}
            className={`p-2.5 rounded-xl text-white font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center ${
              inputPrompt.trim() || selectedImage
                ? 'bg-blue-600 hover:bg-blue-700 shadow-xs'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
