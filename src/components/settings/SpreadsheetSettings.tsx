import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Table, RefreshCw, ZoomIn, Grid, Maximize, Eye } from 'lucide-react';

export const SpreadsheetSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const sp = settings.spreadsheet;

  const handleToggle = (key: keyof SystemSettings['spreadsheet']) => {
    updateSettings({
      spreadsheet: { ...sp, [key]: !(sp[key]) },
    });
  };

  const handleValueChange = (key: keyof SystemSettings['spreadsheet'], val: any) => {
    updateSettings({
      spreadsheet: { ...sp, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-500" />
            Spreadsheet & Grid Workspace Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customize gridlines, zebra striping, sticky headers, zoom level, default delimiter, and cell padding for the CSV viewer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetCategory('spreadsheet')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Restore Defaults
        </button>
      </div>

      {/* Grid Display Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'gridlines', label: 'Show Cell Gridlines', desc: 'Display thin 1px boundaries between cells.' },
          { key: 'alternateRowColors', label: 'Zebra Striping (Alternate Rows)', desc: 'Shade alternate rows for easier horizontal reading.' },
          { key: 'stickyHeader', label: 'Freeze Top Header Row', desc: 'Keep column header labels fixed while scrolling down.' },
          { key: 'stickyFirstColumn', label: 'Freeze First Column (ID / Index)', desc: 'Keep the row number / identifier column pinned on horizontal scroll.' },
          { key: 'highlightActiveRow', label: 'Highlight Active Row', desc: 'Apply a subtle accent background tint to the currently selected row.' },
          { key: 'highlightActiveColumn', label: 'Highlight Active Column', desc: 'Tint the entire active column for clear field mapping.' },
          { key: 'wrapText', label: 'Wrap Text in Cells', desc: 'Wrap long text entries instead of truncating with ellipses.' },
          { key: 'showRowNumbers', label: 'Show Row Index Numbers', desc: 'Display 1-indexed line numbers along the left gutter.' },
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
              checked={Boolean((sp as any)[item.key])}
              onChange={() => handleToggle(item.key as any)}
              className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
            />
          </div>
        ))}
      </div>

      {/* Zoom Level & Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Zoom Level */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><ZoomIn className="w-3.5 h-3.5 text-blue-500" /> Grid Zoom Scale</span>
            <span className="text-blue-500 font-mono">{sp.zoomLevel}%</span>
          </label>
          <input
            type="range"
            min="80"
            max="150"
            step="5"
            value={sp.zoomLevel || 100}
            onChange={(e) => handleValueChange('zoomLevel', Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>80% (Compact)</span>
            <span>100% (Normal)</span>
            <span>150% (Large)</span>
          </div>
        </div>

        {/* Row Height */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>Row Height</span>
            <span className="text-blue-500 font-mono">{sp.rowHeight || 40}px</span>
          </label>
          <select
            value={sp.rowHeight || 40}
            onChange={(e) => handleValueChange('rowHeight', Number(e.target.value))}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="32" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">32px (Tight / High Density)</option>
            <option value="40" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">40px (Standard / Balanced)</option>
            <option value="48" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">48px (Touch / Comfortable)</option>
          </select>
        </div>

        {/* Default Delimiter */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Default CSV Delimiter</label>
          <select
            value={sp.defaultDelimiter || 'auto'}
            onChange={(e) => handleValueChange('defaultDelimiter', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="auto" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Auto-Detect (Smart Parser)</option>
            <option value="comma" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Comma (,)</option>
            <option value="semicolon" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Semicolon (;)</option>
            <option value="tab" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Tab (\t TSV)</option>
            <option value="pipe" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pipe (|)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
