import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useAssistant } from '../../context/AssistantContext';

interface FloatingAssistantButtonProps {
  isDarkMode: boolean;
  accentClass?: string;
}

export const FloatingAssistantButton: React.FC<FloatingAssistantButtonProps> = ({
  isDarkMode,
  accentClass = 'bg-blue-600 hover:bg-blue-700'
}) => {
  const { isOpen, toggleAssistant, datasetContext } = useAssistant();

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40"
    >
      <button
        id="btn-floating-assistant-toggle"
        onClick={toggleAssistant}
        aria-label={isOpen ? 'Close CSV Auditor AI' : 'Open CSV Auditor AI'}
        aria-expanded={isOpen}
        title={isOpen ? 'Close CSV Auditor AI' : 'Open CSV Auditor AI (Ask anything about your data)'}
        className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          isOpen
            ? isDarkMode
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-slate-800 hover:bg-slate-900 text-white'
            : isDarkMode
              ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/40'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
            {datasetContext && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900" />
            )}
          </div>
        )}
      </button>
    </motion.div>
  );
};
