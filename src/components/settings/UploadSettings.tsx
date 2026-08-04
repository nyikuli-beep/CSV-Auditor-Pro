import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Upload, RefreshCw, FileText, Binary, Check } from 'lucide-react';

export const UploadSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const up = settings.upload;

  const handleToggle = (key: keyof SystemSettings['upload']) => {
    updateSettings({
      upload: { ...up, [key]: !(up[key]) },
    });
  };

  const handleSelect = (key: keyof SystemSettings['upload'], val: any) => {
    updateSettings({
      upload: { ...up, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            File Upload & Parsing Defaults
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure character encoding, date formats, missing value symbols, and auto-detection parsing options.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Encoding */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Character Encoding</label>
          <select
            value={up.encoding || 'auto'}
            onChange={(e) => handleSelect('encoding', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="auto">Auto-Detect Encoding</option>
            <option value="utf-8">UTF-8 (Unicode Standard)</option>
            <option value="utf-16">UTF-16</option>
            <option value="ascii">ASCII / Windows-1252</option>
          </select>
        </div>

        {/* Date Format */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Expected Date Format</label>
          <select
            value={up.dateFormat || 'YYYY-MM-DD'}
            onChange={(e) => handleSelect('dateFormat', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (UK / EU Standard)</option>
          </select>
        </div>

        {/* Missing Value Symbol */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Missing Value Symbol</label>
          <input
            type="text"
            value={up.missingValueSymbol || 'N/A'}
            onChange={(e) => handleSelect('missingValueSymbol', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
            placeholder="e.g. N/A, NULL, ?"
          />
        </div>
      </div>

      {/* Auto Detection Toggles */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Automated Dataset Inspection Rules
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'autoTypeDetection', label: 'Auto-detect Column Data Types', desc: 'Identify integers, floats, booleans, dates, and emails automatically.' },
            { key: 'autoDuplicateDetection', label: 'Auto-detect Duplicate Rows', desc: 'Flag identical rows across dataset columns on file load.' },
            { key: 'autoMissingValueDetection', label: 'Auto-detect Missing & Empty Cells', desc: 'Count null cells and display completion percentage.' },
            { key: 'autoDelimiterDetection', label: 'Auto-detect CSV / TSV Delimiters', desc: 'Distinguish between commas, tabs, semicolons, and pipes.' },
          ].map((item) => (
            <div
              key={item.key}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.label}</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean((up as any)[item.key])}
                onChange={() => handleToggle(item.key as any)}
                className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
