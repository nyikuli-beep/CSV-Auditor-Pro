import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, X, Search, Navigation, Zap, Command, CornerDownLeft, Sparkles } from 'lucide-react';

export interface ShortcutItem {
  keyCombo: string;
  keys: string[];
  description: string;
  tabId?: string;
  category: 'navigation' | 'actions' | 'system';
  action?: () => void;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onToggleTheme: () => void;
  onOpenProfileUpload: () => void;
  isDarkMode: boolean;
  isAdmin: boolean;
}

export const SHORTCUTS_DEF: Omit<ShortcutItem, 'action'>[] = [
  // Navigation
  { keyCombo: 'Alt + D', keys: ['Alt', 'D'], description: 'Navigate to Dashboard Home', tabId: 'dashboard', category: 'navigation' },
  { keyCombo: 'Alt + U', keys: ['Alt', 'U'], description: 'Navigate to Upload Center', tabId: 'upload', category: 'navigation' },
  { keyCombo: 'Alt + S', keys: ['Alt', 'S'], description: 'Navigate to Schema Validator', tabId: 'schema', category: 'navigation' },
  { keyCombo: 'Alt + R', keys: ['Alt', 'R'], description: 'Navigate to Audit Findings', tabId: 'results', category: 'navigation' },
  { keyCombo: 'Alt + C', keys: ['Alt', 'C'], description: 'Navigate to Hygiene Workspace', tabId: 'clean', category: 'navigation' },
  { keyCombo: 'Alt + I', keys: ['Alt', 'I'], description: 'Navigate to AI Intelligence', tabId: 'insights', category: 'navigation' },
  { keyCombo: 'Alt + G', keys: ['Alt', 'G'], description: 'Navigate to Gmail Compliance', tabId: 'gmail', category: 'navigation' },
  { keyCombo: 'Alt + P', keys: ['Alt', 'P'], description: 'Navigate to Branded Reports', tabId: 'reports', category: 'navigation' },
  { keyCombo: 'Alt + H', keys: ['Alt', 'H'], description: 'Navigate to File Archive', tabId: 'history', category: 'navigation' },
  { keyCombo: 'Alt + T', keys: ['Alt', 'T'], description: 'Navigate to Team Tenancy', tabId: 'team', category: 'navigation' },
  { keyCombo: 'Alt + A', keys: ['Alt', 'A'], description: 'Navigate to Admin Panel', tabId: 'admin', category: 'navigation' },
  { keyCombo: 'Alt + O', keys: ['Alt', 'O'], description: 'Navigate to API & Settings', tabId: 'settings', category: 'navigation' },

  // Actions & System
  { keyCombo: 'Alt + K', keys: ['Alt', 'K'], description: 'Toggle Keyboard Shortcuts Guide', category: 'actions' },
  { keyCombo: '?', keys: ['?'], description: 'Show Keyboard Shortcuts (when not typing)', category: 'actions' },
  { keyCombo: 'Alt + Shift + P', keys: ['Alt', 'Shift', 'P'], description: 'Open Profile Picture Uploader', category: 'actions' },
  { keyCombo: 'Alt + Shift + L', keys: ['Alt', 'Shift', 'L'], description: 'Toggle Light / Dark Mode', category: 'system' },
  { keyCombo: 'Esc', keys: ['Esc'], description: 'Close Modals & Popups', category: 'system' },
];

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
  onNavigate,
  onToggleTheme,
  onOpenProfileUpload,
  isDarkMode,
  isAdmin
}: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'navigation' | 'actions' | 'system'>('all');

  if (!isOpen) return null;

  const filteredShortcuts = SHORTCUTS_DEF.filter(s => {
    if (s.tabId === 'admin' && !isAdmin) return false;
    
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch = s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.keyCombo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleShortcutClick = (shortcut: Omit<ShortcutItem, 'action'>) => {
    if (shortcut.tabId) {
      onNavigate(shortcut.tabId);
      onClose();
    } else if (shortcut.keyCombo === 'Alt + Shift + P') {
      onOpenProfileUpload();
      onClose();
    } else if (shortcut.keyCombo === 'Alt + Shift + L') {
      onToggleTheme();
      onClose();
    } else if (shortcut.keyCombo === 'Alt + K' || shortcut.keyCombo === '?') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                Global Keyboard Shortcuts
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                  Power User
                </span>
              </h2>
              <p className="text-xs text-slate-400">Use key combinations to navigate instantly from anywhere</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-6 border-b border-slate-800/60 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className={`relative flex-1 w-full ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'} rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shortcuts by key or description..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-transparent focus:outline-none"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All' },
                { id: 'navigation', label: 'Navigation' },
                { id: 'actions', label: 'Actions' },
                { id: 'system', label: 'System' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-2">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No shortcuts found matching "{searchQuery}"
            </div>
          ) : (
            filteredShortcuts.map((shortcut) => (
              <div 
                key={shortcut.keyCombo}
                onClick={() => handleShortcutClick(shortcut)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all cursor-pointer group ${
                  isDarkMode 
                    ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700' 
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    shortcut.category === 'navigation' ? 'bg-blue-500/10 text-blue-400' :
                    shortcut.category === 'actions' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {shortcut.category === 'navigation' && <Navigation className="w-4 h-4" />}
                    {shortcut.category === 'actions' && <Zap className="w-4 h-4" />}
                    {shortcut.category === 'system' && <Command className="w-4 h-4" />}
                  </div>

                  <div>
                    <p className={`text-xs font-bold transition-colors group-hover:text-blue-500 ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                      {shortcut.description}
                    </p>
                    <p className={`text-[10px] uppercase font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Category: {shortcut.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {shortcut.keys.map((k, idx) => (
                    <React.Fragment key={idx}>
                      <kbd className={`px-2.5 py-1 text-xs font-mono font-extrabold rounded-md border shadow-xs ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-700 text-slate-200 group-hover:border-blue-500' 
                          : 'bg-white border-slate-300 text-slate-800 group-hover:border-blue-500'
                      }`}>
                        {k}
                      </kbd>
                      {idx < shortcut.keys.length - 1 && (
                        <span className="text-xs text-slate-500 font-bold">+</span>
                      )}
                    </React.Fragment>
                  ))}
                  
                  {shortcut.tabId && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between text-xs ${
          isDarkMode ? 'border-slate-800 bg-slate-900/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <div className="flex items-center gap-2 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Tip: Press <kbd className="px-1.5 py-0.5 font-mono text-[10px] font-bold rounded bg-slate-800 border border-slate-700 text-slate-200">Alt</kbd> + <kbd className="px-1.5 py-0.5 font-mono text-[10px] font-bold rounded bg-slate-800 border border-slate-700 text-slate-200">K</kbd> anytime to toggle this modal.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all cursor-pointer"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </div>
  );
}
