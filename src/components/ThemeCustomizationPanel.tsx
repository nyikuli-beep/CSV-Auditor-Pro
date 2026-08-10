import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Layout,
  Type,
  Sliders,
  Sparkles,
  Check,
  RotateCcw,
  Download,
  Upload,
  Eye,
  Table,
  Maximize2,
  Minimize2,
  Square,
  CheckSquare,
  Shield,
  Activity,
  Info,
  X,
  Layers,
  FileCode,
  ArrowRight,
  SlidersHorizontal,
  MousePointer,
  Zap,
  Grid,
  Laptop
} from 'lucide-react';
import {
  ThemeCustomization,
  ThemePreset,
  AccentColor,
  ContrastLevel,
  FontSize,
  UIThicknessDensity,
  CornerRadius,
  SidebarWidthOption,
  AnimationSpeed,
  DashboardCardStyle,
  SystemSettings
} from '../types';
import {
  DEFAULT_THEME_CUSTOMIZATION,
  THEME_PRESETS,
  ACCENT_COLORS,
  exportThemeJSON,
  importThemeJSON,
  applyThemeToDocument
} from '../lib/themeEngine';

interface ThemeCustomizationPanelProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  accentClass: string;
}

export default function ThemeCustomizationPanel({
  settings,
  onUpdateSettings,
  isDarkMode,
  toggleTheme,
  accentClass
}: ThemeCustomizationPanelProps) {
  // Extract themeCustomization with fallback to DEFAULT_THEME_CUSTOMIZATION
  const customization: ThemeCustomization = {
    ...DEFAULT_THEME_CUSTOMIZATION,
    ...(settings.themeCustomization || {}),
    tablePrefs: {
      ...DEFAULT_THEME_CUSTOMIZATION.tablePrefs,
      ...(settings.themeCustomization?.tablePrefs || {})
    },
    accessibility: {
      ...DEFAULT_THEME_CUSTOMIZATION.accessibility,
      ...(settings.themeCustomization?.accessibility || {})
    }
  };

  const [activeTab, setActiveTab] = useState<'presets' | 'layout' | 'tables' | 'animations' | 'accessibility' | 'import-export'>('presets');
  const [testActive, setTestActive] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to update customization state
  const updateCustomization = (updated: Partial<ThemeCustomization>) => {
    const nextCustomization: ThemeCustomization = {
      ...customization,
      ...updated
    };

    // Apply live to DOM
    applyThemeToDocument(nextCustomization, isDarkMode);

    // Save into SystemSettings
    onUpdateSettings({
      ...settings,
      themeCustomization: nextCustomization,
      accentColor: nextCustomization.accentColor || settings.accentColor
    });
  };

  // Update preset
  const handleSelectPreset = (presetKey: ThemePreset) => {
    const presetObj = THEME_PRESETS[presetKey];
    updateCustomization({
      preset: presetKey
    });
    showToast(`Theme preset set to "${presetObj.name}"`);
  };

  // Update accent color
  const handleSelectAccent = (accentKey: AccentColor) => {
    const accentObj = ACCENT_COLORS[accentKey];
    updateCustomization({
      accentColor: accentKey
    });
    showToast(`Accent color updated to ${accentObj.name}`);
  };

  // Reset theme to defaults
  const handleResetToDefault = () => {
    applyThemeToDocument(DEFAULT_THEME_CUSTOMIZATION, isDarkMode);
    onUpdateSettings({
      ...settings,
      themeCustomization: DEFAULT_THEME_CUSTOMIZATION,
      accentColor: 'blue'
    });
    showToast('Theme preferences reset to Default Dark Slate.');
  };

  // Export JSON file download
  const handleExportTheme = () => {
    const jsonStr = exportThemeJSON(customization);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csv-auditor-theme-${customization.preset || 'custom'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Theme configuration JSON exported successfully!');
  };

  // Handle JSON file import upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const imported = importThemeJSON(content);
        if (imported) {
          updateCustomization(imported);
          setShowImportModal(false);
          setImportJsonText('');
          setImportError(null);
          showToast('Imported and applied theme configuration!');
        } else {
          setImportError('Invalid JSON format or incompatible theme schema.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Handle manual JSON paste import
  const handlePasteImport = () => {
    if (!importJsonText.trim()) {
      setImportError('Please paste theme JSON content.');
      return;
    }
    const imported = importThemeJSON(importJsonText);
    if (imported) {
      updateCustomization(imported);
      setShowImportModal(false);
      setImportJsonText('');
      setImportError(null);
      showToast('Custom theme imported and applied!');
    } else {
      setImportError('Could not parse theme JSON. Ensure it matches theme schema.');
    }
  };

  // Card Style styling class getter for preview
  const getCardStyleClass = (style: DashboardCardStyle) => {
    switch (style) {
      case 'flat':
        return isDarkMode ? 'bg-[#111827] border-0' : 'bg-white border-0';
      case 'elevated':
        return isDarkMode ? 'bg-[#111827] border border-slate-800 shadow-xl' : 'bg-white border border-slate-200 shadow-lg';
      case 'outlined':
        return isDarkMode ? 'bg-[#111827] border border-slate-700/80 shadow-xs' : 'bg-white border border-slate-300 shadow-xs';
      case 'glass':
        return isDarkMode ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-md' : 'bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-md';
      default:
        return isDarkMode ? 'bg-[#111827] border border-slate-800' : 'bg-white border-slate-200';
    }
  };

  // Radius class getter
  const getRadiusClass = (radius: CornerRadius) => {
    switch (radius) {
      case 'sharp': return 'rounded-none';
      case 'small': return 'rounded-md';
      case 'medium': return 'rounded-xl';
      case 'large': return 'rounded-2xl';
      default: return 'rounded-xl';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-5 right-5 z-50 p-3.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xl flex items-center gap-2 border border-blue-400"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Card */}
      <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-6`}>
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800/20">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-extrabold text-base ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  Enterprise Theme & Appearance Customization
                </h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Customize color palettes, typography scaling, tables, card depth, accessibility and layout preferences across your workspace.
                </p>
              </div>
            </div>
          </div>

          {/* Top Quick Actions: Export, Import, Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportTheme}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Export Theme JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Import Theme JSON"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-rose-400 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 text-rose-600 hover:bg-slate-100'
              }`}
              title="Reset theme to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800/10">
          {[
            { id: 'presets', label: 'Presets & Color Accents', icon: Palette },
            { id: 'layout', label: 'Typography & Layout Density', icon: Layout },
            { id: 'tables', label: 'Data Tables & Cards', icon: Table },
            { id: 'animations', label: 'Animations & Motion', icon: Zap },
            { id: 'accessibility', label: 'Accessibility', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: PRESETS & ACCENT COLOR */}
        {activeTab === 'presets' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Built-in Theme Presets */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  1. Built-in Enterprise Theme Presets
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">5 Dark Themes • 1 Light Corporate</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(THEME_PRESETS).map((preset) => {
                  const isSelected = customization.preset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/5 shadow-md'
                          : isDarkMode
                          ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3 right-3 p-1 rounded-full bg-blue-600 text-white shadow">
                          <Check className="w-3 h-3" />
                        </span>
                      )}

                      <h4 className={`font-extrabold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {preset.name}
                      </h4>
                      <p className={`text-[10px] mt-1 leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {preset.description}
                      </p>

                      {/* Swatch Strip */}
                      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/20">
                        <span className="w-5 h-5 rounded-md border border-slate-700/50 shadow-xs" style={{ backgroundColor: preset.bgMain }} title={`Main BG: ${preset.bgMain}`} />
                        <span className="w-5 h-5 rounded-md border border-slate-700/50 shadow-xs" style={{ backgroundColor: preset.bgSidebar }} title={`Sidebar: ${preset.bgSidebar}`} />
                        <span className="w-5 h-5 rounded-md border border-slate-700/50 shadow-xs" style={{ backgroundColor: preset.bgCard }} title={`Card BG: ${preset.bgCard}`} />
                        <span className="w-5 h-5 rounded-md border border-slate-700/50 shadow-xs" style={{ backgroundColor: preset.primaryBtn }} title={`Accent: ${preset.primaryBtn}`} />
                        <span className="w-5 h-5 rounded-md border border-slate-700/50 shadow-xs" style={{ backgroundColor: preset.textPrimary }} title={`Text: ${preset.textPrimary}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accent Color Palette Selector */}
            <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  2. Accent Color Palette
                </h3>
                <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Updates buttons, active items, links, progress bars & highlights
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {Object.values(ACCENT_COLORS).slice(0, 7).map((accent) => {
                  const isSelected = customization.accentColor === accent.id;
                  return (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() => handleSelectAccent(accent.id)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-center flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                          : isDarkMode
                          ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full border border-white/20 shadow-xs shrink-0 flex items-center justify-center" style={{ backgroundColor: accent.hex }}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </span>
                      <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {accent.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Follow Operating System Theme Option */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    Automatically Follow OS System Theme
                  </h4>
                  <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Detect device dark/light mode preference automatically while retaining custom accent and card configurations.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={customization.followSystemTheme}
                  onChange={(e) => updateCustomization({ followSystemTheme: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

          </div>
        )}

        {/* TAB 2: TYPOGRAPHY, CONTRAST & DENSITY */}
        {activeTab === 'layout' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Contrast Level & Font Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Contrast Controls */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" /> Contrast Control
                </h3>
                <p className={`text-[10px] mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Adjust text brightness, border visibility and panel depth.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as ContrastLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateCustomization({ contrast: lvl })}
                      className={`py-2 px-3 rounded-lg text-xs font-bold capitalize border transition-all cursor-pointer ${
                        customization.contrast === lvl
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {lvl} Contrast
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Selector */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Type className="w-3.5 h-3.5 text-emerald-400" /> Font Size Scaling
                </h3>
                <p className={`text-[10px] mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Scale global body typography while maintaining design ratios.
                </p>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'small', label: 'Small' },
                    { id: 'default', label: 'Default' },
                    { id: 'large', label: 'Large' },
                    { id: 'extra-large', label: 'XL' }
                  ].map((sizeObj) => (
                    <button
                      key={sizeObj.id}
                      type="button"
                      onClick={() => updateCustomization({ fontSize: sizeObj.id as FontSize })}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                        customization.fontSize === sizeObj.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {sizeObj.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Layout Density & Sidebar Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Density Options */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Grid className="w-3.5 h-3.5 text-purple-400" /> UI Density & Spacing
                </h3>
                <p className={`text-[10px] mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Adjust padding across cards, forms, tables and widgets.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'comfortable', 'spacious'] as UIThicknessDensity[]).map((den) => (
                    <button
                      key={den}
                      type="button"
                      onClick={() => updateCustomization({ density: den })}
                      className={`py-2 px-3 rounded-lg text-xs font-bold capitalize border transition-all cursor-pointer ${
                        customization.density === den
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {den}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Width Options */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Layout className="w-3.5 h-3.5 text-cyan-400" /> Sidebar Width & Layout
                </h3>
                <p className={`text-[10px] mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Choose sidebar width preference for desktop screens.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact', label: 'Compact (13rem)' },
                    { id: 'default', label: 'Default (16rem)' },
                    { id: 'expanded', label: 'Expanded (18rem)' },
                  ].map((side) => (
                    <button
                      key={side.id}
                      type="button"
                      onClick={() => updateCustomization({ sidebarWidth: side.id as SidebarWidthOption })}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                        customization.sidebarWidth === side.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {side.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: DATA TABLES & CARDS */}
        {activeTab === 'tables' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Dashboard Card Style */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Dashboard Cards Style
              </h3>
              <p className={`text-[10px] mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Select surface appearance for cards and workspace modules.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'flat', label: 'Flat', desc: 'No shadow, borderless clean background' },
                  { id: 'elevated', label: 'Elevated', desc: 'Soft drop shadows with medium depth' },
                  { id: 'outlined', label: 'Outlined', desc: 'Crisp hairline borders with minimal shadow' },
                  { id: 'glass', label: 'Glassmorphism', desc: 'Subtle translucent backdrop blur effect' },
                ].map((cardObj) => (
                  <button
                    key={cardObj.id}
                    type="button"
                    onClick={() => updateCustomization({ cardStyle: cardObj.id as DashboardCardStyle })}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      customization.cardStyle === cardObj.id
                        ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                        : isDarkMode
                        ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-xs font-extrabold block ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {cardObj.label}
                    </span>
                    <span className={`text-[10px] mt-1 block leading-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cardObj.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Radius Controls */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Square className="w-3.5 h-3.5 text-blue-400" /> Corner Radius
              </h3>
              <p className={`text-[10px] mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Applies consistently to cards, buttons, inputs, dialogs and menus.
              </p>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'sharp', label: 'Sharp (0px)' },
                  { id: 'small', label: 'Small (6px)' },
                  { id: 'medium', label: 'Medium (12px)' },
                  { id: 'large', label: 'Large (20px)' },
                ].map((radObj) => (
                  <button
                    key={radObj.id}
                    type="button"
                    onClick={() => updateCustomization({ cornerRadius: radObj.id as CornerRadius })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                      customization.cornerRadius === radObj.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : isDarkMode
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {radObj.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data Table Preferences */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-4`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Table className="w-3.5 h-3.5 text-emerald-400" /> CSV Data Table Display Preferences
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* Row Striping */}
                <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Zebra Row Striping</span>
                  <input
                    type="checkbox"
                    checked={customization.tablePrefs.stripedRows}
                    onChange={(e) => updateCustomization({
                      tablePrefs: { ...customization.tablePrefs, stripedRows: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                </label>

                {/* Hover Highlight */}
                <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Row Hover Highlight</span>
                  <input
                    type="checkbox"
                    checked={customization.tablePrefs.hoverHighlight}
                    onChange={(e) => updateCustomization({
                      tablePrefs: { ...customization.tablePrefs, hoverHighlight: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                </label>

                {/* Grid Lines */}
                <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Cell Grid Lines</span>
                  <input
                    type="checkbox"
                    checked={customization.tablePrefs.gridLines}
                    onChange={(e) => updateCustomization({
                      tablePrefs: { ...customization.tablePrefs, gridLines: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                </label>

                {/* Sticky Header */}
                <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Sticky Column Headers</span>
                  <input
                    type="checkbox"
                    checked={customization.tablePrefs.stickyHeader}
                    onChange={(e) => updateCustomization({
                      tablePrefs: { ...customization.tablePrefs, stickyHeader: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                </label>

                {/* Table Row Density */}
                <div className={`p-3 rounded-lg border col-span-1 sm:col-span-2 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className={`text-xs font-bold block mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Table Row Padding</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['compact', 'comfortable', 'spacious'] as UIThicknessDensity[]).map((rowDen) => (
                      <button
                        key={rowDen}
                        type="button"
                        onClick={() => updateCustomization({
                          tablePrefs: { ...customization.tablePrefs, rowDensity: rowDen }
                        })}
                        className={`py-1 px-2 rounded text-[11px] font-bold capitalize border cursor-pointer ${
                          customization.tablePrefs.rowDensity === rowDen
                            ? 'bg-blue-600 text-white border-blue-500'
                            : isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-400'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {rowDen}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 4: ANIMATIONS & MOTION CONTROL */}
        {activeTab === 'animations' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Master Animations Control Card */}
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-800/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-extrabold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      Global Motion & Animation Engine
                    </h3>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Controls interface transition speeds globally using the <code className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px] border border-blue-500/20">--app-animation-speed</code> CSS variable.
                    </p>
                  </div>
                </div>

                {/* CSS Variable Status Badge */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`text-[10px] font-mono px-3 py-1 rounded-full border font-bold ${
                    customization.animations === 'disabled'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    Speed: {
                      customization.animations === 'minimal' ? '0.1s (Minimal)' :
                      customization.animations === 'normal' ? '0.25s (Normal)' :
                      customization.animations === 'enhanced' ? '0.4s (Enhanced)' : '0s (Disabled)'
                    }
                  </span>
                </div>
              </div>

              {/* Disable All Animations Master Toggle */}
              <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                customization.animations === 'disabled'
                  ? isDarkMode ? 'bg-rose-950/20 border-rose-800/50' : 'bg-rose-50 border-rose-200'
                  : isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    customization.animations === 'disabled'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      Disable All Animations (Max Performance)
                    </h4>
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Instantly turns off all transition effects, UI motion, and parallax across the app for zero motion sensitivity and maximum responsiveness.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={customization.animations === 'disabled'}
                    onChange={(e) => {
                      const isDisabled = e.target.checked;
                      updateCustomization({
                        animations: isDisabled ? 'disabled' : 'normal',
                        accessibility: {
                          ...customization.accessibility,
                          reducedMotion: isDisabled
                        }
                      });
                      showToast(isDisabled ? 'All animations disabled for max performance' : 'Animations restored to Normal (0.25s)');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {/* Animation Speed Presets */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Animation Speed Presets
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'minimal',
                      label: 'Minimal Preset',
                      speed: '0.1s',
                      desc: 'Fast, brisk micro-interactions with immediate feedback. Ideal for rapid data workflows.'
                    },
                    {
                      id: 'normal',
                      label: 'Normal Preset',
                      speed: '0.25s',
                      desc: 'Balanced, smooth motion curve providing natural context without slowing down navigation.'
                    },
                    {
                      id: 'enhanced',
                      label: 'Enhanced Preset',
                      speed: '0.4s',
                      desc: 'Fluid, expressive transitions with rich visual spatial awareness.'
                    },
                  ].map((preset) => {
                    const isSelected = customization.animations === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          updateCustomization({
                            animations: preset.id as AnimationSpeed,
                            accessibility: {
                              ...customization.accessibility,
                              reducedMotion: false
                            }
                          });
                          showToast(`Animation speed set to ${preset.label} (${preset.speed})`);
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 shadow-md'
                            : isDarkMode
                            ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-extrabold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {preset.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {preset.speed}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {preset.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Motion Test Bench */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <h4 className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      Interactive Motion Test Bench
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestActive(!testActive)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors"
                  >
                    {testActive ? 'Collapse Test Panel' : 'Trigger Motion Test'}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Interactive Element</span>
                    <span>CSS Transition: var(--app-animation-speed)</span>
                  </div>

                  <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                    testActive
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200 translate-x-2'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        testActive ? 'bg-blue-500 text-white scale-110 rotate-12' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">Dynamic Motion State</span>
                        <span className="text-[10px] text-slate-400 block">
                          Current status: {testActive ? 'Active (Translated + Rotated)' : 'Idle (Default)'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 border border-slate-700">
                      {customization.animations === 'disabled' ? '0s (Disabled)' : customization.animations === 'minimal' ? '0.1s' : customization.animations === 'normal' ? '0.25s' : '0.4s'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 5: ACCESSIBILITY */}
        {activeTab === 'accessibility' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Accessibility Options */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> WCAG Accessibility Enhancements
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* High Contrast */}
                <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div>
                    <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>High Contrast Mode</span>
                    <span className="text-[10px] text-slate-400 block">Enforces sharp border outlines and contrast ratios</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customization.accessibility.highContrast}
                    onChange={(e) => updateCustomization({
                      accessibility: { ...customization.accessibility, highContrast: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                </label>

                {/* Keyboard Focus Indicators */}
                <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div>
                    <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Keyboard Focus Rings</span>
                    <span className="text-[10px] text-slate-400 block">Highlights active element focus during Tab key navigation</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customization.accessibility.keyboardFocusIndicators}
                    onChange={(e) => updateCustomization({
                      accessibility: { ...customization.accessibility, keyboardFocusIndicators: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                </label>

                {/* Reduced Motion */}
                <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div>
                    <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Reduced Motion</span>
                    <span className="text-[10px] text-slate-400 block">Suppresses parallax and sliding page animations</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customization.accessibility.reducedMotion}
                    onChange={(e) => updateCustomization({
                      accessibility: { ...customization.accessibility, reducedMotion: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                </label>

                {/* Larger Click Targets */}
                <label className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div>
                    <span className={`text-xs font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Larger Touch Targets</span>
                    <span className="text-[10px] text-slate-400 block">Increases button and toggle min-height to 44px</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customization.accessibility.largerClickTargets}
                    onChange={(e) => updateCustomization({
                      accessibility: { ...customization.accessibility, largerClickTargets: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer"
                  />
                </label>

              </div>
            </div>

          </div>
        )}

        {/* LIVE THEME PREVIEW CONTAINER */}
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-300'} space-y-4`}>
          <div className="flex items-center justify-between border-b pb-2 border-slate-800/20">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <h3 className={`text-xs font-extrabold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Live Interactive Theme Preview
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Real-time Token Engine
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Column: Sample Card & Buttons */}
            <div className="lg:col-span-5 space-y-3">
              
              {/* Sample Card */}
              <div className={`p-4 ${getCardStyleClass(customization.cardStyle)} ${getRadiusClass(customization.cornerRadius)} space-y-3 transition-all`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500" /> Sample Audit Metric
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">98.4% Quality</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Audit Data Pipeline</span>
                    <span>1,420 rows</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full w-4/5" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/30">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-transform cursor-pointer ${accentClass}`}
                  >
                    Primary Action
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    Secondary
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white cursor-pointer"
                  >
                    Success
                  </button>
                </div>
              </div>

              {/* Sample Inputs */}
              <div className={`p-3 ${getCardStyleClass(customization.cardStyle)} ${getRadiusClass(customization.cornerRadius)} space-y-2`}>
                <label className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">Sample Input Field</label>
                <input
                  type="text"
                  readOnly
                  value="finance_q3_report_v2.csv"
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>

            </div>

            {/* Right Column: Sample Data Table */}
            <div className="lg:col-span-7">
              <div className={`p-4 ${getCardStyleClass(customization.cardStyle)} ${getRadiusClass(customization.cornerRadius)} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-emerald-400" /> Data Table Preview
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Density: {customization.tablePrefs.rowDensity}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-800/60">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className={`border-b border-slate-800 ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                        <th className="p-2 font-bold">ID</th>
                        <th className="p-2 font-bold">Filename</th>
                        <th className="p-2 font-bold">Rows</th>
                        <th className="p-2 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'CSV-101', name: 'transactions_2026.csv', rows: 450, status: 'Cleaned' },
                        { id: 'CSV-102', name: 'customer_leads.csv', rows: 1200, status: 'Audited' },
                        { id: 'CSV-103', name: 'inventory_master.csv', rows: 890, status: 'Flagged' },
                      ].map((row, idx) => {
                        const isEven = idx % 2 === 0;
                        const rowBg = customization.tablePrefs.stripedRows
                          ? isEven
                            ? isDarkMode ? 'bg-slate-950/60' : 'bg-slate-50/50'
                            : isDarkMode ? 'bg-slate-900/30' : 'bg-white'
                          : isDarkMode ? 'bg-slate-900/40' : 'bg-white';

                        const borderClass = customization.tablePrefs.gridLines ? 'border border-slate-800/40' : 'border-b border-slate-800/20';

                        return (
                          <tr
                            key={row.id}
                            className={`${rowBg} ${customization.tablePrefs.hoverHighlight ? 'hover:bg-blue-500/10' : ''}`}
                          >
                            <td className={`p-2 font-mono ${borderClass}`}>{row.id}</td>
                            <td className={`p-2 font-semibold ${borderClass}`}>{row.name}</td>
                            <td className={`p-2 font-mono ${borderClass}`}>{row.rows}</td>
                            <td className={`p-2 ${borderClass}`}>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                row.status === 'Cleaned' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                row.status === 'Audited' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* IMPORT JSON MODAL */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              } space-y-4`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-800/20">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-sm">Import Custom Theme Configuration</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Upload a exported theme <code className="text-blue-400">.json</code> file or paste theme JSON configuration below.
              </p>

              {importError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                  {importError}
                </div>
              )}

              {/* Upload file button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 hover:bg-slate-900 text-xs font-bold text-blue-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload .json Theme File</span>
                </button>
              </div>

              {/* Textarea for JSON paste */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">Or Paste Raw Theme JSON</label>
                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`{\n  "preset": "midnight-blue",\n  "accentColor": "cyan",\n  "contrast": "high"\n}`}
                  className="w-full p-3 rounded-xl border font-mono text-xs bg-slate-950 border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/20">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePasteImport}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                >
                  Apply Theme JSON
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
