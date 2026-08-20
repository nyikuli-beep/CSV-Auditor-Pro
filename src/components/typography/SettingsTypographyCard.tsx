import React, { useState } from 'react';
import { Type, Check, RotateCcw, Globe, Laptop, BookOpen, Code2, Sparkles } from 'lucide-react';
import { SystemSettings, TypographyFontFamily, TypographySettings, TypographyFontSize, TypographyFontWeight } from '../../types';
import { FONTS_REGISTRY, DEFAULT_TYPOGRAPHY, FONT_SIZE_OPTIONS, FONT_WEIGHT_OPTIONS, applyTypographyToDocument, loadGoogleFont } from '../../lib/typographyEngine';

interface SettingsTypographyCardProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  isDarkMode: boolean;
  onShowToast?: (message: string) => void;
}

export default function SettingsTypographyCard({
  settings,
  onUpdateSettings,
  isDarkMode,
  onShowToast
}: SettingsTypographyCardProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'standard' | 'modern' | 'serif' | 'monospace'>('all');

  const currentTypography: TypographySettings = {
    fontFamily: settings.themeCustomization?.typography?.fontFamily || DEFAULT_TYPOGRAPHY.fontFamily,
    fontSize: settings.themeCustomization?.typography?.fontSize || DEFAULT_TYPOGRAPHY.fontSize,
    fontWeight: settings.themeCustomization?.typography?.fontWeight || DEFAULT_TYPOGRAPHY.fontWeight,
  };

  const handleFontFamilyClick = (fontId: TypographyFontFamily) => {
    const font = FONTS_REGISTRY[fontId];
    if (font?.isWebFont) {
      loadGoogleFont(fontId);
    }

    const updatedTypography: TypographySettings = {
      ...currentTypography,
      fontFamily: fontId
    };

    // 1. Immediately apply to DOM (root CSS variables + direct style properties)
    applyTypographyToDocument(updatedTypography);

    // 2. Persist in SystemSettings state
    const nextSettings: SystemSettings = {
      ...settings,
      themeCustomization: {
        ...(settings.themeCustomization || {}),
        preset: settings.themeCustomization?.preset || 'default-dark',
        accentColor: settings.themeCustomization?.accentColor || 'blue',
        contrast: settings.themeCustomization?.contrast || 'medium',
        fontSize: settings.themeCustomization?.fontSize || 'default',
        density: settings.themeCustomization?.density || 'comfortable',
        cornerRadius: settings.themeCustomization?.cornerRadius || 'medium',
        sidebarWidth: settings.themeCustomization?.sidebarWidth || 'default',
        sidebarIconOnly: settings.themeCustomization?.sidebarIconOnly || false,
        animations: settings.themeCustomization?.animations || 'normal',
        tablePrefs: settings.themeCustomization?.tablePrefs || {
          stripedRows: true,
          hoverHighlight: true,
          gridLines: true,
          rowDensity: 'comfortable',
          stickyHeader: true,
        },
        cardStyle: settings.themeCustomization?.cardStyle || 'outlined',
        followSystemTheme: settings.themeCustomization?.followSystemTheme || false,
        accessibility: settings.themeCustomization?.accessibility || {
          highContrast: false,
          keyboardFocusIndicators: true,
          reducedMotion: false,
          largerClickTargets: false,
        },
        typography: updatedTypography
      }
    };

    onUpdateSettings(nextSettings);

    if (onShowToast) {
      onShowToast(`Active font family changed to "${font?.name || fontId}"`);
    }
  };

  const handleFontSizeChange = (size: TypographyFontSize) => {
    const updatedTypography: TypographySettings = {
      ...currentTypography,
      fontSize: size
    };
    applyTypographyToDocument(updatedTypography);
    onUpdateSettings({
      ...settings,
      themeCustomization: {
        ...(settings.themeCustomization || {}),
        preset: settings.themeCustomization?.preset || 'default-dark',
        accentColor: settings.themeCustomization?.accentColor || 'blue',
        contrast: settings.themeCustomization?.contrast || 'medium',
        fontSize: settings.themeCustomization?.fontSize || 'default',
        density: settings.themeCustomization?.density || 'comfortable',
        cornerRadius: settings.themeCustomization?.cornerRadius || 'medium',
        sidebarWidth: settings.themeCustomization?.sidebarWidth || 'default',
        sidebarIconOnly: settings.themeCustomization?.sidebarIconOnly || false,
        animations: settings.themeCustomization?.animations || 'normal',
        tablePrefs: settings.themeCustomization?.tablePrefs || {
          stripedRows: true,
          hoverHighlight: true,
          gridLines: true,
          rowDensity: 'comfortable',
          stickyHeader: true,
        },
        cardStyle: settings.themeCustomization?.cardStyle || 'outlined',
        followSystemTheme: settings.themeCustomization?.followSystemTheme || false,
        accessibility: settings.themeCustomization?.accessibility || {
          highContrast: false,
          keyboardFocusIndicators: true,
          reducedMotion: false,
          largerClickTargets: false,
        },
        typography: updatedTypography
      }
    });
  };

  const handleFontWeightChange = (weight: TypographyFontWeight) => {
    const updatedTypography: TypographySettings = {
      ...currentTypography,
      fontWeight: weight
    };
    applyTypographyToDocument(updatedTypography);
    onUpdateSettings({
      ...settings,
      themeCustomization: {
        ...(settings.themeCustomization || {}),
        preset: settings.themeCustomization?.preset || 'default-dark',
        accentColor: settings.themeCustomization?.accentColor || 'blue',
        contrast: settings.themeCustomization?.contrast || 'medium',
        fontSize: settings.themeCustomization?.fontSize || 'default',
        density: settings.themeCustomization?.density || 'comfortable',
        cornerRadius: settings.themeCustomization?.cornerRadius || 'medium',
        sidebarWidth: settings.themeCustomization?.sidebarWidth || 'default',
        sidebarIconOnly: settings.themeCustomization?.sidebarIconOnly || false,
        animations: settings.themeCustomization?.animations || 'normal',
        tablePrefs: settings.themeCustomization?.tablePrefs || {
          stripedRows: true,
          hoverHighlight: true,
          gridLines: true,
          rowDensity: 'comfortable',
          stickyHeader: true,
        },
        cardStyle: settings.themeCustomization?.cardStyle || 'outlined',
        followSystemTheme: settings.themeCustomization?.followSystemTheme || false,
        accessibility: settings.themeCustomization?.accessibility || {
          highContrast: false,
          keyboardFocusIndicators: true,
          reducedMotion: false,
          largerClickTargets: false,
        },
        typography: updatedTypography
      }
    });
  };

  const handleResetTypography = () => {
    applyTypographyToDocument(DEFAULT_TYPOGRAPHY);
    onUpdateSettings({
      ...settings,
      themeCustomization: {
        ...(settings.themeCustomization || {}),
        preset: settings.themeCustomization?.preset || 'default-dark',
        accentColor: settings.themeCustomization?.accentColor || 'blue',
        contrast: settings.themeCustomization?.contrast || 'medium',
        fontSize: settings.themeCustomization?.fontSize || 'default',
        density: settings.themeCustomization?.density || 'comfortable',
        cornerRadius: settings.themeCustomization?.cornerRadius || 'medium',
        sidebarWidth: settings.themeCustomization?.sidebarWidth || 'default',
        sidebarIconOnly: settings.themeCustomization?.sidebarIconOnly || false,
        animations: settings.themeCustomization?.animations || 'normal',
        tablePrefs: settings.themeCustomization?.tablePrefs || {
          stripedRows: true,
          hoverHighlight: true,
          gridLines: true,
          rowDensity: 'comfortable',
          stickyHeader: true,
        },
        cardStyle: settings.themeCustomization?.cardStyle || 'outlined',
        followSystemTheme: settings.themeCustomization?.followSystemTheme || false,
        accessibility: settings.themeCustomization?.accessibility || {
          highContrast: false,
          keyboardFocusIndicators: true,
          reducedMotion: false,
          largerClickTargets: false,
        },
        typography: DEFAULT_TYPOGRAPHY
      }
    });
    if (onShowToast) {
      onShowToast('Typography reset to System Default.');
    }
  };

  const allFonts = Object.values(FONTS_REGISTRY);
  const filteredFonts = allFonts.filter(f => selectedCategory === 'all' || f.category === selectedCategory);
  const activeFont = FONTS_REGISTRY[currentTypography.fontFamily as TypographyFontFamily] || FONTS_REGISTRY['system-default'];

  return (
    <div
      id="api-settings-typography-card"
      className={`p-6 rounded-2xl border ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
            <Type className="w-4 h-4 text-blue-500" /> Typography & Font Family Customization
          </h3>
          <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Click any typeface below to immediately change the typography across all workspace screens, CSV data tables, and API inspectors.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
            Active: {activeFont.name}
          </span>
          <button
            type="button"
            onClick={handleResetTypography}
            id="btn-quick-reset-typography"
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
            }`}
            title="Reset to System Default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
        {[
          { id: 'all', label: 'All 14 Fonts', icon: Type },
          { id: 'modern', label: 'Modern Web Fonts', icon: Globe },
          { id: 'standard', label: 'Standard OS', icon: Laptop },
          { id: 'serif', label: 'Serif', icon: BookOpen },
          { id: 'monospace', label: 'Monospace', icon: Code2 },
        ].map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              id={`quick-font-cat-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Font Family Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
        {filteredFonts.map((font) => {
          const isSelected = currentTypography.fontFamily === font.id;
          return (
            <button
              key={font.id}
              type="button"
              id={`settings-font-option-${font.id}`}
              onClick={() => handleFontFamilyClick(font.id)}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500'
                  : isDarkMode
                  ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {font.name}
                </span>
                {isSelected ? (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-500 capitalize">
                    {font.category}
                  </span>
                )}
              </div>

              {/* In-situ Font Sample */}
              <div
                className={`p-2 rounded-lg border text-[11px] leading-tight mt-1 ${
                  isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
                style={{ fontFamily: font.fontStack }}
              >
                <div className="font-bold truncate">Aa Bb Gg 123</div>
                <div className="text-[9px] opacity-75 truncate mt-0.5">{font.samplePhrase}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Font Size & Weight Quick Tuners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/20">
        <div>
          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Global Base Font Size
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {FONT_SIZE_OPTIONS.map((size) => {
              const isSelected = currentTypography.fontSize === size.id;
              return (
                <button
                  key={size.id}
                  type="button"
                  id={`settings-font-size-${size.id}`}
                  onClick={() => handleFontSizeChange(size.id)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {size.label.split(' ')[0]} ({size.px})
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Default Font Weight
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {FONT_WEIGHT_OPTIONS.map((weight) => {
              const isSelected = currentTypography.fontWeight === weight.id;
              return (
                <button
                  key={weight.id}
                  type="button"
                  id={`settings-font-weight-${weight.id}`}
                  onClick={() => handleFontWeightChange(weight.id)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {weight.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
