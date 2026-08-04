import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Eye, RefreshCw, Type, Sparkles, ZoomIn, Check } from 'lucide-react';

export const AccessibilitySettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const acc = settings.accessibility;

  const handleToggle = (key: keyof SystemSettings['accessibility']) => {
    updateSettings({
      accessibility: { ...acc, [key]: !(acc[key]) },
    });
  };

  const handleValueChange = (key: keyof SystemSettings['accessibility'], val: any) => {
    updateSettings({
      accessibility: { ...acc, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Accessibility, Screen Readers & Dyslexia Support
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure high-contrast WCAG 2.1 AAA mode, OpenDyslexic typography, keyboard focus rings, and screen reader announcements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetCategory('appearance')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Restore Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'highContrastMode', label: 'High-Contrast Mode (WCAG AAA)', desc: 'Boost border thickness and color contrast for maximum legibility.' },
          { key: 'dyslexiaFont', label: 'OpenDyslexic Font Engine', desc: 'Use weighted font baseline designed to prevent letter flipping while reading data.' },
          { key: 'screenReaderOptimization', label: 'Screen Reader ARIA Optimization', desc: 'Enhance screen reader announcements for table headers and AI status.' },
          { key: 'keyboardNavigation', label: 'Keyboard Navigation Ring', desc: 'Always display bright 2px blue focus indicator rings on active buttons.' },
          { key: 'largeClickTargets', label: 'Large Touch & Click Targets (Min 44px)', desc: 'Expand button padding for easier motor navigation.' },
          { key: 'reducedMotion', label: 'Disable UI Animations (Reduced Motion)', desc: 'Suppress motion effects, fade transitions, and spinning icons.' },
        ].map((item) => (
          <div
            key={item.key}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.label}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            <input
              type="checkbox"
              checked={Boolean((acc as any)[item.key])}
              onChange={() => handleToggle(item.key as any)}
              className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
            />
          </div>
        ))}
      </div>

      {/* Font Scale Slider */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><ZoomIn className="w-3.5 h-3.5 text-blue-500" /> Interface Font Scale</span>
          <span className="text-blue-500 font-mono">{acc.fontScale || 100}%</span>
        </label>
        <input
          type="range"
          min="90"
          max="130"
          step="5"
          value={acc.fontScale || 100}
          onChange={(e) => handleValueChange('fontScale', Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>90% (Standard)</span>
          <span>100% (Default)</span>
          <span>130% (Extra Large)</span>
        </div>
      </div>
    </div>
  );
};
