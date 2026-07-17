import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  AlertTriangle,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
  Info,
  Sliders,
  Database,
  BarChart3,
  Bot
} from 'lucide-react';
import { CSVFile, ChatMessage } from '../types';

interface InsightsCenterProps {
  activeFile: CSVFile | null;
  chatMessages: ChatMessage[];
  onSendMessage: (
    msg: string, 
    model?: string, 
    persona?: string, 
    image?: { data: string; mimeType: string } | null, 
    thinkingMode?: boolean
  ) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function InsightsCenter({ activeFile, chatMessages, onSendMessage, isDarkMode, accentClass }: InsightsCenterProps) {
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Model & Persona Configuration States
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [selectedPersona, setSelectedPersona] = useState<string>('auditor');
  const [thinkingMode, setThinkingMode] = useState<boolean>(false);

  // Multimodal (Image) State
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Audio timer effect
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording]);

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

  // Handle message sending
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() && !attachedImage) return;

    const currentInput = userInput;
    const currentImg = attachedImage;
    const currentThinking = thinkingMode;

    setUserInput('');
    setAttachedImage(null);
    setImagePreview(null);
    setLoading(true);

    // Call callback to dispatch chat message
    onSendMessage(
      currentInput || (currentImg ? "Please analyze this attached data screenshot or document visual." : ""),
      selectedModel,
      selectedPersona,
      currentImg,
      currentThinking
    );
    setLoading(false);
  };

  // Trigger quick query suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setUserInput(suggestion);
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Image Upload Logic
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Please upload a valid image file (PNG/JPG).");
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setAttachedImage({
          data: base64Data,
          mimeType: file.type
        });
        setImagePreview(base64String);
        
        // Force model upgrade for multimodal if basic is active
        if (selectedModel === 'gemini-3.1-flash-lite') {
          setSelectedModel('gemini-3.1-pro-preview');
        }
      };
    }
  };

  // Audio Recording (Microphone Input) Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert audio Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          
          setLoading(true);
          try {
            const res = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioData: base64Data,
                mimeType: 'audio/webm'
              })
            });
            const data = await res.json();
            if (data.text) {
              setUserInput(prev => prev ? `${prev} ${data.text}` : data.text);
            }
          } catch (e) {
            console.error("Transcription pipeline execution failed:", e);
          } finally {
            setLoading(false);
          }
        };

        // Turn off mic light by stopping all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access failed:", err);
      alert("Microphone access denied or unavailable in this secure context. Check iframe permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Tailored suggestions based on current Persona
  const getSuggestions = () => {
    switch (selectedPersona) {
      case 'architect':
        return [
          { label: 'Generate Table DDL', text: 'Generate an optimal PostgreSQL CREATE TABLE script for this dataset with index keys and numeric scales.' },
          { label: 'Normalize Schema', text: 'Explain how to decompose this CSV into 3NF normalized PostgreSQL tables with foreign keys.' },
          { label: 'Database Ingestion Plan', text: 'Outline key index strategies, null fields, and database constraints for high-performance query execution.' }
        ];
      case 'analyst':
        return [
          { label: 'Executive BI Brief', text: 'Summarize the strategic quarterly insights, conversion rates, and monthly revenue performance from this sheet.' },
          { label: 'Formulate Growth Plan', text: 'Based on geographic segments, identify underperforming markets and outline an actionable growth strategy.' },
          { label: 'ROI & Cost Analysis', text: 'Locate cash leak anomalies, high-outlier payouts, and operational hygiene risks in these rows.' }
        ];
      default: // auditor
        return [
          { label: 'Identify Violations', text: 'Perform a detailed compliance audit. Which dates, emails, and transaction keys are invalid or duplicate?' },
          { label: 'Audit Checklist', text: 'Generate a step-by-step cleaning audit checklist for compliance before we submit this to regulators.' },
          { label: 'Spot Data Outliers', text: 'Find transaction outliers with amounts exceeding standard limits, and explain why they pose compliance risks.' }
        ];
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
            <BrainCircuit className="w-3.5 h-3.5 animate-pulse" /> Advanced Core
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Insights & Auditing</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Configure your AI analyst settings, analyze physical receipts or screenshots, and run detailed multi-turn audits.
          </p>
        </div>

        {/* Global Configuration Controls Panel */}
        <div className={`p-3 rounded-xl border flex flex-wrap items-center gap-3 text-xs ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          {/* Persona selector */}
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <select 
              value={selectedPersona} 
              onChange={(e) => setSelectedPersona(e.target.value)}
              className={`px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
            >
              <option value="auditor">👤 Compliance Auditor</option>
              <option value="architect">🗄️ PostgreSQL Architect</option>
              <option value="analyst">📈 Business BI Analyst</option>
            </select>
          </div>

          {/* Model selection */}
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className={`px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
          >
            <option value="gemini-3.5-flash">✨ Gemini 3.5 Flash (General)</option>
            <option value="gemini-3.1-pro-preview">🧠 Gemini 3.1 Pro (Complex/SQL)</option>
            <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash Lite (Fast)</option>
          </select>

          {/* High Thinking Mode Toggle */}
          <div className="flex items-center gap-2 border-l border-slate-800/60 pl-3">
            <span className={`font-medium ${thinkingMode ? 'text-blue-500' : 'text-slate-400'}`}>High Thinking</span>
            <button 
              type="button"
              onClick={() => {
                setThinkingMode(!thinkingMode);
                if (!thinkingMode) {
                  // Force Pro model for High Thinking
                  setSelectedModel('gemini-3.1-pro-preview');
                }
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${thinkingMode ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${thinkingMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Dynamic Persona Insights & Recommendations */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Persona Card banner */}
          <div className={`p-6 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              {selectedPersona === 'architect' ? <Database className="w-32 h-32" /> : selectedPersona === 'analyst' ? <BarChart3 className="w-32 h-32" /> : <Bot className="w-32 h-32" />}
            </div>
            
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Active Session Persona
            </span>
            
            <h2 className="text-xl font-bold mt-2 flex items-center gap-2">
              {selectedPersona === 'architect' ? (
                <>🗄️ PostgreSQL Database Architect</>
              ) : selectedPersona === 'analyst' ? (
                <>📈 Strategic BI Analyst</>
              ) : (
                <>👤 Data Compliance Auditor</>
              )}
            </h2>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {selectedPersona === 'architect' ? (
                "Equipped with advanced understanding of physical schema design, normalization indexes, foreign key trees, transactional scaling, and complete SQL scripting."
              ) : selectedPersona === 'analyst' ? (
                "Specialized in calculating corporate ROI yields, identifying financial growth leaks, monthly transaction variances, and business KPI pipelines."
              ) : (
                "Expert in identifying format discrepancies, tracking data-type anomalies, resolving duplicate identifiers, and ensuring strict regulatory compliance."
              )}
            </p>
          </div>

          {/* Executive Summary Portfolio */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
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

          {/* Prompt Suggestions */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> Prompt Guidelines
            </span>
            <div className="grid grid-cols-1 gap-2">
              {getSuggestions().map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(sug.text)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 group ${isDarkMode ? 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/40 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'}`}
                >
                  <div>
                    <span className="font-bold text-blue-500 text-[10px] uppercase block mb-0.5">{sug.label}</span>
                    <span className="line-clamp-2 leading-relaxed text-slate-400 group-hover:text-slate-300">{sug.text}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-500 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Advanced Chat Assistant Panel */}
        <div className="lg:col-span-7 flex flex-col justify-between h-[680px]">
          <div className={`p-6 rounded-3xl border flex-1 flex flex-col justify-between overflow-hidden relative ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            
            {/* Active Model Indicator Header */}
            <div className="flex justify-between items-center border-b border-dashed border-slate-800/60 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Conversational Auditor</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <span>Engine:</span> 
                    <span className="font-mono font-bold text-blue-400 uppercase">
                      {selectedModel} {thinkingMode && "(High Thinking)"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {thinkingMode && (
                  <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
                    Thinking ON
                  </span>
                )}
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
            </div>

            {/* Chat message feed */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex gap-3 items-start max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`p-2 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 w-8 h-8 text-white ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800'}`}>
                    {msg.role === 'user' ? 'ME' : 'AI'}
                  </div>
                  <div className={`p-3.5 rounded-2xl relative ${msg.role === 'user' ? 'bg-blue-600/15 border border-blue-500/20 text-blue-200 rounded-tr-none' : isDarkMode ? 'bg-slate-950/60 border border-slate-800 rounded-tl-none' : 'bg-slate-100 rounded-tl-none text-slate-800'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-[8px] text-slate-500 font-mono block mt-2 text-right">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 items-start max-w-[85%]">
                  <div className="p-2 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 w-8 h-8 text-white bg-slate-800">
                    AI
                  </div>
                  <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-slate-950/60 border border-slate-800 rounded-tl-none' : 'bg-slate-100 rounded-tl-none text-slate-800'}`}>
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Preview of attached visual layout */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`mt-4 p-2 rounded-xl border flex items-center justify-between gap-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={imagePreview} 
                      alt="Attachment preview" 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-700" 
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">Multimodal Image Attachment</span>
                      <span className="text-xs font-bold text-blue-500 uppercase text-[9px]">Will parse via Gemini 3.1 Pro</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={removeAttachedImage}
                    className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording Active Banner Overlay */}
            <AnimatePresence>
              {isRecording && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-x-6 bottom-20 p-4 rounded-2xl bg-rose-900/90 border border-rose-500/30 text-white backdrop-blur-md flex items-center justify-between shadow-lg z-25"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <div>
                      <span className="font-bold text-xs uppercase">Microphone Recording Active</span>
                      <span className="text-[10px] block opacity-80 font-mono">Duration: {recordingSeconds} seconds</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={stopRecording}
                    className="px-3 py-1.5 bg-white text-rose-900 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Stop & Transcribe
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Input Bar */}
            <form onSubmit={handleSend} className="mt-4 pt-4 border-t border-dashed border-slate-800/60 flex flex-col gap-2 relative">
              <div className="flex gap-2">
                {/* Audio Recording Toggle Button */}
                <button 
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${isRecording ? 'bg-rose-600 border-rose-500 text-white animate-pulse' : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'}`}
                  title={isRecording ? "Stop recording" : "Transcribe from Microphone"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Multimodal Photo Selection Button */}
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${imagePreview ? 'bg-blue-600 border-blue-500 text-white' : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'}`}
                  title="Upload receipt photo or document"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                <input 
                  type="text" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={isRecording ? "Recording your audio voice..." : "Ask: 'suggest schema anomalies', 'write PostgreSQL scripts'..."}
                  className={`flex-1 px-3.5 py-2 rounded-xl text-xs focus:outline-none border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'}`}
                  disabled={isRecording}
                />
                <button 
                  type="submit"
                  disabled={(!userInput.trim() && !attachedImage) || loading || isRecording}
                  className={`p-2.5 text-white rounded-xl shadow cursor-pointer disabled:opacity-50 ${accentClass}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono mt-1">
                <Info className="w-3 h-3 text-slate-600" />
                <span>Multi-turn chat persists database mapping & schema context continuously.</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
