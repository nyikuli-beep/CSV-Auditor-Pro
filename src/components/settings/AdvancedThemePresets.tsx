import React, { useState } from 'react';
import { usePersonalization, WorkspacePreset } from '../../context/PersonalizationContext';
import { CustomTheme } from '../../types';
import { Sliders, RefreshCw, Palette, Download, Upload, Copy, Trash2, Plus, Sparkles, Check, Code } from 'lucide-react';

export const AdvancedThemePresets: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const {
    settings,
    updateSettings,
    applyWorkspacePreset,
    saveCustomTheme,
    deleteCustomTheme,
    resetCategory,
    exportSettingsJSON,
    importSettingsJSON,
  } = usePersonalization();

  const [presetSelected, setPresetSelected] = useState<WorkspacePreset>('Data Cleaning');
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonModal, setShowJsonModal] = useState(false);

  // Custom Theme Builder Form State
  const [themeForm, setThemeForm] = useState<CustomTheme>({
    id: `theme-${Date.now()}`,
    name: 'My Corporate Custom Theme',
    colors: {
      primary: '#2563EB',
      secondary: '#64748B',
      background: '#0F172A',
      surface: '#1E293B',
      card: '#1E293B',
      sidebar: '#0F172A',
      header: '#1E293B',
      footer: '#0F172A',
      text: '#F8FAFC',
      mutedText: '#94A3B8',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
      borders: '#334155',
      hover: '#334155',
      selection: '#2563EB',
      buttons: '#2563EB',
      charts: '#3B82F6',
      tables: '#1E293B',
    },
  });

  const workspacePresets: Array<{ name: WorkspacePreset; desc: string; icon: string }> = [
    { name: 'Data Cleaning', desc: 'Compact gridlines, zebra striping, anomaly highlights & proactive cleaning recipes.', icon: '🧹' },
    { name: 'Audit Mode', desc: 'Pinned column headers, line numbers, PII masking redaction & strict compliance logs.', icon: '🔍' },
    { name: 'Executive Dashboard', desc: 'Spacious cards, extra rounded corners, PDF report export defaults & chart cards.', icon: '📊' },
    { name: 'AI Analysis', desc: 'Gemini 2.5 Pro model default, in-depth reasoning summaries & confidence ratings.', icon: '🤖' },
    { name: 'Collaboration', desc: 'Real-time typing indicators, read receipts, online badges & team color tags.', icon: '👥' },
    { name: 'Presentation', desc: 'Large typography, high contrast, backdrop blur & spacious layout padding.', icon: '🖥️' },
  ];

  const handleCreateTheme = () => {
    saveCustomTheme(themeForm);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            Theme Builder, Workspace Presets & Config Import/Export
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build custom color themes, switch workspace presets with 1 click, and backup your settings to JSON.
          </p>
        </div>
      </div>

      {/* 1. Workspace Presets Switcher */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" /> 1-Click Workspace Presets
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspacePresets.map((p) => {
            const isActive = settings.advanced?.activeWorkspacePreset === p.name;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => applyWorkspacePreset(p.name)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isActive
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg">{p.icon}</span>
                  {isActive && (
                    <span className="p-1 rounded-full bg-blue-600 text-white">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">{p.name}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Theme Builder */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-purple-500" /> Custom Theme Builder Engine
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Design custom brand palettes (Primary, Surface, Background, Text) and save as custom themes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateTheme}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Save Custom Theme
          </button>
        </div>

        {/* Theme Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Theme Name</label>
          <input
            type="text"
            value={themeForm.name}
            onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Palette Tokens */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {Object.entries(themeForm.colors).slice(0, 10).map(([colorKey, hexVal]) => (
            <div key={colorKey} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block truncate">{colorKey}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={hexVal}
                  onChange={(e) =>
                    setThemeForm({
                      ...themeForm,
                      colors: { ...themeForm.colors, [colorKey]: e.target.value },
                    })
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-[10px] font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase truncate">{hexVal}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Saved Themes List */}
        {settings.advanced?.customThemes && settings.advanced.customThemes.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Saved Custom Themes:</span>
            <div className="flex flex-wrap gap-2">
              {settings.advanced.customThemes.map((ct) => (
                <div key={ct.id} className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-xs font-bold">
                  <span>{ct.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteCustomTheme(ct.id)}
                    className="text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Export / Import JSON & Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export JSON */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-blue-500" /> Backup Settings to JSON
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Export all 15 category preferences, theme tokens, and custom keys as a JSON file.
          </p>
          <button
            type="button"
            onClick={exportSettingsJSON}
            className="w-full py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Settings JSON
          </button>
        </div>

        {/* Import JSON */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-emerald-500" /> Restore / Import Settings JSON
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Import a previously exported JSON configuration file or paste JSON code.
          </p>
          <button
            type="button"
            onClick={() => setShowJsonModal(true)}
            className="w-full py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            <Code className="w-3.5 h-3.5" /> Import JSON Code
          </button>
        </div>
      </div>

      {/* Reset Section */}
      <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
        <h4 className="text-xs font-bold text-rose-500 flex items-center gap-1.5 uppercase tracking-wider">
          <RefreshCw className="w-3.5 h-3.5" /> Danger Zone: Factory Reset Options
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => resetCategory('appearance')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 cursor-pointer"
          >
            Reset Appearance Settings
          </button>
          <button
            type="button"
            onClick={() => resetCategory('dashboard')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 cursor-pointer"
          >
            Reset Dashboard Widgets
          </button>
          <button
            type="button"
            onClick={() => resetCategory('all')}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
          >
            Reset ALL Settings to Factory Defaults
          </button>
        </div>
      </div>

      {/* Import JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Paste Settings JSON Configuration</h3>
            <textarea
              rows={6}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste raw JSON configuration here..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (importSettingsJSON(jsonInput)) {
                    setShowJsonModal(false);
                    setJsonInput('');
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl cursor-pointer"
              >
                Apply Settings JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
