import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  Upload, 
  ShieldCheck, 
  Trash2, 
  MessageSquare, 
  Keyboard, 
  Compass, 
  Play,
  RotateCcw
} from 'lucide-react';

export interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  tabId?: string;
  keyHighlights: string[];
  shortcutHint?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CSV Audit & Hygiene Engine',
    subtitle: 'Enterprise-grade CSV validation & cleaning platform',
    description: 'Welcome! This interactive guide will quickly introduce you to core workflow modules designed to inspect, clean, and standardize messy CSV datasets.',
    badge: 'Step 1 of 6',
    icon: Compass,
    tabId: 'dashboard',
    keyHighlights: [
      'Automated schema type inference & anomaly detection',
      'Instant quality score computation & duplicate detection',
      'Full compliance with enterprise CSV standards'
    ]
  },
  {
    id: 'upload',
    title: 'Upload Center & Drag-and-Drop',
    subtitle: 'Ingest dirty datasets or start with built-in test samples',
    description: 'Upload your raw CSV files here using drag-and-drop or manual selection. You can also load pre-configured messy samples with one click to test the engine immediately.',
    badge: 'Step 2 of 6',
    icon: Upload,
    tabId: 'upload',
    shortcutHint: 'Alt + U',
    keyHighlights: [
      'Supports files up to 25MB with fast browser parsing',
      'Preset dirty samples available for instant testing',
      'Real-time encoding and column detection'
    ]
  },
  {
    id: 'results',
    title: 'Audit Findings & Anomaly Inspector',
    subtitle: 'Granular health score & field-level defect diagnosis',
    description: 'View deep diagnostic reports for active CSV files. Discover missing required fields, email formatting bugs, duplicate records, and data type mismatches with direct cell highlighting.',
    badge: 'Step 3 of 6',
    icon: Sparkles,
    tabId: 'results',
    shortcutHint: 'Alt + R',
    keyHighlights: [
      'Interactive Health Score (0–100%) computation',
      'Filter findings by Severity: Critical, Warning, or Info',
      'Direct cell jumping & quick-fix suggestions'
    ]
  },
  {
    id: 'clean',
    title: 'Hygiene Workspace & Batch Operations',
    subtitle: 'Automated deduplication, regex fixes & transformations',
    description: 'This is your primary cleaning workbench! Clean raw datasets with single-click auto-fixes, strip whitespace, standardize dates, run custom Regex patterns, or apply batch transformations.',
    badge: 'Step 4 of 6',
    icon: Trash2,
    tabId: 'clean',
    shortcutHint: 'Alt + C',
    keyHighlights: [
      'Single & Batch cleaning modes for individual/all issues',
      'Custom Regex builder with live preview testing',
      'Download cleaned CSVs instantly or export clean copy'
    ]
  },
  {
    id: 'insights',
    title: 'AI Intelligence Assistant',
    subtitle: 'Natural language dataset queries powered by Gemini',
    description: 'Ask AI questions about your dataset, request custom JS/Python data transformation scripts, or ask for automated cleaning recommendations using conversational prompts.',
    badge: 'Step 5 of 6',
    icon: MessageSquare,
    tabId: 'insights',
    shortcutHint: 'Alt + I',
    keyHighlights: [
      'AI assistant aware of active file structure & headers',
      'Automated code generation for custom cleaning scripts',
      'Deep insights into data distribution and anomalies'
    ]
  },
  {
    id: 'shortcuts',
    title: 'Power User Keyboard Navigation',
    subtitle: 'Fly through modules with global key combinations',
    description: 'Accelerate your workflow with global keyboard shortcuts! Press Alt + K anytime or type ? when not in an input box to inspect all navigation shortcuts.',
    badge: 'Step 6 of 6',
    icon: Keyboard,
    shortcutHint: 'Alt + K',
    keyHighlights: [
      'Alt + D (Dashboard) • Alt + U (Upload) • Alt + C (Clean)',
      'Alt + R (Findings) • Alt + I (AI Chat) • Alt + O (Settings)',
      'Esc to close open modals instantly'
    ]
  }
];

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  isDarkMode: boolean;
}

export default function OnboardingTourModal({
  isOpen,
  onClose,
  onNavigateTab,
  isDarkMode
}: OnboardingTourModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Auto-navigate to the corresponding tab for the current step
      const step = TOUR_STEPS[currentStepIndex];
      if (step && step.tabId) {
        onNavigateTab(step.tabId);
      }
    }
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_tour_completed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      {/* Dimmed backdrop highlight effect */}
      <motion.div 
        key={currentStep.id}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25 }}
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col relative z-10 ${
          isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Step Top Bar */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono bg-blue-600 text-white shadow-xs">
              {currentStep.badge}
            </span>
            {currentStep.shortcutHint && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-slate-200 border-slate-300 text-blue-700'
              }`}>
                {currentStep.shortcutHint}
              </span>
            )}
          </div>

          <button
            onClick={handleComplete}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Skip Tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tour Body */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shrink-0">
              <StepIcon className="w-7 h-7" />
            </div>

            <div>
              <h3 className={`text-lg font-extrabold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {currentStep.title}
              </h3>
              <p className={`text-xs font-semibold mt-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {currentStep.subtitle}
              </p>
            </div>
          </div>

          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {currentStep.description}
          </p>

          {/* Highlights Checklist */}
          <div className={`p-4 rounded-xl border space-y-2.5 ${
            isDarkMode ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Key Features & Capabilities
            </h4>
            
            <ul className="space-y-2">
              {currentStep.keyHighlights.map((highlight, idx) => (
                <li key={idx} className={`flex items-center gap-2.5 text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Progress & Controls */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDarkMode ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}>
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex 
                    ? 'w-6 bg-blue-500' 
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDarkMode 
                    ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' 
                    : 'border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <span>{isLastStep ? 'Get Started' : 'Next Step'}</span>
              {isLastStep ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
