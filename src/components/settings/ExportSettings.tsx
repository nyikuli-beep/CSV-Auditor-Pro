import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Download, RefreshCw, FileText, Printer, Image } from 'lucide-react';

export const ExportSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const exp = settings.export;

  const handleToggle = (key: keyof SystemSettings['export']) => {
    updateSettings({
      export: { ...exp, [key]: !(exp[key]) },
    });
  };

  const handleSelect = (key: keyof SystemSettings['export'], val: any) => {
    updateSettings({
      export: { ...exp, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            Report Export & PDF Layout Preferences
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure default file formats, company logos, PDF orientation, paper sizes, and summary sections.
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
        {/* Format */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Default Export Format</label>
          <select
            value={exp.defaultFormat || 'pdf'}
            onChange={(e) => handleSelect('defaultFormat', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="pdf">PDF Audit Report</option>
            <option value="csv">Cleaned CSV Data File</option>
            <option value="excel">Microsoft Excel (.xlsx)</option>
            <option value="json">Structured JSON Schema</option>
          </select>
        </div>

        {/* Orientation */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">PDF Page Orientation</label>
          <select
            value={exp.orientation || 'landscape'}
            onChange={(e) => handleSelect('orientation', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="landscape">Landscape (Best for Wide Tables)</option>
            <option value="portrait">Portrait (Executive Summary)</option>
          </select>
        </div>

        {/* Paper Size */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Paper Size</label>
          <select
            value={exp.paperSize || 'a4'}
            onChange={(e) => handleSelect('paperSize', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="a4">A4 (Standard International)</option>
            <option value="letter">US Letter</option>
            <option value="legal">US Legal</option>
          </select>
        </div>
      </div>

      {/* Export Sections */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Include Sections in PDF / Excel Exports
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'includeCharts', label: 'Include Data Visualizations & Charts', desc: 'Embed high-res bar charts and outlier distribution plots.' },
            { key: 'includeAiSummary', label: 'Include AI Executive Summary', desc: 'Add Gemini AI commentary and compliance recommendations.' },
            { key: 'includeValidationReport', label: 'Include Anomaly Error Breakdown', desc: 'Append detailed list of bad records and missing value counts.' },
            { key: 'includeCompanyLogo', label: 'Include Corporate Branding & Logo', desc: 'Print workspace logo and custom header in report cover.' },
            { key: 'includeWatermark', label: 'Include Confidentiality Watermark', desc: 'Overlay "CONFIDENTIAL AUDIT" across exported pages.' },
            { key: 'includeMetadata', label: 'Include Audit Timestamp & Author', desc: 'Print generated date, author name, and dataset SHA-256 hash.' },
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
                checked={Boolean((exp as any)[item.key])}
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
