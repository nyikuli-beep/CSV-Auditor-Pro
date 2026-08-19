import React from 'react';
import { Type, RotateCcw, Check, Sparkles, Sliders } from 'lucide-react';
import { TypographySettings, TypographyFontFamily, TypographyFontSize, TypographyFontWeight } from '../../types';
import { DEFAULT_TYPOGRAPHY, applyTypographyToDocument } from '../../lib/typographyEngine';
import FontFamilySelector from './FontFamilySelector';
import FontSizeSelector from './FontSizeSelector';
import FontWeightSelector from './FontWeightSelector';
import TypographyPreview from './TypographyPreview';

interface TypographySettingsPanelProps {
  typography?: TypographySettings;
  onUpdateTypography: (updated: TypographySettings) => void;
  isDarkMode: boolean;
  onShowToast?: (message: string) => void;
}

export default function TypographySettingsPanel({
  typography = DEFAULT_TYPOGRAPHY,
  onUpdateTypography,
  isDarkMode,
  onShowToast
}: TypographySettingsPanelProps) {
  const currentTypography: TypographySettings = {
    fontFamily: typography.fontFamily || DEFAULT_TYPOGRAPHY.fontFamily,
    fontSize: typography.fontSize || DEFAULT_TYPOGRAPHY.fontSize,
    fontWeight: typography.fontWeight || DEFAULT_TYPOGRAPHY.fontWeight,
  };

  const handleSelectFontFamily = (family: TypographyFontFamily) => {
    const next: TypographySettings = {
      ...currentTypography,
      fontFamily: family
    };
    applyTypographyToDocument(next);
    onUpdateTypography(next);
    if (onShowToast) {
      onShowToast(`Font family updated to "${family}"`);
    }
  };

  const handleSelectFontSize = (size: TypographyFontSize) => {
    const next: TypographySettings = {
      ...currentTypography,
      fontSize: size
    };
    applyTypographyToDocument(next);
    onUpdateTypography(next);
    if (onShowToast) {
      onShowToast(`Font size scaled to ${size}`);
    }
  };

  const handleSelectFontWeight = (weight: TypographyFontWeight) => {
    const next: TypographySettings = {
      ...currentTypography,
      fontWeight: weight
    };
    applyTypographyToDocument(next);
    onUpdateTypography(next);
    if (onShowToast) {
      onShowToast(`Default weight updated to ${weight}`);
    }
  };

  const handleResetTypography = () => {
    applyTypographyToDocument(DEFAULT_TYPOGRAPHY);
    onUpdateTypography(DEFAULT_TYPOGRAPHY);
    if (onShowToast) {
      onShowToast('Typography reset to System Default (Medium / Regular).');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="enterprise-typography-settings-panel">
      {/* Top Banner & Reset Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-800/20">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Typography & Font Family Customization
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Select from 9 standard operating system typefaces or 5 modern web fonts with live dynamic styling.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          id="btn-reset-typography-defaults"
          onClick={handleResetTypography}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-rose-400 hover:bg-slate-800'
              : 'bg-slate-50 border-slate-200 text-rose-600 hover:bg-slate-100'
          }`}
          title="Reset typography settings back to System Default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Typography</span>
        </button>
      </div>

      {/* 1. Font Family Selection Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <Type className="w-3.5 h-3.5 text-blue-400" /> 1. Select Font Family
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">14 Typefaces Available</span>
        </div>

        <FontFamilySelector
          selectedFont={currentTypography.fontFamily}
          onSelectFont={handleSelectFontFamily}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* 2. Font Size Scaling */}
      <div className="space-y-3 pt-2">
        <FontSizeSelector
          selectedSize={currentTypography.fontSize}
          onSelectSize={handleSelectFontSize}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* 3. Font Weight Selection */}
      <div className="space-y-3 pt-2">
        <FontWeightSelector
          selectedWeight={currentTypography.fontWeight}
          onSelectWeight={handleSelectFontWeight}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* 4. Live Interactive Typography Preview Sandbox */}
      <div className="pt-2">
        <TypographyPreview
          typography={currentTypography}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}
