import React, { useState, useEffect } from 'react';
import { usePersonalization } from '../context/PersonalizationContext';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { DashboardSettings } from './settings/DashboardSettings';
import { SpreadsheetSettings } from './settings/SpreadsheetSettings';
import { AISettings } from './settings/AISettings';
import { CollaborationSettings } from './settings/CollaborationSettings';
import { NotificationSettings } from './settings/NotificationSettings';
import { PrivacySettings } from './settings/PrivacySettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { UploadSettings } from './settings/UploadSettings';
import { ExportSettings } from './settings/ExportSettings';
import { AccessibilitySettings } from './settings/AccessibilitySettings';
import { PerformanceSettings } from './settings/PerformanceSettings';
import { LocalizationSettings } from './settings/LocalizationSettings';
import { ProfileSettings } from './settings/ProfileSettings';
import { AdvancedThemePresets } from './settings/AdvancedThemePresets';

import {
  Palette,
  LayoutGrid,
  Table,
  Bot,
  Users,
  Bell,
  Shield,
  Lock,
  Upload,
  Download,
  Eye,
  Cpu,
  Globe,
  User,
  Sliders,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Keyboard,
  Key,
  Database,
  Mail,
  ShieldAlert,
  Terminal,
  Layers,
} from 'lucide-react';

export interface SettingsViewProps {
  isDarkMode: boolean;
  toggleTheme?: () => void;
  accentClass?: string;
  isOwner?: boolean;
  settings?: any;
  onUpdateSettings?: (newSettings: any) => void;
  geminiKey?: string;
  onSaveGeminiKey?: (key: string) => void;
  [key: string]: any;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkMode,
  isOwner = true,
  geminiKey = '',
  onSaveGeminiKey,
}) => {
  const { saveToast, clearSaveToast, isSaving } = usePersonalization();
  const [activeCategory, setActiveCategory] = useState<string>('appearance');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [keyInput, setKeyInput] = useState<string>(geminiKey);
  const [keySavedMsg, setKeySavedMsg] = useState<string>('');

  // Handle Ctrl + , shortcut notice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        const searchElem = document.getElementById('settings-search-input');
        if (searchElem) searchElem.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = [
    { id: 'appearance', label: 'Appearance & Themes', icon: Palette, desc: 'Deep Black OLED, Light/Dark, Accent Colors' },
    { id: 'dashboard', label: 'Dashboard Personalization', icon: LayoutGrid, desc: 'Drag-and-Drop Widgets, Layouts' },
    { id: 'spreadsheet', label: 'Spreadsheet Workspace', icon: Table, desc: 'Gridlines, Zebra Striping, Zoom' },
    { id: 'ai', label: 'AI Assistant & Models', icon: Bot, desc: 'Gemini 2.5 Flash/Pro, General Q&A' },
    { id: 'collaboration', label: 'Team Collaboration', icon: Users, desc: 'Typing Indicators, Read Receipts, Chat' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email Alerts, Sounds, Quiet Hours' },
    { id: 'privacy', label: 'Data Privacy & PII', icon: Shield, desc: 'Auto-Retention, Mask Emails/Phones' },
    { id: 'security', label: 'Security & Auth', icon: Lock, desc: '2FA, Active Sessions, Passwords' },
    { id: 'upload', label: 'File Upload Defaults', icon: Upload, desc: 'Encoding, Delimiters, Date Formats' },
    { id: 'export', label: 'Export Preferences', icon: Download, desc: 'PDF Reports, Watermarks, Logos' },
    { id: 'accessibility', label: 'Accessibility & Dyslexia', icon: Eye, desc: 'High Contrast, OpenDyslexic Font' },
    { id: 'performance', label: 'Performance & RAM', icon: Cpu, desc: 'GPU Rendering, Sub-100MB RAM Mode' },
    { id: 'localization', label: 'Localization & Language', icon: Globe, desc: 'Language, Timezone, Currencies' },
    { id: 'profile', label: 'User Profile', icon: User, desc: 'Avatar, Job Title, Organization' },
    { id: 'advanced', label: 'Theme Builder & Presets', icon: Sliders, desc: 'Workspace Presets, JSON Backup' },
  ];

  const filteredCategories = categories.filter(
    (c) =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveGeminiKey) {
      onSaveGeminiKey(keyInput);
      setKeySavedMsg('Gemini API key saved securely!');
      setTimeout(() => setKeySavedMsg(''), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Toast Notification Banner */}
      {saveToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-md animate-fadeIn ${
            saveToast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : saveToast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-blue-600 text-white border-blue-500'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-bold leading-snug flex-1">{saveToast.message}</span>
          <button type="button" onClick={clearSaveToast} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Search */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Enterprise SaaS Customization Center
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                <Keyboard className="w-3.5 h-3.5" /> Shortcut: Ctrl + ,
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Personalization & Customization Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Tailor application appearance, dark/light themes, custom brand accent colors, spreadsheet grid behavior, AI models, and workspace rules.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="settings-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 15 categories..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* API Key Banner if owner */}
        {isOwner ? (
          <form onSubmit={handleSaveApiKey} className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Key className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">Master Gemini API Key:</span>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono w-full sm:w-64 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {keySavedMsg && <span className="text-xs font-bold text-emerald-500">{keySavedMsg}</span>}
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all"
              >
                Save Key
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Master API Key configuration is restricted to primary workspace owners.</span>
          </div>
        )}
      </div>

      {/* Master 15 Category Sidebar & Settings Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Category Sidebar */}
        <div className="lg:col-span-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Categories ({filteredCategories.length})
          </div>

          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                    <div className="truncate">
                      <span className="font-bold text-xs block truncate">{cat.label}</span>
                      <span className={`text-[10px] block truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                        {cat.desc}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Settings Detail Panel */}
        <div className="lg:col-span-9 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-h-[600px]">
          {activeCategory === 'appearance' && <AppearanceSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'dashboard' && <DashboardSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'spreadsheet' && <SpreadsheetSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'ai' && <AISettings isDarkMode={isDarkMode} isOwner={isOwner} />}
          {activeCategory === 'collaboration' && <CollaborationSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'notifications' && <NotificationSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'privacy' && <PrivacySettings isDarkMode={isDarkMode} />}
          {activeCategory === 'security' && <SecuritySettings isDarkMode={isDarkMode} isOwner={isOwner} />}
          {activeCategory === 'upload' && <UploadSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'export' && <ExportSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'accessibility' && <AccessibilitySettings isDarkMode={isDarkMode} />}
          {activeCategory === 'performance' && <PerformanceSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'localization' && <LocalizationSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'profile' && <ProfileSettings isDarkMode={isDarkMode} />}
          {activeCategory === 'advanced' && <AdvancedThemePresets isDarkMode={isDarkMode} />}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
