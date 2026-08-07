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
  Bot,
  ShieldCheck,
  Zap,
  Search
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

  // Audio Recording State & Speech Recognition
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
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
      <div className={`text-center py-20 border-2 border-dashed rounded-3xl animate-fadeIn ${
        isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-300 bg-slate-50/50'
      }`}>
        <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
        <h3 className={`font-bold text-lg mb-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>No Active Audit Dataset Loaded</h3>
        <p className={`text-sm max-w-sm mx-auto mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
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

  // Audio Recording (Microphone Input & Speech Dictation) Logic
  const startRecording = async () => {
    try {
      // 1. Initialize Browser SpeechRecognition if supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      let recognitionInstance: any = null;
      let speechTranscribed = false;

      if (SpeechRecognition) {
        try {
          recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = true;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = 'en-US';

          let baseInput = userInput;
          recognitionInstance.onresult = (event: any) => {
            speechTranscribed = true;
            let currentInterim = '';
            let newFinal = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                newFinal += event.results[i][0].transcript;
              } else {
                currentInterim += event.results[i][0].transcript;
              }
            }
            if (newFinal) {
              baseInput = (baseInput ? baseInput.trim() + ' ' : '') + newFinal.trim();
            }
            const combined = (baseInput ? baseInput.trim() + ' ' : '') + currentInterim.trim();
            setUserInput(combined);
          };

          recognitionInstance.onerror = (event: any) => {
            console.warn("Speech Recognition notice:", event.error);
          };

          recognitionInstance.start();
          speechRecognitionRef.current = recognitionInstance;
        } catch (srErr) {
          console.warn("SpeechRecognition initialization failed, relying on audio stream recorder:", srErr);
        }
      }

      // 2. Request microphone stream for MediaRecorder audio capture
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
        // If live SpeechRecognition didn't produce text, use backend Gemini transcription
        if (!speechTranscribed && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
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
                setUserInput(prev => prev ? `${prev.trim()} ${data.text.trim()}` : data.text.trim());
              }
            } catch (e) {
              console.error("Transcription pipeline execution failed:", e);
            } finally {
              setLoading(false);
            }
          };
        }

        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      alert("Microphone access denied or unavailable. Please ensure microphone permissions are allowed in your browser settings.");
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
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
          { label: 'Non-Technical Staff Guide', text: 'Explain how the application works to non technical staff in simple, clear, non-technical terms.' },
          { label: 'Summarize Active CSV Dataset', text: 'Summarize my uploaded CSV dataset, key column statistics, data types, sample values, and quality issues.' },
          { label: 'Data Cleaning & Dedupe', text: 'How do duplicate row detection and missing value imputation routines work?' },
          { label: 'Security & Data Privacy', text: 'How does CSV Auditor Pro protect my data privacy and prevent third-party AI model training?' }
        ];
    }
  };

  // Quick Diagnostic Prompts definition when a file is active
  const quickInsightPrompts = activeFile ? [
    {
      id: 'error-patterns',
      title: 'Summarize Top 5 Errors',
      category: 'Error Patterns',
      prompt: `Summarize top 5 error patterns and compliance risks detected in active dataset "${activeFile.name}". Identify affected row indices, key column headers, and root cause corrections.`,
      description: 'Finds top 5 duplicate keys, date syntax errors, and missing fields.',
      icon: AlertTriangle,
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      pillBg: 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border-amber-500/30'
    },
    {
      id: 'schema-drift',
      title: 'Check for Schema Drift',
      category: 'Schema Quality',
      prompt: `Check for schema drift and structural anomalies in "${activeFile.name}". Compare column headers, data type consistency across rows, missing fields, and SQL table compatibility.`,
      description: 'Audits header alignment, column data types, and null patterns.',
      icon: Sliders,
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      pillBg: 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border-blue-500/30'
    },
    {
      id: 'outliers',
      title: 'Spot High-Risk Outliers',
      category: 'Anomalies',
      prompt: `Detect high-risk data outliers, duplicate transactions, monetary anomalies, and policy non-compliant values in "${activeFile.name}".`,
      description: 'Identifies transaction outliers and duplicate record clusters.',
      icon: TrendingDown,
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      pillBg: 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/30'
    },
    {
      id: 'cleaning-script',
      title: 'Generate Cleaning Plan',
      category: 'Transformation',
      prompt: `Generate an automated cleaning and data transformation action plan for active dataset "${activeFile.name}" to achieve 100% compliance quality score.`,
      description: 'Outlines step-by-step cleaning operations and transformation logic.',
      icon: Sparkles,
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      pillBg: 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30'
    },
    {
      id: 'type-integrity',
      title: 'Verify ISO & Types',
      category: 'Format Audit',
      prompt: `Verify ISO date formats, email syntax validity, phone formats, and column data-type integrity across all rows in "${activeFile.name}".`,
      description: 'Checks date consistency, email addresses, and type safety.',
      icon: ShieldCheck,
      badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      pillBg: 'bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border-violet-500/30'
    }
  ] : [];

  const handleRunQuickInsight = (promptText: string) => {
    setUserInput(promptText);
    setLoading(true);
    onSendMessage(
      promptText,
      selectedModel,
      selectedPersona,
      attachedImage,
      thinkingMode
    );
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
            <BrainCircuit className="w-3.5 h-3.5 animate-pulse" /> Advanced Core
          </span>
          <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            AI Insights & Auditing
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Configure your AI analyst settings, analyze physical receipts or screenshots, and run detailed multi-turn audits.
          </p>
        </div>

        {/* Global Configuration Controls Panel */}
        <div className={`p-3 rounded-xl border flex flex-wrap items-center gap-3 text-xs ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          {/* Persona selector */}
          <div className="flex items-center gap-1.5">
            <Sliders className={`w-3.5 h-3.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <select 
              value={selectedPersona} 
              onChange={(e) => setSelectedPersona(e.target.value)}
              className={`px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
            >
              <option value="auditor">Compliance Auditor</option>
              <option value="architect">PostgreSQL Architect</option>
              <option value="analyst">Business BI Analyst</option>
            </select>
          </div>

          {/* Model selection */}
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className={`px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (General)</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Complex/SQL)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
          </select>

          {/* High Thinking Mode Toggle */}
          <div className={`flex items-center gap-2 border-l pl-3 ${isDarkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
            <span className={`font-medium ${thinkingMode ? 'text-blue-500' : isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>High Thinking</span>
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

      {/* Quick Insight Diagnostics Banner for Active File */}
      {activeFile && (
        <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dashed ${isDarkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{activeFile.name}</h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active File Diagnostic Target
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {activeFile.rows.length} records • {activeFile.headers.length} schema headers • {activeFile.issues.length} active violations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                Quick Insights Active
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Automated Diagnostic Prompts
              </span>
              <span className={`text-[10px] font-mono hidden sm:inline ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                Click any prompt to instantly execute AI analysis on active dataset
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {quickInsightPrompts.map((qi) => {
                const IconComponent = qi.icon;
                return (
                  <button
                    key={qi.id}
                    type="button"
                    onClick={() => handleRunQuickInsight(qi.prompt)}
                    disabled={loading}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex flex-col justify-between ${
                      isDarkMode 
                        ? 'bg-slate-950/70 border-slate-800 hover:border-blue-500/60 hover:bg-slate-900' 
                        : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg border ${qi.badgeBg}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase ${qi.badgeBg}`}>
                          {qi.category}
                        </span>
                      </div>

                      <h4 className={`font-bold text-xs group-hover:text-blue-500 transition-colors ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {qi.title}
                      </h4>
                      <p className={`text-[10px] mt-1 line-clamp-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {qi.description}
                      </p>
                    </div>

                    <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[9px] font-bold transition-colors ${isDarkMode ? 'border-slate-800/40 text-slate-500 group-hover:text-blue-400' : 'border-slate-200 text-slate-600 group-hover:text-blue-600'}`}>
                      <span className="font-mono flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> Run Prompt
                      </span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
            
            <h2 className={`text-xl font-bold mt-2 flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {selectedPersona === 'architect' ? (
                <>
                  <Database className="w-5 h-5 text-blue-500 shrink-0" />
                  <span>PostgreSQL Database Architect</span>
                </>
              ) : selectedPersona === 'analyst' ? (
                <>
                  <BarChart3 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Strategic BI Analyst</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                  <span>Data Compliance Auditor</span>
                </>
              )}
            </h2>

            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
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
            <h3 className={`font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
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
            <span className={`text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
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
                    <span className={`line-clamp-2 leading-relaxed ${isDarkMode ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-600 group-hover:text-slate-900'}`}>{sug.text}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-500 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Advanced Chat Assistant Panel */}
        <div className="lg:col-span-7 flex flex-col justify-between h-[520px]">
          <div className={`p-6 rounded-3xl border flex-1 flex flex-col justify-between overflow-hidden relative ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            
            {/* Active Model Indicator Header */}
            <div className={`flex justify-between items-center border-b border-dashed pb-4 mb-4 ${isDarkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>Conversational Auditor</h3>
                  <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                    <span>Engine:</span> 
                    <span className="font-mono font-bold text-blue-500 uppercase">
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
                  <div className={`p-3.5 rounded-2xl relative ${msg.role === 'user' ? 'bg-[#2563EB] text-white rounded-tr-none shadow-sm' : isDarkMode ? 'bg-[#1E293B] border border-[#334155] text-[#F8FAFC] rounded-tl-none' : 'bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] rounded-tl-none'}`}>
                    
                    {/* Intent Classification & Tool Badges Header for Assistant */}
                    {msg.role === 'assistant' && (msg.intentCategory || msg.executedTools) && (
                      <div className="mb-2.5 pb-2 border-b border-slate-800/40 flex flex-wrap items-center gap-1.5">
                        {msg.intentCategory && (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border uppercase flex items-center gap-1 ${
                            msg.intentCategory === 'CSV_ANALYSIS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            msg.intentCategory === 'GENERAL_AI' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            msg.intentCategory === 'MIXED_REQUEST' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            <Zap className="w-2.5 h-2.5" />
                            <span>
                              {msg.intentCategory === 'CSV_ANALYSIS' ? 'CSV Analysis' :
                               msg.intentCategory === 'GENERAL_AI' ? 'General AI' :
                               msg.intentCategory === 'MIXED_REQUEST' ? 'Hybrid AI' : 'AI Response'}
                              {msg.confidenceScore ? ` (${Math.round(msg.confidenceScore * 100)}%)` : ''}
                            </span>
                          </span>
                        )}

                        {msg.executedTools && msg.executedTools.map((tName, tIdx) => (
                          <span key={tIdx} className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Bot className="w-2.5 h-2.5 text-amber-400" />
                            <span>Tool: {tName}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* RAG Grounded Sources & Citations */}
                    {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/40 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mr-1">Sources:</span>
                        {msg.citations.map((c, idx) => {
                          const cleanLabel = c.label.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                          return (
                            <span 
                              key={idx} 
                              className={`px-2 py-0.5 rounded-md text-[9px] font-mono border flex items-center gap-1 ${
                                c.type === 'doc' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                c.type === 'dataset' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                c.type === 'memory' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}
                            >
                              {c.type === 'doc' && <FileSpreadsheet className="w-2.5 h-2.5 text-blue-400 shrink-0" />}
                              {c.type === 'dataset' && <Database className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                              {c.type === 'memory' && <MessageSquare className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                              {c.type === 'product' && <Zap className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
                              <span>{cleanLabel}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-2 pt-1 flex items-center justify-between text-[8px] text-slate-500 font-mono">
                      {msg.role === 'assistant' ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            alert("Response copied to clipboard!");
                          }}
                          className="hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          Copy Output
                        </button>
                      ) : <span />}
                      <span>{msg.timestamp}</span>
                    </div>
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
            <form onSubmit={handleSend} className={`mt-4 pt-4 border-t border-dashed flex flex-col gap-2 relative ${isDarkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
              
              {/* Quick Insight Pills above input box */}
              {activeFile && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-1 scrollbar-none">
                  <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0 flex items-center gap-1 mr-1">
                    <Zap className="w-3 h-3 fill-amber-400 text-amber-400" /> Quick Insights:
                  </span>
                  {quickInsightPrompts.map((qi) => {
                    const IconComp = qi.icon;
                    return (
                      <button
                        key={qi.id}
                        type="button"
                        onClick={() => handleRunQuickInsight(qi.prompt)}
                        disabled={loading || isRecording}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${qi.pillBg}`}
                        title={qi.prompt}
                      >
                        <IconComp className="w-3 h-3" />
                        <span>{qi.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}

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
