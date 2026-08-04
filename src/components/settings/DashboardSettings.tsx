import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { LayoutGrid, GripVertical, Eye, EyeOff, RefreshCw, Layers } from 'lucide-react';

export const DashboardSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();

  const widgets = settings.dashboard?.widgets || [];

  const toggleWidget = (id: string) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w));
    updateSettings({
      dashboard: { ...settings.dashboard, widgets: updated },
    });
  };

  const changeWidgetSize = (id: string, size: 'small' | 'medium' | 'full') => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, size } : w));
    updateSettings({
      dashboard: { ...settings.dashboard, widgets: updated },
    });
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === widgets.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const copy = [...widgets];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // re-assign order numbers
    const reordered = copy.map((w, idx) => ({ ...w, order: idx + 1 }));
    updateSettings({
      dashboard: { ...settings.dashboard, widgets: reordered },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-500" />
            Dashboard Personalization & Drag-and-Drop Widgets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Toggle, reorder, resize, or hide interactive widgets on your executive dashboard summary screen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetCategory('dashboard')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Restore Widgets
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>Active Dashboard Widgets ({widgets.filter((w) => w.enabled).length} Enabled)</span>
          <span className="text-[11px] font-normal text-slate-400">Drag/reorder using position arrows</span>
        </div>

        <div className="space-y-2">
          {widgets.map((widget, idx) => (
            <div
              key={widget.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                widget.enabled
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveWidget(idx, 'up')}
                    disabled={idx === 0}
                    className="text-slate-400 hover:text-blue-500 disabled:opacity-20 cursor-pointer"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(idx, 'down')}
                    disabled={idx === widgets.length - 1}
                    className="text-slate-400 hover:text-blue-500 disabled:opacity-20 cursor-pointer"
                  >
                    ▼
                  </button>
                </div>
                <GripVertical className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">{widget.name}</span>
                  <span className="text-[10px] text-slate-400">Position #{widget.order || idx + 1}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Size Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  {(['small', 'medium', 'full'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeWidgetSize(widget.id, s)}
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition-all cursor-pointer ${
                        widget.size === s
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Enable/Disable Toggle */}
                <button
                  type="button"
                  onClick={() => toggleWidget(widget.id)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    widget.enabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  {widget.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
