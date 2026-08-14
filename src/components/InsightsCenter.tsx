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
  Search,
  Globe,
  Users,
  Layers,
  Check,
  Activity,
  Award
} from 'lucide-react';
import { CSVFile, ChatMessage } from '../types';
import { useBilling } from '../context/BillingContext';
import PlanFeatureLock from './PlanFeatureLock';
import EnterpriseIntelligenceCard from './EnterpriseIntelligenceCard';
import WorkspaceMemoryModal from './WorkspaceMemoryModal';

interface InsightsCenterProps {
  activeFile: CSVFile | null;
  chatMessages: ChatMessage[];
  onSendMessage: (
    msg: string, 
    model?: string, 
    persona?: string, 
    image?: { data: string; mimeType: string } | null, 
    thinkingMode?: boolean,
    enableSearchGrounding?: boolean,
    knowledgeBaseId?: string,
    explicitAgent?: string
  ) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function InsightsCenter({ activeFile, chatMessages, onSendMessage, isDarkMode, accentClass }: InsightsCenterProps) {
  const { plan, entitlements, openProCheckout, openEnterpriseModal } = useBilling();
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!entitlements.allowAiInsights) {
    return (
      <PlanFeatureLock
        featureName="AI Intelligence & Conversational Assistant"
        featureDescription="Interact with Google Gemini AI models to perform conversational audits, query dataset anomalies, and get automated hygiene recommendations."
        requiredPlan="pro"
        currentPlan={plan}
        isDarkMode={isDarkMode}
        onUpgradePro={openProCheckout}
        onUpgradeEnterprise={openEnterpriseModal}
      />
    );
  }

