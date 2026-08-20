import React from 'react';
import { motion } from 'motion/react';
import { 
  Palette, 
  Check, 
  Sparkles, 
  RotateCcw, 
  Sun, 
  Moon, 
  CheckCircle2,
  Sliders,
  Layers,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  SystemSettings, 
  ThemePreset, 
  AccentColor, 
  ThemeCustomization 
} from '../types';
import { 
  THEME_PRESETS, 
  ACCENT_COLORS, 
  DEFAULT_THEME_CUSTOMIZATION,
  applyThemeToDocument,
  getActivePreset
} from '../lib/themeEngine';

interface SettingsPresetsAndAccentsCardProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onShowToast: (msg: string) => void;
}

export default function SettingsPresetsAndAccentsCard({
  settings,
  onUpdateSettings,
  isDarkMode,
  toggleTheme,
  onShowToast
}: SettingsPresetsAndAccentsCardProps) {
  const currentCustomization: ThemeCustomization = {
    ...DEFAULT_THEME_CUSTOMIZATION,
    ...(settings.themeCustomization || {}),
    preset: settings.themeCustomization?.preset || (isDarkMode ? 'default-dark' : 'light-corporate'),
    accentColor: settings.accentColor || settings.themeCustomization?.accentColor || 'blue',
  };

  const activePreset = getActivePreset(currentCustomization, isDarkMode);
  const activeAccent = ACCENT_COLORS[currentCustomization.accentColor] || ACCENT_COLORS.blue;

  // Handle Preset Click
  const handleSelectPreset = (presetKey: ThemePreset) => {
    const targetPreset = THEME_PRESETS[presetKey];
    if (!targetPreset) return;

    const isTargetLight = presetKey === 'light-corporate';

    // If selecting light corporate while currently in dark mode, toggle theme to light
    if (isTargetLight && isDarkMode) {
      toggleTheme();
    } else if (!isTargetLight && !isDarkMode) {
      // If selecting a dark preset while currently in light mode, toggle theme to dark
      toggleTheme();
    }

    const updatedCustomization: ThemeCustomization = {
      ...currentCustomization,
      preset: presetKey
    };

    // Apply live to DOM immediately
    applyThemeToDocument(updatedCustomization, !isTargetLight);

    onUpdateSettings({
      ...settings,
      theme: isTargetLight ? 'light' : 'dark',
      themeCustomization: updatedCustomization
    });

    onShowToast(`Applied "${targetPreset.name}" theme preset`);
  };

  // Handle Accent Color Click
  const handleSelectAccent = (accentKey: AccentColor) => {
    const targetAccent = ACCENT_COLORS[accentKey];
    if (!targetAccent) return;

    const updatedCustomization: ThemeCustomization = {
      ...currentCustomization,
      accentColor: accentKey
    };

    // Apply live to DOM immediately
    applyThemeToDocument(updatedCustomization, isDarkMode);

    onUpdateSettings({
      ...settings,
      accentColor: accentKey,
      themeCustomization: updatedCustomization
    });

    onShowToast(`Accent color switched to ${targetAccent.name} (${targetAccent.hex})`);
  };

  // Handle Reset to Default Theme & Accent
  const handleReset = () => {
    const resetCustomization: ThemeCustomization = {
      ...DEFAULT_THEME_CUSTOMIZATION,
      preset: 'default-dark',
      accentColor: 'blue'
    };

    if (!isDarkMode) {
      toggleTheme();
    }

    applyThemeToDocument(resetCustomization, true);

    onUpdateSettings({
      ...settings,
      theme: 'dark',
      accentColor: 'blue',
      themeCustomization: resetCustomization
    });

    onShowToast('Reset theme presets and accent colors to default');
  };

  return (
    <div className={`p-6 rounded-2xl border transition-all ${
      isDarkMode ? 'bg-slate-900/70 border-slate-800/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/20 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div 
            className="p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center transition-colors"
            style={{ backgroundColor: activeAccent.hex }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-extrabold text-sm uppercase tracking-wider ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Presets & Color Accents
              </h3>
              <span 
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase border"
                style={{ 
                  backgroundColor: activeAccent.bgLight, 
                  borderColor: activeAccent.borderLight,
                  color: activeAccent.hex
                }}
              >
                Live Click-To-Apply
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Select full theme presets or fine-tune brand accents with real-time DOM injection.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto ${
            isDarkMode 
              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white' 
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title="Reset theme and accent color to default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Section 1: Enterprise Theme Presets */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Enterprise Theme Presets
            </h4>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Active: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{activePreset.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(THEME_PRESETS).map((preset) => {
            const isSelected = currentCustomization.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                id={`btn-theme-preset-${preset.id}`}
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/5 shadow-md ring-2 ring-blue-500/20'
                    : isDarkMode
                    ? 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 p-1 rounded-full bg-blue-600 text-white shadow">
                    <Check className="w-3 h-3" />
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: preset.primaryBtn }}
                    />
                    <h5 className={`font-extrabold text-xs tracking-tight ${
                      isSelected 
                        ? 'text-blue-500 dark:text-blue-400' 
                        : isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-900'
                    }`}>
                      {preset.name}
                    </h5>
                  </div>
                  <p className={`text-[10px] mt-1 leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {preset.description}
                  </p>
                </div>

                {/* Swatch color strip */}
                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-800/20 dark:border-slate-800/60">
                  <span 
                    className="w-4 h-4 rounded border border-slate-700/40 shadow-xs" 
                    style={{ backgroundColor: preset.bgMain }} 
                    title={`Background: ${preset.bgMain}`} 
                  />
                  <span 
                    className="w-4 h-4 rounded border border-slate-700/40 shadow-xs" 
                    style={{ backgroundColor: preset.bgSidebar }} 
                    title={`Sidebar: ${preset.bgSidebar}`} 
                  />
                  <span 
                    className="w-4 h-4 rounded border border-slate-700/40 shadow-xs" 
                    style={{ backgroundColor: preset.bgCard }} 
                    title={`Card: ${preset.bgCard}`} 
                  />
                  <span 
                    className="w-4 h-4 rounded border border-slate-700/40 shadow-xs" 
                    style={{ backgroundColor: preset.primaryBtn }} 
                    title={`Accent Button: ${preset.primaryBtn}`} 
                  />
                  <span 
                    className="w-4 h-4 rounded border border-slate-700/40 shadow-xs" 
                    style={{ backgroundColor: preset.textPrimary }} 
                    title={`Text: ${preset.textPrimary}`} 
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Color Accents Palette */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Color Accents Palette
            </h4>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Active: <strong style={{ color: activeAccent.hex }}>{activeAccent.name} ({activeAccent.hex})</strong>
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {Object.values(ACCENT_COLORS).map((accent) => {
            const isSelected = currentCustomization.accentColor === accent.id;
            return (
              <button
                key={accent.id}
                type="button"
                id={`btn-color-accent-${accent.id}`}
                onClick={() => handleSelectAccent(accent.id)}
                className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1.5 relative group ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-2 ring-blue-500/20'
                    : isDarkMode
                    ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                }`}
                title={`Select ${accent.name} accent`}
              >
                {/* Color Swatch Circle */}
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110 border border-white/20"
                  style={{ backgroundColor: accent.hex }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </div>

                <span className={`text-[10px] font-bold truncate max-w-full ${
                  isSelected 
                    ? 'text-blue-500 dark:text-blue-400' 
                    : isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {accent.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  {accent.hex}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Live In-Situ Preview Strip */}
      <div className={`mt-6 p-4 rounded-xl border ${
        isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Real-Time Component Style Preview</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Synchronized with DOM
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Primary CTA button styled with active accent */}
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-transform hover:scale-102 cursor-pointer"
            style={{ backgroundColor: activeAccent.hex }}
          >
            <span>Run Compliance Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Outline button styled with active accent */}
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer"
            style={{ 
              borderColor: activeAccent.hex, 
              color: activeAccent.hex,
              backgroundColor: activeAccent.bgLight 
            }}
          >
            Preview Schema
          </button>

          {/* Active Badge */}
          <span 
            className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase border flex items-center gap-1.5"
            style={{ 
              backgroundColor: activeAccent.bgLight, 
              borderColor: activeAccent.borderLight,
              color: activeAccent.hex 
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeAccent.hex }} />
            {activePreset.name} Active
          </span>

          {/* Progress Bar sample */}
          <div className="flex-1 min-w-[140px] max-w-[200px]">
            <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 mb-1">
              <span>Data Score</span>
              <span>100%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800/40 dark:bg-slate-800 overflow-hidden border border-slate-700/30">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ width: '100%', backgroundColor: activeAccent.hex }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
