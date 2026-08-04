import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Cpu, RefreshCw, Zap, Database, HardDrive, Layers } from 'lucide-react';

export const PerformanceSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const perf = settings.performance;

  const handleToggle = (key: keyof SystemSettings['performance']) => {
    updateSettings({
      performance: { ...perf, [key]: !(perf[key]) },
    });
  };

  const handleSelect = (key: keyof SystemSettings['performance'], val: any) => {
    updateSettings({
      performance: { ...perf, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            Performance, Memory Cap & GPU Acceleration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Optimize rendering speeds for million-row datasets, configure hardware acceleration, and adjust auto-save intervals.
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
          { key: 'hardwareAcceleration', label: 'WebGL Hardware Acceleration', desc: 'Use GPU acceleration for fast rendering of large spreadsheet tables.' },
          { key: 'lowMemoryMode', label: 'Low Memory Mode (Sub-100MB RAM)', desc: 'Unload non-visible grid rows to conserve system RAM on lower-end devices.' },
          { key: 'backgroundProcessing', label: 'Web Worker Multithreading', desc: 'Offload CSV parsing and regex validation to background Web Worker threads.' },
          { key: 'preloadDatasets', label: 'Preload Recent Datasets into Memory', desc: 'Cache recent datasets in IndexedDB for instant tab switching.' },
          { key: 'cacheControl', label: 'Aggressive Browser Caching', desc: 'Cache static audit schema definitions and AI prompts.' },
          { key: 'lazyLoading', label: 'Lazy-Load Offscreen Dashboard Widgets', desc: 'Defer rendering lower dashboard widgets until scrolled into view.' },
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
              checked={Boolean((perf as any)[item.key])}
              onChange={() => handleToggle(item.key as any)}
              className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
            />
          </div>
        ))}
      </div>

      {/* Memory Cap & Auto-Save */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Memory Limit */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-500" /> Maximum Browser RAM Cap
          </label>
          <select
            value={perf.maxMemoryUsageMB || 1024}
            onChange={(e) => handleSelect('maxMemoryUsageMB', Number(e.target.value))}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="512">512 MB (Strict / Mobile)</option>
            <option value="1024">1,024 MB / 1 GB (Recommended)</option>
            <option value="2048">2,048 MB / 2 GB (High Performance)</option>
            <option value="4096">4,096 MB / 4 GB (Enterprise Large Datasets)</option>
          </select>
        </div>

        {/* Auto Save Interval */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-500" /> Auto-Save & Sync Frequency
          </label>
          <select
            value={perf.autoSaveIntervalSeconds || 10}
            onChange={(e) => handleSelect('autoSaveIntervalSeconds', Number(e.target.value))}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
          >
            <option value="5">Every 5 Seconds (Instant)</option>
            <option value="10">Every 10 Seconds (Balanced)</option>
            <option value="30">Every 30 Seconds</option>
            <option value="60">Every 60 Seconds</option>
            <option value="0">Manual Save Only</option>
          </select>
        </div>
      </div>
    </div>
  );
};