  // Model & Agent Configuration States
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.7-flash');
  const [selectedPersona, setSelectedPersona] = useState<string>('auditor');
  const [selectedAgent, setSelectedAgent] = useState<string>('auto');
  const [thinkingMode, setThinkingMode] = useState<boolean>(false);
  const [enableSearchGrounding, setEnableSearchGrounding] = useState<boolean>(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);

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
        isDarkMode ? 'border-[#334155] bg-[#0F172A]/20' : 'border-[#CBD5E1] bg-[#F8FAFC]'
      }`}>
        <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-[#64748B]' : 'text-[#94A3B8]'}`} />
        <h3 className={`font-bold text-lg mb-1 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>No Active Audit Dataset Loaded</h3>
        <p className={`text-sm max-w-sm mx-auto mb-6 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
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
    const currentAgent = selectedAgent === 'auto' ? undefined : selectedAgent;

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
      currentThinking,
      enableSearchGrounding,
      undefined,
      currentAgent
    );
    setLoading(false);
  };

  // Trigger quick query suggestion
  const handleSuggestionClick = (sug: { label: string; text: string; knowledgeBaseId?: string; agentId?: string }) => {
    setUserInput(sug.text);
    const chosenAgent = sug.agentId || (selectedAgent === 'auto' ? undefined : selectedAgent);
    
    if (sug.knowledgeBaseId || sug.agentId) {
      setLoading(true);
      onSendMessage(
        sug.text,
        selectedModel,
        selectedPersona,
        attachedImage,
        thinkingMode,
        enableSearchGrounding,
        sug.knowledgeBaseId,
        chosenAgent
      );
      setLoading(false);
      setUserInput('');
    }
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
      };
    }
  };

  // Audio Recording (Microphone Input & Speech Dictation) Logic
  const startRecording = async () => {
    try {
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
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
              speechTranscribed = true;
              setUserInput(baseInput ? `${baseInput.trim()} ${transcript.trim()}` : transcript.trim());
            }
          };

          recognitionInstance.onerror = (e: any) => {
            console.warn("SpeechRecognition encountered non-fatal event:", e);
          };

          recognitionInstance.start();
          speechRecognitionRef.current = recognitionInstance;
        } catch (srErr) {
          console.warn("Native SpeechRecognition start error, using MediaRecorder fallback:", srErr);
        }
      }

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

  // Specialist suggestions
  const getSuggestions = () => {
    switch (selectedAgent) {
      case 'data_quality':
        return [
          { label: 'Audit Anomaly Rates', text: 'Analyze row violation counts, column error rates, and quality score breakdown for this dataset.', agentId: 'data_quality' },
          { label: 'Check Critical Issues', text: 'Identify all critical severity duplicate keys and invalid format anomalies in the dataset.', agentId: 'data_quality' },
          { label: 'Verify Schema Health', text: 'Evaluate header integrity, column data type consistency, and null distribution.', agentId: 'data_quality' }
        ];
      case 'data_cleaning':
        return [
          { label: 'Formulate Cleaning Pipeline', text: 'Generate an automated step-by-step transformation script to fix missing values, duplicate records, and casing.', agentId: 'data_cleaning' },
          { label: 'Standardize Date Formats', text: 'Detect all inconsistent date representations and output the ISO 8601 normalization strategy.', agentId: 'data_cleaning' },
          { label: 'Missing Value Imputation', text: 'What is the optimal imputation method (mean, median, mode, forward-fill) for each blank column?', agentId: 'data_cleaning' }
        ];
      case 'statistical':
        return [
          { label: 'Outlier & Z-Score Analysis', text: 'Run mathematical IQR and Z-score outlier detection across all numerical columns and report boundaries.', agentId: 'statistical' },
          { label: 'Distribution & Variance', text: 'Calculate the mean, median, standard deviation, skewness, and min/max ranges for revenue and numerical metrics.', agentId: 'statistical' },
          { label: 'Correlation Matrix', text: 'Identify statistical relationships and dependencies between transaction amounts, quantities, and timestamps.', agentId: 'statistical' }
        ];
      case 'compliance':
        return [
          { label: 'PII & Privacy Audit', text: 'Scan all columns for sensitive PII (emails, phone numbers, SSNs, credit card patterns) and assess GDPR compliance.', agentId: 'compliance' },
          { label: 'Formula Injection Scan', text: 'Check if any cells contain dangerous formula injection prefixes (=, +, -, @) or CSV injection vectors.', agentId: 'compliance' },
          { label: 'Regulatory Audit Trail', text: 'Generate an enterprise compliance verification summary ready for ISO 27001 and SOX data governance audits.', agentId: 'compliance' }
        ];
      case 'business_intelligence':
        return [
          { label: 'Executive KPI Brief', text: 'Synthesize quarterly revenue trends, high-value transaction clusters, and operational volume KPIs.', agentId: 'business_intelligence' },
          { label: 'Segment Variance Analysis', text: 'Analyze transaction performance and average deal sizes grouped by categories or geographic regions.', agentId: 'business_intelligence' },
          { label: 'Revenue Leakage Detection', text: 'Detect potential revenue loss, negative balances, duplicate billing, or uncollected invoice anomalies.', agentId: 'business_intelligence' }
        ];
      case 'product_support':
        return [
          { label: 'Non-Technical Staff Guide', text: 'Explain how the application works to non technical staff in simple, clear, non-technical terms.', knowledgeBaseId: 'non_technical_guide', agentId: 'product_support' },
          { label: 'Data Cleaning & Dedupe', text: 'How do duplicate row detection and missing value imputation routines work?', knowledgeBaseId: 'data_cleaning_dedupe', agentId: 'product_support' },
          { label: 'Security & Data Privacy', text: 'How does CSV Auditor Pro protect my data privacy and prevent third-party AI model training?', knowledgeBaseId: 'security_privacy_ai_training', agentId: 'product_support' }
        ];
      default: // auto / general
        return [
          { label: 'Complete Multi-Agent Audit', text: 'Run a collaborative multi-agent audit covering data quality issues, statistical outliers, and compliance risks.' },
          { label: 'Non-Technical Staff Guide', text: 'Explain how the application works to non technical staff in simple, clear, non-technical terms.', knowledgeBaseId: 'non_technical_guide' },
          { label: 'Revenue & Outlier Investigation', text: 'Identify revenue trends and detect anomalous transaction outliers affecting financial accuracy.' },
          { label: 'Security & Model Privacy', text: 'How does CSV Auditor Pro protect my data privacy and prevent third-party AI model training?', knowledgeBaseId: 'security_privacy_ai_training' }
        ];
    }
  };

  // Quick Diagnostic Prompts definition when a file is active
  const quickInsightPrompts = activeFile ? [
    {
      id: 'error-patterns',
      title: 'Top 5 Error Patterns',
      category: 'Data Quality',
      prompt: `Summarize top 5 error patterns and compliance risks detected in active dataset "${activeFile.name}". Identify affected row indices, key column headers, and root cause corrections.`,
      icon: AlertTriangle,
      pillBg: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D] hover:bg-[#FDE68A]'
    },
    {
      id: 'stat-outliers',
      title: 'Statistical Outliers',
      category: 'Statistical',
      prompt: `Perform a statistical outlier audit on numeric fields in "${activeFile.name}". Compute IQR and Z-scores to pinpoint anomalous transactions.`,
      icon: TrendingDown,
      pillBg: 'bg-[#F3E8FF] text-[#6B21A8] border-[#D8B4FE] hover:bg-[#E9D5FF]'
    },
    {
      id: 'compliance-scan',
      title: 'PII & Security Scan',
      category: 'Compliance',
      prompt: `Perform a comprehensive PII and formula security compliance audit on "${activeFile.name}". Verify email formatting, phone numbers, and formula injection safety.`,
      icon: ShieldCheck,
      pillBg: 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE] hover:bg-[#E0E7FF]'
    },
    {
      id: 'cleaning-script',
      title: 'Generate Cleaning Plan',
      category: 'Transformation',
      prompt: `Generate an automated cleaning and data transformation action plan for active dataset "${activeFile.name}" to achieve 100% compliance quality score.`,
      icon: Sparkles,
      pillBg: 'bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7] hover:bg-[#A7F3D0]'
    },
    {
      id: 'bi-kpis',
      title: 'Executive BI Brief',
      category: 'Business Intelligence',
      prompt: `Generate an executive BI summary for "${activeFile.name}" highlighting total metrics, high-volume categories, and strategic operational takeaways.`,
      icon: BarChart3,
      pillBg: 'bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD] hover:bg-[#BFDBFE]'
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
      thinkingMode,
      enableSearchGrounding,
      undefined,
      selectedAgent === 'auto' ? undefined : selectedAgent
    );
    setLoading(false);
  };

  // Helper to render agent icon
  const renderAgentIcon = (agentType?: string, className = "w-3.5 h-3.5") => {
    switch (agentType) {
      case 'data_quality':
        return <Bot className={className} />;
      case 'data_cleaning':
        return <Sparkles className={className} />;
      case 'statistical':
        return <Activity className={className} />;
      case 'compliance':
        return <ShieldCheck className={className} />;
      case 'business_intelligence':
        return <BarChart3 className={className} />;
      case 'product_support':
        return <HelpCircle className={className} />;
      case 'general_knowledge':
        return <BrainCircuit className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-[#2563EB]" /> Enterprise Specialist AI Agents
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">
              Phase 2 Orchestrated
            </span>
          </div>
          <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
            AI Insights & Conversational Auditor
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
            Autonomous multi-agent orchestration routing requests to dedicated Data Quality, Statistical, Compliance, Cleaning, and BI specialists.
          </p>
        </div>

        {/* Global Configuration Controls Panel */}
        <div className={`p-3 rounded-xl border flex flex-wrap items-center gap-3 text-xs ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0] shadow-xs'}`}>
          
          {/* Specialist Agent Routing Selector */}
          <div className="flex items-center gap-1.5">
            <Layers className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`} />
            <select 
              value={selectedAgent} 
              onChange={(e) => setSelectedAgent(e.target.value)}
              className={`px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-medium ${isDarkMode ? 'bg-[#020617] border-[#334155] text-[#F8FAFC]' : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'}`}
            >
              <option value="auto">Auto Orchestrator (Multi-Agent)</option>
              <option value="data_quality">Data Quality Auditor</option>
              <option value="data_cleaning">Data Cleaning Specialist</option>
              <option value="statistical">Statistical Analyst</option>
              <option value="compliance">Compliance & Integrity Auditor</option>
              <option value="business_intelligence">Business Intelligence Analyst</option>
              <option value="product_support">Product & Technical Support</option>
              <option value="general_knowledge">General Knowledge Assistant</option>
            </select>
          </div>

          {/* Model selection */}
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className={`px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-medium ${isDarkMode ? 'bg-[#020617] border-[#334155] text-[#F8FAFC]' : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'}`}
          >
            <option value="gemini-3.7-flash">Gemini 3.7 Flash (Default)</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Analysis)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
          </select>

          {/* Google Search Grounding Toggle */}
          <div className={`flex items-center gap-2 border-l pl-3 ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
            <Globe className={`w-3.5 h-3.5 ${enableSearchGrounding ? 'text-[#0284C7]' : isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`} />
            <span className={`font-medium ${enableSearchGrounding ? 'text-[#0284C7] font-bold' : isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
              Search Grounding
            </span>
            <button 
              type="button"
              onClick={() => setEnableSearchGrounding(!enableSearchGrounding)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enableSearchGrounding ? 'bg-[#0284C7]' : 'bg-[#334155]'}`}
              title="Enable or disable web-based fact-checking for data analysis queries"
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableSearchGrounding ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* High Thinking Mode Toggle */}
          <div className={`flex items-center gap-2 border-l pl-3 ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
            <span className={`font-medium ${thinkingMode ? 'text-[#2563EB]' : isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>Thinking Mode</span>
            <button 
              type="button"
              onClick={() => {
                setThinkingMode(!thinkingMode);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${thinkingMode ? 'bg-[#2563EB]' : 'bg-[#334155]'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${thinkingMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Active File Diagnostic Target Strip */}
      {activeFile && (
        <div className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0] shadow-xs'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`font-bold text-sm ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>{activeFile.name}</h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7]">
                    Active Audit Target
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                    Quality Score: {activeFile.score}%
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
                  {activeFile.rows.length} rows • {activeFile.headers.length} headers • {activeFile.issues.length} issues detected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsMemoryModalOpen(true)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isDarkMode 
                    ? 'bg-[#1E293B] border-[#334155] text-[#93C5FD] hover:bg-[#2563EB] hover:text-white' 
                    : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF] hover:bg-[#DBEAFE]'
                }`}
                title="View persistent workspace intelligence memory"
              >
                <Database className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Workspace Memory</span>
              </button>

              <span className="text-xs font-mono font-bold text-[#1E40AF] bg-[#DBEAFE] px-2.5 py-1 rounded-lg border border-[#93C5FD] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#1E40AF]" />
                7 Specialist Agents Online
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left side Context / Suggestions, Right side Chat Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Specialist Agent Status & Directives */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Agent Banner Card */}
          <div className={`p-6 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0] shadow-xs'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                {selectedAgent === 'auto' ? 'Orchestrator Mode' : 'Specialist Agent Assigned'}
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">Deterministic Tools Linked</span>
            </div>
            
            <h2 className={`text-xl font-bold mt-2 flex items-center gap-2 ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              {selectedAgent === 'data_quality' ? (
                <>
                  <Bot className="w-5 h-5 text-[#2563EB] shrink-0" />
                  <span>Data Quality Specialist</span>
                </>
              ) : selectedAgent === 'data_cleaning' ? (
                <>
                  <Sparkles className="w-5 h-5 text-[#059669] shrink-0" />
                  <span>Data Cleaning Specialist</span>
                </>
              ) : selectedAgent === 'statistical' ? (
                <>
                  <Activity className="w-5 h-5 text-[#7C3AED] shrink-0" />
                  <span>Statistical Analysis Specialist</span>
                </>
              ) : selectedAgent === 'compliance' ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-[#4F46E5] shrink-0" />
                  <span>Compliance & Integrity Specialist</span>
                </>
              ) : selectedAgent === 'business_intelligence' ? (
                <>
                  <BarChart3 className="w-5 h-5 text-[#D97706] shrink-0" />
                  <span>Business Intelligence Specialist</span>
                </>
              ) : selectedAgent === 'product_support' ? (
                <>
                  <HelpCircle className="w-5 h-5 text-[#0891B2] shrink-0" />
                  <span>Product & Technical Support Agent</span>
                </>
              ) : selectedAgent === 'general_knowledge' ? (
                <>
                  <BrainCircuit className="w-5 h-5 text-[#475569] shrink-0" />
                  <span>General Knowledge Assistant</span>
                </>
              ) : (
                <>
                  <Layers className="w-5 h-5 text-[#2563EB] shrink-0" />
                  <span>AI Agent Orchestrator</span>
                </>
              )}
            </h2>

            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
              {selectedAgent === 'data_quality' ? (
                "Directly audits anomaly rates, missing value ratios, duplicate records, schema violations, and data health scores across all columns."
              ) : selectedAgent === 'data_cleaning' ? (
                "Specialized in data transformations, duplicate resolution, date ISO standardization, text normalization, and imputation pipelines."
              ) : selectedAgent === 'statistical' ? (
                "Computes IQR, standard deviation, Z-score outlier boundaries, correlations, and distribution metrics with mathematical rigor."
              ) : selectedAgent === 'compliance' ? (
                "Ensures strict compliance with PII privacy policies (GDPR/HIPAA/CCPA), formula injection safety (=, +, -, @), and regulatory audit trails."
              ) : selectedAgent === 'business_intelligence' ? (
                "Extracts commercial KPIs, revenue velocity, category distributions, transaction trends, and executive actionable insights."
              ) : selectedAgent === 'product_support' ? (
                "Explains CSV Auditor Pro capabilities, cleaning operations, export formats, local privacy protections, and user workflows."
              ) : selectedAgent === 'general_knowledge' ? (
                "Answers broad domain queries, general concepts, programming questions, and technical topics."
              ) : (
                "Automatically classifies your request, routes to the most qualified specialist agent, executes deterministic tools, and coordinates multi-agent collaboration for complex cross-domain queries."
              )}
            </p>
          </div>

          {/* Suggested Prompts for Active Specialist */}
          <div className="space-y-2">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#475569]'}`}>
              <Compass className="w-3.5 h-3.5 text-[#2563EB]" /> Recommended Specialist Prompts
            </span>
            <div className="grid grid-cols-1 gap-2">
              {getSuggestions().map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(sug)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all duration-150 hover:scale-[1.005] active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 group ${isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white' : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] shadow-2xs'}`}
                >
                  <div>
                    <span className="font-bold text-[#2563EB] text-[10px] uppercase block mb-0.5">{sug.label}</span>
                    <span className={`line-clamp-2 leading-relaxed ${isDarkMode ? 'text-[#94A3B8] group-hover:text-[#E2E8F0]' : 'text-[#475569] group-hover:text-[#0F172A]'}`}>{sug.text}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Multi-Agent Conversational Auditor Panel */}
        <div className="lg:col-span-7 flex flex-col justify-between h-[640px]">
          <div className={`p-6 rounded-3xl border flex-1 flex flex-col justify-between overflow-hidden relative ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0] shadow-xs'}`}>
            
            {/* Active Model & Agent Indicator Header */}
            <div className={`flex justify-between items-center border-b border-dashed pb-4 mb-4 ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#334155]'}`}>
                    Enterprise Conversational Auditor
                  </h3>
                  <p className={`text-[10px] mt-0.5 flex items-center gap-1.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                    <span>Agent Mode:</span> 
                    <span className="font-mono font-bold text-[#2563EB] uppercase">
                      {selectedAgent === 'auto' ? 'AI Orchestrator' : selectedAgent.replace('_', ' ')}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[#64748B]">
                      {selectedModel}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {enableSearchGrounding && (
                  <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-md bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5 shrink-0" />
                    Grounding ON
                  </span>
                )}
                {thinkingMode && (
                  <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-md bg-[#F3E8FF] text-[#6B21A8] border border-[#D8B4FE]">
                    Thinking ON
                  </span>
                )}
                <span className="h-2 w-2 rounded-full bg-[#10B981]"></span>
              </div>
            </div>

            {/* Chat message feed */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex gap-3 items-start max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`p-2 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 w-8 h-8 text-white ${msg.role === 'user' ? 'bg-[#2563EB]' : 'bg-[#1E293B]'}`}>
                    {msg.role === 'user' ? 'YOU' : (
                      renderAgentIcon(msg.activeAgent, "w-4 h-4 text-white")
                    )}
                  </div>
                  <div className={`p-3.5 rounded-2xl relative ${msg.role === 'user' ? 'bg-[#2563EB] text-white rounded-tr-none shadow-xs' : isDarkMode ? 'bg-[#1E293B] border border-[#334155] text-[#F8FAFC] rounded-tl-none' : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-tl-none'}`}>
                    
                    {/* Header for Assistant: Primary Agent Badge & Multi-Agent Collaboration Badges */}
                    {msg.role === 'assistant' && (
                      <div className="mb-2.5 pb-2 border-b border-[#334155]/40 flex flex-wrap items-center gap-1.5">
                        
                        {/* Primary Specialist Agent Badge */}
                        {msg.activeAgentName && (
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border uppercase flex items-center gap-1 ${
                            msg.activeAgent === 'data_quality' ? 'bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD]' :
                            msg.activeAgent === 'data_cleaning' ? 'bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7]' :
                            msg.activeAgent === 'statistical' ? 'bg-[#F3E8FF] text-[#6B21A8] border-[#D8B4FE]' :
                            msg.activeAgent === 'compliance' ? 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]' :
                            msg.activeAgent === 'business_intelligence' ? 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]' :
                            msg.activeAgent === 'product_support' ? 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]' :
                            'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
                          }`}>
                            {renderAgentIcon(msg.activeAgent, "w-2.5 h-2.5")}
                            <span>Lead: {msg.activeAgentName}</span>
                          </span>
                        )}

                        {/* Intent Classification Badge */}
                        {msg.intentCategory && !msg.activeAgentName && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border uppercase flex items-center gap-1 bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD]">
                            <Zap className="w-2.5 h-2.5" />
                            <span>{msg.intentCategory.replace('_', ' ')}</span>
                          </span>
                        )}

                        {/* Multi-Agent Collaborator Badges */}
                        {msg.collaboratingAgents && msg.collaboratingAgents.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[8px] font-mono font-bold text-[#64748B] uppercase">Collabs:</span>
                            {msg.collaboratingAgents.map((collab, cIdx) => (
                              <span key={cIdx} className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] flex items-center gap-1">
                                {renderAgentIcon(collab.id, "w-2 h-2")}
                                <span>{collab.name}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Executed Tools Badges */}
                        {msg.executedTools && msg.executedTools.length > 0 && msg.executedTools.map((tName, tIdx) => (
                          <span key={tIdx} className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] flex items-center gap-1">
                            <Bot className="w-2.5 h-2.5" />
                            <span>Tool: {tName}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Chat Content Body */}
                    <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                      {msg.content}
                    </div>

                    {/* Structured Audit Evidence Cards */}
                    {msg.role === 'assistant' && msg.evidenceCollected && msg.evidenceCollected.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#334155]/30 space-y-1.5">
                        <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#059669]" /> Verified Audit Evidence:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {msg.evidenceCollected.map((ev, eIdx) => (
                            <div 
                              key={eIdx}
                              className={`p-2 rounded-lg border text-[10px] ${
                                isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#CBD5E1]' : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#334155]'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-[#2563EB]">{ev.metricLabel}</span>
                                <span className="font-mono font-bold text-[#059669]">{String(ev.metricValue)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[8px] text-[#64748B]">
                                <span>Source: {ev.sourceName}</span>
                                <span>Confidence: {Math.round(ev.confidence * 100)}%</span>
                              </div>
                              {ev.columnsInvolved && ev.columnsInvolved.length > 0 && (
                                <div className="text-[8px] text-[#64748B] truncate mt-0.5">
                                  Columns: {ev.columnsInvolved.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* RAG Grounded Sources & Citations */}
                    {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#334155]/30 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mr-1">Sources:</span>
                        {msg.citations.map((c, idx) => {
                          const cleanLabel = c.label.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                          return (
                            <span 
                              key={idx} 
                              className={`px-2 py-0.5 rounded-md text-[9px] font-mono border flex items-center gap-1 ${
                                c.type === 'doc' ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]' :
                                c.type === 'dataset' ? 'bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7]' :
                                c.type === 'agent' ? 'bg-[#F3E8FF] text-[#6B21A8] border-[#D8B4FE]' :
                                c.type === 'web' ? 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]' :
                                'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
                              }`}
                            >
                              {c.type === 'doc' && <FileSpreadsheet className="w-2.5 h-2.5 text-[#1E40AF] shrink-0" />}
                              {c.type === 'dataset' && <Database className="w-2.5 h-2.5 text-[#065F46] shrink-0" />}
                              {c.type === 'agent' && <Layers className="w-2.5 h-2.5 text-[#6B21A8] shrink-0" />}
                              {c.type === 'web' && <Globe className="w-2.5 h-2.5 text-[#0369A1] shrink-0" />}
                              <span>{cleanLabel}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Enterprise Intelligence Platform (Phase 3 Modules) */}
                    {msg.role === 'assistant' && (
                      <EnterpriseIntelligenceCard
                        confidenceDetails={msg.confidenceDetails}
                        riskAssessment={msg.riskAssessment}
                        recommendations={msg.recommendations}
                        proactiveInsights={msg.proactiveInsights}
                        explainability={msg.explainability}
                        followUpSuggestions={msg.followUpSuggestions}
                        executiveReport={msg.executiveReport}
                        isDarkMode={isDarkMode}
                        onExecutePrompt={(promptText) => {
                          onSendMessage(
                            promptText, 
                            selectedModel, 
                            selectedPersona, 
                            null, 
                            thinkingMode, 
                            enableSearchGrounding, 
                            undefined, 
                            selectedAgent !== 'auto' ? selectedAgent : undefined
                          );
                        }}
                      />
                    )}

                    <div className="mt-2 pt-1 flex items-center justify-between text-[8px] text-[#64748B] font-mono">
                      {msg.role === 'assistant' ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            alert("Response copied to clipboard!");
                          }}
                          className="hover:text-[#2563EB] transition-colors cursor-pointer flex items-center gap-1"
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
                  <div className="p-2 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 w-8 h-8 text-white bg-[#1E293B]">
                    AI
                  </div>
                  <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-[#020617] border border-[#334155] rounded-tl-none' : 'bg-[#F1F5F9] border border-[#E2E8F0] rounded-tl-none text-[#0F172A]'}`}>
                    <div className="flex items-center gap-2 py-1">
                      <Layers className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />
                      <span className="text-xs font-mono text-[#64748B]">Orchestrating specialist agent reasoning...</span>
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
                  className={`mt-4 p-2 rounded-xl border flex items-center justify-between gap-3 ${isDarkMode ? 'bg-[#020617] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={imagePreview} 
                      alt="Attachment preview" 
                      className="w-12 h-12 object-cover rounded-lg border border-[#334155]" 
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-[10px] font-mono text-[#64748B] block">Multimodal Document Screenshot</span>
                      <span className="text-xs font-bold text-[#2563EB] uppercase text-[9px]">Will parse via Vision Model</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={removeAttachedImage}
                    className="p-1 rounded-md hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-all cursor-pointer"
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
                  className="absolute inset-x-6 bottom-20 p-4 rounded-2xl bg-[#881337] border border-[#BE123C] text-white backdrop-blur-md flex items-center justify-between shadow-lg z-25"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
                    <div>
                      <span className="font-bold text-xs uppercase">Microphone Dictation Active</span>
                      <span className="text-[10px] block opacity-80 font-mono">Duration: {recordingSeconds} seconds</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={stopRecording}
                    className="px-3 py-1.5 bg-white text-[#881337] hover:bg-[#FFE4E6] rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Stop & Transcribe
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Input Bar */}
            <form onSubmit={handleSend} className={`mt-4 pt-4 border-t border-dashed flex flex-col gap-2 relative ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
              
              {/* Quick Insight Pills above input box */}
              {activeFile && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-1 scrollbar-none">
                  <span className="text-[10px] font-mono font-bold text-[#D97706] shrink-0 flex items-center gap-1 mr-1">
                    <Zap className="w-3 h-3 text-[#D97706]" /> Quick Insights:
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
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${isRecording ? 'bg-[#E11D48] border-[#BE123C] text-white' : isDarkMode ? 'bg-[#020617] border-[#334155] text-[#94A3B8] hover:text-white' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'}`}
                  title={isRecording ? "Stop recording" : "Dictate from Microphone"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Multimodal Photo Selection Button */}
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${imagePreview ? 'bg-[#2563EB] border-[#1D4ED8] text-white' : isDarkMode ? 'bg-[#020617] border-[#334155] text-[#94A3B8] hover:text-white' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'}`}
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
                  placeholder={isRecording ? "Recording audio voice..." : "Ask: 'why are sales decreasing and what data issues exist?', 'outlier boundaries', 'PII check'..."}
                  className={`flex-1 px-3.5 py-2 rounded-xl text-xs focus:outline-none border ${isDarkMode ? 'bg-[#020617] border-[#334155] text-[#F8FAFC] focus:border-[#2563EB]' : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0F172A] focus:border-[#2563EB]'}`}
                  disabled={isRecording}
                />
                <button 
                  type="submit"
                  disabled={(!userInput.trim() && !attachedImage) || loading || isRecording}
                  className={`p-2.5 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50 ${accentClass}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-[#64748B] font-mono mt-1">
                <Info className="w-3 h-3 text-[#64748B]" />
                <span>Enterprise Agent Orchestrator automatically selects lead and collaborating specialists with tool verification.</span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Workspace Intelligence Memory Manager Modal */}
      <WorkspaceMemoryModal
        workspaceId="org-enterprise-root"
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
