import React, { useState } from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { Sun, Moon, Sparkles, Palette, Check, RefreshCw, Type, Layout, Eye } from 'lucide-react';

export const AppearanceSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const [customHexInput, setCustomHexInput] = useState(settings.customAccentHex || '#2563EB');

  const themes = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Clean, high-contrast light theme with optimal WCAG readability.',
      icon: Sun,
      colorPreview: 'bg-white border-slate-200 text-slate-900',
    },
    {
      id: 'dark',
      label: 'Dark Gray',
      desc: 'Classic dark slate aesthetic for reduced eye strain in low-light environment.',
      icon: Moon,
      colorPreview: 'bg-slate-900 border-slate-700 text-slate-100',
    },
    {
      id: 'deep_black',
      label: 'Deep Black (OLED)',
      desc: 'True OLED #000000 black canvas for max battery efficiency & contrast.',
      icon: Sparkles,
      colorPreview: 'bg-black border-neutral-800 text-white',
    },
    {
      id: 'system',
      label: 'System Match',
      desc: 'Automatically mirror your operating system appearance preferences.',
      icon: Layout,
      colorPreview: 'bg-slate-800 border-slate-600 text-slate-200',
    },
  ];

  const presetAccents = [
    { id: 'blue', label: 'Primary Blue', hex: '#2563EB', bg: 'bg-blue-600' },
    { id: 'emerald', label: 'Emerald Green', hex: '#10B981', bg: 'bg-emerald-500' },
    { id: 'violet', label: 'Electric Violet', hex: '#8B5CF6', bg: 'bg-violet-600' },
    { id: 'amber', label: 'Amber Gold', hex: '#F59E0B', bg: 'bg-amber-500' },
    { id: 'green', label: 'Forest Green', hex: '#16A34A', bg: 'bg-green-600' },
    { id: 'purple', label: 'Deep Purple', hex: '#9333EA', bg: 'bg-purple-600' },
    { id: 'orange', label: 'Burnt Orange', hex: '#EA580C', bg: 'bg-orange-600' },
    { id: 'red', label: 'Crimson Red', hex: '#DC2626', bg: 'bg-red-600' },
    { id: 'cyan', label: 'Cyan Cyan', hex: '#0891B2', bg: 'bg-cyan-600' },
    { id: 'indigo', label: 'Indigo Night', hex: '#4F46E5', bg: 'bg-indigo-600' },
    { id: 'slate', label: 'Neutral Slate', hex: '#475569', bg: 'bg-slate-600' },
  ];

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHexInput(val);
    if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
      updateSettings({
        accentColor: 'custom',
        customAccentHex: val,
      });
    }
  };

  const addFavoriteAccent = () => {
    const currentFavs = settings.favoriteAccents || [];
    if (!currentFavs.includes(customHexInput)) {
      updateSettings({
        favoriteAccents: [...currentFavs, customHexInput],
      });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-500" />
            Appearance & Visual Design
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure application theme, OLED deep black mode, custom brand accent colors, corner radius, and font scaling.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetCategory('appearance')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset Appearance
        </button>
      </div>

      {/* 1. Theme Selection */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Primary Color Theme
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const isSelected = settings.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateSettings({ theme: t.id as any })}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-full ${
                  isSelected
                    ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/30 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg border ${t.colorPreview}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="p-1 rounded-full bg-blue-600 text-white">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">{t.label}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Accent Colors & Custom Picker */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Brand Accent Color & Hex Customization
          </label>
          <span className="text-[11px] font-mono text-blue-500 font-semibold">
            Active: {settings.accentColor === 'custom' ? settings.customAccentHex : settings.accentColor}
          </span>
        </div>

        {/* Preset Swatches */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {presetAccents.map((acc) => {
            const isSelected = settings.accentColor === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => updateSettings({ accentColor: acc.id as any })}
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${acc.bg} shrink-0`} />
                <span className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{acc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Hex Color Picker */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-500" />
                Custom Color Picker (Hex / RGB)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose any precise corporate HEX color code for buttons, links, and active borders.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="color"
                value={customHexInput}
                onChange={handleCustomHexChange}
                className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={customHexInput}
                onChange={handleCustomHexChange}
                placeholder="#2563EB"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono w-28 uppercase text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addFavoriteAccent}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all"
              >
                Save Swatch
              </button>
            </div>
          </div>

          {/* Favorite Swatches */}
          {settings.favoriteAccents && settings.favoriteAccents.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Favorite Swatches:</span>
              <div className="flex items-center gap-1.5">
                {settings.favoriteAccents.map((hex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCustomHexInput(hex);
                      updateSettings({ accentColor: 'custom', customAccentHex: hex });
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Border Radius & Spacing Density */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Border Radius */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Container Corner Radius
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sharp', label: 'Sharp (0px)', class: 'rounded-none' },
              { id: 'rounded', label: 'Rounded (8px)', class: 'rounded-lg' },
              { id: 'extra_rounded', label: 'Pill (20px)', class: 'rounded-2xl' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => updateSettings({ borderRadius: r.id as any })}
                className={`py-2 px-3 text-xs font-bold border transition-all cursor-pointer text-center ${r.class} ${
                  settings.borderRadius === r.id
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Density */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            UI Density & Padding Scale
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'compact', label: 'Compact (High Data)' },
              { id: 'comfortable', label: 'Comfortable (Default)' },
              { id: 'spacious', label: 'Spacious (Relaxed)' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => updateSettings({ density: d.id as any })}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center truncate ${
                  settings.density === d.id
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Typography & Font Family */}
      <div className="space-y-3 pt-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-blue-500" /> Typography & Font Options
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'sans', label: 'Inter Sans', sample: 'Modern & Clean' },
            { id: 'mono', label: 'JetBrains Mono', sample: 'Monospaced Data' },
            { id: 'serif', label: 'Merriweather Serif', sample: 'Editorial Reading' },
            { id: 'dyslexic', label: 'OpenDyslexic', sample: 'High-Legibility Font' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() =>
                updateSettings({
                  typography: { ...settings.typography, fontFamily: f.id as any },
                })
              }
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                settings.typography?.fontFamily === f.id
                  ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{f.label}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{f.sample}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Motion & Blur Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Animations */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">UI Animations & Transitions</span>
          <div className="flex items-center gap-2">
            {[
              { id: 'enabled', label: 'Smooth' },
              { id: 'reduced', label: 'Reduced' },
              { id: 'disabled', label: 'Off' },
            ].map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => updateSettings({ animations: a.id as any })}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  settings.animations === a.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blur / Glassmorphism */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Background Blur & Glassmorphism</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Enable backdrop blur effects on floating overlays and dialogs.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.blurEffects}
            onChange={(e) => updateSettings({ blurEffects: e.target.checked })}
            className="w-4 h-4 accent-blue-600 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
